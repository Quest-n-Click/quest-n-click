### Changes

- **The 131 mutation exemptions read again (4.6.0)**: each entry of `docs/dev/mutants.json` came due at 4.6.0 and was
  checked against the code. All 131 still hold: no test can tell one of these mutants from the original. Four reasons
  are sharpened (a run's verdict, a badge connector's `resolve`, a game session's second expiry boundary, a spans
  glob's literal token). The 131 are read again at 4.7.0.

### Fixed

- **A spans.json key with an emoji names its file (4.6.0)**: a key of a game's own `spans.json` holding a character
  outside the Basic Multilingual Plane (`notes/😀.md`, or `docs/😀*`) never matched its own file, so the Studio said
  the file belonged to no span. Such keys now match like any other.
