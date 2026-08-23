# woodshed Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drop a solo transcription on a web page, see the vocabulary it contains, and download exercises that drill it.

**Architecture:** Extends the working `ingest` + `prepare` engine. `analyse/` segments into phrases, contextualises notes against the chords, runs three independent detectors and scores findings by how many of them agree. `generate/` transforms findings into exercises and gates each one by re-detection. `render/` writes MusicXML. A thin Vite page wires it together.

**Tech Stack:** TypeScript (strict, ESM), Vitest (node), Vite, OpenSheetMusicDisplay for in-page notation. Engine stays DOM-free; only `app/` touches the DOM.

**Spec:** `docs/superpowers/specs/2026-08-23-woodshed-design.md`
**Builds on:** `docs/superpowers/plans/2026-08-23-woodshed-m1-ingest-prepare.md` (complete — `ingest()` and `prepare()` work on all nine real corpus transcriptions)

## Scope

In: phrase segmentation, degree contextualisation, three detectors, convergence scoring, two generators, the validity gate, MusicXML export, a minimal web page.

Deliberately out, with reasons:
- **The WBA atom parser.** A hand probe showed its output is dominated by residuals and diatonic runs (`-X4 -F2 +A4 +D7`) — nothing a player reads. It is substrate for later, and the other three detectors already give three independent convergence signals.
- **The AI naming layer.** Findings are named from a static dictionary. Good enough to prove the engine; the agent layer wraps this API later without invalidating it.
- **Corpus surprisal.** Deferred in the spec.

## Global Constraints

- TypeScript strict; `noUnusedLocals`, `noUnusedParameters`.
- ESM, explicit `.ts` extensions in imports.
- No semicolons, single quotes, 2-space indent.
- **No DOM in `src/`.** Only `app/` may use the DOM.
- `TICKS_PER_QUARTER = 960`.
- **Never modify `fixtures/`.** They are validated and tests assert their exact values.
- Existing modules to reuse, not reimplement: `ingest`, `prepare`, `degreeOf`, `isChordTone`, `intervalsOf`, `pitchClass`, `instrumentFromTranspose`, and the types in `src/core/types.ts`.
- Run `npm run test:run`, never bare `npm test` (it is watch mode and will hang).
- Commit after every task.

## Evidence this plan rests on

Two findings from probes over the real corpus, both recorded in `docs/research/corpus-survey-cleanup.md`:

1. **Segment on rests only.** Four variants were scored against the Weimar chromaticism asymmetry (phrase starts should be more chromatic than endings). Rests alone gave the best spread (14% vs 10%); every "a long note ends a phrase" variant flattened it to zero and fragmented phrases badly. Do not add a long-note or inter-onset rule.
2. **Chromatic means altered AND not a chord tone.** Counting every accidental as chromatic marks the ♭7 of a dominant chromatic, which is the most consonant note in the chord and a common phrase ending.

---

### Task 1: Phrase segmentation

**Files:**
- Create: `src/analyse/segment.ts`
- Test: `src/analyse/segment.test.ts`

**Interfaces:**
- Consumes: `Note`, `TICKS_PER_QUARTER` from `src/core/types.ts`.
- Produces:

```ts
export interface Phrase {
  notes: Note[]
  startBar: number
  endBar: number
  /** 1 when a rest ended the phrase, lower when a structural boundary forced it. */
  confidence: number
}
export function segment(notes: Note[], forcedBoundaryBars?: number[]): Phrase[]
```

Rules, in full:
- A boundary falls after note `i` when the gap between the end of note `i` and the onset of note `i+1` is **at least an eighth note** (`TICKS_PER_QUARTER / 2`). Confidence `1`.
- A boundary is also forced before any bar listed in `forcedBoundaryBars` — chorus starts and soloist-region starts. Confidence `0.6`.
- Nothing else creates a boundary. No long-note rule, no inter-onset rule; the probe showed both make segmentation worse.
- Empty input yields an empty array.

- [ ] **Step 1: Write the failing test `src/analyse/segment.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { segment } from './segment.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Note } from '../core/types.ts'

/** Build notes back to back from a list of [midi, durationInQuarters, gapAfter]. */
function notesFrom(spec: [number, number, number][]): Note[] {
  const out: Note[] = []
  let onset = 0
  for (const [midi, dur, gap] of spec) {
    const duration = dur * Q
    out.push({
      midi,
      onset,
      duration,
      bar: Math.floor(onset / (4 * Q)) + 1,
      beat: (onset % (4 * Q)) / Q,
    })
    onset += duration + gap * Q
  }
  return out
}

describe('segment', () => {
  it('returns no phrases for no notes', () => {
    expect(segment([])).toEqual([])
  })

  it('keeps notes with no gaps in one phrase', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0], [64, 1, 0], [65, 1, 0]])
    const phrases = segment(notes)
    expect(phrases).toHaveLength(1)
    expect(phrases[0].notes).toHaveLength(4)
    expect(phrases[0].startBar).toBe(1)
  })

  it('splits on a rest of an eighth or longer', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0.5], [64, 1, 0], [65, 1, 0]])
    const phrases = segment(notes)
    expect(phrases.map((p) => p.notes.length)).toEqual([2, 2])
    expect(phrases[0].confidence).toBe(1)
  })

  it('does not split on a gap shorter than an eighth', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0.25], [64, 1, 0]])
    expect(segment(notes)).toHaveLength(1)
  })

  it('does not split on a long note, which the corpus probe showed is wrong', () => {
    // A whole note among quarters must NOT create a boundary.
    const notes = notesFrom([[60, 1, 0], [62, 4, 0], [64, 1, 0], [65, 1, 0]])
    expect(segment(notes)).toHaveLength(1)
  })

  it('forces a boundary before a listed bar and marks it lower confidence', () => {
    // Eight quarter notes, no rests: bars 1 and 2.
    const notes = notesFrom(Array.from({ length: 8 }, () => [60, 1, 0] as [number, number, number]))
    const phrases = segment(notes, [2])
    expect(phrases).toHaveLength(2)
    expect(phrases[0].notes).toHaveLength(4)
    expect(phrases[1].startBar).toBe(2)
    expect(phrases[1].confidence).toBe(0.6)
  })

  it('records the bar range each phrase covers', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0], [64, 1, 0], [65, 1, 0], [67, 1, 0]])
    const [phrase] = segment(notes)
    expect(phrase.startBar).toBe(1)
    expect(phrase.endBar).toBe(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/analyse/segment.test.ts`
Expected: FAIL — cannot resolve `./segment.ts`.

- [ ] **Step 3: Implement `src/analyse/segment.ts`**

```ts
import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Note } from '../core/types.ts'

export interface Phrase {
  notes: Note[]
  startBar: number
  endBar: number
  confidence: number
}

/** A rest of this length or longer ends a phrase. */
const REST_THRESHOLD = TICKS_PER_QUARTER / 2

const REST_CONFIDENCE = 1
const STRUCTURAL_CONFIDENCE = 0.6

/**
 * Split a note stream into phrases on rests alone, plus any structural
 * boundaries supplied by the caller (chorus starts, soloist regions).
 *
 * Deliberately does NOT split on long notes or wide inter-onset intervals: a
 * probe over four real solos found both flatten the phrase-start/phrase-end
 * chromaticism asymmetry to nothing and fragment phrases into two-note pieces.
 * See docs/research/corpus-survey-cleanup.md.
 */
export function segment(notes: Note[], forcedBoundaryBars: number[] = []): Phrase[] {
  if (notes.length === 0) return []

  const forced = new Set(forcedBoundaryBars)
  const phrases: Phrase[] = []
  let current: Note[] = []
  let confidence = REST_CONFIDENCE

  const flush = (endedBy: number): void => {
    if (current.length === 0) return
    phrases.push({
      notes: current,
      startBar: current[0].bar,
      endBar: current[current.length - 1].bar,
      confidence,
    })
    current = []
    confidence = endedBy
  }

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i]

    // A forced bar boundary closes the phrase before this note joins it.
    if (current.length > 0 && forced.has(note.bar) && notes[i - 1].bar !== note.bar) {
      flush(STRUCTURAL_CONFIDENCE)
    }

    current.push(note)

    const next = notes[i + 1]
    if (!next) continue
    const gap = next.onset - (note.onset + note.duration)
    if (gap >= REST_THRESHOLD) flush(REST_CONFIDENCE)
  }

  flush(REST_CONFIDENCE)
  return phrases
}
```

Note on `confidence`: it describes how the phrase *began*. The first phrase always starts at `REST_CONFIDENCE`; a phrase created by a forced boundary carries `STRUCTURAL_CONFIDENCE`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/analyse/segment.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/analyse/segment.ts src/analyse/segment.test.ts
git commit -m "feat: segment phrases on rests, with forced structural boundaries"
```

---

### Task 2: Note context — degrees against the sounding chord

**Files:**
- Create: `src/analyse/context.ts`
- Test: `src/analyse/context.test.ts`

**Interfaces:**
- Consumes: `Note`, `Chord` from core types; `degreeOf`, `isChordTone` from `src/core/pitch.ts`.
- Produces:

```ts
export interface NoteContext {
  note: Note
  chord: Chord | null
  /** null when no chord is sounding. */
  degree: string | null
  chordTone: boolean
  /** Altered AND not a chord tone. The b7 of a dominant is NOT chromatic. */
  chromatic: boolean
}
export function chordAt(chords: Chord[], onset: number): Chord | null
export function contextualise(notes: Note[], chords: Chord[]): NoteContext[]
```

A chord sounds from its onset until the next chord's onset. A note before the first chord has no chord.

- [ ] **Step 1: Write the failing test `src/analyse/context.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { chordAt, contextualise } from './context.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Chord, Note } from '../core/types.ts'

const chord = (bar: number, rootPc: number, quality: Chord['quality']): Chord =>
  ({ onset: (bar - 1) * 4 * Q, bar, rootPc, quality, tensions: [] })

const note = (midi: number, quarters: number): Note => ({
  midi,
  onset: quarters * Q,
  duration: Q,
  bar: Math.floor(quarters / 4) + 1,
  beat: quarters % 4,
})

