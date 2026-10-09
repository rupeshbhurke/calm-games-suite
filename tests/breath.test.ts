import { describe, expect, it } from 'vitest';
import { BREATH_CYCLE_S, breathPhase } from '../src/core/breath';

describe('breathPhase', () => {
  it('runs at 6 breaths per minute', () => {
    expect(60 / BREATH_CYCLE_S).toBe(6);
  });

  it('breathes in for the first 5 seconds, then out', () => {
    expect(breathPhase(0)).toBe('Breathe in');
    expect(breathPhase(4.9)).toBe('Breathe in');
    expect(breathPhase(5)).toBe('Breathe out');
    expect(breathPhase(9.9)).toBe('Breathe out');
    expect(breathPhase(10)).toBe('Breathe in');
  });
});
