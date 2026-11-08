<p align="center"><img src="docs/img/logo.png" width="480" height="320" alt="The Quest'n'Click logo: a pixel-art editor window with a harbour scene, a dialogue graph and a pointer, among picture cards, a treasure map, an AI panel, a notebook of puzzle diagrams and a coffee mug, under the words Quest'n'Click, Open source point &amp; click engine"></p>

# quest'n'click

**A point-and-click adventure engine for the browser.** Write your game as data, shape it in a visual Studio, prove it
can be finished, and ship it as a web game that installs on a phone and plays offline.

**[▶ Play the demo](https://quest-n-click.cleverapps.io/demo/)** ·
**[🛠 Try the Studio](https://quest-n-click.cleverapps.io/demo/studio.html)** ·
**[📖 Read the docs](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Create-First-Game)** · *[Version française](README.fr.md)*

![The Pantry Key, the sample game: Grandma's living room, nine verbs, the bag](docs/img/readme/4119-hero.webp)

## What it is

- **Your game is data, not code.** Rooms, items, characters, conversations and puzzles are plain TypeScript objects.
  Every tool can read them, check them and play them, and so can an AI assistant.
- **A Studio to shape it.** The real engine with an editor on top: place things in a room, edit every line, follow
  the storyboard, see the checks after each save.
- **Proved before anyone plays.** A validator finds broken references and missing lines; a solver plays the real engine
  until it reaches an ending, or proves that no player can get stuck.
- **Made for phones.** One tap to act, landscape or upright, keyboard and touch; it installs as an app and plays
  offline.

## Start

<!-- install:begin -->
Node 22.12 or newer and Python 3 with Pillow (`npm run assets` prepares the art with them), on Windows, macOS or
Linux. The engine installs from a release's archive, or from npm since 4.5.2 (each release is there once an owner
approves it):

```bash
T=https://github.com/Quest-n-Click/quest-n-click/releases/download/v4.7.2/quest-n-click-4.7.2.tgz
npx --package=$T quest-n-click create my-game "My Game" --engine=$T
cd my-game && npm install
npm run assets && npm run dev        # play it; then npm run verify, npm run build
```
<!-- install:end -->

From npm, `npm init @quest-n-click my-game` does the same in one command
([Install from npm](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Install-From-NPM)). Then follow [Your first game](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Create-First-Game): a first room in
fifteen minutes. `npx quest-n-click doctor` says what is missing on your machine; `npm run build` writes `dist/`, a
static site any host can serve.

## A taste of the code

A room is an object. A rule is a verb, a target, a condition and a list of commands:

```ts
export const garden: RoomDef = {
  id: 'garden', name: 'The garden', decor: 'garden',
  props: { tank: { name: 'water tank', states: { full: 'tank_full', empty: 'tank_empty' } } },
  exits: { back_door: { name: 'back door', to: 'house', entry: 'garden' } },
  on: [
    { verb: 'use', a: 'pipe', b: 'tank', if: '!tank_drained',
      do: [{ minigame: 'pipes' }, { lose: 'pipe' }, { set: 'tank_drained' }, { prop: ['tank', 'empty'] }] },
  ],
  hints: [{ until: 'tank_drained', lines: ['Use the pipe on the water tank.'] }],
};
```

The classics of the genre are written this way in [Classic mechanics](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Create-Classic-Mechanics).

## Features

- **Play**: verbs or a single tap, conversations with topics and choices, several playable heroes, a world map,
  minigames, cutscenes, autosave and save slots.
- **Author**: the Studio, art prompts and sprite-sheet cutting ([Images](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Create-Images)), chip-tune music from a
  MIDI ([Music](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Create-Music)), every line translatable.
- **Check**: `npm run validate`, `npm run solve`, and `npx quest-n-click solve --prove`, which explores every reachable
  state and fails on a dead end.
- **Ship**: a static PWA with a download budget, every file listed with its licence, saves that load across versions.
- **Go further**: worlds generated from a seed ([Remix](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Create-Remix)), verified speedruns, and games that react
  to the real world through the [Reality Bridge](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Bridge-What-It-Is).

<table>
<tr><td width="50%" valign="top"><img src="docs/img/readme/4119-studio-rooms.webp" alt="Studio, Rooms tab: the pantry selected, its look lines and reactions editable" width="100%"><br><sub><b>Studio</b>: the real engine, a placement editor on top</sub></td><td width="50%" valign="top"><img src="docs/img/readme/4119-studio-check.webp" alt="Studio, Check tab: validator, solver path and solver health" width="100%"><br><sub><b>Check</b>: the validator and the solver after every save</sub></td></tr>
<tr><td width="50%" valign="top"><img src="docs/img/readme/4119-player-scene.webp" alt="Talking to Grandma: her topics in the side column" width="100%"><br><sub>Conversations with topics and choices</sub></td><td width="50%" valign="top"><img src="docs/img/readme/4119-player-map.webp" alt="The world map: Grandma and Grandpa pinned on it, the places to go in the side column" width="100%"><br><sub>The world map</sub></td></tr>
</table>

## Is it stable?

Each part is promised only as far as it is tested ([Stability and support](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Start-Stability)):

| Stable | Limited | Experimental |
|---|---|---|
| the content format and its tools; the desktop Chromium PWA; the Reality Bridge on SQLite | the DOM player on phones and screen readers (untried by a person); the Safari PWA; Firefox (the PWA only); speedrun and Remix; voices; the four package archives (until a person installs them) | the Canvas painter; the Bridge on Postgres (`distributed`); the four connectors |

"Limited" means machines test it but no person has confirmed it on real devices yet
([Field passes](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Contribute-Field-Passes)). Only the latest minor version gets fixes. Today:
<!-- metric:tests -->3936<!-- /metric --> unit test declarations, the reference game proved in
<!-- metric:referenceStates -->288<!-- /metric --> states, a first visit of
<!-- metric:initialJsKB -->140<!-- /metric --> KB of JavaScript, gzipped.

<a name="documentation"></a>

## Where to go next

- **Making a game**: [Your first game](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Create-First-Game), [Content principles](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Create-Principles), the
  [Studio](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Studio-Overview), every command in [npm scripts](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Reference-NPM-Scripts).
- **Working with an AI assistant**: [Working with an AI](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Create-Working-With-An-AI) and the
  [MCP server](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Studio-MCP-Setup). `AGENTS.md` holds the rules an assistant follows.
- **Upgrading**: [Upgrade](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Install-Upgrade) and the [CHANGELOG](CHANGELOG.md).
- **Contributing**: [CONTRIBUTING](CONTRIBUTING.md), [Architecture](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Contribute-Architecture) and a half-hour
  [code tour](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Contribute-Code-Tour).
- **Hosting the Bridge**: [Install and run](https://github.com/Quest-n-Click/quest-n-click/wiki/EN-Bridge-Install-And-Run).

The whole documentation is [the wiki](https://github.com/Quest-n-Click/quest-n-click/wiki), in English and in French.

## Releases

Current release: [v4.7.2 (Audit fixes)](https://github.com/Quest-n-Click/quest-n-click/releases/tag/v4.7.2): A patch for game authors: the Studio starts again from the installed engine, and the engine's package carries only files that can run in a game project.
Every earlier release is in the [CHANGELOG](CHANGELOG.md).

## Licences

Code: MIT. Sample artwork, sound effects and theme: CC BY 4.0 (attribution "Wano"); the theme is Tchaikovsky's *Swan
Lake* (public domain), arranged for the project. Fonts: SIL OFL. See `CREDITS.md`.

quest'n'click was called web-scumm until 4.2.5; `npx quest-n-click migrate` moves an older game. It is an independent
project: "SCUMM-style" names a kind of game, and the project is not affiliated with, endorsed by or derived from
LucasArts, Lucasfilm, Disney or the ScummVM project, and ships none of their code, data or art.
