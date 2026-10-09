import { MAX_PACE_S, MIN_PACE_S, PATTERNS, type PatternId } from './breath';
import type { Theme } from './theme';

/** Bump when a stored shape changes incompatibly; old data is then ignored. */
const SCHEMA_VERSION = 1;

export interface Settings {
  theme: 'auto' | Theme;
  /** Volumes 0-1. */
  music: number;
  nature: number;
  effects: number;
  muted: boolean;
  /** null follows the system preference. */
  reduceMotion: boolean | null;
  leftHanded: boolean;
  breathPattern: PatternId;
  /** Seconds per base breathing step, MIN_PACE_S to MAX_PACE_S. */
  breathPace: number;
  /** Session length in minutes; 0 means no end. */
  breathMinutes: 0 | 1 | 3 | 5;
  breathSound: 'gong' | 'chime' | 'off';
  /** Show the seconds left inside the circle. */
  breathCount: boolean;
}

export const BREATH_MINUTES = [0, 1, 3, 5] as const;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  music: 0.5,
  nature: 0.5,
  effects: 0.6,
  muted: false,
  reduceMotion: null,
  leftHanded: false,
  breathPattern: 'gentle',
  breathPace: 5,
  breathMinutes: 0,
  breathSound: 'gong',
  breathCount: true,
};

export interface MoodEntry {
  /** Epoch ms. */
  at: number;
  phase: 'before' | 'after';
  /** 1 (very low) to 5 (very calm). */
  score: number;
  /** Groups the before/after pair of one visit. */
  session: number;
}

const MOOD_LOG_LIMIT = 500;

/** The part of the Web Storage API we use, so tests can pass a fake. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStore(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // blocked storage (private mode, strict settings)
  }
}

export function readStored<T>(key: string, store: KeyValueStore | null = defaultStore()): T | null {
  try {
    const raw = store?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v?: number; data?: T };
    return parsed.v === SCHEMA_VERSION && parsed.data !== undefined ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeStored(
  key: string,
  data: unknown,
  store: KeyValueStore | null = defaultStore(),
): void {
  try {
    store?.setItem(key, JSON.stringify({ v: SCHEMA_VERSION, data }));
  } catch {
    // Storage full or unavailable: the app keeps working, just without saving.
  }
}

const clamp01 = (n: unknown, fallback: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;

/** Merge untrusted stored data over the defaults, dropping anything invalid. */
export function sanitizeSettings(raw: Partial<Settings> | null): Settings {
  const d = DEFAULT_SETTINGS;
  const r = raw ?? {};
  return {
    theme: r.theme === 'day' || r.theme === 'dusk' || r.theme === 'night' ? r.theme : 'auto',
    music: clamp01(r.music, d.music),
    nature: clamp01(r.nature, d.nature),
    effects: clamp01(r.effects, d.effects),
    muted: r.muted === true,
    reduceMotion: typeof r.reduceMotion === 'boolean' ? r.reduceMotion : null,
    leftHanded: r.leftHanded === true,
    breathPattern:
      r.breathPattern && r.breathPattern in PATTERNS ? r.breathPattern : d.breathPattern,
    breathPace:
      typeof r.breathPace === 'number' && Number.isFinite(r.breathPace)
        ? Math.min(MAX_PACE_S, Math.max(MIN_PACE_S, r.breathPace))
        : d.breathPace,
    breathMinutes: BREATH_MINUTES.find((m) => m === r.breathMinutes) ?? d.breathMinutes,
    breathSound:
      r.breathSound === 'chime' || r.breathSound === 'off' ? r.breathSound : d.breathSound,
    breathCount: r.breathCount !== false,
  };
}

export function loadSettings(store?: KeyValueStore | null): Settings {
  return sanitizeSettings(readStored<Partial<Settings>>('calm.settings', store));
}

export function saveSettings(settings: Settings, store?: KeyValueStore | null): void {
  writeStored('calm.settings', settings, store);
}

export function loadMoodLog(store?: KeyValueStore | null): MoodEntry[] {
  const raw = readStored<MoodEntry[]>('calm.mood', store);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e) =>
      e &&
      (e.phase === 'before' || e.phase === 'after') &&
      Number.isInteger(e.score) &&
      e.score >= 1 &&
      e.score <= 5,
  );
}

export function addMoodEntry(entry: MoodEntry, store?: KeyValueStore | null): MoodEntry[] {
  const log = [...loadMoodLog(store), entry].slice(-MOOD_LOG_LIMIT);
  writeStored('calm.mood', log, store);
  return log;
}

/** After minus before for one session, or null if either is missing. */
export function moodDelta(log: MoodEntry[], session: number): number | null {
  const before = log.find((e) => e.session === session && e.phase === 'before');
  const after = log.filter((e) => e.session === session && e.phase === 'after').pop();
  return before && after ? after.score - before.score : null;
}
