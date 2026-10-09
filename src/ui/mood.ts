import { el, openSheet } from './dom';

const FACES = [
  { score: 1, face: '😣', label: 'Tense' },
  { score: 2, face: '😕', label: 'A bit uneasy' },
  { score: 3, face: '😐', label: 'Okay' },
  { score: 4, face: '🙂', label: 'Fairly calm' },
  { score: 5, face: '😊', label: 'Very calm' },
];

export function faceFor(score: number): string {
  return FACES.find((f) => f.score === score)?.face ?? '';
}

/** Ask for a 1-5 mood; resolves with the score, or null if skipped. */
export function askMood(question: string): Promise<number | null> {
  return new Promise((resolve) => {
    let answer: number | null = null;
    const faces = FACES.map((f) => {
      const b = el(
        'button',
        { class: 'face', type: 'button', 'aria-label': f.label, title: f.label },
        [f.face],
      );
      b.addEventListener('click', () => {
        answer = f.score;
        dialog.close();
      });
      return b;
    });
    const skip = el('button', { class: 'quiet', type: 'button', text: 'Skip' });
    skip.addEventListener('click', () => dialog.close());
    const dialog = openSheet(
      question,
      [
        el('p', { class: 'hint', text: 'Stays on this device only.' }),
        el('div', { class: 'faces' }, faces),
        el('div', { class: 'row end' }, [skip]),
      ],
      () => resolve(answer),
    );
  });
}

export function showMoodSummary(before: number | null, after: number): void {
  const text =
    before === null
      ? 'Thank you for taking a moment for yourself.'
      : after > before
        ? 'A little calmer than when you arrived.'
        : after === before
          ? 'Steady. That is fine too.'
          : 'Some days are heavier. Being here still counts.';
  const close = el('button', { class: 'primary', type: 'button', text: 'Close' });
  const arrow = before === null ? '' : `${faceFor(before)}  →  `;
  const dialog = openSheet('Well done', [
    el('p', { class: 'summary-faces', text: `${arrow}${faceFor(after)}` }),
    el('p', { text }),
    el('div', { class: 'row end' }, [close]),
  ]);
  close.addEventListener('click', () => dialog.close());
}
