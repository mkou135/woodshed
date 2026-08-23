import type { Quality, Score } from '../core/types.ts'
import type { CleanupReport } from '../prepare/index.ts'
import { segment } from './segment.ts'
import type { Phrase } from './segment.ts'
import { contextualise } from './context.ts'
import type { NoteContext } from './context.ts'
import { matchShapes } from './detectors/shapes.ts'
import { detectTargets } from './detectors/targets.ts'
import { findRecurring } from './detectors/recurring.ts'

export interface FindingSpan {
  startIndex: number
  endIndex: number
  bar: number
  beat: number
}

export interface Finding {
  id: string
  kind: 'cell' | 'device'
  name: string
  spans: FindingSpan[]
  degrees?: string[]
  intervals?: number[]
  quality?: Quality
  detectedBy: string[]
  confidence: number
}

export interface Analysis {
  phrases: Phrase[]
  contexts: NoteContext[]
  findings: Finding[]
}

const MAX_DETECTOR_CREDIT = 0.8
const CREDIT_PER_DETECTOR = 0.35
const REPEAT_BONUS = 0.2
const CHORD_WEIGHT = 0.2

export function analyse(score: Score, report: CleanupReport): Analysis {
  const region =
    report.soloists.find((s) => s.name !== 'unknown') ?? report.soloists[0]

  const notes = region
    ? score.notes.filter((n) => n.bar >= region.startBar && n.bar <= region.endBar)
    : score.notes

  const chordTrack = score.chordTracks[0]
  const contexts = contextualise(notes, chordTrack?.chords ?? [])

  const forced = report.form?.chorusStarts ?? []
  const phrases = segment(notes, forced)

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
      quality: hit.quality,
      detectedBy: ['shape'],
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
      confidence: 0,
    })
  }

  for (const hit of findRecurring(contexts)) {
    raw.push({
      id: '',
      kind: 'cell',
      name: `recurring cell [${hit.intervals.join(', ')}]`,
      spans: hit.occurrences.map((start) => spanOf(start, start + hit.intervals.length)),
      intervals: hit.intervals,
      detectedBy: ['recurring'],
      confidence: 0,
    })
  }

  // Merge findings whose spans overlap and which describe the same thing.
  const merged: Finding[] = []
  for (const finding of raw) {
    const match = merged.find(
      (m) =>
        (m.name === finding.name ||
          (m.intervals && finding.intervals &&
            m.intervals.join(',') === finding.intervals.join(','))) &&
        m.spans.some((a) =>
          finding.spans.some((b) => a.startIndex <= b.endIndex && b.startIndex <= a.endIndex),
        ),
    )
    if (match) {
      for (const source of finding.detectedBy) {
        if (!match.detectedBy.includes(source)) match.detectedBy.push(source)
      }
      for (const span of finding.spans) {
        if (!match.spans.some((s) => s.startIndex === span.startIndex)) match.spans.push(span)
      }
    } else {
      merged.push({ ...finding, spans: [...finding.spans] })
    }
  }

  const chordConfidence = chordTrack?.confidence ?? 0

  const findings = merged
    .map((f, i) => ({
      ...f,
      id: `f${i + 1}`,
      confidence: Math.min(
        1,
        Math.min(MAX_DETECTOR_CREDIT, f.detectedBy.length * CREDIT_PER_DETECTOR) +
          (f.spans.length > 1 ? REPEAT_BONUS : 0) +
          chordConfidence * CHORD_WEIGHT,
      ),
    }))
    .sort((a, b) => b.confidence - a.confidence)

  return { phrases, contexts, findings }
}
