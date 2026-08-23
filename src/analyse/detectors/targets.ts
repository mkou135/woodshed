import type { NoteContext } from '../context.ts'

export type TargetKind = 'enclosure' | 'approach'

export interface TargetHit {
  targetIndex: number
  windowStart: number
  kind: TargetKind
  fromBelow: boolean
  stepSize: number
  chromaticCount: number
  score: number
}

const MIN_WINDOW = 2
const MAX_WINDOW = 5
const MIN_TARGET_STRENGTH = 0.3

interface TargetWindow {
  start: number
  size: number
  kind: TargetKind
  chromaticCount: number
}

/**
 * How strongly this note reads as something the player was aiming at.
 * Weighted rather than a boolean gate: a note a sixteenth late is still a
 * target, just a slightly less certain one.
 */
function targetStrength(ctx: NoteContext[], i: number): number {
  const here = ctx[i]
  if (!here.chord || !here.chordTone) return 0

  let strength = 0
  const beat = here.note.beat
  if (beat === 0 || beat === 2) strength += 0.4
  else if (Number.isInteger(beat)) strength += 0.2

  const next = ctx[i + 1]
  if (!next || here.note.duration > next.note.duration) strength += 0.3

  const previous = ctx[i - 1]
  if (!previous || previous.chord !== here.chord) strength += 0.3

  // Thirds and sevenths are what players aim at.
  if (here.degree === '3' || here.degree === '7' || here.degree === 'b7') strength += 0.2

  return Math.min(1, strength)
}

/**
 * The window the line used to reach the target at `i`, or null if there is none.
 *
 * Smallest first, but an enclosure outranks a shorter approach: a line that
 * brackets its target has said something the same notes read one-sidedly do
 * not, and Parker's `G# G C A Bb B` is only an enclosure at three notes back.
 */
function bestWindow(ctx: NoteContext[], i: number): TargetWindow | null {
  let fallback: TargetWindow | null = null

  for (let size = MIN_WINDOW; size <= MAX_WINDOW; size++) {
    const start = i - size
    if (start < 0) continue

    const lead = ctx.slice(start, i)
    if (lead.some((c) => c.chord === null)) continue

    const target = ctx[i]
    const above = lead.some((c) => c.note.midi > target.note.midi)
    const below = lead.some((c) => c.note.midi < target.note.midi)
    if (!above && !below) continue

    const kind: TargetKind = above && below ? 'enclosure' : 'approach'
    const found: TargetWindow = {
      start,
      size,
      kind,
      chromaticCount: lead.filter((c) => c.chromatic).length,
    }
    if (kind === 'enclosure') return found
    if (!fallback) fallback = found
  }

  return fallback
}

/**
 * Find notes the line is aiming at, and describe how it got there.
 *
 * Inverts the usual search: rather than matching figures and asking what they
 * are, it finds targets and describes the approach. That is what catches a
 * multi-note enclosure whose notes are generated around the target rather than
 * drawn from a fixed shape.
 */
export function detectTargets(ctx: NoteContext[]): TargetHit[] {
  const hits: TargetHit[] = []

  for (let i = MIN_WINDOW; i < ctx.length; i++) {
    const target = ctx[i]
    const strength = targetStrength(ctx, i)
    if (strength < MIN_TARGET_STRENGTH) continue

    const stepSize = Math.abs(target.note.midi - ctx[i - 1].note.midi)
    if (stepSize !== 1 && stepSize !== 2) continue

    const best = bestWindow(ctx, i)
    if (!best) continue

    const score = Math.min(
      1,
      strength * 0.5 +
        (best.kind === 'enclosure' ? 0.3 : 0.1) +
        Math.min(0.2, best.chromaticCount * 0.1) -
        (best.size - MIN_WINDOW) * 0.03,
    )

    hits.push({
      targetIndex: i,
      windowStart: best.start,
      kind: best.kind,
      fromBelow: target.note.midi > ctx[i - 1].note.midi,
      stepSize,
      chromaticCount: best.chromaticCount,
      score,
    })
  }

  return hits
}
