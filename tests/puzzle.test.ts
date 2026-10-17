import { describe, expect, it } from 'vitest';
import {
  areaName,
  gridFor,
  isComplete,
  isSnapped,
  makeEdges,
  nextHelpPiece,
  nudgeText,
  PIECE_COUNTS,
  scatter,
  seededRandom,
  type PieceState,
} from '../src/games/slow-puzzle/puzzle';

const pieces = (rows: number, cols: number, placed: number[] = []): PieceState[] =>
  Array.from({ length: rows * cols }, (_, id) => ({ id, x: 0, y: 0, placed: placed.includes(id) }));

describe('grid sizes', () => {
  it('gives the piece counts it promises', () => {
    for (const n of PIECE_COUNTS) {
      const { rows, cols } = gridFor(n);
      expect(rows * cols).toBe(n);
    }
  });
});

describe('edges', () => {
  it('are flat on the border and fit between neighbours', () => {
    const { rows, cols } = gridFor(24);
    const e = makeEdges(rows, cols, seededRandom(4));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0) expect(e[r][c].top).toBe(0);
        if (r === rows - 1) expect(e[r][c].bottom).toBe(0);
        if (c === 0) expect(e[r][c].left).toBe(0);
        if (c === cols - 1) expect(e[r][c].right).toBe(0);
        if (c < cols - 1) {
          expect(e[r][c].right).not.toBe(0);
          expect(e[r][c].right).toBe(-e[r][c + 1].left);
        }
        if (r < rows - 1) {
          expect(e[r][c].bottom).not.toBe(0);
          expect(e[r][c].bottom).toBe(-e[r + 1][c].top);
        }
      }
    }
  });
});

describe('snapping and completion', () => {
  it('snaps only when close enough', () => {
    expect(isSnapped(0.1, 0.1, 0.11, 0.1, 0.05)).toBe(true);
    expect(isSnapped(0.1, 0.1, 0.3, 0.1, 0.05)).toBe(false);
  });

  it('is complete when every piece is placed', () => {
    expect(isComplete(pieces(3, 4, [...Array(12).keys()]))).toBe(true);
    expect(isComplete(pieces(3, 4, [0, 1]))).toBe(false);
  });
});

describe('help order', () => {
  it('starts with corners, then edges, then pieces touching placed ones', () => {
    const rows = 4;
    const cols = 6;
    const corners = [0, 5, 18, 23];
    expect(nextHelpPiece(pieces(rows, cols), rows, cols)).toEqual({ id: 0, stage: 'corner' });
    const next = nextHelpPiece(pieces(rows, cols, corners), rows, cols)!;
    expect(next.stage).toBe('edge');
    const edges = [...Array(24).keys()].filter(
      (id) => id < 6 || id >= 18 || id % 6 === 0 || id % 6 === 5,
    );
    const afterFrame = nextHelpPiece(pieces(rows, cols, edges), rows, cols)!;
    expect(afterFrame.stage).toBe('neighbour');
    expect([7, 8, 9, 10, 13, 14, 15, 16]).toContain(afterFrame.id);
  });

  it('has nothing to suggest when finished', () => {
    expect(nextHelpPiece(pieces(3, 4, [...Array(12).keys()]), 3, 4)).toBeNull();
  });

  it('describes where a piece belongs without giving coordinates', () => {
    expect(areaName(0, 4, 6)).toBe('the top left');
    expect(areaName(23, 4, 6)).toBe('the bottom right');
    expect(areaName(2, 4, 6)).toBe('the top centre');
    expect(nudgeText('corner', 0, 4, 6)).toMatch(/corner/i);
    expect(nudgeText('edge', 0, 4, 6)).toContain('the top left');
  });
});

describe('scatter', () => {
  it('keeps loose pieces inside the canvas and away from the board when there is room', () => {
    const board = { x: 0.19, y: 0.1675, w: 0.62, h: 0.465 };
    const cell = { w: 0.1, h: 0.1 };
    const spots = scatter(24, { w: 1, h: 0.8 }, board, cell, seededRandom(2));
    expect(spots).toHaveLength(24);
    for (const s of spots) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x + cell.w).toBeLessThanOrEqual(1);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y + cell.h).toBeLessThanOrEqual(0.8);
    }
    const onBoard = spots.filter(
      (s) =>
        s.x + cell.w > board.x &&
        s.x < board.x + board.w &&
        s.y + cell.h > board.y &&
        s.y < board.y + board.h,
    );
    expect(onBoard.length).toBeLessThan(spots.length / 4);
  });
});
