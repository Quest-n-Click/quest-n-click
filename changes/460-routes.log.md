## 4.6.0 "Routes": a character's rounds through rooms on the world's clock

The maintainer asked for routes on 29 October, right after 4.5.6, and approved the plan the same day (D58,
`docs/dev/PLAN-4.6-ROUTES.md`, ADR 0031). The DSL gains `RouteScriptDef`/`RouteStep` (a game script with `route`),
`Layout.points` and two commands, `suspendScript` and `resumeScript`. The world's clock (`core/route-runtime.ts`)
moves routes by whole 50 ms ticks; `advance(n)` equals `n` single ticks (a fast-check property). Replay stays exact
without putting time in the entries: each entry records the tick at its sync points (`wt`: its beginning, each
command, each answer, the end of the hero's approach, its end), and a replay runs the world there before going on;
a route's position is an actor's position (`where`, `actors`), its path recomputed every tick from where it stands, so
a reload walks the same path. The navigation moved into the core, so the view and the simulation share one path finder;
the player's `dom/world-loop.ts` ticks the clock on its frames, freezes it (menu, cutscene, minigame, transition,
hidden page) and glides routed characters. `games/routes` ("Lou's Rounds", three rooms of the reference chapter, two
characters on routes, a detour and a mopped kitchen that shuts a door) validates, solves, is proved (601 states) and is
audited (601 against 856 explicit states, same verdict); its e2e passes in Chromium and WebKit, screenshots read. 25
route tests (runtime, validate, solve) and the 4.5 golden saves pass.

→ next: the mutation set for `route-runtime.ts`, then the release (`npm run release -- prepare 4.6.0`); field passes
for routes on Safari/iOS, in the background (PWA) and in the Studio.
