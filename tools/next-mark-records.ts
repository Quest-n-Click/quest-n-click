// The rewrite of the next release's mark (#443, tools/next-mark.ts) with the docs' records carried over: a translation
// pair's side, a claim's text and a claim's test file hashed before the rewrite are given their hash after it, in
// wiki/translations.json, wiki/reviews.json and any pending file still there. Only a record that held the text before
// moves: a stale one stays stale, and nothing becomes reviewed because of the rewrite.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generatedPartProblems } from './wiki/check';
import { claimsOf, claimTextHash, readReviews, writeReviews } from './wiki/claims';
import { type Manifest, readManifest } from './wiki/manifest';
import { parsePage } from './wiki/page';
import { writePending } from './wiki/pending';
import { currentPairHashes, readTranslations, writeTranslations } from './wiki/translations';

// Here and not in next-mark.ts: the CLI there imports this module, and an import back made a cycle that never settled
// (4.7.1's prepare: "unsettled top-level await", exit 13).
export const textHashOf = (s: string) => createHash('sha256').update(s).digest('hex');

/**
 * The records with each hash taken before the rewrite replaced by its value after (#443): a pair's side, a claim's text,
 * a claim's test file. A hash that was not the current text's before (a stale record) stays stale; a record never
 * becomes current because of the rewrite. `before` and `after` map a key to its current hash at each moment.
 */
export function rekey<R extends Record<string, unknown>>(
  records: Record<string, R>,
  fields: readonly {
    field: keyof R & string;
    before: (key: string, r: R) => string | undefined;
    after: (key: string, r: R) => string | undefined;
  }[],
): { records: Record<string, R>; moved: number } {
  let moved = 0;
  const out: Record<string, R> = {};
  for (const [key, r] of Object.entries(records)) {
    const next = { ...r };
    for (const f of fields) {
      const [was, now] = [f.before(key, r), f.after(key, r)];
      if (was !== undefined && now !== undefined && was !== now && r[f.field] === was) {
        (next as Record<string, unknown>)[f.field] = now;
        moved++;
      }
    }
    out[key] = next;
  }
  return { records: out, moved };
}

/** Each claim's text hash, as a review records it, from the pages as they are on disk. */
function claimHashes(wikiDir: string, manifest: Manifest) {
  const parsed = new Map<string, ReturnType<typeof parsePage>>();
  const blocks = (id: string, lang: 'en' | 'fr') => {
    const file = resolve(wikiDir, lang, `${id}.md`);
    if (!existsSync(file)) return undefined;
    const key = `${lang}/${id}`;
    if (!parsed.has(key)) parsed.set(key, parsePage(readFileSync(file, 'utf8'), lang));
    return parsed.get(key)!.blocks;
  };
  return new Map(claimsOf(manifest, (p, l) => blocks(p.id, l)).map((c) => [c.claim.id, claimTextHash(c)]));
}

function manifestOf(wikiDir: string): Manifest {
  const m = readManifest(wikiDir);
  if (!m.manifest) throw new Error(m.errors.join('\n'));
  return m.manifest;
}

/** Hashes a test file as a claim review records it. */
const fileHash = (text: string) => textHashOf(text.replace(/\r\n/g, '\n'));

/**
 * Writes the rewritten files (`changed`, from `tools/next-mark.ts`) and carries the records over. Returns how many
 * hashes moved.
 */
export function rewriteWithRecords(root: string, changed: readonly { path: string; before: string; after: string }[]) {
  const wikiDir = resolve(root, 'wiki');
  const before = {
    pairs: currentPairHashes(wikiDir, manifestOf(wikiDir)),
    claims: claimHashes(wikiDir, manifestOf(wikiDir)),
  };
  const files = new Map(changed.map((c) => [fileHash(c.before), fileHash(c.after)]));
  for (const c of changed) writeFileSync(resolve(root, c.path), c.after);
  const manifest = manifestOf(wikiDir);
  const after = { pairs: currentPairHashes(wikiDir, manifest), claims: claimHashes(wikiDir, manifest) };

  const pairFields = (['enHash', 'frHash'] as const).map((field) => ({
    field,
    before: (key: string) => before.pairs.get(key)?.[field],
    after: (key: string) => after.pairs.get(key)?.[field],
  }));
  const claimFields = [
    {
      field: 'claimTextHash' as const,
      before: (id: string) => before.claims.get(id),
      after: (id: string) => after.claims.get(id),
    },
    {
      field: 'testFileHash' as const,
      before: (_id: string, r: { testFileHash: string }) => (files.has(r.testFileHash) ? r.testFileHash : undefined),
      after: (_id: string, r: { testFileHash: string }) => files.get(r.testFileHash),
    },
  ];

  const { translations } = readTranslations(wikiDir);
  const { reviews } = readReviews(wikiDir);
  const pairs = rekey(translations.pairs, pairFields);
  const claims = rekey(reviews.claims, claimFields);
  writeTranslations(wikiDir, pairs.records);
  writeReviews(wikiDir, claims.records);
  const moved = { pairs: pairs.moved, claims: claims.moved };
  // A pending file still there (the fold runs first in prepare; by hand it may not have).
  for (const p of translations.pending) {
    const pp = rekey(p.pairs, pairFields);
    const pc = rekey(reviews.pending.find((r) => r.file === p.file)?.claims ?? p.claims, claimFields);
    moved.pairs += pp.moved;
    moved.claims += pc.moved;
    const { file, ...rest } = p;
    writePending(resolve(root, file), { ...rest, pairs: pp.records, claims: pc.records });
  }
  return moved;
}

/**
 * The generated parts as `check` reads them, now; the function returned gives the problems that were not there then
 * (#550). Run around the rewrite: a problem it brings is a generated page and its source out of step (a mark the
 * rewrite wrote in one and not the other), a problem already there is not the rewrite's. `root` is the code the
 * generators read, `wikiDir` the wiki.
 */
export function generatedDrift(root: string, wikiDir: string, tracked: readonly string[]): () => string[] {
  const now = () => generatedPartProblems(root, tracked, wikiDir, manifestOf(wikiDir));
  const before = new Set(now());
  return () => now().filter((p) => !before.has(p));
}
