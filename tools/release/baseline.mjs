#!/usr/bin/env node
// node tools/release/baseline.mjs --dir=<artifacts> --sha=<sha> --run=<id> --out=<dir> [--jobs=<jobs.json>] (4.1.19,
// docs/dev/PLAN-4.1.19-FIELD-CLOSURE.md §12.2): the release's exact baseline, written by the candidate it measures. It
// reads only what the candidate's jobs left (their artifacts, the run's jobs as the API lists them) and the commit's
// own ratchet (`tests/quality-baseline.json`); it measures nothing again. Writes `baseline-<version>.json` and `.md`
// under --out, which `candidate-gate` puts in the manifest beside the files the release publishes, so the baseline is
// attested with them. A measure whose artifact is missing is written "not measured on this candidate", never guessed.
// The committed sheet (`docs/dev/baselines/<version>.md`) holds the thresholds and protocols, and no run number.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const NOT_MEASURED = 'not measured on this candidate';

const json = (f) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};
const files = (dir, re) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => re.test(f))
        .sort()
    : [];
const sha256 = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const seconds = (a, b) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 1000) : null);

/** Every measure of one candidate, from its artifacts (`dir`) and its jobs (`jobs`: the API's `jobs` array). */
export function collect({ dir, sha, run, version, root = '.', jobs = null, env = process.env, now = new Date() }) {
  const q = json(join(root, 'tests/quality-baseline.json'));
  // Each attempt rebuilt from its three shards (4.5.7, #392; until 4.5.6 one report per attempt, `heavy-<n>`): a
  // shard missing and the attempt is not measured, never counted on part of the suite.
  const heavy = [1, 2, 3].map((i) => {
    const rs = [1, 2, 3].map((s) => json(join(dir, `heavy-${i}-shard-${s}`, `heavy-${i}-shard-${s}.json`)));
    if (rs.some((r) => !r)) return { attempt: i, measured: false };
    const sum = (f) => rs.reduce((s, r) => s + f(r), 0);
    const tests = rs.flatMap((r) => r.testResults.flatMap((x) => x.assertionResults));
    return {
      attempt: i,
      shards: rs.length,
      passed: sum((r) => r.numPassedTests),
      total: sum((r) => r.numTotalTests),
      skipped: sum((r) => (r.numPendingTests ?? 0) + (r.numTodoTests ?? 0)),
      seconds: Math.round(tests.reduce((s, x) => s + (x.duration || 0), 0) / 1000),
    };
  });
  const load = {};
  for (const store of ['sqlite', 'postgres']) {
    const b = json(join(dir, `bridge-load-${store}`, `bridge-load-${store}.json`));
    const r = json(join(dir, `bridge-load-${store}`, `runs-load-${store}.json`));
    // The three loads' medians (4.1.20, plan §8.3): the figure a release compares, with its spread and its baseline.
    const m = json(join(dir, `bridge-load-${store}`, `load-median-${store}.json`));
    const median = (k) =>
      m?.[k]
        ? {
            medianP95Ms: m[k].medianMs,
            minP95Ms: m[k].minMs,
            maxP95Ms: m[k].maxMs,
            baseline: m[k].baseline,
            alert: m[k].alert,
            runner: m[k].runner,
          }
        : NOT_MEASURED;
    load[store] = {
      medians: m ? { proposals: median('proposals'), leaderboard: median('leaderboard') } : NOT_MEASURED,
      proposals: b
        ? {
            count: b.proposals,
            perSecond: b.perSecond,
            p95Ms: b.latencyMs?.p95,
            gaps: b.gaps,
            commit: b.commit,
          }
        : NOT_MEASURED,
      leaderboard: r
        ? {
            runs: r.runs,
            p95Ms: r.latencyMs?.p95,
            boundMs: r.bounds?.p95Ms,
            rssMb: r.rssMb?.after,
          }
        : NOT_MEASURED,
    };
  }
  const mutation = {};
  for (const d of files(dir, /^mutation-/)) {
    // A shard's report is part of its set's (4.1.20): the set is read from its merged report, never from one shard.
    for (const f of files(join(dir, d, '.cache/mutation'), /^report-(?!.*\.shard-).*\.json$/)) {
      const r = json(join(dir, d, '.cache/mutation', f));
      if (r)
        mutation[r.set] = {
          status: r.status,
          killed: r.killed,
          total: r.total,
          inputHash: r.inputHash,
          // A report of identical inputs is reused from the Actions cache: said, with the commit it was measured on.
          measuredOn: r.commitSha,
          reused: r.commitSha !== sha,
          sources: [...new Set((r.results ?? []).map((m) => m.file))].sort(),
        };
    }
  }
  const qualify = json(join(dir, 'deployment-smoke', 'ops-qualify.json'));
  // What a large backup costs in memory (4.1.20, plan §6.5): each size's peaks and durations, per store.
  const backupMemory = {};
  for (const store of ['sqlite', 'postgres']) {
    const m = json(join(dir, `backup-memory-${store}`, `backup-memory-${store}.json`));
    backupMemory[store] = m
      ? m.sizes.map((x) => ({
          targetMb: x.targetMb,
          bytes: x.bytes,
          baseRssMb: x.baseRssMb,
          exportRssMb: x.export.rssMb,
          readRssMb: x.read.rssMb,
          restoreRssMb: x.restore.rssMb,
          seconds: { export: x.export.seconds, read: x.read.seconds, restore: x.restore.seconds },
          ofContainer: x.ofContainer,
          bounds: x.byteOver.refused && x.rowOver.refused && x.rowOver.atBoundWritten,
        }))
      : NOT_MEASURED;
  }
  const archives = files(join(dir, 'candidate-pack'), /\.tgz$/).map((f) => {
    const p = join(dir, 'candidate-pack', f);
    return { name: f, bytes: statSync(p).size, sha256: sha256(p) };
  });
  const sboms = files(join(dir, 'candidate-sbom'), /\.cdx\.json$/)
    .concat(files(join(dir, 'candidate-image'), /\.cdx\.json$/).map((f) => `image/${f}`))
    .map((f) => {
      const p = f.startsWith('image/') ? join(dir, 'candidate-image', f.slice(6)) : join(dir, 'candidate-sbom', f);
      return {
        name: basename(f),
        components: json(p)?.components?.length ?? null,
        sha256: sha256(p),
      };
    });
  const idFile = files(join(dir, 'candidate-image'), /\.json$/).find((f) => !f.endsWith('.cdx.json'));
  const image = idFile ? json(join(dir, 'candidate-image', idFile)) : null;
  const done = (jobs ?? []).filter((j) => j.started_at && j.completed_at);
  const timed = done.map((j) => ({
    name: j.name,
    conclusion: j.conclusion,
    seconds: seconds(j.started_at, j.completed_at),
  }));
  const first = done.map((j) => j.started_at).sort()[0];
  const last = done
    .map((j) => j.completed_at)
    .sort()
    .at(-1);
  const jobOf = (re) => timed.filter((j) => re.test(j.name));
  return {
    format: 'web-scumm-baseline',
    schema: 1,
    version,
    sha,
    run: String(run),
    at: now.toISOString(),
    runner: {
      os: env.RUNNER_OS ?? process.platform,
      image: env.ImageOS ?? null,
      node: process.version,
    },
    // npm's cache is setup-node's where a job asks for it; a mutation report's reuse is said per set (`reused`).
    cache:
      'npm from the Actions cache where a job sets `cache: npm`; each mutation set says whether its report was reused',
    commands: COMMANDS,
    tests: q ? { declarations: q.tests?.declarations, files: q.tests?.files } : NOT_MEASURED,
    proofs: q
      ? Object.fromEntries(['demo', 'reference'].map((g) => [g, q.games?.[g]?.proof ?? NOT_MEASURED]))
      : NOT_MEASURED,
    playerFirstVisitKB: q?.bundle?.initialJsKB ?? NOT_MEASURED,
    heavy,
    load,
    mutation: Object.keys(mutation).length ? mutation : NOT_MEASURED,
    // This candidate's own qualification only (4.1.20, plan §8.5): a report of another commit is refused, said, never
    // counted (4.1.19's baseline pointed at a qualification of 43dac1b).
    qualification: !qualify
      ? NOT_MEASURED
      : qualify.commit !== sha
        ? { refused: `qualified ${qualify.commit ?? 'no commit'}, not this candidate's ${sha}` }
        : {
            profile: qualify.profile ?? 'short',
            candidateRun: qualify.candidateRun ?? null,
            steps: qualify.steps.length,
            passed: qualify.steps.filter((s) => s.ok).length,
            names: qualify.steps.map((s) => s.name),
            seconds: Object.fromEntries(qualify.steps.map((s) => [s.id ?? s.name, Math.round((s.ms ?? 0) / 1000)])),
            failed: qualify.steps
              .filter((s) => !s.ok)
              .map((s) => ({ id: s.id ?? s.name, firstDefect: s.firstDefect ?? null })),
          },
    backupMemory,
    externalConsumer: jobOf(/^external-consumer/).length ? jobOf(/^external-consumer/) : NOT_MEASURED,
    connectorArchiveE2e: jobOf(/^connector-archive-e2e/).length ? jobOf(/^connector-archive-e2e/) : NOT_MEASURED,
    archives: archives.length ? archives : NOT_MEASURED,
    sboms: sboms.length ? sboms : NOT_MEASURED,
    image: image ?? NOT_MEASURED,
    // Not-run by construction (D33): the people's passes start on this very candidate, after its gate.
    field: 'every pass not-run at the gate (D33): the passes start on this candidate',
    duration: done.length
      ? {
          wallSeconds: seconds(first, last),
          longestJob: [...timed].sort((a, b) => b.seconds - a.seconds)[0],
          criticalPath: criticalPath(timed, needsOf(root)),
          jobs: timed,
        }
      : NOT_MEASURED,
  };
}

