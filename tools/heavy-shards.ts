// The heavy solver suite in shards by duration (4.5.7, #392). candidate.yml ran `npm run test:heavy` three times, each
// attempt whole on one runner: up to 44 minutes each, the candidate's critical path. Each attempt is now cut in three
// shards on three runners. The files are `test:heavy`'s own list (package.json, the one place it is written), cut by
// tools/unit-shards.ts's `assignShards` at one file at a time (`--no-file-parallelism`: a shard's time is the sum of
// its files), from the durations recorded in tools/heavy-durations.json. Every file runs in exactly one shard
// (tests/heavy-shards.test.ts): a file added to `test:heavy` goes to a shard by itself, counted as the median.
//
//   npx tsx tools/heavy-shards.ts --shard=<i>/<n>     the files of shard i, on one line (candidate.yml's `heavy`)
//   npx tsx tools/heavy-shards.ts --plan=<n>          the cut and each shard's recorded seconds
//   npx tsx tools/heavy-shards.ts --record <vitest json report>...   refresh the table (the median of each file)
//
// The table is refreshed by hand when the shards drift, from JSON reports of whole runs: the nightly's `heavy-nightly`
// artefact, or a candidate's shard reports.
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assignShards, readDurations, recordDurations } from './unit-shards.ts';

export const HEAVY_DURATIONS_FILE = fileURLToPath(new URL('./heavy-durations.json', import.meta.url));
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** The files `npm run test:heavy` runs, in its order, from package.json's script. */
export function heavyFiles(scripts?: Record<string, string>): string[] {
  const s =
    scripts ?? (JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).scripts as Record<string, string>);
  const script = s['test:heavy'];
  if (!script) throw new Error('package.json has no test:heavy script');
  return script.split(/\s+/).filter((w) => /\.test\.ts$/.test(w));
}

/** The heavy files in `count` shards of about the same summed duration, one file at a time in each. */
export function heavyShards(
  count: number,
  files: readonly string[] = heavyFiles(),
  durations: Record<string, number> = readDurations(HEAVY_DURATIONS_FILE),
): string[][] {
  return assignShards(files, durations, count, 1);
}

/** `i/n` → [i, n], refused unless 1 ≤ i ≤ n. */
export function parseShard(arg: string): [number, number] {
  const m = /^(\d+)\/(\d+)$/.exec(arg);
  const [i, n] = m ? [Number(m[1]), Number(m[2])] : [0, 0];
  if (!m || n < 1 || i < 1 || i > n) throw new Error(`not a shard: ${arg} (want i/n, 1 ≤ i ≤ n)`);
  return [i, n];
}

interface JsonReport {
  testResults: { name: string; startTime: number; endTime: number }[];
}

/** A runner's report names its files by an absolute path of that runner: each is named by its `test:heavy` path. */
export function onHeavyPaths(report: JsonReport, files: readonly string[]): JsonReport {
  return {
    testResults: report.testResults.map((t) => {
      const name = t.name.replaceAll('\\', '/');
      return { ...t, name: files.find((f) => name === f || name.endsWith(`/${f}`)) ?? name };
    }),
  };
}

if (process.argv[1]?.endsWith('heavy-shards.ts')) {
  const args = process.argv.slice(2);
  const opt = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  try {
    if (opt('shard')) {
      const [i, n] = parseShard(opt('shard')!);
      const mine = heavyShards(n)[i - 1]!;
      // An empty shard would run `vitest run` with no filter: every test of the repository. Never.
      if (!mine.length) throw new Error(`shard ${i}/${n} has no file (${heavyFiles().length} heavy files)`);
      console.log(mine.join(' '));
    } else if (opt('plan')) {
      const [, n] = parseShard(`1/${opt('plan')}`);
      const d = readDurations(HEAVY_DURATIONS_FILE);
      heavyShards(n).forEach((s, k) => {
        const ms = s.reduce((t, f) => t + (d[f] ?? 0), 0);
        console.log(`${k + 1}/${n} ${Math.round(ms / 1000)} s: ${s.join(' ')}`);
      });
    } else if (args[0] === '--record' && args.length > 1) {
      const files = heavyFiles();
      const reports = args.slice(1).map((f) => onHeavyPaths(JSON.parse(readFileSync(f, 'utf8')) as JsonReport, files));
      const durations = recordDurations(reports, ROOT);
      const about =
        'Each heavy test file in milliseconds (the median of the reports), for the shards of candidate.yml (tools/heavy-shards.ts).';
      writeFileSync(HEAVY_DURATIONS_FILE, `${JSON.stringify({ about, durations }, null, 2)}\n`);
      console.log(`${Object.keys(durations).length} files → ${relative(process.cwd(), HEAVY_DURATIONS_FILE)}`);
    } else {
      console.error(
        'usage: npx tsx tools/heavy-shards.ts --shard=<i>/<n> | --plan=<n> | --record <vitest json report>...',
      );
      process.exit(2);
    }
  } catch (e) {
    console.error(`heavy-shards: ${(e as Error).message}`);
    process.exit(1);
  }
}
