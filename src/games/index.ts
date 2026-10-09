import type { GameInfo } from '../core/game';
import { createPetalMandala } from './petal-mandala/mandala';
import { createQuietGrid } from './quiet-grid/quiet-grid';
import { createRiverStones } from './river-stones/river-stones';

export const GAMES: GameInfo[] = [
  {
    id: 'petal-mandala',
    title: 'Petal Mandala',
    blurb: 'Colour a mandala, one petal at a time.',
    create: createPetalMandala,
  },
  {
    id: 'river-stones',
    title: 'River Stones',
    blurb: 'Sow stones along the river. A gentle opponent, or a friend.',
    create: createRiverStones,
  },
  {
    id: 'quiet-grid',
    title: 'Quiet Grid',
    blurb: 'Fill the grid from the clues and a nature picture appears.',
    create: createQuietGrid,
  },
];
