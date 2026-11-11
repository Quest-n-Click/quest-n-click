# Conventions

The names, titles and files a contribution to the engine repository follows, so that issues, branches, pull requests
and the CHANGELOG read the same way whoever wrote them. Each section is one convention, with what checks it.

<a name="titles"></a>
<!-- applies: .. since 4.3.0 -->

## Issue and pull request titles

### Form

- **Issue:** the template's prefix, `[bug]` or `[feature]` (`[field]` for a release's field pass), then the problem or
  the need as a sentence. An issue opened from the command line skips the template: type the prefix yourself.
- **Pull request:** `<Area>: <what changes> (#issue)`.
- **A pull request of a release's pass** starts with its version instead: `4.2.3: …`, `4.3 "Name": …`.
- **Body:** every section of the pull request template, "Not done, said as such" included ("Nothing" when nothing is
  left).

### Minimal example

```text
[bug] A save made in the cellar loads in the kitchen
Interface font: a proportional pixel font by default (#204)
```

### Constraints

Nothing checks a title mechanically; the maintainer does. The issue templates are `.github/ISSUE_TEMPLATE/bug-report.yml`
(title `[bug] `) and `feature.yml` (title `[feature] `); a feature request is opened after reading
[Classic mechanics](create.classics.md) and [Game commands](create.commands.md).

### Since

4.3.0.

<a name="branches"></a>

## Branch names

### Form

`<kind>/<issue>-<a-few-words>`. The kind is one of `feature`, `fix`, `docs`, `test`, `refactor`, or `release` with its
version (`release/4.4.0`).

### Minimal example

```text
fix/210-job-late-poll
feature/430-hero-choice
```

### Constraints

The branch without its prefix is the name of its CHANGELOG fragment (`210-job-late-poll`, next section). Nothing else
checks the name.

<a name="changes-fragments"></a>
<!-- applies: .. since 4.1.9 -->

## CHANGELOG and LOG fragments (`changes/`)

### Form

A branch that changes the code does not edit `CHANGELOG.md` nor `docs/dev/LOG.md`. It writes, under `changes/`:

- `changes/<slug>.md`: the CHANGELOG bullets, under `### Breaking`, `### Fixed` or `### Changes` (any of them, in any
  order). Write them as the CHANGELOG does: a bold lead, the version in parentheses, what a player, an author or a host
  sees differently.
