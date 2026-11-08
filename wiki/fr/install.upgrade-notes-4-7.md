# Notes de mise à jour : 4.7

TODO(release) : nommer la 4.7.2 dans cette introduction.

Ce que la 4.7.0, puis la 4.7.1, ont changé. Rien à modifier dans un jeu : il se construit, se joue et se sauvegarde comme en 4.6.0.
Chaque ajout est facultatif ; tous sauf `keepPlaying` de la fin sont visuels, invisibles aux règles, sauvegardes et
solveur.

La mise à jour elle-même : [Mettre à jour](install.upgrade.md).

<a name="from-4-6-0-to-4-7-0"></a>
<!-- applies: 4.7.0.. -->

## De la 4.6.0 à la 4.7.0

Installez `@quest-n-click/engine@4.7.0` ([Installer depuis npm](install.from-npm.md)). Ce qu'un jeu peut utiliser,
chaque élément facultatif :

- **Un personnage se retourne** une fois que le héros en a fini avec lui : `turnBack: true` sur l'acteur de la pièce
  ([Salles](create.rooms.md#actors)).
- **Le logo et les boutons de l'écran titre placés par le jeu** : `titleScreen` prend `logoWidth`, `logoCenter`,
  `logoTop` et `buttonsTop`, en unités de la scène de 640 x 400 ([Titre et générique](create.title-credits.md)). Un
  logo bordé de vide transparent pour le placer peut perdre cette bordure.
- **Voyager à pied sur la carte** : `vehicle: 'walk'` sur un lieu fait marcher le héros le long du trajet, avec ses
  images `walk` ([Carte du monde](create.world-map.md)).
- **Une carte sans épingles, ou avec de petits points** : `map.pins: 'hidden' | 'dots'`, pour une carte dont l'image
  dessine déjà ses lieux ([Carte du monde](create.world-map.md#bare-pins)). Par défaut, `'faces'`, rien ne change.
- **Le `frame` d'une région est dessiné**, tracé sur l'image du parent une fois la région ouverte
  ([Carte du monde](create.world-map.md#regions)). Retirez un cadre peint dans l'image du parent.
- **Des images par langue** : `i18n.images` dans `game.ts` donne, pour un id d'image, l'image que chaque langue dessine
  à sa place ([Traductions](create.translations.md#i18n-images)).
- **Une fin qui déroule le générique, montre le titre et laisse le monde continuer** : `{ end: true }` prend
  `credits`, `title` et `keepPlaying` ([Titre et générique](create.title-credits.md#end-of-chapter)). Avec
  `keepPlaying`, la fin est toujours atteinte et sauvegardée, mais un chargement remet le joueur dans le monde après
  elle. Un simple `{ end: true }` ne change pas.
- **Le titre et la description de la page par langue** : `site.json` prend `i18n`, le `title`, le `shortName` et la
  `description` dans les autres langues du jeu ([Organisation d'un projet](create.project-layout.md#site-json)).

**Pour le TypeScript d'un projet**, des ajouts seulement : `quest-n-click/player` exporte les types `SiteText`,
`SiteTexts` et `EndShow` ; `Presenter.end` prend un `EndShow` facultatif, et `GameState` un `keepPlaying` facultatif.

**Corrigé** : le nom d'une chose affiché au survol reste dans la scène près de son bord gauche ou droit, et la carte ne
montre une région enfant qu'une fois un lieu débloqué en elle, ou plus bas (elle proposait une région vide dès le
début).

**Les versions suivies** changent : à partir de la 4.7.0, seule la dernière mineure reçoit des correctifs, ceux de
sécurité compris ; la 4.6 n'en reçoit aucun, il faut donc mettre à jour. Les durées promises avant gardent leurs dates
([Stabilité et support](start.stability.md#versions)).

**Pour les mainteneurs**, les commandes de release réessaient les étapes réseau de git et indiquent la suite après un
échec, et `prepare` fait suivre au moteur des verrous versionnés une nouvelle mineure. **Pour les contributeurs**,
l'ensemble de mutation `routes` est bloquant, le job `external-consumer` de la CI ne demande aucune machine quand le
plan l'épargne, et le cliquet de couverture est strict sur chaque pull request (`npx tsx tools/coverage-ratchet.ts
--write` relève les planchers qu'il nomme).

<a name="from-4-7-0-to-4-7-1"></a>
<!-- applies: 4.7.1.. -->

## De la 4.7.0 à la 4.7.1 « Shorter Road »

Rien à changer dans un jeu : il se construit, se joue et se sauvegarde comme en 4.7.0. Aucun code du moteur, du
Studio ou du Bridge n'a bougé ; la 4.7.1 touche les outils de release et la CI.

**Pour les mainteneurs**, `npm run release -- prepare` écrit l'essentiel de la prose d'une release : les faits de
l'entrée du LOG, puis l'introduction du CHANGELOG et la ligne du README à partir des lignes `### Release` que chaque
pull request laisse dans son fragment. Une branche nomme la release où elle arrive avec la marque `(next, #n)`, et la
release écrit le numéro. `release -- check` lance les tests que la version fait bouger avant que la pull request de
release ne le fasse. Un nouveau candidat annule un candidat antérieur de la même version déjà en échec, les jobs de
mutation commencent par les plus longs, leur cache survit à une relecture de `docs/dev/mutants.json`, et `prepare` ne
lance plus le préchauffage des mutations. Un téléchargement depuis les releases GitHub et le clone du wiki sont
réessayés.

**Pour les contributeurs**, un fragment écrit `(next, #n)` là où il écrivait une version devinée, et
`changes -- --check` refuse une version postérieure à celle de `package.json`. La passe Firefox de `studio-hosted` est
en quarantaine : elle avertit au lieu d'échouer tant que #406 n'est pas fermée.

<a name="from-4-7-1-to-4-7-2"></a>
<!-- applies: 4.7.2.. -->

## De la 4.7.1 à la 4.7.2 « Audit fixes »

TODO(release) : ce qui change dans un jeu (« Rien à changer dans un jeu : il se construit, se joue et se sauvegarde comme en 4.7.1 » quand rien ne change), puis pour un hébergeur ou un mainteneur. Les entrées du CHANGELOG de la release, à réécrire pour qui met à jour :

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
