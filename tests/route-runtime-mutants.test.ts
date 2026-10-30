// The routes set's survivors, read one by one (4.6.0, tools/mutation-sets.ts `routes`): each test below pins a
// behaviour of core/route-runtime.ts that the broader route tests left free. What no test can tell apart is named in
// docs/dev/mutants.json.
import { describe, expect, it } from 'vitest';
import { Engine } from '@engine/core/engine';
import { FakePresenter, MemoryStore } from '@engine/core/ports';
import type { WorldEvent } from '@engine/core/world';
import { WORLD_TICK_MS } from '@engine/core/timing';
import type { GameDef, Layout, RouteScriptDef } from '@engine/core/types';
import { replay } from '@engine/tools/replay';
import { routesGame, routesLayouts } from './fixtures/routes';

const route = (g: GameDef, id: string) => g.scripts!.find((s) => s.id === id) as RouteScriptDef;
const make = async (g = routesGame(), layouts: Record<string, Layout> = routesLayouts) => {
  const e = new Engine(g, layouts, new FakePresenter(), new MemoryStore());
  e.onError = () => {};
  await e.newGame();
  const events: WorldEvent[] = [];
  e.world.listeners.add((x) => events.push(x));
  return { e, events };
};
/** Only the guard on a route: the cat and the detour left out. */
const guardOnly = (edit?: (r: RouteScriptDef, g: GameDef) => void) => {
  const g = routesGame();
  g.scripts = g.scripts!.filter((s) => s.id === 'rounds');
  edit?.(route(g, 'rounds'), g);
  return g;
};
const guard = (e: Engine) => e.state.actors[`${e.state.where!.guard}.guard`];

describe('the clock', () => {
  it('does not tick a finished game, nor run a game without routes to a tick', async () => {
    const { e } = await make();
    e.state.done = true;
    e.world.tick(5);
    expect(e.state.world).toBeUndefined();
    const g = routesGame();
    g.scripts = [];
    const { e: none } = await make(g);
    none.world.advanceTo(10);
    expect(none.state.world).toBeUndefined();
    expect(none.world.nextPending()).toBeNull();
  });

  it('untilStop says whether time passed: not for a route that cannot move', async () => {
    const { e } = await make(guardOnly());
    await e.script([{ suspendScript: 'rounds' }]);
    expect(e.world.runtime.untilStop('rounds')).toBe(false);
    await e.script([{ resumeScript: 'rounds' }]);
    expect(e.world.runtime.untilStop('rounds')).toBe(true);
    expect(e.session!.log.at(-1)).toMatchObject({ world: e.state.world });
  });

  it('a route is held by each of: stopped, done, suspended, pending commands, a false `while`', async () => {
    for (const set of [
      (e: Engine) => (e.scriptState('rounds').off = true),
      (e: Engine) => (e.scriptState('rounds').done = true),
      (e: Engine) => (e.scriptState('rounds').paused = true),
      (e: Engine) => ((e.scriptState('rounds').route ??= {}).pending = 'post'),
    ]) {
      const { e } = await make(guardOnly());
      set(e);
      e.world.tick(10);
      expect(guard(e)?.x).toBeUndefined();
    }
    const { e } = await make(guardOnly((r) => (r.while = 'walking')));
    e.world.tick(10);
    expect(guard(e)?.x).toBeUndefined();
    e.state.flags.walking = true;
    e.world.tick(10);
    expect(guard(e)?.x).toBeGreaterThan(100);
  });

  it('an automatic route begins only once its character stands in its first room', async () => {
    const { e } = await make(guardOnly());
    e.state.where!.guard = 'shed';
    e.world.tick(10);
    expect(e.scriptState('rounds').route?.on).toBeUndefined();
    expect(e.state.actors['shed.guard']?.x).toBeUndefined();
    e.state.where!.guard = 'yard';
    e.world.tick(1);
    expect(e.scriptState('rounds').route?.on).toBe(true);
  });

  it('a step past the last one wraps a loop to its first step', async () => {
    const { e } = await make(guardOnly());
    e.world.tick(1);
    e.scriptState('rounds').pc = route(routesGame(), 'rounds').route.steps.length;
    e.world.tick(1);
    expect(e.scriptState('rounds').pc).toBe(0);
  });
});

