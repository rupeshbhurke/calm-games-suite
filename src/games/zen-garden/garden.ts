import { readStored, writeStored } from '../../core/storage';
import {
  DEFAULT_OPTIONS,
  SPACING_FRACTION,
  STONE_COLORS,
  sanitizeOptions,
  stoneRadius,
  type GardenOptions,
  type StoneColor,
} from './options';
import { rakeLines, thin, wavy, type Point } from './rake';

/** Coordinates are stored as fractions of the canvas so a resize keeps the garden intact. */
interface Stroke {
  kind: 'rake';
  points: Point[];
  /** Older saves have none of these; they fall back to the defaults. */
  teeth?: number;
  /** Gap between teeth as a fraction of the shorter canvas side. */
  spacing?: number;
  wavy?: boolean;
}
interface Stone {
  kind: 'stone';
  x: number;
  y: number;
  /** Radius as a fraction of the shorter canvas side. */
  r: number;
  tilt: number;
  color?: StoneColor;
  flat?: boolean;
}
interface Ripple {
  kind: 'ripple';
  x: number;
  y: number;
  r: number;
  rings: number;
}
interface Moss {
  kind: 'moss';
  x: number;
  y: number;
  r: number;
  seed: number;
}
interface Lantern {
  kind: 'lantern';
  x: number;
  y: number;
  /** Height as a fraction of the shorter canvas side. */
  s: number;
}
type Mark = Stroke | Stone | Ripple | Moss | Lantern;

export type Tool = 'rake' | 'stone' | 'ripple' | 'moss' | 'lantern' | 'erase';

export const TOOL_LABELS: Record<Tool, string> = {
  rake: 'Rake',
  stone: 'Stone',
  ripple: 'Rings',
  moss: 'Moss',
  lantern: 'Lantern',
  erase: 'Erase',
};

export const TOOL_HINTS: Record<Tool, string> = {
  rake: 'Drag to rake the sand',
  stone: 'Tap to place a stone',
  ripple: 'Tap to make rings in the sand',
  moss: 'Tap to grow a patch of moss',
  lantern: 'Tap to set a stone lantern',
  erase: 'Drag over anything to smooth it away',
};

export interface GardenHooks {
  onStone(): void;
  onRake(): void;
  onChange(): void;
}

const SAVE_KEY = 'calm.garden';
const OPTIONS_KEY = 'calm.gardenOptions';
const HISTORY_LIMIT = 100;
const ERASE_RADIUS = 0.06;
const DEFAULT_SPACING = SPACING_FRACTION[DEFAULT_OPTIONS.rakeSpacing];

const COLORS = {
  day: {
    sand: '#e6d5b8',
    groove: '#c9b794',
    ridge: '#f3e8d2',
    moss: ['#7f9f7c', '#92b08a', '#6c8f6e'],
    lamp: '#f6e3b0',
  },
  dusk: {
    sand: '#b9a98c',
    groove: '#9a8b70',
    ridge: '#cdbea1',
    moss: ['#657f66', '#74906f', '#566f58'],
    lamp: '#f2d995',
  },
  night: {
    sand: '#7d7563',
    groove: '#655e4f',
    ridge: '#948b77',
    moss: ['#4f6552', '#5b7359', '#445a48'],
    lamp: '#ffe9a8',
  },
};
type Palette = (typeof COLORS)['day'];

export class Garden {
  private marks: Mark[] = [];
  private current: Point[] | null = null;
  private ctx: CanvasRenderingContext2D;
  private lastRakeSound = 0;
  /** Snapshots taken before each change, so Undo can reverse anything, even Smooth. */
  private history: Mark[][] = [];
  private erasing = false;
  private erased = false;
  tool: Tool = 'rake';
  options: GardenOptions = sanitizeOptions(readStored<Partial<GardenOptions>>(OPTIONS_KEY));

  constructor(
    private canvas: HTMLCanvasElement,
    private hooks: GardenHooks,
  ) {
    this.ctx = canvas.getContext('2d')!;
    const saved = readStored<Mark[]>(SAVE_KEY);
    this.marks = Array.isArray(saved) ? saved : [];
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.up);
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  get canUndo(): boolean {
    return this.marks.length > 0 || this.history.length > 0;
  }

  /** Put the garden back as it was before the last change. Unlimited, no penalty. */
  undo(): void {
    const before = this.history.pop();
    if (before) this.marks = before;
    else this.marks.pop(); // a garden restored from a previous visit has no snapshots
    this.changed();
  }

  /** Smooth the whole garden back to plain sand. Undo brings it back. */
  smooth(): void {
    if (!this.marks.length) return;
    this.remember();
    this.marks = [];
    this.changed();
  }

  setOptions(options: GardenOptions): void {
    this.options = options;
    writeStored(OPTIONS_KEY, options);
  }

  redraw(): void {
    this.draw();
  }

