// The state of a game in progress: what a save holds. (core/types.ts re-exports every name; 4.1.0 "Clarity".)
import type { Id, Point, Value } from './content';
import type { RealityState } from './reality';

/**
 * Where a route stands inside its current step (4.6.0); its step is the script's `pc`/`step`, its character's room and
 * position are `where` and `actors` as for any character.
 * @public
 */
export interface RouteProgress {
  /** It began: its character was in the route's `from` room. */
  on?: true;
  /** Milliseconds left of the step's `wait`, or of the walk link being crossed. */
  wait?: number;
  /** Waiting at a closed exit or before a closed walk link. */
  blocked?: true;
  /** The step whose arrival commands (`do`) wait to run. */
  pending?: Id;
}

// ---------------------------------------------------------------------------
// Game state (serialised as-is in the save)
// ---------------------------------------------------------------------------

/**
 * The state of a game in progress, serialised as-is in a save: room, inventory, flags, props, actors, counters,
 * scripts.
 * @public
 */
export interface GameState {
  v: number;
  room: Id;
  inventory: Id[];
  flags: Record<Id, Value>;
  /** Prop states, key `room.prop`. */
  props: Record<string, string>;
  /** Actors moved, hidden or shown by script, key `room.actor`. */
  actors: Record<string, { x?: number; y?: number; pose?: string; facing?: 'left' | 'right'; visible?: boolean }>;
  /** Hero position per room. */
  hero: Record<Id, Point>;
  unlocked: Id[];
  visited: Record<Id, number>;
  /** Counters for once / nth / cycle / random blocks and list looks. */
  counters: Record<string, number>;
  seen: Record<string, 1>;
  /** Used inventory items (greyed out). Absent in old saves. */
  used?: Id[];
  /** Room of each moving character (`CharacterDef.room`, `moveActor`). Absent in old saves. */
  where?: Record<Id, Id>;
  /** Position of each script: next command, finished, stopped. Absent in old saves. */
  scripts?: Record<
    Id,
    {
      pc: number /** Stable next-step id in schema v3 saves. */;
      step?: Id;
      done?: boolean;
      off?: boolean;
      /** Suspended by `suspendScript` (4.6.0): it keeps its step and resumes with `resumeScript`. */
      paused?: boolean;
      /** A route's progress in its step (4.6.0): the wait left, held at a closed exit, its arrival commands pending. */
      route?: RouteProgress;
    }
  >;
  /** The world's clock (4.6.0): ticks of `WORLD_TICK_MS` since the game began. Absent in a game without routes. */
  world?: number;
  /** Camera of the current room: left edge x, or following the hero. */
  camera?: { x: number; follow: boolean };
  /** The character the player controls (`GameDef.players`; otherwise `hero`). */
  active?: Id;
  /** The other playable characters: their room, positions and inventory (the active one lives in the flat fields). */
  players?: Record<Id, { room: Id; inventory: Id[]; hero: Record<Id, Point>; used?: Id[] }>;
  started: number;
  done?: boolean;
  /** Where the music was when this was saved (3.6): its track and its position in the file, in seconds. Written by the
   *  player's app, read back by it to resume the music there; the engine and the tools never read it. */
  music?: { id: Id; at: number };
  /** The link to a Reality Bridge (4.1.1): the cursor and the signals applied. Absent in a game without `reality`. */
  reality?: RealityState;
}