describe('a wait', () => {
  it('turns and poses the character, says so to the view, and lasts exactly its ticks', async () => {
    const { e, events } = await make(
      guardOnly((r) => {
        r.route.steps = [
          { id: 'stand', wait: 3 * WORLD_TICK_MS, face: 'right', pose: 'front' },
          { id: 'go', walk: 'post' },
        ];
      }),
    );
    e.world.tick(1);
    expect(e.state.actors['yard.guard']).toMatchObject({ facing: 'right', pose: 'front' });
    expect(events.at(-1)).toEqual({
      kind: 'moved',
      char: 'guard',
      room: 'yard',
      actor: 'guard',
      at: [100, 300],
      walking: false,
      facing: 'right',
    });
    e.world.tick(1);
    expect(e.scriptState('rounds').step).toBe('stand');
    e.world.tick(1);
    expect(e.scriptState('rounds').step).toBe('go');
  });

  it('without face or pose leaves the character as it was; a wait of 0 is done in its tick', async () => {
    const { e } = await make(
      guardOnly((r) => {
        r.route.steps = [
          { id: 'blink', wait: 0 },
          { id: 'go', walk: 'post' },
        ];
      }),
    );
    e.world.tick(1);
    expect(e.state.actors['yard.guard']).toBeUndefined();
    expect(e.scriptState('rounds').step).toBe('go');
  });

  it('a pose alone is kept, without a facing', async () => {
    const { e } = await make(
      guardOnly(
        (r) =>
          (r.route.steps = [
            { id: 'sit', wait: 500, pose: 'sit' },
            { id: 'go', walk: 'post' },
          ]),
      ),
    );
    e.world.tick(1);
    expect(e.state.actors['yard.guard']).toEqual({ pose: 'sit' });
  });
});

describe('a walk', () => {
  it('faces where it goes, says it walks, then that it stands', async () => {
    const { e, events } = await make(guardOnly());
    e.world.tick(1);
    expect(events.at(-1)).toMatchObject({ kind: 'moved', walking: true, facing: 'right' });
    expect(e.state.actors['yard.guard']?.facing).toBe('right');
    e.world.tick(39);
    expect(events.at(-1)).toMatchObject({ walking: false, at: [400, 300] });
    const g = guardOnly(
      (r) =>
        (r.route.steps = [
          { id: 'back', walk: 'gate' },
          { id: 'wait', wait: 50 },
        ]),
    );
    const { e: w, events: ev } = await make(g);
    w.world.tick(1);
    expect(ev.at(-1)).toMatchObject({ facing: 'left' });
    expect(w.state.actors['yard.guard']?.facing).toBe('left');
  });

  it('straight up keeps the facing it had', async () => {
    const L = structuredClone(routesLayouts);
    L.yard!.points!.up = [100, 260];
    const { e, events } = await make(
      guardOnly(
        (r) =>
          (r.route.steps = [
            { id: 'up', walk: 'up' },
            { id: 'w', wait: 50 },
          ]),
      ),
      L,
    );
    e.world.tick(1);
    expect(e.state.actors['yard.guard']?.facing).toBeUndefined();
    expect(events.at(-1)).not.toHaveProperty('facing');
  });

  it('a point missing from the layout is skipped and said', async () => {
    const errors: unknown[] = [];
    const g = guardOnly(
      (r) =>
        (r.route.steps = [
          { id: 'lost', walk: 'nowhere' },
          { id: 'w', wait: 500 },
        ]),
    );
    const e = new Engine(g, routesLayouts, new FakePresenter(), new MemoryStore());
    e.onError = (x) => errors.push(x);
    await e.newGame();
    e.world.tick(1);
    expect(e.scriptState('rounds').step).toBe('w');
    expect(String(errors[0])).toMatch(/route rounds: step lost has no point in yard/);
  });

  it('crosses a walk link in its time, and waits before a closed one', async () => {
    const g = guardOnly(
      (r) =>
        (r.route.steps = [
          { id: 'up', walk: 'loft' },
          { id: 'w', wait: 50 },
        ]),
    );
    g.rooms[0]!.stage = { links: { ladder: { if: 'ladder_down' } } };
    const L = structuredClone(routesLayouts);
    L.yard = {
      ...L.yard!,
      walk: undefined,
      walkZones: {
        floor: {
          area: [
            [0, 280],
            [640, 280],
            [640, 395],
            [0, 395],
          ],
        },
        loft: {
          area: [
            [0, 100],
            [640, 100],
            [640, 200],
            [0, 200],
          ],
        },
      },
      walkLinks: {
        ladder: {
          from: { zone: 'floor', at: [110, 300] },
          to: { zone: 'loft', at: [110, 150] },
          mode: 'ladder',
          ms: 100,
        },
      },
      points: { ...L.yard!.points, loft: [200, 150] },
    } as Layout;
    const { e, events } = await make(g, L);
    e.world.tick(5);
    expect(e.scriptState('rounds').route?.blocked).toBe(true);
    expect(events.at(-1)).toMatchObject({ walking: false });
    const foot = guard(e)!;
    e.world.tick(3);
    expect(guard(e)).toEqual(foot);
    e.state.flags.ladder_down = true;
    e.world.tick(1);
    expect(e.scriptState('rounds').route?.blocked).toBeUndefined();
    expect([guard(e)!.x, guard(e)!.y]).toEqual([110, 150]);
    expect(e.scriptState('rounds').route?.wait).toBe(100);
    e.world.tick(1);
    expect([guard(e)!.x, guard(e)!.y]).toEqual([110, 150]);
    e.world.tick(2);
    expect(guard(e)!.x).toBeGreaterThan(110);
  });
});

