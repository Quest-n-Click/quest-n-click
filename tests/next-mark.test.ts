// The next release's mark (#443, tools/next-mark.ts): a branch writes `next` where the version will go, the release
// writes the version. Only the exact mark moves: a code span, code outside a comment, a string, a call in a comment and
// every historical version stay as written.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { markKind, rewriteCode, rewriteData, rewriteFile, rewriteManifest, rewriteMarkdown } from '../tools/next-mark';
import { generatedDrift, rekey, rewriteWithRecords } from '../tools/next-mark-records';
import { trackedFiles } from '../tools/wiki/check';
import { claimsOf, claimTextHash, readReviews, writeReviews } from '../tools/wiki/claims';
import { generatedProblems, writeGenerated } from '../tools/wiki/generators';
import { readManifest } from '../tools/wiki/manifest';
import { parsePage } from '../tools/wiki/page';
import { currentPairHashes, readTranslations, translationStates, writeTranslations } from '../tools/wiki/translations';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('the mark in Markdown (fragments, the wiki)', () => {
  it('writes the version in (next) and (next, …), nowhere else', () => {
    expect(
      rewriteMarkdown(
        [
          '- **Images per language (next, #430)**: `i18n.images` (next) does it.',
          'Since 4.6.0 (4.6.0, #12) and (next, `walk`); the next release; (nextish) and f(next).',
          '[link (next)](x.md) and **bold (next)**.',
        ].join('\n'),
        '4.7.1',
      ),
    ).toBe(
      [
        '- **Images per language (4.7.1, #430)**: `i18n.images` (4.7.1) does it.',
        'Since 4.6.0 (4.6.0, #12) and (4.7.1, `walk`); the next release; (nextish) and f(next).',
        '[link (4.7.1)](x.md) and **bold (4.7.1)**.',
      ].join('\n'),
    );
  });
  it('leaves a quoted mark alone: a code span, one wrapped over a line break, a fenced block', () => {
    const quoted = ['A fragment writes `(next, #n)` and ``(next)``.', '```md', '- **X (next, #1)**', '```'].join('\n');
    expect(rewriteMarkdown(quoted, '4.7.1')).toBe(quoted);
    const wrapped = ['- Refused (next, #443): `✖ x.md:3: 4.7.1 is after', '  4.7.0…`. Write `(next, #n)` (next).'];
    expect(rewriteMarkdown(wrapped.join('\n'), '4.7.1')).toBe(
      ['- Refused (4.7.1, #443): `✖ x.md:3: 4.7.1 is after', '  4.7.0…`. Write `(next, #n)` (4.7.1).'].join('\n'),
    );
  });
  it("writes the version in a section's applies marker, its range and its since", () => {
    expect(rewriteMarkdown('<a name="x"></a>\n<!-- applies: next.. since next -->\n', '4.8.0')).toBe(
      '<a name="x"></a>\n<!-- applies: 4.8.0.. since 4.8.0 -->\n',
    );
    expect(rewriteMarkdown('<!-- applies: 4.2.2.. since next -->', '4.8.0')).toBe(
      '<!-- applies: 4.2.2.. since 4.8.0 -->',
    );
    expect(rewriteMarkdown('<!-- applies: 4.2.2..4.4.0 -->', '4.8.0')).toBe('<!-- applies: 4.2.2..4.4.0 -->');
  });
});

describe('the mark in code: comments only', () => {
  it('writes it in // and /* */ comments, a block over several lines included', () => {
    const src = [
      '// Images by language (next, `i18n.images`): when set.',
      'const a = 1; // turnBack (next, #417)',
      '/* Dots (`map.pins`, next) and (next, #428): a token in the middle and',
      '   a glow (next) */',
      '/**',
      ' * Walk on the map (next, #422).',
      ' */',
    ].join('\n');
    expect(rewriteCode(src, '4.7.1')).toBe(
      [
        '// Images by language (4.7.1, `i18n.images`): when set.',
        'const a = 1; // turnBack (4.7.1, #417)',
        '/* Dots (`map.pins`, next) and (4.7.1, #428): a token in the middle and',
        '   a glow (4.7.1) */',
        '/**',
        ' * Walk on the map (4.7.1, #422).',
        ' */',
      ].join('\n'),
    );
  });
  it('never touches code, a string, a URL or a call named in a comment', () => {
    const src = [
      'if (next) {',
      '  this.out.swap(next);',
      "  describe('map pins (next, #428)', () => {});",
      "  const u = 'https://example.org/(next)';",
      '  const s = \'// a comment (next, #1) in a string\', t = "/* nor (next) */", r = `x // (next)`;',
      '} // calls swap(next) once',
      'const b = (next, other) => 0;',
    ].join('\n');
    expect(rewriteCode(src, '4.7.1')).toBe(src);
  });
  it('keeps every historical version: only the word moves', () => {
    const src = '// 4.6.0 (#401), 4.5.4 (4.5.4, #348), next (next, #443)';
    expect(rewriteCode(src, '4.7.1')).toBe('// 4.6.0 (#401), 4.5.4 (4.5.4, #348), next (4.7.1, #443)');
  });
});

