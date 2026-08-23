import type { Score } from '../core/types.ts'
import type { Analysis } from '../analyse/index.ts'
import { throughCycleOfFourths, overChanges } from './transform.ts'
import type { Exercise } from './transform.ts'
import { isValid } from './validity.ts'

export type { Exercise, ExerciseBar, ExerciseEvent, BarChord, Transformation } from './transform.ts'

export interface GenerateOptions {
  maxFindings?: number
}

/**
 * Turn the strongest findings into exercises, keeping only those that still
 * contain the vocabulary they claim to drill.
 *
 * Findings without a degree string — target devices and raw recurring interval
 * cells — produce nothing here yet. They are still reported by analyse().
 */
export function generateExercises(
  analysis: Analysis,
  score: Score,
  options: GenerateOptions = {},
): Exercise[] {
  const maxFindings = options.maxFindings ?? 5
  const chords = score.chordTracks[0]?.chords ?? []
  const out: Exercise[] = []

  const candidates = analysis.findings.filter((f) => f.degrees && f.quality).slice(0, maxFindings)

  for (const finding of candidates) {
    const generated = [
      throughCycleOfFourths(finding, score.instrument),
      overChanges(finding, chords, score.instrument),
    ]
    for (const exercise of generated) {
      if (exercise && isValid(exercise, finding)) out.push(exercise)
    }
  }

  return out
}
