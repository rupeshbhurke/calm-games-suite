import { seededRandom } from './puzzle';

/** Pictures are drawn in code, so there are no image files to license or download. */
export const SCENE_W = 800;
export const SCENE_H = 600;

export interface Scene {
  id: string;
  title: string;
  paint(c: CanvasRenderingContext2D): void;
}

function sky(c: CanvasRenderingContext2D, stops: [number, string][], height: number) {
  const g = c.createLinearGradient(0, 0, 0, height);
  for (const [at, color] of stops) g.addColorStop(at, color);
  c.fillStyle = g;
  c.fillRect(0, 0, SCENE_W, SCENE_H);
}

/** A ridge made of two sine waves, filled down to the bottom edge. */
function ridge(
  c: CanvasRenderingContext2D,
  base: number,
  amp: number,
  freq: number,
  phase: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, SCENE_H);
  for (let x = 0; x <= SCENE_W; x += 8) {
    const y =
      base + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.35;
    c.lineTo(x, y);
  }
  c.lineTo(SCENE_W, SCENE_H);
  c.closePath();
  c.fill();
}

function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function tree(c: CanvasRenderingContext2D, x: number, y: number, s: number, leaf: string) {
  c.fillStyle = '#6b5a47';
  c.fillRect(x - s * 0.06, y - s * 0.5, s * 0.12, s * 0.5);
  c.fillStyle = leaf;
  c.beginPath();
  c.arc(x, y - s * 0.75, s * 0.4, 0, Math.PI * 2);
  c.arc(x - s * 0.22, y - s * 0.55, s * 0.28, 0, Math.PI * 2);
  c.arc(x + s * 0.22, y - s * 0.55, s * 0.28, 0, Math.PI * 2);
  c.fill();
}

