import type { CharacterDef } from '@engine/core/types';
import { characters as reference } from '../reference/cast';

// The routes example's cast: the reference chapter's (the sample game's art, D13). Lou and Grandma walk on their own:
// each has a `room` and a route (game.ts).
export const characters: Record<string, CharacterDef> = {
  hero: reference.hero!,
  neighbor: { ...reference.neighbor!, room: 'hall' },
  grandma: { ...reference.grandma!, room: 'kitchen' },
};
