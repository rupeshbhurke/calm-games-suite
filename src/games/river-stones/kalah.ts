/**
 * Kalah (Mancala) rules as pure functions. Board indexes, counter-clockwise:
 *   player 0 pits 0-5, player 0 store 6, player 1 pits 7-12, player 1 store 13.
 * The pit opposite pit i is 12 - i.
 */
export type Player = 0 | 1;

export interface KalahState {
  pits: number[];
  turn: Player;
}

export const STORE: Record<Player, number> = { 0: 6, 1: 13 };
const FIRST_PIT: Record<Player, number> = { 0: 0, 1: 7 };

export function newGame(stones = 4): KalahState {
  const pits = Array<number>(14).fill(stones);
  pits[6] = 0;
  pits[13] = 0;
  return { pits, turn: 0 };
}

export const other = (p: Player): Player => (p === 0 ? 1 : 0);

export function pitIndexes(player: Player): number[] {
  return Array.from({ length: 6 }, (_, i) => FIRST_PIT[player] + i);
}

export function ownerOf(index: number): Player {
  return index <= 6 ? 0 : 1;
}

export function legalMoves(s: KalahState): number[] {
  return pitIndexes(s.turn).filter((i) => s.pits[i] > 0);
}

export function score(s: KalahState): [number, number] {
  return [s.pits[STORE[0]], s.pits[STORE[1]]];
}

export interface MoveResult {
  state: KalahState;
  /** Pits and stores that received a stone, in order, for animation. */
  path: number[];
  captured: number;
  extraTurn: boolean;
  over: boolean;
}

function sideEmpty(pits: number[], player: Player): boolean {
  return pitIndexes(player).every((i) => pits[i] === 0);
}

export function applyMove(s: KalahState, pit: number): MoveResult {
  if (!legalMoves(s).includes(pit)) throw new RangeError(`illegal move: pit ${pit}`);
  const me = s.turn;
  const pits = [...s.pits];
  const skip = STORE[other(me)];
  const path: number[] = [];
  let stones = pits[pit];
  pits[pit] = 0;
  let idx = pit;
  while (stones > 0) {
    idx = (idx + 1) % 14;
    if (idx === skip) continue;
    pits[idx]++;
    path.push(idx);
    stones--;
  }

  const extraTurn = idx === STORE[me];
  let captured = 0;
  const opposite = 12 - idx;
  if (
    !extraTurn &&
    idx !== STORE[other(me)] &&
    ownerOf(idx) === me &&
    pits[idx] === 1 &&
    pits[opposite] > 0
  ) {
    captured = pits[opposite] + 1;
    pits[STORE[me]] += captured;
    pits[idx] = 0;
    pits[opposite] = 0;
  }

  const over = sideEmpty(pits, 0) || sideEmpty(pits, 1);
  if (over) {
    // Remaining stones go to the store of the side they sit on.
    for (const p of [0, 1] as Player[]) {
      for (const i of pitIndexes(p)) {
        pits[STORE[p]] += pits[i];
        pits[i] = 0;
      }
    }
  }
  const turn = extraTurn && !over ? me : other(me);
  return { state: { pits, turn }, path, captured, extraTurn, over };
}

function moveValue(s: KalahState, pit: number): number {
  const r = applyMove(s, pit);
  const gain = r.state.pits[STORE[s.turn]] - s.pits[STORE[s.turn]];
  return (r.extraTurn ? 3 : 0) + gain + (r.captured > 0 ? 1 : 0);
}

/** The most helpful move for the player to move; used for hints. */
export function suggestMove(s: KalahState): number {
  const moves = legalMoves(s);
  return moves.reduce((best, m) => (moveValue(s, m) > moveValue(s, best) ? m : best), moves[0]);
}

/** A soft opponent: usually sensible, often just plays something. */
export function chooseGentleMove(s: KalahState, rand: () => number = Math.random): number {
  const moves = legalMoves(s);
  if (rand() < 0.4) return moves[Math.floor(rand() * moves.length)];
  return suggestMove(s);
}
