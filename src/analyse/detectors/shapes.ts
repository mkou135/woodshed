import { intervalsOf } from '../../core/pitch.ts'
import type { Chord, Quality } from '../../core/types.ts'
import { samePhrase } from '../context.ts'
import type { NoteContext } from '../context.ts'
import { crossKey, singleKey } from '../language.ts'
import { LICK_PATTERNS, LICK_WJD_SOLOS } from '../../data/corpusLicks.ts'

export interface ShapeHit {
  startIndex: number
  length: number
  name: string
  degrees: string[]
  quality: Quality
  /** Semitone steps between the notes as actually played, contour included. */
  intervals: number[]
  /** Set when the entry is a named cliché from the pedagogy literature. */
  language?: 'bebop'
  /** Share of WJD solos containing this degree pattern, when the mined table has it. */
  lickShare?: number
  /**
   * What the cell is, ordering aside: the six triad orders share the lemma
   * "major triad". `name` stays the identity a finding merges and drills by.
   */
  lemma: string
  /** The degrees in the order played, as a player would say them: "5-3-1". */
  ordering: string
}

/**
 * A cell as Bergonzi organises them: a degree set in canonical order, and the
 * orderings the dictionary accepts. Most cells accept only the canonical one;
 * a bare triad accepts all six. Widening a cell to every permutation is a
 * detection change and takes a corpus read (OPEN_QUESTIONS).
 */
interface Cell {
  lemma: string
  /** Canonical degree string, one token per degree ('1357', '35b72'). */
  set: string
  /** Permitted orderings as degree strings; omitted = the canonical order only. */
  orders?: string[]
  /** Name for a given ordering; omitted = the lemma itself. */
  name?: (ordering: string) => string
  qualities: Quality[]
  language?: 'bebop'
}

/** The flat entry the matcher searches: one per permitted ordering. */
interface Entry {
  degrees: string
  name: string
  lemma: string
  /** The chord qualities this cell is vocabulary over. */
  qualities: Quality[]
  language?: 'bebop'
}

const TRIAD_ORDERS = ['135', '153', '315', '351', '513', '531']
const triad = (word: string, qualities: Quality[]): Cell => ({
  lemma: `${word} triad`,
  set: '135',
  orders: TRIAD_ORDERS,
  name: (o) => `${word} triad ${o}`,
  qualities,
})

