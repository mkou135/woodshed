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

export interface SegmentOptions {
  /** A rest this long (ticks) is a boundary on its own. */
  fullRest: number
  /** Below this (ticks), a gap is articulation, not a rest. */
  minRest: number
  wRest: number
  wLength: number
  wLeap: number
  threshold: number
  /**
   * A held note starts to count at `lengthFrom` times the median duration
   * and counts fully at `lengthFull` times. The earlier corpus probe used a
   * hard rule at 2x and it shattered phrases; a quarter among eighths is not
   * an arrival, a half note usually is.
   */
  lengthFrom: number
  lengthFull: number
  /** GPR 1: a group this small is absorbed into a neighbour. */
  minGroup: number
  /**
   * A gap at least this long (ticks) that does not reach the phrase
   * threshold still opens a new idea. In the Weimar annotations a short
   * rest is the single strongest idea cue (58% of idea boundaries).
   */
  ideaRest: number
  /**
   * Idea profile: a change of rhythmic vocabulary across the gap (the
   * typical duration of the notes before vs after, log-ratio, full at a
   * doubling) opens an idea with no rest or held note at all.
   */
  wRhythm: number
  /**
   * Rest weight in the idea profile. A rest too short to end a phrase
   * still opens an idea when it comes with a held note or a leap; at WJD
   * idea boundaries inside a phrase a short rest is 4x as common as elsewhere.
   */
  wIdeaRest: number
  /** Notes compared on each side of the gap for the rhythm cue. */
  rhythmWindow: number
  /** An idea opens when the idea profile reaches this. */
  ideaThreshold: number
  /**
   * Local peak picking: a gap below the threshold still counts when it is
   * at least `peakMin`, the strongest within `peakWindow` gaps either side,
   * and `peakRatio` times the mean strength there. 0 = off.
   */
  peakMin: number
  peakRatio: number
  peakWindow: number
}

export const DEFAULTS: SegmentOptions = {
  fullRest: TICKS_PER_QUARTER,
  minRest: TICKS_PER_QUARTER / 4,
  // Tuned against the Weimar Jazz Database (scripts/eval-wjd.ts): phrase
  // boundaries F1 83.8, idea boundaries F1 76.3 on 456 solos, within 0.6
  // of the best setting found while keeping a long-held note (6x the
  // median — three beats among eighths) as an idea cue on its own, which
  // the owner hears. See docs/research/phrases-and-ideas.md.
  wRest: 0.6,
  wLength: 0.45,
  wLeap: 0.25,
  threshold: 0.45,
  lengthFrom: 2,
  lengthFull: 6,
  minGroup: 3,
  ideaRest: Infinity,
  wRhythm: 0,
  wIdeaRest: 0,
  rhythmWindow: 4,
  ideaThreshold: 0.45,
  peakMin: 0.35,
  peakRatio: 2.5,
  peakWindow: 4,
}

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
  rhythm: number
  /** The silence after the note, in ticks. */
  gap: number
  /** Phrase profile. */
  total: number
  /** Idea profile: no rest term. */
  idea: number
}

/** Typical duration of a run of notes: the median. */
function typicalDuration(notes: Note[]): number {
  return median(notes.map((n) => n.duration))
}

/** 0 when the notes either side share a typical duration, 1 at a doubling or halving. */
function rhythmChange(notes: Note[], i: number, window: number): number {
  const before = notes.slice(Math.max(0, i + 1 - window), i + 1)
  const after = notes.slice(i + 1, i + 1 + window)
  if (before.length < 2 || after.length < 2) return 0
  const a = typicalDuration(before)
  const b = typicalDuration(after)
  if (a <= 0 || b <= 0) return 0
  // Only a change between two *steady* vocabularies counts; a lone long
  // note inside a run of eighths is the held-note cue's business.
  const steady = (run: Note[], typical: number): number =>
    run.filter((n) => Math.abs(Math.log2(n.duration / typical)) < 0.3).length / run.length
  return Math.min(1, Math.abs(Math.log2(b / a))) * steady(before, a) * steady(after, b)
}

