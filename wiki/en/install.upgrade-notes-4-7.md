# Upgrade notes: 4.7

What 4.7.0 changed, then 4.7.1 and 4.7.2. Nothing to change in a game: it builds, plays and saves as on 4.6.0. Every addition is optional;
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
which could not run outside the repository.

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
