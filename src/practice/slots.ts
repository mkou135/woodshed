import type { Chord, Instrument, Note, Quality } from '../core/types.ts'
import type { Tune } from './tune.ts'
import { barTicks } from './tune.ts'

export type ChordClass = 'major' | 'dominant' | 'minor' | 'diminished'

function chordClass(quality: Quality): ChordClass | null {
  switch (quality) {
    case 'major':
    case 'major-seventh':
      return 'major'
    case 'dominant':
    case 'augmented':
    case 'augmented-seventh':
    case 'suspended-fourth':
      return 'dominant'
    case 'minor':
    case 'minor-seventh':
    case 'minor-major':
      return 'minor'
    case 'half-diminished':
    case 'diminished':
    case 'diminished-seventh':
      return 'diminished'
    default:
      return null
  }
}

function interval(from: number, to: number): number {
  return ((to - from) % 12 + 12) % 12
}

function distinctChords(chords: Chord[]): Chord[] {
  const out: Chord[] = []
  for (const chord of chords) {
    const previous = out[out.length - 1]
    if (previous?.rootPc === chord.rootPc && previous.quality === chord.quality) continue
    out.push(chord)
  }
  return out
}

export interface ProgressionSlot {
  classes: ChordClass[]
  intervals: number[]
  rootPc: number
}

export function progressionSlot(chords: Chord[]): ProgressionSlot | null {
  const distinct = distinctChords(chords)
  if (distinct.length === 0) return null
  const classes = distinct.map((chord) => chordClass(chord.quality))
  if (classes.some((value) => value === null)) return null
  return {
    classes: classes as ChordClass[],
    intervals: distinct.slice(1).map((chord, i) => interval(distinct[i].rootPc, chord.rootPc)),
    rootPc: distinct[0].rootPc,
  }
}

export interface SlotMatch {
  bar: number
  toBar: number
  shift: number
  chords: Chord[]
}

/** Chords from an iReal tune on one absolute timeline, with carries merged. */
export function tuneChords(tune: Tune): Chord[] {
  const ticks = barTicks(tune.timeSig)
  return distinctChords(tune.bars.flatMap((bar, i) => bar.chords.map((chord) => ({
    ...chord,
    bar: i + 1,
    onset: i * ticks + chord.onset,
  }))))
}

/** Every occurrence of the same chord classes and root motion, in tune order. */
export function findProgressionSlots(slot: ProgressionSlot, tune: Tune, limit = 8): SlotMatch[] {
  const chords = tuneChords(tune)
  const matches: SlotMatch[] = []
  for (let i = 0; i + slot.classes.length <= chords.length; i++) {
    const candidate = chords.slice(i, i + slot.classes.length)
    if (candidate.some((chord, k) => chordClass(chord.quality) !== slot.classes[k])) continue
    if (candidate.slice(1).some((chord, k) => interval(candidate[k].rootPc, chord.rootPc) !== slot.intervals[k])) continue
    matches.push({
      bar: candidate[0].bar,
      toBar: candidate[candidate.length - 1].bar,
      shift: interval(slot.rootPc, candidate[0].rootPc),
      chords: candidate,
    })
    if (matches.length === limit) break
  }
  return matches
}

/** Transpose by chord-root shift, choosing the nearest octave that fits the horn. */
export function transposeLine(notes: Note[], shift: number, instrument: Instrument): Note[] | null {
  const signed = shift > 6 ? shift - 12 : shift
  const candidates = Array.from({ length: 9 }, (_, i) => signed + (i - 4) * 12)
    .filter((by) => notes.every((note) => {
      const midi = note.midi + by
      return midi >= instrument.writtenRange.lo && midi <= instrument.writtenRange.hi
    }))
    .sort((a, b) => Math.abs(a) - Math.abs(b))
  const by = candidates[0]
  return by === undefined ? null : notes.map((note) => ({ ...note, midi: note.midi + by }))
}
