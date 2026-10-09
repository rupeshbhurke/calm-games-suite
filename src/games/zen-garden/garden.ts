import { readStored, writeStored } from '../../core/storage';
import { rakeLines, thin, type Point } from './rake';

/** Coordinates are stored as fractions of the canvas so a resize keeps the garden intact. */
interface Stroke {
  kind: 'rake';
  points: Point[];
}
interface Stone {
  kind: 'stone';
  x: number;
  y: number;
  /** Radius as a fraction of the shorter canvas side. */
  r: number;
  tilt: number;
}
type Mark = Stroke | Stone;

export type Tool = 'rake' | 'stone';

export interface GardenHooks {
  onStone(): void;
  onRake(): void;
  onChange(): void;
}

const SAVE_KEY = 'calm.garden';
const TEETH = 5;

const COLORS = {
  day: { sand: '#e6d5b8', groove: '#c9b794', ridge: '#f3e8d2' },
  dusk: { sand: '#b9a98c', groove: '#9a8b70', ridge: '#cdbea1' },
  night: { sand: '#7d7563', groove: '#655e4f', ridge: '#948b77' },
};
type Palette = (typeof COLORS)['day'];

export class Garden {
  private marks: Mark[] = [];
  private current: Point[] | null = null;
  private ctx: CanvasRenderingContext2D;
  private lastRakeSound = 0;
  tool: Tool = 'rake';

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
    return this.marks.length > 0;
  }

  /** Remove the latest mark. Unlimited, no penalty. */
  undo(): void {
    this.marks.pop();
    this.changed();
  }

  /** Smooth the whole garden back to plain sand. */
  smooth(): void {
    this.marks = [];
    this.changed();
  }

  redraw(): void {
    this.draw();
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
    if (this.tool === 'stone') {
      this.marks.push({
        kind: 'stone',
        x: p.x,
        y: p.y,
        r: 0.035 + Math.random() * 0.03,
        tilt: Math.random() * Math.PI,
      });
      this.changed();
      this.hooks.onStone();
    } else {
      this.current = [p];
    }
  };

  private move = (e: PointerEvent): void => {
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
    const stroke = this.current;
    this.current = null;
    if (stroke && stroke.length > 1) {
      this.marks.push({ kind: 'rake', points: stroke });
      this.changed();
    } else {
      this.draw();
    }
  };

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

    const all: Mark[] = this.current
      ? [...this.marks, { kind: 'rake', points: this.current }]
      : this.marks;
    for (const m of all) if (m.kind === 'rake') this.drawRake(m, w, h, min, pal);
    for (const m of all) if (m.kind === 'stone') this.drawStone(m, w, h, min, pal);
  }

  private drawRake(m: Stroke, w: number, h: number, min: number, pal: Palette) {
    const c = this.ctx;
    const px = thin(
      m.points.map((p) => ({ x: p.x * w, y: p.y * h })),
      8,
    );
    const lines = rakeLines(px, TEETH, min * 0.012);
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
    // Ripples in the sand around the stone.
    c.strokeStyle = pal.groove;
    c.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      c.globalAlpha = 0.7 / i;
      c.beginPath();
      c.ellipse(x, y, r * (1 + i * 0.45), r * 0.8 * (1 + i * 0.45), m.tilt, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    // Soft shadow, then the stone.
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.beginPath();
    c.ellipse(x + r * 0.15, y + r * 0.25, r * 1.05, r * 0.8, m.tilt, 0, Math.PI * 2);
    c.fill();
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#a9b0ad');
    g.addColorStop(1, '#5f6a68');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x, y, r, r * 0.8, m.tilt, 0, Math.PI * 2);
    c.fill();
  }
}