describe('an exit', () => {
  it('says the crossing to the view, at the entry; an entry given as a point is taken as written', async () => {
    const g = guardOnly();
    g.rooms[0]!.exits!.door!.entry = [222, 333] as never;
    const { e, events } = await make(g);
    e.state.actors['shed.guard'] = { visible: false };
    for (let i = 0; i < 200 && e.state.where!.guard === 'yard'; i++) e.world.tick(1);
    expect(events.find((x) => x.kind === 'crossed')).toEqual({
      kind: 'crossed',
      char: 'guard',
      from: 'yard',
      to: 'shed',
      at: [222, 333],
    });
    expect(e.state.actors['shed.guard']).toEqual({ x: 222, y: 333 });
  });

  it('an exit the room does not have is skipped', async () => {
    const { e } = await make(
      guardOnly(
        (r) =>
          (r.route.steps = [
            { id: 'gone', exit: 'window' },
            { id: 'w', wait: 500 },
          ]),
      ),
    );
    for (let i = 0; i < 100 && e.scriptState('rounds').step === 'gone'; i++) e.world.tick(1);
    expect(e.scriptState('rounds').step).toBe('w');
    expect(e.state.where!.guard).toBe('yard');
  });
});

describe('arrival commands', () => {
  it('a step without commands queues nothing; a route with nothing pending runs nothing', async () => {
    const { e } = await make(guardOnly());
    e.world.tick(60);
    expect(e.world.nextPending()).toBeNull();
    await e.world.runtime.runDo('rounds');
    expect(e.session!.log.at(-1)).toEqual(expect.objectContaining({ routeDo: 'rounds' }));
    expect(e.session!.log.at(-1)?.ran).toBeUndefined();
  });
});

describe('the scenario', () => {
  it('start: from the first step, its id; refused away from the first room', async () => {
    const { e } = await make();
    await e.script([{ startScript: 'detour' }]);
    expect(e.scriptState('detour')).toMatchObject({ pc: 0, step: 'gate' });
    await e.script([{ moveActor: ['guard', 'shed'] }, { startScript: 'detour' }]);
    expect(e.scriptState('detour').paused).toBe(true);
    expect(e.world.diagnostics.at(-1)).toMatch(/start of route "detour" needs guard in yard, not shed/);
  });

  it('resume suspends the other running route of the character, and the room of a step follows the exits', async () => {
    const { e } = await make();
    for (let i = 0; i < 400 && e.state.where!.guard !== 'shed'; i++) e.world.tick(1);
    await e.script([{ suspendScript: 'rounds' }]);
    expect(e.world.runtime.roomOf(route(routesGame(), 'rounds'), e.scriptState('rounds').pc)).toBe('shed');
    await e.script([{ moveActor: ['guard', 'yard'] }, { startScript: 'detour' }]);
    await e.script([{ moveActor: ['guard', 'shed'] }, { resumeScript: 'rounds' }]);
    expect(e.scriptState('rounds').paused).toBeUndefined();
    expect(e.scriptState('detour').paused).toBe(true);
    // A manual route never started is not running: resuming another leaves it alone.
    const { e: f } = await make();
    await f.script([{ suspendScript: 'rounds' }, { resumeScript: 'rounds' }]);
    expect(f.state.scripts!.detour).toBeUndefined();
  });
});

describe('the player and the session', () => {
  it('holds only the route of a character in the hero’s room, and says where it stands', async () => {
    const { e, events } = await make(guardOnly());
    e.world.tick(3);
    events.length = 0;
    await e.act({ verb: 'look', a: 'guard' });
    expect(events[0]).toMatchObject({ kind: 'moved', char: 'guard', actor: 'guard', walking: false, facing: 'right' });
    e.state.where!.guard = 'shed';
    events.length = 0;
    await e.act({ verb: 'look', a: 'guard' });
    expect(events).toEqual([]);
    // Another character's route is not held by a click on the cat.
    const { e: f } = await make();
    f.world.tick(3);
    const before = f.state.actors['yard.guard']?.x;
    await f.act({ verb: 'look', a: 'cat' });
    f.world.tick(1);
    expect(f.state.actors['yard.guard']?.x).toBeGreaterThan(before!);
  });

  it('a replay goes to the last recorded tick at the end of an entry; an unknown route is refused', async () => {
    const { e } = await make(guardOnly());
    e.digestOn = true;
    e.world.tick(4);
    e.world.runtime.pass(20);
    e.world.tick(2);
    await e.act({ verb: 'look', a: 'guard' });
    const r = await replay(guardOnly(), routesLayouts, e.session!);
    expect(r.divergedAt).toBeUndefined();
    expect(r.state.world).toBe(e.state.world);
    expect(() => e.world.runtime.untilStop('nope')).toThrow(/unknown route: nope/);
  });
});
