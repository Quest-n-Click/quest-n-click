// The archives that carry their own lock (next, #546): the Bridge, the connectors and the Studio Server ship their
// versioned lock as npm-shrinkwrap.json (scripts/pack.mjs), and their SBOMs are read from it (scripts/sbom.mjs). npm 12
// (12.2.2) leaves npm-shrinkwrap.json out of `npm pack`; npm 10 and 11 keep it. Without these checks such an archive
// would ship without its lock, and its SBOM would be built quietly from the root lock instead.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/** The archives (by their file name, `<name>-<v>.tgz`) that carry their own lock. */
export const LOCKED = ['quest-n-click-bridge', 'quest-n-click-connectors', 'quest-n-click-studio-server'];

export const isLocked = (name) => LOCKED.includes(name);

/**
 * The paths an archive holds, as `tar -tzf` lists them (`package/…`). Run from the archive's folder with its bare name:
 * Git for Windows' GNU tar reads `C:\…` as a remote host.
 */
export const archiveEntries = (tgz) =>
  execFileSync('tar', ['-tzf', basename(tgz)], { cwd: dirname(tgz), encoding: 'utf8', maxBuffer: 1 << 26 })
    .split('\n')
    .map((l) => l.trim().replace(/^\.\//, ''))
    .filter(Boolean);

/** Why a packed archive cannot ship, or undefined: a locked one without its npm-shrinkwrap.json. */
export function shrinkwrapProblem(name, entries, npmVersion) {
  if (!isLocked(name) || entries.includes('package/npm-shrinkwrap.json')) return undefined;
  return `${name}: the archive holds no npm-shrinkwrap.json (npm ${npmVersion} packed it; npm 12 leaves it out of npm pack, npm 10 and 11 keep it). Pack with npm 10 or 11: without its lock an install resolves its dependencies again`;
}

/**
 * Which lock an unpacked archive's SBOM is read from: `shrinkwrap` (its own) or `root` (the root lock, the engine only).
 * A locked archive without its shrinkwrap throws rather than falling back to the root lock.
 */
export function sbomLock(name, dir, engine) {
  const own = existsSync(join(dir, 'npm-shrinkwrap.json'));
  if (name === engine) return own ? 'shrinkwrap' : 'root';
  if (own) return 'shrinkwrap';
  throw new Error(
    `${name}: the archive holds no npm-shrinkwrap.json, so its SBOM cannot be read from its own lock (an archive packed by npm 12?); the root lock would describe another tree`,
  );
}
