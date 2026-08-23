import type { Instrument } from '../../core/types.ts'
import { overChanges, throughCycleOfFourths } from '../../generate/transform.ts'
import { isValid } from '../../generate/validity.ts'
import type { Exercise } from '../../generate/index.ts'
import type { PracticeUnit, Step } from '../unit.ts'
import type { Tune } from '../tune.ts'
import { qualityFamily } from '../../core/pitch.ts'

/**
 * Each named cell inside the unit, re-targeted onto every chord of the tune
 * it is vocabulary for. The cycle of fourths stays available but is not the
 * default: Coker prints one key on purpose.
 */
export function throughStep(
  unit: Omit<PracticeUnit, 'steps'>,
  tune: Tune,
  instrument: Instrument,
  tuneName: string,
): Step[] {
  const cells = unit.findings.filter((f) => f.degrees && f.quality)
  if (cells.length === 0) return []

  const chords = tune.bars.flatMap((b, i) => b.chords.map((c) => ({ ...c, bar: i + 1 })))
  const exercises: Exercise[] = []
  const where: string[] = []

  const nowhere: string[] = []
  for (const finding of cells) {
    const over = overChanges(finding, chords, instrument)
    if (!over || !isValid(over, finding)) nowhere.push(finding.name)
    if (over && isValid(over, finding)) {
      over.id = `${unit.id}-${finding.id}-through`
      over.title = `${finding.name} through ${tuneName}`
      exercises.push(over)
      const family = qualityFamily(finding.quality!)
      const bars = chords
        .filter((c) => qualityFamily(c.quality) === family)
        .map((c) => c.bar)
      where.push(`${finding.name}: every ${family} chord in ${tuneName} (bars ${[...new Set(bars)].join(', ')})`)
    }
    const cycle = throughCycleOfFourths(finding, instrument)
    if (cycle && isValid(cycle, finding)) {
      cycle.id = `${unit.id}-${finding.id}-cycle`
      exercises.push(cycle)
    }
  }
  if (exercises.length === 0) return []

  const lines = [
    ...where.map((w) => `${w}.`),
    ...nowhere.map((n) => `No chord in ${tuneName} fits ${n}; the cycle of fourths stands in.`),
    'Play it slowly in each place by ear — think in degrees, not note names — then with a play-along.',
  ]
  if (where.length > 0) lines.push('The cycle-of-fourths version is there when you want all twelve keys.')

  return [{
    kind: 'through',
    tune: tuneName,
    exercises,
    prompt: lines.join(' '),
  }]
}
