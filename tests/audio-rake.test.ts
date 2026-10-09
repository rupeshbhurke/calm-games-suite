import { describe, expect, it } from 'vitest';
import { gongPartials, nextMusicGapS, PENTATONIC_HZ, volumeToGain } from '../src/core/audio';
import { rakeLines, thin } from '../src/games/zen-garden/rake';

describe('audio helpers', () => {
  it('maps volume to a quiet-at-the-low-end gain and clamps', () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(1)).toBe(1);
    expect(volumeToGain(0.5)).toBeLessThan(0.5);
    expect(volumeToGain(2)).toBe(1);
    expect(volumeToGain(-1)).toBe(0);
  });

  it('leaves long gaps of near-silence between phrases', () => {
    expect(nextMusicGapS(() => 0)).toBe(20);
    expect(nextMusicGapS(() => 0.99)).toBeCloseTo(6 + 0.99 * 6);
    expect(nextMusicGapS(() => 0.2)).toBeGreaterThanOrEqual(20);
  });

  it('uses an ascending scale', () => {
    expect([...PENTATONIC_HZ].sort((a, b) => a - b)).toEqual(PENTATONIC_HZ);
  });
});

describe('rake', () => {
  it('thins points closer than the minimum distance', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 5, y: 0 },
    ];
    expect(thin(pts, 4)).toEqual([pts[0], pts[2]]);
  });

  it('offsets teeth evenly either side of a straight stroke', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ];
    const lines = rakeLines(line, 3, 4);
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => Math.abs(l[1].y)).sort()).toEqual([0, 4, 4]);
    expect(lines[0][1].y).toBe(-lines[2][1].y);
  });

  it('draws nothing for a single point', () => {
    expect(rakeLines([{ x: 0, y: 0 }], 5, 4)).toEqual([]);
  });
});

describe('gong', () => {
  it('has inharmonic partials that get quieter and fade sooner', () => {
    const parts = gongPartials(110, 4);
    expect(parts[0]).toEqual({ hz: 110, gain: 1, decayS: 4 });
    for (let i = 1; i < parts.length; i++) {
      expect(parts[i].hz / 110).not.toBeCloseTo(Math.round(parts[i].hz / 110), 1);
      expect(parts[i].gain).toBeLessThan(parts[i - 1].gain);
      expect(parts[i].decayS).toBeLessThan(parts[i - 1].decayS);
    }
  });
});
