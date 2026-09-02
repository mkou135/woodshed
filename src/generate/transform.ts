import { semitonesOfDegree, qualityFamily } from '../core/pitch.ts'
import type { Chord, Instrument, Quality } from '../core/types.ts'
import type { Finding } from '../analyse/index.ts'
import { orderingsOf } from '../analyse/detectors/shapes.ts'
import { barContains } from './validity.ts'

/** A note or rest with a real duration, in ticks. */
export interface ExerciseEvent {
  /** null is a rest. */
  midi: number | null
  duration: number
  /** Drawn small: a target to write towards, not a note to play. */
  cue?: boolean
}

export interface BarChord {
  /** Ticks from the start of the bar. */
  onset: number
  rootPc: number
  quality: Quality
}

export interface ExerciseBar {
  rootPc: number
  quality: Quality
  /** The cell as even eighths. Used when `events` is absent. */
  midis: number[]
  /** Rhythm as played (or as displaced). Overrides `midis` when present. */
  events?: ExerciseEvent[]
  /** Every chord in the bar, when there is more than the one above. */
  chords?: BarChord[]
}

export type Transformation =
  | 'cycle-of-fourths' | 'over-changes' | 'through-tune' | 'loop' | 'displace' | 'vary-approach' | 'device' | 'template'
  | 'permutation'

export interface Exercise {
  id: string
  title: string
  findingId: string
  findingName: string
  transformation: Transformation
  bars: ExerciseBar[]
  sourceBar: number
  rationale: string
  timeSig?: [number, number]
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

/**
 * Bergonzi's page: the same four notes, in one octave of the root, in other
 * orders. The order as played comes first, then the three rotations of the
 * canonical set — one starting on each other degree, his "one from each
 * column". Only a cell the dictionary permutes (`orderingsOf`) gets one, and
 * every bar must re-detect as that lemma (`barHasLemma`, checked by the
 * caller). The intervals are raw degree differences, so a 5 → 1 falls a
 * fifth rather than climbing to the next octave: the set stays one handful.
 */
export function permutationDrill(
  finding: Finding,
  chord: Chord,
  instrument: Instrument,
): Exercise | null {
  const { degrees, quality } = finding
  if (!degrees || !quality) return null
  // A hand-built finding may carry no lemma; the canonical name is one.
  const orders = orderingsOf(finding.lemma ?? finding.name)
  if (!orders) return null
  const canonical = orders[0]
  if (canonical.length !== degrees.length) return null
  // One order per starting degree: the played order stands for its own
  // start, so the rotation beginning on that degree is the one left out.
  const rotations = canonical.map((_, k) => [...canonical.slice(k), ...canonical.slice(0, k)])
  const sequence = [degrees, ...rotations.filter((r) => r[0] !== degrees[0])]

  const bars: ExerciseBar[] = []
  for (const order of sequence) {
    const semis = order.map((d) => semitonesOfDegree(d, quality))
    if (semis.some((x) => x === null)) return null
    const intervals = semis.slice(1).map((x, i) => (x as number) - (semis[i] as number))
    const bar = buildBar(chord.rootPc, chord.quality, order, intervals, instrument)
    if (!bar) return null
    bars.push(bar)
  }

  return {
    id: `${finding.id}-perm`,
    title: 'Same four notes, other orders',
    findingId: finding.id,
    findingName: finding.name,
    transformation: 'permutation',
    bars,
    sourceBar: finding.spans[0]?.bar ?? 0,
    rationale:
      'Bergonzi: a four-note cell is a set, and its orders are the drill. The order you played, then one starting on each other degree — ' +
      'one or two from each column is enough before taking it through the changes.',
  }
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
    // Family is not enough: a maj7 arpeggio is not vocabulary over a sus4 or
    // a dominant, and the validity gate would rightly fail the exercise.
    if (bar && barContains(bar, finding)) bars.push(bar)
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
