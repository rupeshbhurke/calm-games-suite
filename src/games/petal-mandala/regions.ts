export interface Region {
  id: number;
  ring: number;
  /** SVG path in a 200 x 200 box centred on 0,0. */
  d: string;
}

interface RingSpec {
  kind: 'petal' | 'sector';
  count: number;
  inner: number;
  outer: number;
  /** Rotate by this fraction of one step so rings interlock. */
  offset: number;
}

const RADIUS = 100;

export const RINGS: RingSpec[] = [
  { kind: 'petal', count: 8, inner: 0.1, outer: 0.42, offset: 0 },
  { kind: 'sector', count: 16, inner: 0.42, outer: 0.58, offset: 0.5 },
  { kind: 'petal', count: 16, inner: 0.58, outer: 0.88, offset: 0 },
  { kind: 'sector', count: 16, inner: 0.88, outer: 0.99, offset: 0.5 },
];

const f = (n: number) => n.toFixed(2);
const pt = (r: number, a: number) =>
  `${f(Math.cos(a) * r * RADIUS)} ${f(Math.sin(a) * r * RADIUS)}`;

function petal(spec: RingSpec, mid: number, step: number): string {
  const ctl = (spec.inner + spec.outer) / 2;
  const half = step * 0.62;
  return `M ${pt(spec.inner, mid)} Q ${pt(ctl * 1.08, mid - half)} ${pt(spec.outer, mid)} Q ${pt(ctl * 1.08, mid + half)} ${pt(spec.inner, mid)} Z`;
}

function sector(spec: RingSpec, a0: number, a1: number): string {
  return `M ${pt(spec.inner, a0)} L ${pt(spec.outer, a0)} A ${f(spec.outer * RADIUS)} ${f(spec.outer * RADIUS)} 0 0 1 ${pt(spec.outer, a1)} L ${pt(spec.inner, a1)} A ${f(spec.inner * RADIUS)} ${f(spec.inner * RADIUS)} 0 0 0 ${pt(spec.inner, a0)} Z`;
}

/** Every colourable region of the mandala: a centre disc plus the rings. */
export function buildRegions(): Region[] {
  const regions: Region[] = [
    {
      id: 0,
      ring: -1,
      d: `M ${f(0.1 * RADIUS)} 0 A ${f(0.1 * RADIUS)} ${f(0.1 * RADIUS)} 0 1 1 ${f(-0.1 * RADIUS)} 0 A ${f(0.1 * RADIUS)} ${f(0.1 * RADIUS)} 0 1 1 ${f(0.1 * RADIUS)} 0 Z`,
    },
  ];
  RINGS.forEach((spec, ring) => {
    const step = (Math.PI * 2) / spec.count;
    for (let i = 0; i < spec.count; i++) {
      const a0 = (i + spec.offset) * step - Math.PI / 2;
      const d =
        spec.kind === 'petal' ? petal(spec, a0 + step / 2, step) : sector(spec, a0, a0 + step);
      regions.push({ id: regions.length, ring, d });
    }
  });
  return regions;
}

export const PALETTE = [
  { name: 'Sage', color: '#9db8a8' },
  { name: 'Still water', color: '#8fb3c4' },
  { name: 'Sand', color: '#e6d5b8' },
  { name: 'Lavender haze', color: '#b8b0cf' },
  { name: 'Soft gold', color: '#e8c98a' },
  { name: 'Blush', color: '#e2b3a9' },
  { name: 'Mint', color: '#b9dcc9' },
  { name: 'Dusk blue', color: '#7f93b5' },
];

/** A fill is a palette index, or -1 for blank. */
export const BLANK = -1;
