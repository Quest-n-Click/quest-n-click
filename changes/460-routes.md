### Changes

- **Routes: any character walks its rounds through rooms, seen or not (4.6.0, ADR 0031, D58)**: a game script with
  `route: { who, from, steps }` walks a character to points of the layouts (`Layout.points`, placed in the editor),
  waits, and goes through exits into the next room, on the world's clock, in 50 ms ticks, whether its room is shown or
  not. A click on the character holds it from the hero's approach to the end of the exchange while the other routes go
  on; a shut exit holds it at the door until it opens; its arrival commands (`do`) run one route at a time, never during
  the player's action. The world stands still in the pause menu, cutscenes, minigames, room transitions and while the
  page is hidden, with no catching up. A game without routes has no world: its fingerprint, saves and sessions are
  those of 4.5.6. The example is `games/routes` ("Lou's Rounds"), played in Chromium and WebKit by its own CI job.
- **`suspendScript` and `resumeScript` (4.6.0)**: suspend any script where it is and resume it; a route keeps its
  step, its place and the wait left, starting another route of the same character suspends the first, and a resume
  away from the room of the suspended step is refused and reported (`route-resume-misplaced`).
- **Saves and replays keep the world (4.6.0)**: a save holds the clock (`world`) and each route's progress
  (`scripts.<id>.route`, `paused`); a session records the clock at each sync point of an entry (`wt`) and two new
  entries, `{ world }` (time let pass) and `{ routeDo }`. A replay runs the world to each recorded tick first. Saves of
  4.5 load, and their routes begin from them.
- **validate, the lint and the solver know routes (4.6.0)**: `validate` checks each step in the room it is walked in
  (point, exit, actor), a loop that comes back to its first room and makes progress, one automatic route per
  character; the lint adds `route-script-conflict`, `route-never-starts`, `route-blocked-forever` and, after a search,
  `route-resume-misplaced`; the solver lets time pass until a route's next stop ("Route <id>") and keys a state on each
  route's step and how it stands, never on its position inside a walk (the proof is of the stops, not of the timing).
- **The path finder moved into the core (4.6.0)**: `WalkArea` and `WalkTopology` are `core/nav/walk.ts`, shared by the
  view and the routes; `dom/walk.ts` re-exports them.