/** What each family runs (candidate.yml), so a figure says which command made it. */
export const COMMANDS = {
  heavy:
    'npm run test:heavy, each attempt in three shards: npx vitest run --no-file-parallelism $(npx tsx tools/heavy-shards.ts --shard=<i>/3)',
  load: 'npm run bridge:load -- --store=<sqlite|postgres://…>; npm run runs:load -- --runs=100000 --max-p95-ms=2000 --max-rss-mb=512',
  mutation: 'npm run test:mutation:core -- --set=<set>',
  qualification:
    'npm run ops:qualify -- --tarballs=candidate-pack --image-from=candidate-image --candidate-run=<run> (a pull request: --short)',
  externalConsumer: 'npm run external-consumer (the candidate archives)',
  connectorArchiveE2e: 'npm run connector-archive-e2e (the candidate archives)',
  readmeQuickstart: 'node scripts/readme-quickstart.mjs --tarballs=candidate-pack',
};

/** Each job's `needs` in candidate.yml, by job id. */
export function needsOf(root) {
  const f = join(root, '.github/workflows/candidate.yml');
  if (!existsSync(f)) return {};
  const out = {};
  let job = null;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const j = line.match(/^ {2}([a-z0-9-]+):\s*$/);
    if (j) job = j[1];
    const n = line.match(/^ {4}needs: (?:\[([^\]]*)\]|([a-z0-9-]+))\s*$/);
    if (job && n)
      out[job] = (n[1] ?? n[2])
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  }
  return out;
}

