# Publier une release

Comment une version de quest'n'click se fabrique, pour le mainteneur : un candidate run sur main, un tag signé qui le
nomme, une release qui publie les fichiers de ce run sans rien reconstruire, puis une relecture. Les commandes sont
`npm run ship -- …` ([`tools/release/ship.mjs`](../../tools/release/ship.mjs)) ; chacune écrit son PID dans
`.cache/pids/ship-<commande>.pid` (`SHIP_PIDS` choisit le dossier) : pour en arrêter une, on arrête ce PID, pas un
motif.

<a name="what-you-get"></a>

## Ce que vous obtenez

Une release GitHub `v<version>` publiée et immuable, construite depuis le commit que la CI et le candidat ont testé,
avec ses archives, manifestes, SBOM, sommes et attestations de provenance, relue par `ship verify` ; à partir de la
4.5.0, sa documentation publiée après cette relecture.

<a name="context-and-versions"></a>

## Contexte et versions

Dans le dépôt du moteur, par le mainteneur (il faut l'accès en écriture, la clé de signature et les réglages du
dépôt). La chaîne est celle de la 4.1.20 « Last Mile » (plan §11) ; les tags sont signés depuis la 4.2.0. Cette page
vaut à partir de la 4.2.0.

<a name="prerequisites"></a>

## Prérequis

