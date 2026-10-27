// Each heavy attempt in three shards (4.5.7, #392, tools/heavy-shards.ts): candidate.yml ran the whole suite on one
// runner per attempt, up to 44 minutes each. Every file of `test:heavy` must run in exactly one shard: a file
// missing is a proof the candidate no longer makes, a file doubled is a runner's time lost.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HEAVY_DURATIONS_FILE, heavyFiles, heavyShards, onHeavyPaths, parseShard } from '../tools/heavy-shards';
import { readDurations } from '../tools/unit-shards';

const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts as Record<string, string>;
const yml = (f: string) => readFileSync(`.github/workflows/${f}`, 'utf8');
/** A job's text in a workflow, from its `  <id>:` line to the next job's. */
const job = (text: string, id: string) => {
  const start = text.indexOf(`\n  ${id}:\n`);
  expect(start, id).toBeGreaterThan(0);
  const next = text.slice(start + 1).search(/\n {2}[a-z0-9-]+:\n/);
  return text.slice(start, next < 0 ? undefined : start + 1 + next);
};
const SHARDS = 3;

describe("the heavy suite's shards", () => {
  it("are test:heavy's files, each in exactly one shard, none missing, none doubled", () => {
    const files = heavyFiles();
    expect(files.length).toBeGreaterThanOrEqual(9);
    expect(new Set(files).size, 'a file twice in test:heavy').toBe(files.length);
    const shards = heavyShards(SHARDS);
    expect(shards).toHaveLength(SHARDS);
    for (const s of shards) expect(s.length, 'an empty shard would run the whole repository').toBeGreaterThan(0);
    expect(shards.flat()).toHaveLength(files.length);
    expect([...shards.flat()].sort()).toEqual([...files].sort());
  });

  it('read the list from test:heavy: a file added there goes to one shard, unrecorded', () => {
    const more = { 'test:heavy': `${scripts['test:heavy']} tests/new-heavy.test.ts` };
    const files = heavyFiles(more);
    expect(files).toContain('tests/new-heavy.test.ts');
    const shards = heavyShards(SHARDS, files);
    expect(shards.flat().filter((f) => f === 'tests/new-heavy.test.ts')).toHaveLength(1);
    expect([...shards.flat()].sort()).toEqual([...files].sort());
  });

  it('run one file after the other, as test:heavy does', () => {
    expect(scripts['test:heavy']).toMatch(/^vitest run --no-file-parallelism /);
  });

  it('are balanced by the recorded durations, every heavy file recorded and nothing else', () => {
    const d = readDurations(HEAVY_DURATIONS_FILE);
    expect(Object.keys(d).sort(), HEAVY_DURATIONS_FILE).toEqual([...heavyFiles()].sort());
    const sums = heavyShards(SHARDS).map((s) => s.reduce((t, f) => t + d[f]!, 0));
    const longest = Math.max(...Object.values(d));
    // No shard waits more than a tenth past the larger of the longest file and a third of the suite.
    const floor = Math.max(longest, Object.values(d).reduce((a, b) => a + b, 0) / SHARDS);
    expect(Math.max(...sums) / floor).toBeLessThan(1.1);
  });

  it('refuse a shard out of range', () => {
    expect(parseShard('2/3')).toEqual([2, 3]);
    for (const bad of ['0/3', '4/3', '1', 'a/b', '1/0']) expect(() => parseShard(bad)).toThrow(/not a shard/);
  });

  it("name a runner's files by their test:heavy path when recording", () => {
    const r = onHeavyPaths(
      {
        testResults: [
          { name: '/home/runner/work/q/q/tests/audit.test.ts', startTime: 0, endTime: 1 },
          { name: 'D:\\a\\q\\tests\\memo.test.ts', startTime: 0, endTime: 1 },
        ],
      },
      ['tests/audit.test.ts', 'tests/memo.test.ts'],
    );
    expect(r.testResults.map((t) => t.name)).toEqual(['tests/audit.test.ts', 'tests/memo.test.ts']);
  });
});

describe('the workflows', () => {
  it('the candidate keeps three attempts, each in three shards from tools/heavy-shards.ts', () => {
    const heavy = job(yml('candidate.yml'), 'heavy');
    expect(heavy).toMatch(/matrix:\s*\n\s*attempt: \[1, 2, 3\]\s*\n\s*shard: \[1, 2, 3\]/);
    expect(heavy).toContain('npx tsx tools/heavy-shards.ts --shard=${{ matrix.shard }}/3');
    expect(heavy).toContain('npx vitest run --no-file-parallelism $files');
    // The list on its own line, so a failed tool stops the step before any `vitest run`.
    expect(heavy).toMatch(/\n\s+files=\$\(npx tsx tools\/heavy-shards\.ts/);
    expect(heavy).toContain('shell: bash');
    expect(heavy).not.toContain('npm run test:heavy');
    expect(heavy).toContain('--outputFile.json=heavy-${{ matrix.attempt }}-shard-${{ matrix.shard }}.json');
    expect(heavy).toContain('name: heavy-${{ matrix.attempt }}-shard-${{ matrix.shard }}');
  });

  it("the gate's summary rebuilds each attempt from its shards, and lists the nine reports when missing", () => {
    const gate = job(yml('candidate.yml'), 'candidate-gate');
    expect(gate).toContain("'artifacts/heavy-$a-shard-'+s+'/heavy-$a-shard-'+s+'.json'");
    expect(gate).toContain('$(for a in 1 2 3; do for s in 1 2 3; do echo heavy-$a-shard-$s; done; done)');
    expect(gate).not.toMatch(/heavy-[123] /);
  });

  it('the nightly runs the whole suite once on one runner and keeps its report', () => {
    const heavy = job(yml('nightly.yml'), 'heavy');
    expect(heavy).not.toContain('matrix');
    expect(heavy).toContain(
      'npm run test:heavy -- --reporter=default --reporter=json --outputFile.json=heavy-nightly.json',
    );
    expect(heavy).toContain('name: heavy-nightly');
  });
});
