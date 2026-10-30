// The world's clock (4.6.0 "Routes", ADR 0031): what every game loads of it. A game without a route has no world:
// nothing ticks, nothing is recorded, its saves and sessions are those of 4.5, and its first visit never downloads the
// routes' engine (`core/route-runtime.ts`), which `ready` loads with the first room of a game that has routes. Here: the
// clock, the freezing, the holds the player's actions put on routes, the sync points a session records and a replay
// goes by, and what the view hears.
import type { Id, Point, RouteScriptDef, SessionEntry } from './types';
import type { Engine } from './engine';
import type { Routes } from './route-runtime';

/** What a tick did that the view shows: a character walked (or stopped), or went from one room to another. */
export type WorldEvent =
  | { kind: 'moved'; char: Id; room: Id; actor: Id; at: Point; walking: boolean; facing?: 'left' | 'right' }
  | { kind: 'crossed'; char: Id; from: Id; to: Id; at: Point };

/** Why the world stands still (the player's app sets them; none of them changes what a replay does). */
export type FreezeReason = 'menu' | 'cutscene' | 'minigame' | 'transition' | 'hidden' | (string & {});

export class World {
  /** Routes held by the player's action on their character, until that action ends (never saved). */
  private holds = new Map<SessionEntry, Id>();
  private frozenBy = new Set<FreezeReason>();
  /** What a route refused (a resume or a start away from its room): the solver and the tests read them. */
  readonly diagnostics: string[] = [];
  readonly listeners = new Set<(e: WorldEvent) => void>();
  private defs: RouteScriptDef[] | null = null;
  constructor(private eng: Engine) {}
  /** The game's routes, in their declared order (the order a tick moves them in). */
  get routes(): RouteScriptDef[] {
    return (this.defs ??= (this.eng.game.scripts ?? []).filter((s): s is RouteScriptDef => !!s.route));
  }
  /** Whether the game has a world at all: at least one route. */
  get enabled(): boolean {
    return this.routes.length > 0;
  }
  /** The clock: ticks since the game began. */
  now(): number {
    return this.eng.state?.world ?? 0;
  }
  /** Each reason is on or off (a cutscene told twice that it starts is still one cutscene). */
  freeze(reason: FreezeReason): void {
    this.frozenBy.add(reason);
  }
  thaw(reason: FreezeReason): void {
    this.frozenBy.delete(reason);
  }
  get frozen(): boolean {
    return this.frozenBy.size > 0;
  }
  /** Why it stands still now, in the order the reasons were set. */
  get reasons(): FreezeReason[] {
    return [...this.frozenBy];
  }
  /** An entry opens: the player's action on a character holds that character's route until it ends. */
  onBegin(entry: SessionEntry): void {
    if (this.enabled && 'act' in entry) this.runtime.hold(entry, this.holds);
  }
  onEnd(entry: SessionEntry): void {
    this.holds.delete(entry);
  }
  /** A new session, a load: no hold survives it. */
  reset(): void {
    this.holds.clear();
  }
  /**
   * A sync point of the open entry (its beginning, each command, each answer, its end): records the tick the world
   * stands at; a replay first runs the world to the tick recorded there.
   */
  sync(end = false): void {
    if (!this.enabled) return;
    const o = this.eng.sessions.cur;
    if (!o) return;
    const w = o.src?.wt;
    if (w?.length) {
      const t = end ? w[w.length - 1] : w[Math.min(o.wi++, w.length - 1)];
      if (t !== undefined) this.runtime.advanceTo(t);
    }
    (o.entry.wt ??= []).push(this.now());
  }
  def(id: Id): RouteScriptDef {
    const d = this.routes.find((x) => x.id === id);
    if (!d) throw new Error(`unknown route: ${id}`);
    return d;
  }
  tell(e: WorldEvent): void {
    for (const l of this.listeners) l(e);
  }

  /** The routes' engine, loaded with the game's first room when the game has routes (`ready`). */
  private impl: Routes | null = null;
  /**
   * The routes' engine when a module imported it already (`World.use`): the tools (the solver, replay) import it
   * statically and build it at once; the player loads it with the first room (`ready`).
   */
  private static Engine: (new (w: World, eng: Engine) => Routes) | null = null;
  static use(engine: new (w: World, eng: Engine) => Routes): void {
    World.Engine = engine;
  }
  /** Loads the routes' engine when the game has routes: the player's first visit of a game without routes never does. */
  async ready(): Promise<void> {
    if (!this.enabled || this.impl) return;
    const { Routes } = await import('./route-runtime');
    this.impl ??= new Routes(this, this.eng);
    World.Engine ??= Routes;
  }
  /** The routes' engine (the scenario's commands, the solver's turns, a replay's entries). */
  get runtime(): Routes {
    if (!this.impl && World.Engine) this.impl = new World.Engine(this, this.eng);
    if (!this.impl) throw new Error('routes not loaded');
    return this.impl;
  }
  /** Whether a route is held by the player's action on its character. */
  held(id: Id): boolean {
    return [...this.holds.values()].includes(id);
  }

  /** `n` ticks of the player's clock; nothing when frozen, when the game has no route or is over. */
  tick(n = 1): void {
    if (this.frozen || !this.enabled || !this.eng.state || this.eng.state.done) return;
    this.runtime.ticks(n);
  }
  /** Runs the clock to tick `t` (a replay's sync point, a recorded `{ world }` entry); never backwards. */
  advanceTo(t: number): void {
    if (this.enabled && t > this.now()) this.runtime.advanceTo(t);
  }
  /** A route whose arrival commands wait, in the routes' order (null: none). */
  nextPending(): Id | null {
    if (!this.enabled || !this.eng.state) return null;
    return this.routes.find((d) => this.eng.state.scripts?.[d.id]?.route?.pending)?.id ?? null;
  }
  /** Runs the arrival commands that wait, one route's at a time, never during another run. */
  drain(): Promise<void> {
    return this.enabled ? this.runtime.drain() : Promise.resolve();
  }
}
