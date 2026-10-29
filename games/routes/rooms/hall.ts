import { defineRoom } from '@engine/core/define';

// Lou's festival office. The spare cables are behind the big map, and Lou does not let a cat near them: the way in is
// his absence, while his rounds take him to the street and the kitchen.
export default defineRoom({
  id: 'hall',
  name: 'The festival office',
  decor: 'decor/map',
  description: "A room papered with a huge old map; Lou's office for the festival",
  actors: { neighbor: { char: 'neighbor', facing: 'left' } },
  hotspots: { map: { name: 'big map' } },
  exits: { out: { name: 'back to the street', to: 'street', entry: 'from_hall' } },
  look: {
    map: 'A map of the whole world. Something rustles behind it. Cables?',
    neighbor: 'Lou, festival organiser. He has a whistle and a clipboard.',
    out: 'Back to the street.',
  },
  on: [
    {
      id: 'hall.take-map',
      verb: ['take', 'open', 'push'],
      a: 'map',
      if: { all: ['!cable_taken', { not: { actorIn: ['neighbor', 'hall'] } }] },
      do: [
        { gain: 'cable' },
        { set: 'cable_taken' },
        { say: ['hero', 'Behind the map: a box of spare cables. One for the street. Lou will never know.'] },
      ],
    },
    {
      id: 'hall.take-map-2',
      verb: ['take', 'open', 'push'],
      a: 'map',
      if: '!cable_taken',
      do: [{ say: ['neighbor', 'Paws off my map, Pixel. My spares live there.'] }],
    },
    { id: 'hall.take-map-3', verb: ['take', 'open', 'push'], a: 'map', do: [{ say: ['hero', 'One cable is enough. I am a modest cat.'] }] },
  ],
  talk: {
    neighbor: [
      {
        id: 'hall.neighbor.can-i-borrow-a-cable',
        topic: 'Can I borrow a cable?',
        do: [{ say: ['neighbor', 'A cable? For a cat? No. They are for the fuse box, and I will fix it. Later.'] }],
      },
      {
        id: 'hall.neighbor.where-are-you-going',
        topic: 'Where are you going?',
        do: [{ say: ['neighbor', 'Rounds. Street, Grandma, street, back here. I am never gone long.'] }],
      },
    ],
  },
  hints: [
    {
      until: 'cable_taken',
      lines: ['Lou never leaves his map while he is here. Watch his rounds: the office is empty for a while.'],
    },
  ],
});
