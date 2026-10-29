// validate's checks of routes (4.6.0): what each step names exists in the room it is walked in, a loop comes back and
// makes progress, one automatic route per character, a route lives in the game's scripts.
import { describe, expect, it } from 'vitest';
import type { GameDef, RouteScriptDef } from '@engine/core/types';
import { validate } from '@engine/tools/validate';
import { routesGame, routesLayouts } from './fixtures/routes';

const routeErrors = (g: GameDef) =>
  validate(g, routesLayouts).errors.filter((e) => /route|step|point|exit|actor/.test(e));
const rounds = (g: GameDef) => g.scripts!.find((s) => s.id === 'rounds') as RouteScriptDef;

describe('validate and routes', () => {
  it('accepts the fixture', () => {
    expect(routeErrors(routesGame())).toEqual([]);
  });

  it('refuses a missing point, exit or actor, in the room the step is walked in', () => {
    const g = routesGame();
    rounds(g).route.steps.push({ id: 'nowhere', walk: 'post' }); // after `out`, back in the yard: fine
    rounds(g).route.steps.splice(3, 0, { id: 'lost', walk: 'post' }); // in the shed: no point "post" there
    rounds(g).route.steps.splice(1, 0, { id: 'gone', exit: 'window' });
    g.rooms[1]!.actors = {};
    const e = routeErrors(g).join('\n');
    expect(e).toMatch(/no point "post" in the layout of "shed"/);
    expect(e).toMatch(/no exit "window" in room "yard"/);
    expect(e).toMatch(/guard has no actor in room "shed"/);
    expect(e).not.toMatch(/steps\[8\]/); // `nowhere`, back in the yard after `out`
  });

  it('refuses a loop that does not come back, or never makes progress', () => {
    const g = routesGame();
    rounds(g).route.steps.pop();
    const p = g.scripts!.find((s) => s.id === 'pace') as RouteScriptDef;
    p.route.steps = [
      { id: 'a', walk: 'west' },
      { id: 'b', walk: 'west' },
    ];
    const e = routeErrors(g).join('\n');
    expect(e).toMatch(/loop route "rounds" ends in "shed", not in "yard"/);
    expect(e).toMatch(/loop route "pace" never makes progress/);
  });

  it('refuses two automatic routes for one character, duplicate step ids, a step of two kinds', () => {
    const g = routesGame();
    const d = g.scripts!.find((s) => s.id === 'detour') as RouteScriptDef;
    delete d.manual;
    rounds(g).route.steps[1] = { id: 'post', wait: 10 };
    (rounds(g).route.steps[0] as Record<string, unknown>).wait = 5;
    const e = routeErrors(g).join('\n');
    expect(e).toMatch(/two automatic routes for guard \("rounds" and "detour"\)/);
    expect(e).toMatch(/duplicate step id "post"/);
    expect(e).toMatch(/exactly one of "walk", "wait" or "exit"/);
  });

  it('refuses a route among a room’s scripts, a character that does not move, an unknown script to resume', () => {
    const g = routesGame();
    (g.rooms[0]!.scripts as unknown[]) = [rounds(g)];
    delete g.characters.cat!.room;
    g.rooms[0]!.onEnter = [{ resumeScript: 'nope' }];
    const r = validate(g, routesLayouts);
    const e = r.errors.join('\n');
    expect(e).toMatch(/route "rounds" belongs to the game's scripts/);
    expect(e).toMatch(/"cat" needs a "room"/);
    expect(e).toMatch(/nope/);
  });
});
