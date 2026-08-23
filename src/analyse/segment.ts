import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Note } from '../core/types.ts'

export interface Phrase {
  notes: Note[]
  startBar: number
  endBar: number
  /** Strength of the boundary that *opened* this phrase, 0-1. */
  confidence: number
}

/**
 * A boundary-strength profile in the manner of Cambouropoulos' Local
 * Boundary Detection Model, with the Lerdahl & Jackendoff grouping rules as
 * the cues: a rest or wider gap (GPR 2), a note held longer than its
 * neighbours or a leap away (GPR 3), and never a very small group (GPR 1).
 *
 * Calibrated against the Weimar Jazz Database, where the median phrase is
 * 12 notes, about 2 bars, about 3 seconds, and for wind players "phrase
 * boundaries often coincide with breathing rests" — but not every breath is
 * a phrase end. Blake breathes on eighth rests mid-line.
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
const MIN_PHRASE = 3

const STRUCTURAL_CONFIDENCE = 0.6

function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/** How strongly the gap after note i reads as a phrase end. */
export function boundaryStrength(notes: Note[], i: number, medianDuration: number): number {
  const here = notes[i]
  const next = notes[i + 1]
  if (!next) return 1

  const gap = Math.max(0, next.onset - (here.onset + here.duration))
  const rest = gap < MIN_REST ? 0 : Math.min(1, gap / FULL_REST)

  // A note held well beyond the local norm reads as an arrival. Measured
  // against the median so the rule means the same at any tempo or feel.
  const length = medianDuration > 0
    ? Math.min(1, Math.max(0,
      (here.duration / medianDuration - LENGTH_FROM) / (LENGTH_FULL - LENGTH_FROM)))
    : 0

  const leap = Math.min(1, Math.max(0, (Math.abs(next.midi - here.midi) - 4) / 8))

  return Math.min(1, W_REST * rest + W_LENGTH * length + W_LEAP * leap)
}

interface Boundary {
  /** Index of the first note of the new phrase. */
  at: number
  strength: number
}

export function segment(notes: Note[], forcedBoundaryBars: number[] = []): Phrase[] {
  if (notes.length === 0) return []

  const medianDuration = median(notes.map((n) => n.duration))
  const forced = new Set(forcedBoundaryBars)
  const boundaries: Boundary[] = []

  for (let i = 0; i < notes.length - 1; i++) {
    const next = notes[i + 1]
    const structural = forced.has(next.bar) && notes[i].bar !== next.bar
    const strength = boundaryStrength(notes, i, medianDuration)
    if (strength >= THRESHOLD) boundaries.push({ at: i + 1, strength })
    else if (structural) boundaries.push({ at: i + 1, strength: STRUCTURAL_CONFIDENCE })
  }

  // GPR 1: dissolve the weaker edge of any group below the minimum size.
  let changed = true
  while (changed) {
    changed = false
    for (let b = 0; b <= boundaries.length; b++) {
      const start = b === 0 ? 0 : boundaries[b - 1].at
      const end = b === boundaries.length ? notes.length : boundaries[b].at
      if (end - start >= MIN_PHRASE) continue
      const left = b > 0 ? boundaries[b - 1] : null
      const right = b < boundaries.length ? boundaries[b] : null
      if (!left && !right) break
      const weaker =
        !left ? right! : !right ? left : left.strength <= right.strength ? left : right
      // A full rest on both sides is a real, if tiny, phrase: leave it.
      if (weaker.strength >= 1) continue
      boundaries.splice(boundaries.indexOf(weaker), 1)
      changed = true
      break
    }
  }

  const phrases: Phrase[] = []
  let start = 0
  let confidence = 1
  for (const boundary of [...boundaries, { at: notes.length, strength: 1 }]) {
    const slice = notes.slice(start, boundary.at)
    phrases.push({
      notes: slice,
      startBar: slice[0].bar,
      endBar: slice[slice.length - 1].bar,
      confidence,
    })
    start = boundary.at
    confidence = boundary.strength
  }
  return phrases
}
