// Two rooms and two characters on routes (4.6.0 "Routes"): the guard does his rounds through the yard and the shed,
// the cat paces the yard. The geometry is the layouts' (points, exits' hotspots), never the routes'.
import type { GameDef, Layout } from '@engine/core/types';

export function routesGame(): GameDef {
  return {
    id: 'routes-fixture',
    title: 'Routes',
    saveVersion: 1,
    hero: 'hero',
    verbs: [
      { id: 'look', label: 'Look', color: '#fff' },
      { id: 'talk', label: 'Talk', color: '#fff' },
      { id: 'use', label: 'Use', color: '#fff', join: 'with' },
    ],
    characters: {
      hero: { name: 'Hero', color: '#fff', sprites: { idle: ['h/1'] } },
      guard: { name: 'Guard', color: '#f00', room: 'yard', sprites: { idle: ['g/1'] } },
      cat: { name: 'Cat', color: '#0f0', room: 'yard', sprites: { idle: ['c/1'] } },
    },
    items: { key: { name: 'key', icon: 'i/key' } },
    rooms: [
      {
        id: 'yard',
        name: 'Yard',
        decor: 'd/yard',
        actors: { guard: { char: 'guard' }, cat: { char: 'cat' } },
        exits: { door: { name: 'shed door', to: 'shed', entry: 'yard', if: '!door_locked' } },
        talk: { guard: [{ id: 'hello', topic: 'Hello.', do: [{ say: ['guard', 'Move along.'] }] }] },
      },
      {
        id: 'shed',
        name: 'Shed',
        decor: 'd/shed',
        actors: { guard: { char: 'guard' } },
        props: { crate: { img: 'o/crate', name: 'crate' } },
        exits: { out: { name: 'yard', to: 'yard', entry: 'shed' } },
        on: [
          {
            id: 'take-key',
            verb: 'use',
            a: 'crate',
            if: { not: { actorIn: ['guard', 'shed'] } },
            do: [{ gain: 'key' }, { end: true }],
          },
        ],
      },
    ],
    scripts: [
      {
        id: 'rounds',
        loop: true,
        route: {
          who: 'guard',
          from: 'yard',
          steps: [
            { id: 'post', walk: 'post' },
            { id: 'watch', wait: 1000, face: 'left' },
            { id: 'in', exit: 'door' },
            { id: 'crate', walk: 'crate' },
            { id: 'check', wait: 500, do: [{ inc: 'checks' }] },
            { id: 'out', exit: 'out' },
          ],
        },
      },
      {
        id: 'pace',
        loop: true,
        route: {
          who: 'cat',
          from: 'yard',
          steps: [
            { id: 'left', walk: 'west' },
            { id: 'right', walk: 'east' },
          ],
        },
      },
      {
        id: 'detour',
        manual: true,
        route: { who: 'guard', from: 'yard', steps: [{ id: 'gate', walk: 'gate' }] },
      },
    ],
    rules: { fallbacks: { look: ['Nothing.'], talk: ['…'], use: ['No.'], use2: ['No.'] } },
    start: { room: 'yard' },
    skin: { icons: { map: 'ui/map', pause: 'ui/pause', music: 'ui/music' } },
    ui: {} as GameDef['ui'],
  };
}

const floor: Layout['walk'] = {
  area: [
    [0, 250],
    [640, 250],
    [640, 395],
    [0, 395],
  ],
};

export const routesLayouts: Record<string, Layout> = {
  yard: {
    entries: { default: [320, 360], shed: [560, 320] },
    walk: floor,
    points: { post: [400, 300], west: [100, 340], east: [300, 340], gate: [40, 300] },
    actors: { guard: { x: 100, y: 300, h: 110 }, cat: { x: 200, y: 340, h: 40 } },
    hotspots: { door: { rect: [560, 200, 60, 100], approach: [590, 300] } },
  },
  shed: {
    entries: { default: [320, 360], yard: [80, 320] },
    walk: floor,
    points: { crate: [300, 320] },
    actors: { guard: { x: 80, y: 320, h: 110 } },
    props: { crate: { x: 320, y: 330, h: 40 } },
    hotspots: { out: { rect: [20, 200, 60, 100], approach: [50, 320] } },
  },
};