- La CLI GitHub `gh`, connectée en tant que mainteneur.
- Les réglages du dépôt activés une fois ([plus bas](#maintainer-settings)) : releases immuables et ruleset de tags.
- La clé de signature configurée ([plus bas](#signing)).
- La section du CHANGELOG de la version assemblée depuis les fragments `changes/` (le travail de la branche de release,
  [Conventions](contribute.conventions.md)), et la fiche des passes des personnes commencée
  ([Passes de terrain](contribute.field-passes.md)). `ship tag` refuse un commit sans cette section (4.5.3) : fusionnez
  la pull request de release, puis taguez son commit de fusion.
- Un remote git pour `Quest-n-Click/quest-n-click` : `ship tag` récupère depuis celui dont l'URL le nomme et y pousse,
  `upstream` quand `origin` est votre fork (4.5.3).

<a name="where-to-run"></a>

## Où lancer les commandes

Dans le dépôt du moteur, sur la machine du mainteneur, sur un `main` à jour. La release elle-même tourne sur GitHub
Actions (`.github/workflows/release.yml`), lancée par le push du tag (depuis la 4.5.3 ; par le run `ci` du tag
avant). Le tag ne lance aucun `ci` à lui : le candidat est la seule passe de tests de la release, et le `ci` de main
sur le même SHA est l'autre chose que release.yml vérifie.

<a name="steps"></a>

## Étapes

<a name="prepare"></a>

### Préparer la pull request de release

Depuis la 4.5.4, une commande la fait, sur un `main` à jour :

```sh
npm run release -- prepare 4.5.4 --name="Simple release"   # --dry-run liste les étapes, --no-pr ne pousse rien
```

Elle refuse, avant d'écrire quoi que ce soit : une version qui n'est pas un `x.y.z` supérieur à celle de
`package.json`, des changements non commités, une autre branche, un clone superficiel, un `main` qui n'est pas celui de
l'organisation (en retard ou en avance, ou aucun remote ne nomme le dépôt de l'organisation), aucun fragment dans
`changes/`, une nouvelle mineure dont la page de notes de mise à jour n'existe pas encore, un nom de release que les
fichiers ne peuvent pas contenir tel quel (4.5.5, #348 : un nom avec ``( ) [ ] " « » ` \ $ < > |``, que le lien de release
du README, les guillemets du CHANGELOG ou la commande qu'elle affiche casseraient), une dernière fiche de passes sans
son marqueur `<!-- field:begin -->` (le tableau qu'elle recopie commence là), et, sauf `--no-pr`, nulle
part où pousser (votre fork : `origin` quand c'en est un, sinon le seul fork parmi les remotes ; le dépôt de
l'organisation quand aucun fork n'est un remote, une branche, jamais `main`) ou un `gh` non connecté. Puis, sur la branche `release/<version>`, elle fait ce qu'une
branche de release faisait à la main, dans cet ordre : la version (`npm version --no-git-tag-version`), les pairs
engine des verrous (sur une nouvelle mineure, chaque verrou versionné prend le pair `@quest-n-click/engine` de son
manifeste, et rien d'autre n'y bouge ; 4.7.0, #410 : le verrou du Studio Server de la 4.6.0 gardait `4.5.x`), la section du
CHANGELOG et les entrées du LOG depuis les fragments (`npm run changes -- --assemble --version=<version>`, qui crée son
`## Unreleased`, replie un `.log.md` seul et écrit la version à la place de la marque `next` de chaque fragment),
l'entrée de release du LOG, les consignations en attente des branches versées dans `wiki/translations.json` et
`wiki/reviews.json` (`npm run wiki -- acks --fold` ; ce qui ne tient plus à son texte est affiché, et repris dans
l'arrêt), la marque `next` écrite comme la version dans le wiki et les commentaires du code (4.7.1, #443) et dans `wiki/data/`,
les sources des parties générées du wiki, qui sont ensuite vérifiées contre elles (next, #550), les
enregistrements des paires et des garanties touchées reportés pour que rien ne reste à relire (étape `next mark`,
`tools/next-mark.ts` ; [Conventions](contribute.conventions.md#next-mark)), la section des notes de mise à jour (en et fr ; une section déjà écrite à l'avance
sous son ancre est gardée, jamais doublée, et les puces du CHANGELOG de la release vont dans un commentaire à sa fin
pour son auteur, 4.7.0), les pages de
transition, la sauvegarde de référence (listée dans `tests/fixtures/saves/index.json`), le run de référence, la fiche
des passes et `passIssues`, la ligne de release actuelle du README (à la place de la précédente, 4.7.0), la
ligne de base de qualité, avec le budget de première visite du jeu mesuré (`initialJsKB`) remis à sa mesure plus 2 Ko
(4.7.3, [Référence de qualité](contribute.quality-baseline.md#context-and-versions)) ; un commit, les relectures
humaines des docs, puis la pull request.

Sa récupération (`fetch`) du `main` de l'organisation est tentée quatre fois, à 15 s d'intervalle, chaque essai raté
signalé, avant qu'elle s'arrête (4.7.0, #410 : pendant la release de la 4.6.0, une seule connexion SSH refusée se lisait
« main is not the organisation's »). Elle reste sur `release/<version>`, où les corrections de la relecture se
commitent pendant que la pull request est ouverte, et finit en donnant le chemin du retour pour la commande de release :
`git switch main && git pull --ff-only <le remote de l'organisation> main`.

Si une étape échoue, elle s'arrête et dit quoi faire : avant le commit, rien n'a été poussé (`git reset --hard`,
`git clean`, retour sur `main`, la branche supprimée : elle affiche les commandes) ; après, elle affiche le
`git push` et le `gh pr create` à lancer à la main.

Elle écrit la prose dont elle tient les faits (4.7.1, #410), et `TODO(release)` là où une phrase demande une personne :

- l'entrée de release du LOG : ses puces depuis les données de chaque étape (les pull requests fusionnées depuis le
  tag précédent, par numéro et titre ; les fragments et le commit de `main` ; la section des notes de mise à jour,
  écrite à l'avance ou ajoutée ; les consignations reprises par le versement, celles d'une personne nommées ; les
  fixtures ; les passes face à celles de la version précédente ; la signature). Son titre, sa demande et son `→ next`
  restent des `TODO(release)` ;
- l'intro du CHANGELOG et la ligne de release actuelle du README, depuis les lignes `### Release` des fragments (et
  `README.fr.md` depuis leurs `### Release (fr)`, quand chaque fragment qui a une ligne a sa version française) : un
  `TODO(release)` quand aucun fragment n'en donne ([Conventions](contribute.conventions.md#changes-fragments)) ;
- l'intro de la fiche des passes quand aucune passe ne change, sinon un `TODO(release)` qui nomme les passes ajoutées
  ou retirées ;
- l'ouverture des notes de mise à jour reste un `TODO(release)` quand elle ajoute la section ; une section écrite à
  l'avance n'en a pas.

Un `TODO(release)` cité comme
du code, entre accents graves ou dans un bloc délimité, est une citation et non un marqueur (4.5.5, #364) : une entrée
du CHANGELOG qui parle des marqueurs, copiée dans les notes de mise à jour, n'est jamais comptée comme à écrire.

Avant de pousser (depuis la 4.5.5), elle vérifie ce sur quoi la CI de la pull request de release échouerait : un
`TODO(release)` restant (les mêmes marqueurs que compte `check`), les relectures humaines des docs
(`wiki -- check --publish --reviews-only`, une claim ou une paire qu'une personne doit encore lire), et les tests qui
dépendent de la version (4.7.1, #443 : `tests/mutants-json.test.ts`, `tests/quality-baseline.test.ts`,
`tests/readme-truth.test.ts`, `tests/readme-release.test.ts`, moins d'une seconde ; ils passent sur chaque pull request
à la version de `package.json` et ne peuvent échouer qu'une fois que la release nomme la sienne, comme l'ont fait les
entrées de `mutants.json` dues et la première visite écrite dans un test de la 4.7.0). Quand il reste
quelque chose, elle s'arrête là et sort avec 1 : rien de poussé, pas de pull request, la branche commitée dans votre
checkout. Un seul arrêt liste tout : chaque `TODO(release)` avec son fichier, sa ligne et sa consigne, les exemptions
de mutation dues à la version, chacune nommée, avec la suite (4.7.1, #410 : relire chacune, la garder avec une relecture
plus tardive ou la retirer, puis `npm run test:mutation:core -- --doc` ; ne déplacer que les relectures garde le cache
de mutation de chaque ensemble), puis chaque relecture avec sa commande, puis chaque test en échec. Sur la branche locale, écrivez la prose vous-même ou demandez-la à votre assistant IA, avec
ces marqueurs comme consigne, et relisez le diff ; enregistrez les paires de traduction qui ont changé
(`npm run wiki -- check` donne chaque commande) ; une personne lit chaque claim ou paire et tape sa commande de
relecture (`prepare` n'écrit jamais de prose, n'enregistre jamais une relecture et n'appelle aucune IA). Commitez, puis
relancez la même `npm run release -- prepare <version> --name="…"`. Sur `release/<version>`, avec `package.json` à la
version, le commit préparé sur la branche et rien de non commité, elle reprend là : quand il ne reste rien, elle pousse
et ouvre la pull request, et sa CI ne tourne qu'une fois. Tout autre état de cette branche est refusé, avec la façon de
repartir de `main`. Pour voir les relectures plus tôt, lancez `npm run release -- check <version>` sur `main` : son
point sur les relectures humaines des docs liste les claims et les paires encore à relire (les points sur la release
elle-même y échouent, comme il se doit avant `prepare`).

Elle ne lance aucun workflow quand elle pousse (4.7.1, #410). De la 4.5.5 à la 4.7.0, elle lançait le préchauffage du
cache de mutation de `main` ; il prend environ 110 minutes, et en 4.6.0 comme en 4.7.0 la pull request a été fusionnée
24 et 52 minutes après `prepare` : le candidat mesurait donc les mêmes longs morceaux à côté de lui. L'étape de cache du
candidat reprend et enregistre elle-même les mêmes clés. Quand la relecture durera plus de deux heures environ, lancez
le préchauffage à la main pendant ce temps (le corps de la pull request donne la commande, de même que `--no-pr`, qui
ne pousse rien) : `gh workflow run nightly --repo <le dépôt de l'organisation> --ref main -f jobs=mutation`.

Pour vérifier la branche à tout moment :

```sh
npm run release -- check 4.5.4
```

Elle dit, point par point, si `package.json` est à la version, si le CHANGELOG a sa section, si la fiche de passes
`docs/dev/passes/<version>.md` et la sauvegarde de référence (son entrée dans `tests/fixtures/saves/index.json` et son
fichier) sont là (4.5.5, #348), s'il reste un
`TODO(release)`, si `npm run wiki -- check` avertit, si les relectures humaines des docs tiennent
(`wiki -- check --publish --reviews-only` : une claim ou une paire qu'une personne doit lire, chacune affichée avec sa
commande), si la ligne de base de qualité tient, et si les tests qui dépendent de la version passent (4.7.1, #443). La CI de la pull request de release la lance aussi, avec la
version que nomme sa branche : fusionnez quand chaque point est ✔, et le merge lance le candidat.

<a name="release-command"></a>

### La release : une commande

Une fois la pull request de release fusionnée, sur un `main` à jour :

```sh
npm run release -- 4.5.4          # --dry-run affiche le rapport des barrières et ne fait rien ; --key=<clé.pub> si git signe autrement
```

Avant de rien faire (4.7.3, #471), elle juge chaque barrière qui pourrait l'arrêter plus tard et les affiche ensemble,
une ligne chacune : les vérifications préalables ci-dessous, la `ci` de main sur le commit de release (ce que `ship
tag` attend), les barrières humaines de la doc sur l'arbre de ce commit, son candidat, et ce que `ship tag` vérifie
lui-même (la section du CHANGELOG à ce commit, le tag stable précédent ancêtre de ce commit, les releases immuables
activées). `✔` passe ; `…` est attendu (un candidat ou la `ci` de main qui tourne encore, ou en échec à sa première
tentative et dû pour son unique relance, la commande de relance affichée) ; `⚠` continue avec un avertissement
(`--docs-revision`) ; `✖` refuse ; `–` n'a pas été vérifié (pas de commit de release, `gh` non connecté). Un seul `✖`
et rien n'est fait : chaque barrière rouge est nommée, pas seulement la première rencontrée, puis une ligne `next:`.
Quand le candidat du commit de release manque, ou est rouge sans relance (annulé par un candidat plus récent de la
version, ou rouge après sa relance), le rapport cherche un commit plus récent de main toujours à la version et le
nomme, avec le run de son candidat quand l'un est vert ou en cours, et la commande en entier (le second arrêt de la
4.7.2 disait `--commit=<its sha>` sans le SHA) :

```text
the gates of 4.7.2, release commit 25929cd, before anything is done:
  ✔  preflight: main at 4.7.2, up to date and clean, its CHANGELOG section, the signing key in allowed_signers, gh and npm (lostinbrittany) signed in
  ✔  main's ci on 25929cd: green (run 42522822757)
  ✔  the docs' human gates on 25929cd: they hold
  ✖  the candidate of 25929cd: candidate run 42522822642 was cancelled after connector-archive-e2e failed (…): a later candidate of 4.7.2 cancels a red one, and this one is not re-run. A later candidate of 4.7.2 is green on 39dbd36 (run 42638395971, …): npm run release -- 4.7.2 --commit=39dbd360…
  ✔  tag: CHANGELOG section at 25929cd, v4.7.1 is an ancestor, immutable releases on
✖  1 gate refuses (candidate): nothing was done
   next: npm run release -- 4.7.2 --commit=39dbd360…
```

Elle ne choisit jamais ce commit d'elle-même : le commit de release est celui que la pull request de release a
fusionné, et en publier un plus récent livre ce qui a été fusionné après lui, ce qui revient au mainteneur
(`--commit`, plus bas). `--dry-run` affiche le même rapport et ne fait rien d'autre (sauf le worktree temporaire de la
doc) ; son code de sortie est le verdict, 0 quand aucune barrière ne refuse (attentes comprises) et 1 quand l'une
refuse : lancez-la d'abord pour savoir si une release passerait.


Elle refuse d'abord ce qui échouerait plus tard (`package.json` pas à la version, une autre branche (sur
`release/<version>`, où `prepare` la laisse, le refus donne la ligne à lancer : `git switch main && git pull --ff-only
<le remote de l'organisation> main`), des changements non commités, un `main` qui n'est pas celui de l'organisation, pas de section dans le CHANGELOG, pas de clé de
signature SSH, `gh` ou `npm` non connectés, un utilisateur npm qui n'est pas propriétaire). Puis elle trouve le
candidat que le merge a lancé sur ce commit (`--start-candidate` en lance un s'il n'y en a pas) et l'attend (environ
90 minutes), en disant combien de jobs sont faits et lesquels tournent à chaque changement et toutes les cinq minutes,
en relançant une fois ses jobs en échec (le run entier s'il a été annulé avant qu'un job échoue ; jamais un verdict de
mutation, plus bas). Cette fois est celle
du run : son numéro de tentative dit qu'il a été relancé, par la commande ou à la main, si bien qu'une relance de la
commande ne le relance jamais une seconde fois (4.5.5, #348) ; il en va de même pour la relance de la `ci` de main par
`ship`. Une tentative qui tourne encore au bout de 3 heures arrête la commande, avec le lien du run et la même
commande pour reprendre ; puis `ship tag … --sign` : la `ci` de main, le tag signé poussé sur le dépôt
de l'organisation ; puis elle suit l'exécution de release job par job jusqu'à ce que `release` et `npm-stage`
réussissent (les jobs de la documentation sont signalés, jamais attendus : un problème de doc ne retient jamais npm),
vérifie les fichiers de la release, et approuve les paquets npm que la release a mis en attente, chacun avec votre 2FA
dans votre terminal, l'engine d'abord ; puis un résumé. Le commit de release est celui où `package.json` est passé à la
version sur main (ou celui du tag, une fois poussé), si bien que ce qui est fusionné entre-temps ne le déplace pas. Si
elle s'arrête, relancez-la : un candidat vert n'est pas attendu de nouveau, un tag déjà poussé est suivi, une
release que `ship verify` a déjà validée n'est pas vérifiée de nouveau (4.5.5, #343 : même tag, même release, mêmes
empreintes des fichiers, la release immuable, tel que noté dans `.cache/release/v<version>.verified.json` ;
`--reverify` la vérifie quand même), un paquet
déjà sur npm n'est pas approuvé de nouveau ; une exécution de release en échec (son job `release` ou `npm-stage`) se
relance d'abord, et la commande affiche la relance qui convient (4.7.0, #410) : `gh run rerun <id> --failed` quand un
job a échoué, a été annulé ou a dépassé son délai, `gh run rerun <id>` (tous les jobs) quand aucun n'a tourné. Le run
41819835975 de la 4.6.0 n'a jamais créé son job `release` et a sauté les trois suivants : `--failed` n'aurait rien
relancé. Les étapes réseau de Git (sa récupération du `main` et des tags de l'organisation, les récupérations de `ship
tag` et la poussée de son tag) sont tentées quatre fois, à 15 s d'intervalle, chaque essai raté signalé, avant que la
commande s'arrête (4.7.0) : ce sont des lectures, et un tag poussé de nouveau sur le même objet est « up to date ». Une pré-release (`-rc.N`) se tague à la main
(`ship tag`, plus bas). La chaîne ci-dessous est ce qu'elle lance, pour quand une étape doit se
faire à la main.

Ses vérifications préalables passent aussi les barrières humaines de la doc sur le commit de release lui-même (4.5.5,
#339), dans un worktree temporaire de ce commit, puisque `main` peut déjà être en avance sur lui. Une affirmation ou
une paire fusionnée après la CI de la pull request de release se voit là, avant toute attente, et non plus dans
`docs-publish` une heure après le tag (l'`import-layout-merges` de la 4.5.4). L'arbre de ce commit ne peut plus
recevoir de relecture, donc la commande s'arrête avec chaque point en attente, sa commande, et la seule suite possible :
`npm run release -- <version> --docs-revision` publie comme d'habitude, npm compris, et la doc suit en révision une
fois la release sortie :

```sh
# dans le dépôt du moteur
git switch -c docs/<version> v<version>
# enregistrer chaque relecture que l'arrêt a listée (elles vont dans changes/<version>.acks.json), commiter
git push <le remote de l'organisation> docs/<version>
gh workflow run docs-publish --ref docs/<version> -f mode=revision -f version=<version>
```

Quand le candidat échoue encore après son unique relance, l'arrêt donne les deux suites possibles (4.7.0, #410) : un
échec qui passe au second essai, relancez-le à la main (la commande affichée) puis relancez la commande de release ; une
correction fusionnée sur main après le merge de release (le cas de la 4.6.0 : le plancher de couverture, #411, corrigé
par #412), publiez sur ce commit avec son propre candidat :

```sh
git log --first-parent --oneline <le remote de l'organisation>/main   # nomme le merge de la correction
npm run release -- <version> --commit=<sha du merge de la correction> --start-candidate
```

Un verdict de mutation n'est jamais relancé (4.7.3, #471). Un shard de mutation rouge sur des survivants que
`docs/dev/mutants.json` ne nomme pas (ou sur une de ses entrées qui ne tient pas) échoue de la même façon à chaque essai :
son verdict ne dépend que de ses entrées. Le candidat 42527046788 de la 4.7.2 a pourtant été relancé, et a passé 72
minutes à faire échouer de nouveau les six mêmes shards. Un tel shard le dit désormais dans une annotation
`mutation verdict` de son job (écrite par `candidate.yml` depuis le rapport du shard,
`tools/release/mutation-verdict.ts`), et la commande la lit : elle s'arrête à la première, alors que le run tourne
encore, et ne relance jamais le candidat, même quand d'autres jobs sont rouges à côté. L'arrêt liste chaque shard rouge et ses
survivants (`fichier:ligne opérateur: avant → après`), les autres jobs rouges, puis la suite : tuer chaque survivant par
un test, ou le nommer ([Tests de mutation](contribute.mutation-testing.md)), fusionner la correction sur main, puis
publier ce merge avec son propre candidat. Le rapport des barrières le dit d'abord, sur la ligne du candidat, si bien
que `--dry-run` le montre avant que rien ne soit attendu :

```text
  ✖  the candidate of 5fc74d4: candidate run 42527046788: mutation survivors, not re-run (…): a re-run measures the same inputs and finds them again
       ✖ mutation / mutation (studio-auth-1of1): studio-auth shard 1/1: 3 survivors not named in docs/dev/mutants.json
           studio-server/src/server/auth/gate.ts:152 condition true: !flight → true
           studio-server/src/server/auth/gate.ts:162 condition true: !(e instanceof DefinitiveRefusal) → true
           studio-server/src/server/auth/routes.ts:44 operator: > → >=
       ✖ mutation / mutation (runs-1of1): runs shard 1/1: 1 survivor not named in docs/dev/mutants.json
           bridge/src/runs-store.ts:459 condition false: tenantId === undefined → false
       …
       also red: mutation / merge failure, candidate-gate failure (not re-run either: the fix's candidate runs them again)
       Kill each survivor with a test, or name it in docs/dev/mutants.json with its reason (…); merge the fix on main, then: npm run release -- 4.7.2 --commit=<the fix's merge sha> --start-candidate
✖  1 gate refuses (candidate): nothing was done
   next: kill or name each survivor above, merge the fix on main, then npm run release -- 4.7.2 --commit=<the fix's merge sha> --start-candidate
```

Un job de mutation mort autrement (annulé, hors délai, un runner perdu, `npm ci` en échec) n'écrit aucun verdict, et le
candidat garde son unique relance.

Quand la `ci` de main est rouge sur le merge de release lui-même, pour une raison corrigée seulement après lui, la
release ne peut pas reposer sur ce commit : `release.yml` exige une `ci` de main verte sur le commit tagué
(`tools/release/main-ci.mjs`). C'était le cas de la 4.5.5 : le job `windows` de son merge échouait, corrigé par #368
fusionné après lui (4.5.6, #369). `--commit=<sha>` désigne un commit ultérieur de main sur lequel publier à la place,
utilisé partout où l'est le commit de release (les barrières de la doc, le candidat, `ship tag`, l'exécution de
release) :

```sh
gh workflow run candidate.yml --repo Quest-n-Click/quest-n-click --ref main -f sha=<sha>   # si aucun n'a tourné dessus
npm run release -- 4.5.5 --commit=<sha>
```

La commande trouve un candidat par le commit de son exécution, et une exécution lancée à la main sur `main` enregistre
la tête de main à cet instant, quoi que dise `sha` : lancez-la pendant que `<sha>` est la tête de main (ou prenez la
tête de main comme `<sha>`).

Il est refusé, avec ce qu'il faut faire, quand ce n'est pas un SHA que le checkout connaît, quand il n'est pas sur la
lignée des premiers parents de main, quand `package.json` n'y est pas à la version, quand ce n'est ni le merge de
release ni un commit postérieur, ou quand le tag est déjà sorti sur un autre commit. La commande dit quel commit elle
utilise et, quand ce n'est pas le merge de release, elle le signale ; la commande de reprise de chaque arrêt garde
`--commit`. Sans lui, rien ne change.

<a name="the-chain"></a>

### La chaîne

<!-- step: candidate -->
1. **Un candidat sur main.** Depuis la 4.5.4, le merge de la pull request de release le lance, sur le commit de
   merge (un push sur `main` qui change la version de `package.json` ; une mise à jour de dépendance n'en lance
   aucun). Pour un autre SHA, on le lance à la main :

   ```sh
   # dans le dépôt du moteur
   gh workflow run candidate --ref main -f sha=<full sha>
   ```

   Il joue toutes les familles lourdes sur ce SHA, le profil de qualification complet sur ses propres archives et son
   image, les trois charges et la répétition de signature. Sa gate (`candidate-gate`) écrit et atteste
   `candidate-manifest.json`, avec chaque fichier que la release publiera (`tools/release/artifacts.mjs`). Lire la
   gate **et** sa conclusion. Seul un run lancé sur main, à la main (`workflow_dispatch`) ou par le merge d'une release
   (`push`), peut être nommé par un tag ; une pull request avec le label `full-ci` le lance aussi, pour information
   seulement. Il finit par la vérification de publication de la documentation sur son propre rapport de tests, en
   avertissement : un problème de doc ne retient jamais la release (la CI de la pull request de release a déjà vérifié
   ses relectures humaines, `npm run release -- check`, et la commande de release les repasse sur le commit de release,
   [plus haut](#release-command)).

   Ses morceaux de mutation reprennent les rapports que la nightly a enregistrés sur `main` (4.5.5, #329) : seuls les
   ensembles dont les entrées ont bougé depuis tournent à nouveau, les autres prennent une ou deux minutes chacun, et
   le candidat enregistre ce qu'il a mesuré : un second candidat le reprend. Un changement que lisent tous les
   ensembles (le lockfile, `vite.config.ts`) les fait tous bouger ; pour une longue relecture, préchauffez le cache à
   la main ([plus haut](#prepare)) avec `gh workflow run nightly --ref main -f jobs=mutation` (les jobs de mutation
   seulement, qui reprennent ce qui est déjà en cache).

   Un candidat plus récent de la même version annule un candidat antérieur qui ne peut plus passer au vert (4.7.1,
   #410, son job `supersede`) : sur `main` seulement, lancé avant lui, d'un autre SHA dont le `package.json` nomme la
   même version, encore en cours avec un job déjà en échec ou hors délai. Un run vert ou encore vert, celui d'une autre
   version et celui d'une pull request ne sont jamais touchés. La commande de release qui attend un run annulé ainsi
   s'arrête au lieu de le relancer, et donne la suite :
   `npm run release -- <version> --commit=<le SHA plus récent> --start-candidate`.

<!-- step: tag -->
2. **Un tag qui le nomme.**

   ```sh
   # dans le dépôt du moteur
   npm run ship -- tag <version> <sha> --candidate=<run> --sign
   ```

   Le tag stable précédent doit être un ancêtre du SHA. `--candidate=<run id>` est obligatoire depuis la 4.1.17 : le run
   doit être vert et son manifeste nommer ce SHA et ce run ; l'annotation du tag le nomme, et release.yml publie les
   fichiers de ce run. `ship tag` attend que le run `ci` de main sur le SHA soit vert avant de pousser le tag (relancé
   une fois) : c'est ce run que release.yml vérifie, puisqu'un tag ne lance plus de `ci` à lui (4.5.3). `--now`, qui
   sautait cette attente, est refusé depuis la 4.5.3. `--sign` signe le tag avec la clé SSH ([plus bas](#signing)).
   `ship tag` refuse de taguer tant que les releases immuables sont désactivées. Il attend ensuite comme `ship watch`.

<!-- step: release -->
3. **La release, depuis ce run.** Le push du tag lance `release.yml` (depuis la 4.5.3, #291). Il vérifie que le tag
   pointe toujours vers le commit pour lequel le run a démarré, que ce commit est sur la ligne des premiers parents de
   main et que le `ci` de main a réussi sur un push de ce SHA précis (`tools/release/main-ci.mjs`), que le tag stable
   précédent est un ancêtre, et que le candidat nommé est un run vert de `candidate` lancé à la main sur main. Il
   télécharge les fichiers du run et vérifie chaque SHA-256 contre le manifeste. Il ne reteste rien : ni
   `release-check`, ni ensemble de mutation, le candidat les a joués sur ce SHA. Il copie ce que le candidat a fait et
   ne construit rien (archives, image, SBOM, le site, les surfaces, les preuves des catalogues Remix). Il crée alors la
   release en **brouillon**, téléverse chaque fichier, la publie et la relit (`ship verify`) : quelques minutes au lieu
   de plusieurs heures. Un candidat auquel il manque un de ses fichiers ne peut pas être publié : depuis la 4.1.20 la répétition
   de signature, depuis la 4.5.3 les preuves Remix (un candidat antérieur à ce changement n'en a pas). Il faut en lancer
   un nouveau. Si le `ci` de main sur le SHA tourne encore ou est rouge, le run s'arrête sur une erreur qui le dit : on
   l'attend, puis on relance le job. Un seul run de release par tag à la fois : le second attend, puis trouve la
   release du premier.

<!-- step: verify -->
4. **Relecture.**

   ```sh
   # dans le dépôt du moteur
   npm run ship -- verify <version>
   ```

   La commande télécharge la release et vérifie les sommes, chaque attestation de provenance et la liste des fichiers
   contre le manifeste ; depuis la 4.1.20, elle lance aussi `gh release verify` et `gh release verify-asset` pour chaque
   fichier. release.yml la lance comme dernière vérification.

<!-- step: npm-stage -->
5. **npm, mis en scène puis approuvé** (à partir de la 4.5.2). Une fois le job de release réussi, le job `npm-stage`
   de release.yml met en scène les cinq archives de la release sur npm par trusted publishing (OIDC, sans jeton), le
   moteur d'abord, et le résumé de son run donne les ids. Un propriétaire de l'organisation npm approuve chacune avec
   sa 2FA, dans l'ordre du résumé :

   ```sh
   # n'importe où, connecté à npm en tant que propriétaire de quest-n-click
   npm stage approve <id>
   ```

   Un tag de pré-version ne met rien en scène (ses archives portent la version stable) : le job répète l'échange OIDC.
   Un `npm-stage` en échec fait échouer le run de release (`ship watch` sort en 1) sans toucher à la release publiée
   ni à la documentation ; une fois la cause réglée (souvent un trusted publisher absent), on relance le job seul. La
   procédure, et la première release par npm : [Paquets npm](contribute.npm-packages.md#staging-job).

> [!LIMIT id=published-never-changed]
> Une release publiée ne change jamais. Un run sur une release déjà publiée s'arrête avant de rien faire. Un brouillon
> laissé par un run qui a échoué avant la publication n'a jamais été public : il est supprimé (son tag reste) et refait
> depuis le même candidat. Une RC ratée ne se corrige pas : elle devient une `rc.N+1`.

<a name="what-a-release-carries"></a>

### Ce que porte une release

Chaque release est faite des fichiers que son candidat a produits sur le commit tagué, porte ses licences dans
l'archive, et joint : le jeu
construit (`dist`), son manifeste d'assets, les archives des cinq paquets npm (`quest-n-click`, `create-quest-n-click`,
`quest-n-click-bridge`, `quest-n-click-connectors`, `quest-n-click-studio-server` ; [Paquets npm](contribute.npm-packages.md)),
un SBOM CycloneDX par paquet et un pour l'image du Bridge (cinq SBOM en 4.1.19, six depuis le paquet du Studio Server
en 4.2.1), l'image du Bridge, les preuves des catalogues Remix, un speedrun complet du chapitre de référence vérifié par
`speedrun:verify`, les runs du candidat, sa baseline, les fichiers de son site, ses surfaces et sa répétition de
signature, le manifeste du candidat, des sommes SHA-256 et une attestation de provenance de build
(`gh attestation verify <file> -R Quest-n-Click/quest-n-click` depuis la 4.5.2, voir plus bas pour les releases d'avant) ;
à partir de la 4.5.0, l'archive de la documentation. Elle
n'est jamais remplacée une fois publiée. Ce que seuls des gens et de vrais appareils vérifient est rapporté dans ses
notes ([Passes de terrain](contribute.field-passes.md)).

Une pré-version (`4.1.8-rc.1`) se tague de la même façon ; release.yml la marque comme pré-release sur GitHub.

<a name="docs-publish"></a>
<!-- applies: 4.5.0.. -->

### La documentation, après la relecture

À partir de la 4.5.0, le job `docs-publish` de release.yml dépend (`needs`) du job de release : il ne démarre donc
qu'une fois `ship verify` passé. Il appelle `.github/workflows/docs-publish.yml` avec le tag, le SHA, le candidate run et
le sha256 de l'archive de documentation, promeut cette archive (celle du candidat, vérifiée de nouveau), l'inscrit dans
`publication.json` et pousse le wiki ; une rc ne publie que `/docs/<v-rc>/`. Il n'est jamais lancé par
`release: published`, qu'une release publiée avec `GITHUB_TOKEN` ne déclenche pas. Seule la clé de déploiement du wiki,
`WIKI_DEPLOY_KEY`, lui est passée. Voir [Écrire la documentation](contribute.writing-docs.md).

Le clone du wiki, et une poussée qui n'a jamais atteint le wiki, sont tentés quatre fois (4.7.1, #410), à
15 s d'intervalle, chaque essai raté signalé : le `docs-publish` de la 4.7.0 a rencontré un « Permission denied
(publickey) » au clone, et sa relance est passée avec la même clé. Tout ce qui précède le clone ne fait que lire, et une
poussée est la mise à jour d'une seule référence. Une poussée que le wiki a refusée (il a bougé depuis le clone, une
branche protégée, une clé sans droit d'écriture) échoue tout de suite, comme avant : relancez `docs-publish`.

<a name="maintainer-settings"></a>

### Ce que le mainteneur active, une fois (après la PR 3b de la 4.1.20)

- **Les releases immuables** : Settings → General → Releases. Une release publiée garde alors ses fichiers et son tag.
- **Un ruleset sur les tags de release** : cible `tag`, `refs/tags/v*`, actif. Il réserve la création, refuse la
  suppression et interdit le force-push.
- **Deux environnements pour la documentation** (depuis la 4.5.4). `docs-publish` : la doc d'une release, publiée
  sans clic (le tag signé vaut approbation) : aucun relecteur requis, une règle de **tag** `v*` comme seule règle de
  déploiement. `docs-publish-manual` : les lancements à la main (revision, rollback, promote, preview), ses relecteurs
  requis approuvent chacun, règles `main` et `docs/*`. Chacun porte le secret `WIKI_DEPLOY_KEY` (un secret d'environnement : sa clé privée
  est saisie à nouveau pour le second). Dans cet ordre : créer `docs-publish-manual` (relecteurs, règles, secret),
  puis fusionner le changement qui le nomme, puis réduire `docs-publish` à la règle `v*` sans relecteur ; dans l'autre
  sens, un lancement à la main trouverait `docs-publish-manual` absent et GitHub le créerait, sans protection. Sans la
  règle `v*`, le job de la release est refusé (la release elle-même est publiée ; `mode=promote` depuis main rattrape
  la documentation).
- `npm run ship -- preflight-stable --candidate=<run>` doit alors voir les deux premiers. **Avant le premier tag de la 4.1.20**,
  `ship tag` refuse de taguer tant que les releases immuables sont désactivées : le jeton de release.yml ne peut pas
  lire ce réglage (il faut un droit de lecture admin), donc `ship tag` le vérifie avec l'accès du mainteneur.

<a name="signing"></a>

### Signer les tags

Les tags 4.1.x restent annotés (D30). À partir de la 4.2, ils sont signés avec la clé SSH du mainteneur :

```sh
# dans le dépôt du moteur
git config gpg.format ssh
git config user.signingkey ~/.ssh/id_ed25519.pub
npm run ship -- tag 4.2.0-rc.2 <sha> --candidate=<run> --sign
```

- La clé doit aussi être enregistrée sur GitHub comme clé de **signature** (Settings → SSH and GPG keys).
- Elle doit figurer dans `.github/allowed_signers`, ajouté dans un commit signé par cette clé (8cebea2, fait par Claude
  à la demande du mainteneur : D37). Ce fichier est aussi la racine de confiance des passes reportées (ADR 0024).
- `--key=<fichier>` donne un autre fichier de clé que `user.signingkey`.
- Chaque candidat répète ce chemin avec une clé éphémère (`signing-rehearsal`) : il signe un tag du commit, jamais
  poussé, le vérifie avec `git verify-tag`, puis détruit la clé.

> [!LIMIT id=signature-not-approval]
> Avec `id_ed25519`, la signature prouve l'usage de la clé, pas l'accord du mainteneur : un accord est consigné
> explicitement (D37).

<a name="preflight"></a>

### Le préflight stable

```sh
# dans le dépôt du moteur
npm run ship -- preflight-stable --candidate=<run> [--version=4.2.0]
```

Il ne signe rien, ne publie rien et ne change aucun réglage
([`tools/release/preflight.mjs`](../../tools/release/preflight.mjs)). Il dit, vérification par vérification, `ok`,
`missing` (une étape encore à faire) ou `blocked` (quelque chose ne va pas) :

- la clé de signature, locale et enregistrée ;
- `allowed_signers` ;
- l'immuabilité et le ruleset de tags ;
- la provenance du candidat ;
- pour chaque paquet npm : l'archive (`npm publish --dry-run`), le nom, le bootstrap, le trusted publisher (sur
  `release.yml`, en stage-only), une publication OIDC prouvée, et la version pas encore publiée ;
- le job `npm-stage` de release.yml : il met en scène par `tools/release/npm-stage.mjs`, jamais par `npm publish`,
  jamais avec un jeton ;
- le Node et le npm exacts de l'étape de mise en scène ;
- le GO / NO-GO face aux rapports des personnes (« GO for 4.2 on a reduced scope » se lit avec D38 écrite).

Il ne sort en 1 que sur un `blocked`.

<a name="ship-commands"></a>

### Toutes les commandes `ship`

| Commande | Ce qu'elle fait |
|---|---|
| `ship checks <pr>` | Attend les vérifications de la pull request ; relance une fois un job en échec ; sort en 1 s'il échoue encore |
| `ship merge <pr>` | `checks`, puis fusionne (un commit de fusion, la seule méthode que le ruleset permet) ; affiche le SHA |
| `ship main <sha>` | Attend que le run `ci` de main sur ce SHA soit vert (relancé une fois) |
| `ship tag <version> <sha> --candidate=<run> [--sign [--key=<file>]]` | Attend le `ci` de main sur le SHA, tague (plus haut), pousse, puis `watch` |
| `ship watch <version>` | Attend le run `release` du push du tag ; sort selon sa conclusion |
| `ship verify <version>` | La relecture (plus haut) |
| `ship preflight-stable --candidate=<run> [--version=<x.y.z>]` | Le préflight stable (plus haut) |
| `ship chain <pr> <version>` | fusion → tag → watch → verify ; refusée depuis la 4.1.17, dont les tags demandent un candidate run du commit de fusion (fusion, candidat, puis tag) |

Chaque commande est idempotente et dit ce qu'elle attend.

<a name="expected-result"></a>

## Résultat attendu, et comment le vérifier

`ship watch` sort en 0 avec le succès du run de release ; `ship verify <version>` affiche chaque fichier vérifié et
sort en 0 ; la page de la release montre les fichiers et « Immutable » ;
`gh attestation verify <file> -R Quest-n-Click/quest-n-click` passe pour n'importe lequel de ses fichiers, depuis la 4.5.2.
Une release faite avant le passage dans l'organisation (D51) garde ses attestations sous l'utilisateur wanoo :
`gh attestation verify <file> --owner wanoo --signer-workflow wanoo/quest-n-click/.github/workflows/release.yml` de la
4.2.5 à la 4.5.1, `gh attestation verify <file> --owner wanoo --signer-repo wanoo/web-scumm` jusqu'à la 4.2.4 (`ship
verify` demande chaque release ainsi, et dit que l'attestation de release propre à GitHub de ces releases n'est pas
vérifiée).

<a name="common-errors"></a>

## Erreurs fréquentes

| Symptôme | Cause | Correction |
|---|---|---|
| ship tag : « no "## x.y.z" section in CHANGELOG.md at … » | Le commit n'est pas la fusion de la pull request de release | Fusionner la pull request de release, lancer un candidat sur son commit de fusion, taguer celui-là |
| ship tag : « no git remote here points to Quest-n-Click/quest-n-click » | Seul un fork est un remote ici | `git remote add upstream git@github.com:Quest-n-Click/quest-n-click.git` |
| release : « the checkout is on release/<version> » | `prepare` laisse le checkout sur sa branche | `git switch main && git pull --ff-only <le remote de l'organisation> main`, puis la commande de release |
| release : « candidate run … failed again (attempt 2) » | Le candidat a échoué après son unique relance | Un échec passager : le `gh run rerun` affiché, puis la commande de nouveau ; une correction fusionnée sur main : `npm run release -- <version> --commit=<sha du merge de la correction> --start-candidate` |
| release : « candidate run …: mutation survivors, not re-run » | Un shard de mutation est rouge sur des survivants que personne n'a nommés : une relance les retrouverait | Tuer chaque survivant listé par un test, ou le nommer dans `docs/dev/mutants.json` ; fusionner la correction sur main, puis `npm run release -- <version> --commit=<sha du merge de la correction> --start-candidate` |
| release.yml : « names no candidate run » | Le tag a été fait sans `--candidate` | Taguer la version suivante (ou `rc.N+1`) avec `--candidate` : le ruleset refuse de supprimer un tag |
| release.yml : « run … is not a green candidate started on main » | Le run est celui d'une pull request, d'une autre branche, ou rouge | Lancer `candidate` à la main sur main pour ce SHA |
| release.yml : « has no candidate-site » (ou `-surfaces`, `-signing`, `-remix`, `-pack`, `-sbom`, `-image`) | Un candidat antérieur à l'étape | Lancer un nouveau candidat |
| release.yml : « main's ci has not succeeded on … » | Le run `ci` de main sur ce SHA tourne encore, est rouge ou annulé | L'attendre (ou le relancer) sur main, puis relancer le job de release |
| release.yml : « is not on main's first-parent line » | Le tag est sur un commit d'une branche de travail, pas sur une fusion dans main | Taguer la version suivante sur le commit de fusion de main |
| `ship tag` refuse `--now` | `--now` n'existe plus depuis la 4.5.3 | Taguer sans : `ship tag` attend le `ci` de main |
| « is published: a published release is never changed » | Une relance sur un tag publié | Rien à faire ; une nouvelle version est un nouveau tag |
| `ship tag` refuse : releases immuables désactivées | Le réglage n'est pas activé | L'activer (plus haut), puis taguer |
| Une RC ratée | — | Taguer `rc.N+1` depuis un nouveau candidat |

<a name="files-changed"></a>

## Fichiers ou données modifiés

Un tag `v<version>` (signé), une release GitHub avec ses fichiers et attestations, `.cache/pids/ship-*.pid` en local ;
à partir de la 4.5.0, le wiki et `publication.json` (par `docs-publish`). Avant cela, la branche de release modifie
`CHANGELOG.md`, `docs/dev/LOG.md` et `docs/dev/passes/<version>.md`.

<a name="recovery"></a>

## Revenir en arrière

Une release publiée ne peut être ni changée ni retirée : un défaut se corrige dans une nouvelle version. Un brouillon
est supprimé par le run de release suivant. Un tag pas encore publié peut rester tel quel, et un nouveau candidat être
tagué sous le numéro de pré-version suivant.

<a name="references"></a>

## Références

- [`tools/release/ship.mjs`](../../tools/release/ship.mjs), [`tools/release/candidate.mjs`](../../tools/release/candidate.mjs),
  [`tools/release/artifacts.mjs`](../../tools/release/artifacts.mjs), [`tools/release/preflight.mjs`](../../tools/release/preflight.mjs),
  [`tools/release/signing.mjs`](../../tools/release/signing.mjs), [`tools/release/main-ci.mjs`](../../tools/release/main-ci.mjs).
- [`.github/workflows/release.yml`](../../.github/workflows/release.yml), [`.github/workflows/candidate.yml`](../../.github/workflows/candidate.yml).
- D30, D37, D38, D55 ; ADR 0024. [Passes de terrain](contribute.field-passes.md), [Paquets npm](contribute.npm-packages.md),
  [Stabilité et support](start.stability.md#releases).
