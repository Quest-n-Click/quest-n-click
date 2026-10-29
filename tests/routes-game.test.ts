// "Lou's Rounds" (games/routes, 4.6.0): the playable example of routes, as it ships, not a fixture. It validates clean
// against its own manifest; the witness finishes and replays; the proof finishes; played on the test's clock, Lou leaves
// his office, waits at the kitchen door while Grandma mops, goes through once the floor is dry, and his absence opens
// the map. Its browser playthrough: games/routes/e2e.mjs.
import { describe, expect, it } from 'vitest';
import { Engine } from '@engine/core/engine';
import { FakePresenter, MemoryStore } from '@engine/core/ports';
import { solve } from '@engine/tools/solve';
import { validate } from '@engine/tools/validate';
import { replay } from '@engine/tools/replay';
import { game, layouts, manifest } from '../games/routes';

const assets = { images: manifest.images as Record<string, [number, number]> };
const make = async () => {
  const e = new Engine(structuredClone(game), layouts, new FakePresenter(), new MemoryStore());
  await e.newGame();
  return e;
};
const lou = (e: Engine) => e.state.where!.neighbor;

describe("Lou's Rounds", () => {
  it('validates clean, with no error and no route warning', () => {
    const r = validate(structuredClone(game), layouts, { assets });
    expect(r.errors).toEqual([]);
    expect(r.warnings.filter((w) => /route|point/.test(w))).toEqual([]);
  });

  it('is finished by the solver, whose witness replays, and proved', async () => {
    const w = await solve(structuredClone(game), layouts, { maxStates: 5000 });
    expect(w.finished).toBe(true);
    const rep = await replay(structuredClone(game), layouts, { log: w.steps, start: { kind: 'new' } } as never);
    expect(rep.divergedAt).toBeUndefined();
    expect(rep.ended).toBe(true);
    const p = await solve(structuredClone(game), layouts, { mode: 'prove', maxStates: 20000 });
    expect(p.status).toBe('solved');
    expect(p.softlockCount).toBe(0);
  });

  it('Lou guards his map, then leaves it on his rounds', async () => {
    const e = await make();
    await e.enter('hall', undefined, false);
    await e.act({ verb: 'take', a: 'map' });
    expect(e.state.inventory).not.toContain('cable');
    for (let i = 0; i < 400 && lou(e) === 'hall'; i++) e.world.tick(1);
    expect(lou(e)).toBe('street');
    await e.act({ verb: 'take', a: 'map' });
    expect(e.state.inventory).toContain('cable');
  });

  it('waits at the kitchen door while Grandma mops, and goes in once it is dry', async () => {
    const e = await make();
    await e.script([{ suspendScript: 'chores' }, { set: 'mopping' }]);
    for (let i = 0; i < 1000 && !e.scriptState('rounds').route?.blocked; i++) e.world.tick(1);
    expect(e.scriptState('rounds').route?.blocked).toBe(true);
    expect(lou(e)).toBe('street');
    e.world.tick(100);
    expect(lou(e)).toBe('street');
    await e.script([{ unset: 'mopping' }]);
    e.world.tick(1);
    expect(lou(e)).toBe('kitchen');
  });

  it('goes back to his rounds after the detour to the stalls', async () => {
    const e = await make();
    for (let i = 0; i < 400 && lou(e) !== 'street'; i++) e.world.tick(1);
    await e.script([{ startScript: 'stalls' }]);
    expect(e.scriptState('rounds').paused).toBe(true);
    // Grandma's chores have arrival commands too: drained as they come, until Lou's detour is over.
    for (let i = 0; i < 600 && !e.scriptState('stalls').done; i++) {
      e.world.tick(1);
      await e.world.drain();
    }
    await e.world.drain();
    expect(e.scriptState('rounds').paused).toBeUndefined();
    expect(e.scriptState('stalls').done).toBe(true);
    expect(e.world.diagnostics).toEqual([]);
  });
});
