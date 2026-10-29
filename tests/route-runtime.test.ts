// Routes (4.6.0 "Routes", ADR 0031): a character walks its steps through rooms on the world's clock, shown or not; the
// player's click holds it, a closed exit holds it, the scenario suspends and resumes it; a save and a replay give the
// same world. The clock here is the test's: `world.tick(n)`, never a timer.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { Engine } from '@engine/core/engine';
import { FakePresenter, MemoryStore } from '@engine/core/ports';
import { stateDigest } from '@engine/core/diff';
import { WORLD_TICK_MS } from '@engine/core/timing';
import type { Point } from '@engine/core/types';
import { replay } from '@engine/tools/replay';
import { compileGame } from '@engine/core/define';
import { parseSave, saveEnvelope } from '@engine/core/save';
import { routesGame, routesLayouts } from './fixtures/routes';

/** A presenter whose waits let the world's clock run, as the player's frames do while a line is said or a walk lasts. */
class TickingPresenter extends FakePresenter {
  eng: Engine | null = null;
  perAwait = 7;
  override async walk(who: string, to: Point) {
    this.eng?.world.tick(this.perAwait);
    return super.walk(who, to);
  }
  override async say(who: string, text: string, o?: { voice?: string }) {
    this.eng?.world.tick(this.perAwait);
    return super.say(who, text, o);
  }
}

const make = async (ui: FakePresenter = new FakePresenter()) => {
  const store = new MemoryStore();
  const e = new Engine(routesGame(), routesLayouts, ui, store);
  if (ui instanceof TickingPresenter) ui.eng = e;
  e.onError = () => {};
  await e.newGame();
  return { e, store };
};
const guardAt = (e: Engine) => {
  const room = e.state.where!.guard!;
  const o = e.state.actors[`${room}.guard`];
  return { room, x: o?.x, y: o?.y };
};
/** Ticks for a walk of `d` logical units at the walking speed. */
const ticksFor = (d: number) => Math.ceil(d / ((150 * WORLD_TICK_MS) / 1000));

describe('the world clock', () => {
  it('a game without routes has no world: nothing ticks, nothing is recorded', async () => {
    const g = routesGame();
    g.scripts = [];
    const e = new Engine(g, routesLayouts, new FakePresenter(), new MemoryStore());
    await e.newGame();
    e.world.tick(100);
    expect(e.state.world).toBeUndefined();
    await e.act({ verb: 'look', a: 'guard' });
    expect(e.session!.log.some((x) => x.wt)).toBe(false);
  });

  it('n ticks at once are n single ticks (G2), whatever the split', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer({ min: 1, max: 40 }), { minLength: 1, maxLength: 12 }), async (parts) => {
        const total = parts.reduce((a, b) => a + b, 0);
        const { e: a } = await make();
        const { e: b } = await make();
        for (const n of parts) a.world.tick(n);
        b.world.tick(total);
        expect(stateDigest(a.state)).toBe(stateDigest(b.state));
        expect(a.state.world).toBe(total);
      }),
      { numRuns: 25 },
    );
  });

  it('frozen, it does not move; thawed, it goes on with no catching up (G10)', async () => {
    const { e } = await make();
    for (const r of ['menu', 'cutscene', 'minigame', 'transition', 'hidden'] as const) {
      e.world.freeze(r);
      const before = stateDigest(e.state);
      e.world.tick(50);
      expect(stateDigest(e.state)).toBe(before);
      expect(e.world.reasons).toEqual([r]);
      e.world.thaw(r);
    }
    expect(e.world.frozen).toBe(false);
    e.world.tick(1);
    expect(e.state.world).toBe(1);
  });
});

