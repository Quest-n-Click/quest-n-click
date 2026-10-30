// The player's side of the world's clock (4.6.0 "Routes"): the frames tick it by whole ticks (core/route-runtime.ts),
// the view shows what moved, and the clock stands still while the game is not being played: the pause menu, a
// cutscene, a minigame, a room transition, the page hidden. No catching up: a hidden hour is not walked afterwards.
import { WALK_SPEED, WORLD_TICK_MS } from '../core/timing';
import type { Id, Point } from '../core/types';
import type { Walker } from './walker';
import type { WorldEvent } from '../core/world';
import type { App } from './app';

/** The most of the world's time one frame may run: a slow frame loses the rest, never walks it at once. */
const MAX_FRAME_MS = 250;
/** The autosave keeps the routes' progress while the player only watches: every two seconds of the world's clock. */
const SAVE_EVERY_TICKS = 2000 / WORLD_TICK_MS;

/**
 * The view's side of a route: the clock moved a character to `to`, and the view glides it there at the walking speed,
 * with the walk pose while it walks, never more than a tick behind. A glide belongs to the room it started in.
 */
class Glide {
  private tracks = new Map<Id, { room: Id; to: Point; walking: boolean; flip?: boolean }>();
  private on = false;
  constructor(
    private walker: Walker,
    private room: () => Id | undefined,
  ) {}

  track(room: Id, id: Id, to: Point, walking: boolean, facing?: 'left' | 'right') {
    if (!this.walker.scene.ent(id)) return;
    this.walker.stop(id);
    this.tracks.set(id, { room, to, walking, ...(facing ? { flip: facing === 'left' } : {}) });
    if (!this.on) this.run();
  }

  private run() {
    this.on = true;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      for (const [id, t] of this.tracks) {
        const e = this.walker.scene.ent(id);
        if (!e || t.room !== this.room()) {
          this.tracks.delete(id);
          continue;
        }
        const dx = t.to[0] - e.x,
          dy = t.to[1] - e.y,
          d = Math.hypot(dx, dy);
        const k = d > 40 ? 1 : Math.min(1, (WALK_SPEED * 1.25 * dt) / (d || 1));
        e.x += dx * k;
        e.y += dy * k;
        if (t.flip !== undefined) e.flip = t.flip;
        else if (Math.abs(dx) > 1) e.flip = dx < 0;
        e.over = (t.walking || d > 1) && this.walker.scene.sprites(e)?.walk ? 'walk' : undefined;
        this.walker.scene.draw(e);
        if (!t.walking && d <= 1) this.tracks.delete(id);
      }
      if (this.tracks.size) requestAnimationFrame(frame);
      else this.on = false;
    };
    requestAnimationFrame(frame);
  }
}

/** Starts the clock on the frames; returns what stops it (the app's `destroy`). */
export function startWorld(app: App): () => void {
  const world = app.engine.world;
  if (!world.enabled) return () => {};
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let draining = false;
  const glide = new Glide(app.view.walker, () => app.view.room?.id);
  let savedAt = 0;
  const frame = (now: number) => {
    acc += Math.min(MAX_FRAME_MS, now - last);
    last = now;
    const n = Math.floor(acc / WORLD_TICK_MS);
    acc -= n * WORLD_TICK_MS;
    if (world.frozen) acc = 0;
    else if (n) world.tick(n);
    // An action or a cutscene saves when it ends; between them, the walk the player watched is saved here.
    if (!app.engine.busy && world.now() - savedAt >= SAVE_EVERY_TICKS) {
      savedAt = world.now();
      app.engine.save();
    }
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
      if (e.room === room) glide.track(room, e.actor, e.at, e.walking, e.facing);
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
