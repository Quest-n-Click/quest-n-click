# Upgrade notes: 4.7

TODO(release): name 4.7.2 in this lead.

What 4.7.0 changed, then 4.7.1. Nothing to change in a game: it builds, plays and saves as on 4.6.0. Every addition is optional;
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

TODO(release): what changes in a game ("Nothing to change in a game: it builds, plays and saves as on 4.7.1" when nothing does), then for a host or a maintainer. The release's CHANGELOG bullets, to rewrite for a reader upgrading:

- **Open Badges: only a hashed-email recipient makes a badge `valid`** (4.7.2). A badge whose recipient can be read in
  the badge itself (a clear email, a URL, a DID, an Open Badges 3.0 `credentialSubject.id`) now gives `indeterminate`,
  and the form no longer reads a `recipient` field: the player gives the email the badge was issued to. A game whose
  issuer puts clear recipients in its badges sees `indeterminate` where it saw `valid`; ask the issuer for hashed ones.
- **`npm run studio` starts from the installed engine (4.7.2, #454)**: the Studio's assistant imports `AGENTS.md` as its
  system prompt, and the engine's package did not carry it, so Vite stopped on "Failed to resolve import
  ../../AGENTS.md?raw" in a game project. The package now ships it, and a test reads every relative import of every
  file the package ships and fails when its target is not shipped too.
- **The local Studio's guard covers its routes in any letter case (4.7.2)**: Vite's router mounts the Studio's API
  without regard to case, while the guard (Host, Origin, the LAN token) only looked at `/__studio` in lower case. The
  guard now covers every spelling, and a test drives the real dev server to prove it.
- **Outside LAN mode the local Studio answers this machine only (4.7.2)**: `npm run studio -- --host` (or
  `dev -- --host`) listens on the network without a token, and Host and Origin are headers a peer outside a browser sets
  as it likes. The Studio's routes now refuse any address but loopback (403) unless `npm run studio:lan` started them,
  with its token. A Studio reached through a container's port mapping is refused too: run `studio:lan` there.
- **Email over IMAP: retention touches only the messages the connector handled** (4.7.2). The connector marks each
  message it handles with the keyword `$QuestNClick`; the `keepDays` sweep and the deletion after acceptance remove
  only those, by their UIDs (`UID EXPUNGE`), never the operator's other mail in the folder nor what another client
  marked deleted. A server without UIDPLUS keeps them marked `\Deleted`, and the log says so once
  (`email.expunge-unsupported`). A dedicated folder (`imap.mailbox`) is still the recommended setup.
- **Open Badges: a valid badge counts for one player** (4.7.2). The first player who redeems a badge keeps it; another
  player posting the same badge gets 409 `{"status":"valid","signal":"claimed"}`. The connector remembers this in
  memory, so a restart forgets it.
- **The back-channel logout reads no more of a body than it takes (4.7.2)**: a form over its 16 KiB limit, or announced
  as such by its length, is answered 413 and the rest of it drained, not kept in memory, as the API's JSON bodies
  already were. Its limit is counted in bytes.
- **An agent's whole-file write no longer overwrites a teammate's edit (4.7.2)**: `set_storyboard` and `set_layout`,
  over the remote MCP or the local MCP pointed at a hosted Studio, send the revision the agent read the file at. A file
  someone else wrote since is refused (409), and the agent reads it again, instead of the teammate's change being
  silently replaced.
- **A session checked by two requests or two instances at once is refreshed once (4.7.2)**: the check is claimed in the
  database, so a provider that rotates refresh tokens and detects their reuse no longer ends a member's session during
  a deploy's overlap or a burst of requests. A refusal of a token another instance has rotated since ends nothing.
- **`gc --delete` keeps a blob stored again while it runs (4.7.2)**: each blob's date is read again right before its
  deletion, and one written within the grace period since the listing stays.
- **A git push or import reads the game's blobs several at a time (4.7.2)**: one request per file instead of two, eight
  at a time, as a build stores its files.
- **A tenant's run retention deletes its own runs only** (4.7.2): on a Bridge serving several tenants, each tenant's
  hourly purge kept another tenant's runs younger than that tenant's own `retentionDays`; a short retention on one
  tenant no longer empties the others' leaderboards.
- **An acknowledgement never brings a revoked or forgotten player back** (4.7.2): `POST /v1/ack` now renews only the
  link's expiry of a player still held and not revoked, and the operator's revoke and the player's unlink change only
  the `revoked` mark, so a revoke or a deletion landing at the same moment on another instance stays done.
- **A signal is never written for a player revoked or deleted meanwhile** (4.7.2): the store reads the player again
  inside the transaction that writes the signal; a proposal racing a revoke or a deletion on another instance is
  refused with 404 and leaves no row.
- **An event stream whose client leaves while it opens is let go** (4.7.2): such a stream no longer stays counted
  against the player's `streamsPerPlayer`, so repeated drops during the setup no longer end in a 429 for that player.
- **The Mystery commit quota holds across instances** (4.7.2): on a SQL store, `commitsPerHour` is counted in the
  database for every instance of the tenant, as the runs' quota is, instead of once per process (a bucket of three
  refilled over the hour; the memory store keeps its rolling hour).
- **The per-address rate limits key IPv6 by its /64** (4.7.2): an IPv6 client counts as one address for its whole /64,
  and the tables of addresses are swept at most every 10 seconds instead of on each new address once they are large.
- **The engine's package no longer carries the maintainers' benches (4.7.2, #454)**: `tools/audit-corpus.ts`,
  `bridge-cluster.ts`, `bridge-load.ts`, `golden-save.ts`, `prove-matrix.ts`, `runs-load.ts` and the release commands
  (`tools/release/prepare.ts`, `release-run.ts`) read the repository's `tests/`, `scripts/`, `games/demo` or the
  Bridge's CLI, which a game project does not have: shipped, they could not run. The same test found them.
- **A per-address limit on pairing codes** (4.7.2): `limits.pairingsPerAddress` (default 5) is how many codes one
  address may ask per 10 minutes, per tenant; beyond, `POST /v1/pairings` answers 429 with `Retry-After` for that
  address only, so a few addresses can no longer fill `pendingPairings` for every player. A host pairing many players
  from one address (a test, a kiosk) raises it in its `config.json`.
