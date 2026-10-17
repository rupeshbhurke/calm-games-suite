/** Jigsaw rules and geometry helpers, with no DOM. */
export type PieceCount = 12 | 24 | 48;

export const PIECE_COUNTS: PieceCount[] = [12, 24, 48];

export function gridFor(count: PieceCount): { rows: number; cols: number } {
  return count === 12
    ? { rows: 3, cols: 4 }
    : count === 24
      ? { rows: 4, cols: 6 }
      : { rows: 6, cols: 8 };
}

/** Each edge is flat (0), a tab sticking out (1) or a socket (-1). */
export interface Edges {
  top: -1 | 0 | 1;
  right: -1 | 0 | 1;
  bottom: -1 | 0 | 1;
  left: -1 | 0 | 1;
}

export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Edges for every piece so that neighbours fit: one has a tab where the other has a socket. */
export function makeEdges(rows: number, cols: number, rand: () => number): Edges[][] {
  const flip = (): 1 | -1 => (rand() < 0.5 ? 1 : -1);
  const grid: Edges[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ top: 0, right: 0, bottom: 0, left: 0 }) as Edges),
  );
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c < cols - 1) {
        const v = flip();
        grid[r][c].right = v;
        grid[r][c + 1].left = -v as -1 | 1;
      }
      if (r < rows - 1) {
        const v = flip();
        grid[r][c].bottom = v;
        grid[r + 1][c].top = -v as -1 | 1;
      }
    }
  }
  return grid;
}

export interface PieceState {
  /** Row-major: id = row * cols + col. */
  id: number;
  /** Where the piece's own cell corner currently sits, in units of the canvas width. */
  x: number;
  y: number;
  placed: boolean;
}

export const pieceRow = (id: number, cols: number) => Math.floor(id / cols);
export const pieceCol = (id: number, cols: number) => id % cols;

export const isComplete = (pieces: PieceState[]) => pieces.every((p) => p.placed);

export function isSnapped(
  x: number,
  y: number,
  targetX: number,
  targetY: number,
  threshold: number,
): boolean {
  return Math.hypot(x - targetX, y - targetY) <= threshold;
}

export type HelpStage = 'corner' | 'edge' | 'neighbour' | 'any';

const isCorner = (r: number, c: number, rows: number, cols: number) =>
  (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1);
const isEdge = (r: number, c: number, rows: number, cols: number) =>
  r === 0 || r === rows - 1 || c === 0 || c === cols - 1;

/**
 * The piece to point at next: corners, then edges (framing the picture), then pieces that
 * touch ones already placed, then anything left. This is how most people solve a jigsaw.
 */
export function nextHelpPiece(
  pieces: PieceState[],
  rows: number,
  cols: number,
): { id: number; stage: HelpStage } | null {
  const loose = pieces.filter((p) => !p.placed);
  if (!loose.length) return null;
  const at = (p: PieceState) => [pieceRow(p.id, cols), pieceCol(p.id, cols)] as const;
  const corner = loose.find((p) => isCorner(...at(p), rows, cols));
  if (corner) return { id: corner.id, stage: 'corner' };
  const edge = loose.find((p) => isEdge(...at(p), rows, cols));
  if (edge) return { id: edge.id, stage: 'edge' };
  const placed = new Set(pieces.filter((p) => p.placed).map((p) => p.id));
  const touching = loose.find((p) => {
    const [r, c] = at(p);
    return [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ].some(
      ([nr, nc]) => nr >= 0 && nr < rows && nc >= 0 && nc < cols && placed.has(nr * cols + nc),
    );
  });
  return touching ? { id: touching.id, stage: 'neighbour' } : { id: loose[0].id, stage: 'any' };
}

/** Where in the picture a piece belongs, in words: "the top left", "the middle", "the bottom edge". */
export function areaName(id: number, rows: number, cols: number): string {
  const r = pieceRow(id, cols);
  const c = pieceCol(id, cols);
  const v = r < rows / 3 ? 'top' : r >= (rows * 2) / 3 ? 'bottom' : 'middle';
  const h = c < cols / 3 ? 'left' : c >= (cols * 2) / 3 ? 'right' : 'centre';
  if (v === 'middle' && h === 'centre') return 'the middle';
  if (v === 'middle') return `the ${h} side`;
  if (h === 'centre') return `the ${v} centre`;
  return `the ${v} ${h}`;
}

export function nudgeText(stage: HelpStage, id: number, rows: number, cols: number): string {
  const area = areaName(id, rows, cols);
  switch (stage) {
    case 'corner':
      return 'Start with the corners. Corner pieces have two flat sides.';
    case 'edge':
      return `Frame the picture with the edge pieces, which have one flat side. One belongs near ${area}.`;
    case 'neighbour':
      return `Look for a piece that continues from the ones you have placed. Try ${area}.`;
    default:
      return `Pick any loose piece and see whether it belongs near ${area}.`;
  }
}

/** Loose pieces start scattered around the board, rather than on top of it where possible. */
export function scatter(
  count: number,
  area: { w: number; h: number },
  board: { x: number; y: number; w: number; h: number },
  cell: { w: number; h: number },
  rand: () => number,
): { x: number; y: number }[] {
  return Array.from({ length: count }, () => {
    let spot = { x: 0, y: 0 };
    for (let tries = 0; tries < 40; tries++) {
      spot = {
        x: rand() * (area.w - cell.w),
        y: rand() * (area.h - cell.h),
      };
      const overlaps =
        spot.x + cell.w > board.x &&
        spot.x < board.x + board.w &&
        spot.y + cell.h > board.y &&
        spot.y < board.y + board.h;
      if (!overlaps) break;
    }
    return spot;
  });
}
