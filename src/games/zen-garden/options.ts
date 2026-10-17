/** How the player has set up the rake and stones. Saved on this device. */
export const RAKE_TEETH = [3, 5, 7, 9] as const;
export const RAKE_SPACINGS = ['fine', 'medium', 'wide'] as const;
export const RAKE_STYLES = ['straight', 'wavy'] as const;
export const STONE_SIZES = ['small', 'medium', 'large', 'mixed'] as const;
export const STONE_SHAPES = ['round', 'flat'] as const;

export const STONE_COLORS = {
  grey: { name: 'Grey', light: '#a9b0ad', dark: '#5f6a68' },
  slate: { name: 'Slate', light: '#8795a3', dark: '#3f4d5c' },
  warm: { name: 'Warm', light: '#c9b49a', dark: '#85705a' },
  moss: { name: 'Mossy', light: '#9db39a', dark: '#566b57' },
  white: { name: 'Pale', light: '#f1eee6', dark: '#b9b5aa' },
} as const;
export type StoneColor = keyof typeof STONE_COLORS;

export interface GardenOptions {
  rakeTeeth: (typeof RAKE_TEETH)[number];
  rakeSpacing: (typeof RAKE_SPACINGS)[number];
  rakeStyle: (typeof RAKE_STYLES)[number];
  stoneSize: (typeof STONE_SIZES)[number];
  stoneColor: StoneColor;
  stoneShape: (typeof STONE_SHAPES)[number];
}

export const DEFAULT_OPTIONS: GardenOptions = {
  rakeTeeth: 5,
  rakeSpacing: 'medium',
  rakeStyle: 'straight',
  stoneSize: 'mixed',
  stoneColor: 'grey',
  stoneShape: 'round',
};

/** Gap between rake teeth as a fraction of the shorter canvas side. */
export const SPACING_FRACTION: Record<GardenOptions['rakeSpacing'], number> = {
  fine: 0.009,
  medium: 0.012,
  wide: 0.018,
};

const pick = <T extends string | number>(list: readonly T[], v: unknown, fallback: T): T =>
  list.includes(v as T) ? (v as T) : fallback;

/** Merge untrusted stored data over the defaults, dropping anything invalid. */
export function sanitizeOptions(raw: Partial<GardenOptions> | null | undefined): GardenOptions {
  const o = raw ?? {};
  const d = DEFAULT_OPTIONS;
  return {
    rakeTeeth: pick(RAKE_TEETH, o.rakeTeeth, d.rakeTeeth),
    rakeSpacing: pick(RAKE_SPACINGS, o.rakeSpacing, d.rakeSpacing),
    rakeStyle: pick(RAKE_STYLES, o.rakeStyle, d.rakeStyle),
    stoneSize: pick(STONE_SIZES, o.stoneSize, d.stoneSize),
    stoneColor: pick(Object.keys(STONE_COLORS) as StoneColor[], o.stoneColor, d.stoneColor),
    stoneShape: pick(STONE_SHAPES, o.stoneShape, d.stoneShape),
  };
}

/** Stone radius as a fraction of the shorter canvas side; `rand` is 0-1 and only used for mixed. */
export function stoneRadius(size: GardenOptions['stoneSize'], rand: number): number {
  switch (size) {
    case 'small':
      return 0.03;
    case 'medium':
      return 0.045;
    case 'large':
      return 0.065;
    default:
      return 0.035 + rand * 0.03;
  }
}
