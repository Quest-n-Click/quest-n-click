## 4.6.0: the 131 mutation exemptions read again (0 killed, 131 to 4.7.0)

- Every entry of `docs/dev/mutants.json` was due at 4.6.0. Six reviewers read them against integration/4.6.0 411d8a2a
  (one context per group of sets, read-only), then each verdict was checked again here. Of the exempted files only
  `ops/spans.ts` changed in its code since the 4.5.0 reread; `session-runtime.ts`, `save.ts` and `backup/files.ts`
  gained code away from their mutated lines, `bridge.ts` and five connector files changed only in comments.
- Killed: none. Every why still holds; none of the 131 mutants can be told from the original by an honest test.
- Bug found beside them: `ops/spans.ts` glob split a key's literal by code point (`...part`) while globMatch reads the
  path by UTF-16 unit, so a key with a character outside the BMP never matched its own file (`spanOf` threw
  UnknownSpanError). The literal is now split by unit; tests/studio-spans-mutants.test.ts pins it (checked to fail
  before the fix and pass after).
- Sharpened (4): runs.ts `r.verdict` (runWorker does not check that a signed answer carries a verdict), badges
  connector `resolve` (any falsy value that is not nullish would differ, not only `false`), play.ts's second expiry
  boundary (`expires_at` is written only with `last_seen`), spans.ts globMatch's literal token (one UTF-16 unit since
  the fix).
- Per set, kept / killed: core 3/0, reality 15/0, reality-store 7/0, reality-store-postgres 1/0, runs 20/0, speedrun
  8/0, remix 15/0, connectors-pure 11/0, connectors-edge 14/0, studio-ops 12/0, studio-auth 9/0, studio-workshop 9/0,
  voices 7/0. `docs/dev/MUTANTS.md` records the reread; `tests/mutants-json.test.ts` checks the entries at 4.6.0 and its
  pre-releases.

→ next: the studio-ops set measured on the branch (spans.ts changed); the 131 are read again at 4.7.0.
