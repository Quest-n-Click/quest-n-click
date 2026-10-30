// The validator's checks of routes (4.6.0 "Routes", ADR 0031): their character, the points and exits each step names in
// the room it is walked in, their step ids, a loop that comes back where it began and makes progress, one automatic route
// per character. In a module of its own: validate.ts is capped (tests/file-size.test.ts).
import type { Cmd, Cond, GameDef, Id, Layout, RoomDef, RouteScriptDef } from '../../core/types';

export function routeChecks(
  game: GameDef,
  layouts: Record<string, Layout>,
  c: {
    rooms: Map<Id, RoomDef>;
    err: (where: string, msg: string) => void;
    warn: (where: string, msg: string) => void;
    cond: (c: Cond | undefined, where: string, room?: RoomDef) => void;
    cmds: (list: Cmd[] | undefined, where: string, room?: RoomDef) => void;
    stable: (id: string | undefined, where: string, kind: string) => void;
  },
): void {
  const { rooms, err, warn, cond, cmds, stable } = c;
  for (const r of game.rooms)
    (r.scripts ?? []).forEach((sc, i) => {
      if ((sc as { route?: unknown }).route)
        err(`${r.id}.scripts[${i}]`, `route "${sc.id}" belongs to the game's scripts: it walks through rooms`);
    });
  const autos = new Map<Id, Id>();
  (game.scripts ?? []).forEach((sc, i) => {
    if (!sc.route) return;
    const def = sc as RouteScriptDef;
    const w = `scripts[${i}]`;
    const { who, from, steps } = def.route;
    const ch = game.characters[who];
    if (!ch) err(w, `route "${def.id}": unknown character "${who}"`);
    else if (!ch.room) err(w, `route "${def.id}": "${who}" needs a "room" (a character that moves between rooms)`);
    if (!rooms.has(from)) err(w, `route "${def.id}": unknown first room "${from}"`);
    else if (ch?.room && ch.room !== from && !def.manual)
      warn(w, `route "${def.id}" begins in ${from}, but ${who} starts in ${ch.room}: it waits until ${who} is there`);
    cond(def.while, `${w}.while`, rooms.get(from));
    if (!def.manual) {
      const other = autos.get(who);
      if (other) err(w, `two automatic routes for ${who} ("${other}" and "${def.id}"): make one "manual"`);
      else autos.set(who, def.id);
    }
    if (!steps.length) {
      err(w, `route "${def.id}" has no step`);
      return;
    }
    const seen = new Set<Id>();
    let room = from;
    let progress = false;
    const points = new Set<string>();
    steps.forEach((st, j) => {
      const ws = `${w}.route.steps[${j}]`;
      if (!st.id) err(ws, 'route step without id');
      else if (seen.has(st.id)) err(ws, `duplicate step id "${st.id}" in route "${def.id}"`);
      else seen.add(st.id);
      stable(st.id ? `${def.id}.${st.id}` : undefined, ws, 'route step');
      const kinds = ['walk', 'wait', 'exit'].filter((k) => k in st);
      if (kinds.length !== 1) err(ws, 'a route step is exactly one of "walk", "wait" or "exit"');
      const R = rooms.get(room);
      if (R && !Object.values(R.actors ?? {}).some((a) => a.char === who))
        err(ws, `${who} has no actor in room "${room}", where route "${def.id}" walks this step`);
      if ('walk' in st) {
        const p = layouts[room]?.points?.[st.walk];
        if (!p) err(ws, `no point "${st.walk}" in the layout of "${room}" (place it in the editor)`);
        else points.add(`${room}:${p.join(',')}`);
      } else if ('wait' in st) {
        if (!(typeof st.wait === 'number' && st.wait >= 0)) err(ws, 'a wait is a number of milliseconds (0 or more)');
        else if (st.wait > 0) progress = true;
      } else if ('exit' in st) {
        const ex = R?.exits?.[st.exit];
        if (!ex) err(ws, `no exit "${st.exit}" in room "${room}"`);
        else {
          progress = true;
          const L = layouts[ex.to];
          const entry = typeof ex.entry === 'string' ? ex.entry : room;
          if (L && !Array.isArray(ex.entry) && !L.entries?.[entry])
            warn(ws, `${who} enters "${ex.to}" at its default entry: no entry "${entry}" there`);
          room = ex.to;
        }
      }
      cmds(st.do, `${ws}.do`, rooms.get(room));
    });
    if (points.size > 1) progress = true;
    if (def.loop && room !== from)
      err(w, `loop route "${def.id}" ends in "${room}", not in "${from}" where it starts again`);
    if (def.loop && !progress) err(w, `loop route "${def.id}" never makes progress (no wait, no exit, a single point)`);
  });
}
