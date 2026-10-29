# Routes : la tournée d'un personnage à travers les salles

Donnez un itinéraire à n'importe quel personnage : marcher jusqu'à un endroit, attendre, passer une porte vers la salle
suivante, et ainsi de suite, à l'horloge du monde, que le joueur regarde ou non. Le joueur peut le croiser, le suivre,
lui parler ou profiter de son absence pour une énigme.

<a name="what-you-get"></a>

## Ce que vous obtenez

Un personnage qui fait sa tournée à travers plusieurs salles et continue hors champ. Il s'arrête quand le joueur lui
parle, attend devant une porte fermée et reprend sa tournée après un détour que l'histoire lui impose. Les sauvegardes
et les rejeux gardent l'endroit où il se trouve, et le solveur prouve que les occasions qu'il ouvre restent ouvertes.

<a name="context-and-versions"></a>

## Contexte et versions

- Un projet créé (`game/`) ou le dépôt du moteur (`games/<id>/`).
- À partir de la 4.6.0 « Routes » (ADR 0031). Sur un moteur plus ancien, un personnage ne change de salle qu'avec
  `moveActor` ([Faire bouger les personnages](create.moving-characters.md)).
- L'exemple jouable est `games/routes` (« Lou's Rounds ») : `GAME=routes npm run dev` dans le dépôt du moteur.

<a name="prerequisites"></a>

## Prérequis

