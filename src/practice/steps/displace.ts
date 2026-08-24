import { TICKS_PER_QUARTER } from '../../core/types.ts'
import type { Score } from '../../core/types.ts'
import type { Exercise } from '../../generate/index.ts'
import type { PracticeUnit, Step } from '../unit.ts'
import { barTicks } from '../tune.ts'
import { excerpt } from './loop.ts'

/**
 * The same line and harmonic frame, starting somewhere else in the bar.
 * Crook treats this as a metric-feel exercise: isolate the time placement
 * while the pitches, rhythm and chord relationships stay fixed.
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
    const movedHarmony = unit.harmony.map((chord) => ({
      ...chord,
      onset: chord.onset + shift,
      bar: Math.floor((chord.onset + shift) / ticks) + 1,
    }))
    const bars = excerpt(moved, movedHarmony, score.timeSig, offset)
    exercises.push({
      id: `${unit.id}-displace-${exercises.length + 1}`,
      title: `Start it ${placement.label}`,
      findingId: unit.findings[0]?.id ?? '',
      findingName: unit.findings[0]?.name ?? '',
      transformation: 'displace',
      bars,
      sourceBar: first.bar,
      rationale: 'Same line and changes, a different place in the bar — listen to how the metric feel changes.',
      timeSig: score.timeSig,
    })
  }

  return {
    kind: 'displace',
    exercises,
    prompt:
      'Move the line and its changes together so every note keeps its harmonic job. Listen for the new metric feel. ' +
      'Then isolate one variable of your own: play the rhythm on one note, reverse the contour, or split and recombine the halves.',
  }
}
