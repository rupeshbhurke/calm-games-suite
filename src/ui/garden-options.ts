import {
  RAKE_SPACINGS,
  RAKE_STYLES,
  RAKE_TEETH,
  STONE_COLORS,
  STONE_SHAPES,
  STONE_SIZES,
  type GardenOptions,
  type StoneColor,
} from '../games/zen-garden/options';
import { el, openSheet } from './dom';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** A row of mutually exclusive buttons. */
function choice<T extends string | number>(
  label: string,
  values: readonly T[],
  current: T,
  text: (v: T) => string,
  onPick: (v: T) => void,
): HTMLElement {
  const group = el('div', { class: 'row choice', role: 'group', 'aria-label': label });
  const buttons = values.map((v) => {
    const b = el('button', {
      type: 'button',
      text: text(v),
      'aria-pressed': String(v === current),
    });
    b.addEventListener('click', () => {
      onPick(v);
      values.forEach((other, i) => buttons[i].setAttribute('aria-pressed', String(other === v)));
    });
    return b;
  });
  group.append(...buttons);
  return el('div', { class: 'option' }, [
    el('span', { class: 'option-label', text: label }),
    group,
  ]);
}

/** Sheet for tuning the rake and stones. Changes apply straight away and are saved by the caller. */
export function openGardenOptions(
  current: GardenOptions,
  onChange: (next: GardenOptions) => void,
): void {
  let o = { ...current };
  const set = <K extends keyof GardenOptions>(key: K, value: GardenOptions[K]) => {
    o = { ...o, [key]: value };
    onChange(o);
  };

  const colors = el('div', { class: 'row choice', role: 'group', 'aria-label': 'Stone colour' });
  const swatches = (Object.keys(STONE_COLORS) as StoneColor[]).map((id) => {
    const t = STONE_COLORS[id];
    const b = el('button', {
      type: 'button',
      class: 'swatch',
      title: t.name,
      'aria-label': t.name,
      'aria-pressed': String(id === o.stoneColor),
    });
    b.style.background = `radial-gradient(circle at 35% 35%, ${t.light}, ${t.dark})`;
    b.addEventListener('click', () => {
      set('stoneColor', id);
      (Object.keys(STONE_COLORS) as StoneColor[]).forEach((other, i) =>
        swatches[i].setAttribute('aria-pressed', String(other === id)),
      );
    });
    return b;
  });
  colors.append(...swatches);

  const done = el('button', { class: 'primary', type: 'button', text: 'Done' });
  const dialog = openSheet('Customise the garden', [
    el('h3', { text: 'Rake' }),
    choice('Teeth', RAKE_TEETH, o.rakeTeeth, String, (v) => set('rakeTeeth', v)),
    choice('Spacing', RAKE_SPACINGS, o.rakeSpacing, cap, (v) => set('rakeSpacing', v)),
    choice('Pattern', RAKE_STYLES, o.rakeStyle, cap, (v) => set('rakeStyle', v)),
    el('h3', { text: 'Stones' }),
    choice('Size', STONE_SIZES, o.stoneSize, cap, (v) => set('stoneSize', v)),
    choice('Shape', STONE_SHAPES, o.stoneShape, cap, (v) => set('stoneShape', v)),
    el('div', { class: 'option' }, [el('span', { class: 'option-label', text: 'Colour' }), colors]),
    el('p', {
      class: 'hint',
      text: 'Applies to new strokes and stones. What you have already made stays as it is.',
    }),
    el('div', { class: 'row end' }, [done]),
  ]);
  done.addEventListener('click', () => dialog.close());
}
