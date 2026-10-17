import './styles/main.css';
import './styles/games.css';
import { Mixer } from './core/audio';
import type { CalmGame } from './core/game';
import { applyMotion, prefersReducedMotion } from './core/motion';
import { gameHash, parseRoute } from './core/router';
import {
  addMoodEntry,
  loadMoodLog,
  loadSettings,
  moodDelta,
  readStored,
  saveSettings,
  writeStored,
  type Settings,
} from './core/storage';
import { applyTheme, resolveTheme } from './core/theme';
import { GAMES } from './games';
import { Garden, type Tool } from './games/zen-garden/garden';
import { openBreathingGuide } from './ui/breathing';
import { el, openSheet } from './ui/dom';
import { askMood, showMoodSummary } from './ui/mood';
import { openSettings } from './ui/settings';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

const app = document.querySelector<HTMLElement>('#app');

if (app) {
  let settings = loadSettings();
  const mixer = new Mixer();
  const session = Date.now();
  let installEvent: InstallPromptEvent | null = null;
  const soundButtons: HTMLButtonElement[] = [];

  const syncSound = () => {
    for (const b of soundButtons) b.textContent = settings.muted ? 'Sound off' : 'Sound on';
  };
  const apply = () => {
    applyTheme(resolveTheme(settings.theme, new Date().getHours()));
    applyMotion(prefersReducedMotion(settings.reduceMotion));
    document.documentElement.dataset.handed = settings.leftHanded ? 'left' : 'right';
    mixer.setVolumes(settings);
    garden.redraw();
    syncSound();
  };
  const update = (patch: Partial<Settings>) => {
    settings = { ...settings, ...patch };
    saveSettings(settings);
    apply();
  };

  // Buttons shared by the garden and every game.
  const sharedButtons = (): HTMLButtonElement[] => {
    const breathe = el('button', { type: 'button', text: 'Breathe' });
    breathe.addEventListener('click', () =>
      openBreathingGuide({ settings: () => settings, update, mixer }),
    );
    const sound = el('button', { type: 'button' });
    soundButtons.push(sound);
    sound.addEventListener('click', () => update({ muted: !settings.muted }));
    const settingsBtn = el('button', { type: 'button', text: 'Settings' });
    settingsBtn.addEventListener('click', () =>
      openSettings({
        settings,
        update,
        version: __APP_VERSION__,
        install: installEvent
          ? () => {
              void installEvent?.prompt();
              installEvent = null;
            }
          : undefined,
      }),
    );
    const done = el('button', { type: 'button', class: 'primary', text: "I'm done" });
    done.addEventListener('click', async () => {
      const after = await askMood('How do you feel now?');
      if (after === null) return;
      addMoodEntry({ at: Date.now(), phase: 'after', score: after, session });
      const delta = moodDelta(loadMoodLog(), session);
      showMoodSummary(delta === null ? null : after - delta, after);
    });
    return [breathe, sound, settingsBtn, done];
  };

  // ---- Home: the Zen Garden ----
  const canvas = el('canvas', {
    class: 'garden',
    'aria-label': 'Sand garden. Drag to rake, or tap to place a stone.',
    role: 'img',
  });
  const hint = el('p', { class: 'stage-hint', text: 'Drag to rake the sand' });
  const garden = new Garden(canvas, {
    onStone: () => mixer.tap(),
    onRake: () => mixer.chime(Math.floor(Math.random() * 6)),
    onChange: () => {
      undo.disabled = !garden.canUndo;
      hint.hidden = true;
    },
  });

  const tools: Record<Tool, HTMLButtonElement> = {
    rake: el('button', { type: 'button', class: 'tool', 'aria-pressed': 'true', text: 'Rake' }),
    stone: el('button', { type: 'button', class: 'tool', 'aria-pressed': 'false', text: 'Stone' }),
  };
  const pick = (tool: Tool) => {
    garden.tool = tool;
    hint.textContent = tool === 'rake' ? 'Drag to rake the sand' : 'Tap to place a stone';
    for (const [name, b] of Object.entries(tools))
      b.setAttribute('aria-pressed', String(name === tool));
  };
  tools.rake.addEventListener('click', () => pick('rake'));
  tools.stone.addEventListener('click', () => pick('stone'));

  const undo = el('button', { type: 'button', text: 'Undo' });
  undo.disabled = !garden.canUndo;
  undo.addEventListener('click', () => garden.undo());
  const smooth = el('button', { type: 'button', text: 'Smooth' });
  smooth.addEventListener('click', () => garden.smooth());

  const gamesBtn = el('button', { type: 'button', class: 'primary', text: 'Games' });
  gamesBtn.addEventListener('click', () => {
    const close = el('button', { class: 'quiet', type: 'button', text: 'Close' });
    const items = GAMES.map((g) => {
      const b = el('button', { type: 'button', class: 'game-card' }, [
        el('strong', { text: g.title }),
        el('span', { text: g.blurb }),
      ]);
      b.addEventListener('click', () => {
        dialog.close();
        location.hash = gameHash(g.id);
      });
      return b;
    });
    const dialog = openSheet('Choose a game', [
      el('div', { class: 'game-list' }, items),
      el('div', { class: 'row end' }, [close]),
    ]);
    close.addEventListener('click', () => dialog.close());
  });

  const home = el('div', { class: 'view home' }, [
    el('header', {}, [el('h1', { text: 'Calm Games Suite' })]),
    el('section', { class: 'stage' }, [canvas, hint]),
    el('nav', { class: 'toolbar', 'aria-label': 'Garden tools' }, [
      gamesBtn,
      tools.rake,
      tools.stone,
      undo,
      smooth,
      ...sharedButtons(),
    ]),
  ]);

  // ---- Game host ----
  const gameView = el('div', { class: 'view game-view', hidden: '' });
  app.append(home, gameView);

  let current: { game: CalmGame; key: string } | null = null;
  let saveTimer: number | undefined;

  const persist = () => {
    window.clearTimeout(saveTimer);
    if (current) writeStored(current.key, current.game.save());
  };

  function closeGame() {
    if (!current) return;
    persist();
    current.game.unmount();
    current = null;
    gameView.replaceChildren();
  }

  function openGame(id: string) {
    const info = GAMES.find((g) => g.id === id);
    if (!info) {
      location.hash = '';
      return;
    }
    closeGame();
    const game = info.create();
    const key = `calm.game.${id}`;
    game.load(readStored(key));
    current = { game, key };

    const back = el('a', { class: 'back', href: '#/', text: '← Garden' });
    const root = el('div', { class: 'game-root' });
    gameView.append(
      el('header', { class: 'game-head' }, [back, el('h1', { text: info.title })]),
      root,
      el('nav', { class: 'toolbar', 'aria-label': 'Suite controls' }, sharedButtons()),
    );
    game.mount(root, {
      mixer,
      reducedMotion: () => prefersReducedMotion(settings.reduceMotion),
      requestSave: () => {
        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(persist, 300);
      },
    });
    syncSound();
  }

  function route() {
    const r = parseRoute(location.hash);
    const inGame = r.name === 'game';
    home.hidden = inGame;
    gameView.hidden = !inGame;
    if (r.name === 'game') openGame(r.id);
    else {
      closeGame();
      garden.redraw();
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  apply();
  route();

  // Browsers only allow audio after a gesture; start on the first touch.
  window.addEventListener('pointerdown', () => mixer.unlock(), { once: true });
  document.addEventListener('visibilitychange', () => {
    mixer.setActive(!document.hidden);
    if (document.hidden) {
      current?.game.pause();
      persist();
    } else current?.game.resume();
  });
  window.addEventListener('pagehide', persist);
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e as InstallPromptEvent;
  });

  void askMood('How are you feeling right now?').then((before) => {
    if (before !== null) addMoodEntry({ at: Date.now(), phase: 'before', score: before, session });
  });

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  }
}
