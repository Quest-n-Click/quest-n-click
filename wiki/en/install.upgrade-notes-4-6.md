# Upgrade notes: 4.6

What 4.6.0 "Routes" changed. Nothing to change in a game: it builds, plays and saves as on 4.5.6. A game that
declares no route has no world clock, so its logic fingerprint, its golden saves and its sessions stay the same.

The upgrade itself is [Upgrade](install.upgrade.md).

<a name="from-4-5-6-to-4-6-0"></a>
<!-- applies: 4.6.0.. -->

## From 4.5.6 to 4.6.0 "Routes"

Install `@quest-n-click/engine@4.6.0` ([Install from npm](install.from-npm.md)). What a game may use, each optional:

- **Routes** ([Routes](create.routes.md), ADR 0031): a game script with `route: { who, from, steps }` walks a
  character from point to point and through exits, on the world's clock, shown or not. The player's click holds it, a
  shut exit holds it, and `while` false holds it where it is.
- **`suspendScript` and `resumeScript`**, for any script: a suspended script keeps its step, and a suspended route
  also keeps its place and the wait left.
- **Route points in the layouts** (`points`), placed in the editor under "Entry and route points".
- **`validate`, the lint and the solver know routes**: four lint codes (`route-script-conflict`,
  `route-never-starts`, `route-blocked-forever`, `route-resume-misplaced`), and a "Route <id>" choice in the
  solver's paths.
- **The navigation moved into the core** (`@quest-n-click/engine` `core/nav/walk.ts`); the player re-exports it, so an
  import from `dom/walk` still works.

**For a game that uses routes**, a save gains `world` and `scripts.<id>.route`, and a session gains `wt` and the
entries `{ world }` and `{ routeDo }`. A 4.5 save loads (its routes begin from it), but a 4.5 engine does not
understand a 4.6 session with routes.

**For the TypeScript of a project**, `ScriptDef` is now a union, `CmdScriptDef | RouteScriptDef`. Code that read
`script.do` on any script checks first that it is a script of commands (`if (s.do)`); a room's `scripts` stay
`CmdScriptDef[]`.

**For contributors**, the 131 mutation exemptions due at 4.6.0 were read again (`docs/dev/MUTANTS.md`), and CI has a
`routes` job (Chromium and WebKit).
