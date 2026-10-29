# 0031 · Routes: a character walks through rooms on the world's clock (4.6.0)

**Context.** The maintainer asked for any character to follow an itinerary through several points and rooms, with
pauses, changes of routine driven by the story, and the player able to cross, follow or speak to them, or use their
absence (D58). 4.5 has no progress off screen: a script's `walk` resolves in the hero's room and writes its position
on arrival; a character changes room only by `moveActor`, at once. The admission file is
`docs/dev/PLAN-4.6-ROUTES.md` §2.

**Decision.**
1. **A route is a game script** (`RouteScriptDef`, `route: { who, from, steps }`), declared in `GameDef.scripts` only.
   Its steps walk to a named point of the room's layout (`Layout.points`, placed in the editor), wait a number of
   milliseconds, or go through one of the room's exits. A step's `do` runs once the step is done. The geometry stays
   in the layouts.
2. **The world's clock** (`core/route-runtime.ts`) moves every route by whole ticks of 50 ms, whether its room is shown
   or not. The player's frames tick it, and it is frozen while the game is not played: the menu, a cutscene, a
   minigame, a room transition, a hidden page. There is no catching up.
3. **The navigation is shared.** `WalkArea` and `WalkTopology` move into `core/nav/`. The view glides a routed
   character to where the clock puts it.
4. **The player holds a route** from the click on its character to the end of that action. A closed exit holds it
   before the door. `while` false holds it in place. `suspendScript` and `resumeScript` keep its step, position and
   wait. A resume (or a start) away from the step's room is refused and said (`route-resume-misplaced`). Starting a
   route suspends the other route of the same character.
5. **Arrival commands** run one route at a time, as their own input (`{ routeDo }`), never during another run.
6. **The session records ticks, not time.** Each entry records the clock at its sync points (`SessionEntry.wt`); a
   replay runs the world there first. `{ world: t }` is time let pass as an input.
7. **The solver** offers "Route <id>": let the world run until that route's next stop. A state is keyed on each
   route's step and how it stands in it, never on its position inside a walk or the wait left.

**Consequences.**
- A game without routes has no world: nothing ticks and nothing is recorded, so its logic fingerprint, saves, sessions
  and digests are those of 4.5 (the golden saves 3.0.0→4.5.6 load with no warning).
- The save gains optional fields (`world`, `scripts[].paused`, `scripts[].route`). The envelope stays v4,
  `schemaVersion` stays 3, and the IR stays schema 1 (`IrScript.do` becomes optional, and `route`/`manual` are added).
- Two commands are added (`suspendScript`, `resumeScript`), and `CHANGES` lists them.
- The proof covers the logic of a route's stops (which step, which room, held or not), with no guarantee of timing.
- A session in which an ordinary script's step is in flight while the player acts replays that step after the action,
  as before.

**What would change it.** A game whose puzzle depends on where a character stands inside a walk (the solver would then
need positions in its state), or a request for timed rendezvous, which is still refused.