/** The chain of jobs through `needs` whose durations add up to the most (a matrix job counts its slowest line). */
export function criticalPath(timed, needs) {
  const id = (name) => name.split(' (')[0];
  const dur = {};
  for (const j of timed) dur[id(j.name)] = Math.max(dur[id(j.name)] ?? 0, j.seconds ?? 0);
  const memo = {};
  const best = (job, seen) => {
    if (memo[job]) return memo[job];
    if (seen.has(job)) return { seconds: 0, jobs: [] };
    seen.add(job);
    let tail = { seconds: 0, jobs: [] };
    for (const n of needs[job] ?? []) {
      const b = best(n, seen);
      if (b.seconds > tail.seconds) tail = b;
    }
    memo[job] = { seconds: tail.seconds + (dur[job] ?? 0), jobs: [...tail.jobs, job] };
    return memo[job];
  };
  let top = { seconds: 0, jobs: [] };
  for (const job of Object.keys(dur)) {
    const b = best(job, new Set());
    if (b.seconds > top.seconds) top = b;
  }
  return top;
}

const cell = (v) => (v === NOT_MEASURED ? `*${NOT_MEASURED}*` : v === undefined || v === null ? '—' : String(v));

/** The same measures, for a person. */
export function toMarkdown(b) {
  const L = [];
  L.push(`# Baseline ${b.version} — candidate ${b.run}`, '');
  L.push(
    `Measured by the candidate run ${b.run} on \`${b.sha}\` (${b.at}; ${b.runner.os} ${b.runner.image ?? ''}, Node ${b.runner.node}; ${b.cache}).`,
  );
  L.push('The thresholds and protocols are in `docs/dev/baselines/' + b.version + '.md`.', '');
  L.push('## Tests and proofs', '');
  L.push('| Measure | Value |', '|---|---|');
  L.push(`| Test declarations | ${cell(b.tests === NOT_MEASURED ? b.tests : b.tests.declarations)} |`);
  for (const g of ['demo', 'reference']) {
    const p = b.proofs === NOT_MEASURED ? NOT_MEASURED : b.proofs[g];
    L.push(
      `| Proof, ${g} | ${p === NOT_MEASURED ? cell(p) : `${p.status}, ${p.states} states, ${p.softlocks} softlocks`} |`,
    );
  }
  L.push(`| Player's first visit (KB of JS, gzipped) | ${cell(b.playerFirstVisitKB)} |`);
  for (const h of b.heavy)
    L.push(
      `| Heavy suite, attempt ${h.attempt} | ${h.passed === undefined ? cell(NOT_MEASURED) : `${h.passed}/${h.total} passed, ${h.skipped} skipped, ${h.seconds} s of tests in ${h.shards} shards`} |`,
    );
  L.push('', '## The Bridge', '', '| Store | Proposals | Leaderboard |', '|---|---|---|');
  for (const [s, v] of Object.entries(b.load)) {
    const p =
      v.proposals === NOT_MEASURED
        ? cell(NOT_MEASURED)
        : `${v.proposals.count}, ${v.proposals.perSecond}/s, p95 ${v.proposals.p95Ms} ms, gaps ${v.proposals.gaps}`;
    const r =
      v.leaderboard === NOT_MEASURED
        ? cell(NOT_MEASURED)
        : `${v.leaderboard.runs} runs, p95 ${v.leaderboard.p95Ms} ms (bound ${v.leaderboard.boundMs}), ${v.leaderboard.rssMb} MB`;
    L.push(`| ${s} | ${p} | ${r} |`);
  }
  // The medians of three loads (4.1.20, plan §8.3), against the baseline of the same runner and protocol.
  const med = (x) =>
    x === NOT_MEASURED
      ? cell(NOT_MEASURED)
      : `median p95 ${x.medianP95Ms} ms (${x.minP95Ms}–${x.maxP95Ms})${x.baseline?.ratio ? `, ×${x.baseline.ratio} the baseline${x.alert ? ', ALERT' : ''}` : x.baseline?.refused ? `, not compared: ${x.baseline.refused}` : ''}`;
  L.push('', '| Store | Proposals, three loads | Leaderboard, three loads |', '|---|---|---|');
  for (const [s, v] of Object.entries(b.load))
    L.push(
      v.medians === NOT_MEASURED
        ? `| ${s} | ${cell(NOT_MEASURED)} | ${cell(NOT_MEASURED)} |`
        : `| ${s} | ${med(v.medians.proposals)} | ${med(v.medians.leaderboard)} |`,
    );
  // The memory of a large backup (4.1.20, plan §6.5): the peak of each command against the qualification container.
  L.push('', '| Store | Backup | Export | Read | Restore | Of the container |', '|---|---|---|---|---|---|');
  for (const [s, v] of Object.entries(b.backupMemory ?? {}))
    if (v === NOT_MEASURED) L.push(`| ${s} | ${cell(NOT_MEASURED)} | | | | |`);
    else
      for (const x of v)
        L.push(
          `| ${s} | ${x.targetMb} MiB | ${x.exportRssMb} MB, ${x.seconds.export} s | ${x.readRssMb} MB, ${x.seconds.read} s | ${x.restoreRssMb} MB, ${x.seconds.restore} s | ${Math.round(x.ofContainer * 100)} %${x.bounds ? '' : ', a bound NOT refused'} |`,
        );
  L.push(
    '',
    `Qualification profile: ${b.qualification === NOT_MEASURED ? cell(NOT_MEASURED) : b.qualification.refused ? `refused (${b.qualification.refused})` : `${b.qualification.profile}, ${b.qualification.passed}/${b.qualification.steps} steps`}.`,
  );
  L.push('', '## Mutation', '');
  if (b.mutation === NOT_MEASURED) L.push(cell(NOT_MEASURED));
  else {
    L.push('| Set | Status | Killed or named | Report | Source files |', '|---|---|---|---|---|');
    for (const [s, m] of Object.entries(b.mutation))
      L.push(
        `| ${s} | ${m.status} | ${m.killed}/${m.total} | ${m.reused ? `reused, measured on ${String(m.measuredOn).slice(0, 12)}` : 'measured here'} | ${m.sources.length} |`,
      );
  }
  L.push('', '## Installs and connectors', '');
  for (const [k, v] of [
    ['external-consumer', b.externalConsumer],
    ['connector-archive-e2e', b.connectorArchiveE2e],
  ])
    L.push(
      `- ${k}: ${v === NOT_MEASURED ? cell(v) : v.map((j) => `${j.name} ${j.conclusion} (${j.seconds} s)`).join('; ')}`,
    );
  L.push('', '## Files', '');
  if (b.archives === NOT_MEASURED) L.push(`- archives: ${cell(NOT_MEASURED)}`);
  else for (const a of b.archives) L.push(`- ${a.name}: ${a.bytes} bytes, \`${a.sha256}\``);
  if (b.sboms === NOT_MEASURED) L.push(`- SBOMs: ${cell(NOT_MEASURED)}`);
  else for (const s of b.sboms) L.push(`- ${s.name}: ${s.components ?? '?'} components, \`${s.sha256}\``);
  L.push(`- image: ${b.image === NOT_MEASURED ? cell(NOT_MEASURED) : '`' + JSON.stringify(b.image) + '`'}`);
  L.push('', '## Commands', '');
  for (const [k, c] of Object.entries(b.commands)) L.push(`- ${k}: \`${c}\``);
  L.push('', "## People's passes", '', b.field, '', '## Duration', '');
  if (b.duration === NOT_MEASURED) L.push(cell(NOT_MEASURED));
  else {
    L.push(
      `${b.duration.wallSeconds} s from the first job's start to the last job's end; the longest job: ${b.duration.longestJob?.name} (${b.duration.longestJob?.seconds} s); the critical path through \`needs\`: ${b.duration.criticalPath.jobs.join(' → ')} (${b.duration.criticalPath.seconds} s).`,
      '',
    );
    L.push('| Job | Conclusion | Seconds |', '|---|---|---|');
    for (const j of b.duration.jobs) L.push(`| ${j.name} | ${j.conclusion} | ${j.seconds} |`);
  }
  return `${L.join('\n')}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const [dir, sha, run, out] = ['dir', 'sha', 'run', 'out'].map(arg);
  if (!dir || !sha || !run || !out) {
    console.error('usage: baseline.mjs --dir=<artifacts> --sha=<sha> --run=<id> --out=<dir> [--jobs=<jobs.json>]');
    process.exit(2);
  }
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
  const jobs = arg('jobs') ? (json(arg('jobs'))?.jobs ?? null) : null;
  const b = collect({ dir, sha, run, version, jobs });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `baseline-${version}.json`), `${JSON.stringify(b, null, 1)}\n`);
  writeFileSync(join(out, `baseline-${version}.md`), toMarkdown(b));
  console.log(`baseline-${version}: written under ${out}`);
}
