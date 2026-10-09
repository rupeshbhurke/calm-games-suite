import { prefersReducedMotion } from '../core/motion';
import type { Settings } from '../core/storage';
import { el, openSheet } from './dom';

export interface SettingsContext {
  settings: Settings;
  update(patch: Partial<Settings>): void;
  version: string;
  /** Present only when the browser offers an install prompt. */
  install?: () => void;
}

const WHATS_NEW = 'Zen Garden home: rake the sand, place stones, breathe. Works offline.';

function slider(label: string, value: number, onInput: (v: number) => void): HTMLElement {
  const input = el('input', {
    type: 'range',
    min: '0',
    max: '1',
    step: '0.05',
    value: String(value),
    'aria-label': label,
  });
  input.addEventListener('input', () => onInput(Number(input.value)));
  return el('label', { class: 'field' }, [el('span', { text: label }), input]);
}

function toggle(label: string, checked: boolean, onChange: (v: boolean) => void): HTMLElement {
  const input = el('input', { type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { class: 'field toggle' }, [input, el('span', { text: label })]);
}

export function openSettings(ctx: SettingsContext): void {
  const s = ctx.settings;

  const theme = el('select', { 'aria-label': 'Theme' }, [
    el('option', { value: 'auto', text: 'Automatic (Night after 7 pm)' }),
    el('option', { value: 'day', text: 'Day' }),
    el('option', { value: 'dusk', text: 'Dusk' }),
    el('option', { value: 'night', text: 'Night' }),
  ]);
  theme.value = s.theme;
  theme.addEventListener('change', () => ctx.update({ theme: theme.value as Settings['theme'] }));

  const close = el('button', { class: 'primary', type: 'button', text: 'Done' });
  const body: Node[] = [
    el('label', { class: 'field' }, [el('span', { text: 'Theme' }), theme]),
    toggle('Mute all sound', s.muted, (muted) => ctx.update({ muted })),
    slider('Music', s.music, (music) => ctx.update({ music })),
    slider('Nature sounds', s.nature, (nature) => ctx.update({ nature })),
    slider('Effects', s.effects, (effects) => ctx.update({ effects })),
    toggle('Reduce motion', prefersReducedMotion(s.reduceMotion), (reduceMotion) =>
      ctx.update({ reduceMotion }),
    ),
    toggle('Left-handed layout', s.leftHanded, (leftHanded) => ctx.update({ leftHanded })),
  ];
  if (ctx.install) {
    const install = el('button', { class: 'quiet', type: 'button', text: 'Install app' });
    install.addEventListener('click', () => ctx.install?.());
    body.push(install);
  }
  body.push(
    el('p', { class: 'hint', text: `Version ${ctx.version}. What's new: ${WHATS_NEW}` }),
    el('div', { class: 'row end' }, [close]),
  );
  const dialog = openSheet('Settings', body);
  close.addEventListener('click', () => dialog.close());
}
