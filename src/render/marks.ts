import type { Finding } from '../analyse/index.ts'
import type { PipelineResult } from '../run.ts'
import { writtenBar } from '../core/bars.ts'
import { TICKS_PER_QUARTER } from '../core/types.ts'

/**
 * What the MuseScore plugin draws on a copy of the score. The engine plans
 * (positions, colours, words); the panel executes through MuseScore's
 * cursor API. Pure, so every rule here is testable without MuseScore.
 * Spec: docs/superpowers/specs/2026-09-14-musescore-marks-and-exercises-design.md D1.
 */
export type Mark =
  | { kind: 'colour'; bar: number; beat: number; colour: string; findingId: string }
  | { kind: 'text'; bar: number; beat: number; text: string; placement: 'staff' | 'system'; colour: string }

/**
 * The paper ramp from docs/DESIGN_SYSTEM.md "Marks — the pairs". A copy of
 * the score is a sheet, so its marks take the paper tokens, one host over.
 * Keep in step with `app/style.css`; DESIGN_SYSTEM.md names this file.
 */
export const PAPER = {
  cell: '#0d7c8a',
  device: '#9a6206',
  recurring: '#2e7d4f',
  language: '#7a3bb8',
  phrase: '#b3187a',
  idea: '#0d7c8a',
  warning: '#9a6206',
} as const

/** Same precedence as `app/score.ts` `findingLane`. */
export function findingColour(f: Pick<Finding, 'language' | 'kind' | 'degrees'>): string {
  if (f.language) return PAPER.language
  if (f.kind === 'device') return PAPER.device
  if (f.degrees) return PAPER.cell
  return PAPER.recurring
}

export function markPlan(result: Pick<PipelineResult, 'score' | 'analysis' | 'report'>): Mark[] {
  const { score, analysis, report } = result
  const marks: Mark[] = []
  /** Written bar, or null on a repeat's second pass (the page draws none there either). */
  const printed = (playedBar: number): number | null => {
    const w = writtenBar(score, playedBar)
    return w.pass === 2 ? null : w.bar
  }

  analysis.findings.forEach((f, rank) => {
    const colour = findingColour(f)
    for (const span of f.spans) {
      for (let i = span.startIndex; i <= span.endIndex; i++) {
        const note = analysis.contexts[i].note
        const bar = printed(note.bar)
        if (bar !== null) marks.push({ kind: 'colour', bar, beat: note.beat, colour, findingId: f.id })
      }
      const first = analysis.contexts[span.startIndex].note
      const bar = printed(first.bar)
      if (bar !== null) marks.push({ kind: 'text', bar, beat: first.beat, text: `${rank + 1} · ${f.name}`, placement: 'staff', colour })
    }
  })

  analysis.phrases.forEach((phrase, i) => {
    const first = phrase.notes[0]
    const bar = printed(first.bar)
    if (bar !== null) {
      // A phrase that begins on a rest inside a tuplet is marked at the rest (app/score.ts markPhrases).
      const barStart = first.onset - first.beat * TICKS_PER_QUARTER
      const beat = (phrase.onset - barStart) / TICKS_PER_QUARTER
      marks.push({ kind: 'text', bar, beat, text: String(i + 1), placement: 'system', colour: PAPER.phrase })
    }
    phrase.ideas.forEach((idea, j) => {
      if (j === 0) return
      const note = idea.notes[0]
      const ideaBar = printed(note.bar)
      if (ideaBar !== null) marks.push({ kind: 'text', bar: ideaBar, beat: note.beat, text: `${i + 1}.${j + 1}`, placement: 'system', colour: PAPER.idea })
    })
  })

  for (const a of report.adjustments) {
    if (a.severity === 'info') continue
    const playedBar = 'bar' in a.target ? a.target.bar : a.target.range[0]
    const bar = printed(playedBar)
    if (bar !== null) marks.push({ kind: 'text', bar, beat: 0, text: `⚠ ${a.reason}`, placement: 'staff', colour: PAPER.warning })
  }

  return marks
}
