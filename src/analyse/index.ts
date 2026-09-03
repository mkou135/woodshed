import { chooseSoloist } from '../prepare/soloists.ts'
import type { Note, Quality, Score } from '../core/types.ts'
import type { CleanupReport } from '../prepare/index.ts'
import { segment } from './segment.ts'
import type { Phrase } from './segment.ts'
import { contextualise } from './context.ts'
import type { NoteContext } from './context.ts'
import { matchShapes } from './detectors/shapes.ts'
import { detectTargets } from './detectors/targets.ts'
import { findRecurring } from './detectors/recurring.ts'
import { detectResolutions } from './detectors/resolutions.ts'
import type { ResolutionHit } from './detectors/resolutions.ts'
import type { Variant } from './detectors/recurring.ts'
import { qualityFamily } from '../core/pitch.ts'
import { chordScales } from './chordScale.ts'
import type { ScaleSpan } from './chordScale.ts'
import { profile } from './profile.ts'
import type { SoloProfile } from './profile.ts'

export interface FindingSpan {
  startIndex: number
  endIndex: number
  bar: number
  beat: number
  /**
   * This occurrence ends on a 7 that falls to the 3 of the next chord — or on
   * the note just before it. Ligon's melodic outlines 2 and 3 are our `1357`
   * and `5321` plus exactly that resolution, so the mark is how a cell says
   * what it was for. Per span, because a cell recurring in three bars may
   * resolve in only one.
   */
  resolves?: true
}

export interface Finding {
  id: string
  kind: 'cell' | 'device'
  name: string
  spans: FindingSpan[]
  degrees?: string[]
  intervals?: number[]
  /**
   * For a dictionary cell: what it is ordering aside ("major triad") and the
   * order played ("5-3-1"). Descriptive only — `name` remains the identity.
   */
  lemma?: string
  ordering?: string
  /** The cell was played in a non-canonical order; `name` says which, `describe.ts` says the lemma. */
  permuted?: true
  /** Bent or inverted forms of a recurring cell; their spans are already in `spans`. */
  variants?: Variant[]
  quality?: Quality
  /**
   * The engine detected a shape it has no word for, so `name` is an interval
   * vector — an identity, not something to show a player. `practice/describe.ts`
   * says so in words instead.
   */
  unnamed?: true
  /** Set when the finding is a named cliché from the pedagogy literature. */
  language?: 'bebop'
  /** Share of WJD solos containing this degree pattern, when the mined table has it. */
  lickShare?: number
  detectedBy: string[]
  /**
   * Each detector's own confidence in its best occurrence, 0-1. Shape and
   * recurring hits are binary; a target hit scores itself, and a diatonic
   * two-note approach must not count for as much as a chromatic enclosure.
   */
  weights: Record<string, number>
  confidence: number
}

export interface Analysis {
  phrases: Phrase[]
  contexts: NoteContext[]
  findings: Finding[]
  profile: SoloProfile
  /** The scale each chord is played on; never inferred from the notes. */
  scaleSpans: ScaleSpan[]
}

const MAX_DETECTOR_CREDIT = 0.6
const CREDIT_PER_DETECTOR = 0.3
/** A finding we can name from the dictionary is worth more than an unnamed one. */
const NAMED_BONUS = 0.25
/** A bare triad is stock by definition: a cell shorter than 4 notes never scores as a full figure. */
const SHORT_CELL_FACTOR = 0.65
const REPEAT_BONUS = 0.15
const CHORD_WEIGHT = 0.15
/**
 * The list is a menu the player chooses from, and a menu of twenty-six with
 * a tail of one-off two-note approaches is one nobody reads. Below this a
 * finding is a single weak detector's guess.
 */
const MIN_CONFIDENCE = 0.4

export interface AnalyseOptions {
  /** Agent boundary verdicts for `segment`; absent means the thresholds decide alone. */
  overrides?: Map<number, boolean>
}

/** The notes `analyse` will segment: the chosen soloist's region. */
export function soloistNotes(score: Score, report: CleanupReport): Note[] {
  const region = chooseSoloist(score, report.soloists)
  return region
    ? score.notes.filter((n) => n.bar >= region.startBar && n.bar <= region.endBar)
    : score.notes
}

