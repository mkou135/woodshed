import { semitonesOfDegree, qualityFamily } from '../core/pitch.ts'
import type { Chord, Instrument, Quality } from '../core/types.ts'
import type { Finding } from '../analyse/index.ts'

export interface ExerciseBar {
  rootPc: number
  quality: Quality
  midis: number[]
}

export interface Exercise {
  id: string
  title: string
  findingId: string
  findingName: string
  transformation: 'cycle-of-fourths' | 'over-changes'
  bars: ExerciseBar[]
  sourceBar: number
  rationale: string
}

/** Shift the whole cell by octaves so it fits the horn without changing shape. */
function clampOctave(midis: number[], instrument: Instrument): number[] {
  let out = [...midis]
  let guard = 0
  while (Math.min(...out) < instrument.writtenRange.lo && guard++ < 8) {
    out = out.map((m) => m + 12)
  }
  guard = 0
  while (Math.max(...out) > instrument.writtenRange.hi && guard++ < 8) {
    out = out.map((m) => m - 12)
  }
  return out
}

function buildBar(
  rootPc: number,
  quality: Quality,
  degrees: string[],
  intervals: number[],
  instrument: Instrument,
): ExerciseBar | null {
  const firstSemis = semitonesOfDegree(degrees[0], quality)
  if (firstSemis === null) return null

  const midis = [60 + rootPc + firstSemis]
  for (const interval of intervals) midis.push(midis[midis.length - 1] + interval)

  return { rootPc, quality, midis: clampOctave(midis, instrument) }
}

function intervalsFor(finding: Finding): number[] | null {
  if (finding.intervals) return finding.intervals
  if (!finding.degrees || !finding.quality) return null
  const semis = finding.degrees.map((d) => semitonesOfDegree(d, finding.quality as Quality))
  if (semis.some((s) => s === null)) return null
  const out: number[] = []
  for (let i = 0; i < semis.length - 1; i++) {
    out.push((semis[i + 1] as number) - (semis[i] as number))
  }
  return out
}

export function throughCycleOfFourths(
  finding: Finding,
  instrument: Instrument,
): Exercise | null {
  const { degrees, quality } = finding
  if (!degrees || !quality) return null
  const intervals = intervalsFor(finding)
  if (!intervals) return null

  // Start from C and walk the cycle; the original key is not what is drilled.
  const bars: ExerciseBar[] = []
  for (let i = 0; i < 12; i++) {
    const bar = buildBar((i * 5) % 12, quality, degrees, intervals, instrument)
    if (bar) bars.push(bar)
  }
  if (bars.length === 0) return null

  return {
    id: `${finding.id}-cycle`,
    title: `${finding.name} through the cycle of fourths`,
    findingId: finding.id,
    findingName: finding.name,
    transformation: 'cycle-of-fourths',
    bars,
    sourceBar: finding.spans[0]?.bar ?? 0,
    rationale:
      `Drills ${finding.name}, which you played in bar ${finding.spans[0]?.bar ?? '?'}, ` +
      'in all twelve keys. The degrees stay put while the notes move.',
  }
}

export function overChanges(
  finding: Finding,
  chords: Chord[],
  instrument: Instrument,
): Exercise | null {
  const { degrees, quality } = finding
  if (!degrees || !quality) return null
  const intervals = intervalsFor(finding)
  if (!intervals) return null

  const family = qualityFamily(quality)
  const seen = new Set<string>()
  const bars: ExerciseBar[] = []

  for (const chord of chords) {
    if (qualityFamily(chord.quality) !== family) continue
    const key = `${chord.rootPc}:${chord.quality}`
    if (seen.has(key)) continue
    seen.add(key)
    const bar = buildBar(chord.rootPc, chord.quality, degrees, intervals, instrument)
    if (bar) bars.push(bar)
    if (bars.length >= 8) break
  }
  if (bars.length === 0) return null

  return {
    id: `${finding.id}-changes`,
    title: `${finding.name} over the tune's changes`,
    findingId: finding.id,
    findingName: finding.name,
    transformation: 'over-changes',
    bars,
    sourceBar: finding.spans[0]?.bar ?? 0,
    rationale:
      `Applies ${finding.name} to every ${family} chord in this tune, so you drill ` +
      'your own vocabulary over the harmony you lifted it from.',
  }
}
