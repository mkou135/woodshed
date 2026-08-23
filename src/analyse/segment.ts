import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Note } from '../core/types.ts'

/** A gesture inside a phrase, opened by a held note or a leap rather than a rest. */
export interface Idea {
  notes: Note[]
  /** Strength of the cue that opened this idea, 0-1. */
  confidence: number
}

export interface Phrase {
  notes: Note[]
  startBar: number
  endBar: number
  /** Strength of the boundary that *opened* this phrase, 0-1. */
  confidence: number
  /**
   * Where the phrase begins, in ticks. Usually the first note's onset, but a
   * phrase whose first note sits inside a tuplet or after a sub-eighth rest
   * begins on the beat that group occupies: the rest is part of the idea.
   */
  onset: number
  ideas: Idea[]
}

/**
 * Two levels, because a listener hears two things.
 *
 * A *phrase* ends at a rest: for a wind player, a breath (Weimar: "phrase
 * boundaries often coincide with breathing rests"). Inside a phrase, a note
 * held well beyond the local norm, or a wide leap, ends an *idea* — "three
 * musical ideas chained into one line", as the owner put it about bars
 * 66-71. The first version treated both as phrase ends and was wrong at
 * the held G over bar 120: the closing tag after it is the same phrase.
 *
 * Strengths follow Cambouropoulos' LBDM and the Lerdahl & Jackendoff
 * grouping rules: rest or wider gap (GPR 2), change of length or register
 * (GPR 3), never a very small group (GPR 1). Calibrated against the Weimar
 * Jazz Database, where the median phrase is 12 notes and about 2 bars.
 */

/** A rest this long is a boundary on its own. */
const FULL_REST = TICKS_PER_QUARTER
/** Below this, a gap is articulation, not a rest. */
const MIN_REST = TICKS_PER_QUARTER / 4

const W_REST = 0.6
const W_LENGTH = 0.45
const W_LEAP = 0.15
const THRESHOLD = 0.45
/**
 * A held note starts to count at twice the median duration and counts fully
 * at four times — a half note among eighths. The earlier corpus probe used a
 * hard rule at 2x and it shattered phrases; a quarter note among eighths is
 * not an arrival, a half note usually is.
 */
const LENGTH_FROM = 2
const LENGTH_FULL = 4

/** GPR 1: a group this small is absorbed into a neighbour. */
const MIN_GROUP = 3

const STRUCTURAL_CONFIDENCE = 0.6
const EIGHTH = TICKS_PER_QUARTER / 2

function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export interface Cue {
  rest: number
  length: number
  leap: number
  total: number
}

/** How strongly the gap after note i reads as a boundary, by cue. */
export function boundaryCue(notes: Note[], i: number, medianDuration: number): Cue {
  const here = notes[i]
  const next = notes[i + 1]
  if (!next) return { rest: 1, length: 0, leap: 0, total: 1 }

  const gap = Math.max(0, next.onset - (here.onset + here.duration))
  const rest = gap < MIN_REST ? 0 : Math.min(1, gap / FULL_REST)

  // Measured against the median so the rule means the same at any tempo.
  const length = medianDuration > 0
    ? Math.min(1, Math.max(0,
      (here.duration / medianDuration - LENGTH_FROM) / (LENGTH_FULL - LENGTH_FROM)))
    : 0

  const leap = Math.min(1, Math.max(0, (Math.abs(next.midi - here.midi) - 4) / 8))

  return {
    rest, length, leap,
    total: Math.min(1, W_REST * rest + W_LENGTH * length + W_LEAP * leap),
  }
}

export function boundaryStrength(notes: Note[], i: number, medianDuration: number): number {
  return boundaryCue(notes, i, medianDuration).total
}

interface Boundary {
  /** Index of the first note of the new group. */
  at: number
  strength: number
  /** A rest (or structural) boundary ends a phrase; an arrival ends an idea. */
  kind: 'rest' | 'structural' | 'arrival'
}

/** GPR 1: dissolve the weaker edge of any group below the minimum size. */
function enforceMinimum(boundaries: Boundary[], count: number): Boundary[] {
  const out = [...boundaries]
  let changed = true
  while (changed) {
    changed = false
    for (let b = 0; b <= out.length; b++) {
      const start = b === 0 ? 0 : out[b - 1].at
      const end = b === out.length ? count : out[b].at
      if (end - start >= MIN_GROUP) continue
      const left = b > 0 ? out[b - 1] : null
      const right = b < out.length ? out[b] : null
      if (!left && !right) return out
      const weaker =
        !left ? right! : !right ? left : left.strength <= right.strength ? left : right
      // A full rest on both sides is a real, if tiny, group: leave it.
      if (weaker.strength >= 1) continue
      out.splice(out.indexOf(weaker), 1)
      changed = true
      break
    }
  }
  return out
}

/** The beat a phrase begins on when its first note is inside a tuplet or after a short rest. */
function phraseOnset(first: Note): number {
  if (first.onset % EIGHTH === 0) return first.onset
  return Math.floor(first.onset / TICKS_PER_QUARTER) * TICKS_PER_QUARTER
}

function group<T extends { notes: Note[] }>(
  notes: Note[],
  boundaries: Boundary[],
  make: (slice: Note[], confidence: number) => T,
): T[] {
  const out: T[] = []
  let start = 0
  let confidence = 1
  for (const boundary of [...boundaries, { at: notes.length, strength: 1, kind: 'rest' as const }]) {
    if (boundary.at > start) out.push(make(notes.slice(start, boundary.at), confidence))
    start = boundary.at
    confidence = boundary.strength
  }
  return out
}

export function segment(notes: Note[], forcedBoundaryBars: number[] = []): Phrase[] {
  if (notes.length === 0) return []

  const medianDuration = median(notes.map((n) => n.duration))
  const forced = new Set(forcedBoundaryBars)
  const all: Boundary[] = []

  for (let i = 0; i < notes.length - 1; i++) {
    const next = notes[i + 1]
    const cue = boundaryCue(notes, i, medianDuration)
    if (cue.total >= THRESHOLD) {
      all.push({ at: i + 1, strength: cue.total, kind: cue.rest > 0 ? 'rest' : 'arrival' })
    } else if (forced.has(next.bar) && notes[i].bar !== next.bar) {
      all.push({ at: i + 1, strength: STRUCTURAL_CONFIDENCE, kind: 'structural' })
    }
  }

  const phraseBoundaries = enforceMinimum(all.filter((b) => b.kind !== 'arrival'), notes.length)
  const ideaBoundaries = enforceMinimum(all, notes.length)

  const ideaStarts = new Map(ideaBoundaries.map((b) => [b.at, b.strength]))

  let offset = 0
  return group(notes, phraseBoundaries, (slice, confidence) => {
    const inner: Boundary[] = []
    for (let k = 1; k < slice.length; k++) {
      const strength = ideaStarts.get(offset + k)
      if (strength !== undefined) inner.push({ at: k, strength, kind: 'arrival' })
    }
    offset += slice.length
    return {
      notes: slice,
      startBar: slice[0].bar,
      endBar: slice[slice.length - 1].bar,
      confidence,
      onset: phraseOnset(slice[0]),
      ideas: group(slice, inner, (ideaNotes, ideaConfidence) =>
        ({ notes: ideaNotes, confidence: ideaConfidence })),
    }
  })
}
