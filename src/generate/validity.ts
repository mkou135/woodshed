import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Chord, Note } from '../core/types.ts'
import { contextualise } from '../analyse/context.ts'
import { matchShapes } from '../analyse/detectors/shapes.ts'
import type { Finding } from '../analyse/index.ts'
import type { Exercise, ExerciseBar } from './transform.ts'

/**
 * Does one generated bar still contain the finding? Re-runs the shape
 * detector on the bar and asks for the same name, so a cell is only
 * certified over a chord it is actually vocabulary for — a major-seventh
 * arpeggio transposed onto a dominant spells the right degrees and is still
 * wrong. Deliberately not a pitch comparison.
 */
export function barContains(bar: ExerciseBar, finding: Finding): boolean {
  if (!finding.degrees || finding.degrees.length === 0) return false
  const chord: Chord = {
    onset: 0,
    bar: 1,
    rootPc: bar.rootPc,
    quality: bar.quality,
    tensions: [],
  }
  const notes: Note[] = bar.midis.map((midi, i) => ({
    midi,
    onset: i * (TICKS_PER_QUARTER / 2),
    duration: TICKS_PER_QUARTER / 2,
    bar: 1,
    beat: i / 2,
  }))
  const ctx = contextualise(notes, [chord])
  return matchShapes(ctx).some(
    (hit) => hit.name === finding.name && hit.degrees.join(',') === finding.degrees!.join(','),
  )
}

/**
 * A transformation is valid for a finding if re-running detection on its
 * output still finds the same finding in every bar.
 *
 * Fails closed: a finding we cannot re-detect is not certified.
 */
export function isValid(exercise: Exercise, finding: Finding): boolean {
  return exercise.bars.length > 0 && exercise.bars.every((bar) => barContains(bar, finding))
}
