import { describe, expect, it } from 'vitest';
import {
  circleScale,
  cycleSeconds,
  MAX_PACE_S,
  MIN_PACE_S,
  PATTERNS,
  phaseAt,
  scalePattern,
} from '../src/core/breath';

describe('scalePattern', () => {
  it('gentle at the default pace is 6 breaths a minute', () => {
    expect(60 / cycleSeconds(scalePattern('gentle', 5))).toBe(6);
  });

  it('scales every phase with the pace and clamps it', () => {
    expect(cycleSeconds(scalePattern('box', 5))).toBe(16);
    expect(cycleSeconds(scalePattern('box', 10))).toBeCloseTo((16 * MAX_PACE_S) / 5);
    expect(cycleSeconds(scalePattern('box', 1))).toBeCloseTo((16 * MIN_PACE_S) / 5);
  });

  it('relaxing breathes out longer than in', () => {
    const [inn, out] = PATTERNS.relaxing.phases;
    expect(out.seconds).toBeGreaterThan(inn.seconds);
  });
});

describe('phaseAt', () => {
  const gentle = scalePattern('gentle', 5);
  const box = scalePattern('box', 5);

  it('breathes in for 5 s, then out, then repeats', () => {
    expect(phaseAt(0, gentle).label).toBe('Breathe in');
    expect(phaseAt(4.9, gentle).label).toBe('Breathe in');
    expect(phaseAt(5, gentle).label).toBe('Breathe out');
    expect(phaseAt(10, gentle).label).toBe('Breathe in');
  });

  it('reports time left, progress and what comes next', () => {
    const s = phaseAt(1, gentle);
    expect(s.remaining).toBe(4);
    expect(s.progress).toBeCloseTo(0.2);
    expect(s.nextLabel).toBe('Breathe out');
  });

  it('step changes exactly at each phase boundary', () => {
    expect(phaseAt(4.99, gentle).step).toBe(0);
    expect(phaseAt(5, gentle).step).toBe(1);
    expect(phaseAt(10, gentle).step).toBe(2);
  });

  it('walks through the box: in, hold, out, hold', () => {
    const kinds = [0, 4, 8, 12, 16].map((t) => phaseAt(t, box).kind);
    expect(kinds).toEqual(['in', 'hold-in', 'out', 'hold-out', 'in']);
  });

  it('treats negative time as the start', () => {
    expect(phaseAt(-3, gentle).step).toBe(0);
  });
});

describe('circleScale', () => {
  it('grows on in, shrinks on out and stays put on holds', () => {
    expect(circleScale('in', 0)).toBeCloseTo(0.6);
    expect(circleScale('in', 1)).toBeCloseTo(1);
    expect(circleScale('out', 0)).toBeCloseTo(1);
    expect(circleScale('out', 1)).toBeCloseTo(0.6);
    expect(circleScale('hold-in', 0.5)).toBe(1);
    expect(circleScale('hold-out', 0.5)).toBe(0.6);
  });
});
