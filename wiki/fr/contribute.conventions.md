# Conventions

Les noms, titres et fichiers que suit une contribution au dépôt du moteur, pour que les issues, les branches, les pull
requests et le CHANGELOG se lisent de la même façon, quel que soit leur auteur. Chaque section est une convention, avec
ce qui la vérifie.

<a name="titles"></a>
<!-- applies: .. since 4.3.0 -->

## Titres des issues et des pull requests

### Forme

- **Issue :** le préfixe du modèle, `[bug]` ou `[feature]` (`[field]` pour une passe de terrain d'une release), puis
  le problème ou le besoin en une phrase. Une issue ouverte en ligne de commande saute le modèle : tapez le préfixe
  vous-même.
- **Pull request :** `<Domaine>: <ce qui change> (#issue)`.
- **Une pull request d'une passe de release** commence plutôt par sa version : `4.2.3: …`, `4.3 "Nom": …`.
- **Corps :** chaque section du modèle de pull request, « Not done, said as such » comprise (« Nothing » quand il ne
  reste rien).

### Exemple minimal

```text
[bug] A save made in the cellar loads in the kitchen
Interface font: a proportional pixel font by default (#204)
```

### Contraintes

Rien ne vérifie un titre mécaniquement ; le mainteneur le fait. Les modèles d'issue sont
`.github/ISSUE_TEMPLATE/bug-report.yml` (titre `[bug] `) et `feature.yml` (titre `[feature] `) ; une demande de
nouveauté s'ouvre après avoir lu [Mécaniques classiques](create.classics.md) et [Commandes du jeu](create.commands.md).

### Depuis

4.3.0.

<a name="branches"></a>

## Noms de branches

### Forme

`<genre>/<issue>-<quelques-mots>`. Le genre est l'un de `feature`, `fix`, `docs`, `test`, `refactor`, ou `release`
avec sa version (`release/4.4.0`).

### Exemple minimal

```text
fix/210-job-late-poll
feature/430-hero-choice
```

### Contraintes

La branche sans son préfixe est le nom de son fragment du CHANGELOG (`210-job-late-poll`, section suivante). Rien
d'autre ne vérifie le nom.

<a name="changes-fragments"></a>
<!-- applies: .. since 4.1.9 -->

## Fragments du CHANGELOG et du LOG (`changes/`)

### Forme

Une branche qui modifie le code ne touche ni `CHANGELOG.md` ni `docs/dev/LOG.md`. Elle écrit, sous `changes/` :

- `changes/<slug>.md` : les puces du CHANGELOG, sous `### Breaking`, `### Fixed` ou `### Changes` (n'importe
  lesquelles, dans n'importe quel ordre). Écrivez-les comme le CHANGELOG : une amorce en gras, la version entre
  parenthèses, ce qu'un joueur, un auteur ou un hébergeur voit de différent.
- Dans le même fichier, en option (4.7.1, #410), `### Release` : une ou deux phrases pour l'introduction de la
  release, ce que le changement apporte et à qui, en une prose qui se lit bien jointe à celle des autres fragments.
  `npm run release -- prepare` joint celles de tous les fragments, dans l'ordre où ils sont arrivés sur `main`, dans
  l'introduction du CHANGELOG et la ligne de release actuelle du README ; s'il n'y en a aucune, les deux gardent un
  `TODO(release)` pour le mainteneur. `### Release (fr)` en est la traduction française, pour `README.fr.md` : la ligne
  française n'est écrite que si chaque fragment qui a un `### Release` a la sienne, sinon elle reste un
  `TODO(release)`. Aucun des deux titres n'arrive dans les puces du CHANGELOG.
- `changes/<slug>.log.md` (facultatif) : l'entrée du LOG. Première ligne `## <titre>` (ce qui suit
  `#n · date · Claude · proposal ·` dans le LOG), puis le corps, sa ligne `→ next:` en dernier. Le numéro et la date
  sont ceux de l'assemblage.

`<slug>` est la branche sans son préfixe, par exemple `419-cadence`. Le CHANGELOG et le LOG sont en anglais.

### Exemple minimal

`changes/210-job-late-poll.md` :

```markdown
### Fixed

- **A prepared job keeps its result on screen (4.3.0, #210)**: on a hosted Studio, the Assets panel no longer replaces
  "prepared from revision 3" with "Preparing the assets: done" when a late status answer arrives.
```

Avec les lignes de la release, comme `changes/430-localized-images.md` aurait pu les écrire :

```markdown
### Release

A game can letter its images in each language (`i18n.images`), its title logo included.

### Release (fr)

Un jeu peut écrire ses images dans chaque langue (`i18n.images`), son logo de titre compris.

### Changes

- **Images per language (4.7.0, #430)**: …
```

### Contraintes

```sh
# dans le dépôt du moteur
npm run changes -- --check [--base=origin/main]
```

- Elle fait échouer une branche qui touche `src/`, `bridge/`, `tools/`, `scripts/`, `cli/`, `connectors/` ou `games/`
  sans fragment et sans modification du CHANGELOG : `✖ this branch changes the code and carries no fragment: write
  changes/<slug>.md (### Fixed | ### Changes | ### Breaking, then the bullets; …)…`. Le job `check` de la CI la lance
  sur les pull requests. Un changement qui ne touche que `docs/`, `wiki/` ou `tests/` n'a pas besoin de fragment.
- Elle lit aussi chaque fragment de `changes/`, ceux de la branche et les autres, comme `--assemble` le fera (4.5.5,
  #335) : un titre autre que les trois et les deux de la release (`### Added`, par exemple), du texte avant le premier
  titre, ou un `.log.md` qui ne s'ouvre pas sur `## <title>` est refusé avec son fichier et sa ligne :
  `✖ changes/<slug>.md:5: "### Fixes" is not a fragment heading: ### Breaking | ### Fixed | ### Changes, or ### Release | ### Release (fr)`.
  `--assemble` refuse les mêmes, donc un fragment sur lequel la release s'arrêterait fait échouer la pull request qui
  l'ajoute. Rien n'est rangé en silence.
- Une partie `### Release` est refusée quand elle est vide, en liste, plus longue que 400 caractères, sans point final,
  ou présente deux fois ; un `### Release (fr)` sans son `### Release` aussi (4.7.1, #410).
- Une version postérieure à celle de `package.json` est refusée (4.7.1, #443) : `✖ changes/<slug>.md:3: 4.7.1 is after
  package.json's 4.7.0: a fragment names the release it lands in as next…`. Écrivez `(next, #n)` ([La marque de la
  prochaine release](#next-mark)) ; une version citée dans un bloc de code en ligne n'est pas lue.
- Un `TODO(release)` nu dans un fragment est refusé aussi (4.5.5, #364) : il arriverait dans le CHANGELOG ou le LOG
  comme un marqueur que la release doit écrire, et ne le pourrait jamais. Citez-le entre accents graves, comme du code.
- Une branche de release est l'exception : elle assemble les fragments et modifie le CHANGELOG elle-même.
- `changes/README.md` n'est pas un fragment.

### Assemblage

```sh
# dans le dépôt du moteur, sur main, avec tout l'historique
npm run changes -- --assemble [--date=YYYY-MM-DD] [--version=<x.y.z>]
```

Avec `--version` (ce que passe `npm run release -- prepare`), les marques `next` des fragments deviennent cette
version quand ils sont versés ; sans lui elles restent, pour que la release les écrive.

Elle verse chaque fragment dans le `## Unreleased` du CHANGELOG (chaque puce sous sa section, Breaking, Fixed puis
Changes) et numérote les entrées du LOG après la dernière, dans l'ordre où les fragments sont arrivés sur `main` (la
date de leur premier commit : un rebase la déplace), puis les supprime. Seul le bloc `Unreleased` est réécrit. Elle
refuse un clone superficiel (`git fetch --unshallow`), qui daterait chaque fragment à sa limite. Deux branches ouvertes
ne se marchent plus dessus sur le CHANGELOG, le LOG ou leurs numéros d'entrée.

### Depuis

4.1.9 (lot 0 « cadence »).

<a name="next-mark"></a>
<!-- applies: 4.7.1.. since 4.7.1 -->

## La marque de la prochaine release (`next`)

Une branche ne connaît pas le numéro de la release où elle arrivera : les branches de la 4.6.0 ont toutes deviné
« 4.6.1 », la release fut la 4.7.0, et environ 80 marques ont été renommées à la main. Une branche écrit `next` à la
place de la version ; la release écrit la version.

| Où | La marque | Réécrite par |
|---|---|---|
| Un fragment (`changes/`) | `(next, #443)`, `(next)` | `npm run changes -- --assemble --version=<v>` |
| La prose d'une page du wiki | `(next, #443)`, `(next)` | `npm run release -- prepare` (étape `next mark`) |
| Le marqueur applies d'une section | `<!-- applies: next.. since next -->` | la même étape |
| `wiki/manifest.json` | `"appliesFrom": "next"` (et `appliesUntil`, `featureSince`) | la même étape |
| Une chaîne de `wiki/data/*.json`, la source d'une partie générée | `"… (next, #550)"` | la même étape |
| Un commentaire dans `src/`, `tools/`, `scripts/`, `bridge/`, `cli/`, `connectors/`, `studio-server/`, `tests/` | `// … (next, #443)`, `/* … (next) */` | la même étape |

La marque est le mot dans une parenthèse qui s'ouvre sur lui, après une espace ou en début de ligne : `(next)` ou
`(next, …)`. Ne sont jamais une marque, donc jamais réécrits : le mot dans un bloc de code en ligne ou un bloc délimité
(c'est ainsi que cette page le cite), dans du code hors d'un commentaire (`if (next) {`), dans une chaîne du code (le nom d'un
test est ce que nomme une garantie : n'y écrivez pas de version), un appel nommé dans un commentaire (`swap(next)`), un
dossier de jeu (écrit par le journal du Studio ; à renommer à la main), et tout fichier historique (le LOG, les
sections publiées du CHANGELOG, `docs/`, `tests/fixtures/`). Une version déjà écrite n'est jamais touchée. Une chaîne
de `wiki/data/` est lue comme de la prose, comme la lit la page générée à partir d'elle (next, #550) ; après la
réécriture, l'étape vérifie chaque partie générée contre sa source et s'arrête quand l'une ne correspond plus (une
marque que la page montre dans un bloc de code en ligne, par exemple), au lieu de laisser ce refus à la vérification de
publication. `npx tsx tools/next-mark.ts --version=<v>` liste ce que l'étape réécrirait.

Une paire de traduction est hachée sur son texte : la réécriture des deux côtés la laisserait à relire ; la relecture
d'une garantie retient de même le texte de son bloc et le hachage de son fichier de test. L'étape reporte donc chaque
enregistrement qui tenait le texte avant la réécriture sur le texte réécrit (`wiki/translations.json`,
`wiki/reviews.json`, un `changes/*.acks.json` en attente) : une réécriture mécanique ne laisse rien à relire, et un
enregistrement périmé le reste.

`changes -- --check` refuse une version postérieure à celle de `package.json` dans un fragment ; le wiki et le code ne
sont pas vérifiés (une version écrite d'avance y est une supposition à éviter, pas une erreur).

<a name="formatting-commits"></a>
<!-- applies: .. since 4.1.0 -->

## Formatage et commits de formatage

### Forme

Biome formate et lint le code (`biome.json` : deux espaces, 120 colonnes, guillemets simples, points-virgules, virgules
finales). `npm run format` écrit le formatage ; `npm run format:check` et `npm run lint:code` le vérifient (tous deux
dans `npm run quality`).

### Contraintes

- Un changement qui ne fait que reformater est un commit à part, listé dans `.git-blame-ignore-revs`, pour que
  `git blame` le saute. En local : `git config blame.ignoreRevsFile .git-blame-ignore-revs` (GitHub lit le fichier de
  lui-même).
- **`games/` est linté, jamais reformaté** : le formateur exclut `games/**`, parce que c'est le Studio qui écrit le
  contenu.
- `Math.random` est refusé dans `src/engine/core/` et `src/engine/minigames/` (un plugin de lint) : le hasard passe par
  le générateur à graine. Dans `src/engine/core/remix/`, c'est `Math` lui-même qui est refusé (ADR 0018).
- `any` est refusé hors de `tests/` et `scripts/` ; les promesses flottantes sont refusées partout.

### Depuis

4.1.0 « Clarity » (le commit de formatage Biome est la première ligne de `.git-blame-ignore-revs`).

<a name="docs-languages"></a>

## Langues de la documentation

### Forme

| Quoi | Langue |
|---|---|
| Pages du wiki (`wiki/en`, `wiki/fr`) | Les deux, chacune écrite dans sa langue, avec les mêmes sections et les mêmes faits ([Écrire la documentation](contribute.writing-docs.md)) |
| `docs/dev/` (plans, décisions, ADR, LOG, passes) | Anglais, documentation publique de développement (D3) |
| `CHANGELOG.md`, commentaires du code, messages de commit | Anglais |
| `README.md` / `README.fr.md` | Les deux |
| `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CREDITS.md` | Anglais dans le dépôt ; leurs versions françaises sont les pages du wiki |

### Contraintes

Une pull request qui change ce que voit un utilisateur met à jour les pages dans les deux langues (la deuxième case du
modèle). `docs/en` et `docs/fr` sont des pages de transition depuis la 4.5.0 : ne les modifiez
jamais, écrivez dans `wiki/`.

<a name="review-owners"></a>

## Ce qui demande la relecture du mainteneur

`.github/CODEOWNERS` nomme les fichiers qu'une pull request ne peut pas changer sans un regard du mainteneur : le
comportement figé (`tests/quality-baseline.json`), la surface publique (`tests/api-surface.json`), les mutants
survivants nommés (`docs/dev/mutants.json`), les seuils de couverture (`tests/coverage-floors.json`) et les workflows (`.github/`).
Tout le reste est relu par les barrières.

<a name="related"></a>

## Identifiants liés

- `npm run changes`, `npm run format`, `npm run format:check`, `npm run lint:code`.
- [Avant une pull request](contribute.before-a-pr.md), [Gouvernance](contribute.governance.md).
