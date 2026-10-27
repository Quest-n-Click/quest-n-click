// The candidate's own baseline (4.1.19, plan §12.2): written from what its jobs left, a missing measure said so.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error: a plain .mjs module without declarations
import { collect, criticalPath, NOT_MEASURED, needsOf, toMarkdown } from '../tools/release/baseline.mjs';

let dir = '';
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const put = (rel: string, body: unknown) => {
  const f = join(dir, rel);
  mkdirSync(join(f, '..'), { recursive: true });
  writeFileSync(f, typeof body === 'string' ? body : JSON.stringify(body));
};

describe('the candidate baseline', () => {
  it('finds the critical path through needs, a matrix job counted by its slowest line', () => {
    const needs = {
      pack: ['target'],
      image: ['target', 'pack'],
      smoke: ['target', 'pack', 'image'],
      heavy: ['target'],
    };
    const timed = [
      { name: 'target', seconds: 5 },
      { name: 'pack', seconds: 100 },
      { name: 'image', seconds: 200 },
      { name: 'smoke', seconds: 300 },
      { name: 'heavy (1)', seconds: 400 },
      { name: 'heavy (2)', seconds: 550 },
    ];
    expect(criticalPath(timed, needs)).toEqual({ seconds: 605, jobs: ['target', 'pack', 'image', 'smoke'] });
    // The workflow's own graph is read.
    expect(needsOf('.')['candidate-gate']).toContain('deployment-smoke');
  });

  it('reads every artifact it knows and the run jobs, without measuring again', () => {
    dir = mkdtempSync(join(tmpdir(), 'baseline-'));
    // Each attempt in three shards (4.5.7, #392): attempt 1 whole, attempt 2 without its shard 3, attempt 3 absent.
    const shard = (passed: number, skipped: number, ms: number[]) => ({
      numPassedTests: passed,
      numTotalTests: passed + skipped,
      numPendingTests: skipped,
      testResults: [{ assertionResults: ms.map((duration) => ({ duration })) }],
    });
    put('heavy-1-shard-1/heavy-1-shard-1.json', shard(3, 0, [1500]));
    put('heavy-1-shard-2/heavy-1-shard-2.json', shard(4, 1, [1000, 500]));
    put('heavy-1-shard-3/heavy-1-shard-3.json', shard(2, 0, [1000]));
    put('heavy-2-shard-1/heavy-2-shard-1.json', shard(3, 0, [1500]));
    put('heavy-2-shard-2/heavy-2-shard-2.json', shard(4, 1, [1000]));
    // A report of the old shape (one per attempt, until 4.5.6) is not read as an attempt.
    put('heavy-3/heavy-3.json', { numPassedTests: 1, numTotalTests: 1, testResults: [] });
    put('bridge-load-sqlite/bridge-load-sqlite.json', {
      proposals: 50000,
      perSecond: 370,
      latencyMs: { p95: 440 },
      gaps: 0,
      commit: 'abc',
    });
    const lm = {
      medianMs: 410,
      minMs: 390,
      maxMs: 700,
      baseline: { p95Ms: 400, source: 's', ratio: 1.02 },
      alert: false,
      runner: { os: 'Linux', image: 'ubuntu24' },
    };
    put('bridge-load-sqlite/load-median-sqlite.json', { proposals: lm, leaderboard: lm });
    put('bridge-load-sqlite/runs-load-sqlite.json', {
      runs: 100000,
      latencyMs: { p95: 380 },
      bounds: { p95Ms: 2000 },
      rssMb: { after: 127 },
    });
    put('mutation-core/.cache/mutation/report-core.json', {
      set: 'core',
      status: 'passed',
      killed: 10,
      total: 10,
      inputHash: 'h',
      commitSha: 'old',
      results: [{ file: 'a.ts' }, { file: 'a.ts' }],
    });
    // A shard's report beside its set's merged one (4.1.20): the set is read from the merged report only.
    put('mutation-shard-core-1of1/.cache/mutation/report-core.shard-1of1.json', {
      set: 'core',
      status: 'failed',
      killed: 1,
      total: 5,
      inputHash: 'shard',
      commitSha: 'old',
      results: [{ file: 'z.ts' }],
    });
    put('deployment-smoke/ops-qualify.json', {
      schema: 2,
      profile: 'full',
      commit: 'f'.repeat(40),
      candidateRun: '42',
      steps: [
        { id: 'a', name: 'a', ok: true, ms: 1000 },
        { id: 'b', name: 'b', ok: false, ms: 2000, firstDefect: 'refused' },
      ],
    });
    put('candidate-pack/web-scumm-4.1.19.tgz', 'tgz');
    put('candidate-sbom/web-scumm.cdx.json', { components: [{}, {}] });
    put('candidate-image/web-scumm-bridge-image.json', { config: 'sha256:c' });
    put('candidate-image/web-scumm-bridge-image.cdx.json', {
      components: [{}],
    });
    const jobs = [
      {
        name: 'external-consumer (ubuntu-24.04, 22)',
        conclusion: 'success',
        started_at: '2026-10-11T10:00:00Z',
        completed_at: '2026-10-11T10:01:00Z',
      },
      {
        name: 'heavy (1)',
        conclusion: 'success',
        started_at: '2026-10-11T10:00:00Z',
        completed_at: '2026-10-11T10:40:00Z',
      },
      {
        name: 'candidate-gate',
        conclusion: null,
        started_at: '2026-10-11T10:41:00Z',
        completed_at: null,
      },
    ];
    const b = collect({
      dir,
      sha: 'f'.repeat(40),
      run: 42,
      version: '4.1.19',
      jobs,
      env: {},
      now: new Date(0),
    });
    expect(b).toMatchObject({
      format: 'web-scumm-baseline',
      schema: 1,
      version: '4.1.19',
      run: '42',
    });
    // The three shards summed: 9 of 10 passed, 1 skipped, 4 s of tests.
    expect(b.heavy[0]).toEqual({ attempt: 1, shards: 3, passed: 9, total: 10, skipped: 1, seconds: 4 });
    // A shard missing: the attempt is not measured, never counted on part of the suite.
    expect(b.heavy[1]).toEqual({ attempt: 2, measured: false });
    expect(b.heavy[2]).toEqual({ attempt: 3, measured: false });
    expect(b.heavy).toHaveLength(3);
    expect(b.load.sqlite.proposals.perSecond).toBe(370);
    expect(b.load.postgres.proposals).toBe(NOT_MEASURED);
    expect(b.load.postgres.medians).toBe(NOT_MEASURED);
    expect(b.load.sqlite.medians.proposals).toEqual({
      medianP95Ms: 410,
      minP95Ms: 390,
      maxP95Ms: 700,
      baseline: { p95Ms: 400, source: 's', ratio: 1.02 },
      alert: false,
      runner: { os: 'Linux', image: 'ubuntu24' },
    });
    expect(b.mutation.core).toMatchObject({
      killed: 10,
      total: 10,
      reused: true,
      measuredOn: 'old',
      sources: ['a.ts'],
    });
    expect(b.qualification).toMatchObject({
      profile: 'full',
      candidateRun: '42',
      steps: 2,
      passed: 1,
      seconds: { a: 1, b: 2 },
      failed: [{ id: 'b', firstDefect: 'refused' }],
    });
    expect(b.archives[0]).toMatchObject({
      name: 'web-scumm-4.1.19.tgz',
      bytes: 3,
    });
    expect(b.sboms.map((s: { name: string; components: number }) => [s.name, s.components])).toEqual([
      ['web-scumm.cdx.json', 2],
      ['web-scumm-bridge-image.cdx.json', 1],
    ]);
    expect(b.image).toEqual({ config: 'sha256:c' });
    expect(b.externalConsumer).toEqual([
      {
        name: 'external-consumer (ubuntu-24.04, 22)',
        conclusion: 'success',
        seconds: 60,
      },
    ]);
    expect(b.connectorArchiveE2e).toBe(NOT_MEASURED);
    expect(b.duration.wallSeconds).toBe(2400);
    expect(b.duration.longestJob.name).toBe('heavy (1)');

    // The tests and proofs from the commit's own ratchet.
    const q = JSON.parse(readFileSync('tests/quality-baseline.json', 'utf8'));
    expect(b.tests.declarations).toBe(q.tests.declarations);
    expect(b.proofs.reference.states).toBe(q.games.reference.proof.states);
    const md = toMarkdown(b);
    expect(md).toContain('# Baseline 4.1.19 — candidate 42');
    expect(md).toContain(`*${NOT_MEASURED}*`);
    expect(md).toContain('| core | passed | 10/10 |');
    expect(md).toContain('| Heavy suite, attempt 1 | 9/10 passed, 1 skipped, 4 s of tests in 3 shards |');
    expect(md).toContain(`| Heavy suite, attempt 2 | *${NOT_MEASURED}* |`);
  });

  it('refuses a qualification of another commit: never a figure of an earlier candidate (4.1.20, plan §8.5)', () => {
    const d = mkdtempSync(join(tmpdir(), 'baseline-other-'));
    mkdirSync(join(d, 'deployment-smoke'));
    writeFileSync(
      join(d, 'deployment-smoke', 'ops-qualify.json'),
      JSON.stringify({ schema: 2, profile: 'full', commit: 'e'.repeat(40), steps: [{ id: 'a', ok: true, ms: 1 }] }),
    );
    const b = collect({ dir: d, sha: 'f'.repeat(40), run: 1, version: '4.1.20', env: {}, now: new Date(0) });
    expect(b.qualification).toEqual({ refused: `qualified ${'e'.repeat(40)}, not this candidate's ${'f'.repeat(40)}` });
    expect(toMarkdown(b)).toContain(`Qualification profile: refused (qualified ${'e'.repeat(40)}`);
  });

  it('says every measure missing when the candidate left nothing', () => {
    dir = mkdtempSync(join(tmpdir(), 'baseline-'));
    const b = collect({
      dir,
      sha: 'f'.repeat(40),
      run: 1,
      version: '4.1.19',
      root: dir,
      env: {},
    });
    for (const k of [
      'tests',
      'mutation',
      'qualification',
      'archives',
      'sboms',
      'image',
      'duration',
      'externalConsumer',
    ])
      expect(b[k], k).toBe(NOT_MEASURED);
    expect(() => toMarkdown(b)).not.toThrow();
  });
});
