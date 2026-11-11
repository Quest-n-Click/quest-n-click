### Fixed

- **`prepare`'s next mark rewrites the wiki's generated sources too, so the pages match them (next, #550)**: the step
  wrote the version in a generated page (`reference.npm-scripts`) but left `next` in `wiki/data/npm-scripts.json`, its
  source, and the publication check refused both pages until the data was fixed by hand (4.7.3). Each string of
  `wiki/data/*.json` is now read as prose, the way its page reads it, every other byte kept; and after the rewrite the
  step checks every generated part against its source, stopping right there when one no longer matches.
