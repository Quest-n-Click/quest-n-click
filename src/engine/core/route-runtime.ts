// The world's clock and its routes (4.6.0 "Routes", ADR 0031): a character walks from step to step, through rooms, shown
// or not. The clock moves by whole ticks (`WORLD_TICK_MS`); a tick reads the state and writes it, never the view, so a
// replay that applies the same ticks between the same commands finds the same state. The player's app ticks it on its
// frames (and freezes it: a menu, a cutscene, a minigame, a room transition, the page hidden); a session records, at
// each of its sync points, the tick it stood at (`SessionEntry.wt`), and a replay goes there before going on.
// A game without a route has no world: nothing ticks, nothing is recorded, its saves and sessions are those of 4.5.
import { WalkTopology } from './nav/walk';
import { roomKey } from './keys';
import { WALK_SPEED, WORLD_TICK_MS } from './timing';
import type { Id, Point, RouteProgress, RouteScriptDef, RouteStep, SessionEntry } from './types';
import type { Engine } from './engine';

/** What a tick did that the view shows: a character walked (or stopped), or went from one room to another. */
export type WorldEvent =
  | { kind: 'moved'; char: Id; room: Id; actor: Id; at: Point; walking: boolean; facing?: 'left' | 'right' }
  | { kind: 'crossed'; char: Id; from: Id; to: Id; at: Point };

/** Why the world stands still (the player's app sets them; none of them changes what a replay does). */
export type FreezeReason = 'menu' | 'cutscene' | 'minigame' | 'transition' | 'hidden' | (string & {});

/** Distance under which a walker is on its target, in logical units. */
const ARRIVED = 0.5;
/** The longest a solver's or a test's "until the next stop" lets the world run: ten minutes of its clock. */
const STOP_GUARD = (10 * 60 * 1000) / WORLD_TICK_MS;

export class World {
  /** Routes held by the player's action on their character, until that action ends (never saved). */
  private holds = new Map<SessionEntry, Id>();
  private frozenBy = new Map<FreezeReason, number>();
  private topologies = new Map<Id, WalkTopology>();
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

  // ------------------------------------------------------------------ freezing (the player's app)
  freeze(reason: FreezeReason): void {
    this.frozenBy.set(reason, (this.frozenBy.get(reason) ?? 0) + 1);
  }
  thaw(reason: FreezeReason): void {
    const n = (this.frozenBy.get(reason) ?? 0) - 1;
    if (n > 0) this.frozenBy.set(reason, n);
    else this.frozenBy.delete(reason);
  }
  get frozen(): boolean {
    return this.frozenBy.size > 0;
  }
  /** Why it stands still now, in the order the reasons were set. */
  get reasons(): FreezeReason[] {
    return [...this.frozenBy.keys()];
  }

  // ------------------------------------------------------------------ time passing
  /** `n` ticks of the player's clock; nothing when frozen, when the game has no route or is over. */
  tick(n = 1): void {
    if (this.frozen || !this.enabled || !this.eng.state || this.eng.state.done) return;
    for (let i = 0; i < n; i++) this.step();
  }

  /** Runs the clock to tick `t` (a replay's sync point, a recorded `{ world }` entry); never backwards. */
  advanceTo(t: number): void {
    if (!this.enabled) return;
    while (this.now() < t) this.step();
  }

  /** Time let pass, as an input of its own (`{ world: t }`): the clock run to tick `t`. */
  pass(t: number): void {
    this.eng.begin({ world: t });
    try {
      this.advanceTo(t);
    } finally {
      this.eng.end();
    }
  }

  /**
   * Lets the world run until route `id` reaches its next stop: a step done, held at a closed exit, or its character in
   * another room (the solver's "Route" choice, a test's turn). Recorded as one `{ world }` entry. True if it moved.
   */
  untilStop(id: Id): boolean {
    const def = this.def(id);
    const st = this.eng.scriptState(id);
    const key = () =>
      `${st.pc}|${st.done}|${st.route?.blocked}|${st.route?.pending}|${this.eng.state.where?.[def.route.who]}`;
    const was = key();
    const t0 = this.now();
    const entry: SessionEntry = { world: t0 };
    this.eng.begin(entry);
    try {
      for (let i = 0; i < STOP_GUARD && key() === was && this.live(def); i++) this.step();
      entry.world = this.now();
    } finally {
      this.eng.end();
    }
    return this.now() > t0;
  }