/** '35b72' → ['3', '5', 'b7', '2']; a degree is an optional accidental and a digit. */
const tokens = (degrees: string): string[] => degrees.match(/[#b]?\d/g) ?? []
const spell = (degrees: string[]): string => degrees.join('-')

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
const CELLS: Cell[] = [
  { lemma: 'digital pattern 1235', set: '1235', qualities: MAJOR_FAMILY },
  { lemma: 'scalar cell 1234', set: '1234', qualities: MAJOR_FAMILY },
  { lemma: '5-3-2-1 descent', set: '5321', qualities: MAJOR_FAMILY },
  { lemma: '3-5-7-9 upper structure', set: '3572', qualities: MAJOR },
  { lemma: '3-5-b7-9 upper structure', set: '35b72', qualities: DOMINANT },
  { lemma: 'major-seventh arpeggio', set: '1357', qualities: MAJOR },
  { lemma: 'dominant seventh arpeggio', set: '135b7', qualities: DOMINANT },
  { lemma: 'dominant b9 cell b7-#9-b9-1', set: 'b7#9b91', qualities: DOMINANT },
  { lemma: 'dominant b9 cell 3-b9-1', set: '3b91', qualities: DOMINANT },
  { lemma: 'dominant b9 cell 1-b9-b7', set: '1b9b7', qualities: DOMINANT },
  // Named clichés from the pedagogy literature (Baker's bebop scales, Owens'
  // Parker formulas) — hand-written degree strings, never quoted from a corpus.
  { lemma: 'bebop dominant descent', set: '17b765', qualities: DOMINANT, language: 'bebop' },
  { lemma: 'bebop major descent', set: '176b135', qualities: MAJOR, language: 'bebop' },
  { lemma: 'b9 diminished arpeggio descent', set: 'b9b753', qualities: DOMINANT, language: 'bebop' },
  { lemma: 'dominant arpeggio 3 to the b9', set: '35b7b9', qualities: DOMINANT, language: 'bebop' },

  { lemma: 'minor cell 1345', set: '1345', qualities: MINOR_FAMILY },
  { lemma: 'minor digital pattern 1235', set: '1235', qualities: MINOR_FAMILY },
  { lemma: '5-3-2-1 descent', set: '5321', qualities: MINOR_FAMILY },
  { lemma: 'major-seventh arpeggio from the b3', set: '3572', qualities: MINOR },
  { lemma: 'minor seventh arpeggio', set: '1357', qualities: MINOR },
  { lemma: 'half-diminished arpeggio', set: '13b57', qualities: ['half-diminished'] },

  // Bare triads, three notes in any order; each order is its own figure to
  // drill. Over a minor chord the third is labelled '3' (context.ts), so the
  // same strings name the minor triad.
  triad('major', MAJOR_FAMILY),
  triad('minor', MINOR_FAMILY),
]

/**
 * The cells flattened to one entry per permitted ordering, in table order —
 * the same list, in the same order, that the dictionary was before it was
 * stated as set + orderings, so `lookup` finds exactly what it found.
 */
const DICTIONARY: Entry[] = CELLS.flatMap((cell) =>
  (cell.orders ?? [cell.set]).map((degrees) => ({
    degrees,
    name: cell.name ? cell.name(spell(tokens(degrees))) : cell.lemma,
    lemma: cell.lemma,
    qualities: cell.qualities,
    language: cell.language,
  })),
)

interface LickSegment {
  degrees: string[]
  qualities: Quality[]
}

/**
 * A cliché spanning one chord change: each segment's degrees sit on its own
 * chord, and the second root lies `rootMove` semitones above the first. The
 * whole window still never crosses an idea boundary.
 */
interface LickEntry {
  name: string
  segments: [LickSegment, LickSegment]
  rootMove: number
}

const LICKS: LickEntry[] = [
  {
    name: 'dominant b9 resolution',
    rootMove: 5,
    segments: [
      { degrees: ['3', 'b9'], qualities: DOMINANT },
      { degrees: ['5'], qualities: MAJOR_FAMILY },
    ],
  },
  {
    name: 'ii–V digital pattern 1235 into 3-5-7-9',
    rootMove: 5,
    segments: [
      { degrees: ['1', '2', '3', '5'], qualities: MINOR },
      { degrees: ['3', '5', 'b7', '2'], qualities: DOMINANT },
    ],
  },
  {
    name: 'V-of-V digital pattern 1235 into 3-5-7-9',
    rootMove: 5,
    segments: [
      { degrees: ['1', '2', '3', '5'], qualities: DOMINANT },
      { degrees: ['3', '5', 'b7', '2'], qualities: DOMINANT },
    ],
  },
]

/** Cell lengths tried, longest first so a shorter hit inside a longer one is dropped. */
const CELL_LENGTHS = [8, 7, 6, 5, 4, 3]

/** WJD document share for a table key, when the mined table knows it. */
function shareFor(key: string | null): number | undefined {
  if (!key || LICK_WJD_SOLOS === 0) return undefined
  const entry = LICK_PATTERNS[key]
  return entry ? entry.wjd / LICK_WJD_SOLOS : undefined
}

/** The dictionary entry a degree string names over this quality, if any. */
export function lookup(degrees: string[], quality: Quality): Entry | undefined {
  const key = degrees.join('')
  return DICTIONARY.find((e) => e.degrees === key && e.qualities.includes(quality))
}

function sameChord(c: Chord | null, chord: Chord): boolean {
  return c !== null && c.rootPc === chord.rootPc && c.quality === chord.quality
}

function overlapsAny(hits: ShapeHit[], start: number, end: number): boolean {
  return hits.some((h) => h.startIndex < end && start < h.startIndex + h.length)
}

function matchLick(ctx: NoteContext[], i: number, lick: LickEntry): ShapeHit | null {
  const [s1, s2] = lick.segments
  const length = s1.degrees.length + s2.degrees.length
  const end = i + length
  if (end > ctx.length) return null
  if (!samePhrase(ctx, i, end - 1)) return null
  const split = i + s1.degrees.length
  const a = ctx[i].chord
  const b = ctx[split].chord
  if (!a || !b) return null
  if (sameChord(b, a)) return null
  if (b.rootPc !== (a.rootPc + lick.rootMove) % 12) return null
  if (!s1.qualities.includes(a.quality) || !s2.qualities.includes(b.quality)) return null
  const first = ctx.slice(i, split)
  const second = ctx.slice(split, end)
  if (!first.every((c, k) => sameChord(c.chord, a) && c.degree === s1.degrees[k])) return null
  if (!second.every((c, k) => sameChord(c.chord, b) && c.degree === s2.degrees[k])) return null
  return {
    startIndex: i,
    length,
    name: lick.name,
    lemma: lick.name,
    ordering: spell([...s1.degrees, ...s2.degrees]),
    degrees: [...s1.degrees, ...s2.degrees],
    quality: a.quality,
    intervals: intervalsOf(ctx.slice(i, end).map((c) => c.note.midi)),
    language: 'bebop',
    lickShare: shareFor(crossKey(s1.degrees, a.quality, s2.degrees, b.quality, lick.rootMove)),
  }
}

export function matchShapes(ctx: NoteContext[]): ShapeHit[] {
  const hits: ShapeHit[] = []

  for (const cellLength of CELL_LENGTHS) {
    // Cross-chord licks of this total length first: at equal length a lick is
    // the more specific claim (it names the chord change too).
    for (const lick of LICKS) {
      if (lick.segments[0].degrees.length + lick.segments[1].degrees.length !== cellLength) continue
      for (let i = 0; i + cellLength <= ctx.length; i++) {
        if (overlapsAny(hits, i, i + cellLength)) continue
        const hit = matchLick(ctx, i, lick)
        if (hit) hits.push(hit)
      }
    }

    for (let i = 0; i + cellLength <= ctx.length; i++) {
      const end = i + cellLength
      // A triad sharing notes with an already-matched longer cell is part of
      // that event (1357 contains 135; 3-5-1 across two 1235s is no triad).
      if (overlapsAny(hits, i, end)) continue
      if (!samePhrase(ctx, i, end - 1)) continue
      const cell = ctx.slice(i, end)
      const chord = cell[0].chord
      if (!chord) continue
      // Same harmony, compared by root and quality rather than object identity:
      // a cell often spans two bars carrying the same chord as separate <harmony>
      // elements, and identity would reject it. A genuine chord change still
      // rejects, because the degrees would then describe two harmonies.
      if (!cell.every((c) => sameChord(c.chord, chord))) continue
      if (cell.some((c) => c.degree === null)) continue

      const degrees = cell.map((c) => c.degree as string)
      const entry = lookup(degrees, chord.quality)
      if (!entry) continue

      hits.push({
        startIndex: i,
        length: cellLength,
        name: entry.name,
        lemma: entry.lemma,
        ordering: spell(degrees),
        degrees,
        quality: chord.quality,
        intervals: intervalsOf(cell.map((c) => c.note.midi)),
        language: entry.language,
        lickShare: entry.language ? shareFor(singleKey(degrees, chord.quality)) : undefined,
      })
    }
  }

  return hits.sort((a, b) => a.startIndex - b.startIndex)
}