- In the same file, optionally (4.7.1, #410), `### Release`: one or two sentences for the release's intro, what the
  change brings and for whom, in prose that reads well joined to the other fragments'. `npm run release -- prepare`
  joins every fragment's, in the order they reached `main`, into the CHANGELOG's intro and the README's
  current-release line; without any, both keep a `TODO(release)` for the maintainer. `### Release (fr)` is its French
  translation, for `README.fr.md`: the French line is written only when every fragment with a `### Release` has one,
  else it stays a `TODO(release)`. Neither heading reaches the CHANGELOG's bullets.
- `changes/<slug>.log.md` (optional): the LOG entry. First line `## <title>` (what follows `#n · date · Claude ·
  proposal ·` in the LOG), then the body, its `→ next:` line last. The number and the date are the assembly's.

`<slug>` is the branch without its prefix, for example `419-cadence`.

### Minimal example

`changes/210-job-late-poll.md`:

```markdown
### Fixed

- **A prepared job keeps its result on screen (4.3.0, #210)**: on a hosted Studio, the Assets panel no longer replaces
  "prepared from revision 3" with "Preparing the assets: done" when a late status answer arrives.
```

With the release's lines, as `changes/430-localized-images.md` could have written them:

```markdown
### Release

A game can letter its images in each language (`i18n.images`), its title logo included.

### Release (fr)

Un jeu peut écrire ses images dans chaque langue (`i18n.images`), son logo de titre compris.

### Changes

- **Images per language (4.7.0, #430)**: …
```

### Constraints

```sh
# in the engine repository
npm run changes -- --check [--base=origin/main]
```

- It fails a branch that touches `src/`, `bridge/`, `tools/`, `scripts/`, `cli/`, `connectors/` or `games/` without a
  fragment and without a CHANGELOG edit: `✖ this branch changes the code and carries no fragment: write
  changes/<slug>.md (### Fixed | ### Changes | ### Breaking, then the bullets; …)…`. CI's `check` job runs it on pull
  requests. A change to `docs/`, `wiki/` or `tests/` alone needs no fragment.
- It also reads every fragment in `changes/`, the branch's and the others, as `--assemble` will (4.5.5, #335): a
  heading other than the three and the two release ones (`### Added`, for instance), text before the first heading, or
  a `.log.md` that does not open on `## <title>` is refused with its file and line: `✖ changes/<slug>.md:5: "### Fixes"
  is not a fragment heading: ### Breaking | ### Fixed | ### Changes, or ### Release | ### Release (fr)`. `--assemble`
  refuses the same, so a fragment the release would stop on fails the pull request that adds it. Nothing is filed
  silently.
- A `### Release` part is refused when it is empty, a list, longer than 400 characters, without a full stop at its
  end, or there twice; a `### Release (fr)` without its `### Release` too (4.7.1, #410).
- A version after `package.json`'s is refused (4.7.1, #443): `✖ changes/<slug>.md:3: 4.7.1 is after package.json's
  4.7.0: a fragment names the release it lands in as next…`. Write `(next, #n)` ([The next release's
  mark](#next-mark)); a version quoted in a code span is not read.
- A bare `TODO(release)` in a fragment is refused too (4.5.5, #364): it would land in the CHANGELOG or the LOG as a
  marker the release must write, and never could. Quote it in backticks, as code.
- A release branch is the exception: it assembles the fragments and edits the CHANGELOG itself.
- `changes/README.md` is not a fragment.

### Assembly

```sh
# in the engine repository, on main, with the full history
npm run changes -- --assemble [--date=YYYY-MM-DD] [--version=<x.y.z>]
```

With `--version` (what `npm run release -- prepare` passes), the fragments' `next` marks become that version as they
are folded; without it they stay, for the release to write.

It folds every fragment into the CHANGELOG's `## Unreleased` (each bullet under its section, Breaking, Fixed, then
Changes) and numbers the LOG entries after the last one, in the order the fragments reached `main` (their first
commit's date: a rebase moves it), then removes them. Only the `Unreleased` block is rewritten. It refuses a shallow
clone (`git fetch --unshallow`), which would date every fragment at its boundary. Two open branches never conflict on
the CHANGELOG, the LOG or their entry numbers.

### Since

4.1.9 (lot 0 "cadence").

<a name="next-mark"></a>
<!-- applies: 4.7.1.. since 4.7.1 -->

## The next release's mark (`next`)

A branch does not know the number of the release it will land in: 4.6.0's branches all guessed "4.6.1", the release
was 4.7.0, and about 80 marks were renamed by hand. A branch writes `next` in the version's place; the release writes
the version.

| Where | The mark | Rewritten by |
|---|---|---|
| A fragment (`changes/`) | `(next, #443)`, `(next)` | `npm run changes -- --assemble --version=<v>` |
| A wiki page's prose | `(next, #443)`, `(next)` | `npm run release -- prepare` (step `next mark`) |
| A section's applies marker | `<!-- applies: next.. since next -->` | the same step |
| `wiki/manifest.json` | `"appliesFrom": "next"` (and `appliesUntil`, `featureSince`) | the same step |
| A string of `wiki/data/*.json`, the source of a generated part | `"… (next, #550)"` | the same step |
| A comment in `src/`, `tools/`, `scripts/`, `bridge/`, `cli/`, `connectors/`, `studio-server/`, `tests/` | `// … (next, #443)`, `/* … (next) */` | the same step |

The mark is the word in a parenthesis that opens on it, after a space or a line start: `(next)` or `(next, …)`. Never
a mark, so never rewritten: the word in a code span or a fenced block (this page quotes it so), in code outside a
comment (`if (next) {`), in a string of the code (a test's name is what a claim names: write no version in it), a call named in a
comment (`swap(next)`), a game folder (written through the Studio's journal; rename by hand), and every historical
file (the LOG, the CHANGELOG's released sections, `docs/`, `tests/fixtures/`). A version already written is never
touched. A string of `wiki/data/` is read as prose, the way the page generated from it reads it (next, #550); after
the rewrite the step checks every generated part against its source and stops when one no longer matches (a mark the
page shows in a code span, say), rather than leave it to the publication check. `npx tsx tools/next-mark.ts
--version=<v>` lists what the step would rewrite.

A translation pair is hashed on its text, so the rewrite of both sides would leave it to review; a claim's review
holds its block's text and its test file's hash the same way. The step therefore carries every record that held the
text before the rewrite over to the rewritten text (`wiki/translations.json`, `wiki/reviews.json`, a pending
`changes/*.acks.json`): a mechanical rewrite leaves nothing to review, and a record that was stale stays stale.

`changes -- --check` refuses a version after `package.json`'s in a fragment; the wiki and the code are not checked
(a version written there ahead is a guess to avoid, not an error).

<a name="formatting-commits"></a>
<!-- applies: .. since 4.1.0 -->

## Formatting and formatting commits

### Form

Biome formats and lints the code (`biome.json`: two spaces, 120 columns, single quotes, semicolons, trailing commas).
`npm run format` writes the formatting; `npm run format:check` and `npm run lint:code` check it (both inside
`npm run quality`).

### Constraints

- A change that only reformats is its own commit, listed in `.git-blame-ignore-revs`, so `git blame` skips it. Locally:
  `git config blame.ignoreRevsFile .git-blame-ignore-revs` (GitHub reads the file by itself).
- **`games/` is linted, never reformatted**: the formatter excludes `games/**`, because the Studio writes the content.
- `Math.random` is refused in `src/engine/core/` and `src/engine/minigames/` (a lint plugin): randomness goes through
  the seeded generator. In `src/engine/core/remix/`, `Math` itself is refused (ADR 0018).
- `any` is refused outside `tests/` and `scripts/`; floating promises are refused everywhere.

### Since

4.1.0 "Clarity" (the Biome formatting commit is the first line of `.git-blame-ignore-revs`).

<a name="docs-languages"></a>

## Languages of the documentation

### Form

| What | Language |
|---|---|
| Wiki pages (`wiki/en`, `wiki/fr`) | Both, each written natively, the same sections and facts ([Writing documentation](contribute.writing-docs.md)) |
| `docs/dev/` (plans, decisions, ADRs, LOG, passes) | English, public development documentation (D3) |
| `CHANGELOG.md`, code comments, commit messages | English |
| `README.md` / `README.fr.md` | Both |
| `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CREDITS.md` | English in the repository; their French versions are the wiki pages |

### Constraints

A pull request that changes what a user sees updates the pages in both languages (the template's second checkbox).
`docs/en` and `docs/fr` are transition pages since 4.5.0: never edit them, write in `wiki/`.

<a name="review-owners"></a>

## What asks for the maintainer's review

`.github/CODEOWNERS` names the files a pull request cannot change without the maintainer's look: the frozen behaviour
(`tests/quality-baseline.json`), the public surface (`tests/api-surface.json`), the named survivors of mutation
testing (`docs/dev/mutants.json`), the coverage floors (`tests/coverage-floors.json`) and the workflows (`.github/`). Everything
else is reviewed by the gates.

<a name="related"></a>

## Related identifiers

- `npm run changes`, `npm run format`, `npm run format:check`, `npm run lint:code`.
- [Before a pull request](contribute.before-a-pr.md), [Governance](contribute.governance.md).
