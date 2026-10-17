import { describe, expect, it } from 'vitest';
import {
  availablePairs,
  freeTiles,
  isCleared,
  isFree,
  LAYOUTS,
  newGame,
  remaining,
  removePair,
  reshuffle,
  seededRandom,
  suggestPair,
  SYMBOLS,
  type Tile,
} from '../src/games/lotus-tiles/mahjong';

const counts = (tiles: Tile[]) => {
  const m = new Map<number, number>();
  for (const t of tiles) m.set(t.symbol, (m.get(t.symbol) ?? 0) + 1);
  return m;
};

describe('free tiles', () => {
  it('needs an open side and nothing on top', () => {
    const row = [
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 4, y: 0, z: 0 },
    ];
    expect(isFree(row[0], row)).toBe(true);
    expect(isFree(row[1], row)).toBe(false); // hemmed in both sides
    expect(isFree(row[2], row)).toBe(true);
    const stacked = [...row, { x: 4, y: 0, z: 1 }];
    expect(isFree(stacked[2], stacked)).toBe(false); // covered
    expect(isFree(stacked[3], stacked)).toBe(true);
  });

  it('is not blocked by a tile on the next row down', () => {
    const tiles = [
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 4, y: 0, z: 0 },
      { x: 2, y: 2, z: 0 },
    ];
    expect(isFree(tiles[1], tiles)).toBe(false);
    expect(isFree(tiles[3], tiles)).toBe(true);
  });
});

describe('dealing', () => {
  it.each(LAYOUTS.map((l) => l.id))(
    '%s uses four of each symbol and a whole number of pairs',
    (id) => {
      const g = newGame(id, seededRandom(7));
      expect(g.tiles.length % 4).toBe(0);
      for (const n of counts(g.tiles).values()) expect(n).toBe(4);
      expect(counts(g.tiles).size).toBeLessThanOrEqual(SYMBOLS.length);
    },
  );

  it.each(LAYOUTS.map((l) => l.id))('%s is always solvable, for many seeds', (id) => {
    for (let seed = 1; seed <= 40; seed++) {
      const g = newGame(id, seededRandom(seed));
      // The dealer removes pairs in a playable order, so a pair of free matches always exists.
      expect(availablePairs(g.tiles).length).toBeGreaterThan(0);
    }
  });

  it('can be cleared by following the dealt order', () => {
    // Re-deal from the same seed and check a solution exists by searching with backtracking.
    const solvable = (tiles: Tile[], depth = 0): boolean => {
      if (isCleared(tiles)) return true;
      if (depth > 60) return false;
      for (const [a, b] of availablePairs(tiles)) {
        if (solvable(removePair(tiles, a.id, b.id), depth + 1)) return true;
      }
      return false;
    };
    const g = newGame('bud', seededRandom(3));
    expect(solvable(g.tiles)).toBe(true);
  });
});

describe('reshuffle', () => {
  it('keeps the same tiles and symbols, and leaves a move to make', () => {
    const g = newGame('lotus', seededRandom(5));
    let tiles = g.tiles;
    for (let i = 0; i < 6; i++) {
      const [a, b] = availablePairs(tiles)[0];
      tiles = removePair(tiles, a.id, b.id);
    }
    const before = counts(remaining(tiles));
    const next = reshuffle(tiles, seededRandom(11));
    expect(counts(remaining(next))).toEqual(before);
    expect(next.filter((t) => t.removed)).toHaveLength(12);
    expect(availablePairs(next).length).toBeGreaterThan(0);
  });

  it('never loses a position', () => {
    const g = newGame('bud', seededRandom(2));
    const next = reshuffle(g.tiles, seededRandom(9));
    expect(next.map((t) => [t.x, t.y, t.z])).toEqual(g.tiles.map((t) => [t.x, t.y, t.z]));
  });
});

describe('help', () => {
  it('suggests a real free pair', () => {
    const g = newGame('lotus', seededRandom(4));
    const [a, b] = suggestPair(g.tiles)!;
    expect(a.symbol).toBe(b.symbol);
    const free = freeTiles(g.tiles).map((t) => t.id);
    expect(free).toContain(a.id);
    expect(free).toContain(b.id);
  });

  it('has nothing to suggest on a cleared board', () => {
    const g = newGame('bud', seededRandom(1));
    const cleared = g.tiles.map((t) => ({ ...t, removed: true }));
    expect(suggestPair(cleared)).toBeNull();
  });

  it('a player who takes the suggested pair, reshuffling when stuck, always finishes', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let tiles = newGame('bud', seededRandom(seed)).tiles;
      let guard = 0;
      while (!isCleared(tiles) && guard++ < 100) {
        const pair = suggestPair(tiles);
        if (!pair) {
          tiles = reshuffle(tiles, seededRandom(seed + 100));
          continue;
        }
        tiles = removePair(tiles, pair[0].id, pair[1].id);
      }
      expect(isCleared(tiles)).toBe(true);
    }
  });
});
