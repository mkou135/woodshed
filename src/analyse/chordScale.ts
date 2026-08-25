import type { Chord, Quality } from '../core/types.ts'
import { pitchClass } from '../core/pitch.ts'

/**
 * The scale a chord is played on, named the way a player reads it.
 *
 * Two rules decide it, in this order. The chart wins: if the transcriber wrote
 * `C7alt` or `F7#11` they heard the scale and said so, and `Chord.tensions`
 * carries it. Otherwise the scale comes from the chord's *function*, not its
 * quality alone — a dominant resolving down a perfect fifth takes Mixolydian, a
 * dominant resolving anywhere else takes Lydian b7 (Nettles & Graf p.92, and
 * the glossary p.177: "The appropriate scale for a given chord is determined by
 * the function of the chord"). That is what makes this more than a restatement
 * of the symbol already printed above the staff: the same C7 reads two ways.
 *
 * This layer never guesses from the notes. Four attempts to detect a departure
 * from played pitch content were measured against null models on the Weimar
 * Jazz Database and all four fired at or below chance — see
 * docs/research/scale-analysis.md §4 and DECISIONS 2026-08-25. So a span is
 * either what the chart declared or what the function rule says, and nothing
 * here is inferred from the melody.
 */
export interface ScaleSpan {
  chord: Chord
  bar: number
  /** As a player reads it, e.g. 'G Mixolydian', 'Bb Lydian b7', 'C altered'. */
  name: string
  /** Pitch classes of the parent collection. */
  pcs: number[]
  /** True when the chart's own tensions asked for this scale. */
  declared: boolean
  because: 'the chart says so' | 'resolves down a fifth' | 'does not resolve down a fifth' | 'the chord quality'
}

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

/** Semitones above the scale's own root. */
const COLLECTIONS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  'melodic minor': [0, 2, 3, 5, 7, 9, 11],
  'whole-tone': [0, 2, 4, 6, 8, 10],
  diminished: [0, 2, 3, 5, 6, 8, 9, 11],
} as const

/**
 * A mode: the name a player says, which degree of its parent collection the
 * chord root sits on, and which collection that is. `offset` is how far the
 * parent's root sits below the chord root, so the collection is built from
 * (chordRoot - offset).
 */
interface Mode {
  label: string
  offset: number
  family: keyof typeof COLLECTIONS
}

const MODES = {
  ionian: { label: 'Ionian', offset: 0, family: 'major' },
  dorian: { label: 'Dorian', offset: 2, family: 'major' },
  phrygian: { label: 'Phrygian', offset: 4, family: 'major' },
  lydian: { label: 'Lydian', offset: 5, family: 'major' },
  mixolydian: { label: 'Mixolydian', offset: 7, family: 'major' },
  aeolian: { label: 'Aeolian', offset: 9, family: 'major' },
  locrian: { label: 'Locrian', offset: 11, family: 'major' },
  melodicMinor: { label: 'melodic minor', offset: 0, family: 'melodic minor' },
  lydianFlat7: { label: 'Lydian b7', offset: 5, family: 'melodic minor' },
  altered: { label: 'altered', offset: 11, family: 'melodic minor' },
  wholeTone: { label: 'whole-tone', offset: 0, family: 'whole-tone' },
  diminished: { label: 'diminished', offset: 0, family: 'diminished' },
} as const satisfies Record<string, Mode>

/** The scale for a quality when nothing else decides it (Nettles p.29 summary). */
const BY_QUALITY: Partial<Record<Quality, Mode>> = {
  'major': MODES.ionian,
  'major-seventh': MODES.ionian,
  'minor': MODES.dorian,
  'minor-seventh': MODES.dorian,
  'minor-major': MODES.melodicMinor,
  'half-diminished': MODES.locrian,
  'diminished': MODES.diminished,
  'diminished-seventh': MODES.diminished,
  'augmented': MODES.wholeTone,
  'augmented-seventh': MODES.wholeTone,
  'suspended-fourth': MODES.mixolydian,
}

const ALTERED_TENSIONS = ['b9', '#9', 'b13', '#5', 'b5']

/**
 * What the chart itself asks for, or null when it says nothing beyond the
 * quality. Altered wins over a bare #11: `C7(#9b13)` is the altered scale even
 * though #11 belongs to it too.
 */
function declaredMode(chord: Chord): Mode | null {
  const has = (t: string) => chord.tensions.includes(t)
  const major = chord.quality === 'major' || chord.quality === 'major-seventh'
  const dominant = chord.quality === 'dominant' || chord.quality === 'suspended-fourth'

  if (dominant) {
    if (ALTERED_TENSIONS.filter(has).length >= 2) return MODES.altered
    if (has('#11')) return MODES.lydianFlat7
    if (has('b13')) return MODES.altered
  }
  if (major && has('#11')) return MODES.lydian
  if ((chord.quality === 'minor' || chord.quality === 'minor-seventh') && has('b13')) return MODES.aeolian
  return null
}

/** The next chord that is not a rewrite of this one. */
function nextDistinct(chords: Chord[], from: number): Chord | null {
  const here = chords[from]
  for (let i = from + 1; i < chords.length; i++) {
    const next = chords[i]
    if (next.rootPc !== here.rootPc || next.quality !== here.quality) return next
  }
  return null
}

function nameOf(pc: number, keyFifths: number): string {
  return (keyFifths > 0 ? SHARP_NAMES : FLAT_NAMES)[pitchClass(pc)]
}

function spanOf(chord: Chord, mode: Mode, declared: boolean, because: ScaleSpan['because'], keyFifths: number): ScaleSpan {
  const parent = pitchClass(chord.rootPc - mode.offset)
  return {
    chord,
    bar: chord.bar,
    name: `${nameOf(chord.rootPc, keyFifths)} ${mode.label}`,
    pcs: COLLECTIONS[mode.family].map((i) => pitchClass(parent + i)),
    declared,
    because,
  }
}

/**
 * One span per chord, in order. Chords whose quality we cannot name are left
 * out rather than guessed at.
 *
 * `keyFifths` is the score's written key signature and decides spelling only —
 * the same rule the exercise renderer uses, because `Note.midi` carries pitch
 * classes and nothing else, so "Db melodic minor" and "C# melodic minor" are
 * otherwise the same object.
 */
export function chordScales(chords: Chord[], keyFifths: number): ScaleSpan[] {
  const out: ScaleSpan[] = []

  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i]

    const declared = declaredMode(chord)
    if (declared) {
      out.push(spanOf(chord, declared, true, 'the chart says so', keyFifths))
      continue
    }

    if (chord.quality === 'dominant') {
      const next = nextDistinct(chords, i)
      // Down a perfect fifth is up a perfect fourth: +5 semitones.
      const resolves = next !== null && pitchClass(next.rootPc - chord.rootPc) === 5
      out.push(spanOf(
        chord,
        resolves ? MODES.mixolydian : MODES.lydianFlat7,
        false,
        resolves ? 'resolves down a fifth' : 'does not resolve down a fifth',
        keyFifths,
      ))
      continue
    }

    const byQuality = BY_QUALITY[chord.quality]
    if (byQuality) out.push(spanOf(chord, byQuality, false, 'the chord quality', keyFifths))
  }

  return out
}
