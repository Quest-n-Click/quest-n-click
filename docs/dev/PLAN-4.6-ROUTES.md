# 4.6.0 « Routes » : des routines de déplacement pour tous les PNJ

Plan approuvé par le mainteneur le 29 octobre 2026 (D58, ADR 0031). Le §2 ci-dessous (« Dossier d'admission ») est le
dossier que demande le guichet de D33 ; le §« Réalisation » dit ce que le code a fait de chaque décision.

## Contexte

La 4.5.6 est publiée (`main` = `ba328e78`, `package.json` 4.5.6). Le mainteneur veut que la 4.6.0 permette à n'importe
quel PNJ de suivre un itinéraire sur plusieurs scènes : points d'arrêt, attentes, sorties et entrées. Le PNJ doit
continuer hors champ, s'arrêter quand on lui parle, puis reprendre. Le scénario doit pouvoir suspendre et reprendre une
routine. Le plan collé dans la demande est la spécification. Ce document dit comment le réaliser dans le code actuel.

### Ce que le code fait aujourd'hui (exploration de `main` à 4.5.6)

- **Scripts.** `ScriptDef` (`src/engine/core/types/content.ts:490`) n'a qu'une forme : `{id, while?, loop?, do, stepIds?}`.
  - `advance` (`core/script-runtime.ts:44-97`) exécute une commande par appel.
  - `ScriptScheduler` (`core/scheduler.ts`) boucle en temps réel avec `ui.wait(250)`. Il n'est actif que dans le
    navigateur (`autoScripts`, `dom/app.ts:348`).
- **Aucune progression hors champ.**
  - Un `walk` de script se résout dans la salle du héros (`ctx.room = eng.room()`).
  - La position n'est écrite qu'à l'arrivée (`command-handlers.ts:25-34`).
  - Hors champ, le seul mouvement possible est la téléportation `moveActor` (`seller_rounds` dans `games/reference/game.ts:34`).
- **Navigation côté DOM seulement.** `WalkArea` et `WalkTopology` (`dom/walk.ts`, earcut + navmesh) vivent dans le DOM.
  Le cœur n'a que `zoneRoute` (`core/motion.ts`). Le solveur ne calcule jamais de chemin.
- **Pas d'horloge pilotable.**
  - `run-clock.ts` ne fait qu'observer.
  - Les `wait` sont des `setTimeout`.
  - Rien ne se fige pendant le menu pause ou en arrière-plan : le rAF s'arrête mais les `setTimeout` continuent.
- **Interaction.**
  - `Engine.act` (`engine.ts:558-620`) calcule `approach()` (`world-queries.ts:167`) sur la position *enregistrée*, donc
    périmée pendant une marche.
  - Une étape de script en vol n'est pas interrompue.
- **Déterminisme.**
  - Le temps n'est jamais une entrée.
  - Chaque `advance` est une entrée `{step}` de session, que `replay` (`tools/replay.ts`) rejoue dans l'ordre.
  - Un `wait` interrompu par une sauvegarde repart de zéro.
- **Géométrie.** Les layouts JSON n'ont pour points nommés que `entries` et les `approach`. Aucun point libre.
- **Contraintes de livraison.**
  - DSL additif sur `main` (D48). Une nouvelle primitive passe par le guichet de D33 : un dossier d'admission et un ADR.
    Précédent : ADR 0022 et D49. La ligne « rendezvous in time » est refusée dans `docs/dev/DSL-STABILITY.md`.
  - `validate.ts` compte 1071 lignes pour un plafond de 1081 (`tests/file-size.test.ts`).
  - Les **131 exemptions de mutants** de `docs/dev/mutants.json` sont toutes à `revisit: "4.6.0"`.
  - La page `install.upgrade-notes-4-6` doit exister avant `release -- prepare`.
  - Les sauvegardes dorées 3.0.0→4.5.6 doivent charger sans avertissement et finir le jeu (`tests/save-v3.test.ts`).

## 2. Dossier d'admission (D33)

Ce que les primitives existantes donnent, essayé sur `games/reference` (`seller_rounds`) et `games/demo`
(`lou_paces`), et pourquoi elles ne suffisent pas :

- **`moveActor` en boucle de script** (`seller_rounds`) : le personnage change de salle d'un coup, sans marcher ; rien ne
  dit où il se trouve entre deux salles, et il ne s'arrête pas quand on lui parle.
- **`walk` dans un script de salle** (`lou_paces`) : la marche se résout dans la salle du héros. Hors champ, le script ne
  tourne pas, et la position n'est écrite qu'à l'arrivée : quitter la salle puis revenir remet le personnage au début.
- **`wait` puis `waitUntil`** : une attente coupée par une sauvegarde repart de zéro, et une étape en vol n'est pas
  interrompue par le clic du joueur.
- **Ce qui manque** : une progression qui continue hors champ, une position et une attente sauvegardées, une tenue
  pendant l'échange avec le joueur, et une suspension qui garde la progression. Aucune combinaison raisonnable des
  primitives ne les donne. C'est la règle de `DSL-STABILITY.md` pour admettre une primitive.
- **Ce qui reste refusé** : « rendezvous in time ». Le solveur ne prouve que la logique des arrêts d'une route, jamais
  son chronométrage.

## Décisions de conception

1. **Horloge du monde à pas fixe.**
   - Le moteur avance par *ticks* de 50 ms : `WORLD_TICK_MS`, dans `core/timing.ts`.
   - L'affichage accumule le temps réel et appelle `engine.world.advance(n)`. Le dt est plafonné à 250 ms par image, donc
     pas de rattrapage.
   - Le résultat ne dépend pas de la fréquence d'images. `n` ticks d'un coup donnent le même état que `n` appels d'un tick.
   - **Rejeu.** Une nouvelle entrée `SessionEntry.world: n` regroupe les ticks entre deux entrées joueur. Elle est vidée
     avant chaque `begin()`, avant une sauvegarde et à chaque arrivée qui porte un effet.
   - `replay` la réexécute. Le temps reste hors des entrées : seul le nombre de ticks est enregistré.
2. **Navigation partagée.**
   - `WalkArea`, `WalkTopology` et `zoneRoute` passent dans `src/engine/core/nav/`. `BOUNDARIES.md` autorise les paquets
     purs comme earcut et navmesh.
   - `dom/walk.ts` réexporte. Le walker du DOM *suit* la position simulée d'un PNJ en route (interpolation entre deux
     ticks, choix de pose) au lieu de calculer son propre trajet.
