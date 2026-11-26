# Notes de mise à jour : 4.7

Ce que la 4.7.0, puis la 4.7.1, la 4.7.2, la 4.7.3 et la 4.7.4, ont changé. Rien à modifier dans un jeu : il se construit, se joue et se sauvegarde comme en 4.6.0.
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
qui ne pouvaient pas tourner hors du dépôt. Dans une pièce qui a des sorties, le bouton « + Reaction » du Studio
fonctionne de nouveau (#461) : il demandait une place après les réactions propres aux sorties, que le fichier de la
pièce ne contient pas.

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

<a name="from-4-7-2-to-4-7-3"></a>
<!-- applies: 4.7.3.. -->

## De la 4.7.2 à la 4.7.3 « Shipshape »

Rien à changer dans un jeu : il se construit, se joue et se sauvegarde comme en 4.7.2. La 4.7.3 corrige ce qui a été
trouvé depuis la 4.7.2 dans le moteur, le Studio Server, les connecteurs et le Bridge, et retravaille la CI et les outils
de release ; un correctif change ce que voit un hébergeur au démarrage.

**Dans un jeu**, trois bugs disparaissent. Une fin scellée qui n'a pas pu s'ouvrir (un mot de passe mal tapé, le fichier
inaccessible hors ligne) n'enregistre plus la partie comme terminée, et un mauvais mot de passe est redemandé. Un script
en boucle relancé pendant un `wait` (sa pièce quittée puis retrouvée, ou un changement de personnage) ne saute plus son
étape suivante. Un sujet dont le `do` change de pièce ou termine le jeu ferme la conversation, comme « Au revoir ». Les
`renameItem`, `dropItem` et `renameRoom` d'une migration de sauvegarde atteignent désormais chaque personnage jouable, et
plus seulement le personnage actif. Un presenter à vous peut recevoir `false` de `ending('open')` quand rien n'a été
descellé ; un presenter qui ne renvoie rien se comporte comme avant.

**Dans un projet de jeu**, le moteur s'installe avec npm 12 : il contient lui-même le build de navmesh, si bien qu'il ne
reste aucune dépendance git (npm 12 la refusait avec `EALLOWGIT`). Les chemins ne changent pas, et le
`THIRD_PARTY_NOTICES.txt` d'un build comme le SBOM du moteur nomment toujours navmesh et javascript-astar.
`npm run dev:lan` et `studio:lan` ne servent plus le dossier `private/` du jeu (403), et sous Windows avec Node 22 ils
redémarrent, tout comme « Prepare » dans l'onglet Assets du Studio, `run_tests` et `npm run new-game`. Le paquet du moteur
ne contient plus les outils de CI du dépôt ; aucune commande `quest-n-click` ne change.

**Pour l'hébergeur d'un Studio Server ou d'un Bridge**, un changement de comportement : un réseau de proxy de confiance
mal formé (`--trust-proxy=10.0.0.0/`, `"trustProxy": ["10.0.0.0/"]`, un `/33` ou un `/abc`) arrête désormais le serveur
au démarrage, avec une erreur qui nomme l'entrée. Avant, un préfixe vide faisait confiance à toutes les adresses, et
n'importe quel client pouvait choisir son propre `X-Forwarded-For`. Les adresses simples et `/0` à `/32` se comportent
comme avant. Vérifiez vos entrées avant la mise à jour.

**Pour un Studio Server**, rien à configurer. Un Solve ou une autre vérification ne garde plus le verrou de l'instance
pendant que le worker tourne : les enregistrements et les chargements de page de l'équipe passent tout de suite. Un
import Git ou une mise à jour du moteur le prend désormais, donc une lecture faite entre-temps ne mélange jamais deux
révisions. Une écriture qui réutilise l'identifiant d'opération d'un autre membre est appliquée, et deux exécutions de la
CLI qui demandent un jeton en même temps ne plantent plus. Les bibliothèques de connexion passent à `jose@6.2.15` et
`openid-client@6.8.9`.

**Pour l'hébergeur d'un Bridge**, rien à configurer. Le journal survit à un disque presque plein (une réécriture échoue
avant son renommage, un ajout raté reprend sa ligne coupée), et les flux ouverts sont indexés par joueur : environ 6 ms
par passage au lieu de 580 pour 10 000 flux.

**Pour l'hébergeur d'un connecteur**, le `perMinutePerIp` du webhook e-mail et du point d'accès Open Badges compte une
adresse IPv6 par son /64, comme le Bridge depuis la 4.7.2, donc leurs compteurs repartent une fois de zéro. Un e-mail dont
le sujet est un seul mot qui ressemble à un code d'appairage (`Treasure`, `Thursday`) est de nouveau lu comme une réponse.

**Pour un mainteneur**, la commande de release juge chaque contrôle avant de rien faire et ne relance jamais un verdict de
mutation, et `prepare` remet le budget de première visite du jeu mesuré à sa mesure plus 2 Ko. La CI installe par une
seule action de mise en place dont le `npm ci` attend la fin d'un hoquet du registre, saute les jobs que le plan épargne,
écrit une seule fois les jobs de mutation (leurs vérifications s'appellent désormais `mutation / …`), et lance
`e2e:portrait`, le contrôle des spoilers de la démo du site et, quand un connecteur ou le Bridge change, les connecteurs
depuis leur archive. La nightly saute un commit déjà testé et dit comment la relancer à la main ; le workflow
hebdomadaire `prove` a disparu. [`CHANGELOG.md`](../../CHANGELOG.md) détaille chaque changement.

<a name="from-4-7-3-to-4-7-4"></a>
<!-- applies: 4.7.4.. -->

## De la 4.7.3 à la 4.7.4 « Signposts »

Rien à changer dans un jeu : il se construit, se joue et se sauvegarde comme en 4.7.3. La 4.7.4 rend les boutons
d'outils plus lisibles sur ordinateur, fait passer le Studio Server à des versions plus récentes de ses bibliothèques de
connexion et corrige deux étapes des outils de release.

**Dans un jeu**, sur ordinateur : survoler un outil (la carte, la pause, la musique, un personnage à incarner) écrit son
nom dans la ligne de phrase à la place de « Aller vers », le même texte que son infobulle. Dans un jeu à plusieurs
personnages jouables, plus de trois outils visibles se rangent désormais sur deux colonnes à côté du sac au lieu d'une,
et les boutons gardent leur taille (les icônes de la démo faisaient 11 px de haut en 1024 × 640, 30 maintenant) ; le
sac cède la largeur d'un bouton. Un jeu qui n'a que les boutons carte, pause et musique reste tel quel, et rien ne
change sur un téléphone.

**Pour un Studio Server**, rien à configurer : les bibliothèques de connexion passent à `jose@6.2.18` et
`openid-client@6.9.0`, dans son verrou versionné.

**Pour un mainteneur**, empaqueter avec npm 12 s'arrête quand une archive du Bridge, des connecteurs ou du Studio Server
a perdu son `npm-shrinkwrap.json`, et `scripts/sbom.mjs` refuse une telle archive au lieu de construire son SBOM depuis
le verrou racine ; le candidat empaquette toujours avec npm 10, donc ce qui est publié ne change pas. Le marquage `next`
de `prepare` écrit maintenant la version dans `wiki/data/*.json` aussi, puis vérifie chaque page générée contre sa
source. Les contributeurs passent à Playwright 1.65.1 (l'image Linux des navigateurs de la CI avec lui), Vite 8.3.8,
Vitest 5.1.1, Biome 2.6.8 et knip 6.46.1 : lancez `npm ci`. [`CHANGELOG.md`](../../CHANGELOG.md) détaille chaque
changement.
