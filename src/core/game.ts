import type { Mixer } from './audio';

/** What the shell gives each game. */
export interface GameContext {
  mixer: Mixer;
  /** Ask the shell to call save() soon; games call this after every change. */
  requestSave(): void;
  reducedMotion(): boolean;
}

/** Every game implements this so the shell can load, pause, save and resume it the same way. */
export interface CalmGame {
  id: string;
  title: string;
  /** Called before mount with the previously saved state, if any. */
  load(state: unknown): void;
  mount(root: HTMLElement, ctx: GameContext): void;
  pause(): void;
  resume(): void;
  /** Serialisable state. */
  save(): unknown;
  unmount(): void;
}

export interface GameInfo {
  id: string;
  title: string;
  blurb: string;
  create(): CalmGame;
}
