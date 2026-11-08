# Notes de mise à jour : 4.7

Ce que la 4.7.0, puis la 4.7.1 et la 4.7.2, ont changé. Rien à modifier dans un jeu : il se construit, se joue et se sauvegarde comme en 4.6.0.
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

Rien à changer dans un jeu : il se construit, se joue et se sauvegarde comme en 4.7.1. La 4.7.2 corrige ce qu'un audit
de la 4.7.1 a trouvé dans le paquet, le Studio, le Studio Server, les connecteurs et le Bridge ; trois des correctifs
changent ce que voit un hébergeur.

**Dans un projet de jeu**, `npm run studio` redémarre depuis le moteur installé (#454) : le paquet livre désormais
`AGENTS.md`, qu'importe l'assistant du Studio, et ne livre plus les bancs et les commandes de release des mainteneurs,
qui ne pouvaient pas tourner hors du dépôt.

**Pour le Studio local**, sa garde couvre ses routes quelle que soit la casse, et hors du mode LAN il ne répond qu'à
cette machine : `npm run studio -- --host` (ou `dev -- --host`) reçoit désormais 403 depuis une autre adresse, y
compris à travers la redirection de port d'un conteneur. Pour un téléphone ou un conteneur, lancez `npm run studio:lan`
avec son jeton.

**Pour un Studio Server**, rien à configurer. Un `set_storyboard` ou un `set_layout` d'un agent est refusé (409) quand
un coéquipier a écrit le fichier depuis que l'agent l'a lu ; l'agent le relit. Une session vérifiée par deux instances à
la fois n'est rafraîchie qu'une fois : un fournisseur qui détecte la réutilisation d'un refresh token ne met plus fin aux
sessions pendant un déploiement. La déconnexion back-channel répond 413 à un corps de plus de 16 Kio sans le garder,
`gc --delete` garde un blob stocké de nouveau pendant qu'il tourne, et un push ou un import git lit les blobs huit par
huit.

**Pour l'hébergeur d'un connecteur**, deux changements de comportement :

- **Open Badges** : seul un destinataire haché avec l'e-mail du joueur rend un badge `valid`. Un badge dont le
  destinataire se lit dans le badge (un e-mail en clair, une URL, un DID, un `credentialSubject.id` Open Badges 3.0)
  donne désormais `indeterminate` ; demandez des destinataires hachés à l'émetteur. Un badge valide compte pour le
  premier joueur qui l'utilise ; un autre reçoit 409 `{"status":"valid","signal":"claimed"}`. Cet enregistrement est
  gardé en mémoire et un redémarrage l'oublie.
- **E-mail par IMAP** : le connecteur marque chaque message qu'il traite du mot-clé `$QuestNClick`, et la rétention
  comme la suppression après acceptation n'enlèvent que ceux-là, par UID. Un serveur sans UIDPLUS les garde marqués
  `\Deleted` (journalisé une fois, `email.expunge-unsupported`). Un dossier dédié (`imap.mailbox`) reste la
  configuration recommandée.

**Pour l'hébergeur d'un Bridge**, une nouvelle limite : `limits.pairingsPerAddress` (5 par défaut) est le nombre de
codes d'appairage qu'une adresse peut demander par 10 minutes, par tenant ; au-delà, `POST /v1/pairings` répond 429. Un
hébergeur qui appaire beaucoup de joueurs depuis une adresse (un banc de test, une borne) l'augmente dans `config.json`.
Les clients IPv6 comptent pour une adresse par /64, donc leurs compteurs de quota repartent une fois de zéro. Le reste
ne demande rien : la rétention des runs d'un tenant ne supprime que les siennes, un acquittement ne fait jamais revenir
un joueur révoqué ou supprimé, un signal n'est jamais écrit pour un joueur révoqué entre-temps, un flux d'événements
abandonné pendant son ouverture ne compte plus dans `streamsPerPlayer`, et sur un store SQL le quota des engagements
Mystery (`commitsPerHour`) tient sur toutes les instances.
