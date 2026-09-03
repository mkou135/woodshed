import type { Score } from '../../core/types.ts'
import { barLabel } from '../../core/bars.ts'
import type { PracticeUnit, Step } from '../unit.ts'
import { barSpans, namedCells } from '../describe.ts'

/**
 * Bergonzi's off-horn step (Inside Improvisation vol. 1, ch. 3): run the
 * cell through the changes in your head, away from the instrument. The one
 * step with no exercise — it carries cues the engine already knows and a
 * single check against the record. It sits after Through, once the player
 * knows where else in the tune the line belongs, and before Vary. Faculty
 * surveyed put memorising above notating (pedagogy note §1.6); this is the
 * step that asks for it.
 */
export function visualiseStep(unit: Omit<PracticeUnit, 'steps'>, score: Score): Extract<Step, { kind: 'visualise' }> {
  const cues: string[] = []
  cues.push(`The changes: ${unit.summary.chords.join(' → ')}.`)

  const named = namedCells(unit)
  if (named.length > 0) {
    const what = named.length === 1 ? named[0] : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`
    const landing = unit.summary.landing ? `, landing on the ${unit.summary.landing}` : ''
    cues.push(`Hear the ${what}${landing}.`)
  } else {
    cues.push('Hear the line as played, every note.')
  }

  if (unit.summary.alsoAt.length > 0) {
    cues.push(`Then hear it where it comes back: bar${unit.summary.alsoAt.length > 1 ? 's' : ''} ${barSpans(unit.summary.alsoAt)}.`)
  }

  cues.push(`Check one thing against the record at bar ${barLabel(score, unit.notes[0].bar)} — the note you were least sure of.`)

  return {
    kind: 'visualise',
    cues,
    prompt:
      'Away from the horn. Close the score, hear the line over its changes, then move it through the tune in your head — ' +
      'pitches, rhythm, where it lands. Ten minutes of this is worth more than it feels like; only then pick the instrument back up.',
  }
}
