<p align="center"><img src="docs/img/logo.png" width="480" height="320" alt="Le logo de Quest'n'Click : une fenêtre d’éditeur en pixel art avec une scène de port, un graphe de dialogue et un curseur, entourée de cartes illustrées, d’une carte au trésor, d’un panneau IA, d’un carnet de schémas d’énigmes et d’une tasse de café, sous les mots Quest'n'Click, Open source point &amp; click engine"></p>

# quest'n'click

**Un moteur de point-and-click pour le navigateur.** Écrivez votre jeu comme des données, façonnez-le dans un Studio
visuel, prouvez qu'on peut le finir, et livrez-le comme un jeu web qui s'installe sur un téléphone et se joue hors
ligne.

**[▶ Jouer à la démo](https://quest-n-click.cleverapps.io/demo/)** ·
**[🛠 Essayer le Studio](https://quest-n-click.cleverapps.io/demo/studio.html)** ·
**[📖 Lire la doc](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Creer-Premier-Jeu)** · *[English version](README.md)*

![La Clé du garde-manger, le jeu d'exemple : le salon de Grand-mère, neuf verbes, le sac](docs/img/readme/4119-hero.webp)

## Ce que c'est

- **Votre jeu est fait de données, pas de code.** Salles, objets, personnages, conversations et énigmes sont de simples
  objets TypeScript. Chaque outil peut les lire, les vérifier et les jouer, un assistant IA aussi.
- **Un Studio pour le façonner.** Le vrai moteur avec un éditeur par-dessus : placer les choses dans une salle,
  modifier chaque réplique, suivre le storyboard, voir les vérifications après chaque enregistrement.
- **Prouvé avant que quiconque y joue.** Un validateur trouve les références cassées et les répliques manquantes ; un
  solveur joue le vrai moteur jusqu'à une fin, ou prouve qu'aucun joueur ne peut rester bloqué.
- **Pensé pour le téléphone.** Un toucher pour agir, en paysage ou en portrait, au clavier ou au doigt ; il s'installe
  comme une application et se joue hors ligne.

## Commencer

<!-- install:begin -->
Node 22.12 ou plus récent et Python 3 avec Pillow (`npm run assets` prépare les images avec eux), sous Windows, macOS
ou Linux. Le moteur s'installe depuis l'archive d'une release, ou depuis npm à partir de la 4.5.2 (chaque release y
est une fois approuvée par un propriétaire) :

```bash
T=https://github.com/Quest-n-Click/quest-n-click/releases/download/v4.7.2/quest-n-click-4.7.2.tgz
npx --package=$T quest-n-click create mon-jeu "Mon jeu" --engine=$T
cd mon-jeu && npm install
npm run assets && npm run dev        # y jouer ; puis npm run verify, npm run build
```
<!-- install:end -->

Depuis npm, `npm init @quest-n-click mon-jeu` fait la même chose en une commande
([Installer depuis npm](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Installer-Depuis-NPM)). Suivez ensuite [Votre premier jeu](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Creer-Premier-Jeu) :
une première salle en quinze minutes. `npx quest-n-click doctor` dit ce qui manque sur votre machine ;
`npm run build` écrit `dist/`, un site statique que tout hébergeur sert.

## Un aperçu du code

Une salle est un objet. Une règle est un verbe, une cible, une condition et une liste de commandes :

```ts
export const garden: RoomDef = {
  id: 'garden', name: 'Le jardin', decor: 'garden',
  props: { tank: { name: "cuve d'eau", states: { full: 'tank_full', empty: 'tank_empty' } } },
  exits: { back_door: { name: 'porte de derrière', to: 'house', entry: 'garden' } },
  on: [
    { verb: 'use', a: 'pipe', b: 'tank', if: '!tank_drained',
      do: [{ minigame: 'pipes' }, { lose: 'pipe' }, { set: 'tank_drained' }, { prop: ['tank', 'empty'] }] },
  ],
  hints: [{ until: 'tank_drained', lines: ["Utilise le tuyau sur la cuve d'eau."] }],
};
```

Les classiques du genre sont écrits ainsi dans [Mécaniques classiques](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Creer-Mecaniques-Classiques).

## Fonctionnalités

- **Jouer** : des verbes ou un seul toucher, des conversations à sujets et à choix, plusieurs héros jouables, une carte
  du monde, des mini-jeux, des cinématiques, une sauvegarde automatique et des emplacements.
- **Créer** : le Studio, les prompts d'images et le découpage des planches ([Images](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Creer-Images)), une musique
  chiptune tirée d'un MIDI ([Musique](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Creer-Musique)), chaque réplique traduisible.
- **Vérifier** : `npm run validate`, `npm run solve`, et `npx quest-n-click solve --prove`, qui explore chaque état
  atteignable et échoue sur une impasse.
- **Livrer** : une PWA statique avec un budget de téléchargement, chaque fichier listé avec sa licence, des
  sauvegardes qui se chargent d'une version à l'autre.
- **Aller plus loin** : des mondes générés à partir d'une graine ([Remix](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Creer-Remix)), des speedruns vérifiés,
  et des jeux qui réagissent au monde réel grâce au [Bridge Reality](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Bridge-Presentation).

<table>
<tr><td width="50%" valign="top"><img src="docs/img/readme/4119-studio-rooms.webp" alt="Studio, onglet Salles : le garde-manger sélectionné, ses répliques et ses réactions modifiables" width="100%"><br><sub><b>Studio</b> : le vrai moteur, un éditeur de placement par-dessus</sub></td><td width="50%" valign="top"><img src="docs/img/readme/4119-studio-check.webp" alt="Studio, onglet Vérifier : validateur, chemin du solveur et santé du solveur" width="100%"><br><sub><b>Vérifier</b> : le validateur et le solveur après chaque enregistrement</sub></td></tr>
<tr><td width="50%" valign="top"><img src="docs/img/readme/4119-player-scene.webp" alt="Parler à Grand-mère : ses sujets dans la colonne de côté" width="100%"><br><sub>Des conversations à sujets et à choix</sub></td><td width="50%" valign="top"><img src="docs/img/readme/4119-player-map.webp" alt="La carte du monde : Grand-mère et Grand-père épinglés dessus, les lieux où aller dans la colonne de côté" width="100%"><br><sub>La carte du monde</sub></td></tr>
</table>

## Est-ce stable ?

Chaque partie n'est promise que jusqu'où elle est testée ([Stabilité et support](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Demarrer-Stabilite)) :

| Stable | Limité | Expérimental |
|---|---|---|
| le format du contenu et ses outils ; la PWA Chromium sur ordinateur ; le Bridge Reality sur SQLite | le lecteur DOM sur téléphone et au lecteur d'écran (pas encore essayé par une personne) ; la PWA Safari ; Firefox (la PWA seulement) ; speedrun et Remix ; les voix ; les quatre archives de packages (jusqu'à ce qu'une personne les installe) | le peintre Canvas ; le Bridge sur Postgres (`distributed`) ; les quatre connecteurs |

« Limité » veut dire que des machines le testent mais qu'aucune personne ne l'a encore confirmé sur de vrais appareils
([Passes de terrain](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Contribuer-Passes-De-Terrain)). Seule la dernière version mineure reçoit des correctifs.
Aujourd'hui : <!-- metric:tests -->3936<!-- /metric --> déclarations de tests unitaires, le jeu de référence prouvé
en <!-- metric:referenceStates -->288<!-- /metric --> états, une première visite de
<!-- metric:initialJsKB -->140<!-- /metric --> Ko de JavaScript compressé.

<a name="documentation"></a>

## Où aller ensuite

- **Faire un jeu** : [Votre premier jeu](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Creer-Premier-Jeu), [Principes du contenu](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Creer-Principes), le
  [Studio](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Studio-Presentation), chaque commande dans [Scripts npm](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Reference-Scripts-NPM).
- **Travailler avec un assistant IA** : [Travailler avec une IA](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Creer-Travailler-Avec-Une-IA) et le
  [serveur MCP](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Studio-Configurer-MCP). `AGENTS.md` contient les règles que suit un assistant.
- **Mettre à jour** : [Mettre à jour](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Installer-Mise-A-Jour) et le [CHANGELOG](CHANGELOG.md).
- **Contribuer** : [CONTRIBUTING](CONTRIBUTING.md), [Architecture](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Contribuer-Architecture) et une
  [visite du code](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Contribuer-Visite-Du-Code) d'une demi-heure.
- **Héberger le Bridge** : [Installer et lancer](https://github.com/Quest-n-Click/quest-n-click/wiki/FR-Bridge-Installer-Et-Lancer).

Toute la documentation est [le wiki](https://github.com/Quest-n-Click/quest-n-click/wiki), en anglais et en français.

## Releases

Release actuelle : [v4.7.2 (Audit fixes)](https://github.com/Quest-n-Click/quest-n-click/releases/tag/v4.7.2) : Un correctif pour les auteurs de jeux : le Studio redémarre depuis le moteur installé, et le paquet du moteur ne contient plus que des fichiers qui fonctionnent dans un projet de jeu.
Toutes les releases précédentes sont dans le [CHANGELOG](CHANGELOG.md).

## Licences

Code : MIT. Images, bruitages et thème du jeu d'exemple : CC BY 4.0 (attribution « Wano ») ; le thème est le *Lac des
cygnes* de Tchaïkovski (domaine public), arrangé pour le projet. Polices : SIL OFL. Voir `CREDITS.md`.

quest'n'click s'appelait web-scumm jusqu'à la 4.2.5 ; `npx quest-n-click migrate` met à jour un jeu plus ancien. C'est
un projet indépendant : « façon SCUMM » désigne un genre de jeu, et le projet n'est ni affilié à, ni approuvé par, ni
dérivé de LucasArts, Lucasfilm, Disney ou du projet ScummVM, et n'en livre ni code, ni données, ni images.
