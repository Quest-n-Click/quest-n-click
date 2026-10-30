import { defineRoom } from '@engine/core/define';

// The street at night, between Lou's office and Grandma's kitchen: Lou's rounds cross it twice. The fuse box wants the
// spare cable Lou keeps behind his map.
export default defineRoom({
  id: 'street',
  name: 'The street',
  decor: 'decor/street',
  description: 'A market street at night: two blue doors under stone arches, closed stalls, unlit lanterns',
  renderer: 'canvas',
  stage: {
    lights: [
      { id: 'dark', kind: 'ambient', color: '#2a3070', intensity: 0.55, blend: 'multiply', visible: '!lights_on' },
      { id: 'glow', kind: 'radial', color: '#ffcc66', intensity: 0.7, visible: 'lights_on' },
    ],
    transition: 'fade',
  },
  actors: { neighbor: { char: 'neighbor', facing: 'right' } },
  hotspots: {
    fusebox: { name: 'fuse box' },
    stalls: { name: 'closed stalls' },
  },
  exits: {
    hall_door: { name: 'left blue door', to: 'hall', entry: 'from_street' },
    // Grandma mops the kitchen now and then: a wet floor shuts the door, for Pixel and for Lou.
    kitchen_door: {
      name: 'right blue door',
      to: 'kitchen',
      entry: 'from_street',
      if: '!mopping',
      locked: 'Grandma shouts through the door: "Wet floor! Nobody comes in!"',
    },
  },
  look: {
    fusebox: [
      'The fuse box. One cable is burnt black. Lou keeps spares in his office.',
      'Still the fuse box. Still burnt.',
    ],
    stalls: 'Closed stalls. They open when the lights come back.',
    hall_door: "The left blue door: Lou's festival office.",
    kitchen_door: "The right blue door: Grandma's kitchen. It smells of soap.",
    neighbor: 'Lou, on his rounds. Clipboard, whistle, purpose.',
  },
  on: [
    {
      id: 'street.use-cable-fusebox',
      verb: 'use',
      a: 'cable',
      b: 'fusebox',
      if: '!lights_on',
      do: [
        { lose: 'cable' },
        { set: 'lights_on' },
        { say: ['hero', 'New cable, right hole. LIGHT! Lou will think he did it.'] },
        { end: true },
      ],
    },
    {
      id: 'street.open-fusebox',
      verb: 'open',
      a: 'fusebox',
      do: [{ say: ['hero', 'Open. Burnt. I need one of the spare cables Lou guards like treasure.'] }],
    },
  ],
  talk: {
    neighbor: [
      {
        id: 'street.neighbor.what-are-you-doing',
        topic: 'What are you doing?',
        do: [{ say: ['neighbor', 'My rounds! Office, street, kitchen, street, office. Every night. Like a clock.'] }],
      },
      // A detour the scenario starts: Lou looks at the stalls, then goes back to his rounds where he left them.
      {
        id: 'street.neighbor.the-stalls-look-wobbly',
        topic: 'The stalls look wobbly.',
        if: { all: ['!stalls_checked', { actorIn: ['neighbor', 'street'] }] },
        do: [
          { set: 'stalls_checked' },
          { say: ['neighbor', 'Wobbly? On festival night? I must see that.'] },
          { startScript: 'stalls' },
        ],
      },
    ],
  },
  hints: [
    {
      until: 'cable_taken',
      lines: ['The spare cables are in Lou’s office, behind the big map. Wait until Lou is out on his rounds.'],
    },
  ],
});
