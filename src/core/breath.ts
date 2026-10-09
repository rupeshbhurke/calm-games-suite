export type PhaseKind = 'in' | 'hold-in' | 'out' | 'hold-out';

export interface Phase {
  kind: PhaseKind;
  seconds: number;
}

export type PatternId = 'gentle' | 'relaxing' | 'box';

export interface Pattern {
  name: string;
  description: string;
  /** Phase lengths at the default pace (5 s). */
  phases: Phase[];
}

export const PATTERNS: Record<PatternId, Pattern> = {
  gentle: {
    name: 'Gentle',
    description: '5 s in, 5 s out: about 6 breaths a minute.',
    phases: [
      { kind: 'in', seconds: 5 },
      { kind: 'out', seconds: 5 },
    ],
  },
  relaxing: {
    name: 'Relaxing',
    description: '4 s in, 6 s out. A longer out-breath tends to calm most.',
    phases: [
      { kind: 'in', seconds: 4 },
      { kind: 'out', seconds: 6 },
    ],
  },
  box: {
    name: 'Box',
    description: '4 s in, hold, out, hold. Holds can feel tense; skip them if so.',
    phases: [
      { kind: 'in', seconds: 4 },
      { kind: 'hold-in', seconds: 4 },
      { kind: 'out', seconds: 4 },
      { kind: 'hold-out', seconds: 4 },
    ],
  },
};

export const DEFAULT_PACE_S = 5;
export const MIN_PACE_S = 3;
export const MAX_PACE_S = 8;

/** The pattern with every phase scaled so the base 5 s step lasts `pace` seconds. */
export function scalePattern(id: PatternId, pace: number): Phase[] {
  const p = Math.min(MAX_PACE_S, Math.max(MIN_PACE_S, pace));
  return PATTERNS[id].phases.map((ph) => ({ ...ph, seconds: (ph.seconds * p) / DEFAULT_PACE_S }));
}

export function cycleSeconds(phases: Phase[]): number {
  return phases.reduce((sum, p) => sum + p.seconds, 0);
}

const LABELS: Record<PhaseKind, string> = {
  in: 'Breathe in',
  'hold-in': 'Hold',
  out: 'Breathe out',
  'hold-out': 'Hold',
};

export interface PhaseState {
  kind: PhaseKind;
  label: string;
  /** Label of the phase that follows, so the user can see the change coming. */
  nextLabel: string;
  /** Length of this phase in seconds. */
  seconds: number;
  /** Seconds left in this phase. */
  remaining: number;
  /** 0 to 1 through this phase. */
  progress: number;
  /** Phases completed since the start; changes exactly when the phase changes. */
  step: number;
}

export function phaseAt(elapsedS: number, phases: Phase[]): PhaseState {
  const cycle = cycleSeconds(phases);
  const e = Math.max(0, elapsedS);
  const cycles = Math.floor(e / cycle);
  let t = e - cycles * cycle;
  let i = 0;
  while (i < phases.length - 1 && t >= phases[i].seconds) {
    t -= phases[i].seconds;
    i++;
  }
  const phase = phases[i];
  const next = phases[(i + 1) % phases.length];
  return {
    kind: phase.kind,
    label: LABELS[phase.kind],
    nextLabel: LABELS[next.kind],
    seconds: phase.seconds,
    remaining: phase.seconds - t,
    progress: Math.min(1, t / phase.seconds),
    step: cycles * phases.length + i,
  };
}

const SMALL = 0.6;
const BIG = 1;

/** Circle scale for a phase: grows on in, shrinks on out, holds steady between. */
export function circleScale(kind: PhaseKind, progress: number): number {
  const eased = (1 - Math.cos(Math.PI * progress)) / 2;
  switch (kind) {
    case 'in':
      return SMALL + (BIG - SMALL) * eased;
    case 'out':
      return BIG - (BIG - SMALL) * eased;
    case 'hold-in':
      return BIG;
    case 'hold-out':
      return SMALL;
  }
}