/** How strongly the gap after note i reads as a boundary, by cue. */
export function boundaryCue(
  notes: Note[],
  i: number,
  medianDuration: number,
  o: SegmentOptions = DEFAULTS,
): Cue {
  const here = notes[i]
  const next = notes[i + 1]
  if (!next) return { rest: 1, length: 0, leap: 0, rhythm: 0, gap: 0, total: 1, idea: 0 }

  const gap = Math.max(0, next.onset - (here.onset + here.duration))
  const rest = gap < o.minRest ? 0 : Math.min(1, gap / o.fullRest)

  // Measured against the median so the rule means the same at any tempo.
  const length = medianDuration > 0
    ? Math.min(1, Math.max(0,
      (here.duration / medianDuration - o.lengthFrom) / (o.lengthFull - o.lengthFrom)))
    : 0

  const leap = Math.min(1, Math.max(0, (Math.abs(next.midi - here.midi) - 4) / 8))

  const rhythm = o.wRhythm > 0 ? rhythmChange(notes, i, o.rhythmWindow) : 0

  return {
    rest, length, leap, rhythm, gap,
    total: Math.min(1, o.wRest * rest + o.wLength * length + o.wLeap * leap),
    idea: Math.min(1, o.wIdeaRest * rest + o.wLength * length + o.wLeap * leap + o.wRhythm * rhythm),
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
function enforceMinimum(boundaries: Boundary[], count: number, minGroup: number): Boundary[] {
  const out = [...boundaries]
  let changed = true
  while (changed) {
    changed = false
    for (let b = 0; b <= out.length; b++) {
      const start = b === 0 ? 0 : out[b - 1].at
      const end = b === out.length ? count : out[b].at
      if (end - start >= minGroup) continue
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

export function segment(
  notes: Note[],
  forcedBoundaryBars: number[] = [],
  options: Partial<SegmentOptions> = {},
): Phrase[] {
  if (notes.length === 0) return []
  const o = { ...DEFAULTS, ...options }

  const medianDuration = median(notes.map((n) => n.duration))
  const forced = new Set(forcedBoundaryBars)
  const all: Boundary[] = []

  const cues: Cue[] = []
  for (let i = 0; i < notes.length - 1; i++) cues.push(boundaryCue(notes, i, medianDuration, o))
  const isPeak = (i: number): boolean => {
    if (o.peakMin <= 0 || cues[i].total < o.peakMin) return false
    let sum = 0
    let n = 0
    for (let k = Math.max(0, i - o.peakWindow); k <= Math.min(cues.length - 1, i + o.peakWindow); k++) {
      if (k !== i && cues[k].total >= cues[i].total) return false
      sum += cues[k].total
      n++
    }
    return cues[i].total >= o.peakRatio * (sum / n)
  }

  for (let i = 0; i < notes.length - 1; i++) {
    const next = notes[i + 1]
    const cue = cues[i]
    if (cue.total >= o.threshold && cue.rest > 0) {
      all.push({ at: i + 1, strength: cue.total, kind: 'rest' })
    } else if (cue.idea >= o.ideaThreshold || isPeak(i)) {
      all.push({ at: i + 1, strength: cue.idea, kind: 'arrival' })
    } else if (forced.has(next.bar) && notes[i].bar !== next.bar) {
      all.push({ at: i + 1, strength: STRUCTURAL_CONFIDENCE, kind: 'structural' })
    } else if (cue.gap >= o.ideaRest) {
      all.push({ at: i + 1, strength: cue.total, kind: 'arrival' })
    }
  }

  const phraseBoundaries = enforceMinimum(all.filter((b) => b.kind !== 'arrival'), notes.length, o.minGroup)
  const ideaBoundaries = enforceMinimum(all, notes.length, o.minGroup)

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
