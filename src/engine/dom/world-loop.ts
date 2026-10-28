// The player's side of the world's clock (4.6.0 "Routes"): the frames tick it by whole ticks (core/route-runtime.ts),
// the view shows what moved, and the clock stands still while the game is not being played: the pause menu, a
// cutscene, a minigame, a room transition, the page hidden. No catching up: a hidden hour is not walked afterwards.
import { WORLD_TICK_MS } from '../core/timing';
import type { WorldEvent } from '../core/route-runtime';
import type { App } from './app';

/** The most of the world's time one frame may run: a slow frame loses the rest, never walks it at once. */
const MAX_FRAME_MS = 250;

/** Starts the clock on the frames; returns what stops it (the app's `destroy`). */
export function startWorld(app: App): () => void {
  const world = app.engine.world;
  if (!world.enabled) return () => {};
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let draining = false;
  const frame = (now: number) => {
    acc += Math.min(MAX_FRAME_MS, now - last);
    last = now;
    const n = Math.floor(acc / WORLD_TICK_MS);
    acc -= n * WORLD_TICK_MS;
    if (world.frozen) acc = 0;
    else if (n) world.tick(n);
    // The arrival commands, when the engine is idle: one route's at a time, never during the player's action.
    if (!draining && !app.engine.busy && world.nextPending()) {
      draining = true;
      void world.drain().finally(() => (draining = false));
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const shown = (e: WorldEvent) => {
    const room = app.engine.state?.room;
    const view = app.view;
    if (!room || view.room?.id !== room) return;
    if (e.kind === 'moved') {
      if (e.room === room) view.walker.track(e.actor, e.at, e.walking, e.facing);
      return;
    }
    const r = app.engine.room(e.from === room ? e.from : e.to);
    const inst = app.engine.instanceOf(e.char, r);
    if (!inst) return;
    if (e.from === room) void view.show(inst, false, 0, true);
    else if (e.to === room) {
      view.place(inst, e.at);
      void view.show(inst, true, 0, true);
    }
  };
  world.listeners.add(shown);
  const hidden = () => {
    if (document.hidden) world.freeze('hidden');
    else world.thaw('hidden');
  };
  document.addEventListener('visibilitychange', hidden);
  hidden();
  return () => {
    cancelAnimationFrame(raf);
    world.listeners.delete(shown);
    document.removeEventListener('visibilitychange', hidden);
  };
}