3. **Une route est une variante de `ScriptDef`**, déclarée seulement dans `GameDef.scripts`. Une route est multi-scène,
   donc une route de salle est une erreur de `validate`.
   ```ts
   { id: 'lou_rounds', loop: true, while?: Cond, manual?: true,
     route: { who: 'neighbor', from: 'market', steps: [
       { id: 'stall',  walk: 'stall' },           // point nommé du layout de la salle courante
       { id: 'pause',  wait: 4000, face?: 'left' },
       { id: 'out',    exit: 'to_alley' },         // marche jusqu'à la sortie, passe par son `if`, entre par son `entry`
       { id: 'bench',  walk: 'bench' },
       { id: 'arrive', wait: 3000, do?: Cmd[] },   // effet narratif à l'arrivée, sérialisé (décision 6)
       { id: 'back',   exit: 'to_market' } ] } }
   ```
   - La salle de chaque étape se déduit statiquement de `from` et des `exit`. Les `id` d'étape sont les ids stables
     (`stepIds`), et `renameScriptStep` les migre déjà.
   - Les scripts actuels ne changent pas : la variante se reconnaît à la présence de `route`, et `do` en est alors absent.
4. **Points nommés.** Le layout gagne `points?: Record<Id, Point>`, placés dans l'éditeur (`src/engine/dev/editor.ts`,
   même geste qu'une entrée). `save-layout.ts` les arrondit. Les scripts n'ont jamais de coordonnées.
