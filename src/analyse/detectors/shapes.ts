import { intervalsOf } from '../../core/pitch.ts'
import type { Quality } from '../../core/types.ts'
import { samePhrase } from '../context.ts'
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

const TRIAD_ORDERS = ['135', '153', '315', '351', '513', '531']

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
  { degrees: 'b7#9b91', name: 'dominant b9 cell b7-#9-b9-1', qualities: DOMINANT },
  { degrees: '3b91', name: 'dominant b9 cell 3-b9-1', qualities: DOMINANT },
  { degrees: '1b9b7', name: 'dominant b9 cell 1-b9-b7', qualities: DOMINANT },

  { degrees: '1345', name: 'minor cell 1345', qualities: MINOR_FAMILY },
  { degrees: '1235', name: 'minor digital pattern 1235', qualities: MINOR_FAMILY },
  { degrees: '5321', name: '5-3-2-1 descent', qualities: MINOR_FAMILY },
  { degrees: '3572', name: 'major-seventh arpeggio from the b3', qualities: MINOR },
  { degrees: '1357', name: 'minor seventh arpeggio', qualities: MINOR },
  { degrees: '13b57', name: 'half-diminished arpeggio', qualities: ['half-diminished'] },

  // Bare triads, three notes in any order; each order is its own figure to
  // drill. Over a minor chord the third is labelled '3' (context.ts), so the
  // same strings name the minor triad.
  ...TRIAD_ORDERS.map((degrees) => ({ degrees, name: `major triad ${degrees.split('').join('-')}`, qualities: MAJOR_FAMILY })),
  ...TRIAD_ORDERS.map((degrees) => ({ degrees, name: `minor triad ${degrees.split('').join('-')}`, qualities: MINOR_FAMILY })),
]

/** Cell lengths tried, longest first so a shorter hit inside a longer one is dropped. */
const CELL_LENGTHS = [4, 3]

/** The dictionary entry a degree string names over this quality, if any. */
export function lookup(degrees: string[], quality: Quality): Entry | undefined {
  const key = degrees.join('')
  return DICTIONARY.find((e) => e.degrees === key && e.qualities.includes(quality))
}

export function matchShapes(ctx: NoteContext[]): ShapeHit[] {
  const hits: ShapeHit[] = []

  for (const cellLength of CELL_LENGTHS) {
    for (let i = 0; i + cellLength <= ctx.length; i++) {
      const end = i + cellLength
      // A triad sharing notes with an already-matched longer cell is part of
      // that event (1357 contains 135; 3-5-1 across two 1235s is no triad).
      if (hits.some((h) => h.startIndex < end && i < h.startIndex + h.length)) continue
      if (!samePhrase(ctx, i, end - 1)) continue
      const cell = ctx.slice(i, end)
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
        length: cellLength,
        name: entry.name,
        degrees,
        quality: chord.quality,
        intervals: intervalsOf(cell.map((c) => c.note.midi)),
      })
    }
  }

  return hits.sort((a, b) => a.startIndex - b.startIndex)
}
