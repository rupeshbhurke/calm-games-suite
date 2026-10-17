import { readStored, writeStored } from '../core/storage';
import { el, openSheet } from './dom';

/** What a game offers when the player is stuck. Each level asks a little more of the game. */
export interface HelpProvider {
  /** Short "how to play" lines. */
  rules: string[];
  /** In words only: where to look. Null when nothing needs help. */
  nudge(): string | null;
  /** Point at the spot on the board. Null when nothing needs help. */
  show(): string | null;
  /** Do the next step for the player. Null when nothing needs help. */
  apply(): string | null;
}

export interface HelpUi {
  /** Goes in the game's button bar. */
  toggle: HTMLButtonElement;
  /** Goes under the bar; hidden until the toggle is pressed. */
  panel: HTMLElement;
  /** Shows the rules sheet the first time this game is opened on this device. */
  maybeShowRules(): void;
}

const SEEN_KEY = 'calm.rulesSeen';
const IDLE = 'Stuck? Ask for as little or as much help as you like. Nothing is counted.';
const NOTHING = 'Nothing needs help right now. You are doing well.';

function hasSeen(id: string): boolean {
  return (readStored<string[]>(SEEN_KEY) ?? []).includes(id);
}

function markSeen(id: string): void {
  const seen = readStored<string[]>(SEEN_KEY) ?? [];
  if (!seen.includes(id)) writeStored(SEEN_KEY, [...seen, id]);
}

/** A three-step Help panel (nudge, show, do it) plus a How to play sheet, shared by every game. */
export function createHelp(gameId: string, title: string, provider: HelpProvider): HelpUi {
  const message = el('p', { class: 'help-message', 'aria-live': 'polite', text: IDLE });
  const run = (step: () => string | null) => () => {
    message.textContent = step() ?? NOTHING;
  };
  const button = (text: string, onClick: () => void) => {
    const b = el('button', { type: 'button', text });
    b.addEventListener('click', onClick);
    return b;
  };

  const showRules = () => {
    markSeen(gameId);
    const close = button('Got it', () => dialog.close());
    close.className = 'primary';
    const dialog = openSheet(`How to play ${title}`, [
      ...provider.rules.map((line) => el('p', { text: line })),
      el('p', { class: 'hint', text: 'Take your time. There is no timer and nothing to lose.' }),
      el('div', { class: 'row end' }, [close]),
    ]);
  };

  const panel = el('div', { class: 'help-panel', id: `help-${gameId}` }, [
    message,
    el('div', { class: 'game-bar' }, [
      button('Nudge me', run(provider.nudge)),
      button('Show me', run(provider.show)),
      button('Do it for me', run(provider.apply)),
      button('How to play', showRules),
    ]),
  ]);
  panel.hidden = true;

  const toggle = el('button', {
    type: 'button',
    text: 'Help',
    'aria-expanded': 'false',
    'aria-controls': panel.id,
  });
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) message.textContent = IDLE;
  });

  return {
    toggle,
    panel,
    maybeShowRules() {
      if (!hasSeen(gameId)) showRules();
    },
  };
}

/** Briefly mark an element as the spot help is pointing at. */
export function flash(node: Element | null | undefined, ms = 2600): void {
  if (!node) return;
  node.classList.add('helped');
  window.setTimeout(() => node.classList.remove('helped'), ms);
}