describe('chordAt', () => {
  const chords = [chord(1, 0, 'major-seventh'), chord(2, 5, 'dominant')]

  it('returns the chord sounding at an onset', () => {
    expect(chordAt(chords, 0)?.rootPc).toBe(0)
    expect(chordAt(chords, 3 * Q)?.rootPc).toBe(0)
    expect(chordAt(chords, 4 * Q)?.rootPc).toBe(5)
    expect(chordAt(chords, 100 * Q)?.rootPc).toBe(5)
  })

  it('returns null before the first chord', () => {
    expect(chordAt([chord(2, 0, 'major')], 0)).toBeNull()
  })

  it('returns null when there are no chords', () => {
    expect(chordAt([], 0)).toBeNull()
  })
})

describe('contextualise', () => {
  it('labels degrees against the sounding chord', () => {
    const chords = [chord(1, 0, 'major-seventh')]
    const ctx = contextualise([note(60, 0), note(62, 1), note(64, 2), note(67, 3)], chords)
    expect(ctx.map((c) => c.degree)).toEqual(['1', '2', '3', '5'])
  })

  it('relabels the same pitch when the chord changes', () => {
    const chords = [chord(1, 0, 'dominant'), chord(2, 0, 'minor-seventh')]
    const ctx = contextualise([note(63, 0), note(63, 4)], chords)
    expect(ctx[0].degree).toBe('#9')
    expect(ctx[1].degree).toBe('3')
  })

  it('does not call the flat seventh of a dominant chromatic', () => {
    // This is the measurement trap the segmentation probe uncovered.
    const ctx = contextualise([note(70, 0)], [chord(1, 0, 'dominant')])
    expect(ctx[0].chordTone).toBe(true)
    expect(ctx[0].chromatic).toBe(false)
  })

  it('does call an altered non-chord-tone chromatic', () => {
    const ctx = contextualise([note(61, 0)], [chord(1, 0, 'dominant')])
    expect(ctx[0].chromatic).toBe(true)
  })

  it('does not call a plain ninth chromatic', () => {
    const ctx = contextualise([note(62, 0)], [chord(1, 0, 'dominant')])
    expect(ctx[0].chromatic).toBe(false)
  })

  it('handles notes with no chord sounding', () => {
    const ctx = contextualise([note(60, 0)], [])
    expect(ctx[0]).toMatchObject({ chord: null, degree: null, chordTone: false, chromatic: false })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/analyse/context.test.ts`
Expected: FAIL — cannot resolve `./context.ts`.

- [ ] **Step 3: Implement `src/analyse/context.ts`**

```ts
import type { Chord, Note } from '../core/types.ts'
import { degreeOf, isChordTone } from '../core/pitch.ts'

export interface NoteContext {
  note: Note
  chord: Chord | null
  degree: string | null
  chordTone: boolean
  chromatic: boolean
}

/** The chord sounding at an onset, or null if none has started yet. */
export function chordAt(chords: Chord[], onset: number): Chord | null {
  let found: Chord | null = null
  for (const chord of chords) {
    if (chord.onset <= onset) found = chord
    else break
  }
  return found
}

/**
 * Pair each note with the chord sounding under it and its degree.
 *
 * `chromatic` means altered AND not a chord tone. Spelling alone is not
 * enough: the b7 of a dominant carries a flat but is the most consonant note
 * in the chord, and treating it as chromatic hides real signal.
 */
export function contextualise(notes: Note[], chords: Chord[]): NoteContext[] {
  const sorted = [...chords].sort((a, b) => a.onset - b.onset)

  return notes.map((note) => {
    const chord = chordAt(sorted, note.onset)
    if (!chord) {
      return { note, chord: null, degree: null, chordTone: false, chromatic: false }
    }
    const degree = degreeOf(note.midi, chord)
    const chordTone = isChordTone(note.midi, chord)
    return {
      note,
      chord,
      degree,
      chordTone,
      chromatic: /^[b#]/.test(degree) && !chordTone,
    }
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/analyse/context.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/analyse/context.ts src/analyse/context.test.ts
git commit -m "feat: contextualise notes against the sounding chord"
```

---

### Task 3: Shape detector — a quality-aware vocabulary dictionary

**Files:**
- Create: `src/analyse/detectors/shapes.ts`
- Test: `src/analyse/detectors/shapes.test.ts`

**Interfaces:**
- Consumes: `NoteContext` from `src/analyse/context.ts`; `Quality` from core types.
- Produces:

```ts
export interface ShapeHit {
  startIndex: number
  length: number
  name: string
  degrees: string[]
  quality: Quality
}
export function matchShapes(ctx: NoteContext[]): ShapeHit[]
```

The dictionary is keyed by **degree string plus chord family**, because the same shape over a different quality is a different musical object. `3572` over a major chord is 3-5-7-9; over a minor chord it is the major-seventh arpeggio built on the ♭3, which is what Seamus Blake actually played twice in the sample analysed by hand.

All notes of a match must sit under the **same chord**. Matches are 4 notes long.

Dictionary:

| family | degrees | name |
|---|---|---|
| major | `1235` | digital pattern 1235 |
| major | `1234` | scalar cell 1234 |
| major | `3572` | 3-5-7-9 upper structure |
| major | `1357` | seventh arpeggio |
| major | `5321` | 5-3-2-1 descent |
| minor | `1345` | minor cell 1345 |
| minor | `1235` | minor digital pattern 1235 |
| minor | `3572` | major-seventh arpeggio from the b3 |
| minor | `1357` | minor seventh arpeggio |
| minor | `5321` | 5-3-2-1 descent |

- [ ] **Step 1: Write the failing test `src/analyse/detectors/shapes.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { matchShapes } from './shapes.ts'
import { contextualise } from '../context.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord, Note } from '../../core/types.ts'

const chord = (bar: number, rootPc: number, quality: Chord['quality']): Chord =>
  ({ onset: (bar - 1) * 4 * Q, bar, rootPc, quality, tensions: [] })

const line = (midis: number[]): Note[] =>
  midis.map((midi, i) => ({
    midi, onset: i * Q, duration: Q,
    bar: Math.floor(i / 4) + 1, beat: i % 4,
  }))

describe('matchShapes', () => {
  it('finds 1235 over a major seventh chord', () => {
    const ctx = contextualise(line([60, 62, 64, 67]), [chord(1, 0, 'major-seventh')])
    const hits = matchShapes(ctx)
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ startIndex: 0, length: 4, name: 'digital pattern 1235' })
    expect(hits[0].degrees).toEqual(['1', '2', '3', '5'])
  })

  it('names the same degree string differently over a minor chord', () => {
    // Ab C Eb G over Fm — exactly what Seamus Blake played in bar 73.
    const ctx = contextualise(line([68, 72, 75, 79]), [chord(1, 5, 'minor-seventh')])
    const hits = matchShapes(ctx)
    expect(hits[0].degrees).toEqual(['3', '5', '7', '2'])
    expect(hits[0].name).toBe('major-seventh arpeggio from the b3')
  })

  it('finds the minor cell 1345', () => {
    const ctx = contextualise(line([62, 65, 67, 69]), [chord(1, 2, 'minor-seventh')])
    expect(matchShapes(ctx)[0].name).toBe('minor cell 1345')
  })

  it('matches a cell spanning two bars that carry the same chord', () => {
    // The Blake figure spans bars 73-74, both Fm, written as two <harmony>
    // elements. Comparing chord objects by identity would miss it.
    const chords = [chord(1, 5, 'minor-seventh'), chord(2, 5, 'minor-seventh')]
    const notes = line([68, 72, 75, 79]).map((n, i) =>
      i < 2 ? n : { ...n, onset: n.onset + 4 * Q, bar: 2 })
    expect(matchShapes(contextualise(notes, chords))).toHaveLength(1)
  })

  it('does not match across a chord change', () => {
    const chords = [chord(1, 0, 'major-seventh'), { ...chord(1, 5, 'dominant'), onset: 2 * Q }]
    const ctx = contextualise(line([60, 62, 64, 67]), chords)
    expect(matchShapes(ctx)).toEqual([])
  })

  it('returns nothing for a line that matches no dictionary entry', () => {
    const ctx = contextualise(line([60, 61, 66, 71]), [chord(1, 0, 'major-seventh')])
    expect(matchShapes(ctx)).toEqual([])
  })

  it('returns nothing when no chord is sounding', () => {
    expect(matchShapes(contextualise(line([60, 62, 64, 67]), []))).toEqual([])
  })

  it('finds every occurrence in a longer line', () => {
    const ctx = contextualise(line([60, 62, 64, 67, 60, 62, 64, 67]), [chord(1, 0, 'major-seventh')])
    expect(matchShapes(ctx).map((h) => h.startIndex)).toEqual([0, 4])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/analyse/detectors/shapes.test.ts`
Expected: FAIL — cannot resolve `./shapes.ts`.

- [ ] **Step 3: Implement `src/analyse/detectors/shapes.ts`**

```ts
import type { Quality } from '../../core/types.ts'
import type { NoteContext } from '../context.ts'

export interface ShapeHit {
  startIndex: number
  length: number
  name: string
  degrees: string[]
  quality: Quality
}

type Family = 'major' | 'minor'

const MINOR_QUALITIES: ReadonlySet<Quality> = new Set<Quality>([
  'minor', 'minor-seventh', 'minor-major', 'half-diminished',
  'diminished', 'diminished-seventh',
])

function familyOf(quality: Quality): Family {
  return MINOR_QUALITIES.has(quality) ? 'minor' : 'major'
}

/**
 * Vocabulary keyed by degree string AND chord family: the same shape over a
 * different quality is a different musical object. "3572" over a major chord
 * is the 3-5-7-9 upper structure; over a minor chord it is the major-seventh
 * arpeggio built on the b3.
 */
const DICTIONARY: Record<Family, Record<string, string>> = {
  major: {
    '1235': 'digital pattern 1235',
    '1234': 'scalar cell 1234',
    '3572': '3-5-7-9 upper structure',
    '1357': 'seventh arpeggio',
    '5321': '5-3-2-1 descent',
  },
  minor: {
    '1345': 'minor cell 1345',
    '1235': 'minor digital pattern 1235',
    '3572': 'major-seventh arpeggio from the b3',
    '1357': 'minor seventh arpeggio',
    '5321': '5-3-2-1 descent',
  },
}

const CELL_LENGTH = 4

export function matchShapes(ctx: NoteContext[]): ShapeHit[] {
  const hits: ShapeHit[] = []

  for (let i = 0; i + CELL_LENGTH <= ctx.length; i++) {
    const window = ctx.slice(i, i + CELL_LENGTH)
    const chord = window[0].chord
    if (!chord) continue
    // Same harmony, compared by root and quality rather than object identity:
    // a cell often spans two bars carrying the same chord as separate <harmony>
    // elements, and identity would reject it. A genuine chord change still
    // rejects, because the degrees would then describe two harmonies.
    if (!window.every((c) => c.chord !== null
      && c.chord.rootPc === chord.rootPc
      && c.chord.quality === chord.quality)) continue
    if (window.some((c) => c.degree === null)) continue

    const degrees = window.map((c) => c.degree as string)
    const name = DICTIONARY[familyOf(chord.quality)][degrees.join('')]
    if (!name) continue

    hits.push({
      startIndex: i,
      length: CELL_LENGTH,
      name,
      degrees,
      quality: chord.quality,
    })
  }

  return hits
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/analyse/detectors/shapes.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/analyse/detectors/shapes.ts src/analyse/detectors/shapes.test.ts
git commit -m "feat: add quality-aware shape dictionary detector"
```

---

### Task 4: Target detector — approaches and enclosures

**Files:**
- Create: `src/analyse/detectors/targets.ts`
- Test: `src/analyse/detectors/targets.test.ts`

**Interfaces:**
- Consumes: `NoteContext` from `src/analyse/context.ts`.
- Produces:

```ts
export type TargetKind = 'enclosure' | 'approach'
export interface TargetHit {
  targetIndex: number
  windowStart: number
  kind: TargetKind
  /** True when the final motion into the target rises. */
  fromBelow: boolean
  /** Semitones of the final step into the target: 1 or 2. */
  stepSize: number
  chromaticCount: number
  /** 0..1. Not a probability. */
  score: number
}
export function detectTargets(ctx: NoteContext[]): TargetHit[]
```

This is the project's own contribution — no published framework catches a multi-note enclosure like Parker's `G# G C A Bb B`, which is five intervals with a perfect fourth in it.

Algorithm:
1. A note is a **candidate target** only if it is a chord tone. Score its strength: `+0.4` on beat 0 or 2, `+0.3` if longer than the following note, `+0.3` if it is the first note under its chord. Reject below `0.3`.
2. Search backwards for the **smallest** window of 2 to 5 preceding notes, all under the same chord as the target or the one before it, such that the last note steps into the target by 1 or 2 semitones.
3. If the window contains notes both above and below the target, it is an **enclosure**; if only one side, an **approach**.
4. `score` combines target strength, a bonus for enclosure over approach, a bonus for chromatic content, and a penalty for a wide window.

Separating approach from enclosure is deliberate: a first pass that reported only bracketed cases missed `G5 F5 G5 Ab5`, a real approach from below into the ♭3 that Blake played identically in two bars.

- [ ] **Step 1: Write the failing test `src/analyse/detectors/targets.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { detectTargets } from './targets.ts'
import { contextualise } from '../context.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord, Note } from '../../core/types.ts'

const chord = (rootPc: number, quality: Chord['quality']): Chord =>
  ({ onset: 0, bar: 1, rootPc, quality, tensions: [] })

/** Eighth notes from beat 0, so beats land on 0, 0.5, 1, 1.5 ... */
const line = (midis: number[]): Note[] =>
  midis.map((midi, i) => ({
    midi, onset: i * (Q / 2), duration: Q / 2,
    bar: Math.floor(i / 8) + 1, beat: (i % 8) / 2,
  }))

describe('detectTargets', () => {
  it('finds a three-note enclosure', () => {
    // Bb C B targeting B, over G7 where B is the third.
    const ctx = contextualise(line([70, 72, 71]), [chord(7, 'dominant')])
    const hits = detectTargets(ctx)
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ targetIndex: 2, kind: 'enclosure', fromBelow: false, stepSize: 1 })
  })

  it("finds Parker's five-note enclosure that the published rules miss", () => {
    // G# G C A Bb B -> B. Five intervals, containing a perfect fourth, so it
    // is not an approach under the Weimar Bebop Alphabet at all.
    const ctx = contextualise(line([68, 67, 72, 69, 70, 71]), [chord(7, 'dominant')])
    const hits = detectTargets(ctx)
    const onB = hits.find((h) => h.targetIndex === 5)
    expect(onB).toBeDefined()
    expect(onB!.kind).toBe('enclosure')
    expect(onB!.fromBelow).toBe(true)
  })

  it('reports an approach from one side only, not as an enclosure', () => {
    // G F G Ab into Ab, the b3 of Fm: everything is below the target.
    const ctx = contextualise(line([67, 65, 67, 68]), [chord(5, 'minor-seventh')])
    const hit = detectTargets(ctx).find((h) => h.targetIndex === 3)
    expect(hit).toBeDefined()
    expect(hit!.kind).toBe('approach')
    expect(hit!.fromBelow).toBe(true)
  })

  it('does not fire when the target is not a chord tone', () => {
    // Target D# over C major seventh is not a chord tone.
    const ctx = contextualise(line([62, 65, 63]), [chord(0, 'major-seventh')])
    expect(detectTargets(ctx)).toEqual([])
  })

  it('does not fire when the last motion is a leap rather than a step', () => {
    const ctx = contextualise(line([65, 72, 64]), [chord(0, 'major-seventh')])
    expect(detectTargets(ctx)).toEqual([])
  })

  it('prefers the smallest window that works', () => {
    const ctx = contextualise(line([60, 62, 70, 72, 71]), [chord(7, 'dominant')])
    const hit = detectTargets(ctx).find((h) => h.targetIndex === 4)!
    expect(hit.windowStart).toBe(2)
  })

  it('scores a chromatic enclosure above a plain approach', () => {
    const enclosure = detectTargets(contextualise(line([70, 72, 71]), [chord(7, 'dominant')]))[0]
    const approach = detectTargets(contextualise(line([67, 65, 67, 68]), [chord(5, 'minor-seventh')]))
      .find((h) => h.targetIndex === 3)!
    expect(enclosure.score).toBeGreaterThan(approach.score)
  })

  it('returns nothing without chords', () => {
    expect(detectTargets(contextualise(line([70, 72, 71]), []))).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/analyse/detectors/targets.test.ts`
Expected: FAIL — cannot resolve `./targets.ts`.

- [ ] **Step 3: Implement `src/analyse/detectors/targets.ts`**

```ts
import type { NoteContext } from '../context.ts'

export type TargetKind = 'enclosure' | 'approach'

export interface TargetHit {
  targetIndex: number
  windowStart: number
  kind: TargetKind
  fromBelow: boolean
  stepSize: number
  chromaticCount: number
  score: number
}

const MIN_WINDOW = 2
const MAX_WINDOW = 5
const MIN_TARGET_STRENGTH = 0.3

/**
 * How strongly this note reads as something the player was aiming at.
 * Weighted rather than a boolean gate: a note a sixteenth late is still a
 * target, just a slightly less certain one.
 */
function targetStrength(ctx: NoteContext[], i: number): number {
  const here = ctx[i]
  if (!here.chord || !here.chordTone) return 0

  let strength = 0
  const beat = here.note.beat
  if (beat === 0 || beat === 2) strength += 0.4
  else if (Number.isInteger(beat)) strength += 0.2

  const next = ctx[i + 1]
  if (!next || here.note.duration > next.note.duration) strength += 0.3

  const previous = ctx[i - 1]
  if (!previous || previous.chord !== here.chord) strength += 0.3

  // Thirds and sevenths are what players aim at.
  if (here.degree === '3' || here.degree === '7' || here.degree === 'b7') strength += 0.2

  return Math.min(1, strength)
}

/**
 * Find notes the line is aiming at, and describe how it got there.
 *
 * Inverts the usual search: rather than matching figures and asking what they
 * are, it finds targets and describes the approach. That is what catches a
 * multi-note enclosure whose notes are generated around the target rather than
 * drawn from a fixed shape.
 */
export function detectTargets(ctx: NoteContext[]): TargetHit[] {
  const hits: TargetHit[] = []

  for (let i = MIN_WINDOW; i < ctx.length; i++) {
    const target = ctx[i]
    const strength = targetStrength(ctx, i)
    if (strength < MIN_TARGET_STRENGTH) continue

    const stepSize = Math.abs(target.note.midi - ctx[i - 1].note.midi)
    if (stepSize !== 1 && stepSize !== 2) continue

    for (let w = MIN_WINDOW; w <= MAX_WINDOW; w++) {
      const start = i - w
      if (start < 0) continue

      const window = ctx.slice(start, i)
      if (window.some((c) => c.chord === null)) continue

      const above = window.some((c) => c.note.midi > target.note.midi)
      const below = window.some((c) => c.note.midi < target.note.midi)
      if (!above && !below) continue

      const kind: TargetKind = above && below ? 'enclosure' : 'approach'
      const chromaticCount = window.filter((c) => c.chromatic).length

      const score = Math.min(
        1,
        strength * 0.5 +
          (kind === 'enclosure' ? 0.3 : 0.1) +
          Math.min(0.2, chromaticCount * 0.1) -
          (w - MIN_WINDOW) * 0.03,
      )

      hits.push({
        targetIndex: i,
        windowStart: start,
        kind,
        fromBelow: target.note.midi > ctx[i - 1].note.midi,
        stepSize,
        chromaticCount,
        score,
      })
      break // smallest window that works wins
    }
  }

  return hits
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/analyse/detectors/targets.test.ts`
Expected: PASS, 8 tests.

If a test fails on scoring thresholds, adjust the weights in `targetStrength` or `score` — but never weaken an assertion about *which* figures are found or how they are classified.

- [ ] **Step 5: Commit**

```bash
git add src/analyse/detectors/targets.ts src/analyse/detectors/targets.test.ts
git commit -m "feat: detect target notes with approach and enclosure classification"
```

---

### Task 5: Recurrence detector — repeated interval cells

**Files:**
- Create: `src/analyse/detectors/recurring.ts`
- Test: `src/analyse/detectors/recurring.test.ts`

**Interfaces:**
- Consumes: `NoteContext`; `intervalsOf` from `src/core/pitch.ts`.
- Produces:

```ts
export interface RecurringHit {
  intervals: number[]
  /** Note indices where each occurrence starts. */
  occurrences: number[]
}
export function findRecurring(
  ctx: NoteContext[],
  options?: { minLength?: number; maxLength?: number; minCount?: number },
): RecurringHit[]
```

Mines the solo for interval cells that recur, defaults `minLength: 3`, `maxLength: 6`, `minCount: 2` (lengths in intervals, so a length-3 cell is 4 notes).

**Trivia filter, and why it matters.** Frieler's mine of Parker's Omnibook found the most frequent interval patterns are `[-1,-1,-1]`, `[-2,-1,-2]`, `[-1,-2,-1]` — chromatic and diatonic runs. Frequency alone is nearly vacuous. So discard any cell whose intervals are all steps (absolute value 1 or 2) in a single direction: those are scale fragments, not vocabulary.

Longer cells win: if a shorter cell occurs only inside a longer one, keep only the longer.

- [ ] **Step 1: Write the failing test `src/analyse/detectors/recurring.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { findRecurring } from './recurring.ts'
import { contextualise } from '../context.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord, Note } from '../../core/types.ts'

const chord = (rootPc: number): Chord =>
  ({ onset: 0, bar: 1, rootPc, quality: 'minor-seventh', tensions: [] })

const line = (midis: number[]): Note[] =>
  midis.map((midi, i) => ({
    midi, onset: i * (Q / 2), duration: Q / 2,
    bar: Math.floor(i / 8) + 1, beat: (i % 8) / 2,
  }))

const ctxOf = (midis: number[]) => contextualise(line(midis), [chord(5)])

describe('findRecurring', () => {
  it('finds a cell that occurs twice, transposed', () => {
    // [+1,+4,+3,+4] twice — the figure Seamus Blake played in bars 73 and 77.
    const ctx = ctxOf([67, 68, 72, 75, 79, 60, 62, 63, 67, 70, 74])
    const hits = findRecurring(ctx)
    const cell = hits.find((h) => h.intervals.join(',') === '1,4,3,4')
    expect(cell).toBeDefined()
    expect(cell!.occurrences).toHaveLength(2)
  })

  it('discards a chromatic run as trivia', () => {
    const ctx = ctxOf([60, 59, 58, 57, 56, 70, 69, 68, 67, 66])
    expect(findRecurring(ctx)).toEqual([])
  })

  it('discards a diatonic scale run as trivia', () => {
    const ctx = ctxOf([60, 62, 64, 65, 67, 72, 74, 76, 77, 79])
    expect(findRecurring(ctx)).toEqual([])
  })

  it('ignores a cell that occurs only once', () => {
    const ctx = ctxOf([60, 64, 67, 72, 61, 66, 60, 55])
    expect(findRecurring(ctx)).toEqual([])
  })

  it('prefers the longer cell when a shorter one only occurs inside it', () => {
    const ctx = ctxOf([60, 61, 65, 68, 72, 50, 51, 55, 58, 62])
    const lengths = findRecurring(ctx).map((h) => h.intervals.length)
    expect(Math.max(...lengths)).toBe(4)
    expect(findRecurring(ctx)).toHaveLength(1)
  })

  it('respects a raised minimum count', () => {
    const ctx = ctxOf([60, 61, 65, 68, 50, 51, 55, 58])
    expect(findRecurring(ctx, { minCount: 3 })).toEqual([])
  })

  it('returns nothing for a line shorter than the minimum cell', () => {
    expect(findRecurring(ctxOf([60, 62]))).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/analyse/detectors/recurring.test.ts`
Expected: FAIL — cannot resolve `./recurring.ts`.

- [ ] **Step 3: Implement `src/analyse/detectors/recurring.ts`**

```ts
import type { NoteContext } from '../context.ts'

export interface RecurringHit {
  intervals: number[]
  occurrences: number[]
}

export interface RecurringOptions {
  minLength?: number
  maxLength?: number
  minCount?: number
}

/**
 * A cell of nothing but steps in one direction is a scale fragment, not
 * vocabulary. Frieler's mine of Parker's Omnibook found exactly these at the
 * top of the frequency table — [-1,-1,-1], [-2,-1,-2] — which is why raw
 * frequency is close to worthless as a criterion on its own.
 */
function isTrivia(intervals: number[]): boolean {
  const allSteps = intervals.every((iv) => Math.abs(iv) === 1 || Math.abs(iv) === 2)
  const oneDirection =
    intervals.every((iv) => iv > 0) || intervals.every((iv) => iv < 0)
  return allSteps && oneDirection
}

export function findRecurring(
  ctx: NoteContext[],
  options: RecurringOptions = {},
): RecurringHit[] {
  const minLength = options.minLength ?? 3
  const maxLength = options.maxLength ?? 6
  const minCount = options.minCount ?? 2

  const intervals: number[] = []
  for (let i = 0; i < ctx.length - 1; i++) {
    intervals.push(ctx[i + 1].note.midi - ctx[i].note.midi)
  }
  if (intervals.length < minLength) return []

  const found = new Map<string, RecurringHit>()

  for (let length = minLength; length <= maxLength; length++) {
    const seen = new Map<string, number[]>()
    for (let i = 0; i + length <= intervals.length; i++) {
      const cell = intervals.slice(i, i + length)
      if (isTrivia(cell)) continue
      const key = cell.join(',')
      const list = seen.get(key) ?? []
      list.push(i)
      seen.set(key, list)
    }
    for (const [key, occurrences] of seen) {
      if (occurrences.length < minCount) continue
      found.set(key, { intervals: key.split(',').map(Number), occurrences })
    }
  }

  // Drop any cell that only ever appears inside a longer recurring cell.
  const hits = [...found.values()].sort((a, b) => b.intervals.length - a.intervals.length)
  const kept: RecurringHit[] = []
  for (const hit of hits) {
    const key = hit.intervals.join(',')
    const swallowed = kept.some(
      (longer) =>
        longer.intervals.length > hit.intervals.length &&
        longer.intervals.join(',').includes(key),
    )
    if (!swallowed) kept.push(hit)
  }
  return kept
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/analyse/detectors/recurring.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/analyse/detectors/recurring.ts src/analyse/detectors/recurring.test.ts
git commit -m "feat: mine recurring interval cells, filtering out scale trivia"
```

---

### Task 6: Convergence — merge detector hits into scored findings

**Files:**
- Create: `src/analyse/index.ts`
- Test: `src/analyse/index.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1-5; `Score` from core types; `CleanupReport` from `src/prepare/index.ts`.
- Produces:

```ts
export interface FindingSpan {
  startIndex: number
  endIndex: number
  bar: number
  beat: number
}
export interface Finding {
  id: string
  kind: 'cell' | 'device'
  name: string
  spans: FindingSpan[]
  degrees?: string[]
  intervals?: number[]
  quality?: Quality
  /** Which detectors produced it: 'shape' | 'target' | 'recurring'. */
  detectedBy: string[]
  confidence: number
}
export interface Analysis {
  phrases: Phrase[]
  contexts: NoteContext[]
  findings: Finding[]
}
export function analyse(score: Score, report: CleanupReport): Analysis
```

Convergence is the heart of this: **a span found by more than one independent detector is worth far more than one found by a single detector.** In the hand probe, the shape matcher, the interval miner and an arpeggio parse all independently landed on the same span, and that agreement was the strongest signal available. It also partly substitutes for the corpus surprisal the spec defers.

Rules:
- Findings are merged when their note-index spans overlap **and** they carry the same name or the same interval vector.
- `confidence` = `0.35 * detectorCount` (capped at `0.8`) `+ 0.2` if it occurs more than once `+` the chord track's confidence `* 0.2`, capped at `1`.
- Findings are returned sorted by confidence, highest first.
- Analysis runs only over the chosen soloist region — use `report.soloists[0]` when only one is named, otherwise the first named region.

- [ ] **Step 1: Write the failing test `src/analyse/index.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest, prepare } from '../index.ts'
import { analyse } from './index.ts'

const analysed = (path: string) => {
  const score = ingest(new Uint8Array(readFileSync(path)))
  return analyse(score, prepare(score))
}

const BLAKE = '/Users/michaelkourkov/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl'

describe('analyse', () => {
  it('segments, contextualises and finds nothing alarming on a fixture', () => {
    const a = analysed('fixtures/form-8bar-x3.musicxml')
    expect(a.phrases.length).toBeGreaterThan(0)
    expect(a.contexts.length).toBeGreaterThan(0)
    expect(Array.isArray(a.findings)).toBe(true)
  })

  it('sorts findings by confidence, highest first', () => {
    const a = analysed(BLAKE)
    const scores = a.findings.map((f) => f.confidence)
    expect([...scores].sort((x, y) => y - x)).toEqual(scores)
  })

  it('scores a finding seen by two detectors above one seen by a single detector', () => {
    const a = analysed(BLAKE)
    const converged = a.findings.filter((f) => f.detectedBy.length > 1)
    const single = a.findings.filter((f) => f.detectedBy.length === 1)
    if (converged.length && single.length) {
      expect(Math.max(...converged.map((f) => f.confidence)))
        .toBeGreaterThan(Math.min(...single.map((f) => f.confidence)))
    }
  })

  it('gives every finding a location in the score', () => {
    const a = analysed(BLAKE)
    for (const f of a.findings) {
      expect(f.spans.length).toBeGreaterThan(0)
      expect(f.spans[0].bar).toBeGreaterThan(0)
    }
  })

  it('never returns a confidence above 1 or below 0', () => {
    const a = analysed(BLAKE)
    for (const f of a.findings) {
      expect(f.confidence).toBeGreaterThanOrEqual(0)
      expect(f.confidence).toBeLessThanOrEqual(1)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/analyse/index.test.ts`
Expected: FAIL — cannot resolve `./index.ts`.

- [ ] **Step 3: Implement `src/analyse/index.ts`**

Build it from the pieces:

```ts
import type { Quality, Score } from '../core/types.ts'
import type { CleanupReport } from '../prepare/index.ts'
import { segment } from './segment.ts'
import type { Phrase } from './segment.ts'
import { contextualise } from './context.ts'
import type { NoteContext } from './context.ts'
import { matchShapes } from './detectors/shapes.ts'
import { detectTargets } from './detectors/targets.ts'
import { findRecurring } from './detectors/recurring.ts'

export interface FindingSpan {
  startIndex: number
  endIndex: number
  bar: number
  beat: number
}

export interface Finding {
  id: string
  kind: 'cell' | 'device'
  name: string
  spans: FindingSpan[]
  degrees?: string[]
  intervals?: number[]
  quality?: Quality
  detectedBy: string[]
  confidence: number
}

export interface Analysis {
  phrases: Phrase[]
  contexts: NoteContext[]
  findings: Finding[]
}

const MAX_DETECTOR_CREDIT = 0.8
const CREDIT_PER_DETECTOR = 0.35
const REPEAT_BONUS = 0.2
const CHORD_WEIGHT = 0.2

export function analyse(score: Score, report: CleanupReport): Analysis {
  const region =
    report.soloists.find((s) => s.name !== 'unknown') ?? report.soloists[0]

  const notes = region
    ? score.notes.filter((n) => n.bar >= region.startBar && n.bar <= region.endBar)
    : score.notes

  const chordTrack = score.chordTracks[0]
  const contexts = contextualise(notes, chordTrack?.chords ?? [])

  const forced = report.form?.chorusStarts ?? []
  const phrases = segment(notes, forced)

  const spanOf = (start: number, end: number): FindingSpan => ({
    startIndex: start,
    endIndex: end,
    bar: contexts[start]?.note.bar ?? 0,
    beat: contexts[start]?.note.beat ?? 0,
  })

  // Collect raw findings from the three detectors, each tagged with its source.
  const raw: Finding[] = []

  for (const hit of matchShapes(contexts)) {
    raw.push({
      id: '',
      kind: 'cell',
      name: hit.name,
      spans: [spanOf(hit.startIndex, hit.startIndex + hit.length - 1)],
      degrees: hit.degrees,
      quality: hit.quality,
      detectedBy: ['shape'],
      confidence: 0,
    })
  }

  for (const hit of detectTargets(contexts)) {
    const target = contexts[hit.targetIndex]
    const name =
      `${hit.chromaticCount > 0 ? 'chromatic ' : ''}${hit.kind} into the ` +
      `${target.degree ?? '?'} from ${hit.fromBelow ? 'below' : 'above'}`
    raw.push({
      id: '',
      kind: 'device',
      name,
      spans: [spanOf(hit.windowStart, hit.targetIndex)],
      // Carried so a later re-targeting generator can rebuild the figure from
      // its shape rather than copying literal notes.
      intervals: contexts
        .slice(hit.windowStart, hit.targetIndex + 1)
        .map((c, i, all) => (i === 0 ? 0 : c.note.midi - all[i - 1].note.midi))
        .slice(1),
      detectedBy: ['target'],
      confidence: 0,
    })
  }

  for (const hit of findRecurring(contexts)) {
    raw.push({
      id: '',
      kind: 'cell',
      name: `recurring cell [${hit.intervals.join(', ')}]`,
      spans: hit.occurrences.map((start) => spanOf(start, start + hit.intervals.length)),
      intervals: hit.intervals,
      detectedBy: ['recurring'],
      confidence: 0,
    })
  }

  // Merge findings whose spans overlap and which describe the same thing.
  const merged: Finding[] = []
  for (const finding of raw) {
    const match = merged.find(
      (m) =>
        (m.name === finding.name ||
          (m.intervals && finding.intervals &&
            m.intervals.join(',') === finding.intervals.join(','))) &&
        m.spans.some((a) =>
          finding.spans.some((b) => a.startIndex <= b.endIndex && b.startIndex <= a.endIndex),
        ),
    )
    if (match) {
      for (const source of finding.detectedBy) {
        if (!match.detectedBy.includes(source)) match.detectedBy.push(source)
      }
      for (const span of finding.spans) {
        if (!match.spans.some((s) => s.startIndex === span.startIndex)) match.spans.push(span)
      }
    } else {
      merged.push({ ...finding, spans: [...finding.spans] })
    }
  }

  const chordConfidence = chordTrack?.confidence ?? 0

  const findings = merged
    .map((f, i) => ({
      ...f,
      id: `f${i + 1}`,
      confidence: Math.min(
        1,
        Math.min(MAX_DETECTOR_CREDIT, f.detectedBy.length * CREDIT_PER_DETECTOR) +
          (f.spans.length > 1 ? REPEAT_BONUS : 0) +
          chordConfidence * CHORD_WEIGHT,
      ),
    }))
    .sort((a, b) => b.confidence - a.confidence)

  return { phrases, contexts, findings }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/analyse/index.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm run test:run && npm run typecheck`
Expected: everything passes.

- [ ] **Step 6: Commit**

```bash
git add src/analyse/index.ts src/analyse/index.test.ts
git commit -m "feat: merge detector hits into findings scored by convergence"
```

---

### Task 7: Degree inverse and the two generators

**Files:**
- Modify: `src/core/pitch.ts` (add `semitonesOfDegree`)
- Create: `src/generate/transform.ts`
- Test: `src/generate/transform.test.ts`

**Interfaces:**
- Consumes: `Finding` from `src/analyse/index.ts`; `Chord`, `Quality`, `Instrument` from core types.
- Produces:

```ts
// in src/core/pitch.ts
export function semitonesOfDegree(degree: string, quality: Quality): number | null

// in src/generate/transform.ts
export interface ExerciseBar {
  rootPc: number
  quality: Quality
  /** Exactly the cell, as written pitches. Rendered as even eighths. */
  midis: number[]
}
export interface Exercise {
  id: string
  title: string
  findingId: string
  findingName: string
  transformation: 'cycle-of-fourths' | 'over-changes'
  bars: ExerciseBar[]
  sourceBar: number
  rationale: string
}
export function throughCycleOfFourths(finding: Finding, instrument: Instrument): Exercise | null
export function overChanges(finding: Finding, chords: Chord[], instrument: Instrument): Exercise | null
```

`semitonesOfDegree` is the inverse of `degreeOf` — given `'3'` and a minor quality it returns `3`; given `'3'` and a major quality it returns `4`. It must round-trip: `degreeOf(root + semitonesOfDegree(d, q), chord) === d`.

**Both generators are degree-preserving.** For each new root, the first note is re-derived from the finding's first degree against that root, then the finding's interval vector is applied. That is what makes the exercise the same *musical* idea rather than the same notes moved about.

- **Cycle of fourths:** twelve bars, roots ascending by a perfect fourth from the finding's original root.
- **Over changes:** one bar for each distinct chord in the solo whose quality is in the same family as the finding's, capped at eight bars.
- Both clamp into `instrument.writtenRange` by shifting whole octaves, and return `null` for a finding with no degrees or intervals to work from.

- [ ] **Step 1: Write the failing test `src/generate/transform.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { semitonesOfDegree, degreeOf } from '../core/pitch.ts'
import { throughCycleOfFourths, overChanges } from './transform.ts'
import { instrumentFromTranspose } from '../core/instrument.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Chord } from '../core/types.ts'
import type { Finding } from '../analyse/index.ts'

const tenor = instrumentFromTranspose(-2, -1)

const cellFinding = (): Finding => ({
  id: 'f1',
  kind: 'cell',
  name: 'digital pattern 1235',
  spans: [{ startIndex: 0, endIndex: 3, bar: 5, beat: 0 }],
  degrees: ['1', '2', '3', '5'],
  intervals: [2, 2, 3],
  quality: 'major-seventh',
  detectedBy: ['shape'],
  confidence: 0.7,
})

describe('semitonesOfDegree', () => {
  it('inverts degreeOf for the major family', () => {
    expect(semitonesOfDegree('3', 'major-seventh')).toBe(4)
    expect(semitonesOfDegree('b7', 'dominant')).toBe(10)
    expect(semitonesOfDegree('#11', 'dominant')).toBe(6)
  })

  it('inverts degreeOf for the minor family, where 3 is the minor third', () => {
    expect(semitonesOfDegree('3', 'minor-seventh')).toBe(3)
    expect(semitonesOfDegree('7', 'minor-seventh')).toBe(10)
  })

  it('round-trips against degreeOf', () => {
    const chord: Chord = { onset: 0, bar: 1, rootPc: 5, quality: 'minor-seventh', tensions: [] }
    for (const degree of ['1', '2', '3', '4', '5', '6', '7']) {
      const semis = semitonesOfDegree(degree, chord.quality)!
      expect(degreeOf(60 + chord.rootPc + semis, chord)).toBe(degree)
    }
  })

  it('returns null for a degree that is not in the table', () => {
    expect(semitonesOfDegree('b17', 'dominant')).toBeNull()
  })
})

describe('throughCycleOfFourths', () => {
  it('produces twelve bars', () => {
    const ex = throughCycleOfFourths(cellFinding(), tenor)!
    expect(ex.bars).toHaveLength(12)
    expect(ex.transformation).toBe('cycle-of-fourths')
  })

  it('moves the root up a fourth each bar', () => {
    const ex = throughCycleOfFourths(cellFinding(), tenor)!
    const roots = ex.bars.map((b) => b.rootPc)
    for (let i = 1; i < roots.length; i++) {
      expect((roots[i] - roots[i - 1] + 12) % 12).toBe(5)
    }
  })

  it('preserves the degree string in every bar', () => {
    const ex = throughCycleOfFourths(cellFinding(), tenor)!
    for (const bar of ex.bars) {
      const chord: Chord = { onset: 0, bar: 1, rootPc: bar.rootPc, quality: bar.quality, tensions: [] }
      expect(bar.midis.map((m) => degreeOf(m, chord))).toEqual(['1', '2', '3', '5'])
    }
  })

  it('keeps every note inside the written range', () => {
    const ex = throughCycleOfFourths(cellFinding(), tenor)!
    for (const bar of ex.bars) {
      for (const midi of bar.midis) {
        expect(midi).toBeGreaterThanOrEqual(tenor.writtenRange.lo)
        expect(midi).toBeLessThanOrEqual(tenor.writtenRange.hi)
      }
    }
  })

  it('cites the bar it came from', () => {
    expect(throughCycleOfFourths(cellFinding(), tenor)!.sourceBar).toBe(5)
  })

  it('returns null for a finding with no degrees', () => {
    const finding = { ...cellFinding(), degrees: undefined }
    expect(throughCycleOfFourths(finding, tenor)).toBeNull()
  })
})

describe('overChanges', () => {
  const chords: Chord[] = [
    { onset: 0, bar: 1, rootPc: 0, quality: 'major-seventh', tensions: [] },
    { onset: 4 * Q, bar: 2, rootPc: 5, quality: 'major-seventh', tensions: [] },
    { onset: 8 * Q, bar: 3, rootPc: 2, quality: 'minor-seventh', tensions: [] },
    { onset: 12 * Q, bar: 4, rootPc: 0, quality: 'major-seventh', tensions: [] },
  ]

  it('uses only chords in the same family as the finding', () => {
    const ex = overChanges(cellFinding(), chords, tenor)!
    expect(ex.bars.map((b) => b.rootPc)).toEqual([0, 5])
    expect(ex.transformation).toBe('over-changes')
  })

  it('preserves the degree string over each chord', () => {
    const ex = overChanges(cellFinding(), chords, tenor)!
    for (const bar of ex.bars) {
      const chord: Chord = { onset: 0, bar: 1, rootPc: bar.rootPc, quality: bar.quality, tensions: [] }
      expect(bar.midis.map((m) => degreeOf(m, chord))).toEqual(['1', '2', '3', '5'])
    }
  })

  it('returns null when no chord matches the family', () => {
    const minorOnly: Chord[] = [{ onset: 0, bar: 1, rootPc: 2, quality: 'minor-seventh', tensions: [] }]
    expect(overChanges(cellFinding(), minorOnly, tenor)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/generate/transform.test.ts`
Expected: FAIL — `semitonesOfDegree` is not exported and `./transform.ts` does not resolve.

- [ ] **Step 3: Add `semitonesOfDegree` to `src/core/pitch.ts`**

Append to the file, reusing the existing `MAJOR_FAMILY`, `MINOR_FAMILY` and `MINOR_QUALITIES` constants:

```ts
/** Inverse of degreeOf: a degree label and chord quality back to semitones. */
export function semitonesOfDegree(degree: string, quality: Quality): number | null {
  const table = MINOR_QUALITIES.has(quality) ? MINOR_FAMILY : MAJOR_FAMILY
  for (const [semis, label] of Object.entries(table)) {
    if (label === degree) return Number(semis)
  }
  return null
}
```

- [ ] **Step 4: Implement `src/generate/transform.ts`**

Key algorithm, in order:

1. Read `finding.degrees` (preferred) or derive nothing and return `null`.
2. Compute the interval vector from `finding.intervals`, or from the degrees if intervals are absent.
3. For each target root: `firstMidi = 60 + rootPc + semitonesOfDegree(degrees[0], quality)`, then apply the intervals cumulatively.
4. Octave-clamp the whole bar together — shift all notes by the same multiple of 12 until the lowest sits at or above `writtenRange.lo` and the highest at or below `writtenRange.hi`. Preserving the shape matters more than any single note's octave.
5. Build the `Exercise` with a `rationale` naming the finding and its source bar.

```ts
import { semitonesOfDegree } from '../core/pitch.ts'
import type { Chord, Instrument, Quality } from '../core/types.ts'
import type { Finding } from '../analyse/index.ts'

export interface ExerciseBar {
  rootPc: number
  quality: Quality
  midis: number[]
}

export interface Exercise {
  id: string
  title: string
  findingId: string
  findingName: string
  transformation: 'cycle-of-fourths' | 'over-changes'
  bars: ExerciseBar[]
  sourceBar: number
  rationale: string
}

const MINOR_QUALITIES: ReadonlySet<Quality> = new Set<Quality>([
  'minor', 'minor-seventh', 'minor-major', 'half-diminished',
  'diminished', 'diminished-seventh',
])

const familyOf = (q: Quality): 'major' | 'minor' =>
  MINOR_QUALITIES.has(q) ? 'minor' : 'major'

/** Shift the whole cell by octaves so it fits the horn without changing shape. */
function clampOctave(midis: number[], instrument: Instrument): number[] {
  let out = [...midis]
  let guard = 0
  while (Math.min(...out) < instrument.writtenRange.lo && guard++ < 8) {
    out = out.map((m) => m + 12)
  }
  guard = 0
  while (Math.max(...out) > instrument.writtenRange.hi && guard++ < 8) {
    out = out.map((m) => m - 12)
  }
  return out
}

function buildBar(
  rootPc: number,
  quality: Quality,
  degrees: string[],
  intervals: number[],
  instrument: Instrument,
): ExerciseBar | null {
  const firstSemis = semitonesOfDegree(degrees[0], quality)
  if (firstSemis === null) return null

  const midis = [60 + rootPc + firstSemis]
  for (const interval of intervals) midis.push(midis[midis.length - 1] + interval)

  return { rootPc, quality, midis: clampOctave(midis, instrument) }
}

function intervalsFor(finding: Finding): number[] | null {
  if (finding.intervals) return finding.intervals
  if (!finding.degrees || !finding.quality) return null
  const semis = finding.degrees.map((d) => semitonesOfDegree(d, finding.quality as Quality))
  if (semis.some((s) => s === null)) return null
  const out: number[] = []
  for (let i = 0; i < semis.length - 1; i++) {
    out.push((semis[i + 1] as number) - (semis[i] as number))
  }
  return out
}

export function throughCycleOfFourths(
  finding: Finding,
  instrument: Instrument,
): Exercise | null {
  const { degrees, quality } = finding
  if (!degrees || !quality) return null
  const intervals = intervalsFor(finding)
  if (!intervals) return null

  // Start from C and walk the cycle; the original key is not what is drilled.
  const bars: ExerciseBar[] = []
  for (let i = 0; i < 12; i++) {
    const bar = buildBar((i * 5) % 12, quality, degrees, intervals, instrument)
    if (bar) bars.push(bar)
  }
  if (bars.length === 0) return null

  return {
    id: `${finding.id}-cycle`,
    title: `${finding.name} through the cycle of fourths`,
    findingId: finding.id,
    findingName: finding.name,
    transformation: 'cycle-of-fourths',
    bars,
    sourceBar: finding.spans[0]?.bar ?? 0,
    rationale:
      `Drills ${finding.name}, which you played in bar ${finding.spans[0]?.bar ?? '?'}, ` +
      'in all twelve keys. The degrees stay put while the notes move.',
  }
}

export function overChanges(
  finding: Finding,
  chords: Chord[],
  instrument: Instrument,
): Exercise | null {
  const { degrees, quality } = finding
  if (!degrees || !quality) return null
  const intervals = intervalsFor(finding)
  if (!intervals) return null

  const family = familyOf(quality)
  const seen = new Set<string>()
  const bars: ExerciseBar[] = []

  for (const chord of chords) {
    if (familyOf(chord.quality) !== family) continue
    const key = `${chord.rootPc}:${chord.quality}`
    if (seen.has(key)) continue
    seen.add(key)
    const bar = buildBar(chord.rootPc, chord.quality, degrees, intervals, instrument)
    if (bar) bars.push(bar)
    if (bars.length >= 8) break
  }
  if (bars.length === 0) return null

  return {
    id: `${finding.id}-changes`,
    title: `${finding.name} over the tune's changes`,
    findingId: finding.id,
    findingName: finding.name,
    transformation: 'over-changes',
    bars,
    sourceBar: finding.spans[0]?.bar ?? 0,
    rationale:
      `Applies ${finding.name} to every ${family} chord in this tune, so you drill ` +
      'your own vocabulary over the harmony you lifted it from.',
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/generate/transform.test.ts src/core/pitch.test.ts`
Expected: PASS — 14 new plus the 10 existing pitch tests.

- [ ] **Step 6: Commit**

```bash
git add src/core/pitch.ts src/generate/transform.ts src/generate/transform.test.ts
git commit -m "feat: generate exercises through the cycle and over the tune's changes"
```

---

### Task 8: The validity gate

**Files:**
- Create: `src/generate/validity.ts`
- Test: `src/generate/validity.test.ts`

**Interfaces:**
- Consumes: `Exercise` from `./transform.ts`; `Finding` from `src/analyse/index.ts`; `contextualise`, `matchShapes`.
- Produces: `isValid(exercise: Exercise, finding: Finding): boolean`.

> A transformation is valid for a finding if re-running the detector on its output still finds the same finding.

For a **cell** finding, "the same" means the same degree string against the same chord family — not the same pitches, which is the entire point. Rebuild note contexts from each exercise bar and re-run `matchShapes`; the exercise is valid when **every** bar still yields the finding's degree string.

Findings with no degrees cannot be re-detected and are treated as invalid — the gate fails closed.

- [ ] **Step 1: Write the failing test `src/generate/validity.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { isValid } from './validity.ts'
import { throughCycleOfFourths } from './transform.ts'
import { instrumentFromTranspose } from '../core/instrument.ts'
import type { Finding } from '../analyse/index.ts'

const tenor = instrumentFromTranspose(-2, -1)

const finding = (over: Partial<Finding> = {}): Finding => ({
  id: 'f1',
  kind: 'cell',
  name: 'digital pattern 1235',
  spans: [{ startIndex: 0, endIndex: 3, bar: 5, beat: 0 }],
  degrees: ['1', '2', '3', '5'],
  intervals: [2, 2, 3],
  quality: 'major-seventh',
  detectedBy: ['shape'],
  confidence: 0.7,
  ...over,
})

describe('isValid', () => {
  it('passes a degree-preserving transposition', () => {
    const f = finding()
    expect(isValid(throughCycleOfFourths(f, tenor)!, f)).toBe(true)
  })

  it('fails an exercise whose notes no longer spell the finding', () => {
    const f = finding()
    const exercise = throughCycleOfFourths(f, tenor)!
    // Break one note: the cell is no longer 1235 in that bar.
    exercise.bars[0].midis[2] += 1
    expect(isValid(exercise, f)).toBe(false)
  })

  it('fails closed for a finding with no degrees to re-detect', () => {
    const f = finding({ degrees: undefined })
    const exercise = throughCycleOfFourths(finding(), tenor)!
    expect(isValid(exercise, f)).toBe(false)
  })

  it('accepts an exercise in a different octave, since pitches need not match', () => {
    const f = finding()
    const exercise = throughCycleOfFourths(f, tenor)!
    exercise.bars = exercise.bars.map((b) => ({ ...b, midis: b.midis.map((m) => m - 12) }))
    expect(isValid(exercise, f)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/generate/validity.test.ts`
Expected: FAIL — cannot resolve `./validity.ts`.

- [ ] **Step 3: Implement `src/generate/validity.ts`**

Rebuild a minimal `Note` list and `Chord` for each bar, contextualise, and compare degree strings directly (a dictionary lookup is not needed — the degree string is the identity).

```ts
import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Chord, Note } from '../core/types.ts'
import { contextualise } from '../analyse/context.ts'
import type { Finding } from '../analyse/index.ts'
import type { Exercise } from './transform.ts'

/**
 * A transformation is valid for a finding if re-running detection on its
 * output still finds the same finding. "Same" means the same degree string
 * against the same chord family — deliberately not the same pitches.
 *
 * Fails closed: a finding we cannot re-detect is not certified.
 */
export function isValid(exercise: Exercise, finding: Finding): boolean {
  if (!finding.degrees || finding.degrees.length === 0) return false

  return exercise.bars.every((bar) => {
    const chord: Chord = {
      onset: 0,
      bar: 1,
      rootPc: bar.rootPc,
      quality: bar.quality,
      tensions: [],
    }
    const notes: Note[] = bar.midis.map((midi, i) => ({
      midi,
      onset: i * (TICKS_PER_QUARTER / 2),
      duration: TICKS_PER_QUARTER / 2,
      bar: 1,
      beat: i / 2,
    }))
    const degrees = contextualise(notes, [chord]).map((c) => c.degree)
    return degrees.join(',') === finding.degrees!.join(',')
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/generate/validity.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/generate/validity.ts src/generate/validity.test.ts
git commit -m "feat: gate exercises by re-detecting the finding they drill"
```

---

### Task 9: Exercise assembly

**Files:**
- Create: `src/generate/index.ts`
- Test: `src/generate/index.test.ts`

**Interfaces:**
- Consumes: Tasks 7 and 8; `Analysis` from `src/analyse/index.ts`; `Score`.
- Produces: `generateExercises(analysis: Analysis, score: Score, options?: { maxFindings?: number }): Exercise[]`.

Takes the highest-confidence findings, runs both generators over each, keeps only what passes the validity gate. Default `maxFindings: 5`.

Findings with no `degrees` — the device findings from the target detector, and recurring interval cells — cannot yet be turned into exercises. They are still reported by `analyse`; they simply produce nothing here. That is a deliberate prototype limit, not a bug.

- [ ] **Step 1: Write the failing test `src/generate/index.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest, prepare } from '../index.ts'
import { analyse } from '../analyse/index.ts'
import { generateExercises } from './index.ts'
import { isValid } from './validity.ts'

const BLAKE = '/Users/michaelkourkov/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl'

const setup = (path: string) => {
  const score = ingest(new Uint8Array(readFileSync(path)))
  const report = prepare(score)
  return { score, analysis: analyse(score, report) }
}

describe('generateExercises', () => {
  it('produces exercises from a real solo', () => {
    const { score, analysis } = setup(BLAKE)
    const exercises = generateExercises(analysis, score)
    expect(exercises.length).toBeGreaterThan(0)
  })

  it('only returns exercises that pass the validity gate', () => {
    const { score, analysis } = setup(BLAKE)
    for (const exercise of generateExercises(analysis, score)) {
      const finding = analysis.findings.find((f) => f.id === exercise.findingId)!
      expect(isValid(exercise, finding)).toBe(true)
    }
  })

  it('keeps every note within the horn range', () => {
    const { score, analysis } = setup(BLAKE)
    const { lo, hi } = score.instrument.writtenRange
    for (const exercise of generateExercises(analysis, score)) {
      for (const bar of exercise.bars) {
        for (const midi of bar.midis) {
          expect(midi).toBeGreaterThanOrEqual(lo)
          expect(midi).toBeLessThanOrEqual(hi)
        }
      }
    }
  })

  it('gives every exercise a rationale and a source bar', () => {
    const { score, analysis } = setup(BLAKE)
    for (const exercise of generateExercises(analysis, score)) {
      expect(exercise.rationale.length).toBeGreaterThan(10)
      expect(exercise.sourceBar).toBeGreaterThan(0)
    }
  })

  it('respects maxFindings', () => {
    const { score, analysis } = setup(BLAKE)
    const exercises = generateExercises(analysis, score, { maxFindings: 1 })
    expect(new Set(exercises.map((e) => e.findingId)).size).toBeLessThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/generate/index.test.ts`
Expected: FAIL — cannot resolve `./index.ts`.

- [ ] **Step 3: Implement `src/generate/index.ts`**

```ts
import type { Score } from '../core/types.ts'
import type { Analysis } from '../analyse/index.ts'
import { throughCycleOfFourths, overChanges } from './transform.ts'
import type { Exercise } from './transform.ts'
import { isValid } from './validity.ts'

export type { Exercise, ExerciseBar } from './transform.ts'

export interface GenerateOptions {
  maxFindings?: number
}

/**
 * Turn the strongest findings into exercises, keeping only those that still
 * contain the vocabulary they claim to drill.
 *
 * Findings without a degree string — target devices and raw recurring interval
 * cells — produce nothing here yet. They are still reported by analyse().
 */
export function generateExercises(
  analysis: Analysis,
  score: Score,
  options: GenerateOptions = {},
): Exercise[] {
  const maxFindings = options.maxFindings ?? 5
  const chords = score.chordTracks[0]?.chords ?? []
  const out: Exercise[] = []

  const candidates = analysis.findings.filter((f) => f.degrees && f.quality).slice(0, maxFindings)

  for (const finding of candidates) {
    const generated = [
      throughCycleOfFourths(finding, score.instrument),
      overChanges(finding, chords, score.instrument),
    ]
    for (const exercise of generated) {
      if (exercise && isValid(exercise, finding)) out.push(exercise)
    }
  }

  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/generate/index.test.ts`
Expected: PASS, 5 tests.

If no exercises are produced from the Blake solo, that is a real failure, not a test problem — the shape detector should find at least one dictionary cell there. Investigate rather than relaxing the assertion.

- [ ] **Step 5: Commit**

```bash
git add src/generate/index.ts src/generate/index.test.ts
git commit -m "feat: assemble validated exercises from the strongest findings"
```

---

### Task 10: MusicXML export

**Files:**
- Create: `src/render/musicxml.ts`
- Test: `src/render/musicxml.test.ts`

**Interfaces:**
- Consumes: `Exercise` from `src/generate/index.ts`; `Instrument`.
- Produces: `exerciseToMusicXml(exercise: Exercise, instrument: Instrument): string`.

Each exercise bar becomes one 4/4 measure: a `<harmony>`, then the cell as **even eighth notes**, then rests to fill the bar. `divisions` is 2, so an eighth is 1 and a quarter is 2.

Even eighths are deliberate: the method books present material that way, and it means we never reproduce a rhythm that may be a transcription artefact.

Pitch spelling prefers flats, which is the jazz convention.

- [ ] **Step 1: Write the failing test `src/render/musicxml.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { exerciseToMusicXml } from './musicxml.ts'
import { instrumentFromTranspose } from '../core/instrument.ts'
import { parseScore } from '../ingest/parseScore.ts'
import type { Exercise } from '../generate/index.ts'

const tenor = instrumentFromTranspose(-2, -1)

const exercise: Exercise = {
  id: 'f1-cycle',
  title: 'digital pattern 1235 through the cycle of fourths',
  findingId: 'f1',
  findingName: 'digital pattern 1235',
  transformation: 'cycle-of-fourths',
  bars: [
    { rootPc: 0, quality: 'major-seventh', midis: [60, 62, 64, 67] },
    { rootPc: 5, quality: 'major-seventh', midis: [65, 67, 69, 72] },
  ],
  sourceBar: 73,
  rationale: 'test rationale',
}

describe('exerciseToMusicXml', () => {
  it('produces XML our own parser can read back', () => {
    const xml = exerciseToMusicXml(exercise, tenor)
    const score = parseScore(xml)
    expect(score.barCount).toBe(2)
    expect(score.notes.map((n) => n.midi)).toEqual([60, 62, 64, 67, 65, 67, 69, 72])
  })

  it('carries the instrument transposition through', () => {
    const score = parseScore(exerciseToMusicXml(exercise, tenor))
    expect(score.instrument.name).toBe('Bb tenor saxophone')
  })

  it('writes a harmony element per bar', () => {
    const xml = exerciseToMusicXml(exercise, tenor)
    expect((xml.match(/<harmony/g) ?? [])).toHaveLength(2)
  })

  it('writes the cell as eighth notes', () => {
    const xml = exerciseToMusicXml(exercise, tenor)
    expect(xml).toContain('<type>eighth</type>')
  })

  it('includes the title so the file is identifiable in MuseScore', () => {
    expect(exerciseToMusicXml(exercise, tenor)).toContain('digital pattern 1235')
  })

  it('spells black keys as flats', () => {
    const flat: Exercise = {
      ...exercise,
      bars: [{ rootPc: 10, quality: 'dominant', midis: [70, 72, 74, 77] }],
    }
    const xml = exerciseToMusicXml(flat, tenor)
    expect(xml).toMatch(/<step>B<\/step>\s*<alter>-1<\/alter>/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/render/musicxml.test.ts`
Expected: FAIL — cannot resolve `./musicxml.ts`.

- [ ] **Step 3: Implement `src/render/musicxml.ts`**

Structure to emit, per bar: `<attributes>` only in bar 1 (divisions 2, key 0, time 4/4, treble clef, transpose), then `<harmony>`, then four `<note>` eighths, then rests filling the remaining beats.

Quality to MusicXML `<kind>` is the inverse of the ingest table: `major-seventh` -> `major-seventh`, `minor-seventh` -> `minor-seventh`, `dominant` -> `dominant`, and so on; use the `Quality` value directly where it is already a valid MusicXML kind, and map `unknown` to `major`.

Pitch spelling from a MIDI number, flats preferred:

```ts
const SPELLING: [string, number][] = [
  ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
  ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
]
```

Escape `&`, `<` and `>` in the title before interpolating it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/render/musicxml.test.ts`
Expected: PASS, 6 tests.

The first test is the important one: it round-trips through the project's own parser, so the output is provably readable rather than merely well-formed.

- [ ] **Step 5: Commit**

```bash
git add src/render/musicxml.ts src/render/musicxml.test.ts
git commit -m "feat: export exercises as MusicXML that round-trips through our parser"
```

---

### Task 11: The pipeline entry point and view model

**Files:**
- Modify: `src/index.ts` (export the new surface)
- Create: `src/pipeline.ts`
- Test: `src/pipeline.test.ts`

**Interfaces:**
- Produces:

```ts
export interface FindingView {
  id: string
  name: string
  location: string        // e.g. "bar 73, beat 3" or "bars 73, 77"
  occurrences: number
  confidence: number
  confidenceLabel: 'strong' | 'moderate' | 'weak'
  detectedBy: string[]
}
export interface PipelineResult {
  score: Score
  report: CleanupReport
  analysis: Analysis
  exercises: Exercise[]
  findingViews: FindingView[]
}
export function run(bytes: Uint8Array): PipelineResult
export function describeFinding(finding: Finding): FindingView
```

`describeFinding` is a pure function so the page's list can be tested without a DOM. Confidence labels: `>= 0.7` strong, `>= 0.45` moderate, below that weak.

- [ ] **Step 1: Write the failing test `src/pipeline.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { run, describeFinding } from './pipeline.ts'
import type { Finding } from './analyse/index.ts'

const BLAKE = '/Users/michaelkourkov/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl'

const finding = (over: Partial<Finding> = {}): Finding => ({
  id: 'f1',
  kind: 'cell',
  name: 'digital pattern 1235',
  spans: [{ startIndex: 0, endIndex: 3, bar: 73, beat: 2 }],
  degrees: ['1', '2', '3', '5'],
  detectedBy: ['shape'],
  confidence: 0.8,
  ...over,
})

describe('describeFinding', () => {
  it('describes a single occurrence with its bar and beat', () => {
    const view = describeFinding(finding())
    expect(view.location).toBe('bar 73, beat 3')
    expect(view.occurrences).toBe(1)
    expect(view.confidenceLabel).toBe('strong')
  })

  it('lists the bars when a finding recurs', () => {
    const view = describeFinding(finding({
      spans: [
        { startIndex: 0, endIndex: 3, bar: 73, beat: 2 },
        { startIndex: 40, endIndex: 43, bar: 77, beat: 0 },
      ],
    }))
    expect(view.location).toBe('bars 73, 77')
    expect(view.occurrences).toBe(2)
  })

  it('labels confidence bands', () => {
    expect(describeFinding(finding({ confidence: 0.7 })).confidenceLabel).toBe('strong')
    expect(describeFinding(finding({ confidence: 0.5 })).confidenceLabel).toBe('moderate')
    expect(describeFinding(finding({ confidence: 0.2 })).confidenceLabel).toBe('weak')
  })
})

describe('run', () => {
  it('runs the whole pipeline over a real solo', () => {
    const result = run(new Uint8Array(readFileSync(BLAKE)))
    expect(result.score.notes.length).toBeGreaterThan(0)
    expect(result.report.form?.periodBars).toBe(56)
    expect(result.findingViews.length).toBe(result.analysis.findings.length)
  })

  it('runs over every fixture without throwing, except the repeats one', () => {
    const names = [
      'minimal-tenor', 'kind-text-trap', 'words-chords-alto', 'unmarked-pickup',
      'two-soloists', 'form-8bar-x3', 'transposing-form', 'altissimo-tenor',
      'transcriber-notes', 'ties-tuplets-div24',
    ]
    for (const name of names) {
      expect(() => run(new Uint8Array(readFileSync(`fixtures/${name}.musicxml`)))).not.toThrow()
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pipeline.test.ts`
Expected: FAIL — cannot resolve `./pipeline.ts`.

- [ ] **Step 3: Implement `src/pipeline.ts`**

```ts
import type { Score } from './core/types.ts'
import { ingest } from './ingest/index.ts'
import { prepare } from './prepare/index.ts'
import type { CleanupReport } from './prepare/index.ts'
import { analyse } from './analyse/index.ts'
import type { Analysis, Finding } from './analyse/index.ts'
import { generateExercises } from './generate/index.ts'
import type { Exercise } from './generate/index.ts'

export interface FindingView {
  id: string
  name: string
  location: string
  occurrences: number
  confidence: number
  confidenceLabel: 'strong' | 'moderate' | 'weak'
  detectedBy: string[]
}

export interface PipelineResult {
  score: Score
  report: CleanupReport
  analysis: Analysis
  exercises: Exercise[]
  findingViews: FindingView[]
}

const STRONG = 0.7
const MODERATE = 0.45

/** Pure, so the page's list can be tested without a DOM. */
export function describeFinding(finding: Finding): FindingView {
  const bars = finding.spans.map((s) => s.bar)
  const location =
    bars.length === 1
      // Beats are 0-based internally and 1-based for a reader.
      ? `bar ${bars[0]}, beat ${finding.spans[0].beat + 1}`
      : `bars ${bars.join(', ')}`

  const confidenceLabel =
    finding.confidence >= STRONG ? 'strong'
      : finding.confidence >= MODERATE ? 'moderate'
        : 'weak'

  return {
    id: finding.id,
    name: finding.name,
    location,
    occurrences: finding.spans.length,
    confidence: finding.confidence,
    confidenceLabel,
    detectedBy: finding.detectedBy,
  }
}

/** Ingest, clean up, analyse and generate, in one call. */
export function run(bytes: Uint8Array): PipelineResult {
  const score = ingest(bytes)
  const report = prepare(score)
  const analysis = analyse(score, report)
  const exercises = generateExercises(analysis, score)

  return {
    score,
    report,
    analysis,
    exercises,
    findingViews: analysis.findings.map(describeFinding),
  }
}
```

- [ ] **Step 4: Extend `src/index.ts`**

Add exports for `run`, `describeFinding`, `analyse`, `generateExercises`, `exerciseToMusicXml`, and the `Finding`, `Analysis`, `Exercise`, `FindingView`, `PipelineResult` types.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm run test:run && npm run typecheck`
Expected: everything passes.

- [ ] **Step 6: Commit**

```bash
git add src/pipeline.ts src/pipeline.test.ts src/index.ts
git commit -m "feat: add the end-to-end pipeline and finding view model"
```

---

### Task 12: The web page

**Files:**
- Create: `index.html`, `app/main.ts`, `app/style.css`, `vite.config.ts`
- Modify: `package.json` (add `vite`, `opensheetmusicdisplay`, and `dev` / `build` scripts)

**Interfaces:**
- Consumes: `run`, `exerciseToMusicXml` from `src/pipeline.ts` and `src/render/musicxml.ts`.
- Produces: a working page. No new library exports.

What the page does, and nothing more:

1. A file input and a drop zone accepting `.mxl` and `.musicxml`.
2. On load, call `run()` and render:
   - a header line: instrument, bar count, detected form, and the soloist regions;
   - any **blocking** cleanup adjustment as a prominent notice — if the file has two soloists, say so rather than analysing the wrong one;
   - other adjustments in a collapsed list;
   - the findings, each showing name, location, confidence label, and which detectors agreed;
   - the exercises, each with its title, rationale, notation rendered by OpenSheetMusicDisplay, and a **Download MusicXML** button.
3. Errors — including `UnsupportedScoreError` for a file with repeats — are shown as readable text, not thrown into the console.

Requirements:
- `package.json` gains `"dev": "vite"`, `"build": "tsc --noEmit && vite build"`, and dependencies `vite` and `opensheetmusicdisplay`.
- `vite.config.ts` must not clash with `vitest.config.ts`; keep them separate files.
- OSMD renders into a `div` per exercise; call `load()` then `render()`.
- Downloads use a `Blob` and an object URL, revoked after the click.
- Keep the styling minimal but readable: a system font stack, a max-width column, adequate spacing. No framework.

- [ ] **Step 1: Add the dependencies**

Run: `npm install vite opensheetmusicdisplay`
Then add the `dev` and `build` scripts to `package.json`.

- [ ] **Step 2: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: { outDir: 'dist' },
})
```

- [ ] **Step 3: Create `index.html`, `app/style.css` and `app/main.ts`**

Build the page as described above. Keep all DOM code in `app/`; import only from `src/`.

- [ ] **Step 4: Verify it builds and the engine still passes**

Run: `npm run build && npm run test:run`
Expected: the build succeeds and every test still passes.

- [ ] **Step 5: Verify the page actually works**

Run `npm run dev`, open the printed URL, and load
`/Users/michaelkourkov/Documents/MuseScore4/Scores/Hey Lock! - Seamus Blake Solo Transcription.mxl`.

Confirm by looking at the page: the header reports a B♭ tenor saxophone and a 56-bar form; at least one finding is listed; at least one exercise renders as notation; the download button produces a `.musicxml` file.

Do not report this step complete without having loaded the page and seen those things.

- [ ] **Step 6: Commit**

```bash
git add index.html app vite.config.ts package.json package-lock.json
git commit -m "feat: add a web page for dropping in a solo and getting exercises"
```

---

## Done when

- `npm run test:run` passes every test.
- `npm run typecheck` is clean.
- `npm run build` succeeds.
- `src/` contains no DOM reference; all DOM code lives in `app/`.
- Loading the Blake transcription in the browser shows the form, at least one finding, and at least one exercise rendered as notation with a working download.
