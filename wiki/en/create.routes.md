# Routes: a character's rounds through rooms

Give any character an itinerary: walk to a spot, wait, go through a door into the next room, and so on, on the
world's clock, whether the player watches or not. The player can cross the character, follow it, speak to it, or use
its absence for a puzzle.

<a name="what-you-get"></a>

## What you get

A character on its rounds through several rooms that keeps going off screen. It stops while the player talks to it,
waits at a door that is shut, and goes back to its rounds after a detour the story sends it on. Saves and replays
keep where it is, and the solver proves the occasions it opens stay open.

<a name="context-and-versions"></a>

## Context and versions

- A created project (`game/`) or the engine repository (`games/<id>/`).
- From 4.6.0 "Routes" (ADR 0031). On an older engine, a character changes rooms only with `moveActor`
  ([Moving characters](create.moving-characters.md)).
- The playable example is `games/routes` ("Lou's Rounds"): `GAME=routes npm run dev` in the engine repository.

<a name="prerequisites"></a>

## Prerequisites

- The character declared with a `room` (where it starts) and a `walk` pose
  ([Moving characters](create.moving-characters.md#prerequisites)).
- An actor for that character in **every room** the route crosses, and a walk area in each
  ([geometry](create.geometry.md)).
- The exits the route takes, declared in the rooms ([rooms](create.rooms.md)).

<a name="where-to-run"></a>

## Where to run the commands

- The route goes in `game.ts` (`scripts`) and the points in the layouts, which you place in the editor
  (`?edit=<room>`, or the Studio's Rooms tab).
- Check from the root of the project: `npm run validate`, `npm run solve` and `npm run lint` in the engine repository,
  or `npx quest-n-click validate`, `solve` and `lint` in a created project.

<a name="steps"></a>

## Steps

<!-- step: points -->
1. **Place the points.** In the editor, open the room, type a name in "Entry and route points", then press "Add a
   route point" and drag it where the character stops. The layout keeps it under `points`. A route never holds
   coordinates: it names points, and the geometry stays in the layout.

<!-- step: route -->
2. **Write the route** in `game.ts`, among the game's `scripts` (a route belongs to the game, never to a room).
   `who` is the character, `from` the room of the first step, and each step has a stable `id` and is one of:
   - `walk` a point of the room it is in;
   - `wait` milliseconds, with an optional `face` or `pose`;
   - `exit` through one of the room's exits, into the room it leads to, at its entry.

   ```ts
   scripts: [
     {
       id: 'rounds',
       loop: true,
       route: {
         who: 'neighbor',
         from: 'hall',
         steps: [
           { id: 'desk', walk: 'desk' },
           { id: 'paperwork', wait: 3000, face: 'left' },
           { id: 'out', exit: 'out' },
           { id: 'stalls', walk: 'stalls' },
           { id: 'inspect', wait: 2500, face: 'right' },
           { id: 'to-kitchen', exit: 'kitchen_door' },
           { id: 'hello', walk: 'hello' },
           { id: 'chat', wait: 2500, do: [{ if: { room: 'kitchen' }, then: [{ say: ['neighbor', 'Evening, Grandma!'] }] }] },
           { id: 'to-street', exit: 'windows' },
           { id: 'home', exit: 'hall_door' },
         ],
       },
     },
   ],
   ```

   The room of each step follows from `from` and the exits before it. A `loop` route must end in `from`.

<!-- step: occasion -->
3. **Make its absence the puzzle.** Rules read where the character is, as for any moving character:
   `{ actorIn: ['neighbor', 'hall'] }`. For example, the map can be searched only while Lou is out:
   `if: { all: ['!cable_taken', { not: { actorIn: ['neighbor', 'hall'] } }] }`.

<!-- step: arrival -->
4. **React to an arrival** with the step's `do`: it runs once the step is done (arrived, waited, entered). Arrival
   commands run one route at a time, never during the player's action, and the route waits for them. Guard a line with
   `{ if: { room: '…' } }` when it only makes sense if the player is there.

<!-- step: control -->
5. **Change the routine from the story.**
   - `{ suspendScript: 'rounds' }` stops the route where it is (its step, its place, the wait left).
   - `{ resumeScript: 'rounds' }` takes it up again.
   - `{ startScript: 'detour' }` starts another route of the same character and suspends the one it had.
   - A route marked `manual: true` starts only that way.
   - A detour must bring the character back to the room of the suspended step before resuming it, for example with a
     last step whose `do` is `[{ resumeScript: 'rounds' }]`.
   - `while` holds a route in place while it is false; unlike a script, it never rewinds.

<!-- step: door -->
6. **Shut a door on it.** An `exit` step goes through only when the exit's `if` holds. Until then, the character waits
   in front of the door and goes through on the tick the door opens. A walk link whose `if` is false
   (`stage.links`) holds it the same way.

<!-- step: check -->
7. **Check.** `validate` names a missing point, exit or actor in the room the step is walked in, a loop that does not
   come back to `from` or never makes progress, and two automatic routes for one character. `solve` lets time pass
   until a route's next stop (the choice "Route <id>" in a path). `lint` adds the four codes below.

> [!GUARANTEE id=routes-clock-steps]
> The world moves by whole ticks: `n` ticks at once leave exactly the same state as `n` ticks one at a time, so a run
> does not depend on the frame rate.

> [!GUARANTEE id=routes-offscreen]
> A route goes on whether its room is shown or not: after the same ticks, the character is at the same place and the
> same step.

> [!GUARANTEE id=routes-hold]
> A click on a character on a route holds it from the click to the end of that action; the other routes go on.

> [!GUARANTEE id=routes-shut-door]
> A shut exit holds the character in front of it; it goes through on the tick after the exit opens.

> [!GUARANTEE id=routes-suspend]
> Suspended, a route keeps its step, its place and the wait left; a resume away from the step's room is refused and
> reported (`route-resume-misplaced`).

> [!GUARANTEE id=routes-arrival]
> Two arrival commands never run at the same time, and never during the player's action.

> [!GUARANTEE id=routes-saves]
> A save made in the middle of a walk, a wait or at a shut door loads into the same world; a save from before 4.6.0
> loads, and its routes begin from it.

> [!GUARANTEE id=routes-replay]
> A session whose actions overlap the world's clock replays to the same state.

> [!GUARANTEE id=routes-solver]
> The solver lets time pass until a route's next stop and proves the occasions it opens stay reachable.

> [!LIMIT id=routes-no-timing]
> The proof is about where routes stop (which step, which room, held or not), never about timing. Two paths that
> differ only by where a character stands inside a walk are one state for the solver.

> [!LIMIT id=routes-frozen]
> The world stands still in the pause menu, during a cutscene, a minigame or a room transition, and while the page is
> hidden. Nothing catches up afterwards: an hour in the background is not walked. A slow frame loses at most 250 ms of
> the world.

> [!LIMIT id=routes-overlap]
> A session replays exactly when its entries do not overlap. An ordinary script's step still running while the player
> acts is replayed after that action, as before 4.6.0.

<a name="expected-result"></a>

## Expected result, and how to check it

- In the game, the character walks its rounds and is found wherever its clock put it when you enter a room.
- `npm run solve` finishes, with "Route <id>" steps where waiting matters, and `npm run solve -- --prove` says the
  ending stays reachable from every state.
- `GAME=routes npm run e2e -- <url> --prod` plays the example in a browser: the hold, the frozen menu, the absence, a
  reload in the middle of the rounds, the shut door.

<a name="common-errors"></a>

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `no point "x" in the layout of "room"` | The point is placed in another room, or not at all | Place it in the room that step is walked in (the one reached by the exits before it) |
| `<who> has no actor in room "room"` | The character has no actor where the route takes it | Add an actor for it in that room and place it |
| `loop route "id" ends in "room", not in "from"` | The last exits do not lead back | Add the exit steps back to `from` |
| `two automatic routes for <who>` | Two routes of one character start with the game | Mark the detour `manual: true` and start it with `startScript` |
| `route-resume-misplaced` in `solve` or `lint` | A resume while the character is in another room | End the detour in the room of the suspended step, then resume |
| `route-script-conflict` | A script or a rule moves the character (`walk`, `place`, `moveActor`) while its route may run | Suspend the route first, resume it once the character is back |

<a name="files-changed"></a>

## Files or data changed

- `game.ts` (`scripts`) and `layout/<room>.json` (`points`).
- A save gains `world` (the clock, in ticks) and, for each route, `scripts.<id>.route` (the wait left, held at a door,
  arrival commands pending) and `paused`.
- A session records the world's ticks at each sync point of an entry (`wt`), and two entries: `{ world }` and
  `{ routeDo }`.

<a name="recovery"></a>

## Recovery or going back

- Removing a route is a content change like any other. An old save keeps its character where it was, and a save
  whose route step disappeared drops that route's state when it loads (`save adjusted after a content update`).
- To rename a step, use `renameScriptStep` in a migration ([State and saves](create.state-saves.md)).

<a name="references"></a>

## References

- `docs/dev/adr/0031-npc-routes.md`, `docs/dev/PLAN-4.6-ROUTES.md`
- `src/engine/core/route-runtime.ts` (the clock and the routes), `src/engine/core/nav/walk.ts` (the path finder),
  `src/engine/dom/world-loop.ts` (the frames and the freezing)
- `src/engine/tools/validate/routes.ts`, `src/engine/tools/lint-routes.ts`
- `games/routes/` (the example), `tests/route-runtime.test.ts`, `tests/route-solve.test.ts`
