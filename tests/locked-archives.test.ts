// The locked archives carry their own lock (#546): npm 12 leaves npm-shrinkwrap.json out of `npm pack`, so the pack
// checks each locked archive holds it, and the SBOM refuses to fall back to the root lock without it.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { archiveEntries, isLocked, LOCKED, sbomLock, shrinkwrapProblem } from '../tools/release/locked.mjs';
// @ts-expect-error: a plain .mjs module without declarations
import { PACKAGES } from '../tools/release/artifacts.mjs';

const dirs: string[] = [];
const temp = () => {
  const d = mkdtempSync(join(tmpdir(), 'locked-'));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** An npm-style archive (`package/…`) holding `files`, written with tar from its own folder. */
function archive(files: string[]) {
  const d = temp();
  mkdirSync(join(d, 'package'));
  for (const f of files) writeFileSync(join(d, 'package', f), '{}\n');
  execFileSync('tar', ['-czf', 'a.tgz', 'package'], { cwd: d });
  return join(d, 'a.tgz');
}

describe('the locked archives', () => {
  it('are the Bridge, the connectors and the Studio Server, each a package the release packs', () => {
    const names = PACKAGES.map((p: { name: string }) => p.name);
    for (const n of LOCKED) expect(names).toContain(n);
    expect(isLocked('quest-n-click')).toBe(false);
    expect(isLocked('create-quest-n-click')).toBe(false);
  });

  it('pass the pack with their npm-shrinkwrap.json, and fail it without, naming the archive and the npm', () => {
    const withLock = archiveEntries(archive(['package.json', 'npm-shrinkwrap.json']));
    expect(withLock).toContain('package/npm-shrinkwrap.json');
    expect(shrinkwrapProblem('quest-n-click-bridge', withLock, '11.21.0')).toBeUndefined();

    const without = archiveEntries(archive(['package.json']));
    for (const name of LOCKED) {
      const problem = shrinkwrapProblem(name, without, '12.2.2');
      expect(problem).toContain(name);
      expect(problem).toContain('npm 12.2.2');
    }
    // The engine and its creator carry no lock: nothing to check.
    expect(shrinkwrapProblem('quest-n-click', without, '12.2.2')).toBeUndefined();
    expect(shrinkwrapProblem('create-quest-n-click', without, '12.2.2')).toBeUndefined();
  });

  it('read their SBOM from their own lock, and throw rather than fall back to the root lock', () => {
    const own = temp();
    writeFileSync(join(own, 'npm-shrinkwrap.json'), '{}\n');
    const none = temp();
    expect(sbomLock('quest-n-click-connectors', own, 'quest-n-click')).toBe('shrinkwrap');
    expect(() => sbomLock('quest-n-click-connectors', none, 'quest-n-click')).toThrow(/no npm-shrinkwrap\.json/);
    // The engine alone is read from the root lock.
    expect(sbomLock('quest-n-click', none, 'quest-n-click')).toBe('root');
  });
});