export function analyse(score: Score, report: CleanupReport, options: AnalyseOptions = {}): Analysis {
  const notes = soloistNotes(score, report)

  const chordTrack = score.chordTracks[0]
  const contexts = contextualise(notes, chordTrack?.chords ?? [])

  const forced = report.form?.chorusStarts ?? []
  const phrases = segment(notes, forced, { overrides: options.overrides }, score.timeSig[0])
  // Detectors look inside phrases: a figure that straddles a phrase boundary
  // is two gestures, not one piece of vocabulary.
  let index = 0
  let idea = 0
  phrases.forEach((phrase, p) => {
    for (const gesture of phrase.ideas) {
      for (let k = 0; k < gesture.notes.length; k++) {
        contexts[index].phrase = p
        contexts[index].idea = idea
        index++
      }
      idea++
    }
  })

  const spanOf = (start: number, end: number): FindingSpan => ({
    startIndex: start,
    endIndex: end,
    bar: contexts[start]?.note.bar ?? 0,
    beat: contexts[start]?.note.beat ?? 0,
  })

  // Collect raw findings from the three detectors, each tagged with its source.
  const raw: Finding[] = []

  for (const hit of matchShapes(contexts)) {
    raw.push({
      id: '',
      kind: 'cell',
      name: hit.name,
      spans: [spanOf(hit.startIndex, hit.startIndex + hit.length - 1)],
      degrees: hit.degrees,
      intervals: hit.intervals,
      lemma: hit.lemma,
      ordering: hit.ordering,
      permuted: hit.permuted,
      quality: hit.quality,
      language: hit.language,
      lickShare: hit.lickShare,
      detectedBy: ['shape'],
      weights: { shape: 1 },
      confidence: 0,
    })
  }

  for (const hit of detectTargets(contexts)) {
    const target = contexts[hit.targetIndex]
    const name =
      `${hit.chromaticCount > 0 ? 'chromatic ' : ''}${hit.kind} into the ` +
      `${target.degree ?? '?'} from ${hit.fromBelow ? 'below' : 'above'}`
    raw.push({
      id: '',
      kind: 'device',
      name,
      spans: [spanOf(hit.windowStart, hit.targetIndex)],
      // Carried so a later re-targeting generator can rebuild the figure from
      // its shape rather than copying literal notes.
      intervals: contexts
        .slice(hit.windowStart, hit.targetIndex + 1)
        .map((c, i, all) => (i === 0 ? 0 : c.note.midi - all[i - 1].note.midi))
        .slice(1),
      detectedBy: ['target'],
      weights: { target: hit.score },
      confidence: 0,
    })
  }

  for (const hit of findRecurring(contexts)) {
    raw.push({
      id: '',
      kind: 'cell',
      name: `recurring cell [${hit.intervals.join(', ')}]` +
        (hit.variants.length ? ` with ${hit.variants.length} variant${hit.variants.length > 1 ? 's' : ''}` : ''),
      unnamed: true,
      spans: hit.occurrences.map((start) => spanOf(start, start + hit.intervals.length)),
      intervals: hit.intervals,
      variants: hit.variants.length ? hit.variants : undefined,
      detectedBy: ['recurring'],
      weights: { recurring: 1 },
      confidence: 0,
    })
  }

  // The only detector that looks across a chord change. Its intervals are the
  // fall itself, so a generator can rebuild the gesture over other changes.
  const resolutions = detectResolutions(contexts)
  for (const hit of resolutions) {
    raw.push({
      id: '',
      kind: 'device',
      name: hit.name,
      spans: [spanOf(hit.index, hit.index + 1)],
      degrees: hit.degrees,
      intervals: [-hit.fall],
      quality: hit.quality,
      detectedBy: ['resolution'],
      weights: { resolution: 1 },
      confidence: 0,
    })
  }

  // Two independent reasons to merge, applied as separate passes. Requiring
  // both at once (the first version of this) breaks each: the same cell in two
  // different bars never merges, and two detectors seeing one event never
  // merge either, which is exactly the convergence signal we score on.
  const merged = mergeByOverlap(mergeByIdentity(raw))
  markResolvingSpans(merged, resolutions)

  const chordConfidence = chordTrack?.confidence ?? 0

  const findings = merged
    .map((f, i) => ({
      ...f,
      id: `f${i + 1}`,
      confidence: (f.degrees && f.degrees.length < 4 ? SHORT_CELL_FACTOR : 1) * Math.min(
        1,
        Math.min(MAX_DETECTOR_CREDIT, detectorCredit(f)) +
          (f.degrees ? NAMED_BONUS : 0) +
          (f.spans.length > 1 ? REPEAT_BONUS : 0) +
          chordConfidence * CHORD_WEIGHT,
      ),
    }))
    .filter((f) => f.confidence >= MIN_CONFIDENCE)
    .sort((a, b) => b.confidence - a.confidence)

  return {
    phrases,
    contexts,
    findings,
    profile: profile({ contexts, phrases, findings, timeSig: score.timeSig, chorusStarts: forced }),
    scaleSpans: chordScales(chordTrack?.chords ?? [], score.keyFifths ?? 0),
  }
}

function detectorCredit(f: Finding): number {
  return f.detectedBy.reduce((sum, d) => sum + CREDIT_PER_DETECTOR * (f.weights[d] ?? 1), 0)
}

