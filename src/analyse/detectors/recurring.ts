import type { NoteContext } from '../context.ts'
import { intervalsOf } from '../../core/pitch.ts'

export interface RecurringHit {
  intervals: number[]
  occurrences: number[]
}

export interface RecurringOptions {
  minLength?: number
  maxLength?: number
  minCount?: number
}

/**
 * A cell of nothing but steps in one direction is a scale fragment, not
 * vocabulary. Frieler's mine of Parker's Omnibook found exactly these at the
 * top of the frequency table — [-1,-1,-1], [-2,-1,-2] — which is why raw
 * frequency is close to worthless as a criterion on its own.
 */
function isTrivia(intervals: number[]): boolean {
  const allSteps = intervals.every((iv) => Math.abs(iv) === 1 || Math.abs(iv) === 2)
  const oneDirection =
    intervals.every((iv) => iv > 0) || intervals.every((iv) => iv < 0)
  return allSteps && oneDirection
}

export function findRecurring(
  ctx: NoteContext[],
  options: RecurringOptions = {},
): RecurringHit[] {
  const minLength = options.minLength ?? 3
  const maxLength = options.maxLength ?? 6
  const minCount = options.minCount ?? 2

  const intervals = intervalsOf(ctx.map((c) => c.note.midi))
  if (intervals.length < minLength) return []

  const found = new Map<string, RecurringHit>()

  for (let length = minLength; length <= maxLength; length++) {
    const seen = new Map<string, number[]>()
    for (let i = 0; i + length <= intervals.length; i++) {
      const cell = intervals.slice(i, i + length)
      if (isTrivia(cell)) continue
      const key = cell.join(',')
      const list = seen.get(key) ?? []
      list.push(i)
      seen.set(key, list)
    }
    for (const [key, occurrences] of seen) {
      if (occurrences.length < minCount) continue
      found.set(key, { intervals: key.split(',').map(Number), occurrences })
    }
  }

  // Drop any cell that only ever appears inside a longer recurring cell.
  const hits = [...found.values()].sort((a, b) => b.intervals.length - a.intervals.length)
  const kept: RecurringHit[] = []
  for (const hit of hits) {
    const key = hit.intervals.join(',')
    const swallowed = kept.some(
      (longer) =>
        longer.intervals.length > hit.intervals.length &&
        longer.intervals.join(',').includes(key),
    )
    if (!swallowed) kept.push(hit)
  }
  return kept
}
