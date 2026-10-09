/**
 * Calm audio mixer, synthesised with Web Audio so the shell needs no audio
 * files yet: a rain bed (nature), slow pentatonic pads with long silences
 * (music) and soft taps and chimes (effects). Each layer has its own volume.
 */

/** D major pentatonic across two octaves, in Hz. */
export const PENTATONIC_HZ = [
  146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0, 493.88,
];

/** Perceptual volume curve: slider 0-1 to gain, quiet at the low end. */
export function volumeToGain(volume: number): number {
  const v = Math.min(1, Math.max(0, volume));
  return v * v;
}

/** Seconds to wait before the next music phrase: mostly 6-12 s, sometimes a long near-silence. */
export function nextMusicGapS(rand: () => number = Math.random): number {
  return rand() < 0.25 ? 20 + rand() * 40 : 6 + rand() * 6;
}

export interface GongPartial {
  hz: number;
  gain: number;
  /** Seconds to fade to silence. */
  decayS: number;
}

/** Inharmonic partials that make a struck-bronze tone: a round low note with a soft shimmer above. */
export function gongPartials(baseHz: number, decayS: number): GongPartial[] {
  const ratios = [1, 2.76, 5.4, 8.93];
  const gains = [1, 0.5, 0.25, 0.12];
  const decays = [1, 0.7, 0.45, 0.3];
  return ratios.map((r, i) => ({ hz: baseHz * r, gain: gains[i], decayS: decayS * decays[i] }));
}

export interface Volumes {
  music: number;
  nature: number;
  effects: number;
  muted: boolean;
}

export class Mixer {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses!: { music: GainNode; nature: GainNode; effects: GainNode };
  private musicTimer: number | undefined;
  private volumes: Volumes = { music: 0.5, nature: 0.5, effects: 0.6, muted: false };

  /** Browsers only allow audio after a user gesture, so start lazily from one. */
  unlock(): void {
    if (!this.ctx) this.build();
    void this.ctx?.resume();
  }

  setVolumes(volumes: Volumes): void {
    this.volumes = volumes;
    this.applyVolumes();
  }

  /** Pause all sound while the page is hidden; resume when it returns. */
  setActive(active: boolean): void {
    if (!this.ctx) return;
    if (active) void this.ctx.resume();
    else void this.ctx.suspend();
  }

  /** A soft pentatonic chime. `degree` picks the note; any integer works. */
  chime(degree: number): void {
    if (!this.ctx) return;
    const i = ((degree % PENTATONIC_HZ.length) + PENTATONIC_HZ.length) % PENTATONIC_HZ.length;
    this.tone(PENTATONIC_HZ[i] * 2, this.buses.effects, 0.25, 0.01, 1.8);
  }

  /** A soft gong. Plays through the effects bus, so its slider and mute apply. */
  gong(baseHz = 110, decayS = 4): void {
    if (!this.ctx) return;
    for (const p of gongPartials(baseHz, decayS)) {
      this.tone(p.hz, this.buses.effects, 0.12 * p.gain, 0.01, p.decayS);
    }
  }

  /** A low, muted stone tap. */
  tap(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain).connect(this.buses.effects);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private build(): void {
    const Ctor: typeof AudioContext | undefined =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    const bus = () => {
      const g = ctx.createGain();
      g.connect(this.master);
      return g;
    };
    this.buses = { music: bus(), nature: bus(), effects: bus() };
    this.applyVolumes();
    this.startRain();
    this.scheduleMusic(2);
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const ramp = (param: AudioParam, value: number) => param.setTargetAtTime(value, t, 0.15);
    ramp(this.master.gain, this.volumes.muted ? 0 : 1);
    ramp(this.buses.music.gain, volumeToGain(this.volumes.music));
    ramp(this.buses.nature.gain, volumeToGain(this.volumes.nature));
    ramp(this.buses.effects.gain, volumeToGain(this.volumes.effects));
  }

  /** Looping soft noise, band-limited so it reads as gentle rain. */
  private startRain(): void {
    const ctx = this.ctx!;
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04; // brown-ish noise: soft, no hiss
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 400;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 3500;
    const level = ctx.createGain();
    level.gain.value = 0.6;
    src.connect(high).connect(low).connect(level).connect(this.buses.nature);
    src.start();
  }

  private scheduleMusic(delayS: number): void {
    this.musicTimer = window.setTimeout(() => {
      this.playPhrase();
      this.scheduleMusic(nextMusicGapS());
    }, delayS * 1000);
  }

  private playPhrase(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const count = 2 + Math.floor(Math.random() * 2);
    let start = 0;
    for (let n = 0; n < count; n++) {
      const hz = PENTATONIC_HZ[Math.floor(Math.random() * 6)];
      this.tone(hz, this.buses.music, 0.18, 2.5, 5, start);
      start += 2.5 + Math.random() * 1.5; // about 60 BPM spacing
    }
  }

  private tone(
    hz: number,
    dest: AudioNode,
    peak: number,
    attack: number,
    release: number,
    delay = 0,
  ) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
    osc.connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + attack + release + 0.1);
  }

  destroy(): void {
    window.clearTimeout(this.musicTimer);
    void this.ctx?.close();
    this.ctx = null;
  }
}
