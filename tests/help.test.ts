import { describe, expect, it } from 'vitest';
import {
  describeHelp,
  emptyCells,
  helpTarget,
  parseArt,
  PUZZLES,
} from '../src/games/quiet-grid/nonogram';
import { applyMove, moveKind, newGame, type KalahState } from '../src/games/river-stones/kalah';
import { BLANK, buildRegions, nextBlank, ringName } from '../src/games/petal-mandala/regions';

const sol = (id: string) => parseArt(PUZZLES.find((p) => p.id === id)!.art);

describe('quiet grid help', () => {
  it('points at a line the clue settles outright when the grid is empty', () => {
    const solution = sol('tulip');
    const h = helpTarget(emptyCells(5, 5), solution)!;
    expect(['full', 'overlap']).toContain(h.kind);
    expect(solution[h.cell.r][h.cell.c]).toBe(true);
    expect(describeHelp(h)).toMatch(/^(Row|Column) \d/);
  });

  it('flags a wrongly filled cell before anything else', () => {
    const solution = sol('tulip');
    const cells = emptyCells(5, 5);
    cells[0][1] = 1; // tulip row 0 is #...#, so column 1 should be empty
    const h = helpTarget(cells, solution)!;
    expect(h.kind).toBe('mistake');
    expect(h.cell).toEqual({ r: 0, c: 1 });
  });

  it('has nothing to say once the grid matches', () => {
    const solution = sol('pine');
    const cells = solution.map((row) => row.map((v) => (v ? (1 as const) : (0 as const))));
    expect(helpTarget(cells, solution)).toBeNull();
  });
});

describe('river stones help', () => {
  it('names the kind of move without changing the position', () => {
    const s = newGame();
    const before = [...s.pits];
    // From the start, pit 2 (index 2) has 4 stones and ends in the store.
    expect(moveKind(s, 2)).toBe('extra');
    expect(s.pits).toEqual(before);
  });

  it('recognises a capture', () => {
    const s: KalahState = { pits: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0], turn: 0 };
    expect(moveKind(s, 0)).toBe('capture');
    expect(applyMove(s, 0).captured).toBeGreaterThan(0);
  });
});

describe('petal mandala help', () => {
  const regions = buildRegions();

  it('starts at the centre, then moves outwards', () => {
    const fills = regions.map(() => BLANK);
    expect(nextBlank(fills, regions)).toMatchObject({ id: 0, ring: -1, blankInRing: 1 });
    fills[0] = 2;
    expect(nextBlank(fills, regions)).toMatchObject({ id: 1, ring: 0, blankInRing: 8 });
  });

  it('is done when every region is coloured', () => {
    expect(
      nextBlank(
        regions.map(() => 1),
        regions,
      ),
    ).toBeNull();
  });

  it('names rings in plain words', () => {
    expect(ringName(-1)).toBe('centre');
    expect(ringName(0)).toBe('inner petal');
  });
});
