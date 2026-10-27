## Each heavy attempt of the candidate in three shards

#392: on 4.5.5's candidate (run 40324821053) the three `heavy` attempts took 44.4, 44.1 and 20.2 minutes, every other
non-mutation job ended within 17. Per file, the median of the three reports: audit 837 s, partition 409, solver-oracle
339, dominance 306, checkpoint-matrix 303, reference-proof 136, ownership 106, canonical 96, memo 79 (2611 s in all).
`tools/heavy-shards.ts` reads `test:heavy`'s list from package.json and cuts it with unit-shards' `assignShards`, which
takes a `parallel` argument now (1 here: `--no-file-parallelism`, a shard's time is its sum). The cut: audit alone
(837 s); partition, checkpoint-matrix, ownership, memo (897 s); solver-oracle, dominance, reference-proof, canonical
(877 s). The candidate keeps its three attempts (one red attempt is a red candidate): `heavy` is an attempt × shard
matrix, nine jobs, each taking its files on a line of their own under `bash -e`, so a failed tool never leaves a
`vitest run` with no filter. `baseline.mjs` and the gate's summary sum each attempt's three reports; an attempt with a
shard missing is not measured, never counted on part of the suite. The nightly's `heavy` is unchanged but keeps its
JSON report (`heavy-nightly`), from which `--record` can refresh the table.

→ next: once this has run a few candidates, drop attempts 2 and 3 (#392's part B) and keep the duration series in the
nightly; refresh `tools/heavy-durations.json` if a shard drifts past the others (audit alone is the floor).