  private remember(): void {
    this.history.push([...this.marks]);
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
  }

  private changed(): void {
    writeStored(SAVE_KEY, this.marks);
    this.draw();
    this.hooks.onChange();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  private get size() {
    const r = this.canvas.getBoundingClientRect();
    return { w: r.width, h: r.height, min: Math.min(r.width, r.height) };
  }

  private toFraction(e: PointerEvent): Point {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }

  private down = (e: PointerEvent): void => {
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.toFraction(e);
    const o = this.options;
    switch (this.tool) {
      case 'rake':
        this.current = [p];
        return;
      case 'erase':
        this.erasing = true;
        this.erased = false;
        this.remember();
        this.eraseAt(p);
        return;
      case 'stone':
        this.place({
          kind: 'stone',
          x: p.x,
          y: p.y,
          r: stoneRadius(o.stoneSize, Math.random()),
          tilt: Math.random() * Math.PI,
          color: o.stoneColor,
          flat: o.stoneShape === 'flat',
        });
        return;
      case 'ripple':
        this.place({ kind: 'ripple', x: p.x, y: p.y, r: 0.035, rings: 5 });
        return;
      case 'moss':
        this.place({
          kind: 'moss',
          x: p.x,
          y: p.y,
          r: 0.045 + Math.random() * 0.02,
          seed: Math.floor(Math.random() * 1e6),
        });
        return;
      case 'lantern':
        this.place({ kind: 'lantern', x: p.x, y: p.y, s: 0.12 });
        return;
    }
  };

  private place(mark: Mark): void {
    this.remember();
    this.marks.push(mark);
    this.changed();
    this.hooks.onStone();
  }

  /** Remove every mark near the point; a rake line goes if any part of it is touched. */
  private eraseAt(p: Point): void {
    const { w, h, min } = this.size;
    const reach = ERASE_RADIUS * min;
    const near = (x: number, y: number) => Math.hypot((x - p.x) * w, (y - p.y) * h) < reach;
    const kept = this.marks.filter((m) =>
      m.kind === 'rake' ? !m.points.some((q) => near(q.x, q.y)) : !near(m.x, m.y),
    );
    if (kept.length === this.marks.length) return;
    this.marks = kept;
    this.erased = true;
    this.draw();
  }

  private move = (e: PointerEvent): void => {
    if (this.erasing) {
      this.eraseAt(this.toFraction(e));
      return;
    }
    if (!this.current) return;
    const { w, h } = this.size;
    const p = this.toFraction(e);
    const last = this.current[this.current.length - 1];
    if (Math.hypot((p.x - last.x) * w, (p.y - last.y) * h) < 6) return;
    this.current.push(p);
    this.draw();
    const now = performance.now();
    if (now - this.lastRakeSound > 700) {
      this.lastRakeSound = now;
      this.hooks.onRake();
    }
  };

  private up = (): void => {
    if (this.erasing) {
      this.erasing = false;
      if (this.erased) this.changed();
      else this.history.pop(); // nothing was touched, so nothing to undo
      return;
    }
    const stroke = this.current;
    this.current = null;
    if (stroke && stroke.length > 1) {
      this.remember();
      this.marks.push(this.rakeMark(stroke));
      this.changed();
    } else {
      this.draw();
    }
  };

  private rakeMark(points: Point[]): Stroke {
    const o = this.options;
    return {
      kind: 'rake',
      points,
      teeth: o.rakeTeeth,
      spacing: SPACING_FRACTION[o.rakeSpacing],
      wavy: o.rakeStyle === 'wavy',
    };
  }

  private palette(): Palette {
    const theme = document.documentElement.dataset.theme as keyof typeof COLORS | undefined;
    return COLORS[theme ?? 'day'] ?? COLORS.day;
  }

  private draw(): void {
    const { w, h, min } = this.size;
    const c = this.ctx;
    const pal = this.palette();
    c.fillStyle = pal.sand;
    c.fillRect(0, 0, w, h);
    c.lineCap = 'round';
    c.lineJoin = 'round';

    const all: Mark[] = this.current ? [...this.marks, this.rakeMark(this.current)] : this.marks;
    for (const m of all) if (m.kind === 'rake') this.drawRake(m, w, h, min, pal);
    for (const m of all) if (m.kind === 'ripple') this.drawRipple(m, w, h, min, pal);
    // Objects are drawn back to front so nearer ones overlap the ones behind.
    const objects = all.filter(
      (m): m is Stone | Moss | Lantern =>
        m.kind === 'stone' || m.kind === 'moss' || m.kind === 'lantern',
    );
    for (const m of objects.sort((a, b) => a.y - b.y)) {
      if (m.kind === 'stone') this.drawStone(m, w, h, min, pal);
      else if (m.kind === 'moss') this.drawMoss(m, w, h, min, pal);
      else this.drawLantern(m, w, h, min, pal);
    }
  }

  private drawRake(m: Stroke, w: number, h: number, min: number, pal: Palette) {
    const c = this.ctx;
    let px = thin(
      m.points.map((p) => ({ x: p.x * w, y: p.y * h })),
      8,
    );
    const spacing = min * (m.spacing ?? DEFAULT_SPACING);
    if (m.wavy) px = wavy(px, spacing * 1.2, min * 0.14);
    const lines = rakeLines(px, m.teeth ?? DEFAULT_OPTIONS.rakeTeeth, spacing);
    const stroke = (color: string, width: number, shift: number) => {
      c.strokeStyle = color;
      c.lineWidth = width;
      for (const line of lines) {
        c.beginPath();
        line.forEach((p, i) =>
          i ? c.lineTo(p.x + shift, p.y + shift) : c.moveTo(p.x + shift, p.y + shift),
        );
        c.stroke();
      }
    };
    stroke(pal.ridge, 2, 1.5);
    stroke(pal.groove, 2.5, 0);
  }

  private drawStone(m: Stone, w: number, h: number, min: number, pal: Palette) {
    const c = this.ctx;
    const x = m.x * w;
    const y = m.y * h;
    const r = m.r * min;
    const squash = m.flat ? 0.55 : 0.8;
    const tone = STONE_COLORS[m.color ?? 'grey'];
    // Ripples in the sand around the stone.
    c.strokeStyle = pal.groove;
    c.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      c.globalAlpha = 0.7 / i;
      c.beginPath();
      c.ellipse(x, y, r * (1 + i * 0.45), r * squash * (1 + i * 0.45), m.tilt, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    // Soft shadow, then the stone.
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.beginPath();
    c.ellipse(x + r * 0.15, y + r * 0.25, r * 1.05, r * squash, m.tilt, 0, Math.PI * 2);
    c.fill();
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, tone.light);
    g.addColorStop(1, tone.dark);
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x, y, r, r * squash, m.tilt, 0, Math.PI * 2);
    c.fill();
  }

