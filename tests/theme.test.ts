import { describe, expect, it } from 'vitest';
import { themeForHour } from '../src/core/theme';

describe('themeForHour', () => {
  it('uses Day during working hours', () => {
    expect(themeForHour(6)).toBe('day');
    expect(themeForHour(18)).toBe('day');
  });

  it('switches to Dusk at 7 pm', () => {
    expect(themeForHour(19)).toBe('dusk');
    expect(themeForHour(21)).toBe('dusk');
  });

  it('uses Night late and early', () => {
    expect(themeForHour(22)).toBe('night');
    expect(themeForHour(0)).toBe('night');
    expect(themeForHour(5)).toBe('night');
  });

  it('rejects invalid hours', () => {
    expect(() => themeForHour(24)).toThrow(RangeError);
    expect(() => themeForHour(-1)).toThrow(RangeError);
  });
});
