import type { CalmGame, GameContext } from '../../core/game';
import { el, openSheet } from '../../ui/dom';
import { createHelp } from '../../ui/help';
import {
  gridFor,
  isComplete,
  isSnapped,
  makeEdges,
  nextHelpPiece,
  nudgeText,
  pieceCol,
  pieceRow,
  PIECE_COUNTS,
  scatter,
  seededRandom,
  type Edges,
  type PieceCount,
  type PieceState,
} from './puzzle';
import { renderScene, SCENE_H, SCENE_W, SCENES } from './scenes';

/** The board's place on the canvas, in units of the canvas width (the canvas is 1 wide and 0.8 tall). */
const CANVAS_RATIO = 0.8;
const BOARD = { x: 0.19, y: 0.1675, w: 0.62, h: 0.465 };
const SNAP_FRACTION = 0.45;
const SHOW_MS = 3000;

interface SavedPuzzle {
  pieces: PieceState[];
  order: number[];
}

interface Saved {
  scene: number;
  count: PieceCount;
  puzzles: Record<string, SavedPuzzle>;
}

const keyOf = (scene: number, count: PieceCount) => `${SCENES[scene].id}-${count}`;

/** A knob along one edge, drawn from `a` to `b`; `dir` is 1 for a tab out of the piece and -1 for a socket. */
function edgeTo(
  p: Path2D,
  a: { x: number; y: number },
  b: { x: number; y: number },
  dir: -1 | 0 | 1,
) {
  if (!dir) {
    p.lineTo(b.x, b.y);
    return;
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  // Clockwise travel, so the outward normal is (dy, -dx) / len.
  const nx = (dy / len) * dir;
  const ny = (-dx / len) * dir;
  const h = len * 0.24;
  const P = (t: number, s: number) =>
    [a.x + dx * t + nx * h * s, a.y + dy * t + ny * h * s] as const;
  p.lineTo(...P(0.37, 0));
  p.bezierCurveTo(...P(0.37, 0.4), ...P(0.25, 0.5), ...P(0.28, 0.8));
  p.bezierCurveTo(...P(0.31, 1.15), ...P(0.69, 1.15), ...P(0.72, 0.8));
  p.bezierCurveTo(...P(0.75, 0.5), ...P(0.63, 0.4), ...P(0.63, 0));
  p.lineTo(b.x, b.y);
}

/** Outline of one piece in picture coordinates, with its tabs and sockets. */
function piecePath(row: number, col: number, e: Edges, cw: number, ch: number): Path2D {
  const x0 = col * cw;
  const y0 = row * ch;
  const x1 = x0 + cw;
  const y1 = y0 + ch;
  const p = new Path2D();
  p.moveTo(x0, y0);
  edgeTo(p, { x: x0, y: y0 }, { x: x1, y: y0 }, e.top);
  edgeTo(p, { x: x1, y: y0 }, { x: x1, y: y1 }, e.right);
  edgeTo(p, { x: x1, y: y1 }, { x: x0, y: y1 }, e.bottom);
  edgeTo(p, { x: x0, y: y1 }, { x: x0, y: y0 }, e.left);
  p.closePath();
  return p;
}

/** A jigsaw of calm landscapes. Pieces snap into place when they are close; nothing is timed or counted. */
export function createSlowPuzzle(): CalmGame {
  let sceneIdx = 0;
  let count: PieceCount = 24;
  const puzzles: Record<string, SavedPuzzle> = {};
  const pictures: HTMLCanvasElement[] = [];
  let paths: Path2D[] = [];
  let paintedKey = '';
  let highlight: { id: number; timer: number } | null = null;

  let ctx: GameContext;
  let root: HTMLElement;
  let canvas: HTMLCanvasElement;
  let g: CanvasRenderingContext2D;
  let status: HTMLElement;
  let countBtn: HTMLButtonElement;
  let frame = 0;
  let drag: { id: number; dx: number; dy: number } | null = null;

  const grid = () => gridFor(count);
  const cell = () => ({ w: BOARD.w / grid().cols, h: BOARD.h / grid().rows });
  const picture = () => (pictures[sceneIdx] ??= renderScene(SCENES[sceneIdx]));
  const widthPx = () => canvas.getBoundingClientRect().width;

  function puzzle(): SavedPuzzle {
    const key = keyOf(sceneIdx, count);
    if (!puzzles[key]) {
      const { rows, cols } = grid();
      const spots = scatter(rows * cols, { w: 1, h: CANVAS_RATIO }, BOARD, cell(), Math.random);
      puzzles[key] = {
        pieces: spots.map((s, id) => ({ id, x: s.x, y: s.y, placed: false })),
        order: spots.map((_, id) => id),
      };
    }
    return puzzles[key];
  }

  const target = (id: number) => ({
    x: BOARD.x + pieceCol(id, grid().cols) * cell().w,
    y: BOARD.y + pieceRow(id, grid().rows) * cell().h,
  });

  /** Piece outlines depend only on the picture and piece count, so they are built once per puzzle. */
  function ensurePaths() {
    const key = keyOf(sceneIdx, count);
    if (paintedKey === key) return;
    paintedKey = key;
    const { rows, cols } = grid();
    const edges = makeEdges(rows, cols, seededRandom(sceneIdx * 1000 + count));
    const cw = SCENE_W / cols;
    const ch = SCENE_H / rows;
    paths = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) paths.push(piecePath(r, c, edges[r][c], cw, ch));
    }
  }

  /** Canvas transform that puts a piece's picture-space outline where the piece currently sits. */
  function place(p: PieceState, dpr: number) {
    const s = widthPx();
    const k = (BOARD.w * s) / SCENE_W;
    const { rows, cols } = grid();
    const tx = p.x * s - pieceCol(p.id, cols) * (SCENE_W / cols) * k;
    const ty = p.y * s - pieceRow(p.id, cols) * (SCENE_H / rows) * k;
    g.setTransform(dpr * k, 0, 0, dpr * k, dpr * tx, dpr * ty);
    return k;
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const { width } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(width * CANVAS_RATIO * dpr));
    draw();
  }

  function requestDraw() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
  }

  function draw() {
    if (!g) return;
    ensurePaths();
    const dpr = window.devicePixelRatio || 1;
    const s = widthPx();
    const pz = puzzle();
    const done = isComplete(pz.pieces);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, s, s * CANVAS_RATIO);

    // The board: a faint ghost of the picture and the outline of the frame.
    g.fillStyle = 'rgba(158, 184, 168, 0.18)';
    g.fillRect(BOARD.x * s, BOARD.y * s, BOARD.w * s, BOARD.h * s);
    g.globalAlpha = done ? 1 : 0.14;
    g.drawImage(picture(), BOARD.x * s, BOARD.y * s, BOARD.w * s, BOARD.h * s);
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(62, 74, 68, 0.35)';
    g.lineWidth = 1.5;
    g.strokeRect(BOARD.x * s, BOARD.y * s, BOARD.w * s, BOARD.h * s);

    if (!done) {
      for (const id of pz.order) {
        const p = pz.pieces[id];
        g.save();
        const k = place(p, dpr);
        g.save();
        g.clip(paths[id]);
        g.drawImage(picture(), 0, 0);
        g.restore();
        g.strokeStyle = 'rgba(38, 50, 58, 0.4)';
        g.lineWidth = 1.5 / k;
        g.stroke(paths[id]);
        if (highlight?.id === id) {
          g.strokeStyle = '#b8b0cf';
          g.lineWidth = 5 / k;
          g.stroke(paths[id]);
        }
        g.restore();
      }
      if (highlight) {
        const t = target(highlight.id);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.strokeStyle = '#e8c98a';
        g.lineWidth = 4;
        g.setLineDash([8, 6]);
        g.strokeRect(t.x * s, t.y * s, cell().w * s, cell().h * s);
        g.setLineDash([]);
      }
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function refresh() {
    const pz = puzzle();
    const placed = pz.pieces.filter((p) => p.placed).length;
    const total = pz.pieces.length;
    const done = isComplete(pz.pieces);
    status.textContent = done
      ? `${SCENES[sceneIdx].title}: the picture is whole. Lovely.`
      : `${placed} of ${total} pieces in place`;
    countBtn.textContent = `${count} pieces`;
    canvas.classList.toggle('solved', done);
    requestDraw();
  }

  function moveToFront(id: number) {
    const pz = puzzle();
    pz.order = [...pz.order.filter((o) => o !== id), id];
  }

  /** Put a piece exactly where it belongs and keep it beneath the loose ones. */
  function snap(id: number) {
    const pz = puzzle();
    const t = target(id);
    pz.pieces[id] = { ...pz.pieces[id], x: t.x, y: t.y, placed: true };
    pz.order = [id, ...pz.order.filter((o) => o !== id)];
    ctx.mixer.chime(id);
  }

  function hitTest(px: number, py: number): number | null {
    const pz = puzzle();
    const dpr = window.devicePixelRatio || 1;
    for (let i = pz.order.length - 1; i >= 0; i--) {
      const id = pz.order[i];
      g.save();
      place(pz.pieces[id], dpr);
      const inside = g.isPointInPath(paths[id], px * dpr, py * dpr);
      g.restore();
      if (inside) return id;
    }
    return null;
  }

  function pointer(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    return { px: e.clientX - r.left, py: e.clientY - r.top };
  }

  function onDown(e: PointerEvent) {
    ensurePaths();
    const { px, py } = pointer(e);
    const id = hitTest(px, py);
    if (id === null) return;
    canvas.setPointerCapture(e.pointerId);
    const s = widthPx();
    const p = puzzle().pieces[id];
    drag = { id, dx: px / s - p.x, dy: py / s - p.y };
    puzzle().pieces[id] = { ...p, placed: false };
    moveToFront(id);
    refresh();
  }

  function onMove(e: PointerEvent) {
    if (!drag) return;
    const { px, py } = pointer(e);
    const s = widthPx();
    const p = puzzle().pieces[drag.id];
    puzzle().pieces[drag.id] = { ...p, x: px / s - drag.dx, y: py / s - drag.dy };
    requestDraw();
  }

  function onUp() {
    if (!drag) return;
    const { id } = drag;
    drag = null;
    const p = puzzle().pieces[id];
    const t = target(id);
    const reach = Math.min(cell().w, cell().h) * SNAP_FRACTION;
    if (isSnapped(p.x, p.y, t.x, t.y, reach)) snap(id);
    refresh();
    ctx.requestSave();
  }

  function startOver() {
    delete puzzles[keyOf(sceneIdx, count)];
    refresh();
    ctx.requestSave();
  }

  function spreadOut() {
    const pz = puzzle();
    const loose = pz.pieces.filter((p) => !p.placed);
    const spots = scatter(loose.length, { w: 1, h: CANVAS_RATIO }, BOARD, cell(), Math.random);
    loose.forEach((p, i) => (pz.pieces[p.id] = { ...p, x: spots[i].x, y: spots[i].y }));
    refresh();
    ctx.requestSave();
  }

  function peek() {
    const copy = el('canvas', {
      class: 'peek',
      'aria-label': `${SCENES[sceneIdx].title}, the finished picture`,
    });
    copy.width = SCENE_W;
    copy.height = SCENE_H;
    copy.getContext('2d')!.drawImage(picture(), 0, 0);
    const close = el('button', { type: 'button', class: 'primary', text: 'Done' });
    const dialog = openSheet(SCENES[sceneIdx].title, [
      copy,
      el('div', { class: 'row end' }, [close]),
    ]);
    close.addEventListener('click', () => dialog.close());
  }

  function mountPuzzle() {
    root.replaceChildren();
    canvas = el('canvas', {
      class: 'jigsaw',
      role: 'img',
      'aria-label':
        'Jigsaw puzzle. Drag pieces onto the picture. Use Help, then Do it for me, to place a piece without dragging.',
    });
    g = canvas.getContext('2d')!;
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    new ResizeObserver(resize).observe(canvas);

    status = el('p', { class: 'game-status', 'aria-live': 'polite' });
    countBtn = el('button', { type: 'button' });
    countBtn.addEventListener('click', () => {
      count = PIECE_COUNTS[(PIECE_COUNTS.indexOf(count) + 1) % PIECE_COUNTS.length];
      refresh();
      ctx.requestSave();
    });
    const peekBtn = el('button', { type: 'button', text: 'Show picture' });
    peekBtn.addEventListener('click', peek);
    const spreadBtn = el('button', { type: 'button', text: 'Spread out' });
    spreadBtn.addEventListener('click', spreadOut);
    const nextBtn = el('button', { type: 'button', text: 'Next picture' });
    nextBtn.addEventListener('click', () => {
      sceneIdx = (sceneIdx + 1) % SCENES.length;
      refresh();
      ctx.requestSave();
    });
    const overBtn = el('button', { type: 'button', text: 'Start over' });
    overBtn.addEventListener('click', startOver);

    const next = () => nextHelpPiece(puzzle().pieces, grid().rows, grid().cols);
    const help = createHelp('slow-puzzle', 'Slow Puzzle', {
      rules: [
        'Drag a piece onto the picture. When it is close to the right spot, it settles into place by itself.',
        'The faint picture on the board shows where pieces go. Tap Show picture to see the finished scene.',
        'A good way in is to find the corners, then the edges, then work inwards.',
        'Spread out tidies loose pieces that have piled up. You can pick up a placed piece and move it again.',
      ],
      nudge: () => {
        const n = next();
        return n && nudgeText(n.stage, n.id, grid().rows, grid().cols);
      },
      show: () => {
        const n = next();
        if (!n) return null;
        if (highlight) window.clearTimeout(highlight.timer);
        moveToFront(n.id);
        highlight = {
          id: n.id,
          timer: window.setTimeout(() => {
            highlight = null;
            requestDraw();
          }, SHOW_MS),
        };
        refresh();
        return 'The glowing piece belongs in the dashed square.';
      },
      apply: () => {
        const n = next();
        if (!n) return null;
        snap(n.id);
        refresh();
        ctx.requestSave();
        return 'Placed a piece for you.';
      },
    });

    root.append(
      el('div', { class: 'game-board jigsaw-board' }, [canvas]),
      status,
      el('div', { class: 'game-bar' }, [
        help.toggle,
        peekBtn,
        spreadBtn,
        countBtn,
        nextBtn,
        overBtn,
      ]),
      help.panel,
    );
    paintedKey = '';
    refresh();
    help.maybeShowRules();
  }

  const validPuzzle = (s: unknown, total: number): s is SavedPuzzle => {
    const p = s as SavedPuzzle | null;
    return (
      !!p &&
      Array.isArray(p.pieces) &&
      p.pieces.length === total &&
      p.pieces.every(
        (q, i) =>
          q &&
          q.id === i &&
          Number.isFinite(q.x) &&
          Number.isFinite(q.y) &&
          typeof q.placed === 'boolean',
      ) &&
      Array.isArray(p.order) &&
      p.order.length === total &&
      new Set(p.order).size === total &&
      p.order.every((n) => Number.isInteger(n) && n >= 0 && n < total)
    );
  };

  return {
    id: 'slow-puzzle',
    title: 'Slow Puzzle',
    load(state) {
      const s = state as Partial<Saved> | null;
      if (!s) return;
      if (Number.isInteger(s.scene) && s.scene! >= 0 && s.scene! < SCENES.length)
        sceneIdx = s.scene!;
      if (PIECE_COUNTS.includes(s.count as PieceCount)) count = s.count as PieceCount;
      for (let i = 0; i < SCENES.length; i++) {
        for (const n of PIECE_COUNTS) {
          const saved = s.puzzles?.[keyOf(i, n)];
          const { rows, cols } = gridFor(n);
          if (validPuzzle(saved, rows * cols)) puzzles[keyOf(i, n)] = saved;
        }
      }
    },
    mount(el_, c) {
      root = el_;
      ctx = c;
      mountPuzzle();
    },
    pause() {},
    resume() {
      requestDraw();
    },
    save(): Saved {
      return { scene: sceneIdx, count, puzzles };
    },
    unmount() {
      if (highlight) window.clearTimeout(highlight.timer);
      highlight = null;
      cancelAnimationFrame(frame);
      frame = 0;
      root.replaceChildren();
    },
  };
}
