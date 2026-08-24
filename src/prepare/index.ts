import type { Score } from '../core/types.ts'
import { summarise } from './adjustments.ts'
import type { Adjustment, Severity } from './adjustments.ts'
import { detectSoloists, soloistAdjustments } from './soloists.ts'
import type { SoloistRegion } from './soloists.ts'
import { detectForm, formAdjustments } from './form.ts'
import type { FormResult } from './form.ts'
import {
  pickupCheck,
  rangeCheck,
  transcriberNoteCheck,
  chordPersistenceCheck,
  repeatCheck,
} from './checks.ts'

export interface CleanupReport {
  soloists: SoloistRegion[]
  form: FormResult | null
  adjustments: Adjustment[]
  counts: Record<Severity, number>
  needsUserDecision: boolean
}

/**
 * Inspect a Score and report everything suspicious about it. Emits Adjustment
 * records describing what should change and why; never mutates the Score.
 *
 * Soloist segmentation runs first: everything downstream inherits its error.
 */
export function prepare(score: Score): CleanupReport {
  const soloists = detectSoloists(score)
  const form = detectForm(score)

  const adjustments: Adjustment[] = [
    ...soloistAdjustments(soloists),
    ...formAdjustments(form, score),
    ...pickupCheck(score),
    ...rangeCheck(score),
    ...transcriberNoteCheck(score),
    ...repeatCheck(score),
    ...chordPersistenceCheck(score, form),
  ]

  const counts = summarise(adjustments)
  return {
    soloists,
    form,
    adjustments,
    counts,
    needsUserDecision: counts.blocking > 0,
  }
}
