import { TICKS_PER_QUARTER } from '../../core/types.ts'
import type { Instrument, Note } from '../../core/types.ts'
import type { Exercise, ExerciseBar } from '../../generate/index.ts'
import { exerciseToMusicXml } from '../../render/musicxml.ts'
import { semitonesOfDegree, qualityFamily } from '../../core/pitch.ts'
import { barTicks } from '../tune.ts'
import type { Tune } from '../tune.ts'
import type { PracticeUnit, Step } from '../unit.ts'
import { lineContains } from '../../generate/validity.ts'
import { augment, edit, fragment } from '../variations.ts'
import { excerpt } from './loop.ts'
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
  // Worked examples: the line varied by a compositional device, as models of
  // what "write your own" means. Only device outputs the cell survives are
  // shown (Ligon's taxonomy; Bergonzi's editing).
  const examples: Exercise[] = []
  const survives = (line: Note[]): boolean => cells.some((f) => lineContains(line, unit.harmony, f))
  const example = (title: string, cue: string, line: Note[]): Exercise => ({
    id: `${unit.id}-device-${examples.length + 1}`,
    title,
    findingId: cells[0].id,
    findingName: cells[0].name,
    transformation: 'device',
    bars: excerpt(line, unit.harmony, tune.timeSig, line[0].onset % barTicks(tune.timeSig)),
    sourceBar: unit.notes[0].bar,
    rationale: cue,
    timeSig: tune.timeSig,
  })
  if (unit.notes.length >= 4 && unit.harmony.length > 0) {
    for (const take of ['prefix', 'suffix'] as const) {
      const f = fragment(unit.notes, take)
      if (f && survives(f)) {
        examples.push(example(`Fragmented: the ${take === 'prefix' ? 'opening' : 'closing'} ${f.length} notes alone`, 'A riff you can place anywhere — the fragment is a line of its own.', f))
        break
      }
    }
    const median = [...unit.notes].map((n) => n.duration).sort((a, b) => a - b)[Math.floor(unit.notes.length / 2)]
    const factor = median >= TICKS_PER_QUARTER ? 0.5 : 2
    const a = augment(unit.notes, factor)
    if (survives(a)) {
      examples.push(example(factor === 2 ? 'Augmented ×2' : 'Diminished ÷2', 'Same line at half or double speed against the same bar — the shape survives the tempo of its own notes.', a))
    }
    const e = edit(unit.notes, true)
    if (e) {
      const kept = e.notes.filter((n): n is Note => n !== null)
      if (survives(kept)) {
        examples.push(example('Edited: notes removed', 'Bergonzi: listen for the spaces they leave — the silence is a solo unto itself.', kept))
      }
    }
  }

  return [{
    kind: 'write',
    template: exerciseToMusicXml(exercise, instrument),
    examples,
    prompt:
      `${examples.length > 0 ? `${examples.length === 1 ? 'One way' : `${examples.length} ways`} the line already knows how to change — now write a fourth. ` : ''}` +
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
