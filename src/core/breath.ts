/** Breathing cycle in seconds: 5 s in + 5 s out = 6 breaths per minute. */
export const BREATH_CYCLE_S = 10;

export type BreathPhase = 'Breathe in' | 'Breathe out';

/** Which phase of the breathing cycle we are in, given elapsed seconds. */
export function breathPhase(elapsedS: number): BreathPhase {
  const t = ((elapsedS % BREATH_CYCLE_S) + BREATH_CYCLE_S) % BREATH_CYCLE_S;
  return t < BREATH_CYCLE_S / 2 ? 'Breathe in' : 'Breathe out';
}