  /** Whether a route can move at all now: begun or able to begin, not stopped, done, suspended or held. */
  live(def: RouteScriptDef): boolean {
    const st = this.eng.state.scripts?.[def.id];
    if (st?.off || st?.done || st?.paused || st?.route?.pending) return false;
    if ([...this.holds.values()].includes(def.id)) return false;
    if (def.manual && !st?.route) return false;
    return !def.while || this.eng.cond(def.while, this.eng.state.where?.[def.route.who]);
  }

  private step(): void {
    const s = this.eng.state;
    s.world = (s.world ?? 0) + 1;
    for (const def of this.routes) if (this.live(def)) this.move(def, WORLD_TICK_MS);
  }

  // ------------------------------------------------------------------ one route, one tick
  private move(def: RouteScriptDef, ms: number): void {
    const eng = this.eng;
    const st = eng.scriptState(def.id);
    const p: RouteProgress = (st.route ??= {});
    const who = def.route.who;
    const room = eng.state.where?.[who];
    if (!p.on) {
      // An automatic route begins once its character stands in its first room.
      if (room !== def.route.from) return;
      p.on = true;
    }
    eng.writes?.add(`script:${def.id}`);
    const step = def.route.steps[st.pc];
    if (!step) return this.wrap(def);
    if (room === undefined) return;
    if (p.wait !== undefined) {
      // A wait step's time, or a walk link being crossed.
      p.wait -= ms;
      if (p.wait > 0) return;
      delete p.wait;
      if ('wait' in step) return this.done(def, step);
    }
    if ('wait' in step) {
      p.wait = step.wait - ms;
      const at = this.at(who, room);
      if (step.face || step.pose) {
        const k = this.key(who, room);
        if (k)
          eng.state.actors[k] = {
            ...eng.state.actors[k],
            ...(step.face ? { facing: step.face } : {}),
            ...(step.pose ? { pose: step.pose } : {}),
          };
      }
      if (at)
        this.tell({
          kind: 'moved',
          char: who,
          room,
          actor: this.inst(who, room)!,
          at,
          walking: false,
          ...this.facing(who, room),
        });
      if (p.wait <= 0) {
        delete p.wait;
        this.done(def, step);
      }
      return;
    }
    const target = 'walk' in step ? eng.layout(room).points?.[step.walk] : eng.approach(step.exit, eng.room(room));
    if (!target) {
      // validate refuses it; a game that ships anyway skips the step rather than walk nowhere for ever.
      eng.onError(new Error(`route ${def.id}: step ${step.id} has no point in ${room}`), `route ${def.id}`);
      return this.done(def, step);
    }
    if (this.walk(def, room, target, ms) && 'exit' in step) this.cross(def, step, room);
    else if ('walk' in step && this.arrived(who, room, target)) this.done(def, step);
  }

  /** Walks one tick toward `target`; true once there. A closed walk link on the way holds it (`blocked`). */
  private walk(def: RouteScriptDef, room: Id, target: Point, ms: number): boolean {
    const eng = this.eng;
    const who = def.route.who;
    const key = this.key(who, room);
    const from = this.at(who, room);
    const p = eng.state.scripts![def.id]!.route!;
    if (!key || !from) return true;
    if (this.near(from, target)) return true;
    const topo = this.topology(room);
    const r = topo.route(from, target, (l) => this.open(l.id, room));
    let left = (WALK_SPEED * ms) / 1000;
    let at = from;
    let facing = eng.state.actors[key]?.facing;
    for (const s of r.steps) {
      if (s.via) {
        // A walk link (stairs, a ladder): across it, then its time as a wait (shown as a jump).
        at = s.to;
        p.wait = s.via.ms ?? 0;
        break;
      }
      const dx = s.to[0] - at[0],
        dy = s.to[1] - at[1];
      const d = Math.hypot(dx, dy);
      if (dx) facing = dx < 0 ? 'left' : 'right';
      if (d <= left) {
        at = s.to;
        left -= d;
        continue;
      }
      at = [at[0] + (dx / d) * left, at[1] + (dy / d) * left];
      left = 0;
      break;
    }
    const stuck = !!r.blocked && this.near(at, from);
    if (stuck) p.blocked = true;
    else delete p.blocked;
    eng.state.actors[key] = { ...eng.state.actors[key], x: at[0], y: at[1], ...(facing ? { facing } : {}) };
    const there = this.near(at, target);
    this.tell({
      kind: 'moved',
      char: who,
      room,
      actor: this.inst(who, room)!,
      at,
      walking: !there && !stuck,
      ...(facing ? { facing } : {}),
    });
    return there;
  }

