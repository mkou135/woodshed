import { intervalsOf } from '../../core/pitch.ts'
import type { Quality } from '../../core/types.ts'
import type { NoteContext } from '../context.ts'

export interface ShapeHit {
  startIndex: number
  length: number
  name: string
  degrees: string[]
  quality: Quality
  /** Semitone steps between the notes as actually played, contour included. */
  intervals: number[]
}

interface Entry {
  degrees: string
  name: string
  /** The chord qualities this cell is vocabulary over. */
  qualities: Quality[]
}

const MAJOR: Quality[] = ['major', 'major-seventh']
const DOMINANT: Quality[] = ['dominant', 'augmented-seventh']
const MAJOR_FAMILY: Quality[] = [...MAJOR, ...DOMINANT, 'augmented', 'suspended-fourth']
const MINOR: Quality[] = ['minor', 'minor-seventh', 'minor-major']
const MINOR_FAMILY: Quality[] = [...MINOR, 'half-diminished', 'diminished', 'diminished-seventh']

/**
 * Vocabulary keyed by degree string AND chord quality. The same shape over a
 * different quality is a different musical object: "3572" over a major chord
 * is the 3-5-7-9 upper structure; over a minor chord it is the major-seventh
 * arpeggio built on the b3. And a cell whose labelled 7 is the major seventh
 * is not vocabulary over a dominant, where that note clashes with the b7 —
 * keying by family alone once drilled C E G B through every dominant in a tune.
 */
const DICTIONARY: Entry[] = [
  { degrees: '1235', name: 'digital pattern 1235', qualities: MAJOR_FAMILY },
  { degrees: '1234', name: 'scalar cell 1234', qualities: MAJOR_FAMILY },
  { degrees: '5321', name: '5-3-2-1 descent', qualities: MAJOR_FAMILY },
  { degrees: '3572', name: '3-5-7-9 upper structure', qualities: MAJOR },
  { degrees: '35b72', name: '3-5-b7-9 upper structure', qualities: DOMINANT },
  { degrees: '1357', name: 'major-seventh arpeggio', qualities: MAJOR },
  { degrees: '135b7', name: 'dominant seventh arpeggio', qualities: DOMINANT },

  { degrees: '1345', name: 'minor cell 1345', qualities: MINOR_FAMILY },
  { degrees: '1235', name: 'minor digital pattern 1235', qualities: MINOR_FAMILY },
  { degrees: '5321', name: '5-3-2-1 descent', qualities: MINOR_FAMILY },
  { degrees: '3572', name: 'major-seventh arpeggio from the b3', qualities: MINOR },
  { degrees: '1357', name: 'minor seventh arpeggio', qualities: MINOR },
  { degrees: '13b57', name: 'half-diminished arpeggio', qualities: ['half-diminished'] },
]

const CELL_LENGTH = 4

/** The dictionary entry a degree string names over this quality, if any. */
export function lookup(degrees: string[], quality: Quality): Entry | undefined {
  const key = degrees.join('')
  return DICTIONARY.find((e) => e.degrees === key && e.qualities.includes(quality))
}

export function matchShapes(ctx: NoteContext[]): ShapeHit[] {
  const hits: ShapeHit[] = []

  for (let i = 0; i + CELL_LENGTH <= ctx.length; i++) {
    const cell = ctx.slice(i, i + CELL_LENGTH)
    const chord = cell[0].chord
    if (!chord) continue
    // Same harmony, compared by root and quality rather than object identity:
    // a cell often spans two bars carrying the same chord as separate <harmony>
    // elements, and identity would reject it. A genuine chord change still
    // rejects, because the degrees would then describe two harmonies.
    if (!cell.every((c) => c.chord !== null
      && c.chord.rootPc === chord.rootPc
      && c.chord.quality === chord.quality)) continue
    if (cell.some((c) => c.degree === null)) continue

    const degrees = cell.map((c) => c.degree as string)
    const entry = lookup(degrees, chord.quality)
    if (!entry) continue

    hits.push({
      startIndex: i,
      length: CELL_LENGTH,
      name: entry.name,
      degrees,
      quality: chord.quality,
      intervals: intervalsOf(cell.map((c) => c.note.midi)),
    })
  }

  return hits
}
