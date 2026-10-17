/** Cell states the player can set: blank, filled, or marked as empty. */
export type Cell = 0 | 1 | 2;

export interface Puzzle {
  id: string;
  title: string;
  /** '#' filled, '.' empty. */
  art: string[];
}

export function parseArt(art: string[]): boolean[][] {
  return art.map((row) => [...row].map((c) => c === '#'));
}

/** Run lengths of filled cells in a line; an empty line gives [0]. */
export function lineClues(line: boolean[]): number[] {
  const runs: number[] = [];
  let run = 0;
  for (const filled of line) {
    if (filled) run++;
    else if (run) {
      runs.push(run);
      run = 0;
    }
  }
  if (run) runs.push(run);
  return runs.length ? runs : [0];
}

export function rowClues(grid: boolean[][]): number[][] {
  return grid.map(lineClues);
}

export function colClues(grid: boolean[][]): number[][] {
  return grid[0].map((_, c) => lineClues(grid.map((row) => row[c])));
}

const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Solved when every row and column matches its clues, even if the picture differs from the author's. */
export function isSolved(cells: Cell[][], solution: boolean[][]): boolean {
  const filled = cells.map((row) => row.map((c) => c === 1));
  const rows = rowClues(solution);
  const cols = colClues(solution);
  return (
    rowClues(filled).every((r, i) => same(r, rows[i])) &&
    colClues(filled).every((c, i) => same(c, cols[i]))
  );
}

export function emptyCells(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () => Array<Cell>(cols).fill(0));
}

/** A cell the player has not got right yet, for a gentle hint; null if the grid already matches. */
export function hintCell(cells: Cell[][], solution: boolean[][]): { r: number; c: number } | null {
  const wrong: { r: number; c: number }[] = [];
  solution.forEach((row, r) =>
    row.forEach((want, c) => {
      if (want !== (cells[r][c] === 1)) wrong.push({ r, c });
    }),
  );
  return wrong.length ? wrong[Math.floor(Math.random() * wrong.length)] : null;
}

export function progress(cells: Cell[][], solution: boolean[][]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  solution.forEach((row, r) =>
    row.forEach((want, c) => {
      if (want) {
        total++;
        if (cells[r][c] === 1) done++;
      }
    }),
  );
  return { done, total };
}

export const PUZZLES: Puzzle[] = [
  { id: 'tulip', title: 'Tulip', art: ['#...#', '##.##', '.###.', '..#..', '..#..'] },
  {
    id: 'pine',
    title: 'Pine',
    art: ['...#...', '..###..', '...#...', '..###..', '.#####.', '...#...', '...#...'],
  },
  {
    id: 'leaf',
    title: 'Leaf',
    art: ['.....##', '...####', '..#####', '.######', '.#####.', '##.##..', '#......'],
  },
];

export interface LineHelp {
  axis: 'row' | 'col';
  /** Zero-based line number. */
  index: number;
  /** mistake: a filled cell that should be empty; full: the clue fills the line; overlap: a long run must cover the middle; try: no shortcut, start here. */
  kind: 'mistake' | 'full' | 'overlap' | 'try';
  clue: number[];
  length: number;
  /** One cell on that line the player has not got right yet. */
  cell: { r: number; c: number };
}

/** Cells a run of `run` must cover in a line of `length`, wherever it sits. */
const overlapSize = (run: number, length: number) => Math.max(0, 2 * run - length);
const minSpan = (clue: number[]) => clue.reduce((a, b) => a + b, 0) + clue.length - 1;

/** Picks the line to talk about: mistakes first, then lines the clue settles outright, then the best foothold. */
export function helpTarget(cells: Cell[][], solution: boolean[][]): LineHelp | null {
  const rows = solution.length;
  const cols = solution[0].length;
  const lines: { axis: 'row' | 'col'; index: number; pos: { r: number; c: number }[] }[] = [
    ...Array.from({ length: rows }, (_, r) => ({
      axis: 'row' as const,
      index: r,
      pos: Array.from({ length: cols }, (_, c) => ({ r, c })),
    })),
    ...Array.from({ length: cols }, (_, c) => ({
      axis: 'col' as const,
      index: c,
      pos: Array.from({ length: rows }, (_, r) => ({ r, c })),
    })),
  ];
  let best: { help: LineHelp; rank: number } | null = null;
  for (const line of lines) {
    const wrong = line.pos.filter((p) => solution[p.r][p.c] !== (cells[p.r][p.c] === 1));
    if (!wrong.length) continue;
    const clue = lineClues(line.pos.map((p) => solution[p.r][p.c]));
    const length = line.pos.length;
    const mistake = wrong.find((p) => !solution[p.r][p.c]);
    let kind: LineHelp['kind'];
    let rank: number;
    if (mistake) {
      kind = 'mistake';
      rank = 1000;
    } else if (clue[0] !== 0 && minSpan(clue) === length) {
      kind = 'full';
      rank = 500;
    } else if (overlapSize(Math.max(...clue), length) > 0) {
      kind = 'overlap';
      rank = 100 + overlapSize(Math.max(...clue), length);
    } else {
      kind = 'try';
      rank = clue.reduce((a, b) => a + b, 0);
    }
    if (!best || rank > best.rank) {
      best = {
        help: { axis: line.axis, index: line.index, kind, clue, length, cell: mistake ?? wrong[0] },
        rank,
      };
    }
  }
  return best?.help ?? null;
}

/** A plain-words pointer for a line; never gives the answer away. */
export function describeHelp(h: LineHelp): string {
  const name = `${h.axis === 'row' ? 'Row' : 'Column'} ${h.index + 1}`;
  const clue = h.clue.join(' ');
  switch (h.kind) {
    case 'mistake':
      return `${name} has a filled cell that does not fit its clue (${clue}). Take another look at it.`;
    case 'full':
      return `${name} says ${clue} in ${h.length} cells. The clue fills the whole line, with one gap between runs.`;
    case 'overlap': {
      const longest = Math.max(...h.clue);
      return `${name}: the longest run is ${longest} in ${h.length} cells, so the middle ${overlapSize(longest, h.length)} of it are always filled.`;
    }
    default:
      return `Try ${name.toLowerCase()}. Its clue is ${clue}.`;
  }
}