  /** At its exit: through it when it is open, into the room it leads to; held before it while it is closed. */
  private cross(def: RouteScriptDef, step: Extract<RouteStep, { exit: Id }>, room: Id): void {
    const eng = this.eng;
    const p = eng.state.scripts![def.id]!.route!;
    const ex = eng.room(room).exits?.[step.exit];
    if (!ex) return this.done(def, step);
    if (ex.if !== undefined && !eng.cond(ex.if, room)) {
      p.blocked = true;
      return;
    }
    delete p.blocked;
    const who = def.route.who;
    (eng.state.where ??= {})[who] = ex.to;
    eng.writes?.add(`where:${who}`);
    const L = eng.layout(ex.to);
    const e = ex.entry ?? room;
    const at = Array.isArray(e) ? e : (L.entries?.[e] ?? L.entries?.default);
    const k = this.key(who, ex.to);
    if (k) {
      const o = { ...eng.state.actors[k] };
      delete o.visible;
      eng.state.actors[k] = at ? { ...o, x: at[0], y: at[1] } : o;
    }
    eng.log('actor', `${who} → ${ex.to} (route ${def.id})`);
    const pos = at ?? this.at(who, ex.to);
    if (pos) this.tell({ kind: 'crossed', char: who, from: room, to: ex.to, at: pos });
    this.done(def, step);
  }

  /** A step done: the next one, and its arrival commands queued (the route waits for them). */
  private done(def: RouteScriptDef, step: RouteStep): void {
    const st = this.eng.scriptState(def.id);
    const p = (st.route ??= {});
    delete p.wait;
    delete p.blocked;
    st.pc++;
    st.step = def.stepIds?.[st.pc];
    if (step.do?.length) p.pending = step.id;
    if (st.pc >= def.route.steps.length) this.wrap(def);
  }

  /** After the last step: again from the first (a loop), else done. */
  private wrap(def: RouteScriptDef): void {
    const st = this.eng.scriptState(def.id);
    if (!def.loop) {
      st.done = true;
      return;
    }
    st.pc = 0;
    st.step = def.stepIds?.[0];
  }

  // ------------------------------------------------------------------ the arrival commands
  /** A route whose arrival commands wait, in the routes' order (null: none). */
  nextPending(): Id | null {
    if (!this.enabled || !this.eng.state) return null;
    return this.routes.find((d) => this.eng.state.scripts?.[d.id]?.route?.pending)?.id ?? null;
  }

  /**
   * Runs the arrival commands that wait, one route's at a time, each as its own input (`{ routeDo }`), never during
   * another run: the player's action, a cutscene, a conversation. The player's app calls it when the engine is idle.
   */
  async drain(): Promise<void> {
    for (let id = this.nextPending(); id && !this.eng.busy && !this.eng.busyState.count; id = this.nextPending())
      await this.runDo(id);
  }

  /** Runs one route's pending arrival commands (`{ routeDo }`; a replay calls it for each recorded one). */
  async runDo(id: Id): Promise<void> {
    const eng = this.eng;
    const def = this.def(id);
    eng.begin({ routeDo: id });
    try {
      // After `begin`: a replay first runs the world to the tick the commands were run at.
      const st = eng.scriptState(id);
      const step = def.route.steps.find((x) => x.id === st.route?.pending);
      if (st.route) delete st.route.pending;
      eng.writes?.add(`script:${id}`);
      if (!step?.do) return;
      eng.ran(`script:${id}`);
      const room = eng.room(eng.state.where?.[def.route.who] ?? eng.state.room);
      await eng.run(() => eng.exec(step.do, { room, fast: false }));
    } finally {
      eng.end();
    }
  }

  // ------------------------------------------------------------------ the scenario's commands
  /** `startScript` of a route: from its first step, when its character is in its first room. */
  start(id: Id): void {
    const def = this.def(id);
    for (const other of this.routes)
      if (other.id !== id && other.route.who === def.route.who && this.running(other.id)) this.suspend(other.id);
    const s = this.eng.state;
    (s.scripts ??= {})[id] = { pc: 0, ...(def.stepIds?.[0] ? { step: def.stepIds[0] } : {}), route: {} };
    if (s.where?.[def.route.who] !== def.route.from) this.refuse(def, 'start', def.route.from);
  }

  /** `suspendScript`: kept where it is, its wait left and its step, for `resumeScript`. */
  suspend(id: Id): void {
    this.eng.scriptState(id).paused = true;
  }

