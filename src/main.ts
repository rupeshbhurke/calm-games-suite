import './styles/main.css';
import { Mixer } from './core/audio';
import { applyMotion, prefersReducedMotion } from './core/motion';
import {
  addMoodEntry,
  loadMoodLog,
  loadSettings,
  moodDelta,
  saveSettings,
  type Settings,
} from './core/storage';
import { applyTheme, resolveTheme } from './core/theme';
import { Garden, type Tool } from './games/zen-garden/garden';
import { openBreathingGuide } from './ui/breathing';
import { el } from './ui/dom';
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

  const apply = () => {
    applyTheme(resolveTheme(settings.theme, new Date().getHours()));
    applyMotion(prefersReducedMotion(settings.reduceMotion));
    document.documentElement.dataset.handed = settings.leftHanded ? 'left' : 'right';
    mixer.setVolumes(settings);
    garden.redraw();
  };
  const update = (patch: Partial<Settings>) => {
    settings = { ...settings, ...patch };
    saveSettings(settings);
    apply();
  };

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
  const breathe = el('button', { type: 'button', text: 'Breathe' });
  breathe.addEventListener('click', openBreathingGuide);
  const sound = el('button', { type: 'button' });
  const syncSound = () => {
    sound.textContent = settings.muted ? 'Sound off' : 'Sound on';
  };
  sound.addEventListener('click', () => {
    update({ muted: !settings.muted });
    syncSound();
  });
  const settingsBtn = el('button', { type: 'button', text: 'Settings' });
  settingsBtn.addEventListener('click', () =>
    openSettings({
      settings,
      update: (patch) => {
        update(patch);
        syncSound();
      },
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
    const log = loadMoodLog();
    const delta = moodDelta(log, session);
    const before = delta === null ? null : after - delta;
    showMoodSummary(before, after);
  });

  const toolbar = el('nav', { class: 'toolbar', 'aria-label': 'Garden tools' }, [
    tools.rake,
    tools.stone,
    undo,
    smooth,
    breathe,
    sound,
    settingsBtn,
    done,
  ]);

  app.append(
    el('header', {}, [el('h1', { text: 'Calm Games Suite' })]),
    el('section', { class: 'stage' }, [canvas, hint]),
    toolbar,
  );

  syncSound();
  apply();

  // Browsers only allow audio after a gesture; start on the first touch.
  window.addEventListener('pointerdown', () => mixer.unlock(), { once: true });
  document.addEventListener('visibilitychange', () => mixer.setActive(!document.hidden));
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