describe("the manifest's version fields", () => {
  it('writes the version where a field says next, any other value kept', () => {
    const m =
      '{ "versions": { "appliesFrom": "next", "featureSince": "next" }, "title": "next", "x": { "appliesFrom": "4.5.0" } }';
    expect(rewriteManifest(m, '4.8.0')).toBe(
      '{ "versions": { "appliesFrom": "4.8.0", "featureSince": "4.8.0" }, "title": "next", "x": { "appliesFrom": "4.5.0" } }',
    );
  });
});

describe("the wiki's data files, the generated parts' sources (#550)", () => {
  it('writes the version in a string as the prose does, keeps the JSON valid and every other byte', () => {
    const before = [
      '{',
      '  "next": "next",',
      '  "scripts": [',
      '    {',
      '      "usage": "npm run x -- `(next)`",',
      '      "description": {',
      '        "en": "Played end to end (4.1.19); a step of the job (next, #550). A \\"quote\\" (next).",',
      '        "fr": "Joué de bout en bout ; une étape du job (next, #550), f(next) et (nextish)."',
      '      }',
      '    }',
      '  ]',
      '}',
      '',
    ].join('\n');
    const after = rewriteData(before, '4.7.9');
    expect(after).toBe(
      before
        .replace('job (next, #550). A \\"quote\\" (next).', 'job (4.7.9, #550). A \\"quote\\" (4.7.9).')
        .replace('job (next, #550), f(next)', 'job (4.7.9, #550), f(next)'),
    );
    expect(JSON.parse(after).scripts[0].description.fr).toBe(
      'Joué de bout en bout ; une étape du job (4.7.9, #550), f(next) et (nextish).',
    );
  });
  it('reads a string as its text: a mark after an escaped line break is a mark, the JSON still valid', () => {
    const after = rewriteData('{ "a": "Line one.\\n(next, #550) line two." }\n', '4.7.9');
    expect(JSON.parse(after)).toEqual({ a: 'Line one.\n(4.7.9, #550) line two.' });
  });
  it('leaves a data file without the mark byte for byte', () => {
    for (const f of ['npm-scripts.json', 'cli.json', 'env.json', 'errors.json', 'glossary.json']) {
      const text = readFileSync(resolve('wiki/data', f), 'utf8').replaceAll('(next', '(4.0.0');
      expect(rewriteData(text, '4.7.9'), f).toBe(text);
    }
  });
});

describe('which files the rewrite reads', () => {
  it('the wiki pages and manifest, the source and test files; never history, fixtures or generated files', () => {
    expect(markKind('wiki/en/create.rooms.md')).toBe('markdown');
    expect(markKind('wiki/fr/create.rooms.md')).toBe('markdown');
    expect(markKind('wiki/manifest.json')).toBe('manifest');
    expect(markKind('changes/README.md')).toBe('markdown');
    expect(markKind('wiki/data/npm-scripts.json')).toBe('data');
    expect(markKind('wiki/data/glossary.json')).toBe('data');
    expect(markKind('src/engine/dom/map-view.ts')).toBe('code');
    expect(markKind('src/engine/dom/style.css')).toBe('code');
    expect(markKind('tests/dom/map-walk.test.ts')).toBe('code');
    expect(markKind('studio-server/src/ops/core.ts')).toBe('code');
    for (const no of [
      'CHANGELOG.md',
      'docs/dev/LOG.md',
      'docs/dev/PLAN-4.6.x-RELEASE-IN-THREE-COMMANDS.md',
      'tests/fixtures/release-4.5.3/before/README.md',
      'tests/fixtures/x.ts',
      'README.md',
      'wiki/translations.json',
      'games/demo/assets.gen.json',
      'games/demo/rooms/house.ts',
      'wiki/data/x/y.json',
      'wiki/data/notes.md',
    ])
      expect(markKind(no), no).toBeUndefined();
  });
});

