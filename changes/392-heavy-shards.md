### Changes

- **Each heavy attempt of the candidate runs in three shards (4.5.7, #392)**: the candidate's `heavy` job ran the whole
  solver suite three times, each attempt on one runner – up to 44 minutes each, the candidate's critical path. It keeps
  its three attempts, and each is now cut in three shards by the files' recorded durations (`tools/heavy-shards.ts`,
  `tools/heavy-durations.json`), one runner each, one file after the other: nine jobs of about 15 minutes.
  `tests/heavy-shards.test.ts` pins that the shards cover `test:heavy`'s list with no file missing or doubled. The
  release's baseline and the candidate's summary rebuild each attempt from its three reports (`heavy-<a>-shard-<s>`);
  an attempt with a shard missing is "not measured". The nightly's single heavy run now keeps its JSON report
  (`heavy-nightly`).
