import { defineGame } from '@engine/core/define';
import { characters } from './cast';
import street from './rooms/street';
import hall from './rooms/hall';
import kitchen from './rooms/kitchen';
import { game as demo } from '../demo/game';
import { rules as reference } from '../reference/rules';

// "Lou's Rounds": the playable example of routes (4.6.0 "Routes", ADR 0031). Lou walks his rounds through three rooms on
// the world's clock, seen or not: his office, the street, Grandma's kitchen, and back. Grandma does her chores in the
// kitchen, and while she mops, the street door is shut, for Lou too: he waits at it. Pixel needs a spare cable from
// behind Lou's map, and Lou does not let a cat near it: the way is his absence. Talking to Lou stops him while you
// talk; a wobbly stall sends him on a detour, after which he goes back to his rounds. The reference chapter's art
// and rooms (D13); the points the routes walk to are placed in the layouts. Its e2e: e2e.mjs.
export const game = defineGame({
  id: 'routes',
  title: "Lou's Rounds",
  lang: 'en',
  schemaVersion: 3,
  saveVersion: 1,
  hero: 'hero',
  verbs: demo.verbs.filter((v) => ['open', 'take', 'look', 'talk', 'use', 'push'].includes(v.id)),
  characters,
  items: { cable: { name: 'spare cable', icon: 'items/r1c2', look: 'A long spare cable. For the fuse box.' } },
  rooms: [street, hall, kitchen],
  rules: { fallbacks: reference.fallbacks },
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
          {
            id: 'chat',
            wait: 2500,
            face: 'left',
            do: [{ if: { room: 'kitchen' }, then: [{ say: ['neighbor', 'Evening, Grandma! Rounds as usual.'] }] }],
          },
          { id: 'to-street', exit: 'windows' },
          { id: 'home', exit: 'hall_door' },
        ],
      },
    },
    {
      id: 'chores',
      loop: true,
      route: {
        who: 'grandma',
        from: 'kitchen',
        steps: [
          { id: 'mop', walk: 'cupboard', do: [{ set: 'mopping' }] },
          { id: 'mopping', wait: 5000, face: 'left' },
          { id: 'sit', walk: 'armchair', do: [{ unset: 'mopping' }] },
          { id: 'rest', wait: 6000, face: 'right' },
        ],
      },
    },
    // The detour: Lou checks the stall Pixel worried about, then resumes his rounds in the street, where he left them.
    {
      id: 'stalls',
      manual: true,
      route: {
        who: 'neighbor',
        from: 'street',
        steps: [
          { id: 'look', walk: 'fusebox' },
          { id: 'shake', wait: 2000, face: 'left' },
          {
            id: 'back',
            walk: 'stalls',
            do: [{ say: ['neighbor', 'Solid as a rock. Back to my rounds.'] }, { resumeScript: 'rounds' }],
          },
        ],
      },
    },
  ],
  globalTalk: demo.globalTalk,
  start: {
    room: 'street',
    intro: [
      { say: ['hero', 'Festival night, and the fuse box is burnt. Lou has spare cables in his office.'] },
      { say: ['hero', 'He never lets me near them. But Lou does his rounds. Every night. Like a clock.'] },
    ],
  },
  checkpoints: {
    office: { room: 'hall' },
    kitchen: { room: 'kitchen' },
    cable: { room: 'street', inventory: ['cable'], flags: { cable_taken: true } },
  },
  skin: { ...demo.skin, sounds: {} },
  titleScreen: { decor: 'decor/street', footer: "Lou walks his rounds. A quest'n'click example." },
  credits: ["LOU'S ROUNDS", '', "An example of quest'n'click: routes", '', "Art: the sample game's (CC BY 4.0)", '', 'Thanks for playing!'],
  ui: demo.ui,
});
