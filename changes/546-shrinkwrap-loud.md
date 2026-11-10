### Changes

- **A locked archive without its lock stops the pack and its SBOM (next, #546)**: npm 12 leaves
  `npm-shrinkwrap.json` out of `npm pack`; npm 10 and 11 keep it. Packed with npm 12, the Bridge, connectors and Studio
  Server archives would have shipped without their locks, and `scripts/sbom.mjs` would have built their SBOMs quietly
  from the root lock. Now `scripts/pack.mjs` checks each of those archives holds its `npm-shrinkwrap.json` and stops,
  naming the archive and the npm that packed it; `sbom.mjs` reads the root lock for the engine only and refuses a locked
  archive without its own. One module, `scripts/locked.mjs`, holds both checks. What is published is unchanged:
  the candidate packs with npm 10.
