# Common-language identification — design (2026-08-27)

Identify common bebop / common jazz language in the analysed solo and say
so by name, on the page, in the CLI and to the agent layer. Approved by
the owner in session 14. Companion DECISIONS entry: 2026-08-27
"Corpus-derived lick table".

## Why this is not the failed scale-inference work

DECISIONS 2026-08-25 killed statistical inference of *intent* from pitch
content (four formulations at or below chance). Everything here is exact
pattern matching against a dictionary or a frequency table — the same
evidence class as `corpusFrequency.ts` and the shape dictionary, both in
production. No hit is ever inferred; every hit is a literal degree-string
match.

## 1. Cross-chord lick matcher (`analyse/detectors/shapes.ts`)

A new entry type alongside the single-chord `Entry`:

```ts
interface LickEntry {
  name: string
  /** In order; a segment's degrees all sit on one chord. */
  segments: { degrees: string; qualities: Quality[] }[]
  /** Semitones from segment 1's root to segment 2's, mod 12. */
  rootMove: number
}
```

Matching, inside `matchShapes` (longest first, same overlap suppression,
never across an idea boundary — `samePhrase` as today):

- A window matches a `LickEntry` when its notes split at exactly one
  chord change such that segment 1's notes all carry chord A with the
  entry's degrees and an allowed quality, segment 2's all carry chord B
  likewise, and `B.rootPc === (A.rootPc + rootMove) % 12`.
- Degrees come per-note from `NoteContext.degree`, already computed
  against that note's own chord — no new degree machinery.
- A lick hit is a `ShapeHit` with `language: 'bebop'` (see §4) and flows
  through the existing finding merge/confidence unchanged. Lick hits are
  ≥ 4 notes (except the b9 resolution, 3 — its chord change is the
  distinguishing evidence), so `SHORT_CELL_FACTOR` applies by the
  existing rule only to the 3-note entry.

Single-chord cells extend: `CELL_LENGTHS` becomes `[8, 7, 6, 5, 4, 3]`
(still longest first; existing 4/3 entries and their tests unchanged).

## 2. Named cliché dictionary (initial set)

Hand-written from the pedagogy literature already surveyed in
`docs/research/` (Owens' Parker formulas, Baker's bebop scales, Coker) —
degree strings in the repo's own dialect (`core/pitch.ts` tables: major
family `b9 #9 #11 b13 b7 7`; minor family b3 = `3`). **Owner veto pass
expected on review** — a wrong lick name is worse than a missing one.

Single-chord additions:

| degrees | qualities | name |
|---|---|---|
| `1 7 b7 6 5` | dominant | bebop dominant descent |
| `1 7 6 b13 5` | major, maj7 | bebop major descent |
| `b9 b7 5 3` | dominant | b9 diminished arpeggio descent |
| `3 5 b7 b9` | dominant | dominant arpeggio 3 to the b9 |

Cross-chord (`rootMove: 5` — down a perfect fifth):

| segments | name |
|---|---|
| `3 b9` (dominant) → `5` (major family) | dominant b9 resolution |
| `1 2 3 5` (minor) → `3 5 b7 2` (dominant) | ii–V digital pattern 1235 into 3-5-7-9 |
| `1 2 3 5` (dominant) → `3 5 b7 2` (dominant) | V-of-V digital pattern 1235 into 3-5-7-9 |

The list is deliberately small; the mined table (§3) covers the long
tail of common-but-unnamed patterns. Growing the named list is a
follow-up driven by what the table surfaces.

## 3. Corpus-derived lick table (`npm run corpus:licks`)

Owner's call (DECISIONS 2026-08-27): the *language* is nobody's
property, but the corpus files stay out of the repo — we commit the
abstraction, exactly as `corpusFrequency.ts` does.