/**
 * Do two findings describe the same vocabulary, wherever it occurs?
 *
 * Order matters. A *device* is identified by its procedure and target — an
 * "enclosure into the 5 from above" is the same device however its notes fall,
 * which is the whole reason the device abstraction exists. Comparing interval
 * vectors first would split one device into as many findings as it has shapes.
 * Literal intervals only identify an unnamed recurring cell.
 */
function sameIdentity(a: Finding, b: Finding): boolean {
  // A resolution's subject is a chord change, not notes against one chord —
  // its degree pair and its single-step interval are coincidences waiting to
  // happen against a note-level device's degrees or intervals, not the same
  // vocabulary. Only another resolution finding can be this one.
  if (a.detectedBy.includes('resolution') !== b.detectedBy.includes('resolution')) return false
  if (a.degrees && b.degrees) {
    // Compare the numbering family, not the exact quality: the same cell over
    // an Fm triad and a Cm7 is the same piece of vocabulary.
    return a.degrees.join(',') === b.degrees.join(',') &&
      qualityFamily(a.quality ?? 'unknown') === qualityFamily(b.quality ?? 'unknown')
  }
  if (a.name === b.name) return true
  if (a.intervals && b.intervals) return a.intervals.join(',') === b.intervals.join(',')
  return false
}

function overlaps(a: Finding, b: Finding): boolean {
  return a.spans.some((x) =>
    b.spans.some((y) => x.startIndex <= y.endIndex && y.startIndex <= x.endIndex),
  )
}

function absorb(into: Finding, from: Finding, takeSpans = true): void {
  for (const source of from.detectedBy) {
    if (!into.detectedBy.includes(source)) into.detectedBy.push(source)
    into.weights[source] = Math.max(into.weights[source] ?? 0, from.weights[source] ?? 1)
  }
  if (takeSpans) {
    for (const span of from.spans) {
      if (!into.spans.some((s) => s.startIndex === span.startIndex)) into.spans.push(span)
    }
    into.spans.sort((x, y) => x.startIndex - y.startIndex)
  }
  // Keep whichever description is more informative.
  if (!into.degrees && from.degrees) {
    into.degrees = from.degrees
    into.quality = from.quality
    into.name = from.name
    into.kind = from.kind
    into.lemma = from.lemma
    into.ordering = from.ordering
    into.permuted = from.permuted
    // The name it just took is a real one, so the vector-name flag goes with it.
    delete into.unnamed
  }
  into.language ??= from.language
  into.lickShare ??= from.lickShare
  // Never graft another detector's interval vector onto a cell that already
  // has degrees: the vectors have different lengths, and the generators would
  // build a figure that no longer spells the cell.
  if (!into.intervals && !into.degrees && from.intervals) into.intervals = from.intervals
}

/**
 * Mark each cell occurrence that ends on a resolving 7, or on the note just
 * before one. A finding of its own is what the resolution *is*; this is what
 * the cell before it was *for*, which is the half Ligon's outlines add to our
 * `1357` and `5321`.
 */
export function markResolvingSpans(findings: Finding[], resolutions: ResolutionHit[]): void {
  const resolving = new Set(resolutions.map((h) => h.index))
  for (const finding of findings) {
    if (finding.kind !== 'cell') continue
    for (const span of finding.spans) {
      if (resolving.has(span.endIndex) || resolving.has(span.endIndex + 1)) span.resolves = true
    }
  }
}

/** Pass 1: the same vocabulary recurring, regardless of where. */
function mergeByIdentity(raw: Finding[]): Finding[] {
  const out: Finding[] = []
  for (const finding of raw) {
    const match = out.find((m) => sameIdentity(m, finding))
    if (match) absorb(match, finding)
    else out.push({
      ...finding,
      spans: [...finding.spans],
      detectedBy: [...finding.detectedBy],
      weights: { ...finding.weights },
    })
  }
  return out
}

/**
 * Pass 2: different detectors landing on the same span. This is convergence,
 * and it adds *evidence*, not locations.
 *
 * Absorbing spans here makes findings snowball: a wider span overlaps more
 * findings, which widens it further, until one finding claims the whole solo.
 * Where the vocabulary occurs is settled by pass 1; pass 2 only records who
 * else saw it.
 */
function mergeByOverlap(findings: Finding[]): Finding[] {
  const out: Finding[] = []
  for (const finding of findings) {
    const match = out.find(
      (m) =>
        overlaps(m, finding) &&
        m.detectedBy.some((d) => !finding.detectedBy.includes(d)) &&
        // Same reasoning as sameIdentity: a resolution overlapping a
        // note-level device's span is coincidence, not two detectors seeing
        // the same event.
        m.detectedBy.includes('resolution') === finding.detectedBy.includes('resolution'),
    )
    if (match) absorb(match, finding, false)
    else out.push(finding)
  }
  return out
}
