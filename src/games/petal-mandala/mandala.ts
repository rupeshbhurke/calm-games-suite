import type { CalmGame, GameContext } from '../../core/game';
import { el } from '../../ui/dom';
import { BLANK, buildRegions, PALETTE } from './regions';

const SVG = 'http://www.w3.org/2000/svg';
const HISTORY_LIMIT = 200;

interface Change {
  id: number;
  prev: number;
}

interface Saved {
  fills: number[];
  selected: number;
  history: Change[][];
}

/** Colour-by-region mandala: tap or drag to colour, tap the same colour again to clear. */
export function createPetalMandala(): CalmGame {
  const regions = buildRegions();
  let fills: number[] = regions.map(() => BLANK);
  let selected = 0;
  let history: Change[][] = [];

  let ctx: GameContext;
  let root: HTMLElement;
  let paths: SVGPathElement[] = [];
  let swatches: HTMLButtonElement[] = [];
  let svg: SVGSVGElement;
  let status: HTMLElement;
  let undoBtn: HTMLButtonElement;
  let painting = false;

  const coloured = () => fills.filter((f) => f !== BLANK).length;

  function render() {
    regions.forEach((_, i) => {
      const f = fills[i];
      paths[i].style.fill = f === BLANK ? '' : PALETTE[f].color;
      paths[i].setAttribute(
        'aria-label',
        `Petal ${i + 1}, ${f === BLANK ? 'blank' : PALETTE[f].name}`,
      );
    });
    swatches.forEach((b, i) => b.setAttribute('aria-pressed', String(i === selected)));
    const done = coloured() === regions.length;
    svg.classList.toggle('glow', done);
    status.textContent = done
      ? 'Your mandala is complete. Take a breath and enjoy it.'
      : `${coloured()} of ${regions.length} petals coloured`;
    undoBtn.disabled = history.length === 0;
  }

  function commit(changes: Change[]) {
    if (!changes.length) return;
    history.push(changes);
    if (history.length > HISTORY_LIMIT) history.shift();
    render();
    ctx.requestSave();
  }

  function paint(id: number, toggle: boolean): Change | null {
    const prev = fills[id];
    const next = toggle && prev === selected ? BLANK : selected;
    if (next === prev) return null;
    fills[id] = next;
    ctx.mixer.chime(selected + regions[id].ring + 1);
    return { id, prev };
  }

  function regionAt(e: PointerEvent): number | null {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const id = target instanceof SVGPathElement ? target.dataset.id : undefined;
    return id === undefined ? null : Number(id);
  }

  let stroke: Change[] = [];

  function build() {
    svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '-104 -104 208 208');
    svg.setAttribute('class', 'mandala');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Mandala. Choose a colour, then tap petals.');
    paths = regions.map((r) => {
      const p = document.createElementNS(SVG, 'path');
      p.setAttribute('d', r.d);
      p.setAttribute('class', 'petal');
      p.dataset.id = String(r.id);
      svg.append(p);
      return p;
    });

    svg.addEventListener('pointerdown', (e) => {
      const id = regionAt(e);
      if (id === null) return;
      painting = true;
      stroke = [];
      const c = paint(id, true);
      if (c) stroke.push(c);
      render();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!painting) return;
      const id = regionAt(e);
      if (id === null || fills[id] === selected) return;
      const c = paint(id, false);
      if (c) stroke.push(c);
      render();
    });
    const end = () => {
      if (!painting) return;
      painting = false;
      commit(stroke);
      stroke = [];
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('pointerleave', end);

    const palette = el('div', { class: 'palette', role: 'group', 'aria-label': 'Colours' });
    swatches = PALETTE.map((p, i) => {
      const b = el('button', {
        type: 'button',
        class: 'swatch',
        'aria-label': p.name,
        title: p.name,
      });
      b.style.background = p.color;
      b.addEventListener('click', () => {
        selected = i;
        render();
        ctx.requestSave();
      });
      palette.append(b);
      return b;
    });

    undoBtn = el('button', { type: 'button', text: 'Undo' });
    undoBtn.addEventListener('click', () => {
      const last = history.pop();
      if (!last) return;
      for (const c of [...last].reverse()) fills[c.id] = c.prev;
      render();
      ctx.requestSave();
    });
    const clear = el('button', { type: 'button', text: 'Start fresh' });
    clear.addEventListener('click', () => {
      const changes = fills.flatMap((f, id) => (f === BLANK ? [] : [{ id, prev: f }]));
      fills = fills.map(() => BLANK);
      commit(changes);
    });

    status = el('p', { class: 'game-status', 'aria-live': 'polite' });
    root.append(
      el('div', { class: 'game-board mandala-board' }, [svg]),
      status,
      palette,
      el('div', { class: 'game-bar' }, [undoBtn, clear]),
    );
  }

  return {
    id: 'petal-mandala',
    title: 'Petal Mandala',
    load(state) {
      const s = state as Partial<Saved> | null;
      if (!s || !Array.isArray(s.fills) || s.fills.length !== regions.length) return;
      fills = s.fills.map((f) => (Number.isInteger(f) && f >= 0 && f < PALETTE.length ? f : BLANK));
      if (Number.isInteger(s.selected) && s.selected! >= 0 && s.selected! < PALETTE.length) {
        selected = s.selected!;
      }
      history = Array.isArray(s.history)
        ? s.history
            .filter(Array.isArray)
            .map((h) => h.filter((c) => c && regions[c.id] && Number.isInteger(c.prev)))
            .slice(-HISTORY_LIMIT)
        : [];
    },
    mount(el_, c) {
      root = el_;
      ctx = c;
      build();
      render();
    },
    pause() {},
    resume() {},
    save(): Saved {
      return { fills, selected, history };
    },
    unmount() {
      root.replaceChildren();
    },
  };
}
