import type { NoteContext } from './context.ts'
import { samePhrase } from './context.ts'
import type { Chord, Quality } from '../core/types.ts'
import { LICK_PATTERNS, LICK_WJD_SOLOS } from '../data/corpusLicks.ts'

/**
 * Degree-pattern keys shared by the corpus:licks mining script and the
 * runtime matchers, so what was counted is exactly what is looked up.
 * Everything here is an exact match on engine-computed degrees — never an
 * inference from pitch content (DECISIONS 2026-08-25 stands).
 */

export type LanguageTable = Record<string, { wjd: number; bop: number }>

/** Single-chord windows are 4-8 notes; cross-chord windows 2-4 notes a side. */
export const SINGLE_MIN = 4
export const SINGLE_MAX = 8
export const SIDE_MIN = 2
export const SIDE_MAX = 4

const MAJ: Quality[] = ['major', 'major-seventh']
const DOM: Quality[] = ['dominant', 'augmented-seventh']
const MIN: Quality[] = ['minor', 'minor-seventh', 'minor-major', 'half-diminished', 'diminished', 'diminished-seventh']

/** Quality collapsed to the three buckets the table is keyed by. */
export function bucket(q: Quality): 'maj' | 'dom' | 'min' | null {
  if (MAJ.includes(q)) return 'maj'
  if (DOM.includes(q)) return 'dom'
  if (MIN.includes(q)) return 'min'
  return null
}

function segment(degrees: (string | null)[], q: Quality): string | null {
  const b = bucket(q)
  if (!b || degrees.some((d) => d === null)) return null
  return `${degrees.join(' ')}@${b}`
}

export function singleKey(degrees: (string | null)[], q: Quality): string | null {
  return segment(degrees, q)
}

export function crossKey(
  d1: (string | null)[], q1: Quality,
  d2: (string | null)[], q2: Quality,
  rootMove: number,
): string | null {
  const a = segment(d1, q1)
  const b = segment(d2, q2)
  return a && b ? `${a}|${b}+${rootMove}` : null
}

export interface LanguageWindow {
  start: number
  end: number
  key: string
}

function sameChord(a: Chord | null, b: Chord | null): boolean {
  return !!a && !!b && a.rootPc === b.rootPc && a.quality === b.quality
}

/**
 * Every window a table key describes: single-chord runs of 4-8 notes, and
 * runs spanning exactly one chord change with 2-4 notes a side. A window
 * never crosses an idea boundary and never includes a null degree.
 */
export function languageWindows(ctx: NoteContext[]): LanguageWindow[] {
  const windows: LanguageWindow[] = []

  for (let len = SINGLE_MIN; len <= SINGLE_MAX; len++) {
    for (let i = 0; i + len <= ctx.length; i++) {
      const cell = ctx.slice(i, i + len)
      const chord = cell[0].chord
      if (!chord || !cell.every((c) => sameChord(c.chord, chord))) continue
      if (!samePhrase(ctx, i, i + len - 1)) continue
      const key = singleKey(cell.map((c) => c.degree), chord.quality)
      if (key) windows.push({ start: i, end: i + len - 1, key })
    }
  }

  for (let i = 0; i + 1 < ctx.length; i++) {
    const a = ctx[i].chord
    const b = ctx[i + 1].chord
    if (!a || !b || sameChord(a, b)) continue
    const rootMove = (((b.rootPc - a.rootPc) % 12) + 12) % 12
    for (let left = SIDE_MIN; left <= SIDE_MAX; left++) {
      for (let right = SIDE_MIN; right <= SIDE_MAX; right++) {
        const start = i - left + 1
        const end = i + right
        if (start < 0 || end >= ctx.length) continue
        const first = ctx.slice(start, i + 1)
        const second = ctx.slice(i + 1, end + 1)
        if (!first.every((c) => sameChord(c.chord, a))) continue
        if (!second.every((c) => sameChord(c.chord, b))) continue
        if (!samePhrase(ctx, start, end)) continue
        const key = crossKey(
          first.map((c) => c.degree), a.quality,
          second.map((c) => c.degree), b.quality,
          rootMove,
        )
        if (key) windows.push({ start, end, key })
      }
    }
  }

  return windows
}

/**
 * How much of a line is common jazz language, by the mined table: each note
 * takes the best WJD document share of any window covering it; the line's
 * share is the mean over its notes. The mirror of `corpusShare`, degree-aware.
 */
export function languageShare(
  ctx: NoteContext[],
  table: LanguageTable = LICK_PATTERNS,
  solos: number = LICK_WJD_SOLOS,
): number {
  if (ctx.length === 0 || solos === 0) return 0
  const best = new Array<number>(ctx.length).fill(0)
  for (const w of languageWindows(ctx)) {
    const entry = table[w.key]
    if (!entry) continue
    const share = entry.wjd / solos
    for (let k = w.start; k <= w.end; k++) best[k] = Math.max(best[k], share)
  }
  return best.reduce((a, b) => a + b, 0) / ctx.length
}
