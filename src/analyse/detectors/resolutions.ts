import { TICKS_PER_QUARTER } from '../../core/types.ts'
import type { Quality } from '../../core/types.ts'
import type { NoteContext } from '../context.ts'

export interface ResolutionHit {
  /** The resolving 7. The 3 it falls to is always the next note. */
  index: number
  name: string
  degrees: [string, string]
  /** The quality the 7 is a 7 of. */
  quality: Quality
  /** Semitones fallen: 1, or 2 into a minor third. */
  fall: number
}

/** The second chord sits a fourth above the first — the house `+5` convention. */
const ROOT_MOVE = 5
/**
 * Below this a gap is articulation rather than a rest — `segment.ts`'s own
 * `minRest`, restated here because it is the condition under which this
 * detector may cross an idea boundary.
 */
const MIN_REST = TICKS_PER_QUARTER / 4
/** The minor family labels the b7 as '7' (`context.ts`), so both spellings count. */
const SEVENTHS = new Set(['b7', '7'])

const DOMINANT: Quality[] = ['dominant', 'augmented-seventh']
const MAJOR: Quality[] = ['major', 'major-seventh']
const MINOR: Quality[] =
  ['minor', 'minor-seventh', 'minor-major', 'half-diminished', 'diminished', 'diminished-seventh']

/**
 * What the resolution is *for*, which is the chord pair rather than the notes.
 * These strings are identities (`practice/describe.ts`): the merge passes and
 * the generators match on them, so they are not reworded casually.
 */
function nameFor(from: Quality, to: Quality): string {
  if (MINOR.includes(from) && DOMINANT.includes(to)) return 'ii–V 7-3 resolution'
  if (DOMINANT.includes(from) && DOMINANT.includes(to)) return 'V-of-V 7-3 resolution'
  if (DOMINANT.includes(from) && MAJOR.includes(to)) return 'V–I 7-3 resolution'
  if (DOMINANT.includes(from) && MINOR.includes(to)) return 'V–i 7-3 resolution'
  return '7-3 resolution'
}

/**
 * The b7 of a chord falling to the 3 of the chord a fourth above it: Coker's
 * 7-3 resolution, which Ligon and Owens arrive at independently.
 *
 * The only detector whose subject is a chord *change* — every other one judges
 * notes against the chord they sit on — and the only one permitted to cross an
 * idea boundary. It may, but only when nothing sounds between the two notes: a
 * resolution is legato or it is not one, and a b7 the player breathed after is
 * not heard falling anywhere. Design: specs/2026-09-01-7-3-resolution-design.md.
 */
export function detectResolutions(ctx: NoteContext[]): ResolutionHit[] {
  const hits: ResolutionHit[] = []

  for (let i = 0; i + 1 < ctx.length; i++) {
    const seventh = ctx[i]
    const third = ctx[i + 1]
    if (!seventh.chord || !third.chord) continue
    if (!SEVENTHS.has(seventh.degree ?? '') || third.degree !== '3') continue

    // The whole test: does the second chord's root sit a fourth above the
    // first's? Both degrees can read right and the move still be something else.
    if (third.chord.rootPc !== (seventh.chord.rootPc + ROOT_MOVE) % 12) continue

    // On the MIDI numbers, because the degree pair cannot tell a V7 → Imaj
    // half step from the whole step of a V7 → i minor.
    const fall = seventh.note.midi - third.note.midi
    if (fall !== 1 && fall !== 2) continue

    if (seventh.idea !== third.idea) {
      const gap = third.note.onset - (seventh.note.onset + seventh.note.duration)
      if (gap >= MIN_REST) continue
    }

    hits.push({
      index: i,
      name: nameFor(seventh.chord.quality, third.chord.quality),
      degrees: [seventh.degree as string, '3'],
      quality: seventh.chord.quality,
      fall,
    })
  }

  return hits
}