describe('a route', () => {
  it('walks to its point, waits, goes through the exit into the next room, off screen (G3)', async () => {
    const { e } = await make();
    e.world.tick(ticksFor(300));
    expect(guardAt(e)).toEqual({ room: 'yard', x: 400, y: 300 });
    expect(e.scriptState('rounds').step).toBe('watch');
    e.world.tick(1000 / WORLD_TICK_MS);
    expect(e.state.actors['yard.guard']?.facing).toBe('left');
    expect(e.scriptState('rounds').step).toBe('in');
    for (let i = 0; i < 100 && guardAt(e).room === 'yard'; i++) e.world.tick(1);
    expect(guardAt(e).room).toBe('shed');
    expect(guardAt(e)).toMatchObject({ x: 80, y: 320 });
    expect(e.visible('guard', e.room('yard'))).toBe(false);
  });

  it('progress is the same whether its room is shown or not (G3)', async () => {
    const { e: shown } = await make();
    const { e: away } = await make();
    await away.teleport('shed');
    shown.world.tick(200);
    away.world.tick(200);
    expect(guardAt(away)).toEqual(guardAt(shown));
    expect(away.scriptState('rounds')).toEqual(shown.scriptState('rounds'));
  });

  it('a closed exit holds it before the door; it goes through the tick after it opens (G5)', async () => {
    const { e } = await make();
    e.state.flags.door_locked = true;
    e.world.tick(400);
    expect(guardAt(e)).toMatchObject({ room: 'yard', x: 590, y: 300 });
    expect(e.scriptState('rounds').route?.blocked).toBe(true);
    delete e.state.flags.door_locked;
    e.world.tick(1);
    expect(guardAt(e).room).toBe('shed');
    expect(e.scriptState('rounds').route?.blocked).toBeUndefined();
  });

  it('its arrival commands wait for the engine to be idle, then run one at a time as their own input (G7)', async () => {
    const { e } = await make();
    while (e.world.nextPending() === null) e.world.tick(1);
    expect(e.scriptState('rounds').route?.pending).toBe('check');
    const pc = e.scriptState('rounds').pc;
    e.world.tick(100);
    expect(e.scriptState('rounds').pc).toBe(pc); // it waits for its commands
    e.busyState.enter();
    await e.world.drain();
    expect(e.state.flags.checks).toBeUndefined(); // never during another run
    e.busyState.leave();
    await e.world.drain();
    expect(e.state.flags.checks).toBe(1);
    expect(e.session!.log.at(-1)).toMatchObject({ routeDo: 'rounds' });
    e.world.tick(1);
    expect(e.scriptState('rounds').pc).toBe(pc);
    expect(e.world.nextPending()).toBeNull();
  });

  it('suspended, it keeps its step, position and wait left; resumed, it goes on from there (G6)', async () => {
    const { e } = await make();
    e.world.tick(ticksFor(300) + 4);
    const left = e.scriptState('rounds').route?.wait;
    expect(left).toBeGreaterThan(0);
    await e.script([{ suspendScript: 'rounds' }]);
    e.world.tick(200);
    expect(e.scriptState('rounds').route?.wait).toBe(left);
    expect(guardAt(e)).toMatchObject({ x: 400, y: 300 });
    await e.script([{ resumeScript: 'rounds' }]);
    e.world.tick(1);
    expect(e.scriptState('rounds').route?.wait).toBe(left! - WORLD_TICK_MS);
  });

  it('a detour suspends the route; resuming it away from its room is refused and said (G6)', async () => {
    const { e } = await make();
    e.world.tick(ticksFor(300) + 2);
    await e.script([{ startScript: 'detour' }]);
    expect(e.scriptState('rounds').paused).toBe(true);
    e.world.tick(200);
    expect(guardAt(e)).toMatchObject({ x: 40, y: 300 });
    expect(e.scriptState('detour').done).toBe(true);
    // Back in the yard: the resume is accepted.
    await e.script([{ resumeScript: 'rounds' }]);
    expect(e.scriptState('rounds').paused).toBeUndefined();
    // Moved away by the scenario: refused, kept suspended, said.
    await e.script([{ suspendScript: 'rounds' }, { moveActor: ['guard', 'shed'] }, { resumeScript: 'rounds' }]);
    expect(e.scriptState('rounds').paused).toBe(true);
    expect(e.world.diagnostics.at(-1)).toMatch(/route-resume-misplaced: resume of route "rounds" needs guard in yard/);
  });

  it('two characters walk at once, one route each', async () => {
    const { e } = await make();
    e.world.tick(10);
    expect(e.state.actors['yard.cat']?.x).toBeLessThan(200);
    expect(e.state.actors['yard.guard']?.x).toBeGreaterThan(100);
  });
});

