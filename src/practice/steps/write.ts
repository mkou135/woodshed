import type { Instrument } from '../../core/types.ts'
import type { Exercise, ExerciseBar } from '../../generate/index.ts'
import { exerciseToMusicXml } from '../../render/musicxml.ts'
import { semitonesOfDegree, qualityFamily } from '../../core/pitch.ts'
import { barTicks } from '../tune.ts'
import type { Tune } from '../tune.ts'
import type { PracticeUnit, Step } from '../unit.ts'
import { ingest } from '../../ingest/index.ts'
import { prepare } from '../../prepare/index.ts'
import { analyse } from '../../analyse/index.ts'

/**
 * The tune's changes with the arrival note of each named cell written as a
 * cue on every bar whose chord it fits, and nothing else. The player writes
 * the lines; this only marks where they should land.
 */
export function writeTemplate(
  unit: Omit<PracticeUnit, 'steps'>,
  tune: Tune,
  instrument: Instrument,
  tuneName: string,
): Step[] {
  const cells = unit.findings.filter((f) => f.degrees && f.quality)
  if (cells.length === 0) return []
  const ticks = barTicks(tune.timeSig)
  const mid = Math.round((instrument.writtenRange.lo + instrument.writtenRange.hi) / 2)

  const bars: ExerciseBar[] = tune.bars.map((bar) => {
    const chords = bar.chords
    const events: ExerciseBar['events'] = []
    let position = 0
    for (let i = 0; i < chords.length; i++) {
      const chord = chords[i]
      const next = chords[i + 1]?.onset ?? ticks
      const span = next - Math.max(position, chord.onset)
      const fits = cells.find((f) => qualityFamily(f.quality!) === qualityFamily(chord.quality))
      const degree = fits?.degrees?.[fits.degrees.length - 1]
      const semis = degree ? semitonesOfDegree(degree, chord.quality) : null
      if (semis !== null && semis !== undefined) {
        const midi = mid - ((mid - (chord.rootPc + semis)) % 12 + 12) % 12
        events.push({ midi, duration: Math.min(span, ticks / tune.timeSig[0]), cue: true })
        if (span > ticks / tune.timeSig[0]) events.push({ midi: null, duration: span - ticks / tune.timeSig[0] })
      } else {
        events.push({ midi: null, duration: span })
      }
      position = next
    }
    if (position < ticks) events.push({ midi: null, duration: ticks - position })
    return {
      rootPc: chords[0]?.rootPc ?? 0,
      quality: chords[0]?.quality ?? 'unknown',
      midis: [],
      events,
      chords: chords.map((c) => ({ onset: c.onset, rootPc: c.rootPc, quality: c.quality })),
    }
  })

  const names = [...new Set(cells.map((f) => f.name))]
  const exercise: Exercise = {
    id: `${unit.id}-template`,
    title: `Write your own: ${names.join(', ')} over ${tuneName}`,
    findingId: cells[0].id,
    findingName: cells[0].name,
    transformation: 'template',
    bars,
    sourceBar: unit.notes[0].bar,
    rationale: 'Small notes are targets. Write a line into each one.',
    timeSig: tune.timeSig,
  }
  return [{
    kind: 'write',
    template: exerciseToMusicXml(exercise, instrument),
    prompt:
      `Write three lines of your own using ${names.join(' and ')}, landing on the small notes. ` +
      'Then drop the file back here to check the device is really in them.',
  }]
}

export interface CheckResult {
  /** Names of the unit's cells that reappear in the written file. */
  found: string[]
  missing: string[]
  bars: Record<string, number[]>
}

/** Ingest a written file and report which of the unit's devices reappear. */
export function checkWriting(bytes: Uint8Array, unit: Pick<PracticeUnit, 'findings'>): CheckResult {
  const score = ingest(bytes)
  const analysis = analyse(score, prepare(score))
  const wanted = [...new Set(unit.findings.map((f) => f.name))]
  const bars: Record<string, number[]> = {}
  for (const name of wanted) {
    const hits = analysis.findings.filter((f) => f.name === name)
    bars[name] = [...new Set(hits.flatMap((f) => f.spans.map((s) => s.bar)))].sort((a, b) => a - b)
  }
  return {
    found: wanted.filter((n) => bars[n].length > 0),
    missing: wanted.filter((n) => bars[n].length === 0),
    bars,
  }
}