5. **Contrôle des routes.**
   - `while` faux *fige* la route sur place, sans rembobinage, contrairement aux scripts.
   - `manual: true` : la route ne démarre que par `startScript`.
   - Deux commandes nouvelles valent pour tout script : `suspendScript: id` garde `pc`, l'étape, la position et
     l'attente restante, et `resumeScript: id` reprend.
   - Démarrer une route pour un personnage déjà en route suspend la première. On garde ainsi une seule route active par
     personnage.
   - `resumeScript` (et `startScript` d'une route) exige que le personnage soit dans la salle de l'étape courante (ou
     `from`). Sinon la route reste suspendue, un diagnostic est émis et le solveur le signale comme erreur
     (`route-resume-misplaced`). C'est la règle « un détour ramène explicitement le personnage ».
6. **Effets d'arrivée sérialisés.** Le `do` d'une étape est mis en file. La file se vide quand le moteur n'est pas occupé,
   un effet à la fois, sous `Engine.run` (busy). Elle s'enregistre comme entrée `{routeDo: <script>.<step>}`. Deux
   dialogues ou deux changements de scène ne se chevauchent donc jamais.
7. **Interaction.**
   - `Engine.act` sur un acteur en route *tient* la route dès le clic, avant l'approche du héros. L'approche se calcule
     sur la position simulée.
   - La tenue est levée à la fin du `run`. La route reprend alors sa marche interrompue vers la même cible.
   - Les autres routes continuent pendant l'échange. La tenue n'est pas sauvegardée : elle est levée au chargement.
8. **Sortie fermée.** Une étape `exit` dont le `if` est faux ou le `locked` vrai met la route en état `blocked` au point
   d'approche de la sortie. La condition est réévaluée à chaque tick. Un lien de marche conditionnel fermé
   (`stage.links[].if`) bloque de même.
9. **Gel.**
   - Le monde ne tick pas pendant le menu pause, une cinématique, un mini-jeu, une transition de salle, ni quand
     `document.hidden` est vrai (arrière-plan, PWA).
   - Il tick pendant les actions ordinaires et les dialogues.
   - Une nouvelle raison de gel `Engine.world.frozen`, avec un compteur et des raisons nommées, est séparée de `Busy`.
     `Busy` ne distingue pas aujourd'hui une cinématique d'une action.
10. **État et sauvegardes.**
    - `GameState.scripts[id].route?` contient `{room, at: Point, wait?: msRestant, status: 'active'|'suspended'|'blocked'|'done'}`.
    - Le chemin se recalcule depuis `at` au chargement, ce qui est déterministe.
    - Le schéma de save reste `looseObject` (additif). L'enveloppe v4, `schemaVersion` 3 et l'IR schéma 1 sont inchangés.
    - Le prune de `parseSave` ignore une `route` dont l'étape a disparu ou dont la salle n'existe plus, et la renvoie à `from`.
    - L'attente restante d'une route est persistée. Celle des scripts actuels ne l'est toujours pas : c'est une limite
      documentée et inchangée.
11. **Exemple.** Un nouveau jeu `games/routes`, fait avec les ressources existantes (salles et personnages de
    `reference`). Le démo et le reference ne changent pas, ce qui préserve les sauvegardes dorées et les playtests.

## Réalisation (ce que le code a fait de chaque décision)

- **Rejeu (décision 1).** Le temps entre dans une session par le nombre de ticks, jamais par des millisecondes.
  - `SessionEntry.wt` enregistre l'horloge du monde à chaque point de synchronisation d'une entrée : son début, chaque
    commande, chaque réponse (choix, carte, mini-jeu), la fin de la marche d'approche et sa fin.
  - `replay` mène le monde jusqu'au tick enregistré avant de continuer.
  - `{ world: t }` est le temps laissé passer comme entrée (le choix « Route » du solveur), `{ routeDo: id }` les
    commandes d'arrivée.
  - **Limite** : une étape de script ordinaire en vol pendant une action du joueur est rejouée après elle, comme avant
    4.6.0. Le rejeu est exact pour des entrées qui ne se chevauchent pas.
- **Position.** La position d'un personnage en route est celle de tout personnage (`where`, `actors`). Une route
  n'ajoute que `scripts[id].route` : `on`, `wait`, `blocked`, `pending`, et `paused` pour la suspension.
  - Le chemin est recalculé à chaque tick depuis la position courante. Recharger donne donc le même trajet que ne pas
    recharger.
- **Lien de marche.** Un lien (escalier, échelle) est franchi en un tick, puis sa durée est attendue. La vue le montre
  comme un saut.
- **Livraison.** Les lots sont des commits d'une seule branche d'intégration, `integration/4.6.0`, relue en une PR, au
  lieu d'une PR par lot. Le mainteneur fusionne une fois.

## Garanties (comportement · limite · test)

| # | Comportement précis | Limite assumée | Test qui le prouve |
|---|---|---|---|
| G1 | Un jeu sans route garde son empreinte logique, ses sauvegardes et ses rejeux | — | `save-v3.test.ts` (50 saves dorées, 0 avertissement) ; fingerprint du démo inchangé ; `replay` des playtests démo/reference |
| G2 | `advance(n)` ≡ `n × advance(1)` (positions, étapes, attentes au bit près) | flottants JS, même moteur | propriété fast-check `tests/route-clock.test.ts` |
| G3 | Afficher, quitter ou revenir dans une scène ne change pas la progression | l'interpolation visuelle peut différer d'un tick | test cœur : même état après N ticks, salle affichée ou non ; e2e capture |
| G4 | Le clic sur un PNJ en route le fige avant l'approche ; il reprend vers la même cible après l'échange ; les autres continuent | la tenue n'est pas sauvegardée | `tests/route-interaction.test.ts` (horloge simulée, deux PNJ) |
| G5 | Une sortie fermée bloque le PNJ ; il repart au tick qui suit la réouverture | réévaluation par tick (≤ 50 ms) | `tests/route-runtime.test.ts` |
| G6 | Suspendre puis reprendre conserve étape, position et attente restante ; une reprise hors de la salle attendue est refusée et signalée | — | `route-runtime` + lint/solveur `route-resume-misplaced` |
| G7 | Deux effets d'arrivée ne s'exécutent jamais en même temps, ni pendant une action du joueur | la file attend qu'il n'y ait plus d'action en cours ; un effet peut être retardé | `route-runtime` (deux arrivées au même tick, un `act` en cours) |
| G8 | Sauver puis recharger en pleine marche, en pleine attente ou en blocage rend le même état ; une save 4.5.x se charge | — | `tests/route-save.test.ts` + `critical-save.test.ts` étendu (prune) ; nouvelle save dorée 4.6.0 |
| G9 | Une session avec routes se rejoue sans divergence | uniquement avec le même moteur (comme aujourd'hui) | `replay.test.ts` étendu ; playtest de `games/routes` |
| G10 | Le monde se fige pendant le menu, une cinématique, un mini-jeu, une transition et en arrière-plan ; aucun rattrapage | une image lente perd au plus 250 ms de monde | tests cœur sur les raisons de gel ; e2e `visibilitychange` |
| G11 | Le solveur prouve que les occasions restent accessibles (logique des arrêts) | **aucune garantie de chronométrage** : le solveur avance une route d'un arrêt au suivant, sans positions intermédiaires | `--prove` et `--audit-abstractions` sur `games/routes` ; fixture classique « attendre l'absence » |

## Lots (une PR par lot, via une branche d'intégration `integration/4.6.0`)

Procédure de chaque lot : worktree neuf avec `--no-track` dans `~/Documents/Dev/.quest-n-click-wt/460-<lot>`, tests
d'abord (ils échouent), implémentation (ils passent), fragment `changes/<slug>.md`, puis `git push -u origin HEAD:<branche>`.
Le mainteneur fusionne. Une seule suite de tests tourne à la fois.

**L0 — Admission, ADR, décision**
- `docs/dev/PLAN-4.6-ROUTES.md` : ce plan, dont le §2 sert de dossier d'admission. Il montre que `moveActor`, `walk` de
  script, `wait` et `waitUntil` ne donnent ni progression hors champ, ni position persistée, ni tenue.
- ADR `0031-npc-routes.md`.
- D58 dans `DECISIONS.md`, avec les mots du mainteneur.
- Mise à jour de `DSL-STABILITY.md` : routes admises en 4.6.0, « rendezvous in time » toujours refusé.

**L1 — Navigation dans le cœur**
- Déplacer `WalkArea`, `WalkTopology` et `zoneRoute` vers `src/engine/core/nav/`, avec réexport depuis `dom/walk.ts`.
- `tests/walk-topology.test.ts` importe désormais depuis le cœur.
- Test d'identité des chemins sur tous les layouts de `games/*`.
- Aucun changement de comportement.

**L2 — Horloge du monde et runtime des routes**
- Créer `core/world-clock.ts` (ticks, gel, raisons) et `core/route-runtime.ts` (étapes walk/wait/exit, `blocked`, tenue,
  file d'effets).
- Brancher sur `Engine` : `engine.world`, `SessionEntry.world` et `routeDo` dans `session-runtime.ts` et `replay.ts`.
- `GameState.scripts[].route`, avec le schéma et le prune dans `save.ts`.
- Types `ScriptDef.route`, `RouteStep` et les commandes `suspendScript`/`resumeScript` : `cmds.ts` (`CMD_KEYS`, `CHANGES`),
  `command-handlers.ts`, `ir-fields.ts`, `ir-schema.ts`, `tests/api-surface.json`.
- `startScript`/`stopScript` reconnaissent les routes.
- Ajouter `route-runtime` et `world-clock` au jeu de mutants `core` (`tools/mutation-sets.ts`).
- Plancher de couverture en branches sur ces fichiers, à 100 % comme `save.ts`.
- Tests : G2, G5, G6, G7, G8, G10 (partie cœur).

**L3 — Interaction et affichage**
- `Engine.act` tient la route et calcule l'approche sur la position simulée.
- `dom/walker.ts` suit la simulation pour les PNJ en route.
- Boucle de ticks dans `dom/app.ts` : rAF, dt plafonné, gel sur le menu (`dom/menus.ts`), les cinématiques, les
  mini-jeux, les transitions et `visibilitychange`.
- `dom/room.ts` place le PNJ à sa position simulée à l'entrée dans la salle.
- Tests : G3, G4.

**L4 — Points dans le Studio et le layout**
- Ajouter `Layout.points` (`core/types/stage.ts`).
- Éditeur : ajouter, déplacer, renommer et supprimer un point (`dev/editor.ts`, `overlay.ts`, `save-layout.ts`, bridge
  des Rooms `src/studio/rooms-bridge.ts`).
- Vérifier que `studio-server` accepte et conserve le champ (route `setLayout`).
- Test e2e Studio : poser un point, sauver, relire.

**L5 — validate et lint**
- Nouveau module `src/engine/tools/validate/routes.ts`, appelé en fin de `validate()`. `validate.ts` est plafonné.
  Il vérifie :
  - route seulement dans le jeu ;
  - `who` est un personnage mobile, avec un acteur dans chaque salle traversée ;
  - points et sorties existants dans la salle déduite, entrée cible présente ;
  - ids d'étape uniques ;
  - une route `loop` revient à `from` ;
  - pas de boucle sans progression (aucune attente > 0 et aucune marche de longueur > 0) ;
  - pas deux routes non `manual` sur le même personnage.
- Lint (`tools/lint.ts`) :
  - `route-script-conflict` : un script fait `walk`, `place` ou `moveActor` sur un personnage dont une route peut être active ;
  - `route-resume-misplaced` ;
  - `route-never-starts` ;
  - `route-blocked-forever` : sortie dont le `if` ne devient jamais vrai, à partir des témoins du solveur.
- Codes documentés dans `wiki/{en,fr}/create.checking.md`.
- `validateDir` hérite des vérifications.

**L6 — Solveur**
- Nouveau choix `Route <id>` dans `tools/solve/expansion.ts`, à côté de `Script <id>`. Il avance la route jusqu'à
  l'arrêt suivant (attente, changement de salle, blocage) avec des positions instantanées. Le solveur appelle le runtime
  avec une avance « jusqu'au prochain arrêt » sur l'horloge simulée.
- Dims `route:<id>` = étape et statut quand la route est vivante (`abstractions.ts`), et `where:<char>` déjà présent.
  Silence de mobilité inchangé.
- Fixture classique « attendre l'absence du gardien » dans `tests/fixtures/classics.ts`.
- `--audit-abstractions` sur `games/routes`.
- `PROOF-MATRIX.md` reste gelée : aucune instance ajoutée.
- Test G11.

**L7 — Jeu de référence `games/routes` et navigateurs**
- Trois salles reprises de `reference`, avec deux PNJ en route simultanément. Scénarios :
  - croiser le PNJ ;
  - le suivre d'une salle à l'autre ;
  - lui parler en pleine marche ;
  - profiter de son absence pour prendre un objet ;
  - un détour scénarisé qui le ramène, puis la reprise ;
  - une porte fermée qui le bloque ;
  - sauvegarde et rechargement en route.
- `games/routes/e2e.mjs` et des playtests.
- Job CI `routes` sur Chromium et WebKit, calqué sur le job `heroes`, avec captures. Je relis moi-même les captures avant
  de dire que c'est bon.

**L8 — Relecture des mutants dus à 4.6.0**
- Relire les 131 exemptions (précédent `440-mutants-reread`) : tuer, justifier de nouveau avec `revisit: "4.7.0"`, ou
  supprimer.
- Ajouter les survivants des nouveaux fichiers du cœur.

**L9 — Documentation FR et EN**
- Nouvelle page `create.routes` (manifeste, modèles, claims reliés aux tests G1–G11).
- Mise à jour de `create.moving-characters` et `create.dsl` (régénéré par `tools/dsl-doc.ts`).
- Création de `install.upgrade-notes-4-6`.
- Remplacer `seller_rounds` par une route dans les exemples de la doc. Le jeu `reference` lui-même ne change pas.

**L10 — Release 4.6.0**
- `npm run release -- prepare 4.6.0` (D57) : golden save 4.6.0, README, LOG, CHANGELOG.
- `release-check` complet, avec les sorties exactes consignées dans `docs/dev/passes/4.6.0.md`.
- Issues de passe humaine sur le terrain : routes en Safari/iOS, en arrière-plan PWA, et dans le Studio pour les points.
- Ensuite, les PR Dependabot.
- **La signature (D37) n'est pas donnée.** Je la demanderai au moment du tag.

## Vérification

Une seule suite à la fois. Après une interruption, arrêter le worker par son PID.

```
npm run validate && npm run solve && npm run solve -- --prove
GAME=routes npm run validate && GAME=routes npm run solve -- --prove && GAME=routes npm run solve -- --audit-abstractions
npm run lint && npm run playtests -- --strict
npm run test:node && npm run test:coverage && npm run test:mutation:core
E2E_BROWSER=chromium GAME=routes npm run e2e -- --prod && E2E_BROWSER=webkit GAME=routes npm run e2e -- --prod
npm run e2e:studio && npm run wiki -- check && npm run build && npm run release-check
```
- Les sorties exactes de chaque commande sont collées dans la PR du lot, puis dans `passes/4.6.0.md`.
- Les captures Chromium et WebKit de `games/routes` sont relues image par image : PNJ hors champ revenu à la bonne
  place, PNJ figé pendant le dialogue, PNJ bloqué devant la porte.

## Fichiers critiques

- `src/engine/core/types/content.ts`, `types/state.ts`, `types/session.ts`, `types/stage.ts`
- `src/engine/core/script-runtime.ts`, `scheduler.ts`, `command-handlers.ts`, `cmds.ts`, `engine.ts`, `movement.ts`, `world-queries.ts`
- Nouveaux : `src/engine/core/world-clock.ts`, `route-runtime.ts`, `nav/*`
- `src/engine/core/save.ts`, `migrate.ts`, `session-runtime.ts`, `ir-fields.ts`, `ir-schema.ts`
- `src/engine/dom/walk.ts`, `walker.ts`, `app.ts`, `room.ts`, `menus.ts`
- `src/engine/dev/editor.ts`, `save-layout.ts`, `src/studio/rooms-bridge.ts`
- `src/engine/tools/validate/routes.ts` (nouveau), `tools/lint.ts`, `tools/solve/expansion.ts`, `abstractions.ts`, `tools/replay.ts`
- `games/routes/` (nouveau), `.github/workflows/ci.yml`, `wiki/{en,fr}/`, `wiki/manifest.json`, `docs/dev/mutants.json`
