import type { CalmGame, GameContext } from '../../core/game';
import { el } from '../../ui/dom';
import { createHelp, flash } from '../../ui/help';
import {
  availablePairs,
  isCleared,
  isFreeTile,
  LAYOUTS,
  newGame,
  remaining,
  removePair,
  reshuffle,
  suggestPair,
  SYMBOLS,
  type Game,
  type Tile,
} from './mahjong';

const SVG = 'http://www.w3.org/2000/svg';
const UNIT_X = 22;
const UNIT_Y = 26;
const DEPTH = 6;
const HISTORY_LIMIT = 100;

interface Entry {
  /** The pair removed by this move, if any. */
  ids?: [number, number];
  /** Symbols before a shuffle, if this move caused one. */
  prevSymbols?: number[];
}

interface SavedGame {
  symbols: number[];
  removed: boolean[];
  history: Entry[];
}

interface Saved {
  layoutId: string;
  games: Record<string, SavedGame>;
}

const svgEl = (tag: string, attrs: Record<string, string> = {}) => {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

/** Mahjong solitaire: match free pairs of tiles. When nothing can be matched, the tiles gently reshuffle. */
export function createLotusTiles(): CalmGame {
  let layoutId = LAYOUTS[LAYOUTS.length - 1].id;
  const games: Record<string, Game> = {};
  const histories: Record<string, Entry[]> = {};
  let selected: number | null = null;

  let ctx: GameContext;
  let root: HTMLElement;
  let status: HTMLElement;
  let undoBtn: HTMLButtonElement;
  let layoutBtn: HTMLButtonElement;
  let board: HTMLElement;
  let nodes: SVGGElement[] = [];
  let glyphs: SVGTextElement[] = [];

  const game = (): Game => (games[layoutId] ??= newGame(layoutId));
  const history = (): Entry[] => (histories[layoutId] ??= []);
  const tileOf = (id: number) => game().tiles[id];
  const nameOf = (t: Tile) => SYMBOLS[t.symbol].name;

  function render() {
    const g = game();
    const rest = remaining(g.tiles);
    const open = new Set(rest.filter((t) => isFreeTile(g.tiles, t.id)).map((t) => t.id));
    g.tiles.forEach((t, i) => {
      const node = nodes[i];
      glyphs[i].textContent = SYMBOLS[t.symbol].glyph;
      node.classList.toggle('gone', t.removed);
      node.classList.toggle('blocked', !t.removed && !open.has(t.id));
      node.classList.toggle('picked', selected === t.id);
      node.setAttribute('aria-hidden', String(t.removed));
      node.setAttribute('tabindex', t.removed ? '-1' : '0');
      node.setAttribute(
        'aria-label',
        `${nameOf(t)} tile, ${open.has(t.id) ? 'free' : 'covered or hemmed in'}${selected === t.id ? ', selected' : ''}`,
      );
    });
    const done = isCleared(g.tiles);
    board.classList.toggle('solved', done);
    undoBtn.disabled = history().length === 0;
    layoutBtn.textContent = `Layout: ${LAYOUTS.find((l) => l.id === layoutId)!.title}`;
    if (done) say('Cleared. Lovely. Start a new deal whenever you like.');
  }

  function say(text: string) {
    status.textContent = text;
  }

  function counts(): string {
    return `${remaining(game().tiles).length} tiles left`;
  }

  /** Remove a pair, and reshuffle if that leaves nothing to match. */
  function match(a: number, b: number) {
    const g = game();
    const entry: Entry = { ids: [a, b] };
    g.tiles = removePair(g.tiles, a, b);
    ctx.mixer.chime(a + b);
    selected = null;
    if (!isCleared(g.tiles) && availablePairs(g.tiles).length === 0) {
      entry.prevSymbols = g.tiles.map((t) => t.symbol);
      g.tiles = reshuffle(g.tiles);
      say('No pairs were left, so the tiles gently shuffled. Nothing lost.');
    } else {
      say(counts());
    }
    push(entry);
  }

  function push(entry: Entry) {
    history().push(entry);
    if (history().length > HISTORY_LIMIT) history().shift();
    render();
    ctx.requestSave();
  }

  function onTile(id: number) {
    const t = tileOf(id);
    if (t.removed) return;
    if (!isFreeTile(game().tiles, id)) {
      say('That tile is covered or hemmed in on both sides. Look for one with an open side.');
      return;
    }
    if (selected === null) {
      selected = id;
      say(`${nameOf(t)} chosen. Find its partner.`);
    } else if (selected === id) {
      selected = null;
      say(counts());
    } else if (tileOf(selected).symbol === t.symbol) {
      match(selected, id);
      return;
    } else {
      selected = id;
      say(`${nameOf(t)} chosen. Find its partner.`);
    }
    render();
  }

  function undo() {
    const entry = history().pop();
    if (!entry) return;
    const g = game();
    const prev = entry.prevSymbols;
    g.tiles = g.tiles.map((t) => ({
      ...t,
      removed: entry.ids?.includes(t.id) ? false : t.removed,
      symbol: prev ? prev[t.id] : t.symbol,
    }));
    selected = null;
    say(counts());
    render();
    ctx.requestSave();
  }

  function shuffle() {
    const g = game();
    if (isCleared(g.tiles)) return;
    history().push({ prevSymbols: g.tiles.map((t) => t.symbol) });
    g.tiles = reshuffle(g.tiles);
    selected = null;
    say('The tiles are mixed up. Take your time.');
    render();
    ctx.requestSave();
  }

  function newDeal() {
    games[layoutId] = newGame(layoutId);
    histories[layoutId] = [];
    selected = null;
    mountBoard();
    say(counts());
    ctx.requestSave();
  }

  /** Build the SVG for the current layout; tiles are drawn back to front. */
  function buildBoard(): SVGSVGElement {
    const g = game();
    const maxX = Math.max(...g.tiles.map((t) => t.x));
    const maxY = Math.max(...g.tiles.map((t) => t.y));
    const maxZ = Math.max(...g.tiles.map((t) => t.z));
    const width = (maxX + 2) * UNIT_X + maxZ * DEPTH + 6;
    const height = (maxY + 2) * UNIT_Y + maxZ * DEPTH + 6;
    const svg = svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      class: 'lotus',
      role: 'group',
      'aria-label': 'Tile board. Match two free tiles with the same symbol.',
    }) as SVGSVGElement;
    nodes = [];
    glyphs = [];
    const order = [...g.tiles].sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
    for (const t of order) {
      const px = t.x * UNIT_X + t.z * DEPTH + 2;
      const py = t.y * UNIT_Y - t.z * DEPTH + maxZ * DEPTH + 2;
      const tw = 2 * UNIT_X - 2;
      const th = 2 * UNIT_Y - 2;
      const node = svgEl('g', { class: 'tile', role: 'button' }) as SVGGElement;
      node.append(
        svgEl('rect', {
          class: 'edge',
          x: String(px + 3),
          y: String(py + 3),
          width: String(tw),
          height: String(th),
          rx: '7',
        }),
        svgEl('rect', {
          class: 'face',
          x: String(px),
          y: String(py),
          width: String(tw),
          height: String(th),
          rx: '7',
        }),
      );
      const glyph = svgEl('text', {
        class: 'glyph',
        x: String(px + tw / 2),
        y: String(py + th / 2 + 1),
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'aria-hidden': 'true',
      }) as SVGTextElement;
      node.append(glyph);
      node.addEventListener('click', () => onTile(t.id));
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTile(t.id);
        }
      });
      nodes[t.id] = node;
      glyphs[t.id] = glyph;
      svg.append(node);
    }
    return svg;
  }

  function mountBoard() {
    board.replaceChildren(buildBoard());
    render();
  }

  function mount() {
    root.replaceChildren();
    board = el('div', { class: 'game-board lotus-board' });
    status = el('p', { class: 'game-status', 'aria-live': 'polite' });
    undoBtn = el('button', { type: 'button', text: 'Undo' });
    undoBtn.addEventListener('click', undo);
    const shuffleBtn = el('button', { type: 'button', text: 'Shuffle' });
    shuffleBtn.addEventListener('click', shuffle);
    layoutBtn = el('button', { type: 'button' });
    layoutBtn.addEventListener('click', () => {
      const i = LAYOUTS.findIndex((l) => l.id === layoutId);
      layoutId = LAYOUTS[(i + 1) % LAYOUTS.length].id;
      selected = null;
      mountBoard();
      say(counts());
      ctx.requestSave();
    });
    const again = el('button', { type: 'button', text: 'New deal' });
    again.addEventListener('click', newDeal);

    const help = createHelp('lotus-tiles', 'Lotus Tiles', {
      rules: [
        'Tap two tiles with the same symbol to clear them. A tile can be chosen when nothing sits on top of it and at least one of its sides (left or right) is open.',
        'Clear every tile to finish. Every deal can be cleared.',
        'If no matching pair is left, the tiles gently reshuffle on their own. You can also tap Shuffle whenever you like.',
      ],
      nudge: () => {
        const pair = suggestPair(game().tiles);
        if (!pair) return null;
        return `Two free ${nameOf(pair[0])} tiles match right now (${SYMBOLS[pair[0].symbol].glyph}). Tiles on the higher layers are a good place to start.`;
      },
      show: () => {
        const pair = suggestPair(game().tiles);
        if (!pair) return null;
        flash(nodes[pair[0].id]);
        flash(nodes[pair[1].id]);
        return 'The two highlighted tiles match.';
      },
      apply: () => {
        const pair = suggestPair(game().tiles);
        if (!pair) return null;
        match(pair[0].id, pair[1].id);
        return 'Cleared a matching pair for you.';
      },
    });

    root.append(
      board,
      status,
      el('div', { class: 'game-bar' }, [help.toggle, undoBtn, shuffleBtn, layoutBtn, again]),
      help.panel,
    );
    mountBoard();
    say(isCleared(game().tiles) ? status.textContent! : counts());
    help.maybeShowRules();
  }

  const validSaved = (s: unknown, layoutSize: number): s is SavedGame => {
    const g = s as SavedGame | null;
    return (
      !!g &&
      Array.isArray(g.symbols) &&
      g.symbols.length === layoutSize &&
      g.symbols.every((n) => Number.isInteger(n) && n >= 0 && n < SYMBOLS.length) &&
      Array.isArray(g.removed) &&
      g.removed.length === layoutSize
    );
  };

  return {
    id: 'lotus-tiles',
    title: 'Lotus Tiles',
    load(state) {
      const s = state as Partial<Saved> | null;
      if (!s) return;
      if (LAYOUTS.some((l) => l.id === s.layoutId)) layoutId = s.layoutId!;
      for (const layout of LAYOUTS) {
        const saved = s.games?.[layout.id];
        if (!validSaved(saved, layout.positions.length)) continue;
        const fresh = newGame(layout.id);
        games[layout.id] = {
          layoutId: layout.id,
          tiles: fresh.tiles.map((t, i) => ({
            ...t,
            symbol: saved.symbols[i],
            removed: saved.removed[i] === true,
          })),
        };
        histories[layout.id] = (Array.isArray(saved.history) ? saved.history : [])
          .filter((h) => h && (Array.isArray(h.ids) || Array.isArray(h.prevSymbols)))
          .slice(-HISTORY_LIMIT);
      }
    },
    mount(el_, c) {
      root = el_;
      ctx = c;
      mount();
    },
    pause() {},
    resume() {},
    save(): Saved {
      const out: Record<string, SavedGame> = {};
      for (const [id, g] of Object.entries(games)) {
        out[id] = {
          symbols: g.tiles.map((t) => t.symbol),
          removed: g.tiles.map((t) => t.removed),
          history: histories[id] ?? [],
        };
      }
      return { layoutId, games: out };
    },
    unmount() {
      root.replaceChildren();
    },
  };
}
