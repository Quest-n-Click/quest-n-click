// The solver and routes (4.6.0, G11): letting time pass until a route's next stop is a choice; the proof is of the
// stops (where the characters are, which step they are at), never of the timing.
import { describe, expect, it } from 'vitest';
import type { GameDef, RouteScriptDef } from '@engine/core/types';
import { solve } from '@engine/tools/solve';
import { lintContent } from '@engine/tools/lint';
import { replay } from '@engine/tools/replay';
import { routesGame, routesLayouts } from './fixtures/routes';

/** The guard starts in the shed, by the crate: the key can only be taken once his round has taken him out. */
const guarded = (): GameDef => {
  const g = routesGame();
  g.characters.guard!.room = 'shed';
  const r = g.scripts!.find((s) => s.id === 'rounds') as RouteScriptDef;
  r.route.from = 'shed';
  r.route.steps = [...r.route.steps.slice(3), ...r.route.steps.slice(0, 3)];
  return g;
};

describe('the solver and routes', () => {
  it('waits for the guard to leave the shed, then takes the key (G11)', async () => {
    const r = await solve(guarded(), routesLayouts, { maxStates: 5000 });
    expect(r.errors).toEqual([]);
    expect(r.finished).toBe(true);
    expect(r.path.some((s) => s === 'Route rounds')).toBe(true);
    // Its witness is a session: it replays, the world's ticks included.
    const rep = await replay(guarded(), routesLayouts, { log: r.steps, start: { kind: 'new' } } as never);
    expect(rep.divergedAt).toBeUndefined();
    expect(rep.ended).toBe(true);
  });

  it('proves the occasion stays open: no softlock however the rounds and the player interleave (G11)', async () => {
    const r = await solve(guarded(), routesLayouts, { mode: 'prove', maxStates: 20000 });
    expect(r.status).toBe('solved');
    expect(r.mode).toBe('prove');
    expect(r.softlockCount).toBe(0);
  });

  it('says a resume away from the route’s room, with the way there', async () => {
    const g = guarded();
    g.rooms[0]!.on = [
      {
        id: 'push',
        verb: 'use',
        a: 'door',
        do: [{ suspendScript: 'rounds' }, { moveActor: ['guard', 'yard'] }, { resumeScript: 'rounds' }],
      },
    ];
    const r = await solve(g, routesLayouts, { maxStates: 5000 });
    expect(r.errors.join('\n')).toMatch(/route-resume-misplaced/);
    const l = lintContent(g, routesLayouts, { solve: r });
    expect(l.findings.map((f) => f.code)).toEqual(
      expect.arrayContaining(['route-resume-misplaced', 'route-script-conflict']),
    );
  });
});
