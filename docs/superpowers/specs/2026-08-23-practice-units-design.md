# Practice units — design (2026-08-23)

The practice methodology research (`docs/research/practice-methodology.md`)
gives a consensus sequence. The owner chose four of its steps as the
product's spine:

> analyse (degree numbers, device name) → micro-units → through a tune →
> vary and write your own

## Decisions

- **The practice unit is the idea** (`Phrase.ideas[]`): the gesture between
  rests, held notes and leaps, median ~11 notes. Findings name what is
  inside it; they are no longer the top-level list.
- **"Through a tune" means this solo's changes by default, or an iReal Pro
  chart pasted as an `irealb://` link.** We parse the format ourselves; no
  chart collections are bundled.
- **"Vary" generates only rhythmic displacement** (same pitches and
  relative rhythm, different starting beat). Other variations are prompts.
- **"Write your own" is a template export plus a check**: drop the written
  `.mxl` back in and the detectors say whether the device is there.

## Model

```
src/practice/
  unit.ts       buildUnits(analysis, score, tune): PracticeUnit[]
  tune.ts       Tune; tuneFromScore(score)
  ireal.ts      parseIReal(text): Tune[]; UnsupportedChartError
  steps/
    loop.ts     loopStep(unit, score): Exercise
    through.ts  throughStep(unit, tune, instrument): Exercise[]
    displace.ts displaceStep(unit, score): Exercise[]
    write.ts    writeTemplate(unit, tune, instrument): string (MusicXML)
                checkWriting(bytes, unit): CheckResult
```

```ts
interface PracticeUnit {
  id: string                       // u1, u2 … in rank order
  phrase: number                   // index into analysis.phrases
  idea: number                     // index into phrase.ideas
  notes: Note[]                    // exactly as played
  startIndex: number               // into analysis.contexts
  endIndex: number
  harmony: Chord[]                 // distinct chords under the notes, in order
  degrees: (string | null)[]       // per note, against its chord
  findings: Finding[]              // any finding with a span inside the unit
  arrival: { degree: string; chordTone: boolean } | null   // last note
  rank: number
  steps: Step[]
}

type Step =
  | { kind: 'loop'; exercise: Exercise; prompt: string }
  | { kind: 'through'; tune: string; exercises: Exercise[]; prompt: string }
  | { kind: 'displace'; exercises: Exercise[]; prompt: string }
  | { kind: 'write'; template: string; prompt: string }

interface Tune {
  title: string
  timeSig: [number, number]
  bars: { chords: Chord[] }[]      // unrolled; chords in written pitch
}
```

Rank = 2 × (distinct findings inside) + (total finding occurrences across
the solo for those findings) + 0.5 if the arrival is a chord tone. Ties
by position.

`Exercise` gains an optional `rhythm?: number[]` (durations in ticks, one
per note) so the loop and displacement steps keep the played rhythm; when
absent the renderer keeps even eighths as now.

## Steps

- **loop**: the notes as played with their chords and rhythm. Header:
  "Bars 73–74 over Fm: Ab C Eb G — major-seventh arpeggio from the b3,
  landing on the 9." Prompt: sing it; play it with the record at bars N–M.
- **through**: for each finding with degrees, `overChanges` against the
  tune; grouped by chord quality in the prompt. Cycle of fourths remains
  available as a separate exercise, not default. Units without a
  degree-finding get no through step.
- **displace**: four targets for the first note — beat 1, the "and" of 1,
  beat 2, pickup (the "and" of 4 of the preceding bar). Pitches and
  relative rhythm unchanged. A variant is dropped if re-contextualising
  against the unit's own harmony turns a chord-tone arrival into a
  non-chord tone. The variant equal to the original placement is skipped.
- **write**: MusicXML of the tune with the arrival degree of each finding
  written as a cue-sized note on every bar whose chord matches, and blank
  otherwise; a text prompt. `checkWriting` ingests the file, runs
  `analyse` and reports, per bar that had a target, whether a finding of
  the same name appears.

## iReal format

Parse: `irealb://` and `irealbook://` URLs, URL-decoded; playlists with
`===` separators; the song header `title=composer=style=key=n=` and the
obfuscated chord body (the 50-character block scramble). Tokens: chords
with root, quality suffix, alternate root (`/`), `|`, `[`, `]`, `{`, `}`,
`Z`, `x` (repeat bar), `r` (repeat two bars), `n` (no chord), `p` (pause =
repeat previous chord), `T44`/`T34`/`T64`, `N1`/`N2` endings, `s`/`l`
(size, ignored), `*A` section markers and `<text>` (ignored), `Y` line
breaks, `U` (end). Repeats and endings are unrolled. Quality suffixes map
to `Quality` explicitly; an unknown suffix throws `UnsupportedChartError`
naming it. Charts are concert; `Tune` is transposed by
`instrument.transpose.chromatic`.

## Page

Left column: tune selector (this solo / paste iReal link, remembered in
`localStorage`), then **Ideas (N)** ranked. Row: bars, chords, degree
string, finding chips. Selecting highlights the unit's notes in the score
and expands four collapsible step panels under it, loop open. The
vocabulary list is removed. Profile strip and ticks stay.

## Tests

- `unit.test.ts`: synthetic units; Blake golden — the unit holding bars
  73–74 ranks first, carries `f1`, arrives on the 9.
- `ireal.test.ts`: hand-made fixtures in `fixtures/ireal/` — a 12-bar
  blues, a tune with a repeat and two endings, a 3/4 tune, an unsupported
  token.
- `steps/*.test.ts`: displacement preserves pitches and relative rhythm and
  drops the original placement; through yields bars only over chords the
  cell is vocabulary for; checkWriting finds/doesn't find.
- `pipeline.test.ts`: every Blake unit with a degree-finding has a through
  step with ≥1 bar over this solo's changes.

## Out of scope

Session planning / interleaving, multiple tunes at once, chart editing,
audio, any model.
