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
