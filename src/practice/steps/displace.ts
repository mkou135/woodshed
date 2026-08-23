import { TICKS_PER_QUARTER } from '../../core/types.ts'
import type { Score } from '../../core/types.ts'
import { contextualise } from '../../analyse/context.ts'
import type { Exercise } from '../../generate/index.ts'
import type { PracticeUnit, Step } from '../unit.ts'
import { barTicks } from '../tune.ts'
import { excerpt } from './loop.ts'

/**
 * The same notes and the same relative rhythm, starting somewhere else in
 * the bar. Barry Harris and Galper drill exactly this. Pitches never change,
 * so there is no wrong note to put in anyone's hands; a placement is only
 * dropped when moving the line under its own chords turns the arrival from
 * a chord tone into something else.
 */
const PLACEMENTS: { label: string; offset: number }[] = [
  { label: 'on beat 1', offset: 0 },
  { label: 'on the "and" of 1', offset: TICKS_PER_QUARTER / 2 },
  { label: 'on beat 2', offset: TICKS_PER_QUARTER },
  { label: 'as a pickup into beat 1', offset: -TICKS_PER_QUARTER / 2 },
]

export function displaceStep(unit: Omit<PracticeUnit, 'steps'>, score: Score): Extract<Step, { kind: 'displace' }> {
  const ticks = barTicks(score.timeSig)
  const first = unit.notes[0]
  const original = first.onset % ticks
  const exercises: Exercise[] = []

  for (const placement of PLACEMENTS) {
    const offset = ((placement.offset % ticks) + ticks) % ticks
    if (offset === original) continue
    // The smallest move that lands the first note there: a pickup line
    // asked to start on beat 1 moves half a beat later, not three and a
    // half earlier, so it stays under the chords it was played on.
    let shift = offset - original
    if (shift > ticks / 2) shift -= ticks
    if (shift < -ticks / 2) shift += ticks
    const moved = unit.notes.map((n) => ({ ...n, onset: n.onset + shift }))
    // Keep the arrival honest under the chords that were there.
    if (unit.arrival?.chordTone && unit.harmony.length > 0) {
      const chords = unit.harmony.map((c) => ({ ...c }))
      const ctx = contextualise(moved, chords)
      if (!ctx[ctx.length - 1].chordTone) continue
    }
    const bars = excerpt(moved, unit.harmony, score.timeSig, offset)
    exercises.push({
      id: `${unit.id}-displace-${exercises.length + 1}`,
      title: `Start it ${placement.label}`,
      findingId: unit.findings[0]?.id ?? '',
      findingName: unit.findings[0]?.name ?? '',
      transformation: 'displace',
      bars,
      sourceBar: first.bar,
      rationale: 'Same notes, same rhythm, a different place in the bar.',
      timeSig: score.timeSig,
    })
  }

  return {
    kind: 'displace',
    exercises,
    prompt:
      'Same notes and rhythm, moved in the bar. Then on your own: start it on a different ' +
      'chord tone, play its rhythm on one note, reverse the contour, split it and recombine the halves.',
  }
}
