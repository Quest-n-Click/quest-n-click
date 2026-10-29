# Notes de mise à jour : 4.6

Ce que la 4.6.0 « Routes » a changé. Rien à modifier dans un jeu : il se construit, se joue et se sauvegarde comme en
4.5.6. Un jeu sans route n'a pas d'horloge du monde : son empreinte logique, ses sauvegardes de référence et ses sessions
restent les mêmes.

La mise à jour elle-même est décrite dans [Mettre à jour](install.upgrade.md).

<a name="from-4-5-6-to-4-6-0"></a>
<!-- applies: 4.6.0.. -->

## De la 4.5.6 à la 4.6.0 « Routes »

Installez `@quest-n-click/engine@4.6.0` ([Installer depuis npm](install.from-npm.md)). Ce qu'un jeu peut utiliser, à
chaque fois en option :

- **Les routes** ([Routes](create.routes.md), ADR 0031) : un script du jeu avec `route: { who, from, steps }` mène un
  personnage de point en point et par les sorties, à l'horloge du monde, affiché ou non. Le clic du joueur le retient,
  une sortie fermée le retient, et `while` faux l'immobilise là où il est.
- **`suspendScript` et `resumeScript`**, pour tout script : un script suspendu garde son étape, et une route suspendue
  garde aussi sa position et l'attente restante.
- **Les points de route dans les layouts** (`points`), placés dans l'éditeur sous « Entry and route points ».
- **`validate`, le lint et le solveur connaissent les routes** : quatre codes de lint (`route-script-conflict`,
  `route-never-starts`, `route-blocked-forever`, `route-resume-misplaced`), et un choix « Route <id> » dans les chemins
  du solveur.
- **La recherche de chemin est passée dans le cœur** (`core/nav/walk.ts` de `@quest-n-click/engine`) ; le lecteur la
  réexporte, donc un import depuis `dom/walk` fonctionne toujours.

**Pour un jeu qui utilise des routes**, une sauvegarde gagne `world` et `scripts.<id>.route`, et une session gagne `wt`
et les entrées `{ world }` et `{ routeDo }`. Une sauvegarde 4.5 se charge (ses routes commencent à partir d'elle), mais
un moteur 4.5 ne comprend pas une session 4.6 avec des routes.

**Pour le TypeScript d'un projet**, `ScriptDef` est désormais une union, `CmdScriptDef | RouteScriptDef`. Du code qui
lisait `script.do` sur n'importe quel script vérifie d'abord qu'il s'agit d'un script de commandes (`if (s.do)`) ; les
`scripts` d'une salle restent des `CmdScriptDef[]`.

**Pour les contributeurs**, les 131 exemptions de mutation dues à la 4.6.0 ont été relues (`docs/dev/MUTANTS.md`), et la
CI a un job `routes` (Chromium et WebKit).