export const SCENES: Scene[] = [
  {
    id: 'misty-lake',
    title: 'Misty lake',
    paint(c) {
      sky(
        c,
        [
          [0, '#f4e3cf'],
          [0.45, '#dfe9e6'],
          [1, '#bcd3d6'],
        ],
        330,
      );
      glow(c, 560, 150, 130, 'rgba(255,240,205,0.95)');
      ridge(c, 250, 28, 0.006, 0.5, '#b7c6cb');
      ridge(c, 290, 34, 0.008, 2.1, '#92a9ae');
      ridge(c, 330, 22, 0.011, 4, '#6f8b8d');
      // Still water with the mountains and sun softly reflected.
      const water = c.createLinearGradient(0, 340, 0, SCENE_H);
      water.addColorStop(0, '#a8c3c7');
      water.addColorStop(1, '#7ea1ae');
      c.fillStyle = water;
      c.fillRect(0, 340, SCENE_W, SCENE_H - 340);
      c.globalAlpha = 0.35;
      glow(c, 560, 420, 110, 'rgba(255,245,215,1)');
      c.globalAlpha = 1;
      const rand = seededRandom(11);
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      c.lineWidth = 2;
      for (let i = 0; i < 26; i++) {
        const x = rand() * SCENE_W;
        const y = 360 + rand() * 220;
        const w = 30 + rand() * 90;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + w, y);
        c.stroke();
      }
      // A little boat.
      c.fillStyle = '#5a4a3d';
      c.beginPath();
      c.moveTo(250, 430);
      c.lineTo(320, 430);
      c.lineTo(305, 450);
      c.lineTo(265, 450);
      c.closePath();
      c.fill();
      c.fillStyle = '#f5ecdd';
      c.beginPath();
      c.moveTo(285, 425);
      c.lineTo(285, 385);
      c.lineTo(315, 425);
      c.closePath();
      c.fill();
    },
  },
  {
    id: 'sunset-hills',
    title: 'Sunset hills',
    paint(c) {
      sky(
        c,
        [
          [0, '#8e84b3'],
          [0.4, '#e3a9a0'],
          [0.75, '#f3d3a0'],
          [1, '#f6e4bb'],
        ],
        420,
      );
      glow(c, 400, 330, 230, 'rgba(255,236,190,0.85)');
      c.fillStyle = '#fbe9bb';
      c.beginPath();
      c.arc(400, 330, 62, 0, Math.PI * 2);
      c.fill();
      ridge(c, 360, 20, 0.007, 1, '#b99aa6');
      ridge(c, 410, 30, 0.006, 3, '#8d7d98');
      ridge(c, 470, 34, 0.005, 0.2, '#68768a');
      ridge(c, 540, 26, 0.008, 2.4, '#44566a');
      // Birds.
      c.strokeStyle = '#4f4560';
      c.lineWidth = 2.5;
      for (const [x, y, s] of [
        [160, 150, 1],
        [215, 185, 0.8],
        [600, 120, 1.1],
        [660, 160, 0.7],
      ]) {
        c.beginPath();
        c.moveTo(x - 12 * s, y);
        c.quadraticCurveTo(x - 5 * s, y - 9 * s, x, y);
        c.quadraticCurveTo(x + 5 * s, y - 9 * s, x + 12 * s, y);
        c.stroke();
      }
    },
  },
  {
    id: 'meadow-stream',
    title: 'Meadow stream',
    paint(c) {
      sky(
        c,
        [
          [0, '#a9cde0'],
          [1, '#e8f1ea'],
        ],
        300,
      );
      c.fillStyle = 'rgba(255,255,255,0.9)';
      for (const [x, y, s] of [
        [180, 90, 1],
        [520, 60, 1.3],
        [660, 140, 0.8],
      ]) {
        c.beginPath();
        c.ellipse(x, y, 60 * s, 18 * s, 0, 0, Math.PI * 2);
        c.ellipse(x + 35 * s, y - 10 * s, 40 * s, 18 * s, 0, 0, Math.PI * 2);
        c.ellipse(x - 35 * s, y - 6 * s, 36 * s, 14 * s, 0, 0, Math.PI * 2);
        c.fill();
      }
      ridge(c, 280, 24, 0.006, 0.8, '#a9c6a0');
      ridge(c, 330, 20, 0.009, 2.8, '#8db98a');
      tree(c, 130, 340, 90, '#5f8d68');
      tree(c, 640, 330, 110, '#6a9a6c');
      tree(c, 700, 345, 70, '#7aa77a');
      const grass = c.createLinearGradient(0, 330, 0, SCENE_H);
      grass.addColorStop(0, '#8fbf86');
      grass.addColorStop(1, '#5f9a67');
      c.fillStyle = grass;
      c.fillRect(0, 360, SCENE_W, SCENE_H - 360);
      // A winding stream.
      c.fillStyle = '#9cc7d6';
      c.beginPath();
      c.moveTo(330, 360);
      c.bezierCurveTo(330, 430, 520, 450, 470, 520);
      c.bezierCurveTo(440, 560, 400, 580, 380, SCENE_H);
      c.lineTo(540, SCENE_H);
      c.bezierCurveTo(560, 560, 600, 520, 590, 490);
      c.bezierCurveTo(580, 440, 400, 420, 370, 360);
      c.closePath();
      c.fill();
      // Wildflowers.
      const rand = seededRandom(5);
      const colors = ['#f3e2a5', '#e9b9b0', '#f6f0e6', '#c8b9e0'];
      for (let i = 0; i < 90; i++) {
        const x = rand() * SCENE_W;
        const y = 380 + rand() * 210;
        if (x > 340 && x < 590) continue;
        c.fillStyle = colors[Math.floor(rand() * colors.length)];
        c.beginPath();
        c.arc(x, y, 3 + rand() * 3, 0, Math.PI * 2);
        c.fill();
      }
    },
  },
];

/** Paint a scene onto a fresh canvas the size of the puzzle picture. */
export function renderScene(scene: Scene): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SCENE_W;
  canvas.height = SCENE_H;
  scene.paint(canvas.getContext('2d')!);
  return canvas;
}