  /** `resumeScript` of a route: only when its character is in the room of its current step. */
  resume(id: Id): void {
    const def = this.def(id);
    const st = this.eng.scriptState(id);
    const want = this.roomOf(def, st.pc);
    const here = this.eng.state.where?.[def.route.who];
    if (st.route?.on && here !== want) return this.refuse(def, 'resume', want);
    for (const other of this.routes)
      if (other.id !== id && other.route.who === def.route.who && this.running(other.id)) this.suspend(other.id);
    delete st.paused;
  }

  /** The room a route's step `pc` is walked in: its first room, then where each `exit` before it leads. */
  roomOf(def: RouteScriptDef, pc: number): Id {
    let room = def.route.from;
    for (const step of def.route.steps.slice(0, pc))
      if ('exit' in step) room = this.eng.room(room).exits?.[step.exit]?.to ?? room;
    return room;
  }

  private running(id: Id): boolean {
    const st = this.eng.state.scripts?.[id];
    const def = this.def(id);
    return !st?.off && !st?.done && !st?.paused && (!def.manual || !!st?.route);
  }

  private refuse(def: RouteScriptDef, what: 'start' | 'resume', want: Id): void {
    const st = this.eng.scriptState(def.id);
    st.paused = true;
    const here = this.eng.state.where?.[def.route.who] ?? '?';
    const msg = `route-resume-misplaced: ${what} of route "${def.id}" needs ${def.route.who} in ${want}, not ${here}`;
    this.diagnostics.push(msg);
    this.eng.onError(new Error(msg), `route ${def.id}`);
  }

  // ------------------------------------------------------------------ the session: holds and sync points
  /** An entry opens: the player's action on a character holds that character's route until it ends. */
  onBegin(entry: SessionEntry): void {
    if (!this.enabled || !('act' in entry)) return;
    const eng = this.eng;
    const target = entry.act.b ?? entry.act.a;
    const actor = eng.room().actors?.[target];
    if (!actor) return;
    const def = this.routes.find((d) => d.route.who === actor.char && this.running(d.id));
    if (def && eng.state.where?.[actor.char] === eng.state.room) {
      this.holds.set(entry, def.id);
      const at = this.at(actor.char, eng.state.room);
      if (at)
        this.tell({
          kind: 'moved',
          char: actor.char,
          room: eng.state.room,
          actor: target,
          at,
          walking: false,
          ...this.facing(actor.char, eng.state.room),
        });
    }
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
      if (t !== undefined) this.advanceTo(t);
    }
    (o.entry.wt ??= []).push(this.now());
  }

  // ------------------------------------------------------------------ helpers
  private def(id: Id): RouteScriptDef {
    const d = this.routes.find((x) => x.id === id);
    if (!d) throw new Error(`unknown route: ${id}`);
    return d;
  }
  private inst(char: Id, room: Id): Id | undefined {
    return this.eng.instanceOf(char, this.eng.room(room));
  }
  private key(char: Id, room: Id): string | undefined {
    const i = this.inst(char, room);
    return i ? roomKey(room, i) : undefined;
  }
  /** Where a character stands in a room: its saved position, else its layout's. */
  at(char: Id, room: Id): Point | undefined {
    const i = this.inst(char, room);
    if (!i) return undefined;
    const o = this.eng.state.actors[roomKey(room, i)];
    const a = this.eng.layout(room).actors?.[i];
    const x = o?.x ?? a?.x,
      y = o?.y ?? a?.y;
    return x === undefined || y === undefined ? undefined : [x, y];
  }
  private facing(char: Id, room: Id): { facing?: 'left' | 'right' } {
    const k = this.key(char, room);
    const f = k ? this.eng.state.actors[k]?.facing : undefined;
    return f ? { facing: f } : {};
  }
  private arrived(char: Id, room: Id, target: Point): boolean {
    const at = this.at(char, room);
    return !at || this.near(at, target);
  }
  private near(a: Point, b: Point): boolean {
    return Math.hypot(a[0] - b[0], a[1] - b[1]) <= ARRIVED;
  }
  private open(link: Id, room: Id): boolean {
    const c = this.eng.room(room).stage?.links?.[link]?.if;
    return c === undefined || this.eng.cond(c, room);
  }
  private topology(room: Id): WalkTopology {
    let t = this.topologies.get(room);
    if (!t) {
      t = new WalkTopology(this.eng.layout(room), this.eng.room(room));
      this.topologies.set(room, t);
    }
    return t;
  }
  private tell(e: WorldEvent): void {
    for (const l of this.listeners) l(e);
  }
}
