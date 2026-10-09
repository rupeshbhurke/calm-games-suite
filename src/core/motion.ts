/** Effective reduced-motion state: the user's override, else the system preference. */
export function prefersReducedMotion(override: boolean | null): boolean {
  if (override !== null) return override;
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function applyMotion(reduced: boolean, root: HTMLElement = document.documentElement): void {
  root.dataset.motion = reduced ? 'reduced' : 'full';
}
