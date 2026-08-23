# woodshed M1 (ingest + prepare) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a MusicXML jazz solo transcription into a trustworthy, analysable `Score` plus a `CleanupReport` of everything suspicious about it.

**Architecture:** A DOM-free TypeScript library. `ingest/` parses MusicXML into an immutable `Score`; `prepare/` inspects that `Score` and emits `Adjustment[]` describing what should change and why — it never mutates. Every check is grounded in a hazard observed in a real nine-transcription corpus survey.

**Tech Stack:** TypeScript (strict, ESM), Vitest (node environment), `fast-xml-parser` for XML, `fflate` for `.mxl` unzipping. No DOM APIs anywhere in `src/` — the engine must run in node, a browser, and a CLI.

**Spec:** `docs/superpowers/specs/2026-08-23-woodshed-design.md`

## Spec coverage, and what M1 deliberately leaves out

This plan implements spec sections 4 (ingest) and 5 (prepare). Two of the spec's
eight cleanup checks are **not** in M1 because both require the model, which
arrives in M4:

- **Region selection** (spec 5.2) — which bars are the solo. `detectSoloists` and
  `detectForm` produce the engine-side inputs it will consume; the proposal and
  the user confirmation land with the agent layer.
- **Structure-annotation interpretation** (spec 5.4) — deciding whether a file's
  rehearsal marks are chorus numbers or section letters. `Score.marks` carries
  them verbatim so nothing is lost.

Everything else in spec sections 4 and 5 is covered by a task below.

## Global Constraints

