import type { Chord, Score } from '../core/types.ts'
import type { Adjustment } from './adjustments.ts'

export interface FormResult {
  periodBars: number
  agreement: number
  method: 'absolute' | 'relative'
  chorusStarts: number[]
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

  const chorusStarts: number[] = []
  for (let bar = 1; bar + hit.period - 1 <= score.barCount; bar += hit.period) {
    chorusStarts.push(bar)
  }

  const rehearsalBars = score.marks
    .filter((m) => m.kind === 'rehearsal')
    .map((m) => m.bar)
  const agreesWithMarks =
    rehearsalBars.length >= 2 &&
    rehearsalBars.every((b) => (b - rehearsalBars[0]) % hit.period === 0)

  return {
    periodBars: hit.period,
    agreement: hit.agreement,
    method,
    chorusStarts,
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
