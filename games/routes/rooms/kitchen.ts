import { defineRoom } from '@engine/core/define';

// Grandma's kitchen: Grandma's chores take her from the cupboard (she mops, the street door shuts) to the armchair
// (the floor is dry). Lou's rounds pass through and say hello.
export default defineRoom({
  id: 'kitchen',
  name: "Grandma's kitchen",
  decor: 'decor/dining',
  description: 'A cosy room at night: a bookcase, a floor lamp, French windows to the street',
  props: {
    cupboard: { name: 'cupboard', states: { shut: 'home2/r1c3', open: 'home2/r1c4' }, initial: 'shut' },
    armchair: { name: 'armchair', states: { plump: 'home2/r2c1', searched: 'home2/r2c2' }, initial: 'plump' },
  },
  actors: { grandma: { char: 'grandma', facing: 'right' }, neighbor: { char: 'neighbor', facing: 'left' } },
  exits: { windows: { name: 'French windows', to: 'street', entry: 'from_kitchen' } },
  look: {
    cupboard: 'The cupboard. The mop lives there, when Grandma lets it rest.',
    armchair: "Grandma's armchair. She sits there between two chores.",
    grandma: 'Grandma, on her chores. Mop, sit, mop, sit.',
    neighbor: 'Lou, passing through. He waves at Grandma like every night.',
    windows: 'The French windows to the street.',
  },
  talk: {
    grandma: [
      {
        id: 'kitchen.grandma.why-is-the-door-shut',
        topic: 'Why is the door shut?',
        do: [{ say: ['grandma', 'I mop, fluffball. While the floor is wet, nobody comes in. Not even Lou.'] }],
      },
    ],
    neighbor: [
      {
        id: 'kitchen.neighbor.hello-lou',
        topic: 'Hello, Lou.',
        do: [{ say: ['neighbor', 'Hello, Pixel. Just passing. Rounds wait for nobody.'] }],
      },
    ],
  },
  hints: [
    {
      until: 'cable_taken',
      lines: ['While Grandma mops, the street door stays shut: Lou waits outside it, away from his office.'],
    },
  ],
});
