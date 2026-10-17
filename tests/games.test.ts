import { describe, expect, it } from 'vitest';
import { parseRoute, gameHash } from '../src/core/router';
import {
  applyMove,
  chooseGentleMove,
  legalMoves,
  newGame,
  score,
  suggestMove,
  type KalahState,
} from '../src/games/river-stones/kalah';
import {
  colClues,
  emptyCells,
  hintCell,
  isSolved,
  lineClues,
  parseArt,
  progress,
  PUZZLES,
  rowClues,
} from '../src/games/quiet-grid/nonogram';
import { buildRegions, PALETTE } from '../src/games/petal-mandala/regions';

const total = (s: KalahState) => s.pits.reduce((a, b) => a + b, 0);

describe('router', () => {
  it('parses home and game routes', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/')).toEqual({ name: 'home' });
    expect(parseRoute(gameHash('river-stones'))).toEqual({ name: 'game', id: 'river-stones' });
    expect(parseRoute('#/game/../x')).toEqual({ name: 'home' });
  });
});

describe('kalah', () => {
  it('starts with 4 stones in each pit and empty stores', () => {
    const s = newGame();
    expect(total(s)).toBe(48);
    expect(legalMoves(s)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('gives an extra turn when the last stone lands in your store', () => {
    const r = applyMove(newGame(), 2);
    expect(r.extraTurn).toBe(true);
    expect(r.state.turn).toBe(0);
    expect(r.state.pits[6]).toBe(1);
  });

  it('passes the turn otherwise', () => {
    const r = applyMove(newGame(), 0);
    expect(r.extraTurn).toBe(false);
    expect(r.state.turn).toBe(1);
  });

  it('skips the opponent store when sowing', () => {
    const s = newGame();
    s.pits[5] = 9;
    const r = applyMove(s, 5);
    expect(r.path).not.toContain(13);
    expect(r.state.pits[13]).toBe(0);
    expect(total(r.state)).toBe(total(s));
  });

  it('captures the opposite pit when landing in an empty own pit', () => {
    const s: KalahState = { pits: [1, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 3, 0, 0], turn: 0 };
    const r = applyMove(s, 0);
    expect(r.captured).toBe(4);
    expect(r.state.pits[6]).toBe(4);
    expect(r.state.pits[1]).toBe(0);
    expect(r.state.pits[11]).toBe(0);
  });

  it('ends when a side is empty and sweeps the rest to its owner', () => {
    const s: KalahState = { pits: [0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 3, 0, 0, 0], turn: 0 };
    const r = applyMove(s, 5);
    expect(r.over).toBe(true);
    expect(score(r.state)).toEqual([1, 5]);
    expect(total(r.state)).toBe(6);
  });

  it('rejects illegal moves', () => {
    expect(() => applyMove(newGame(), 7)).toThrow(RangeError);
    expect(() => applyMove(newGame(), 6)).toThrow(RangeError);
  });

  it('always plays a legal move, even a random one', () => {
    let s = newGame();
    for (let i = 0; i < 200; i++) {
      const move = chooseGentleMove(s, Math.random);
      expect(legalMoves(s)).toContain(move);
      const r = applyMove(s, move);
      s = r.state;
      expect(total(s)).toBe(48);
      if (r.over) break;
    }
  });

  it('suggests the extra-turn move at the start', () => {
    expect(suggestMove(newGame())).toBe(2);
  });
});

describe('nonogram', () => {
  it('computes run-length clues', () => {
    expect(lineClues([true, true, false, true])).toEqual([2, 1]);
    expect(lineClues([false, false])).toEqual([0]);
    const g = parseArt(['##.', '..#']);
    expect(rowClues(g)).toEqual([[2], [1]]);
    expect(colClues(g)).toEqual([[1], [1], [1]]);
  });

  it('has well-formed puzzles', () => {
    for (const p of PUZZLES) {
      expect(new Set(p.art.map((r) => r.length)).size).toBe(1);
      expect(p.art.join('')).toMatch(/^[#.]+$/);
    }
  });

  it('solves when the clues match, and not before', () => {
    const solution = parseArt(PUZZLES[0].art);
    const cells = emptyCells(5, 5);
    expect(isSolved(cells, solution)).toBe(false);
    solution.forEach((row, r) => row.forEach((on, c) => on && (cells[r][c] = 1)));
    expect(isSolved(cells, solution)).toBe(true);
    expect(progress(cells, solution).done).toBe(progress(cells, solution).total);
  });

  it('counts marked-empty cells as not filled', () => {
    const solution = parseArt(['#.']);
    expect(isSolved([[2, 0]], solution)).toBe(false);
    expect(isSolved([[1, 2]], solution)).toBe(true);
  });

  it('offers a hint only while something is wrong', () => {
    const solution = parseArt(['#.']);
    expect(hintCell([[0, 0]], solution)).toEqual({ r: 0, c: 0 });
    expect(hintCell([[1, 0]], solution)).toBeNull();
  });
});

describe('mandala regions', () => {
  it('builds numbered regions with finite paths', () => {
    const regions = buildRegions();
    expect(regions.length).toBe(1 + 8 + 16 + 16 + 16);
    expect(regions.map((r) => r.id)).toEqual(regions.map((_, i) => i));
    for (const r of regions) expect(r.d).not.toMatch(/NaN|Infinity/);
  });

  it('has a distinct palette', () => {
    expect(new Set(PALETTE.map((p) => p.color)).size).toBe(PALETTE.length);
  });
});