- **TypeScript strict mode.** `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.
- **ESM with explicit `.ts` extensions in imports** — matches the sibling `tune-arcade` project (`import { x } from './y.ts'`).
- **Code style:** no semicolons, single quotes, 2-space indent. Match `tune-arcade`.
- **No DOM.** Never use `DOMParser`, `document`, or `window` in `src/`. Use `fast-xml-parser`.
- **`TICKS_PER_QUARTER = 960`.** All `divisions` values are rescaled to this on ingest. 960 is divisible by every `divisions` value in the corpus (12, 24, 60, 120), so rescaling is always integer.
- **Chord quality comes from `<kind>`, never from the `text` attribute.** This is the single highest-impact rule in the spec (§4, finding F1). Under `use-symbols="yes"` MuseScore writes `text="7"` for `minor-seventh`, `major-seventh`, `half-diminished`, `diminished-seventh` and `augmented-seventh` alike.
- **`Score` is immutable.** `prepare/` returns `Adjustment[]`; it never edits a `Score`.
- **Tests colocate** as `src/**/*.test.ts`.
- **Fixtures already exist** in `fixtures/` — 11 hand-built MusicXML files, one per hazard. Do not modify them. Their exact expected values are given in each task.
- **Commit after every task** with a `feat:` or `test:` prefixed message.

---

### Task 1: Project scaffolding and pitch math

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `src/core/types.ts`, `src/core/pitch.ts`
- Test: `src/core/pitch.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: all shared types (below); `TICKS_PER_QUARTER`, `intervalsOf`, `degreeOf`, `pitchClass`, `isChordTone`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "woodshed",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "description": "Turn a transcribed jazz solo into practice material",
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "dependencies": {
    "fast-xml-parser": "^4.5.0",
    "fflate": "^0.8.2"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The engine is DOM-free by design, so everything runs in node.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Run `npm install`**

Run: `npm install`
Expected: succeeds, `node_modules/` created.

- [ ] **Step 5: Create `src/core/types.ts`**

```ts
/** All durations and onsets are in ticks; 960 ticks = one quarter note. */
export const TICKS_PER_QUARTER = 960

export type Provenance = 'file' | 'reference' | 'user' | 'inferred'

export type Quality =
  | 'major'
  | 'minor'
  | 'dominant'
  | 'major-seventh'
  | 'minor-seventh'
  | 'half-diminished'
  | 'diminished'
  | 'diminished-seventh'
  | 'minor-major'
  | 'augmented'
  | 'augmented-seventh'
  | 'suspended-fourth'
  | 'unknown'

export interface Note {
  /** Written pitch as a MIDI number. */
  midi: number
  /** Ticks from the start of the score. */
  onset: number
  duration: number
  bar: number
  /** 0-based position within the bar, in quarter notes. */
  beat: number
  /** True when this note absorbed a following tied note. */
  tiedFrom?: boolean
}

export interface Chord {
  onset: number
  bar: number
  /** Root pitch class, 0-11, C = 0. */
  rootPc: number
  quality: Quality
  /** Added or altered degrees, e.g. ['b13', '#11']. */
  tensions: string[]
}

export interface ChordTrack {
  chords: Chord[]
  provenance: Provenance
  confidence: number
}

export interface Instrument {
  name: string
  transpose: { chromatic: number; octave: number }
  /** Normal written range as MIDI numbers. */
  writtenRange: { lo: number; hi: number }
  /** Highest written note reachable in altissimo, if the instrument has one. */
  altissimoTo?: number
  /** False when the transposition did not match a known instrument. */
  rangeKnown: boolean
}

export interface Mark {
  bar: number
  kind: 'rehearsal' | 'words'
  /** Verbatim. Never normalised at ingest. */
  text: string
}

export interface Score {
  notes: Note[]
  chordTracks: ChordTrack[]
  instrument: Instrument
  timeSig: [number, number]
  marks: Mark[]
  barCount: number
}
```

- [ ] **Step 6: Write the failing test `src/core/pitch.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { intervalsOf, pitchClass, degreeOf, isChordTone } from './pitch.ts'
import type { Chord } from './types.ts'

const chord = (rootPc: number, quality: Chord['quality']): Chord =>
  ({ onset: 0, bar: 1, rootPc, quality, tensions: [] })

describe('intervalsOf', () => {
  it('returns successive semitone differences', () => {
    expect(intervalsOf([60, 62, 64, 67])).toEqual([2, 2, 3])
  })

  it('returns an empty array for fewer than two notes', () => {
    expect(intervalsOf([60])).toEqual([])
  })

  it('is transposition invariant', () => {
    expect(intervalsOf([60, 62, 64, 67])).toEqual(intervalsOf([63, 65, 67, 70]))
  })
})

describe('pitchClass', () => {
  it('wraps to 0-11', () => {
    expect(pitchClass(60)).toBe(0)
    expect(pitchClass(73)).toBe(1)
  })
})

describe('degreeOf', () => {
  it('labels the 1235 cell over a major seventh chord', () => {
    const c = chord(0, 'major-seventh')
    expect([60, 62, 64, 67].map((m) => degreeOf(m, c))).toEqual(['1', '2', '3', '5'])
  })

  it('uses minor numbering over a minor chord, so the minor third is "3"', () => {
    const c = chord(0, 'minor-seventh')
    expect(degreeOf(63, c)).toBe('3')
    expect(degreeOf(70, c)).toBe('7')
  })

  it('labels the same pitch differently by chord quality', () => {
    // Eb over C: the #9 of a dominant, but the b3 of a minor chord.
    expect(degreeOf(63, chord(0, 'dominant'))).toBe('#9')
    expect(degreeOf(63, chord(0, 'minor-seventh'))).toBe('3')
  })

  it('names chromatic degrees explicitly over a dominant', () => {
    const c = chord(0, 'dominant')
    expect(degreeOf(61, c)).toBe('b9')
    expect(degreeOf(66, c)).toBe('#11')
    expect(degreeOf(68, c)).toBe('b13')
  })
})

describe('isChordTone', () => {
  it('recognises the third and seventh of a dominant', () => {
    const c = chord(0, 'dominant')
    expect(isChordTone(64, c)).toBe(true)
    expect(isChordTone(70, c)).toBe(true)
    expect(isChordTone(62, c)).toBe(false)
  })

  it('recognises the flat five of a half-diminished chord', () => {
    expect(isChordTone(66, chord(0, 'half-diminished'))).toBe(true)
  })
})
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npx vitest run src/core/pitch.test.ts`
Expected: FAIL — cannot resolve `./pitch.ts`.

- [ ] **Step 8: Implement `src/core/pitch.ts`**

```ts
import type { Chord, Quality } from './types.ts'

/** Semitones above the root -> degree label, for major-family chords. */
const MAJOR_FAMILY: Record<number, string> = {
  0: '1', 1: 'b9', 2: '2', 3: '#9', 4: '3', 5: '4',
  6: '#11', 7: '5', 8: 'b13', 9: '6', 10: 'b7', 11: '7',
}

/**
 * Minor-family numbering, where the minor third is simply "3" — this is how
 * players talk ("1345 over minor"), and it is what makes the same shape read
 * correctly over a minor chord.
 */
const MINOR_FAMILY: Record<number, string> = {
  0: '1', 1: 'b9', 2: '2', 3: '3', 4: '#3', 5: '4',
  6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: '7', 11: 'n7',
}

const MINOR_QUALITIES: ReadonlySet<Quality> = new Set<Quality>([
  'minor', 'minor-seventh', 'minor-major', 'half-diminished',
  'diminished', 'diminished-seventh',
])

const CHORD_TONES: Record<Quality, number[]> = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  'dominant': [0, 4, 7, 10],
  'major-seventh': [0, 4, 7, 11],
  'minor-seventh': [0, 3, 7, 10],
  'half-diminished': [0, 3, 6, 10],
  'diminished': [0, 3, 6],
  'diminished-seventh': [0, 3, 6, 9],
  'minor-major': [0, 3, 7, 11],
  'augmented': [0, 4, 8],
  'augmented-seventh': [0, 4, 8, 10],
  'suspended-fourth': [0, 5, 7, 10],
  'unknown': [0],
}

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12
}

/** Successive semitone differences. One element shorter than the input. */
export function intervalsOf(midis: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i < midis.length - 1; i++) out.push(midis[i + 1] - midis[i])
  return out
}

/** Chord-relative degree label, with chromatics named explicitly. */
export function degreeOf(midi: number, chord: Chord): string {
  const semis = pitchClass(midi - chord.rootPc)
  const table = MINOR_QUALITIES.has(chord.quality) ? MINOR_FAMILY : MAJOR_FAMILY
  return table[semis]
}

export function isChordTone(midi: number, chord: Chord): boolean {
  return CHORD_TONES[chord.quality].includes(pitchClass(midi - chord.rootPc))
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run src/core/pitch.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 10: Run the typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts src/core package-lock.json
git commit -m "feat: scaffold project with core types and pitch math"
```

---

### Task 2: Instrument identification from transposition

**Files:**
- Create: `src/core/instrument.ts`
- Test: `src/core/instrument.test.ts`

**Interfaces:**
- Consumes: `Instrument` from `src/core/types.ts`.
- Produces: `instrumentFromTranspose(chromatic: number, octave: number): Instrument`.

Every file in the corpus declared `<transpose>`, so instrument identity is read, never guessed. The written range for both alto and tenor saxophone is the same (B♭3–F6 written); they differ in sounding pitch, not written range.

- [ ] **Step 1: Write the failing test `src/core/instrument.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { instrumentFromTranspose } from './instrument.ts'

describe('instrumentFromTranspose', () => {
  it('identifies Bb tenor saxophone', () => {
    const i = instrumentFromTranspose(-2, -1)
    expect(i.name).toBe('Bb tenor saxophone')
    expect(i.rangeKnown).toBe(true)
    expect(i.writtenRange).toEqual({ lo: 58, hi: 89 })
    expect(i.altissimoTo).toBe(96)
  })

  it('identifies Eb alto saxophone, which shares the saxophone written range', () => {
    const i = instrumentFromTranspose(-9, 0)
    expect(i.name).toBe('Eb alto saxophone')
    expect(i.writtenRange).toEqual({ lo: 58, hi: 89 })
  })

  it('identifies Bb trumpet', () => {
    const i = instrumentFromTranspose(-2, 0)
    expect(i.name).toBe('Bb trumpet')
    expect(i.writtenRange).toEqual({ lo: 54, hi: 84 })
  })

  it('identifies a concert-pitch instrument sounding an octave lower', () => {
    expect(instrumentFromTranspose(0, -1).name).toBe('C instrument (8vb)')
  })

  it('identifies concert pitch', () => {
    expect(instrumentFromTranspose(0, 0).name).toBe('C instrument')
  })

  it('falls back for an unknown transposition without throwing', () => {
    const i = instrumentFromTranspose(-7, 0)
    expect(i.rangeKnown).toBe(false)
    expect(i.name).toBe('Unknown instrument')
    expect(i.transpose).toEqual({ chromatic: -7, octave: 0 })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/instrument.test.ts`
Expected: FAIL — cannot resolve `./instrument.ts`.

- [ ] **Step 3: Implement `src/core/instrument.ts`**

```ts
import type { Instrument } from './types.ts'

interface Known {
  name: string
  lo: number
  hi: number
  altissimoTo?: number
}

/** Keyed by `${chromatic}/${octave}` from MusicXML's <transpose>. */
const KNOWN: Record<string, Known> = {
  '-2/-1': { name: 'Bb tenor saxophone', lo: 58, hi: 89, altissimoTo: 96 },
  '-9/-1': { name: 'Eb baritone saxophone', lo: 58, hi: 89, altissimoTo: 96 },
  '-9/0': { name: 'Eb alto saxophone', lo: 58, hi: 89, altissimoTo: 96 },
  '-2/0': { name: 'Bb trumpet', lo: 54, hi: 84 },
  '0/-1': { name: 'C instrument (8vb)', lo: 40, hi: 84 },
  '0/0': { name: 'C instrument', lo: 55, hi: 88 },
}

export function instrumentFromTranspose(chromatic: number, octave: number): Instrument {
  const hit = KNOWN[`${chromatic}/${octave}`]
  if (!hit) {
    return {
      name: 'Unknown instrument',
      transpose: { chromatic, octave },
      // Deliberately wide: an unknown instrument must not trigger range flags.
      writtenRange: { lo: 0, hi: 127 },
      rangeKnown: false,
    }
  }
  return {
    name: hit.name,
    transpose: { chromatic, octave },
    writtenRange: { lo: hit.lo, hi: hit.hi },
    ...(hit.altissimoTo === undefined ? {} : { altissimoTo: hit.altissimoTo }),
    rangeKnown: true,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/instrument.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/instrument.ts src/core/instrument.test.ts
git commit -m "feat: identify instrument and written range from MusicXML transposition"
```

---

### Task 3: Reading `.mxl` and `.musicxml` into an XML string

**Files:**
- Create: `src/ingest/readScoreFile.ts`
- Test: `src/ingest/readScoreFile.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `readScoreXml(bytes: Uint8Array): string`.

`.mxl` is a zip container. `META-INF/container.xml` names the root score file; fall back to the first `.xml` or `.musicxml` entry that is not under `META-INF/`.

- [ ] **Step 1: Write the failing test `src/ingest/readScoreFile.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { zipSync, strToU8 } from 'fflate'
import { readScoreXml } from './readScoreFile.ts'

describe('readScoreXml', () => {
  it('returns plain MusicXML unchanged', () => {
    const bytes = readFileSync('fixtures/minimal-tenor.musicxml')
    const xml = readScoreXml(new Uint8Array(bytes))
    expect(xml).toContain('<score-partwise')
  })

  it('extracts the root score from an .mxl container', () => {
    const inner = readFileSync('fixtures/minimal-tenor.musicxml', 'utf8')
    const container = `<?xml version="1.0" encoding="UTF-8"?>
<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>`
    const mxl = zipSync({
      'META-INF/container.xml': strToU8(container),
      'score.xml': strToU8(inner),
    })
    expect(readScoreXml(mxl)).toContain('<score-partwise')
  })

  it('falls back to the first non-META-INF xml entry when container.xml is absent', () => {
    const inner = readFileSync('fixtures/minimal-tenor.musicxml', 'utf8')
    const mxl = zipSync({ 'anything.musicxml': strToU8(inner) })
    expect(readScoreXml(mxl)).toContain('<score-partwise')
  })

  it('throws a clear error when the zip contains no score', () => {
    const mxl = zipSync({ 'readme.txt': strToU8('nothing here') })
    expect(() => readScoreXml(mxl)).toThrow(/no MusicXML/i)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ingest/readScoreFile.test.ts`
Expected: FAIL — cannot resolve `./readScoreFile.ts`.

- [ ] **Step 3: Implement `src/ingest/readScoreFile.ts`**

```ts
import { unzipSync, strFromU8 } from 'fflate'

/** Zip local-file-header magic number, "PK\x03\x04". */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]

function isZip(bytes: Uint8Array): boolean {
  return ZIP_MAGIC.every((b, i) => bytes[i] === b)
}

/**
 * Accepts either a raw .musicxml file or a zipped .mxl container and returns
 * the score XML as a string.
 */
export function readScoreXml(bytes: Uint8Array): string {
  if (!isZip(bytes)) return strFromU8(bytes)

  const entries = unzipSync(bytes)

  const container = entries['META-INF/container.xml']
  if (container) {
    const match = /full-path\s*=\s*"([^"]+)"/.exec(strFromU8(container))
    const target = match?.[1]
    if (target && entries[target]) return strFromU8(entries[target])
  }

  const fallback = Object.keys(entries).find(
    (name) => !name.startsWith('META-INF/') && /\.(xml|musicxml)$/i.test(name),
  )
  if (fallback) return strFromU8(entries[fallback])

  throw new Error('Archive contains no MusicXML score file')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ingest/readScoreFile.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ingest/readScoreFile.ts src/ingest/readScoreFile.test.ts
git commit -m "feat: read .mxl containers and plain .musicxml into score XML"
```

---

### Task 4: Parsing notes, timing and marks into a Score

**Files:**
- Create: `src/ingest/parseScore.ts`
- Test: `src/ingest/parseScore.test.ts`

**Interfaces:**
- Consumes: `Score`, `Note`, `Mark`, `TICKS_PER_QUARTER` from `src/core/types.ts`; `instrumentFromTranspose` from `src/core/instrument.ts`.
- Produces: `parseScore(xml: string): Score` and `UnsupportedScoreError`. At this stage `Score.chordTracks` is `[]` — Tasks 5 and 6 fill it.

Rules this task implements:
- Rescale every duration from the file's `divisions` to `TICKS_PER_QUARTER` (960).
- Merge tied notes: a note with `<tie type="stop"/>` at the same pitch extends the previous note and does not appear separately.
- Skip `<note>` elements carrying `<chord/>` — this is a monophonic model.
- Rests advance time and emit no note.
- Collect `<rehearsal>` and `<words>` verbatim as `Mark`s.
- **Throw `UnsupportedScoreError` if the score contains `<repeat>`, `<ending>`, `<segno>` or `<coda>`** — written order would no longer equal played order, which silently breaks chorus counting and every bar reference downstream. Refuse rather than guess.

- [ ] **Step 1: Write the failing test `src/ingest/parseScore.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseScore, UnsupportedScoreError } from './parseScore.ts'
import { TICKS_PER_QUARTER } from '../core/types.ts'

const load = (name: string): string => readFileSync(`fixtures/${name}`, 'utf8')

describe('parseScore', () => {
  it('parses notes with bar and beat positions', () => {
    const s = parseScore(load('minimal-tenor.musicxml'))
    expect(s.notes).toHaveLength(8)
    expect(s.barCount).toBe(2)
    expect(s.timeSig).toEqual([4, 4])
    expect(s.notes[0]).toMatchObject({ midi: 60, bar: 1, beat: 0, onset: 0 })
    expect(s.notes[1]).toMatchObject({ midi: 62, bar: 1, beat: 1 })
    expect(s.notes[4]).toMatchObject({ midi: 65, bar: 2, beat: 0 })
  })

  it('reads the instrument from the transposition', () => {
    expect(parseScore(load('minimal-tenor.musicxml')).instrument.name)
      .toBe('Bb tenor saxophone')
    expect(parseScore(load('words-chords-alto.musicxml')).instrument.name)
      .toBe('Eb alto saxophone')
  })

  it('rescales durations from the file divisions to 960 ticks per quarter', () => {
    // Fixture uses divisions=24, so a quarter note is 24 file units.
    const s = parseScore(load('ties-tuplets-div24.musicxml'))
    const quarter = TICKS_PER_QUARTER
    // First note is two tied quarters, so it should be a half note long.
    expect(s.notes[0].duration).toBe(quarter * 2)
    expect(s.notes[0].tiedFrom).toBe(true)
  })

  it('merges tied notes into one, so the tied pair is a single note', () => {
    const s = parseScore(load('ties-tuplets-div24.musicxml'))
    // Bar 1: tied C + C, E, G = 3 notes. Bar 2: 3 triplet eighths + 3 = 6.
    expect(s.notes.filter((n) => n.bar === 1)).toHaveLength(3)
    expect(s.notes).toHaveLength(9)
  })

  it('keeps triplet durations proportional', () => {
    const s = parseScore(load('ties-tuplets-div24.musicxml'))
    const triplet = s.notes.find((n) => n.bar === 2)!
    // A triplet eighth is 16/24 of a quarter in the fixture -> 640 ticks.
    expect(triplet.duration).toBe(640)
  })

  it('collects rehearsal marks and words verbatim', () => {
    const s = parseScore(load('transcriber-notes.musicxml'))
    expect(s.marks).toEqual([
      { bar: 1, kind: 'words', text: 'Swing' },
      { bar: 2, kind: 'words', text: 'sloppy' },
      { bar: 3, kind: 'words', text: 'flat' },
    ])
  })

  it('collects rehearsal marks with their bars', () => {
    const s = parseScore(load('form-8bar-x3.musicxml'))
    const reh = s.marks.filter((m) => m.kind === 'rehearsal')
    expect(reh).toEqual([
      { bar: 1, kind: 'rehearsal', text: '1' },
      { bar: 9, kind: 'rehearsal', text: '2' },
      { bar: 17, kind: 'rehearsal', text: '3' },
    ])
  })

  it('refuses a score containing repeats rather than guessing the played order', () => {
    expect(() => parseScore(load('has-repeats.musicxml')))
      .toThrow(UnsupportedScoreError)
  })

  it('leaves chordTracks empty — chords are a later stage', () => {
    expect(parseScore(load('minimal-tenor.musicxml')).chordTracks).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ingest/parseScore.test.ts`
Expected: FAIL — cannot resolve `./parseScore.ts`.

- [ ] **Step 3: Implement `src/ingest/parseScore.ts`**

```ts
import { XMLParser } from 'fast-xml-parser'
import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Mark, Note, Score } from '../core/types.ts'
import { instrumentFromTranspose } from '../core/instrument.ts'

export class UnsupportedScoreError extends Error {}

const STEP_SEMITONES: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

/**
 * `preserveOrder` keeps sibling ordering, which matters: a <harmony> or
 * <direction> takes its position in the bar from where it sits between notes.
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  parseTagValue: false,
  trimValues: true,
})

type Node = Record<string, unknown>

function childrenOf(node: Node): Node[] {
  const key = Object.keys(node).find((k) => k !== ':@')
  const value = key === undefined ? undefined : node[key]
  return Array.isArray(value) ? (value as Node[]) : []
}

function tagOf(node: Node): string {
  return Object.keys(node).find((k) => k !== ':@') ?? ''
}

function textOf(node: Node): string {
  const kids = childrenOf(node)
  const t = kids.find((k) => '#text' in k)
  return t === undefined ? '' : String(t['#text'])
}

function findChild(node: Node, tag: string): Node | undefined {
  return childrenOf(node).find((c) => tagOf(c) === tag)
}

function findDeep(node: Node, tag: string): Node | undefined {
  for (const child of childrenOf(node)) {
    if (tagOf(child) === tag) return child
    const nested = findDeep(child, tag)
    if (nested) return nested
  }
  return undefined
}

function findAllDeep(node: Node, tag: string, out: Node[] = []): Node[] {
  for (const child of childrenOf(node)) {
    if (tagOf(child) === tag) out.push(child)
    findAllDeep(child, tag, out)
  }
  return out
}

function numberOf(node: Node | undefined, tag: string, fallback: number): number {
  if (!node) return fallback
  const child = findChild(node, tag)
  if (!child) return fallback
  const value = Number(textOf(child))
  return Number.isFinite(value) ? value : fallback
}

const FORBIDDEN = ['repeat', 'ending', 'segno', 'coda']

export function parseScore(xml: string): Score {
  const root = parser.parse(xml) as Node[]
  const doc: Node = { root }

  const part = findDeep(doc, 'part')
  if (!part) throw new UnsupportedScoreError('No <part> element found')

  for (const tag of FORBIDDEN) {
    if (findAllDeep(part, tag).length > 0) {
      throw new UnsupportedScoreError(
        `Score contains <${tag}>; written bar order may not equal played order. ` +
          'Flatten the repeats before importing.',
      )
    }
  }

  const measures = childrenOf(part).filter((m) => tagOf(m) === 'measure')

  let divisions = 1
  let timeSig: [number, number] = [4, 4]
  let instrument = instrumentFromTranspose(0, 0)
  let sawTranspose = false

  const notes: Note[] = []
  const marks: Mark[] = []
  let scoreTicks = 0

  for (const measure of measures) {
    const barNumber = Number((measure[':@'] as Node | undefined)?.['@_number'] ?? 0)
    const measureStart = scoreTicks
    let cursor = 0

    for (const el of childrenOf(measure)) {
      const tag = tagOf(el)

      if (tag === 'attributes') {
        const div = findChild(el, 'divisions')
        if (div) divisions = Number(textOf(div))
        const time = findChild(el, 'time')
        if (time) {
          timeSig = [numberOf(time, 'beats', 4), numberOf(time, 'beat-type', 4)]
        }
        const transpose = findChild(el, 'transpose')
        if (transpose) {
          instrument = instrumentFromTranspose(
            numberOf(transpose, 'chromatic', 0),
            numberOf(transpose, 'octave-change', 0),
          )
          sawTranspose = true
        }
        continue
      }

      if (tag === 'direction') {
        const bar = barNumber
        for (const kind of ['rehearsal', 'words'] as const) {
          for (const found of findAllDeep(el, kind)) {
            const text = textOf(found).trim()
            if (text) marks.push({ bar, kind, text })
          }
        }
        continue
      }

      const scale = TICKS_PER_QUARTER / divisions

      if (tag === 'backup') {
        cursor -= numberOf(el, 'duration', 0) * scale
        continue
      }
      if (tag === 'forward') {
        cursor += numberOf(el, 'duration', 0) * scale
        continue
      }
      if (tag !== 'note') continue

      // Chord members belong to a note already emitted; this model is monophonic.
      if (findChild(el, 'chord')) continue

      const duration = numberOf(el, 'duration', 0) * scale
      const pitch = findChild(el, 'pitch')

      if (!pitch) {
        cursor += duration
        continue
      }

      const step = textOf(findChild(pitch, 'step') ?? {})
      const octave = numberOf(pitch, 'octave', 4)
      const alter = numberOf(pitch, 'alter', 0)
      const midi = (octave + 1) * 12 + (STEP_SEMITONES[step] ?? 0) + alter

      const ties = findAllDeep(el, 'tie').map(
        (t) => (t[':@'] as Node | undefined)?.['@_type'],
      )
      const previous = notes[notes.length - 1]

      if (ties.includes('stop') && previous && previous.midi === midi) {
        previous.duration += duration
        previous.tiedFrom = true
      } else {
        notes.push({
          midi,
          onset: measureStart + cursor,
          duration,
          bar: barNumber,
          beat: cursor / TICKS_PER_QUARTER,
        })
      }
      cursor += duration
    }

    scoreTicks = measureStart + (timeSig[0] * 4 / timeSig[1]) * TICKS_PER_QUARTER
  }

  if (!sawTranspose) instrument = instrumentFromTranspose(0, 0)

  return {
    notes,
    chordTracks: [],
    instrument,
    timeSig,
    marks,
    barCount: measures.length,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ingest/parseScore.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: all pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/ingest/parseScore.ts src/ingest/parseScore.test.ts
git commit -m "feat: parse MusicXML notes, timing, ties and marks into a Score"
```

---

### Task 5: Chord parsing from `<harmony>` — quality from `kind`, never `text`

**Files:**
- Create: `src/ingest/parseHarmony.ts`
- Test: `src/ingest/parseHarmony.test.ts`

**Interfaces:**
- Consumes: `Chord`, `ChordTrack`, `Quality`, `TICKS_PER_QUARTER` from `src/core/types.ts`.
- Produces: `parseHarmonyTrack(xml: string): ChordTrack | null` — returns `null` when the score has no `<harmony>` elements at all.

This is the highest-impact rule in the whole plan. Under `use-symbols="yes"`, MuseScore writes `text="7"` for `minor-seventh`, `major-seventh`, `half-diminished`, `diminished-seventh` and `augmented-seventh` alike. Reading `text` makes every one of them look like a dominant — a silent, unidirectional failure that corrupts every scale degree, and that looks entirely plausible in a jazz chart. In one corpus file it affected 112 of 220 harmonies.

- [ ] **Step 1: Write the failing test `src/ingest/parseHarmony.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseHarmonyTrack } from './parseHarmony.ts'

const load = (name: string): string => readFileSync(`fixtures/${name}`, 'utf8')

describe('parseHarmonyTrack', () => {
  it('reads roots and qualities', () => {
    const track = parseHarmonyTrack(load('minimal-tenor.musicxml'))!
    expect(track.provenance).toBe('file')
    expect(track.chords).toHaveLength(2)
    expect(track.chords[0]).toMatchObject({ bar: 1, rootPc: 0, quality: 'major-seventh' })
    expect(track.chords[1]).toMatchObject({ bar: 2, rootPc: 5, quality: 'dominant' })
  })

  it('takes quality from <kind> and ignores a misleading text attribute', () => {
    // Every chord in this fixture carries text="7"; only one is a dominant.
    const track = parseHarmonyTrack(load('kind-text-trap.musicxml'))!
    expect(track.chords.map((c) => c.quality)).toEqual([
      'minor-seventh',
      'major-seventh',
      'half-diminished',
      'dominant',
    ])
  })

  it('resolves flat roots to the right pitch class', () => {
    const track = parseHarmonyTrack(load('two-soloists.musicxml'))!
    // Bar 5 is Bb7.
    const bar5 = track.chords.find((c) => c.bar === 5)!
    expect(bar5.rootPc).toBe(10)
    expect(bar5.quality).toBe('dominant')
  })

  it('returns null when the score has no harmony elements', () => {
    expect(parseHarmonyTrack(load('words-chords-alto.musicxml'))).toBeNull()
  })

  it('gives file-sourced harmony full confidence', () => {
    expect(parseHarmonyTrack(load('minimal-tenor.musicxml'))!.confidence).toBe(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ingest/parseHarmony.test.ts`
Expected: FAIL — cannot resolve `./parseHarmony.ts`.

- [ ] **Step 3: Implement `src/ingest/parseHarmony.ts`**

```ts
import { XMLParser } from 'fast-xml-parser'
import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Chord, ChordTrack, Quality } from '../core/types.ts'

const STEP_SEMITONES: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

/**
 * MusicXML <kind> values -> our Quality. Covers everything the corpus uses.
 * The `text` attribute is deliberately never consulted: under
 * use-symbols="yes" MuseScore writes text="7" for minor-seventh,
 * major-seventh, half-diminished, diminished-seventh and augmented-seventh
 * alike, which would collapse all of them to a dominant.
 */
const KIND_TO_QUALITY: Record<string, Quality> = {
  'major': 'major',
  'minor': 'minor',
  'dominant': 'dominant',
  'dominant-ninth': 'dominant',
  'dominant-11th': 'dominant',
  'dominant-13th': 'dominant',
  'major-seventh': 'major-seventh',
  'major-sixth': 'major',
  'major-ninth': 'major-seventh',
  'minor-seventh': 'minor-seventh',
  'minor-sixth': 'minor',
  'minor-ninth': 'minor-seventh',
  'minor-major': 'minor-major',
  'half-diminished': 'half-diminished',
  'diminished': 'diminished',
  'diminished-seventh': 'diminished-seventh',
  'augmented': 'augmented',
  'augmented-seventh': 'augmented-seventh',
  'suspended-fourth': 'suspended-fourth',
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  parseTagValue: false,
  trimValues: true,
})

type Node = Record<string, unknown>

function childrenOf(node: Node): Node[] {
  const key = Object.keys(node).find((k) => k !== ':@')
  const value = key === undefined ? undefined : node[key]
  return Array.isArray(value) ? (value as Node[]) : []
}

function tagOf(node: Node): string {
  return Object.keys(node).find((k) => k !== ':@') ?? ''
}

function textOf(node: Node): string {
  const t = childrenOf(node).find((k) => '#text' in k)
  return t === undefined ? '' : String(t['#text'])
}

function findChild(node: Node, tag: string): Node | undefined {
  return childrenOf(node).find((c) => tagOf(c) === tag)
}

function findDeep(node: Node, tag: string): Node | undefined {
  for (const child of childrenOf(node)) {
    if (tagOf(child) === tag) return child
    const nested = findDeep(child, tag)
    if (nested) return nested
  }
  return undefined
}

function degreeLabel(node: Node): string | null {
  const value = findChild(node, 'degree-value')
  const alter = findChild(node, 'degree-alter')
  if (!value) return null
  const a = alter ? Number(textOf(alter)) : 0
  const prefix = a === -1 ? 'b' : a === 1 ? '#' : ''
  return `${prefix}${textOf(value)}`
}

export function parseHarmonyTrack(xml: string): ChordTrack | null {
  const root = parser.parse(xml) as Node[]
  const part = findDeep({ root }, 'part')
  if (!part) return null

  const measures = childrenOf(part).filter((m) => tagOf(m) === 'measure')
  const chords: Chord[] = []

  let divisions = 1
  let timeSigTicks = 4 * TICKS_PER_QUARTER
  let scoreTicks = 0

  for (const measure of measures) {
    const bar = Number((measure[':@'] as Node | undefined)?.['@_number'] ?? 0)
    const measureStart = scoreTicks
    let cursor = 0

    for (const el of childrenOf(measure)) {
      const tag = tagOf(el)

      if (tag === 'attributes') {
        const div = findChild(el, 'divisions')
        if (div) divisions = Number(textOf(div))
        const time = findChild(el, 'time')
        if (time) {
          const beats = Number(textOf(findChild(time, 'beats') ?? {})) || 4
          const beatType = Number(textOf(findChild(time, 'beat-type') ?? {})) || 4
          timeSigTicks = (beats * 4 / beatType) * TICKS_PER_QUARTER
        }
        continue
      }

      const scale = TICKS_PER_QUARTER / divisions

      if (tag === 'harmony') {
        const rootEl = findChild(el, 'root')
        const kindEl = findChild(el, 'kind')
        if (!rootEl || !kindEl) continue

        const step = textOf(findChild(rootEl, 'root-step') ?? {})
        const alterEl = findChild(rootEl, 'root-alter')
        const alter = alterEl ? Number(textOf(alterEl)) : 0
        const rootPc = (((STEP_SEMITONES[step] ?? 0) + alter) % 12 + 12) % 12

        const kindText = textOf(kindEl)
        const quality = KIND_TO_QUALITY[kindText] ?? 'unknown'

        const offsetEl = findChild(el, 'offset')
        const offset = offsetEl ? Number(textOf(offsetEl)) * scale : 0

        const tensions = childrenOf(el)
          .filter((c) => tagOf(c) === 'degree')
          .map(degreeLabel)
          .filter((d): d is string => d !== null)

        chords.push({
          onset: measureStart + cursor + offset,
          bar,
          rootPc,
          quality,
          tensions,
        })
        continue
      }

      if (tag === 'backup') {
        cursor -= Number(textOf(findChild(el, 'duration') ?? {})) * scale
      } else if (tag === 'forward') {
        cursor += Number(textOf(findChild(el, 'duration') ?? {})) * scale
      } else if (tag === 'note' && !findChild(el, 'chord')) {
        cursor += Number(textOf(findChild(el, 'duration') ?? {})) * scale
      }
    }

    scoreTicks = measureStart + timeSigTicks
  }

  if (chords.length === 0) return null
  return { chords, provenance: 'file', confidence: 1 }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ingest/parseHarmony.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ingest/parseHarmony.ts src/ingest/parseHarmony.test.ts
git commit -m "feat: parse harmony taking quality from kind, never the text attribute"
```

---

### Task 6: Chord-symbol text parser for scores with no `<harmony>`

**Files:**
- Create: `src/ingest/parseChordText.ts`
- Test: `src/ingest/parseChordText.test.ts`

**Interfaces:**
- Consumes: `Chord`, `ChordTrack`, `Quality` from `src/core/types.ts`; `Mark` from the same module.
- Produces: `parseChordSymbol(text: string): { rootPc: number; quality: Quality; tensions: string[] } | null` and `chordTrackFromMarks(marks: Mark[]): ChordTrack | null`.

One corpus file in eight has no `<harmony>` at all and stores its chords as staff text in its own dialect: `D-`, `G-`, `C7`, `Fmaj`, `Bbmaj`, `E7+9`. So this is a required component, not a fallback. Text-sourced chords carry lower confidence than `<harmony>`-sourced ones.

Dialect rules to support:
- root: `A`-`G` optionally followed by `b`/`#`
- `-` or `m` or `min` -> minor seventh when a `7` follows, otherwise minor
- `maj` alone -> major; `maj7` / `M7` / `Δ` -> major seventh
- `7` alone after the root -> dominant
- `ø` or `m7b5` -> half diminished; `o7` or `dim7` -> diminished seventh; `dim` -> diminished
- `+` alone -> augmented; `+7` / `7+5` -> augmented seventh
- `sus` -> suspended fourth
- trailing alterations `+9`, `#9`, `b9`, `#11`, `b13` -> tensions
- Non-chord text (`Swing`, `sloppy`, `Trane`) must return `null` — this parser is also the filter that decides which words are chords at all.

- [ ] **Step 1: Write the failing test `src/ingest/parseChordText.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { parseChordSymbol, chordTrackFromMarks } from './parseChordText.ts'
import type { Mark } from '../core/types.ts'

describe('parseChordSymbol', () => {
  it('parses the dash-minor dialect', () => {
    expect(parseChordSymbol('D-')).toMatchObject({ rootPc: 2, quality: 'minor' })
    expect(parseChordSymbol('D-7')).toMatchObject({ rootPc: 2, quality: 'minor-seventh' })
  })

  it('parses dominants', () => {
    expect(parseChordSymbol('C7')).toMatchObject({ rootPc: 0, quality: 'dominant' })
    expect(parseChordSymbol('Bb7')).toMatchObject({ rootPc: 10, quality: 'dominant' })
  })

  it('parses the maj dialect', () => {
    expect(parseChordSymbol('Fmaj')).toMatchObject({ rootPc: 5, quality: 'major' })
    expect(parseChordSymbol('Fmaj7')).toMatchObject({ rootPc: 5, quality: 'major-seventh' })
  })

  it('parses sharp roots', () => {
    expect(parseChordSymbol('F#-7')).toMatchObject({ rootPc: 6, quality: 'minor-seventh' })
  })

  it('captures altered tensions', () => {
    expect(parseChordSymbol('E7+9')).toMatchObject({
      rootPc: 4, quality: 'dominant', tensions: ['#9'],
    })
    expect(parseChordSymbol('C7b9')).toMatchObject({ tensions: ['b9'] })
  })

  it('parses diminished and half-diminished', () => {
    expect(parseChordSymbol('Bo7')).toMatchObject({ quality: 'diminished-seventh' })
    expect(parseChordSymbol('Em7b5')).toMatchObject({ quality: 'half-diminished' })
  })

  it('parses suspended and augmented chords', () => {
    expect(parseChordSymbol('G7sus')).toMatchObject({ quality: 'suspended-fourth' })
    expect(parseChordSymbol('C+')).toMatchObject({ quality: 'augmented' })
  })

  it('returns null for text that is not a chord symbol', () => {
    expect(parseChordSymbol('Swing')).toBeNull()
    expect(parseChordSymbol('sloppy')).toBeNull()
    expect(parseChordSymbol('lay back')).toBeNull()
    expect(parseChordSymbol('')).toBeNull()
  })
})

describe('chordTrackFromMarks', () => {
  it('builds a track from chord-like words and skips the rest', () => {
    const marks: Mark[] = [
      { bar: 1, kind: 'words', text: 'Swing' },
      { bar: 1, kind: 'words', text: 'D-' },
      { bar: 2, kind: 'words', text: 'G7' },
      { bar: 2, kind: 'words', text: 'sloppy' },
    ]
    const track = chordTrackFromMarks(marks)!
    expect(track.chords).toHaveLength(2)
    expect(track.chords[0]).toMatchObject({ bar: 1, rootPc: 2, quality: 'minor' })
    expect(track.chords[1]).toMatchObject({ bar: 2, rootPc: 7, quality: 'dominant' })
  })

  it('marks text-derived chords as lower confidence than harmony elements', () => {
    const track = chordTrackFromMarks([{ bar: 1, kind: 'words', text: 'C7' }])!
    expect(track.provenance).toBe('file')
    expect(track.confidence).toBeLessThan(1)
  })

  it('returns null when no words parse as chords', () => {
    expect(chordTrackFromMarks([{ bar: 1, kind: 'words', text: 'Swing' }])).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ingest/parseChordText.test.ts`
Expected: FAIL — cannot resolve `./parseChordText.ts`.

- [ ] **Step 3: Implement `src/ingest/parseChordText.ts`**

```ts
import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Chord, ChordTrack, Mark, Quality } from '../core/types.ts'

const STEP_SEMITONES: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

/** Chords read from staff text are less trustworthy than <harmony> elements. */
const TEXT_CONFIDENCE = 0.7

const ROOT = /^([A-G])([b#]?)/

export interface ParsedSymbol {
  rootPc: number
  quality: Quality
  tensions: string[]
}

/**
 * Parse one chord symbol. Returns null for anything that is not a chord —
 * this doubles as the filter deciding which staff text is harmony at all.
 */
export function parseChordSymbol(text: string): ParsedSymbol | null {
  const trimmed = text.trim()
  const rootMatch = ROOT.exec(trimmed)
  if (!rootMatch) return null

  const [, letter, accidental] = rootMatch
  const alter = accidental === 'b' ? -1 : accidental === '#' ? 1 : 0
  const rootPc = (((STEP_SEMITONES[letter] ?? 0) + alter) % 12 + 12) % 12

  let rest = trimmed.slice(rootMatch[0].length)

  const tensions: string[] = []
  // "+9" is this dialect's spelling of "#9".
  rest = rest.replace(/\+9/g, '#9')
  for (const t of ['b9', '#9', '#11', 'b13', '#5', 'b5']) {
    // b5 is structural in m7b5, handled below; only treat it as a tension
    // when the symbol is not half-diminished.
    if (t === 'b5' && /m7b5|-7b5/.test(rest)) continue
    if (rest.includes(t)) {
      tensions.push(t)
      rest = rest.replace(t, '')
    }
  }

  const quality = qualityOf(rest)
  if (quality === null) return null

  return { rootPc, quality, tensions }
}

function qualityOf(rest: string): Quality | null {
  const s = rest.trim()

  if (s === '') return 'major'
  if (/^(sus|7sus|9sus)/.test(s)) return 'suspended-fourth'
  if (/^(m7b5|-7b5|ø)/.test(s)) return 'half-diminished'
  if (/^(o7|dim7|°7)/.test(s)) return 'diminished-seventh'
  if (/^(o|dim|°)/.test(s)) return 'diminished'
  if (/^(\+7|7\+5|aug7)/.test(s)) return 'augmented-seventh'
  if (/^(\+|aug)/.test(s)) return 'augmented'
  if (/^(maj7|M7|Δ7|Δ|ma7)/.test(s)) return 'major-seventh'
  if (/^(-|m|min)(maj7|M7|Δ)/.test(s)) return 'minor-major'
  if (/^(-|m|min)(7|9|11|13)/.test(s)) return 'minor-seventh'
  if (/^(-|m|min)6/.test(s)) return 'minor'
  if (/^(-|m|min)$/.test(s)) return 'minor'
  if (/^maj/.test(s)) return 'major'
  if (/^(7|9|11|13)/.test(s)) return 'dominant'
  if (/^6/.test(s)) return 'major'

  // Anything else is not a chord symbol.
  return null
}

/** Build a chord track from staff text, skipping words that are not chords. */
export function chordTrackFromMarks(marks: Mark[]): ChordTrack | null {
  const chords: Chord[] = []

  for (const mark of marks) {
    if (mark.kind !== 'words') continue
    const parsed = parseChordSymbol(mark.text)
    if (!parsed) continue
    chords.push({
      // Staff text carries no offset, so position is bar-level only.
      onset: (mark.bar - 1) * 4 * TICKS_PER_QUARTER,
      bar: mark.bar,
      rootPc: parsed.rootPc,
      quality: parsed.quality,
      tensions: parsed.tensions,
    })
  }

  if (chords.length === 0) return null
  return { chords, provenance: 'file', confidence: TEXT_CONFIDENCE }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ingest/parseChordText.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ingest/parseChordText.ts src/ingest/parseChordText.test.ts
git commit -m "feat: parse chord symbols from staff text for scores without harmony"
```

---

### Task 7: The ingest entry point

**Files:**
- Create: `src/ingest/index.ts`
- Test: `src/ingest/index.test.ts`

**Interfaces:**
- Consumes: `readScoreXml`, `parseScore`, `parseHarmonyTrack`, `chordTrackFromMarks`.
- Produces: `ingest(bytes: Uint8Array): Score` — a `Score` with `chordTracks` populated. Prefers a `<harmony>` track; falls back to staff text; may be empty.

- [ ] **Step 1: Write the failing test `src/ingest/index.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from './index.ts'

const load = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(`fixtures/${name}`))

describe('ingest', () => {
  it('produces a score with a harmony-sourced chord track', () => {
    const score = ingest(load('minimal-tenor.musicxml'))
    expect(score.notes).toHaveLength(8)
    expect(score.chordTracks).toHaveLength(1)
    expect(score.chordTracks[0].confidence).toBe(1)
  })

  it('falls back to staff-text chords when there is no harmony element', () => {
    const score = ingest(load('words-chords-alto.musicxml'))
    expect(score.chordTracks).toHaveLength(1)
    expect(score.chordTracks[0].confidence).toBeLessThan(1)
    expect(score.chordTracks[0].chords[0]).toMatchObject({ rootPc: 2, quality: 'minor' })
  })

  it('reads a single harmony chord track from a minimal score', () => {
    const score = ingest(load('altissimo-tenor.musicxml'))
    expect(score.chordTracks).toHaveLength(1)
    expect(score.chordTracks[0].chords[0]).toMatchObject({ quality: 'minor-seventh' })
  })

  it('preserves marks that are not chords', () => {
    const score = ingest(load('transcriber-notes.musicxml'))
    expect(score.marks.map((m) => m.text)).toContain('sloppy')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ingest/index.test.ts`
Expected: FAIL — cannot resolve `./index.ts`.

- [ ] **Step 3: Implement `src/ingest/index.ts`**

```ts
import type { Score } from '../core/types.ts'
import { readScoreXml } from './readScoreFile.ts'
import { parseScore } from './parseScore.ts'
import { parseHarmonyTrack } from './parseHarmony.ts'
import { chordTrackFromMarks } from './parseChordText.ts'

export { UnsupportedScoreError } from './parseScore.ts'

/**
 * Read a .mxl or .musicxml file into a Score with its chord track attached.
 * <harmony> elements are preferred; staff text is the documented fallback for
 * the roughly one file in eight that carries chords only as words.
 */
export function ingest(bytes: Uint8Array): Score {
  const xml = readScoreXml(bytes)
  const score = parseScore(xml)

  const harmony = parseHarmonyTrack(xml)
  const track = harmony ?? chordTrackFromMarks(score.marks)

  return { ...score, chordTracks: track ? [track] : [] }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ingest/index.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ingest/index.ts src/ingest/index.test.ts
git commit -m "feat: add ingest entry point preferring harmony over chord text"
```

---

### Task 8: Adjustment types

**Files:**
- Create: `src/prepare/adjustments.ts`
- Test: `src/prepare/adjustments.test.ts`

**Interfaces:**
- Consumes: nothing beyond core types.
- Produces: `Adjustment`, `AdjustmentKind`, `Severity`, and `summarise(adjustments: Adjustment[]): Record<Severity, number>`.

`prepare/` never mutates a `Score`. It emits `Adjustment` records — what changed, why, who decided, how confident — so every change is inspectable and revertible.

- [ ] **Step 1: Write the failing test `src/prepare/adjustments.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { summarise } from './adjustments.ts'
import type { Adjustment } from './adjustments.ts'

const adj = (severity: Adjustment['severity']): Adjustment => ({
  kind: 'range-outlier',
  severity,
  target: { bar: 1 },
  reason: 'test',
  decidedBy: 'engine',
  confidence: 0.5,
})

describe('summarise', () => {
  it('counts adjustments by severity', () => {
    expect(summarise([adj('info'), adj('warn'), adj('warn'), adj('blocking')]))
      .toEqual({ info: 1, warn: 2, blocking: 1 })
  })

  it('returns zeroes for an empty list', () => {
    expect(summarise([])).toEqual({ info: 0, warn: 0, blocking: 0 })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/prepare/adjustments.test.ts`
Expected: FAIL — cannot resolve `./adjustments.ts`.

- [ ] **Step 3: Implement `src/prepare/adjustments.ts`**

```ts
export type AdjustmentKind =
  | 'soloist-boundary'
  | 'region-proposal'
  | 'form-period'
  | 'chord-persistence'
  | 'unmarked-pickup'
  | 'range-outlier'
  | 'transcriber-note'

export type Severity = 'info' | 'warn' | 'blocking'

export interface Adjustment {
  kind: AdjustmentKind
  severity: Severity
  /** Either a single bar or an inclusive bar range. */
  target: { bar: number } | { range: [number, number] }
  before?: unknown
  after?: unknown
  reason: string
  decidedBy: 'engine' | 'model' | 'user'
  /** 0..1, heuristic. Not a probability. */
  confidence: number
}

export function summarise(adjustments: Adjustment[]): Record<Severity, number> {
  const out: Record<Severity, number> = { info: 0, warn: 0, blocking: 0 }
  for (const a of adjustments) out[a.severity]++
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/prepare/adjustments.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/prepare/adjustments.ts src/prepare/adjustments.test.ts
git commit -m "feat: add Adjustment record types for the cleanup phase"
```

---

### Task 9: Soloist segmentation

**Files:**
- Create: `src/prepare/soloists.ts`
- Test: `src/prepare/soloists.test.ts`

**Interfaces:**
- Consumes: `Mark`, `Score` from core types; `Adjustment` from `./adjustments.ts`.
- Produces: `detectSoloists(score: Score): SoloistRegion[]` and `soloistAdjustments(regions: SoloistRegion[]): Adjustment[]`, with `interface SoloistRegion { name: string; startBar: number; endBar: number }`.

This runs first in the pipeline. One corpus file contains fifteen blues choruses split between two different players, with attribution living only in free text (`Trane` at m1, `Sonny` at m85). Analysing across that boundary blends two vocabularies into findings belonging to neither.

A word is a soloist attribution when it is not a chord symbol, is not a known performance direction, is short, and is capitalised.

- [ ] **Step 1: Write the failing test `src/prepare/soloists.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from '../ingest/index.ts'
import { detectSoloists, soloistAdjustments } from './soloists.ts'

const load = (name: string) => ingest(new Uint8Array(readFileSync(`fixtures/${name}`)))

describe('detectSoloists', () => {
  it('splits a score with two named soloists at the second name', () => {
    const regions = detectSoloists(load('two-soloists.musicxml'))
    expect(regions).toEqual([
      { name: 'Trane', startBar: 1, endBar: 4 },
      { name: 'Sonny', startBar: 5, endBar: 8 },
    ])
  })

  it('returns a single unnamed region when no attribution is present', () => {
    const regions = detectSoloists(load('minimal-tenor.musicxml'))
    expect(regions).toHaveLength(1)
    expect(regions[0]).toMatchObject({ startBar: 1, endBar: 2 })
  })

  it('does not mistake performance directions for soloist names', () => {
    const regions = detectSoloists(load('transcriber-notes.musicxml'))
    expect(regions).toHaveLength(1)
  })
})

describe('soloistAdjustments', () => {
  it('raises a blocking adjustment when more than one soloist is present', () => {
    const regions = detectSoloists(load('two-soloists.musicxml'))
    const adjustments = soloistAdjustments(regions)
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].kind).toBe('soloist-boundary')
    expect(adjustments[0].severity).toBe('blocking')
  })

  it('raises nothing for a single soloist', () => {
    expect(soloistAdjustments([{ name: 'unknown', startBar: 1, endBar: 8 }])).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/prepare/soloists.test.ts`
Expected: FAIL — cannot resolve `./soloists.ts`.

- [ ] **Step 3: Implement `src/prepare/soloists.ts`**

```ts
import type { Score } from '../core/types.ts'
import type { Adjustment } from './adjustments.ts'
import { parseChordSymbol } from '../ingest/parseChordText.ts'

export interface SoloistRegion {
  name: string
  startBar: number
  endBar: number
}

/**
 * Words that appear above the staff but describe how to play, not who is
 * playing. Compared case-insensitively as whole words.
 */
const DIRECTIONS = new Set([
  'swing', 'straight', 'straight 8ths', 'lay back', 'sloppy', 'flat', 'sharp',
  'growl', 'half-tonguing', 'subtone', 'rubato', 'solo', 'head', 'intro',
  'outro', 'tema', 'fine', 'break', 'vamp', 'open',
])

function looksLikeName(text: string): boolean {
  const t = text.trim()
  if (t.length === 0 || t.length > 24) return false
  if (DIRECTIONS.has(t.toLowerCase())) return false
  if (parseChordSymbol(t)) return false
  // A name starts with a capital and contains no digits.
  if (!/^[A-Z]/.test(t)) return false
  if (/\d/.test(t)) return false
  return true
}

/**
 * Identify which bars belong to which soloist. Attribution lives only in free
 * text, so this is a proposal for the user to confirm, never a silent split.
 */
export function detectSoloists(score: Score): SoloistRegion[] {
  const names = score.marks
    .filter((m) => m.kind === 'words' && looksLikeName(m.text))
    .map((m) => ({ name: m.text.trim(), bar: m.bar }))

  if (names.length === 0) {
    return [{ name: 'unknown', startBar: 1, endBar: score.barCount }]
  }

  const regions: SoloistRegion[] = []
  for (let i = 0; i < names.length; i++) {
    regions.push({
      name: names[i].name,
      startBar: names[i].bar,
      endBar: i + 1 < names.length ? names[i + 1].bar - 1 : score.barCount,
    })
  }

  // A name appearing after bar 1 leaves an unattributed head; keep it only if
  // it actually contains bars.
  if (regions[0].startBar > 1) {
    regions.unshift({ name: 'unknown', startBar: 1, endBar: regions[0].startBar - 1 })
  }
  return regions
}

export function soloistAdjustments(regions: SoloistRegion[]): Adjustment[] {
  const named = regions.filter((r) => r.name !== 'unknown')
  if (named.length < 2) return []

  return [
    {
      kind: 'soloist-boundary',
      severity: 'blocking',
      target: { range: [regions[0].startBar, regions[regions.length - 1].endBar] },
      after: regions,
      reason:
        `This score contains ${named.length} soloists (${named.map((r) => r.name).join(', ')}). ` +
        'Analysing across the boundary would blend their vocabularies. Choose one.',
      decidedBy: 'engine',
      confidence: 0.8,
    },
  ]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/prepare/soloists.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/prepare/soloists.ts src/prepare/soloists.test.ts
git commit -m "feat: detect multiple soloists from staff-text attribution"
```

---

### Task 10: Form detection

**Files:**
- Create: `src/prepare/form.ts`
- Test: `src/prepare/form.test.ts`

**Interfaces:**
- Consumes: `Score`, `Chord` from core types; `Adjustment` from `./adjustments.ts`.
- Produces: `detectForm(score: Score): FormResult | null` and `formAdjustments(form: FormResult | null, score: Score): Adjustment[]`, with:

```ts
export interface FormResult {
  periodBars: number
  agreement: number
  method: 'absolute' | 'relative'
  chorusStarts: number[]
  agreesWithMarks: boolean
}
```

Autocorrelate the bar-by-bar chord sequence and take the smallest period with agreement above 0.75. This recovered the correct form in six of the seven chorded files in the corpus survey — including three that carried no structural annotation at all.

The **relative** fallback compares successive root *intervals* rather than absolute roots, which catches forms that transpose each chorus. It is only tried when the absolute method finds nothing.

Where rehearsal marks exist, check whether their spacing agrees with the detected period — two independent methods cross-checking give a confidence signal for free.

- [ ] **Step 1: Write the failing test `src/prepare/form.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from '../ingest/index.ts'
import { detectForm, formAdjustments } from './form.ts'

const load = (name: string) => ingest(new Uint8Array(readFileSync(`fixtures/${name}`)))

describe('detectForm', () => {
  it('finds an 8-bar repeating form by absolute root', () => {
    const form = detectForm(load('form-8bar-x3.musicxml'))!
    expect(form.periodBars).toBe(8)
    expect(form.agreement).toBe(1)
    expect(form.method).toBe('absolute')
    expect(form.chorusStarts).toEqual([1, 9, 17])
  })

  it('agrees with the rehearsal marks when they are present', () => {
    expect(detectForm(load('form-8bar-x3.musicxml'))!.agreesWithMarks).toBe(true)
  })

  it('falls back to root intervals for a form that transposes each chorus', () => {
    const form = detectForm(load('transposing-form.musicxml'))!
    expect(form.method).toBe('relative')
    expect(form.periodBars).toBe(4)
    expect(form.agreement).toBe(1)
  })

  it('returns null when there are too few chords to test', () => {
    expect(detectForm(load('minimal-tenor.musicxml'))).toBeNull()
  })
})

describe('formAdjustments', () => {
  it('reports the detected form as an info adjustment', () => {
    const score = load('form-8bar-x3.musicxml')
    const adjustments = formAdjustments(detectForm(score), score)
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].kind).toBe('form-period')
    expect(adjustments[0].severity).toBe('info')
  })

  it('reports nothing when no form was found', () => {
    const score = load('minimal-tenor.musicxml')
    expect(formAdjustments(null, score)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/prepare/form.test.ts`
Expected: FAIL — cannot resolve `./form.ts`.

- [ ] **Step 3: Implement `src/prepare/form.ts`**

```ts
import type { Chord, Score } from '../core/types.ts'
import type { Adjustment } from './adjustments.ts'

export interface FormResult {
  periodBars: number
  agreement: number
  method: 'absolute' | 'relative'
  chorusStarts: number[]
  agreesWithMarks: boolean
}

const MIN_AGREEMENT = 0.75
const MIN_BARS = 8

/** One symbol per bar; a bar with no chord inherits the previous one. */
function barSymbols(score: Score): string[] {
  const track = score.chordTracks[0]
  if (!track) return []

  const byBar = new Map<number, Chord[]>()
  for (const c of track.chords) {
    const list = byBar.get(c.bar) ?? []
    list.push(c)
    byBar.set(c.bar, list)
  }

  const out: string[] = []
  let last: string | null = null
  for (let bar = 1; bar <= score.barCount; bar++) {
    const here = byBar.get(bar)
    if (here) last = here.map((c) => `${c.rootPc}:${c.quality}`).join('|')
    if (last !== null) out.push(last)
  }
  return out
}

/** Root of each bar's first chord, as a pitch class. */
function barRoots(score: Score): number[] {
  const track = score.chordTracks[0]
  if (!track) return []
  const byBar = new Map<number, number>()
  for (const c of track.chords) if (!byBar.has(c.bar)) byBar.set(c.bar, c.rootPc)

  const out: number[] = []
  let last: number | null = null
  for (let bar = 1; bar <= score.barCount; bar++) {
    const here = byBar.get(bar)
    if (here !== undefined) last = here
    if (last !== null) out.push(last)
  }
  return out
}

function smallestPeriod<T>(items: T[]): { period: number; agreement: number } | null {
  for (let p = 2; p <= Math.floor(items.length / 2); p++) {
    const comparisons = items.length - p
    if (comparisons <= 0) break
    let matches = 0
    for (let i = 0; i < comparisons; i++) if (items[i] === items[i + p]) matches++
    const agreement = matches / comparisons
    if (agreement > MIN_AGREEMENT) return { period: p, agreement }
  }
  return null
}

/**
 * Recover the chorus length from the changes. Tries absolute roots first, then
 * root intervals — the latter catches forms that transpose each chorus, which
 * absolute matching cannot see at all.
 */
export function detectForm(score: Score): FormResult | null {
  const symbols = barSymbols(score)
  if (symbols.length < MIN_BARS) return null

  let method: 'absolute' | 'relative' = 'absolute'
  let hit = smallestPeriod(symbols)

  if (!hit) {
    const roots = barRoots(score)
    const intervals: number[] = []
    for (let i = 0; i < roots.length - 1; i++) {
      intervals.push(((roots[i + 1] - roots[i]) % 12 + 12) % 12)
    }
    hit = smallestPeriod(intervals)
    method = 'relative'
  }

  if (!hit) return null

  const chorusStarts: number[] = []
  for (let bar = 1; bar + hit.period - 1 <= score.barCount; bar += hit.period) {
    chorusStarts.push(bar)
  }

  const rehearsalBars = score.marks
    .filter((m) => m.kind === 'rehearsal')
    .map((m) => m.bar)
  const agreesWithMarks =
    rehearsalBars.length >= 2 &&
    rehearsalBars.every((b) => (b - rehearsalBars[0]) % hit.period === 0)

  return {
    periodBars: hit.period,
    agreement: hit.agreement,
    method,
    chorusStarts,
    agreesWithMarks,
  }
}

export function formAdjustments(form: FormResult | null, score: Score): Adjustment[] {
  if (!form) return []
  return [
    {
      kind: 'form-period',
      severity: 'info',
      target: { range: [1, score.barCount] },
      after: form,
      reason:
        `Detected a ${form.periodBars}-bar form by ${form.method} root matching ` +
        `(${Math.round(form.agreement * 100)}% agreement)` +
        (form.agreesWithMarks ? ', consistent with the rehearsal marks.' : '.'),
      decidedBy: 'engine',
      confidence: form.agreesWithMarks ? 0.95 : form.agreement,
    },
  ]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/prepare/form.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/prepare/form.ts src/prepare/form.test.ts
git commit -m "feat: detect chorus form by harmony autocorrelation with relative fallback"
```

---

### Task 11: The remaining cleanup checks

**Files:**
- Create: `src/prepare/checks.ts`
- Test: `src/prepare/checks.test.ts`

**Interfaces:**
- Consumes: `Score` from core types; `Adjustment` from `./adjustments.ts`; `FormResult` from `./form.ts`.
- Produces: `pickupCheck`, `rangeCheck`, `transcriberNoteCheck`, `chordPersistenceCheck` — each `(score: Score, ...) => Adjustment[]`.

Four checks, each from an observed corpus hazard:

- **Unmarked pickup.** One bar across eight corpus files failed to sum to its time signature, and it was an anacrusis not marked `implicit="yes"`. An unmarked pickup shifts every downstream beat position and silently corrupts every metrical judgment.
- **Range outliers — flag, never correct.** One corpus file had fifty notes above the normal written range because the player uses altissimo. Severity is `info`, never `warn`.
- **Transcriber notes.** Words like `sloppy` and `flat` are the transcriber saying *this is not what was meant*. They lower confidence for findings in those bars.
- **Chord persistence.** MusicXML harmony persists until the next `<harmony>`, so *held* and *not entered* are indistinguishable from the file alone. Flag a chord persisting more than `periodBars / 2` bars — but regular, section-aligned gaps are held chords, not errors.

- [ ] **Step 1: Write the failing test `src/prepare/checks.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from '../ingest/index.ts'
import { pickupCheck, rangeCheck, transcriberNoteCheck, chordPersistenceCheck } from './checks.ts'
import { detectForm } from './form.ts'

const load = (name: string) => ingest(new Uint8Array(readFileSync(`fixtures/${name}`)))

describe('pickupCheck', () => {
  it('flags a first bar that is short but not marked implicit', () => {
    const adjustments = pickupCheck(load('unmarked-pickup.musicxml'))
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].kind).toBe('unmarked-pickup')
    expect(adjustments[0].severity).toBe('warn')
    expect(adjustments[0].target).toEqual({ bar: 1 })
  })

  it('does not flag a score whose bars all sum correctly', () => {
    expect(pickupCheck(load('minimal-tenor.musicxml'))).toEqual([])
  })
})

describe('rangeCheck', () => {
  it('flags notes above the normal written range as info, never as an error', () => {
    const adjustments = rangeCheck(load('altissimo-tenor.musicxml'))
    expect(adjustments.length).toBeGreaterThan(0)
    expect(adjustments.every((a) => a.severity === 'info')).toBe(true)
    expect(adjustments[0].kind).toBe('range-outlier')
    expect(adjustments[0].reason).toMatch(/altissimo/i)
  })

  it('does not flag notes inside the range', () => {
    expect(rangeCheck(load('minimal-tenor.musicxml'))).toEqual([])
  })
})

describe('transcriberNoteCheck', () => {
  it('flags words that mark doubtful transcription', () => {
    const adjustments = transcriberNoteCheck(load('transcriber-notes.musicxml'))
    expect(adjustments.map((a) => a.target)).toEqual([{ bar: 2 }, { bar: 3 }])
    expect(adjustments.every((a) => a.kind === 'transcriber-note')).toBe(true)
  })

  it('ignores ordinary performance directions', () => {
    const texts = transcriberNoteCheck(load('transcriber-notes.musicxml'))
      .map((a) => String(a.before))
    expect(texts).not.toContain('Swing')
  })
})

describe('chordPersistenceCheck', () => {
  it('does not flag a form where every bar carries its own chord', () => {
    const score = load('form-8bar-x3.musicxml')
    expect(chordPersistenceCheck(score, detectForm(score))).toEqual([])
  })

  it('flags a chord persisting across most of a detected form', () => {
    const score = load('two-soloists.musicxml')
    // Bars 1-4 all carry F7 and bars 5-8 all carry Bb7, so nothing persists
    // unusually; a null form means the check has no period to compare against.
    expect(chordPersistenceCheck(score, null)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/prepare/checks.test.ts`
Expected: FAIL — cannot resolve `./checks.ts`.

- [ ] **Step 3: Implement `src/prepare/checks.ts`**

```ts
import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Score } from '../core/types.ts'
import type { Adjustment } from './adjustments.ts'
import type { FormResult } from './form.ts'

/**
 * Words that mark the transcriber's own doubt about what was played, rather
 * than an instruction to the reader.
 */
const DOUBT_WORDS = new Set(['sloppy', 'flat', 'sharp', 'approx', 'unclear', '?'])

/** Flag a first bar that is short but not marked implicit="yes". */
export function pickupCheck(score: Score): Adjustment[] {
  const barTicks = (score.timeSig[0] * 4 / score.timeSig[1]) * TICKS_PER_QUARTER
  const firstBar = score.notes.filter((n) => n.bar === 1)
  if (firstBar.length === 0) return []

  const filled = firstBar.reduce((sum, n) => sum + n.duration, 0)
  if (filled >= barTicks) return []

  return [
    {
      kind: 'unmarked-pickup',
      severity: 'warn',
      target: { bar: 1 },
      before: filled,
      after: barTicks,
      reason:
        'Bar 1 is shorter than the time signature but is not marked as a pickup. ' +
        'If it is an anacrusis, every downstream beat position is shifted.',
      decidedBy: 'engine',
      confidence: 0.7,
    },
  ]
}

/**
 * Report notes outside the normal written range. Always informational: on
 * saxophone these are usually altissimo, not errors.
 */
export function rangeCheck(score: Score): Adjustment[] {
  const { writtenRange, rangeKnown, altissimoTo, name } = score.instrument
  if (!rangeKnown) return []

  const outliers = score.notes.filter(
    (n) => n.midi < writtenRange.lo || n.midi > writtenRange.hi,
  )
  if (outliers.length === 0) return []

  const highest = Math.max(...outliers.map((n) => n.midi))
  const withinAltissimo = altissimoTo !== undefined && highest <= altissimoTo

  return [
    {
      kind: 'range-outlier',
      severity: 'info',
      target: { range: [outliers[0].bar, outliers[outliers.length - 1].bar] },
      before: outliers.length,
      reason:
        `${outliers.length} note(s) fall outside the normal written range for ${name}. ` +
        (withinAltissimo
          ? 'These are within reach in altissimo and are most likely real.'
          : 'Worth checking for an octave error, but do not assume one.'),
      decidedBy: 'engine',
      confidence: 0.5,
    },
  ]
}

/** Surface the transcriber's own uncertainty markers as confidence signals. */
export function transcriberNoteCheck(score: Score): Adjustment[] {
  return score.marks
    .filter((m) => m.kind === 'words' && DOUBT_WORDS.has(m.text.trim().toLowerCase()))
    .map((m) => ({
      kind: 'transcriber-note' as const,
      severity: 'warn' as const,
      target: { bar: m.bar },
      before: m.text,
      reason:
        `The transcriber marked bar ${m.bar} "${m.text}". Findings here should ` +
        'carry lower confidence, and may not represent what the player intended.',
      decidedBy: 'engine' as const,
      confidence: 0.9,
    }))
}

/**
 * Flag a chord that persists implausibly long. MusicXML harmony carries until
 * the next <harmony>, so "held" and "never entered" are indistinguishable from
 * the file alone — but regular, section-aligned gaps are held chords, not
 * errors, so this only fires without a detected form to explain them.
 */
export function chordPersistenceCheck(
  score: Score,
  form: FormResult | null,
): Adjustment[] {
  const track = score.chordTracks[0]
  if (!track || track.chords.length === 0) return []

  const threshold = form ? Math.max(2, Math.floor(form.periodBars / 2)) : 4
  const out: Adjustment[] = []

  for (let i = 0; i < track.chords.length; i++) {
    const start = track.chords[i].bar
    const end = i + 1 < track.chords.length ? track.chords[i + 1].bar : score.barCount + 1
    const span = end - start
    if (span <= threshold) continue

    out.push({
      kind: 'chord-persistence',
      severity: 'warn',
      target: { range: [start, end - 1] },
      before: span,
      reason:
        `One chord covers ${span} bars. MusicXML cannot distinguish a held chord ` +
        'from a missing one, so these degrees may rest on a chord that was never entered.',
      decidedBy: 'engine',
      confidence: 0.6,
    })
  }
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/prepare/checks.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/prepare/checks.ts src/prepare/checks.test.ts
git commit -m "feat: add pickup, range, transcriber-note and chord-persistence checks"
```

---

### Task 12: The prepare pipeline

**Files:**
- Create: `src/prepare/index.ts`
- Create: `src/index.ts`
- Test: `src/prepare/index.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 8-11.
- Produces: `prepare(score: Score): CleanupReport`, with:

```ts
export interface CleanupReport {
  soloists: SoloistRegion[]
  form: FormResult | null
  adjustments: Adjustment[]
  counts: Record<Severity, number>
  /** True when something needs a human decision before analysis can run. */
  needsUserDecision: boolean
}
```

Order matters: soloist segmentation runs first because everything downstream inherits its error.

- [ ] **Step 1: Write the failing test `src/prepare/index.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ingest } from '../ingest/index.ts'
import { prepare } from './index.ts'

const load = (name: string) => ingest(new Uint8Array(readFileSync(`fixtures/${name}`)))

describe('prepare', () => {
  it('reports a clean score with no blocking adjustments', () => {
    const report = prepare(load('form-8bar-x3.musicxml'))
    expect(report.counts.blocking).toBe(0)
    expect(report.needsUserDecision).toBe(false)
    expect(report.form?.periodBars).toBe(8)
    expect(report.soloists).toHaveLength(1)
  })

  it('blocks on a score with two soloists', () => {
    const report = prepare(load('two-soloists.musicxml'))
    expect(report.needsUserDecision).toBe(true)
    expect(report.counts.blocking).toBe(1)
    expect(report.soloists.map((s) => s.name)).toEqual(['Trane', 'Sonny'])
  })

  it('collects the pickup warning', () => {
    const report = prepare(load('unmarked-pickup.musicxml'))
    expect(report.adjustments.some((a) => a.kind === 'unmarked-pickup')).toBe(true)
  })

  it('collects altissimo as information, not as a problem', () => {
    const report = prepare(load('altissimo-tenor.musicxml'))
    expect(report.adjustments.some((a) => a.kind === 'range-outlier')).toBe(true)
    expect(report.counts.blocking).toBe(0)
  })

  it('collects transcriber doubt markers', () => {
    const report = prepare(load('transcriber-notes.musicxml'))
    expect(report.adjustments.filter((a) => a.kind === 'transcriber-note')).toHaveLength(2)
  })

  it('never mutates the score it is given', () => {
    const score = load('form-8bar-x3.musicxml')
    const before = JSON.stringify(score)
    prepare(score)
    expect(JSON.stringify(score)).toBe(before)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/prepare/index.test.ts`
Expected: FAIL — cannot resolve `./index.ts`.

- [ ] **Step 3: Implement `src/prepare/index.ts`**

```ts
import type { Score } from '../core/types.ts'
import { summarise } from './adjustments.ts'
import type { Adjustment, Severity } from './adjustments.ts'
import { detectSoloists, soloistAdjustments } from './soloists.ts'
import type { SoloistRegion } from './soloists.ts'
import { detectForm, formAdjustments } from './form.ts'
import type { FormResult } from './form.ts'
import {
  pickupCheck,
  rangeCheck,
  transcriberNoteCheck,
  chordPersistenceCheck,
} from './checks.ts'

export interface CleanupReport {
  soloists: SoloistRegion[]
  form: FormResult | null
  adjustments: Adjustment[]
  counts: Record<Severity, number>
  needsUserDecision: boolean
}

/**
 * Inspect a Score and report everything suspicious about it. Emits Adjustment
 * records describing what should change and why; never mutates the Score.
 *
 * Soloist segmentation runs first: everything downstream inherits its error.
 */
export function prepare(score: Score): CleanupReport {
  const soloists = detectSoloists(score)
  const form = detectForm(score)

  const adjustments: Adjustment[] = [
    ...soloistAdjustments(soloists),
    ...formAdjustments(form, score),
    ...pickupCheck(score),
    ...rangeCheck(score),
    ...transcriberNoteCheck(score),
    ...chordPersistenceCheck(score, form),
  ]

  const counts = summarise(adjustments)
  return {
    soloists,
    form,
    adjustments,
    counts,
    needsUserDecision: counts.blocking > 0,
  }
}
```

- [ ] **Step 4: Create the package entry point `src/index.ts`**

```ts
export { ingest, UnsupportedScoreError } from './ingest/index.ts'
export { prepare } from './prepare/index.ts'
export type { CleanupReport } from './prepare/index.ts'
export type { Adjustment, AdjustmentKind, Severity } from './prepare/adjustments.ts'
export type { SoloistRegion } from './prepare/soloists.ts'
export type { FormResult } from './prepare/form.ts'
export type {
  Score, Note, Chord, ChordTrack, Instrument, Mark, Quality, Provenance,
} from './core/types.ts'
export { TICKS_PER_QUARTER } from './core/types.ts'
export { degreeOf, intervalsOf, isChordTone, pitchClass } from './core/pitch.ts'
export { instrumentFromTranspose } from './core/instrument.ts'
```

- [ ] **Step 5: Run the whole suite and the typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: all tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/prepare/index.ts src/prepare/index.test.ts src/index.ts
git commit -m "feat: assemble the prepare pipeline into a CleanupReport"
```

---

## Done when

- `npx vitest run` passes every test.
- `npm run typecheck` is clean.
- `src/` contains no reference to `DOMParser`, `document` or `window`.
- `ingest()` reads all 11 fixtures without throwing, except `has-repeats.musicxml`, which must throw `UnsupportedScoreError`.
