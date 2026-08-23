import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Chord, Note } from '../core/types.ts'
import { contextualise } from '../analyse/context.ts'
import type { Finding } from '../analyse/index.ts'
import type { Exercise } from './transform.ts'

/**
 * A transformation is valid for a finding if re-running detection on its
 * output still finds the same finding. "Same" means the same degree string
 * against the same chord family — deliberately not the same pitches.
 *
 * Fails closed: a finding we cannot re-detect is not certified.
 */
export function isValid(exercise: Exercise, finding: Finding): boolean {
  if (!finding.degrees || finding.degrees.length === 0) return false

  return exercise.bars.every((bar) => {
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
    const degrees = contextualise(notes, [chord]).map((c) => c.degree)
    return degrees.join(',') === finding.degrees!.join(',')
  })
}
