import type { CalmGame, GameContext } from '../../core/game';
import { el } from '../../ui/dom';
import {
  colClues,
  emptyCells,
  hintCell,
  isSolved,
  parseArt,
  progress,
  PUZZLES,
  rowClues,
  type Cell,
} from './nonogram';

interface Saved {
  index: number;
  cells: Record<string, Cell[][]>;
}

interface Change {
  r: number;
  c: number;
  prev: Cell;
}

const LABELS: Record<Cell, string> = { 0: 'blank', 1: 'filled', 2: 'marked empty' };
const MARK = '×';

/** Nonogram: fill cells to match the row and column clues and a nature picture appears. */
export function createQuietGrid(): CalmGame {
  let index = 0;
  const saved: Record<string, Cell[][]> = {};
  let history: Change[][] = [];
  let mode: 1 | 2 = 1;

  let ctx: GameContext;
  let root: HTMLElement;
  let board: HTMLElement;
  let status: HTMLElement;
  let title: HTMLElement;
  let undoBtn: HTMLButtonElement;
  let modeBtn: HTMLButtonElement;
  let buttons: HTMLButtonElement[][] = [];

  const puzzle = () => PUZZLES[index];
  const solution = () => parseArt(puzzle().art);
  const cells = (): Cell[][] => {
    const p = puzzle();
    saved[p.id] ??= emptyCells(p.art.length, p.art[0].length);
    return saved[p.id];
  };

  function paintCell(r: number, c: number, v: Cell) {
    const b = buttons[r][c];
    b.className = `cell${v === 1 ? ' on' : ''}${v === 2 ? ' mark' : ''}`;
    b.textContent = v === 2 ? MARK : '';
    b.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}, ${LABELS[v]}`);
  }

  function refresh() {
    const sol = solution();
    const done = isSolved(cells(), sol);
    const { done: n, total } = progress(cells(), sol);
    board.classList.toggle('solved', done);
    title.textContent = done ? puzzle().title : 'A hidden picture';
    status.textContent = done
      ? `${puzzle().title} revealed. Lovely.`
      : `${n} of ${total} filled cells found`;
    undoBtn.disabled = history.length === 0;
    modeBtn.textContent = mode === 1 ? 'Filling' : 'Marking empty';
    modeBtn.setAttribute('aria-pressed', String(mode === 2));
  }

  function setCell(r: number, c: number, v: Cell, changes: Change[]) {
    const grid = cells();
    if (grid[r][c] === v) return;
    changes.push({ r, c, prev: grid[r][c] });
    grid[r][c] = v;
    paintCell(r, c, v);
    ctx.mixer.chime(r + c);
  }

  function commit(changes: Change[]) {
    if (!changes.length) return;
    history.push(changes);
    if (history.length > 200) history.shift();
    refresh();
    ctx.requestSave();
  }

  function build() {
    const sol = solution();
    const rows = rowClues(sol);
    const cols = colClues(sol);
    const nCols = sol[0].length;
    board = el('div', { class: 'nonogram' });
    board.style.setProperty('--cols', String(nCols));
    board.append(el('div', { class: 'corner' }));
    cols.forEach((clue) =>
      board.append(
        el(
          'div',
          { class: 'clue col-clue' },
          clue.map((n) => el('span', { text: String(n) })),
        ),
      ),
    );
    buttons = [];
    rows.forEach((clue, r) => {
      board.append(
        el(
          'div',
          { class: 'clue row-clue' },
          clue.map((n) => el('span', { text: String(n) })),
        ),
      );
      const line: HTMLButtonElement[] = [];
      for (let c = 0; c < nCols; c++) {
        const b = el('button', { type: 'button', class: 'cell', tabindex: '-1' });
        b.dataset.r = String(r);
        b.dataset.c = String(c);
        line.push(b);
        board.append(b);
      }
      buttons.push(line);
    });

    let drag: { value: Cell; changes: Change[] } | null = null;
    const cellAt = (e: PointerEvent) => {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (!(t instanceof HTMLButtonElement) || t.dataset.r === undefined) return null;
      return { r: Number(t.dataset.r), c: Number(t.dataset.c) };
    };
    board.addEventListener('pointerdown', (e) => {
      const at = cellAt(e);
      if (!at) return;
      const current = cells()[at.r][at.c];
      drag = { value: current === mode ? 0 : mode, changes: [] };
      setCell(at.r, at.c, drag.value, drag.changes);
    });
    board.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const at = cellAt(e);
      if (at) setCell(at.r, at.c, drag.value, drag.changes);
    });
    const end = () => {
      if (!drag) return;
      commit(drag.changes);
      drag = null;
    };
    board.addEventListener('pointerup', end);
    board.addEventListener('pointercancel', end);
    board.addEventListener('pointerleave', end);
    // Keyboard: Enter or Space on a focused cell toggles it.
    board.addEventListener('keydown', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLButtonElement) || t.dataset.r === undefined) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      const r = Number(t.dataset.r);
      const c = Number(t.dataset.c);
      const changes: Change[] = [];
      setCell(r, c, cells()[r][c] === mode ? 0 : mode, changes);
      commit(changes);
    });
    board.querySelectorAll('button').forEach((b) => b.setAttribute('tabindex', '0'));

    cells().forEach((row, r) => row.forEach((v, c) => paintCell(r, c, v)));
  }

  function mountPuzzle() {
    root.replaceChildren();
    history = [];
    title = el('h2', { class: 'game-title' });
    status = el('p', { class: 'game-status', 'aria-live': 'polite' });
    build();

    modeBtn = el('button', { type: 'button', 'aria-pressed': 'false' });
    modeBtn.addEventListener('click', () => {
      mode = mode === 1 ? 2 : 1;
      refresh();
    });
    const hint = el('button', { type: 'button', text: 'Hint' });
    hint.addEventListener('click', () => {
      const h = hintCell(cells(), solution());
      if (!h) return;
      const changes: Change[] = [];
      setCell(h.r, h.c, solution()[h.r][h.c] ? 1 : 0, changes);
      commit(changes);
    });
    undoBtn = el('button', { type: 'button', text: 'Undo' });
    undoBtn.addEventListener('click', () => {
      const last = history.pop();
      if (!last) return;
      for (const ch of [...last].reverse()) {
        cells()[ch.r][ch.c] = ch.prev;
        paintCell(ch.r, ch.c, ch.prev);
      }
      refresh();
      ctx.requestSave();
    });
    const clear = el('button', { type: 'button', text: 'Start fresh' });
    clear.addEventListener('click', () => {
      const changes: Change[] = [];
      cells().forEach((row, r) => row.forEach((_, c) => setCell(r, c, 0, changes)));
      commit(changes);
    });
    const next = el('button', { type: 'button', text: 'Next picture' });
    next.addEventListener('click', () => {
      index = (index + 1) % PUZZLES.length;
      mountPuzzle();
      ctx.requestSave();
    });

    root.append(
      title,
      el('div', { class: 'game-board' }, [board]),
      status,
      el('div', { class: 'game-bar' }, [modeBtn, hint, undoBtn, clear, next]),
    );
    refresh();
  }

  return {
    id: 'quiet-grid',
    title: 'Quiet Grid',
    load(state) {
      const s = state as Partial<Saved> | null;
      if (!s) return;
      if (Number.isInteger(s.index) && s.index! >= 0 && s.index! < PUZZLES.length) index = s.index!;
      for (const p of PUZZLES) {
        const grid = s.cells?.[p.id];
        const ok =
          Array.isArray(grid) &&
          grid.length === p.art.length &&
          grid.every(
            (row) =>
              Array.isArray(row) &&
              row.length === p.art[0].length &&
              row.every((v) => v === 0 || v === 1 || v === 2),
          );
        if (ok) saved[p.id] = grid;
      }
    },
    mount(el_, c) {
      root = el_;
      ctx = c;
      mountPuzzle();
    },
    pause() {},
    resume() {},
    save(): Saved {
      return { index, cells: saved };
    },
    unmount() {
      root.replaceChildren();
    },
  };
}
