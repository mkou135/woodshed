import type { Chord, Score } from '../core/types.ts'
import type { Adjustment } from './adjustments.ts'

export interface FormResult {
  periodBars: number
  agreement: number
  method: 'absolute' | 'relative'
  chorusStarts: number[]
  /** Which marks fixed the phase (rehearsal letters beat double bars). */
  phaseFrom: 'rehearsal' | 'double-bar' | 'none'
  /** True when the marks that set the phase all sit a whole number of periods apart. */
  agreesWithMarks: boolean
}

const MIN_AGREEMENT = 0.75
const MIN_BARS = 8

/** One symbol per bar; a bar with no chord inherits the previous one. */
function barSymbols(score: Score): string[] {
  const track = score.chordTracks[0]
  if (!track) return []

  const byBar = new Map<number, Chord[]>()
  for (const c of track.chords) {
    const list = byBar.get(c.bar) ?? []
    list.push(c)
    byBar.set(c.bar, list)
  }

  const out: string[] = []
  let last: string | null = null
  for (let bar = 1; bar <= score.barCount; bar++) {
    const here = byBar.get(bar)
    if (here) last = here.map((c) => `${c.rootPc}:${c.quality}`).join('|')
    if (last !== null) out.push(last)
  }
  return out
}

/** Root of each bar's first chord, as a pitch class. */
function barRoots(score: Score): number[] {
  const track = score.chordTracks[0]
  if (!track) return []
  const byBar = new Map<number, number>()
  for (const c of track.chords) if (!byBar.has(c.bar)) byBar.set(c.bar, c.rootPc)

  const out: number[] = []
  let last: number | null = null
  for (let bar = 1; bar <= score.barCount; bar++) {
    const here = byBar.get(bar)
    if (here !== undefined) last = here
    if (last !== null) out.push(last)
  }
  return out
}

function smallestPeriod<T>(items: T[]): { period: number; agreement: number } | null {
  for (let p = 2; p <= Math.floor(items.length / 2); p++) {
    const comparisons = items.length - p
    if (comparisons <= 0) break
    let matches = 0
    for (let i = 0; i < comparisons; i++) if (items[i] === items[i + p]) matches++
    const agreement = matches / comparisons
    if (agreement > MIN_AGREEMENT) return { period: p, agreement }
  }
  return null
}

/**
 * Autocorrelation gives the period but not the phase. Marks give the phase:
 * a chorus starts on a marked bar. Rehearsal letters are the stronger
 * evidence (letter A is conventionally the head), double bars the fallback —
 * both mark section ends, so the chorus start is the earliest mark whose
 * congruent marks (mod period) include at least one other mark.
 * See docs/research/notation-conventions.md.
 */
function phase(
  score: Score,
  period: number,
): { firstStart: number; phaseFrom: FormResult['phaseFrom']; agreesWithMarks: boolean } {
  for (const kind of ['rehearsal', 'double-bar'] as const) {
    const bars = [...new Set(score.marks.filter((m) => m.kind === kind).map((m) => m.bar))]
      .sort((a, b) => a - b)
    if (bars.length < 2) continue
    for (const b of bars) {
      const aligned = bars.filter((x) => (x - b) % period === 0)
      if (aligned.length >= 2) {
        // Bars before b are an intro (or a head shorter than a chorus).
        return { firstStart: b, phaseFrom: kind, agreesWithMarks: true }
      }
    }
  }
  return { firstStart: 1, phaseFrom: 'none', agreesWithMarks: false }
}

/**
 * Recover the chorus length from the changes. Tries absolute roots first, then
 * root intervals — the latter catches forms that transpose each chorus, which
 * absolute matching cannot see at all.
 */
export function detectForm(score: Score): FormResult | null {
  const symbols = barSymbols(score)
  if (symbols.length < MIN_BARS) return null

  let method: 'absolute' | 'relative' = 'absolute'
  let hit = smallestPeriod(symbols)

  if (!hit) {
    const roots = barRoots(score)
    const intervals: number[] = []
    for (let i = 0; i < roots.length - 1; i++) {
      intervals.push(((roots[i + 1] - roots[i]) % 12 + 12) % 12)
    }
    hit = smallestPeriod(intervals)
    method = 'relative'
  }

  if (!hit) return null

  const { firstStart, phaseFrom, agreesWithMarks } = phase(score, hit.period)

  const chorusStarts: number[] = []
  for (let bar = firstStart; bar + hit.period - 1 <= score.barCount; bar += hit.period) {
    chorusStarts.push(bar)
  }

  return {
    periodBars: hit.period,
    agreement: hit.agreement,
    method,
    chorusStarts,
    phaseFrom,
    agreesWithMarks,
  }
}

export function formAdjustments(form: FormResult | null, score: Score): Adjustment[] {
  if (!form) return []
  return [
    {
      kind: 'form-period',
      severity: 'info',
      target: { range: [1, score.barCount] },
      after: form,
      reason:
        `Detected a ${form.periodBars}-bar form by ${form.method} root matching ` +
        `(${Math.round(form.agreement * 100)}% agreement)` +
        (form.agreesWithMarks ? ', consistent with the rehearsal marks.' : '.'),
      decidedBy: 'engine',
      confidence: form.agreesWithMarks ? 0.95 : form.agreement,
    },
  ]
}
