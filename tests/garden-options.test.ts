import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPTIONS,
  sanitizeOptions,
  stoneRadius,
  STONE_COLORS,
} from '../src/games/zen-garden/options';
import { wavy, rakeLines } from '../src/games/zen-garden/rake';

describe('garden options', () => {
  it('falls back to defaults for missing or invalid data', () => {
    expect(sanitizeOptions(null)).toEqual(DEFAULT_OPTIONS);
    expect(
      sanitizeOptions({ rakeTeeth: 4 as never, stoneColor: 'pink' as never, stoneSize: 'large' }),
    ).toEqual({ ...DEFAULT_OPTIONS, stoneSize: 'large' });
  });

  it('keeps every valid choice', () => {
    const custom = {
      rakeTeeth: 9,
      rakeSpacing: 'wide',
      rakeStyle: 'wavy',
      stoneSize: 'small',
      stoneColor: 'slate',
      stoneShape: 'flat',
    } as const;
    expect(sanitizeOptions(custom)).toEqual(custom);
    expect(Object.keys(STONE_COLORS)).toContain('slate');
  });

  it('sizes stones by choice, and only varies for mixed', () => {
    expect(stoneRadius('small', 0.9)).toBe(stoneRadius('small', 0.1));
    expect(stoneRadius('small', 0.5)).toBeLessThan(stoneRadius('large', 0.5));
    expect(stoneRadius('mixed', 1)).toBeGreaterThan(stoneRadius('mixed', 0));
  });
});

describe('wavy rake', () => {
  const line = Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: 0 }));

  it('sways a straight path sideways and keeps its length in points', () => {
    const out = wavy(line, 4, 60);
    expect(out).toHaveLength(line.length);
    expect(Math.max(...out.map((p) => Math.abs(p.y)))).toBeGreaterThan(2);
    expect(out[0].y).toBeCloseTo(0);
  });

  it('feeds the rake teeth like any other path', () => {
    expect(rakeLines(wavy(line, 4, 60), 7, 5)).toHaveLength(7);
  });

  it('leaves a single point alone', () => {
    expect(wavy([{ x: 1, y: 2 }], 4, 60)).toEqual([{ x: 1, y: 2 }]);
  });
});
