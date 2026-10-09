import type { CalmGame, GameContext } from '../../core/game';
import { el } from '../../ui/dom';
import { applyMove, chooseGentleMove, newGame, score, suggestMove, type KalahState } from './kalah';

type Mode = 'ai' | 'two';

interface Saved {
  state: KalahState;
  mode: Mode;
  history: KalahState[];
  over: boolean;
}

const STEP_MS = 260;
const AI_THINK_MS = 800;

function validState(s: unknown): s is KalahState {
  const k = s as KalahState | null;
  return (
    !!k &&
    Array.isArray(k.pits) &&
    k.pits.length === 14 &&
    k.pits.every((n) => Number.isInteger(n) && n >= 0) &&
    (k.turn === 0 || k.turn === 1)
  );
}

/** Mancala (Kalah) against a gentle opponent or a friend. Nothing is lost; the end is just a quiet tally. */
export function createRiverStones(): CalmGame {
  let state = newGame();
  let mode: Mode = 'ai';
  let history: KalahState[] = [];
  let over = false;

  let ctx: GameContext;
  let root: HTMLElement;
  let pitEls: HTMLButtonElement[] = [];
  let storeEls: HTMLElement[] = [];
  let status: HTMLElement;
  let modeBtn: HTMLButtonElement;
  let undoBtn: HTMLButtonElement;
  let shown: number[] = [];
  let busy = false;
  let hintPit: number | null = null;
  let alive = false;
  let paused = false;
  let timer: number | undefined;

  const isHumanTurn = () => !over && (mode === 'two' || state.turn === 0);
  const names = () => (mode === 'ai' ? ['You', 'The river'] : ['Player 1', 'Player 2']);

  function sleep(ms: number): Promise<void> {
    const wait = ctx.reducedMotion() ? 0 : ms;
    return new Promise((resolve) => {
      timer = window.setTimeout(resolve, wait);
    });
  }

  function stones(n: number): HTMLElement {
    const wrap = el('span', { class: 'stones', 'aria-hidden': 'true' });
    for (let i = 0; i < Math.min(n, 12); i++) wrap.append(el('i'));
    return wrap;
  }

  function render() {
    const [a, b] = names();
    shown.forEach((n, i) => {
      const isStore = i === 6 || i === 13;
      const node = isStore ? storeEls[i === 6 ? 0 : 1] : pitEls[i];
      node.replaceChildren(stones(n), el('span', { class: 'count', text: String(n) }));
      if (!isStore) {
        const b2 = node as HTMLButtonElement;
        const playable =
          !busy && isHumanTurn() && state.turn === (i < 7 ? 0 : 1) && shown[i] > 0 && !paused;
        b2.disabled = !playable;
        b2.classList.toggle('hint', hintPit === i);
        b2.setAttribute(
          'aria-label',
          `${i < 7 ? a : b}, pit ${i < 7 ? i + 1 : 13 - i}, ${n} stones`,
        );
      } else {
        node.setAttribute('aria-label', `${i === 6 ? a : b} store, ${n} stones`);
      }
    });
    const [s0, s1] = score(state);
    if (over) {
      status.textContent = `A peaceful finish: ${a} ${s0}, ${b} ${s1}. Play again whenever you like.`;
    } else if (busy && !isHumanTurn()) {
      status.textContent = `${state.turn === 0 ? a : b} is choosing…`;
    } else {
      status.textContent = isHumanTurn()
        ? mode === 'ai'
          ? 'Your turn. Pick a pit on your side.'
          : `${names()[state.turn]}, your turn.`
        : `${b} is choosing…`;
    }
    undoBtn.disabled = busy || history.length === 0;
    modeBtn.textContent = mode === 'ai' ? 'Playing the river' : 'Two players';
  }

  async function play(pit: number) {
    if (busy) return;
    busy = true;
    hintPit = null;
    const result = applyMove(state, pit);
    shown = [...state.pits];
    shown[pit] = 0;
    render();
    for (const i of result.path) {
      if (!alive) return;
      await sleep(STEP_MS);
      if (!alive) return;
      shown[i]++;
      ctx.mixer.chime(i);
      render();
    }
    if (result.captured) ctx.mixer.tap();
    state = result.state;
    shown = [...state.pits];
    over = result.over;
    busy = false;
    render();
    ctx.requestSave();
    if (!over && !isHumanTurn()) await aiTurn();
  }

  async function aiTurn() {
    busy = true;
    render();
    await sleep(AI_THINK_MS);
    if (!alive) return;
    busy = false;
    if (paused) return; // resumes from resume()
    if (!over && !isHumanTurn()) await play(chooseGentleMove(state));
  }

  function build() {
    const board = el('div', { class: 'kalah' });
    storeEls = [
      el('div', { class: 'store store-1', role: 'img' }),
      el('div', { class: 'store store-0', role: 'img' }),
    ];
    // Opponent's store on the left, ours on the right; their row runs right to left.
    storeEls[1].style.gridColumn = '1';
    storeEls[0].style.gridColumn = '8';
    storeEls[1].style.gridRow = storeEls[0].style.gridRow = '1 / 3';
    board.append(storeEls[1], storeEls[0]);
    pitEls = [];
    for (let col = 0; col < 6; col++) {
      for (const [player, row] of [
        [1, 1],
        [0, 2],
      ] as const) {
        const i = player === 0 ? col : 12 - col;
        const b = el('button', { type: 'button', class: 'pit' });
        b.style.gridColumn = String(col + 2);
        b.style.gridRow = String(row);
        b.addEventListener('click', () => void humanPlay(i));
        pitEls[i] = b;
        board.append(b);
      }
    }

    status = el('p', { class: 'game-status', 'aria-live': 'polite' });
    undoBtn = el('button', { type: 'button', text: 'Undo' });
    undoBtn.addEventListener('click', () => {
      const prev = history.pop();
      if (!prev || busy) return;
      state = prev;
      over = false;
      hintPit = null;
      shown = [...state.pits];
      render();
      ctx.requestSave();
    });
    const hint = el('button', { type: 'button', text: 'Hint' });
    hint.addEventListener('click', () => {
      if (!isHumanTurn() || busy) return;
      hintPit = suggestMove(state);
      render();
    });
    modeBtn = el('button', { type: 'button' });
    modeBtn.addEventListener('click', () => {
      mode = mode === 'ai' ? 'two' : 'ai';
      restart();
    });
    const again = el('button', { type: 'button', text: 'New game' });
    again.addEventListener('click', restart);

    root.append(
      el('div', { class: 'game-board' }, [board]),
      status,
      el('div', { class: 'game-bar' }, [hint, undoBtn, modeBtn, again]),
    );
  }

  function restart() {
    window.clearTimeout(timer);
    busy = false;
    state = newGame();
    history = [];
    over = false;
    hintPit = null;
    shown = [...state.pits];
    render();
    ctx.requestSave();
  }

  /** A move chosen by a person: snapshot the position first so Undo can return to it. */
  async function humanPlay(pit: number) {
    if (busy) return;
    history.push(state);
    if (history.length > 100) history.shift();
    await play(pit);
  }

  return {
    id: 'river-stones',
    title: 'River Stones',
    load(saved) {
      const s = saved as Partial<Saved> | null;
      if (!s || !validState(s.state)) return;
      state = s.state;
      mode = s.mode === 'two' ? 'two' : 'ai';
      over = s.over === true;
      history = Array.isArray(s.history) ? s.history.filter(validState).slice(-100) : [];
    },
    mount(el_, c) {
      root = el_;
      ctx = c;
      alive = true;
      shown = [...state.pits];
      build();
      render();
      // A saved game may be waiting on the opponent.
      if (!over && !isHumanTurn()) void aiTurn();
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      render();
      if (alive && !busy && !over && !isHumanTurn()) void aiTurn();
    },
    save(): Saved {
      return { state, mode, history, over };
    },
    unmount() {
      alive = false;
      window.clearTimeout(timer);
      root.replaceChildren();
    },
  };
}