describe('the player and a route', () => {
  it('a click on the character holds it from the click to the end of the action; the others go on (G4)', async () => {
    const ui = new TickingPresenter();
    const { e } = await make(ui);
    e.world.tick(5);
    const g0 = guardAt(e);
    const cat0 = e.state.actors['yard.cat']?.x;
    await e.act({ verb: 'look', a: 'guard' });
    expect(guardAt(e)).toEqual(g0);
    expect(e.state.actors['yard.cat']?.x).not.toBe(cat0);
    e.world.tick(1);
    expect(guardAt(e).x).toBeGreaterThan(g0.x!);
  });

  it('the hero walks to where the character stands now', async () => {
    const { e } = await make();
    e.world.tick(10);
    const at = guardAt(e);
    const ap = e.approach('guard')!;
    expect(Math.abs(ap[1] - at.y!)).toBeLessThan(1);
    expect(Math.abs(ap[0] - at.x!)).toBeLessThan(100);
  });
});

describe('saves and replays', () => {
  for (const [what, ticks] of [
    ['in the middle of a walk', 10],
    ['in the middle of a wait', ticksFor(300) + 5],
    ['held at a closed exit', 400],
  ] as const)
    it(`saved and loaded ${what}, it goes on as if nothing happened (G8)`, async () => {
      const { e: a, store } = await make();
      if (what.startsWith('held')) a.state.flags.door_locked = true;
      a.world.tick(ticks);
      a.save();
      const b = new Engine(routesGame(), routesLayouts, new FakePresenter(), store);
      await b.continueGame();
      // The load enters the room again (`visited`); the world is what was saved.
      const world = (e: Engine) => ({ w: e.state.world, s: e.state.scripts, a: e.state.actors, where: e.state.where });
      expect(world(b)).toEqual(world(a));
      a.world.tick(300);
      b.world.tick(300);
      expect(world(b)).toEqual(world(a));
    });

  it('a session whose actions overlap the clock replays to the same state (G9)', async () => {
    const ui = new TickingPresenter();
    const { e } = await make(ui);
    e.digestOn = true;
    e.world.tick(3);
    await e.act({ verb: 'look', a: 'cat' });
    e.world.tick(30);
    await e.act({ verb: 'talk', a: 'guard' });
    e.world.tick(ticksFor(300) + 60);
    await e.world.drain();
    await e.act({ verb: 'look', a: 'guard' });
    const r = await replay(routesGame(), routesLayouts, e.session!);
    expect(r.divergedAt).toBeUndefined();
    expect(stateDigest(r.state)).toBe(stateDigest(e.state));
  });

  it('a save made before routes loads, and the routes begin from it; a step that disappeared is dropped (G8)', async () => {
    const { e } = await make();
    const old = structuredClone(e.state);
    delete old.world;
    old.scripts = {};
    const g = compileGame(routesGame());
    const warns: string[] = [];
    const loaded = parseSave(g, saveEnvelope(g, old), { warn: (m) => warns.push(m) });
    expect(warns).toEqual([]);
    const b = new Engine(routesGame(), routesLayouts, new FakePresenter(), new MemoryStore());
    await b.load(loaded);
    b.world.tick(5);
    expect(b.state.world).toBe(5);
    expect(b.state.actors['yard.guard']?.x).toBeGreaterThan(100);
    const gone = structuredClone(b.state);
    gone.scripts!.rounds = { pc: 9, step: 'gone', route: { on: true } };
    const fixed = parseSave(g, saveEnvelope(g, gone), { warn: (m) => warns.push(m) });
    expect(fixed.scripts?.rounds).toBeUndefined();
    // A v2-like state without a step id: past the route's steps, dropped too; within them, kept.
    const far = structuredClone(b.state);
    far.scripts!.rounds = { pc: 99, route: { on: true } };
    far.scripts!.pace = { pc: 1, route: { on: true } };
    const kept = parseSave(g, saveEnvelope(g, far), { warn: () => {} });
    expect(kept.scripts?.rounds).toBeUndefined();
    expect(kept.scripts?.pace).toMatchObject({ pc: 1 });
    expect(warns.join()).toMatch(/state.scripts/);
  });
});
