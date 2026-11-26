# Upgrade notes: 4.7

What 4.7.0 changed, then 4.7.1, 4.7.2, 4.7.3 and 4.7.4. Nothing to change in a game: it builds, plays and saves as on 4.6.0. Every addition is optional;
all but the end's `keepPlaying` are presentation only, unseen by rules, saves and the solver.

The upgrade itself is [Upgrade](install.upgrade.md).

<a name="from-4-6-0-to-4-7-0"></a>
<!-- applies: 4.7.0.. -->

## From 4.6.0 to 4.7.0

Install `@quest-n-click/engine@4.7.0` ([Install from npm](install.from-npm.md)). What a game may use, each optional:

- **A character turns back** once the hero is done with it: `turnBack: true` on the room's actor
  ([Rooms](create.rooms.md#actors)).
- **The title screen's logo and buttons placed by the game**: `titleScreen` takes `logoWidth`, `logoCenter`, `logoTop`
  and `buttonsTop`, in units of the 640 x 400 scene ([Title and credits](create.title-credits.md)). A logo padded with
  transparent space to place it can lose its padding.
- **Travel on foot on the map**: `vehicle: 'walk'` on a place walks the hero along the route with their `walk` frames
  ([World map](create.world-map.md)).
- **A map without pins, or with small dots**: `map.pins: 'hidden' | 'dots'`, for a map whose picture draws its places
  ([World map](create.world-map.md#bare-pins)). The default, `'faces'`, is as before.
- **A region's `frame` is drawn**, outlined on the parent's image once the region is open
  ([World map](create.world-map.md#regions)). Remove a frame painted into the parent's image.
- **Images per language**: `i18n.images` in `game.ts` names, for an image id, the image each language draws in its
  place ([Translations](create.translations.md#i18n-images)).
- **An end that rolls the credits, shows the title, and lets the world go on**: `{ end: true }` takes `credits`,
  `title` and `keepPlaying` ([Title and credits](create.title-credits.md#end-of-chapter)). With `keepPlaying`, the end
  is still reached and saved, but a load puts the player back in the world after it. A plain `{ end: true }` is
  unchanged.
- **The page's title and description per language**: `site.json` takes `i18n`, the `title`, `shortName` and
  `description` in the game's other languages ([Layout of a created project](create.project-layout.md#site-json)).

**For the TypeScript of a project**, additions only: `quest-n-click/player` exports the types `SiteText`, `SiteTexts`
and `EndShow`; `Presenter.end` takes an optional `EndShow`, and `GameState` an optional `keepPlaying`.

**Fixed**: a thing's name shown on hover stays inside the scene near its left or right edge, and the travel map shows
a child region only once a place in it, or below it, is unlocked (it offered an empty region from the start).

**Supported versions** change: only the latest minor gets fixes from 4.7.0, security fixes included; 4.6 gets none, so
upgrade. The windows promised before keep their dates ([Stability and support](start.stability.md#versions)).

**For the maintainers**, the release commands retry git's network steps and say the way on after a failure, and
`prepare` moves the versioned locks' engine peer on a new minor. **For contributors**, the `routes` mutation set is
gated, CI's `external-consumer` job asks for no runner when the plan spares it, and the coverage ratchet is strict on every
pull request (`npx tsx tools/coverage-ratchet.ts --write` raises the floors it names).

<a name="from-4-7-0-to-4-7-1"></a>
<!-- applies: 4.7.1.. -->

## From 4.7.0 to 4.7.1 "Shorter Road"

Nothing to change in a game: it builds, plays and saves as on 4.7.0. No engine, Studio or Bridge code moved; 4.7.1
is the release tools and CI.

**For the maintainers**, `npm run release -- prepare` writes most of a release's prose: the LOG entry's facts, and the
CHANGELOG's intro and README line from the `### Release` lines each pull request leaves in its fragment. A branch names
the release it lands in with the mark `(next, #n)`, and the release writes the number. `release -- check` runs the
tests the version moves before the release pull request does. A new candidate cancels an earlier one of the same
version that has already failed, the mutation jobs start with the longest, their cache survives a reread of
`docs/dev/mutants.json`, and `prepare` no longer starts the mutation warm-up. A download from GitHub's releases and
the wiki's clone are tried again.

**For contributors**, a fragment writes `(next, #n)` where it wrote a guessed version, and `changes -- --check`
refuses a version after `package.json`'s. `studio-hosted`'s Firefox pass is quarantined: it warns instead of failing
until #406 is closed.

<a name="from-4-7-1-to-4-7-2"></a>
<!-- applies: 4.7.2.. -->

## From 4.7.1 to 4.7.2 "Audit fixes"

Nothing to change in a game: it builds, plays and saves as on 4.7.1. 4.7.2 fixes what an audit of 4.7.1 found in the
package, the Studio, the Studio Server, the connectors and the Bridge; three of the fixes change what a host sees.

**In a game project**, `npm run studio` starts again from the installed engine (#454): the package now ships
`AGENTS.md`, which the Studio's assistant imports, and no longer ships the maintainers' benches and release commands,
which could not run outside the repository. In a room with exits, the Studio's "+ Reaction" works again (#461):
it asked for a place after the exits' own reactions, which the room's file does not hold.

**For the local Studio**, its guard covers its routes in any letter case, and outside LAN mode it answers this machine
only: `npm run studio -- --host` (or `dev -- --host`) now gets 403 from another address, a container's port mapping
included. Serve a phone or a container with `npm run studio:lan` and its token.

**For a Studio Server**, nothing to configure. An agent's `set_storyboard` or `set_layout` is refused (409) when a
teammate wrote the file since the agent read it; the agent reads it again. A session checked by two instances at once
is refreshed once, so a provider that detects refresh-token reuse no longer ends sessions during a deploy. The
back-channel logout answers 413 to a body over 16 KiB without keeping it, `gc --delete` keeps a blob stored again
while it runs, and a git push or import reads the blobs eight at a time.

**For a connector's host**, two changes of behaviour:

- **Open Badges**: only a recipient hashed with the player's email makes a badge `valid`. A badge whose recipient can
  be read in the badge (a clear email, a URL, a DID, an Open Badges 3.0 `credentialSubject.id`) now gives
  `indeterminate`; ask the issuer for hashed recipients. A valid badge counts for the first player who redeems it;
  another gets 409 `{"status":"valid","signal":"claimed"}`. That record is kept in memory and a restart forgets it.
- **Email over IMAP**: the connector marks each message it handles with the keyword `$QuestNClick`, and retention and
  the deletion after acceptance remove only those, by UID. A server without UIDPLUS keeps them marked `\Deleted`
  (logged once as `email.expunge-unsupported`). A dedicated folder (`imap.mailbox`) is still the recommended setup.

**For a Bridge's host**, one new limit: `limits.pairingsPerAddress` (default 5) is how many pairing codes one address
may ask per 10 minutes, per tenant; beyond, `POST /v1/pairings` answers 429. A host pairing many players from one
address (a test bench, a kiosk) raises it in `config.json`. IPv6 clients count as one address per /64, so their quota
counters start again once. The rest needs nothing: a tenant's run retention deletes its own runs only, an
acknowledgement never brings back a revoked or deleted player, a signal is never written for one revoked meanwhile, an
event stream dropped while it opens no longer counts against `streamsPerPlayer`, and on a SQL store the Mystery commit
quota (`commitsPerHour`) holds across instances.

<a name="from-4-7-2-to-4-7-3"></a>
<!-- applies: 4.7.3.. -->

## From 4.7.2 to 4.7.3 "Shipshape"

Nothing to change in a game: it builds, plays and saves as on 4.7.2. 4.7.3 fixes what was found since 4.7.2 in the
engine, the Studio Server, the connectors and the Bridge, and reworks CI and the release tools; one fix changes what a
host sees at start.

**In a game**, three bugs are gone. A sealed ending that could not be opened (a mistyped password, the file unreachable
offline) no longer saves the game as finished, and a wrong password is asked again. A looping script restarted inside a
`wait` (its room left and entered again, or the character switched) no longer skips its next step. A topic whose `do`
changes room or ends the game closes the conversation, as "Bye" does. A save migration's `renameItem`, `dropItem` and
`renameRoom` now reach every playable character, not only the active one. A presenter of your own may get `false` back
from `ending('open')` when nothing was unsealed; one that returns nothing behaves as before.

**In a game project**, the engine installs with npm 12: it carries navmesh's build itself, so no git dependency is left
(npm 12 refused it with `EALLOWGIT`). Paths are unchanged, and a build's `THIRD_PARTY_NOTICES.txt` and the engine's SBOM
still name navmesh and javascript-astar. `npm run dev:lan` and `studio:lan` no longer serve the game's `private/` folder
(403), and on Windows with Node 22 they start again, as do the Studio's Assets "Prepare", `run_tests` and
`npm run new-game`. The engine's package no longer carries the repository's CI tools; no `quest-n-click` command changes.

**For a Studio Server's or a Bridge's host**, one change of behaviour: a malformed trusted-proxy network
(`--trust-proxy=10.0.0.0/`, `"trustProxy": ["10.0.0.0/"]`, a `/33` or a `/abc`) now stops the server at start with an
error naming the entry. Before, an empty prefix trusted every address, so any client could choose its own
`X-Forwarded-For`. Plain addresses and `/0` to `/32` behave as before. Check your entries before you upgrade.

**For a Studio Server**, nothing to configure. A Solve or another Check no longer holds the instance's lock while the
worker runs, so the team's saves and page loads go through at once; a Git import or an engine upgrade now holds it, so a
read made meanwhile never mixes two revisions. A write that reuses another member's operation id is applied, and two CLI
runs asking for a token at once no longer crash. The sign-in libraries move to `jose@6.2.15` and `openid-client@6.8.9`.

**For a Bridge's host**, nothing to configure. The journal survives a nearly full disk (a rewrite fails before its
rename, a failed append takes its cut line back), and the open streams are indexed by player: about 6 ms per pass
instead of 580 at 10 000 streams.

**For a connector's host**, the email webhook's and the Open Badges endpoint's `perMinutePerIp` counts an IPv6 address
by its /64, as the Bridge does since 4.7.2, so their counters start again once. An email whose subject is one word that
looks like a pairing code (`Treasure`, `Thursday`) is read as an answer again.

**For a maintainer**, the release command judges every gate before it does anything and never re-runs a mutation
verdict, and `prepare` resets the measured game's first-visit budget to its measure plus 2 KB. CI installs through one
setup action whose `npm ci` waits out a registry hiccup, skips the jobs the plan spares, writes the mutation jobs once
(their checks now read `mutation / …`), and runs `e2e:portrait`, the website demo's spoiler check and, when a connector
or the Bridge changes, the connectors from their archive. The nightly skips a commit it already tested and says how to
re-run it by hand; the weekly `prove` workflow is gone. [`CHANGELOG.md`](../../CHANGELOG.md) has each change.

<a name="from-4-7-3-to-4-7-4"></a>
<!-- applies: 4.7.4.. -->

## From 4.7.3 to 4.7.4 "Signposts"

Nothing to change in a game: it builds, plays and saves as on 4.7.3. 4.7.4 makes the tool buttons easier to read on a
computer, moves the Studio Server to newer sign-in libraries, and fixes two steps of the release tooling.

**In a game**, on a computer: hovering a tool (the map, the pause, the music, a character to switch to) writes its name
in the sentence line in place of "Walk to", the same text as its tooltip. In a game with several playable characters,
more than three visible tools now stand in two columns beside the bag instead of one, so the buttons keep their size
(the demo's icons were 11 px tall at 1024 × 640, now 30); the bag gives up the width of one button. A game with only
the map, pause and music buttons looks as before, and a phone shows no change.

**For a Studio Server**, nothing to configure: the sign-in libraries move to `jose@6.2.18` and `openid-client@6.9.0`,
in its versioned lock.

**For a maintainer**, packing with npm 12 stops when a Bridge, connectors or Studio Server archive has lost its
`npm-shrinkwrap.json`, and `scripts/sbom.mjs` refuses such an archive instead of building its SBOM from the root lock;
the candidate still packs with npm 10, so what is published is unchanged. `prepare`'s next mark now writes the version
in `wiki/data/*.json` too, then checks every generated page against its source. Contributors move to Playwright 1.65.1
(CI's Linux browser image with it), Vite 8.3.8, Vitest 5.1.1, Biome 2.6.8 and knip 6.46.1: run `npm ci`.
[`CHANGELOG.md`](../../CHANGELOG.md) has each change.
