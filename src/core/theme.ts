export type Theme = 'day' | 'dusk' | 'night';

/** Pick a calm theme from the local hour: Day 6:00-18:59, Dusk 19:00-21:59, Night otherwise. */
export function themeForHour(hour: number): Theme {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`hour must be an integer 0-23, got ${hour}`);
  }
  if (hour >= 6 && hour < 19) return 'day';
  if (hour >= 19 && hour < 22) return 'dusk';
  return 'night';
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme;
}
