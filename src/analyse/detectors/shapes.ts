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