  private drawRipple(m: Ripple, w: number, h: number, min: number, pal: Palette) {
    const c = this.ctx;
    const x = m.x * w;
    const y = m.y * h;
    c.lineWidth = 2.5;
    for (let i = 1; i <= m.rings; i++) {
      const r = m.r * min * i * 0.9;
      c.strokeStyle = pal.ridge;
      c.beginPath();
      c.arc(x + 1.5, y + 1.5, r, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = pal.groove;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.stroke();
    }
  }

  /** A patch of soft green mounds; the seed keeps it looking the same on every redraw. */
  private drawMoss(m: Moss, w: number, h: number, min: number, pal: Palette) {
    const c = this.ctx;
    const x = m.x * w;
    const y = m.y * h;
    const r = m.r * min;
    let seed = m.seed;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.beginPath();
    c.ellipse(x, y + r * 0.35, r * 1.2, r * 0.6, 0, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 16; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * r;
      const br = r * (0.3 + rand() * 0.3);
      c.fillStyle = pal.moss[Math.floor(rand() * pal.moss.length)];
      c.beginPath();
      c.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, br, br * 0.75, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  /** A small stone lantern with a softly lit window. */
  private drawLantern(m: Lantern, w: number, h: number, min: number, pal: Palette) {
    const c = this.ctx;
    const x = m.x * w;
    const y = m.y * h;
    const u = (m.s * min) / 10; // ten units tall
    const tone = STONE_COLORS.grey;
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.beginPath();
    c.ellipse(x + u, y + u * 0.2, u * 3.2, u * 0.9, 0, 0, Math.PI * 2);
    c.fill();
    const block = (top: number, bw: number, bh: number, color: string) => {
      c.fillStyle = color;
      c.beginPath();
      c.roundRect(x - (bw * u) / 2, y - top * u - bh * u, bw * u, bh * u, u * 0.25);
      c.fill();
    };
    block(0, 4, 1, tone.dark); // base
    block(1, 1.4, 3, tone.light); // post
    block(4, 3.6, 0.8, tone.dark); // plinth
    block(4.8, 3, 2.4, tone.light); // lamp housing
    c.fillStyle = pal.lamp; // the lit window
    c.beginPath();
    c.roundRect(x - u * 0.9, y - u * 6.8, u * 1.8, u * 1.5, u * 0.2);
    c.fill();
    c.fillStyle = tone.dark; // roof
    c.beginPath();
    c.moveTo(x - u * 2.5, y - u * 7.2);
    c.lineTo(x + u * 2.5, y - u * 7.2);
    c.lineTo(x + u * 0.5, y - u * 9);
    c.lineTo(x - u * 0.5, y - u * 9);
    c.closePath();
    c.fill();
    c.fillStyle = tone.light; // finial
    c.beginPath();
    c.arc(x, y - u * 9.3, u * 0.5, 0, Math.PI * 2);
    c.fill();
  }
}
