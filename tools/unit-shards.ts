// The unit suite's shards by duration (4.5.5, #349). ci.yml's `unit` matrix runs `--shard=i/4`; vitest's own split
// gives each shard as many files, in the order of a hash of their paths, whatever they cost: in 4.5.4 shard 4 ran its
// tests in a minute and a half, the others in three to four. This sequencer splits by the duration each file took,
// recorded in tools/unit-durations.json: the longest file first, each to the shard it leaves the shortest, counting
// that a shard cannot end before its longest file. A file the table does not know counts as the median. Every shard
// computes the whole split from the same files and table, so the four agree without talking. Inside a shard the
// longest file starts first.
//
// The table is refreshed by hand when the shards drift (no need for every new test):
//   npm run test:unit -- --reporter=json --outputFile=.cache/unit.json
//   npx tsx tools/unit-shards.ts --record .cache/unit.json [more reports: the median of each file is kept]
// A laptop is not the CI runner, but the files' proportions are what the split needs.
//
// vitest is a development dependency and this file ships in the package beside vite.config.ts: it imports vitest's
// types only.
import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestSequencer, TestSpecification, Vitest } from 'vitest/node';

export const DURATIONS_FILE = fileURLToPath(new URL('./unit-durations.json', import.meta.url));

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 1;
};

/** Each file's recorded duration in milliseconds, by its path from the repository's root (`/` separators). */
export function readDurations(file = DURATIONS_FILE): Record<string, number> {
  try {
    const t = JSON.parse(readFileSync(file, 'utf8')) as { durations?: Record<string, number> };
    return t.durations ?? {};
  } catch {
    return {};
  }
}

/**
 * How many files a shard's runner works on at once. On ci.yml's ubuntu-24.04 (4 vCPU, three workers) a shard's files
 * summed to about 2.5 times its tests' wall time in the runs of 25 October 2026; 2 leaves room for each file's import
 * and keeps the files spread (at 2.2 or more the split piles a third of the suite under the longest file's shard).
 */
export const PARALLEL = 2;

/** The order the files run in: the longest recorded first, so the longest of a shard never starts last. */
export function byDuration(files: readonly string[], durations: Record<string, number>): string[] {
  const fallback = median(Object.values(durations));
  const cost = (f: string) => durations[f] ?? fallback;
  return [...new Set(files)].sort((a, b) => cost(b) - cost(a) || (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * A shard's time as the split sees it: its files run `parallel` at a time, and it cannot end before its longest file
 * (a two-minute file is the floor of its shard, whatever else it holds). The heavy suite runs one file after the other
 * (`parallel` 1, tools/heavy-shards.ts): a shard's time is then the sum of its files.
 */
export const shardTime = (longest: number, total: number, parallel = PARALLEL) => Math.max(longest, total / parallel);

/**
 * The files in `count` shards of about the same time (`shardTime`): the longest file first, each to the shard it
 * leaves the shortest, the one with the least work on a tie. The same answer whatever order the files come in.
 */
export function assignShards(
  files: readonly string[],
  durations: Record<string, number>,
  count: number,
  parallel = PARALLEL,
): string[][] {
  const fallback = median(Object.values(durations));
  const cost = (f: string) => durations[f] ?? fallback;
  const shards: string[][] = Array.from({ length: count }, () => []);
  const longest = new Array<number>(count).fill(0);
  const total = new Array<number>(count).fill(0);
  for (const f of byDuration(files, durations)) {
    let best = 0;
    for (let i = 1; i < count; i++) {
      const t = shardTime(Math.max(longest[i]!, cost(f)), total[i]! + cost(f), parallel);
      const b = shardTime(Math.max(longest[best]!, cost(f)), total[best]! + cost(f), parallel);
      if (t < b || (t === b && total[i]! < total[best]!)) best = i;
    }
    shards[best]!.push(f);
    longest[best] = Math.max(longest[best]!, cost(f));
    total[best]! += cost(f);
  }
  return shards;
}

const slash = (p: string) => p.replaceAll('\\', '/');

/** vitest's `sequence.sequencer` (vite.config.ts): `shard` and `sort` by recorded duration. */
export class DurationSequencer implements TestSequencer {
  private readonly ctx: Vitest;
  // No parameter property: Node's type stripping loads vite.config.ts and refuses one (tests/vite-config-graph.test.ts).
  constructor(ctx: Vitest) {
    this.ctx = ctx;
  }

  async shard(files: TestSpecification[]): Promise<TestSpecification[]> {
    const { config } = this.ctx;
    const { index, count } = config.shard!;
    const path = (s: TestSpecification) => slash(relative(config.root, s.moduleId));
    const mine = new Set(assignShards(files.map(path), readDurations(), count)[index - 1]);
    return files.filter((s) => mine.has(path(s)));
  }

  /** The longest recorded file first (vitest's own order, on a runner with no cache, is the largest file first). */
  async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
    const { root } = this.ctx.config;
    const path = (s: TestSpecification) => slash(relative(root, s.moduleId));
    const rank = new Map(byDuration(files.map(path), readDurations()).map((p, i) => [p, i]));
    return [...files].sort((a, b) => rank.get(path(a))! - rank.get(path(b))!);
  }
}

interface JsonReport {
  testResults: { name: string; startTime: number; endTime: number }[];
}

/** Each file's duration from vitest's JSON reports (`--reporter=json`), the median of the reports, to 100 ms. */
export function recordDurations(reports: readonly JsonReport[], root: string): Record<string, number> {
  const seen = new Map<string, number[]>();
  for (const r of reports)
    for (const t of r.testResults) {
      const p = slash(isAbsolute(t.name) ? relative(root, t.name) : t.name);
      seen.set(p, [...(seen.get(p) ?? []), t.endTime - t.startTime]);
    }
  return Object.fromEntries(
    [...seen.keys()].sort().map((p) => [p, Math.max(100, Math.round(median(seen.get(p)!) / 100) * 100)]),
  );
}

if (process.argv[1]?.endsWith('unit-shards.ts')) {
  const at = process.argv.indexOf('--record');
  const reports = at < 0 ? [] : process.argv.slice(at + 1);
  if (!reports.length) {
    console.error('usage: npx tsx tools/unit-shards.ts --record <vitest json report>...');
    process.exit(2);
  }
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const durations = recordDurations(
    reports.map((f) => JSON.parse(readFileSync(f, 'utf8')) as JsonReport),
    root,
  );
  const about = 'Each unit test file in milliseconds, for the shards of ci.yml (tools/unit-shards.ts).';
  writeFileSync(DURATIONS_FILE, `${JSON.stringify({ about, durations }, null, 2)}\n`);
  console.log(`${Object.keys(durations).length} files → ${relative(process.cwd(), DURATIONS_FILE)}`);
}