- Script `scripts/corpus-licks.ts` reads, locally only:
  - **WJD** (`~/dev/woodshed-data/wjazzd.db`) via the existing
    `ingest/wjd.ts` → `Score` → `analyse/context.ts` degrees.
  - **Bopland** treble-clef licks
    (`~/dev/woodshed-data/bopland/licks/musicXML/treble-clef-licks/`,
    1,820 OCR'd MusicXML files; chords per bar from
    `licks/jsonTag/treble-clef-licks.json` `changes` keys, one chord
    token per `|`-cell). Files that fail to parse are skipped and
    counted; OCR noise is tolerated because document frequency across
    1,820 licks drowns it.
- Emitted patterns, degrees joined with spaces, quality collapsed to
  three buckets — `maj` (major, major-seventh), `dom` (dominant,
  augmented-seventh), `min` (minor family):
  - single-chord windows of 4–8 notes: `'1 7 b7 6 5@dom'`
  - windows spanning exactly one chord change, 2–4 notes a side:
    `'1 2 3 5@min|3 5 b7 2@dom+5'` (suffix = rootMove).
  Notes with a null degree or an unbucketed quality end a window.
- Output `src/data/corpusLicks.ts` (attribution header naming both
  sources): `LICK_PATTERNS: Record<string, { wjd: number; bop: number }>`
  — *document* frequency (solos / licks containing the pattern at least
  once), plus `LICK_WJD_SOLOS` and `LICK_BOP_LICKS` totals.
- Keep threshold, initial: `wjd/LICK_WJD_SOLOS ≥ 0.10` or `bop ≥ 8`.
  Tune on first run so the table stays under ~2,000 entries; record the
  final values in ENGINE_SPEC.

## 4. Surfacing — descriptive + practice framing, no ranking change

- `ShapeHit`/`Finding` gain `language?: 'bebop'` from dictionary lick
  entries. `FindingView` carries it plus, when the finding's degree
  pattern is in `LICK_PATTERNS`, its corpus share ("in 47% of recorded
  solos").
- `corpusShare` (`practice/corpus.ts`) is unchanged; a new
  `languageShare(ctx)` computes the same per-note max-cover statistic
  over `LICK_PATTERNS` (degree-aware, 4–8-note and cross-chord windows).
  `PracticeUnit.summary` splits its one stock line by dominant signal:
  `stockShare` largest → "mostly a scale run" (as today);
  `languageShare`/`corpusShare` largest → "mostly common jazz language".
  Threshold stays `STOCK_SHOWN` 0.5. Rank, `STOCK_PENALTY`, exercise
  generation: untouched.
- Step rationale framing: loop/write rationales for a finding with
  `language` gain one sentence — "a standard bebop cliché; worth having
  in every key — listen for where the player places it." Wording only.
- CLI (`npm run solo`): lick findings print with a `common language:`
  prefix and the corpus share when known.

## 5. Agent wiring (`src/agent/`)

The analysis document the agent receives gains, in the cached system
block:

- per-finding: `language` tag, name, corpus share;
- per-unit: the `stockShare` / `corpusShare` / `languageShare` split.

Rank may weigh the player's-own vs stock distinction when ordering the
menu; narrate may identify clichés by name and send the player to
records that use them. Judging only, as ever: every name and number is
engine-computed, verdict schemas unchanged, ids only.

## 6. Testing and verification

- TDD throughout; hand-written fixtures only (never a corpus lick
  quoted — a hand-composed ii–V line exercising `1235→3572` is fine).
- Unit tests: `LickEntry` matching (split point, rootMove, quality
  gates, idea-boundary rejection, overlap suppression against longer
  single-chord hits), `languageShare`, summary message split, document
  fields.
- `pipeline.test.ts`: Blake's pinned top finding ("major-seventh
  arpeggio from the b3", bars 73+77) must survive. New Blake findings
  are expected; each is checked by ear against the score before the
  pinned counts change, and ENGINE_SPEC's verification targets update in
  the same commit.
- `npm run corpus:wjd` volume sanity: a named lick firing in > 60% of
  WJD solos is mis-specified (that is scale-run territory) — demote it
  to the table, keep the dictionary for genuinely shaped figures.
- `test:run`, `typecheck`, `build` green; the Pages build must not grow
  by more than the committed table (no corpus files bundled).