describe('the records carried over the rewrite', () => {
  it('moves a hash the record held before to its value after; a stale one stays stale', () => {
    const before = new Map([
      ['a#x', 'h1'],
      ['b#y', 'h2'],
    ]);
    const after = new Map([
      ['a#x', 'h1b'],
      ['b#y', 'h2b'],
    ]);
    const field = {
      field: 'enHash' as const,
      before: (k: string) => before.get(k),
      after: (k: string) => after.get(k),
    };
    const out = rekey(
      {
        'a#x': { enHash: 'h1', frHash: 'f' },
        'b#y': { enHash: 'old', frHash: 'f' },
        'c#z': { enHash: 'h9', frHash: 'f' },
      },
      [field],
    );
    expect(out.records).toEqual({
      'a#x': { enHash: 'h1b', frHash: 'f' },
      'b#y': { enHash: 'old', frHash: 'f' },
      'c#z': { enHash: 'h9', frHash: 'f' },
    });
    expect(out.moved).toBe(1);
  });
});

describe('the rewrite on a copy of the wiki: nothing left to review (#443)', () => {
  it('carries a pair and a claim recorded before the rewrite over to the rewritten text; a stale record stays stale', () => {
    const root = mkdtempSync(join(tmpdir(), 'next-mark-'));
    try {
      const wiki = join(root, 'wiki');
      cpSync(resolve('wiki'), wiki, { recursive: true });
      mkdirSync(join(root, 'tests'));
      mkdirSync(join(root, 'changes'));
      cpSync(resolve('tests/boundaries.test.ts'), join(root, 'tests/boundaries.test.ts'));
      // The mark in a claim's block, both languages, and in a comment of its test file.
      const page = (l: string) => join(wiki, l, 'contribute.boundaries.md');
      for (const [l, from] of [
        ['en', 'no Studio.'],
        ['fr', 'ni le Studio.'],
      ] as const)
        writeFileSync(page(l), readFileSync(page(l), 'utf8').replace(from, `${from.slice(0, -1)} (next, #443).`));
      const testFile = join(root, 'tests/boundaries.test.ts');
      writeFileSync(testFile, `// The layers (next, #443).\n${readFileSync(testFile, 'utf8')}`);
      // Every pair and the claim recorded as they are now; one pair stale on purpose.
      const manifest = readManifest(wiki).manifest!;
      const ai = { name: 'claude-opus-5-5', kind: 'ai', relation: 'author', date: '2026-11-05' } as const;
      const human = { name: 'wanoo', kind: 'human', relation: 'independent', date: '2026-11-05' } as const;
      const pairs = Object.fromEntries(
        [...currentPairHashes(wiki, manifest)].map(([k, h]) => [
          k,
          { enHash: h.enHash, frHash: h.frHash, reviewers: [ai] },
        ]),
      );
      const staleKey = Object.keys(pairs).find((k) => k.startsWith('contribute.conventions#'))!;
      pairs[staleKey] = { ...pairs[staleKey]!, enHash: 'f'.repeat(64) };
      writeTranslations(wiki, pairs);
      const blocks = (id: string, l: 'en' | 'fr') =>
        parsePage(readFileSync(join(wiki, l, `${id}.md`), 'utf8'), l).blocks;
      const claim = claimsOf(manifest, (p, l) => blocks(p.id, l)).find((c) => c.claim.id === 'core-imports-no-dom')!;
      const testBefore = readFileSync(testFile, 'utf8');
      writeReviews(wiki, {
        'core-imports-no-dom': {
          claimTextHash: claimTextHash(claim),
          testFileHash: sha(testBefore),
          reviewers: [human],
        },
      });
      const toReview = () =>
        translationStates(wiki, readManifest(wiki).manifest!, readTranslations(wiki).translations).pairs.filter(
          (p) => p.state === 'to review',
        );
      // contribute.conventions is a ready page: its stale pair is the one to review.
      expect(toReview().map((p) => p.key)).toEqual([staleKey]);

      const changed = [
        'wiki/en/contribute.boundaries.md',
        'wiki/fr/contribute.boundaries.md',
        'tests/boundaries.test.ts',
      ].map((path) => {
        const before = readFileSync(join(root, path), 'utf8');
        return { path, before, after: rewriteFile(path.endsWith('.md') ? 'markdown' : 'code', before, '4.7.1') };
      });
      expect(changed.every((c) => c.after !== c.before && c.after.includes('(4.7.1, #443)'))).toBe(true);
      const moved = rewriteWithRecords(root, changed);
      expect(moved).toEqual({ pairs: 2, claims: 2 });
      // The pair of the claim's section is still paired, the stale one still to review.
      expect(toReview().map((p) => p.key)).toEqual([staleKey]);
      expect(readTranslations(wiki).translations.pairs[staleKey]!.enHash).toBe('f'.repeat(64));
      const after = claimsOf(readManifest(wiki).manifest!, (p, l) => blocks(p.id, l)).find(
        (c) => c.claim.id === 'core-imports-no-dom',
      )!;
      expect(readReviews(wiki).reviews.claims['core-imports-no-dom']).toEqual({
        claimTextHash: claimTextHash(after),
        testFileHash: sha(readFileSync(testFile, 'utf8')),
        reviewers: [human],
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});

describe('the rewrite on a copy of the wiki: a generated page and its data agree after it (#550)', () => {
  it("writes the version in the data and in the pages it generates, the pages' pairs carried over", () => {
    const root = mkdtempSync(join(tmpdir(), 'next-mark-data-'));
    try {
      const wiki = join(root, 'wiki');
      cpSync(resolve('wiki'), wiki, { recursive: true });
      // The mark in a script's description, both languages, and the pages generated from it.
      const dataFile = join(wiki, 'data/npm-scripts.json');
      const data = JSON.parse(readFileSync(dataFile, 'utf8'));
      const script = data.repository[0];
      for (const l of ['en', 'fr'] as const) script.description[l] = `${script.description[l]} (next, #550)`;
      writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`);
      const ctx = { root: resolve('.'), wikiDir: wiki, tracked: trackedFiles() };
      expect(writeGenerated(ctx, ['reference.npm-scripts']).problems).toEqual([]);
      const manifest = readManifest(wiki).manifest!;
      const pageOf = (l: string) => readFileSync(join(wiki, l, 'reference.npm-scripts.md'), 'utf8');
      expect(pageOf('en')).toContain('(next, #550)');
      const ai = { name: 'claude-opus-5-5', kind: 'ai', relation: 'author', date: '2026-11-10' } as const;
      writeTranslations(
        wiki,
        Object.fromEntries(
          [...currentPairHashes(wiki, manifest)].map(([k, h]) => [
            k,
            { enHash: h.enHash, frHash: h.frHash, reviewers: [ai] },
          ]),
        ),
      );
      const toReview = () =>
        translationStates(wiki, readManifest(wiki).manifest!, readTranslations(wiki).translations).pairs.filter(
          (p) => p.state === 'to review',
        );
      const reviewBefore = toReview().map((p) => p.key);
      const drift = generatedDrift(ctx.root, wiki, ctx.tracked);

      const changed = [
        'wiki/data/npm-scripts.json',
        'wiki/en/reference.npm-scripts.md',
        'wiki/fr/reference.npm-scripts.md',
      ]
        .map((path) => {
          const before = readFileSync(join(root, path), 'utf8');
          return { path, before, after: rewriteFile(markKind(path)!, before, '4.7.9') };
        })
        .filter((c) => c.after !== c.before);
      expect(changed.map((c) => c.path)).toHaveLength(3);
      rewriteWithRecords(root, changed);
      expect(readFileSync(dataFile, 'utf8')).toContain('(4.7.9, #550)');
      expect(readFileSync(dataFile, 'utf8')).not.toContain('(next, #550)');
      expect(pageOf('fr')).toContain('(4.7.9, #550)');
      // The pages are what their data generates, and no pair waits for a review because of the rewrite.
      expect(
        generatedProblems(ctx, readManifest(wiki).manifest!).filter((p) => p.includes('reference.npm-scripts')),
      ).toEqual([]);
      expect(toReview().map((p) => p.key)).toEqual(reviewBefore);
      expect(drift()).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
  it('tells a generated page the rewrite put out of step with its data: a mark the page shows as code', () => {
    const root = mkdtempSync(join(tmpdir(), 'next-mark-drift-'));
    try {
      const wiki = join(root, 'wiki');
      cpSync(resolve('wiki'), wiki, { recursive: true });
      // A usage is shown in a code span: the page keeps the word, the data, read as prose, does not.
      const dataFile = join(wiki, 'data/npm-scripts.json');
      const data = JSON.parse(readFileSync(dataFile, 'utf8'));
      const script = data.repository.find((s: { usage?: string }) => s.usage);
      script.usage = `${script.usage} (next)`;
      writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`);
      const ctx = { root: resolve('.'), wikiDir: wiki, tracked: trackedFiles() };
      expect(writeGenerated(ctx, ['reference.npm-scripts']).problems).toEqual([]);
      const drift = generatedDrift(ctx.root, wiki, ctx.tracked);
      for (const path of ['wiki/data/npm-scripts.json', 'wiki/en/reference.npm-scripts.md']) {
        const file = join(root, path);
        writeFileSync(file, rewriteFile(markKind(path)!, readFileSync(file, 'utf8'), '4.7.9'));
      }
      expect(drift()).toEqual([
        "en/reference.npm-scripts.md: its generated part is not the code's: run `npm run wiki -- generate reference.npm-scripts`",
        "fr/reference.npm-scripts.md: its generated part is not the code's: run `npm run wiki -- generate reference.npm-scripts`",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});

describe('the wiki reads the mark before the release writes it (#443)', () => {
  it('an applies marker may say next, for its range and its since', async () => {
    const { appliesMarker } = await import('../tools/wiki/page');
    expect(appliesMarker('<!-- applies: next.. since next -->')).toEqual({ appliesFrom: 'next', featureSince: 'next' });
    expect(appliesMarker('<!-- applies: 4.2.2.. since next -->')).toEqual({
      appliesFrom: '4.2.2',
      featureSince: 'next',
    });
    expect(appliesMarker('<!-- applies: nextish.. -->')).toBeNull();
  });
  it('next comes after every version: a section of the next release is not true of the current one', async () => {
    const { compareVersions } = await import('../tools/wiki/docs');
    expect(compareVersions('next', '99.0.0')).toBe(1);
    expect(compareVersions('4.7.0', 'next')).toBe(-1);
    expect(compareVersions('next', 'next')).toBe(0);
    expect(compareVersions('4.7.0-rc.1', '4.7.0')).toBe(-1);
  });
  it("the manifest's version fields may say next, nothing else", async () => {
    const { ManifestSchema } = await import('../tools/wiki/manifest');
    const manifest = JSON.parse(readFileSync('wiki/manifest.json', 'utf8'));
    const withVersions = (versions: unknown) =>
      ManifestSchema.safeParse({
        ...manifest,
        pages: manifest.pages.map((p: { id: string }) => (p.id === 'contribute.conventions' ? { ...p, versions } : p)),
      }).success;
    expect(withVersions({ appliesFrom: '4.5.0' })).toBe(true);
    expect(withVersions({ appliesFrom: 'next', featureSince: 'next' })).toBe(true);
    expect(withVersions({ appliesFrom: '4.5.0', featureSince: 'next' })).toBe(true);
    expect(withVersions({ appliesFrom: 'soon' })).toBe(false);
  });
});

describe('the command prepare runs: --write on a copy of the repository', () => {
  // prepare stopped at 4.7.1's "next mark…" step: the CLI awaited, at the top level, a module that imports it back,
  // and Node exited 13 ("unsettled top-level await") with nothing written.
  it('writes the version where the mark was and exits 0', () => {
    const root = mkdtempSync(join(tmpdir(), 'next-mark-cli-'));
    try {
      // src and studio-server too: the check of the generated parts after the rewrite (#550) runs the generators,
      // which import them.
      for (const d of ['tools', 'wiki', 'src', 'package.json']) cpSync(resolve(d), join(root, d), { recursive: true });
      for (const d of ['node_modules', 'studio-server']) symlinkSync(resolve(d), join(root, d), 'junction'); // a junction: no admin on Windows
      writeFileSync(join(root, 'src/x.ts'), '// fixed (next, #1)\nexport {};\n');
      execFileSync('git', ['init', '-q'], { cwd: root });
      execFileSync('git', ['add', 'src', 'package.json'], { cwd: root });
      const run = spawnSync(process.execPath, ['--import', 'tsx', 'tools/next-mark.ts', '--write', '--version=9.9.9'], {
        cwd: root,
        encoding: 'utf8',
        timeout: 60_000,
      });
      expect(run.stderr).not.toContain('unsettled top-level await');
      expect(run.status).toBe(0);
      expect(readFileSync(join(root, 'src/x.ts'), 'utf8')).toBe('// fixed (9.9.9, #1)\nexport {};\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 90_000);
});
