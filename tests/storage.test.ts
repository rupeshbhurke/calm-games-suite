import { describe, expect, it } from 'vitest';
import {
  addMoodEntry,
  DEFAULT_SETTINGS,
  loadMoodLog,
  loadSettings,
  moodDelta,
  saveSettings,
  type KeyValueStore,
} from '../src/core/storage';

function fakeStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe('settings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadSettings(fakeStore())).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved settings', () => {
    const store = fakeStore();
    saveSettings({ ...DEFAULT_SETTINGS, theme: 'dusk', music: 0.2, leftHanded: true }, store);
    expect(loadSettings(store)).toMatchObject({ theme: 'dusk', music: 0.2, leftHanded: true });
  });

  it('ignores corrupt or wrong-version data and clamps volumes', () => {
    const store = fakeStore();
    store.setItem('calm.settings', '{not json');
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    store.setItem('calm.settings', JSON.stringify({ v: 99, data: { music: 0.1 } }));
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    store.setItem('calm.settings', JSON.stringify({ v: 1, data: { music: 7, theme: 'neon' } }));
    expect(loadSettings(store)).toMatchObject({ music: 1, theme: 'auto' });
  });

  it('survives a missing store', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, null)).not.toThrow();
  });
});

describe('mood log', () => {
  it('computes the change between before and after for a session', () => {
    const store = fakeStore();
    addMoodEntry({ at: 1, phase: 'before', score: 2, session: 7 }, store);
    expect(moodDelta(loadMoodLog(store), 7)).toBeNull();
    addMoodEntry({ at: 2, phase: 'after', score: 4, session: 7 }, store);
    expect(moodDelta(loadMoodLog(store), 7)).toBe(2);
    expect(moodDelta(loadMoodLog(store), 8)).toBeNull();
  });

  it('drops invalid entries', () => {
    const store = fakeStore();
    store.setItem(
      'calm.mood',
      JSON.stringify({ v: 1, data: [{ at: 1, phase: 'after', score: 9, session: 1 }] }),
    );
    expect(loadMoodLog(store)).toEqual([]);
  });
});

describe('breathing settings', () => {
  it('clamps pace and rejects unknown patterns, sounds and durations', () => {
    const store = fakeStore();
    store.setItem(
      'calm.settings',
      JSON.stringify({
        v: 1,
        data: { breathPace: 99, breathPattern: 'wild', breathSound: 'horn', breathMinutes: 7 },
      }),
    );
    expect(loadSettings(store)).toMatchObject({
      breathPace: 8,
      breathPattern: 'gentle',
      breathSound: 'gong',
      breathMinutes: 0,
    });
  });

  it('round-trips valid choices', () => {
    const store = fakeStore();
    saveSettings(
      {
        ...DEFAULT_SETTINGS,
        breathPattern: 'box',
        breathPace: 4,
        breathMinutes: 3,
        breathCount: false,
      },
      store,
    );
    expect(loadSettings(store)).toMatchObject({
      breathPattern: 'box',
      breathPace: 4,
      breathMinutes: 3,
      breathCount: false,
    });
  });
});