- Le personnage déclaré avec une `room` (sa salle de départ) et une pose `walk`
  ([Faire bouger les personnages](create.moving-characters.md#prerequisites)).
- Un acteur pour ce personnage dans **chaque salle** que la route traverse, et une zone de marche dans chacune
  ([géométrie](create.geometry.md)).
- Les sorties que prend la route, déclarées dans les salles ([salles](create.rooms.md)).

<a name="where-to-run"></a>

## Où lancer les commandes

- La route s'écrit dans `game.ts` (`scripts`) et les points dans les layouts, que vous placez dans l'éditeur
  (`?edit=<salle>`, ou l'onglet Salles du Studio).
- Vérifiez depuis la racine du projet : `npm run validate`, `npm run solve` et `npm run lint` dans le dépôt du moteur,
  ou `npx quest-n-click validate`, `solve` et `lint` dans un projet créé.

<a name="steps"></a>

## Étapes

<!-- step: points -->
1. **Placez les points.** Dans l'éditeur, ouvrez la salle, tapez un nom dans « Entry and route points », appuyez sur
   « Add a route point » et faites glisser le point là où le personnage s'arrête. Le layout le garde sous `points`.
   Une route ne contient jamais de coordonnées : elle nomme des points, et la géométrie reste dans le layout.

<!-- step: route -->
2. **Écrivez la route** dans `game.ts`, parmi les `scripts` du jeu (une route appartient au jeu, jamais à une salle).
   `who` est le personnage, `from` la salle de la première étape, et chaque étape a un `id` stable et fait une seule
   chose :
   - `walk` vers un point de la salle où elle se trouve ;
   - `wait` un nombre de millisecondes, avec un `face` ou une `pose` facultatifs ;
   - `exit` par l'une des sorties de la salle, vers la salle où elle mène, à son entrée.

   ```ts
   scripts: [
     {
       id: 'rounds',
       loop: true,
       route: {
         who: 'neighbor',
         from: 'hall',
         steps: [
           { id: 'desk', walk: 'desk' },
           { id: 'paperwork', wait: 3000, face: 'left' },
           { id: 'out', exit: 'out' },
           { id: 'stalls', walk: 'stalls' },
           { id: 'inspect', wait: 2500, face: 'right' },
           { id: 'to-kitchen', exit: 'kitchen_door' },
           { id: 'hello', walk: 'hello' },
           { id: 'chat', wait: 2500, do: [{ if: { room: 'kitchen' }, then: [{ say: ['neighbor', 'Evening, Grandma!'] }] }] },
           { id: 'to-street', exit: 'windows' },
           { id: 'home', exit: 'hall_door' },
         ],
       },
     },
   ],
   ```

   La salle de chaque étape se déduit de `from` et des sorties qui la précèdent. Une route `loop` doit finir dans `from`.

<!-- step: occasion -->
3. **Faites de son absence l'énigme.** Les règles lisent où se trouve le personnage, comme pour tout personnage mobile :
   `{ actorIn: ['neighbor', 'hall'] }`. Par exemple, la carte ne se fouille que pendant que Lou est sorti :
   `if: { all: ['!cable_taken', { not: { actorIn: ['neighbor', 'hall'] } }] }`.

<!-- step: arrival -->
4. **Réagissez à une arrivée** avec le `do` de l'étape : il s'exécute une fois l'étape faite (arrivé, attendu, entré).
   Les commandes d'arrivée passent une route à la fois, jamais pendant l'action du joueur, et la route les attend.
   Protégez une réplique par `{ if: { room: '…' } }` quand elle n'a de sens que si le joueur est là.

<!-- step: control -->
5. **Changez la routine depuis l'histoire.**
   - `{ suspendScript: 'rounds' }` arrête la route là où elle en est (son étape, sa position, l'attente restante).
   - `{ resumeScript: 'rounds' }` la reprend.
   - `{ startScript: 'detour' }` démarre une autre route du même personnage et suspend celle qu'il suivait.
   - Une route marquée `manual: true` ne démarre que de cette façon.
   - Un détour doit ramener le personnage dans la salle de l'étape suspendue avant de la reprendre, par exemple avec une
     dernière étape dont le `do` est `[{ resumeScript: 'rounds' }]`.
   - `while` immobilise une route tant qu'il est faux ; contrairement à un script, il ne la rembobine jamais.

<!-- step: door -->
6. **Fermez-lui une porte.** Une étape `exit` ne passe que si le `if` de la sortie est vrai. En attendant, le personnage
   attend devant la porte et la franchit au tick où elle s'ouvre. Un lien de marche dont le `if` est faux
   (`stage.links`) le retient de la même façon.

<!-- step: check -->
7. **Vérifiez.** `validate` signale un point, une sortie ou un acteur manquant dans la salle où l'étape se joue, une
   boucle qui ne revient pas à `from` ou ne progresse jamais, et deux routes automatiques pour un même personnage.
   `solve` laisse passer le temps jusqu'au prochain arrêt d'une route (le choix « Route <id> » dans un chemin). `lint`
   ajoute les quatre codes ci-dessous.

> [!GUARANTEE id=routes-clock-steps]
> Le monde avance par ticks entiers : `n` ticks d'un coup laissent exactement le même état que `n` ticks un par un, donc
> une partie ne dépend pas de la fréquence d'images.

> [!GUARANTEE id=routes-offscreen]
> Une route continue que sa salle soit affichée ou non : après les mêmes ticks, le personnage est au même endroit et à
> la même étape.

> [!GUARANTEE id=routes-hold]
> Un clic sur un personnage en route le retient du clic jusqu'à la fin de cette action ; les autres routes continuent.

> [!GUARANTEE id=routes-shut-door]
> Une sortie fermée retient le personnage devant elle ; il la franchit au tick qui suit son ouverture.

> [!GUARANTEE id=routes-suspend]
> Suspendue, une route garde son étape, sa position et l'attente restante ; une reprise hors de la salle de l'étape est
> refusée et signalée (`route-resume-misplaced`).

> [!GUARANTEE id=routes-arrival]
> Deux commandes d'arrivée ne s'exécutent jamais en même temps, ni pendant l'action du joueur.

> [!GUARANTEE id=routes-saves]
> Une sauvegarde faite en pleine marche, en pleine attente ou devant une porte fermée se recharge dans le même monde ;
> une sauvegarde d'avant la 4.6.0 se charge, et ses routes commencent à partir d'elle.

> [!GUARANTEE id=routes-replay]
> Une session dont les actions chevauchent l'horloge du monde se rejoue jusqu'au même état.

> [!GUARANTEE id=routes-solver]
> Le solveur laisse passer le temps jusqu'au prochain arrêt d'une route et prouve que les occasions qu'elle ouvre
> restent accessibles.

> [!LIMIT id=routes-no-timing]
> La preuve porte sur les arrêts des routes (quelle étape, quelle salle, retenue ou non), jamais sur le chronométrage.
> Deux chemins qui ne diffèrent que par l'endroit où un personnage se trouve au milieu d'une marche sont un seul état
> pour le solveur.

> [!LIMIT id=routes-frozen]
> Le monde s'arrête dans le menu pause, pendant une cinématique, un mini-jeu ou une transition de salle, et quand la
> page est cachée. Rien n'est rattrapé ensuite : une heure en arrière-plan n'est pas marchée. Une image lente perd au
> plus 250 ms de monde.

> [!LIMIT id=routes-overlap]
> Une session se rejoue exactement quand ses entrées ne se chevauchent pas. Une étape de script ordinaire encore en
> cours pendant que le joueur agit est rejouée après cette action, comme avant la 4.6.0.

<a name="expected-result"></a>

## Résultat attendu, et comment le vérifier

- Dans le jeu, le personnage fait sa tournée, et on le trouve là où son horloge l'a mené quand on entre dans une salle.
- `npm run solve` termine, avec des étapes « Route <id> » là où attendre compte, et `npm run solve -- --prove` dit que
  la fin reste accessible depuis chaque état.
- `GAME=routes npm run e2e -- <url> --prod` joue l'exemple dans un navigateur : la retenue, le menu qui fige, l'absence,
  un rechargement en pleine tournée, la porte fermée.

<a name="common-errors"></a>

## Erreurs fréquentes

| Symptôme | Cause | Solution |
|---|---|---|
| `no point "x" in the layout of "room"` | Le point est placé dans une autre salle, ou nulle part | Placez-le dans la salle où l'étape se joue (celle qu'atteignent les sorties qui la précèdent) |
| `<who> has no actor in room "room"` | Le personnage n'a pas d'acteur là où la route l'emmène | Ajoutez-lui un acteur dans cette salle et placez-le |
| `loop route "id" ends in "room", not in "from"` | Les dernières sorties ne ramènent pas au départ | Ajoutez les étapes de sortie jusqu'à `from` |
| `two automatic routes for <who>` | Deux routes d'un même personnage démarrent avec le jeu | Marquez le détour `manual: true` et démarrez-le avec `startScript` |
| `route-resume-misplaced` dans `solve` ou `lint` | Une reprise alors que le personnage est dans une autre salle | Finissez le détour dans la salle de l'étape suspendue, puis reprenez |
| `route-script-conflict` | Un script ou une règle déplace le personnage (`walk`, `place`, `moveActor`) alors que sa route peut tourner | Suspendez d'abord la route, reprenez-la quand le personnage est revenu |

<a name="files-changed"></a>

## Fichiers ou données modifiés

- `game.ts` (`scripts`) et `layout/<salle>.json` (`points`).
- Une sauvegarde gagne `world` (l'horloge, en ticks) et, pour chaque route, `scripts.<id>.route` (l'attente restante,
  retenue devant une porte, commandes d'arrivée en attente) et `paused`.
- Une session enregistre les ticks du monde à chaque point de synchronisation d'une entrée (`wt`), et deux entrées :
  `{ world }` et `{ routeDo }`.

<a name="recovery"></a>

## Reprise ou retour arrière

- Retirer une route est un changement de contenu comme un autre. Une ancienne sauvegarde laisse le personnage où il
  était, et une sauvegarde dont l'étape de route a disparu abandonne l'état de cette route au chargement
  (`save adjusted after a content update`).
- Pour renommer une étape, utilisez `renameScriptStep` dans une migration ([État et sauvegardes](create.state-saves.md)).

<a name="references"></a>

## Références

- `docs/dev/adr/0031-npc-routes.md`, `docs/dev/PLAN-4.6-ROUTES.md`
- `src/engine/core/route-runtime.ts` (l'horloge et les routes), `src/engine/core/nav/walk.ts` (la recherche de chemin),
  `src/engine/dom/world-loop.ts` (les images et le gel)
- `src/engine/tools/validate/routes.ts`, `src/engine/tools/lint-routes.ts`
- `games/routes/` (l'exemple), `tests/route-runtime.test.ts`, `tests/route-solve.test.ts`
