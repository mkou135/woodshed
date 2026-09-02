import type { Finding } from '../analyse/index.ts'
import type { UnitSummary } from './unit.ts'

/**
 * What a player is told an idea is.
 *
 * `Finding.name` is an identity — the merge passes compare it, the generators
 * match on it, exercise titles embed it — so it can never be written for a
 * reader. Where the engine has no word for a shape that name is an interval
 * vector, which is the notes with the readability taken out. This module is
 * the only place that turns findings into prose, so the CLI, the desk and the
 * all-ideas table say the same thing in the same voice.
 *
 * The agent may rename a finding it recognises (DECISIONS 2026-08-25 "Agent
 * layer scope" lists *name* among the judgments it may cast). Its names arrive
 * per finding, never per verdict: the narrate prompt asks for "each finding
 * worth naming", so partial coverage is the normal case and the engine's own
 * name is the fallback.
 */
export type TeacherNames = Map<string, string>

/** All these functions need of a unit: what was found in it, and where it sits. */
export interface Described {
  findings: Finding[]
  summary: UnitSummary
}

/** The `findingNames` verdict as a lookup; anything falsy means no agent ran. */
export function teacherNames(named?: { id: string; name: string }[] | null): TeacherNames {
  return new Map((named ?? []).map((f) => [f.id, f.name]))
}

/**
 * The name to show, or null when the engine detected a shape it cannot name.
 *
 * An agent name arrives as "what it is — why it matters" (the narrate prompt
 * asks for the four-part shape on one line), which is a sentence where a table
 * row wants a name: `terse` keeps the half before the dash. The engine's own
 * names carry no dash and are unaffected.
 */
export function displayName(finding: Finding, names?: TeacherNames, terse = false): string | null {
  const teacher = names?.get(finding.id)
  if (teacher) return terse ? teacher.split(' — ')[0] : teacher
  if (finding.unnamed) return null
  // A permuted cell's name carries its order ("… in the order 3-1-2-5") so
  // that each order stays its own identity; a player is told the lemma and
  // reads the order as an aside (`detail`). A triad's orders are each their
  // own figure and keep their names.
  return finding.permuted && finding.lemma ? finding.lemma : finding.name
}

/** The orders a unit's permuted cells were played in, each once, in finding order. */
function permutedOrders(unit: Described): string[] {
  const out: string[] = []
  for (const f of unit.findings) {
    if (!f.permuted || !f.ordering) continue
    if (!out.includes(f.ordering)) out.push(f.ordering)
  }
  return out
}

/**
 * The same four things to say, at two lengths. The desk has room for the
 * clause that tells a player what to make of it; a table row of thirty-four
 * repeats reads better terse.
 */
const FALLBACKS = {
  unnamed: ['A figure the player keeps returning to — the score shows it', 'a figure the player returns to'],
  language: ['Mostly common jazz language — the language, not the player', 'mostly common jazz language'],
  run: ['Mostly a scale run — the language, not the player', 'mostly a scale run'],
  nothing: ['No named vocabulary — still the player’s idea', 'no named vocabulary'],
} as const

/** Distinct display names, strongest first; unnamed findings drop out. */
export function namedCells(unit: Described, names?: TeacherNames, terse = false): string[] {
  const out: string[] = []
  for (const f of [...unit.findings].sort((a, b) => b.confidence - a.confidence)) {
    const name = displayName(f, names, terse)
    if (name && !out.includes(name)) out.push(name)
  }
  return out
}

/**
 * The one clause at the head of an idea: the strongest thing the engine can
 * name, or an honest sentence about why it cannot. Everything else is detail.
 */
export function headline(unit: Described, names?: TeacherNames, terse = false): string {
  const named = namedCells(unit, names, terse)
  if (named.length > 0) return named[0]
  const at = terse ? 1 : 0
  if (unit.findings.length > 0) return FALLBACKS.unnamed[at]
  if (unit.summary.stockKind === 'common-language') return FALLBACKS.language[at]
  return (unit.summary.stock ? FALLBACKS.run : FALLBACKS.nothing)[at]
}

/**
 * The asides, one line each, for a disclosure under the headline. Ordered by
 * what a player asks next: where it lands, how it moves, where else it is.
 */
export function detail(unit: Described, names?: TeacherNames): string[] {
  const out: string[] = []
  const named = namedCells(unit, names)
  for (const name of named.slice(1)) out.push(name)
  for (const order of permutedOrders(unit)) out.push(`played in the order ${order}`)
  if (unit.summary.landing) out.push(`lands on the ${unit.summary.landing}`)
  if (unit.summary.resolves) out.push('its 7 falls to the 3 of the next chord')
  const variants = unit.findings.reduce(
    (n, f) => n + (f.variants?.reduce((m, v) => m + v.occurrences.length, 0) ?? 0), 0)
  if (variants > 0) out.push(`${variants} variant${variants > 1 ? 's' : ''} of the same shape`)
  if (unit.summary.alsoAt.length > 0) out.push(`also at bar${unit.summary.alsoAt.length > 1 ? 's' : ''} ${barSpans(unit.summary.alsoAt)}`)
  // A shape with no name still happened. The headline can only stand for one
  // of them, so the rest are counted rather than silently dropped.
  const unnamed = new Set(unit.findings.filter((f) => !displayName(f, names)).map((f) => f.name)).size
  const rest = unnamed - (named.length > 0 ? 0 : 1)
  if (rest > 0) {
    const more = named.length > 0 ? '' : 'more '
    out.push(`${rest} ${more}shape${rest > 1 ? 's' : ''} the engine cannot name`)
  }
  return out
}

/**
 * Printed bar labels with consecutive runs collapsed: twelve numbers become
 * three tokens. A label that is not a plain number ("17 (2nd time)") never
 * joins a run — it is its own token, because arithmetic on it would lie.
 */
export function barSpans(labels: string[]): string {
  const out: string[] = []
  let runStart: string | null = null
  let runEnd: string | null = null
  const flush = (): void => {
    if (runStart === null) return
    out.push(runStart === runEnd ? runStart : `${runStart}–${runEnd}`)
    runStart = runEnd = null
  }
  for (const label of labels) {
    const n = /^\d+$/.test(label) ? Number(label) : null
    if (n !== null && runEnd !== null && /^\d+$/.test(runEnd) && n === Number(runEnd) + 1) {
      runEnd = label
      continue
    }
    flush()
    if (n === null) out.push(label)
    else { runStart = label; runEnd = label }
  }
  flush()
  return out.join(', ')
}
