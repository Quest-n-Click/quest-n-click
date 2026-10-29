// The lint's findings about routes (4.6.0 "Routes"): a script that moves a routed character behind its route's back, a
// manual route nothing starts, an exit a route waits at that nothing can open, and what the solver saw refused (a resume
// or a start away from the route's room).
import { eachCmd, scriptLists } from '../core/cmds';
import type { CondAtom } from '../core/cond';
import type { Cond, GameDef, Id, RouteScriptDef } from '../core/types';
import type { Finding } from './lint';

export function routeFindings(
  game: GameDef,
  c: {
    unsatisfiable: (cond: Cond | undefined, room: Id | undefined) => CondAtom[];
    atomText: (a: CondAtom) => string;
    /** What the solver saw refused (`World.diagnostics`), when a search ran. */
    diagnostics?: string[];
  },
): Finding[] {
  const out: Finding[] = [];
  const routes = (game.scripts ?? []).filter((s): s is RouteScriptDef => !!s.route);
  if (!routes.length) return out;
  const routed = new Map(routes.map((r) => [r.route.who, r.id]));
  // Every command list of the game, with where it is written (the arrival lists of the routes included).
  const lists: { list: unknown[]; room?: Id; path: string }[] = [];
  for (const r of game.rooms) {
    (r.on ?? []).forEach((x, i) => lists.push({ list: x.do, room: r.id, path: `on[${i}].do` }));
    (r.events ?? []).forEach((x, i) => lists.push({ list: x.do, room: r.id, path: `events[${i}].do` }));
    (r.scripts ?? []).forEach((x) => lists.push({ list: x.do, room: r.id, path: `scripts.${x.id}.do` }));
    for (const [a, ts] of Object.entries(r.talk ?? {}))
      ts.forEach((t, i) => lists.push({ list: t.do, room: r.id, path: `talk.${a}[${i}].do` }));
    if (r.onEnter) lists.push({ list: r.onEnter, room: r.id, path: 'onEnter' });
  }
  (game.rules.on ?? []).forEach((x, i) => lists.push({ list: x.do, path: `rules.on[${i}].do` }));
  (game.events ?? []).forEach((x, i) => lists.push({ list: x.do, path: `events[${i}].do` }));
  for (const sc of game.scripts ?? [])
    scriptLists(sc).forEach((l, i) => lists.push({ list: l, path: `scripts.${sc.id}${sc.route ? `[${i}]` : '.do'}` }));
  if (game.start.intro) lists.push({ list: game.start.intro, path: 'start.intro' });

  const started = new Set<Id>();
  for (const { list, room, path } of lists)
    eachCmd(list as never, (cmd, p) => {
      if (typeof cmd !== 'object') return;
      if ('startScript' in cmd) started.add(cmd.startScript);
      const who =
        'moveActor' in cmd
          ? cmd.moveActor[0]
          : 'walk' in cmd || 'place' in cmd
            ? ((cmd as { who?: Id; place?: [Id, unknown] }).who ??
              ((cmd as { place?: [Id, unknown] }).place?.[0] as Id | undefined))
            : undefined;
      const route = who ? routed.get(who) : undefined;
      if (route)
        out.push({
          code: 'route-script-conflict',
          severity: 'warning',
          where: { ...(room ? { room } : {}), path: `${path}${p}` },
          message: `moves ${who}, whose route "${route}" moves them too`,
          fix: `suspend the route first (\`{ suspendScript: '${route}' }\`), then resume it once ${who} is back`,
        });
    });

  for (const r of routes) {
    const where = { path: `scripts.${r.id}`, id: r.id };
    if (r.manual && !started.has(r.id))
      out.push({
        code: 'route-never-starts',
        severity: 'warning',
        where,
        message: `manual route "${r.id}" is never started`,
        fix: `start it with \`{ startScript: '${r.id}' }\`, or drop "manual"`,
      });
    let room = r.route.from;
    for (const st of r.route.steps) {
      if (!('exit' in st)) continue;
      const ex = game.rooms.find((x) => x.id === room)?.exits?.[st.exit];
      if (!ex) continue;
      for (const a of c.unsatisfiable(ex.if, room))
        out.push({
          code: 'route-blocked-forever',
          severity: 'error',
          where: { room, path: `scripts.${r.id}.route.${st.id}`, id: r.id },
          message: `route "${r.id}" waits at exit "${st.exit}", which requires ${c.atomText(a)}: nothing sets it`,
          fix: 'set it somewhere, or route the character another way',
        });
      room = ex.to;
    }
  }
  for (const d of new Set(c.diagnostics ?? []))
    out.push({
      code: 'route-resume-misplaced',
      severity: 'error',
      where: { path: 'scripts', id: /route "([^"]+)"/.exec(d)?.[1] },
      message: d.replace(/^route-resume-misplaced: /, ''),
      fix: 'bring the character back to that room before resuming (a detour route that ends there)',
      solver: 'witness',
    });
  return out;
}
