export interface Point {
  x: number;
  y: number;
}

/** Drop points closer than `minDist` to the previous kept point. */
export function thin(points: Point[], minDist: number): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= minDist) out.push(p);
  }
  return out;
}

/**
 * Parallel lines a rake with `teeth` prongs leaves behind a stroke: each tooth
 * follows the path, offset sideways by `spacing`, centred on the stroke.
 */
export function rakeLines(points: Point[], teeth: number, spacing: number): Point[][] {
  if (points.length < 2) return [];
  const normals = points.map((_, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  });
  const lines: Point[][] = [];
  for (let t = 0; t < teeth; t++) {
    const offset = (t - (teeth - 1) / 2) * spacing;
    lines.push(
      points.map((p, i) => ({ x: p.x + normals[i].x * offset, y: p.y + normals[i].y * offset })),
    );
  }
  return lines;
}
