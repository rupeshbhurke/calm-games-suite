import { breathPhase } from '../core/breath';
import { el, openSheet } from './dom';

/** Guided breathing, about 6 breaths a minute. Close button or Escape to leave. */
export function openBreathingGuide(): void {
  const label = el('p', { class: 'breath-label', 'aria-live': 'polite' });
  const close = el('button', { class: 'primary', type: 'button', text: 'Close' });
  const start = performance.now();
  const tick = () => {
    label.textContent = breathPhase((performance.now() - start) / 1000);
  };
  tick();
  const timer = window.setInterval(tick, 250);
  const dialog = openSheet(
    'Breathe',
    [
      el('div', { class: 'breath', 'aria-hidden': 'true' }),
      label,
      el('div', { class: 'row end' }, [close]),
    ],
    () => window.clearInterval(timer),
  );
  close.addEventListener('click', () => dialog.close());
}
