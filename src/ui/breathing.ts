import type { Mixer } from '../core/audio';
import {
  circleScale,
  MAX_PACE_S,
  MIN_PACE_S,
  PATTERNS,
  phaseAt,
  scalePattern,
  type PatternId,
} from '../core/breath';
import { BREATH_MINUTES, type Settings } from '../core/storage';
import { el, openSheet } from './dom';

export interface BreathingContext {
  settings: () => Settings;
  update(patch: Partial<Settings>): void;
  mixer: Mixer;
}

const RING_R = 90;
const RING_C = 2 * Math.PI * RING_R;
const SVG = 'http://www.w3.org/2000/svg';

function svgCircle(attrs: Record<string, string>): SVGCircleElement {
  const c = document.createElementNS(SVG, 'circle');
  for (const [k, v] of Object.entries(attrs)) c.setAttribute(k, v);
  return c;
}

function select(
  label: string,
  options: [string, string][],
  value: string,
  on: (v: string) => void,
) {
  const sel = el(
    'select',
    { 'aria-label': label },
    options.map(([v, text]) => el('option', { value: v, text })),
  );
  sel.value = value;
  sel.addEventListener('change', () => on(sel.value));
  return el('label', { class: 'field' }, [el('span', { text: label }), sel]);
}

/**
 * Guided breathing. A ring fills over each phase so the next switch is always
 * in sight; a soft gong marks each in and out. Close or press Escape to leave.
 */
export function openBreathingGuide(ctx: BreathingContext): void {
  ctx.mixer.unlock();
  const s = () => ctx.settings();

  const ringProgress = svgCircle({
    class: 'ring-progress',
    cx: '100',
    cy: '100',
    r: String(RING_R),
    'stroke-dasharray': String(RING_C),
  });
  const ring = document.createElementNS(SVG, 'svg');
  ring.setAttribute('viewBox', '0 0 200 200');
  ring.setAttribute('class', 'ring');
  ring.setAttribute('aria-hidden', 'true');
  ring.append(
    svgCircle({ class: 'ring-track', cx: '100', cy: '100', r: String(RING_R) }),
    ringProgress,
  );

  const circle = el('div', { class: 'breath', 'aria-hidden': 'true' });
  const count = el('span', { class: 'breath-count', 'aria-hidden': 'true' });
  const label = el('p', { class: 'breath-label', 'aria-live': 'polite' });
  const next = el('p', { class: 'breath-next hint' });
  const stage = el('div', { class: 'breath-stage' }, [ring, circle, count]);

  let start = performance.now();
  let lastStep = -1;
  let frame = 0;

  const restart = () => {
    start = performance.now();
    lastStep = -1;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  };

  const sound = (kind: string, seconds: number) => {
    if (kind !== 'in' && kind !== 'out') return; // holds stay silent
    const mode = s().breathSound;
    if (mode === 'gong') ctx.mixer.gong(kind === 'in' ? 196 : 147, Math.min(4, seconds));
    else if (mode === 'chime') ctx.mixer.chime(kind === 'in' ? 5 : 2);
  };

  function tick() {
    const cfg = s();
    const phases = scalePattern(cfg.breathPattern, cfg.breathPace);
    const elapsed = (performance.now() - start) / 1000;
    const st = phaseAt(elapsed, phases);

    // A timed session ends at the next breath change after its length.
    if (cfg.breathMinutes > 0 && elapsed >= cfg.breathMinutes * 60 && st.step !== lastStep) {
      label.textContent = 'Well done';
      next.textContent = 'Take a moment before you go on.';
      count.textContent = '';
      ringProgress.style.strokeDashoffset = '0';
      circle.style.transform = 'scale(0.8)';
      if (cfg.breathSound !== 'off') ctx.mixer.gong(196, 6);
      return;
    }

    if (st.step !== lastStep) {
      lastStep = st.step;
      label.textContent = st.label;
      next.textContent = `${st.nextLabel} next`;
      sound(st.kind, st.seconds);
    }
    count.textContent = cfg.breathCount ? String(Math.ceil(st.remaining - 1e-6)) : '';
    ringProgress.style.strokeDashoffset = String(RING_C * (1 - st.progress));
    const reduced = document.documentElement.dataset.motion === 'reduced';
    circle.style.transform = `scale(${reduced ? 0.8 : circleScale(st.kind, st.progress)})`;
    frame = requestAnimationFrame(tick);
  }

  const patternNote = el('p', { class: 'hint', text: PATTERNS[s().breathPattern].description });
  const pattern = select(
    'Pattern',
    (Object.keys(PATTERNS) as PatternId[]).map((id) => [id, PATTERNS[id].name]),
    s().breathPattern,
    (v) => {
      ctx.update({ breathPattern: v as PatternId });
      patternNote.textContent = PATTERNS[v as PatternId].description;
      restart();
    },
  );

  const pace = el('input', {
    type: 'range',
    min: String(MIN_PACE_S),
    max: String(MAX_PACE_S),
    step: '0.5',
    value: String(s().breathPace),
    'aria-label': 'Pace in seconds per step',
  });
  const paceValue = el('span', { text: `${s().breathPace} s` });
  pace.addEventListener('input', () => {
    paceValue.textContent = `${pace.value} s`;
  });
  pace.addEventListener('change', () => {
    ctx.update({ breathPace: Number(pace.value) });
    restart();
  });
  const paceField = el('label', { class: 'field' }, [
    el('span', { text: 'Pace (longer is slower)' }),
    pace,
    paceValue,
  ]);

  const duration = select(
    'Session length',
    BREATH_MINUTES.map((m) => [String(m), m === 0 ? 'No end' : `${m} min`]),
    String(s().breathMinutes),
    (v) => {
      ctx.update({ breathMinutes: Number(v) as Settings['breathMinutes'] });
      restart();
    },
  );
  const sounds = select(
    'Sound on each change',
    [
      ['gong', 'Soft gong'],
      ['chime', 'Soft chime'],
      ['off', 'Off'],
    ],
    s().breathSound,
    (v) => ctx.update({ breathSound: v as Settings['breathSound'] }),
  );
  const showCount = el('input', { type: 'checkbox' });
  showCount.checked = s().breathCount;
  showCount.addEventListener('change', () => ctx.update({ breathCount: showCount.checked }));
  const countField = el('label', { class: 'field toggle' }, [
    showCount,
    el('span', { text: 'Show seconds' }),
  ]);

  const options = el('details', { class: 'options' }, [
    el('summary', { text: 'Options' }),
    pattern,
    patternNote,
    paceField,
    duration,
    sounds,
    countField,
  ]);

  const close = el('button', { class: 'primary', type: 'button', text: 'Close' });
  const dialog = openSheet(
    'Breathe',
    [stage, label, next, options, el('div', { class: 'row end' }, [close])],
    () => cancelAnimationFrame(frame),
  );
  dialog.classList.add('breathing');
  close.addEventListener('click', () => dialog.close());
  frame = requestAnimationFrame(tick);
}
