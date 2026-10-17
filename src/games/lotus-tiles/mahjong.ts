/**
 * Mahjong solitaire rules, with no DOM. Tiles sit on a half-tile grid: a tile is two
 * units wide and two units tall, so neighbours are two apart and a tile on the layer
 * above can straddle the one below.
 */
export interface Pos {
  x: number;
  y: number;
  z: number;
}

export interface Tile extends Pos {
  id: number;
  /** Index into SYMBOLS. Two free tiles with the same symbol can be matched. */
  symbol: number;
  removed: boolean;
}

export interface Symbol {
  glyph: string;
  name: string;
}

/** Plain, widely supported symbols; each also has a name for screen readers and help. */
export const SYMBOLS: Symbol[] = [
  { glyph: '🌸', name: 'blossom' },
  { glyph: '🌿', name: 'herb' },
  { glyph: '🍃', name: 'leaf' },
  { glyph: '🌙', name: 'moon' },
  { glyph: '☀️', name: 'sun' },
  { glyph: '⭐', name: 'star' },
  { glyph: '🌼', name: 'daisy' },
  { glyph: '🐟', name: 'fish' },
  { glyph: '🦋', name: 'butterfly' },
  { glyph: '🍂', name: 'autumn leaf' },
  { glyph: '🌊', name: 'wave' },
  { glyph: '🍄', name: 'mushroom' },
];

export interface Layout {
  id: string;
  title: string;
  positions: Pos[];
}

function block(z: number, cols: number, rows: number, x0: number, y0: number): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) out.push({ x: x0 + c * 2, y: y0 + r * 2, z });
  }
  return out;
}

export const LAYOUTS: Layout[] = [
  {
    id: 'bud',
    title: 'Bud',
    positions: [...block(0, 6, 4, 0, 0), ...block(1, 2, 2, 4, 2)],
  },
  {
    id: 'lotus',
    title: 'Lotus',
    positions: [...block(0, 8, 4, 0, 0), ...block(1, 6, 2, 2, 2), ...block(2, 2, 2, 6, 2)],
  },
];

export interface Game {
  layoutId: string;
  tiles: Tile[];
}

/** Small seeded generator so a deal can be reproduced in tests. */
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

function shuffled<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const overlapsY = (a: Pos, b: Pos) => Math.abs(a.y - b.y) < 2;
const overlapsX = (a: Pos, b: Pos) => Math.abs(a.x - b.x) < 2;

/** A tile is free when nothing sits on it and its left or right side is open. */
export function isFree(tile: Pos, others: Pos[]): boolean {
  let left = false;
  let right = false;
  for (const o of others) {
    if (o === tile) continue;
    if (o.z === tile.z + 1 && overlapsX(o, tile) && overlapsY(o, tile)) return false;
    if (o.z === tile.z && overlapsY(o, tile)) {
      if (o.x === tile.x - 2) left = true;
      if (o.x === tile.x + 2) right = true;
    }
  }
  return !(left && right);
}

export const remaining = (tiles: Tile[]) => tiles.filter((t) => !t.removed);

export function freeTiles(tiles: Tile[]): Tile[] {
  const rest = remaining(tiles);
  return rest.filter((t) => isFree(t, rest));
}

export function isFreeTile(tiles: Tile[], id: number): boolean {
  const rest = remaining(tiles);
  const tile = rest.find((t) => t.id === id);
  return !!tile && isFree(tile, rest);
}

/** Every pair of free tiles that match right now. */
export function availablePairs(tiles: Tile[]): [Tile, Tile][] {
  const free = freeTiles(tiles);
  const pairs: [Tile, Tile][] = [];
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (free[i].symbol === free[j].symbol) pairs.push([free[i], free[j]]);
    }
  }
  return pairs;
}

export const isCleared = (tiles: Tile[]) => tiles.every((t) => t.removed);

/**
 * Deal symbols onto positions so the deal can always be cleared: remove two free tiles
 * at a time, give them one symbol, and repeat. Playing those same removals in the same order
 * clears the board, so a solution always exists.
 */
function deal(positions: Pos[], pairSymbols: number[], rand: () => number): number[] | null {
  const symbols: number[] = Array(positions.length).fill(-1);
  const left = new Set(positions.map((_, i) => i));
  const order = shuffled(pairSymbols, rand);
  for (const symbol of order) {
    const live = [...left].map((i) => positions[i]);
    const free = [...left].filter((i) => isFree(positions[i], live));
    if (free.length < 2) return null;
    const pick = shuffled(free, rand).slice(0, 2);
    for (const i of pick) {
      symbols[i] = symbol;
      left.delete(i);
    }
  }
  return symbols;
}

function dealWithRetries(positions: Pos[], pairSymbols: number[], rand: () => number): number[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const result = deal(positions, pairSymbols, rand);
    if (result) return result;
  }
  throw new Error('Could not deal a solvable layout');
}

/** Four of each symbol, so a layout of N tiles uses N / 4 symbols. */
function pairSymbolsFor(count: number): number[] {
  const kinds = count / 4;
  return Array.from({ length: kinds }, (_, s) => [s, s]).flat();
}

export function newGame(layoutId: string, rand: () => number = Math.random): Game {
  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0];
  const symbols = dealWithRetries(layout.positions, pairSymbolsFor(layout.positions.length), rand);
  return {
    layoutId: layout.id,
    tiles: layout.positions.map((p, id) => ({ ...p, id, symbol: symbols[id], removed: false })),
  };
}

/** Re-deal the tiles still on the board. The result is solvable and uses the same symbols. */
export function reshuffle(tiles: Tile[], rand: () => number = Math.random): Tile[] {
  const rest = remaining(tiles);
  const counts = new Map<number, number>();
  for (const t of rest) counts.set(t.symbol, (counts.get(t.symbol) ?? 0) + 1);
  const pairSymbols = [...counts].flatMap(([s, n]) => Array<number>(Math.floor(n / 2)).fill(s));
  const symbols = dealWithRetries(rest, pairSymbols, rand);
  const byId = new Map(rest.map((t, i) => [t.id, symbols[i]]));
  return tiles.map((t) => (t.removed ? t : { ...t, symbol: byId.get(t.id)! }));
}

/**
 * The pair worth pointing at: prefer the one that uncovers the most tiles, so help
 * also nudges the player towards opening up the board.
 */
export function suggestPair(tiles: Tile[]): [Tile, Tile] | null {
  const pairs = availablePairs(tiles);
  if (!pairs.length) return null;
  return pairs.reduce((best, p) => (p[0].z + p[1].z > best[0].z + best[1].z ? p : best), pairs[0]);
}

export function removePair(tiles: Tile[], a: number, b: number): Tile[] {
  return tiles.map((t) => (t.id === a || t.id === b ? { ...t, removed: true } : t));
}
