import { samePhrase } from '../context.ts'
import type { NoteContext } from '../context.ts'
import { intervalsOf } from '../../core/pitch.ts'

export interface Variant {
  intervals: number[]
  occurrences: number[]
  /** 'near': one interval bent by up to `bend` semitones; 'inversion': every interval negated. */
  relation: 'near' | 'inversion'
}

export interface RecurringHit {
  /** The family head: the exact form that occurs most (earliest on a tie). */
  intervals: number[]
  /** Every occurrence, head and variants, in order. */
  occurrences: number[]
  variants: Variant[]
}

export interface RecurringOptions {
  minLength?: number
  maxLength?: number
  minCount?: number
  /** Cells at least this long may recur as variants; shorter ones only exactly. */
  variantMinLength?: number
  /** Most a single interval may change, in semitones, and still be the same idea. */
  bend?: number
}

/**
 * A, A′, A″: a player sequences a figure through the changes and one
 * interval bends to fit each chord, or turns the figure upside down. Each
 * form may occur once, yet the idea recurs. Membership is always tested
 * against the family head, never chained, so A ~ B ~ C cannot pull in a C
 * that is nothing like A.
 */
export function variantOf(head: number[], cell: number[], bend: number): Variant['relation'] | null {
  if (head.length !== cell.length) return null
  if (head.every((iv, i) => iv === -cell[i])) return 'inversion'
  let bent = -1
  for (let i = 0; i < head.length; i++) {
    if (head[i] === cell[i]) continue
    if (bent >= 0) return null
    if (Math.sign(head[i]) !== Math.sign(cell[i])) return null
    if (Math.abs(head[i] - cell[i]) > bend) return null
    bent = i
  }
  return bent >= 0 ? 'near' : null
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
  const variantMinLength = options.variantMinLength ?? 4
  const bend = options.bend ?? 2

  const intervals = intervalsOf(ctx.map((c) => c.note.midi))
  if (intervals.length < minLength) return []

  const found = new Map<string, RecurringHit>()

  for (let length = minLength; length <= maxLength; length++) {
    const seen = new Map<string, number[]>()
    for (let i = 0; i + length <= intervals.length; i++) {
      if (!samePhrase(ctx, i, i + length)) continue
      const cell = intervals.slice(i, i + length)
      if (isTrivia(cell)) continue
      const key = cell.join(',')
      const list = seen.get(key) ?? []
      list.push(i)
      seen.set(key, list)
    }
    // Most frequent first, earliest first on a tie, so the head of each
    // family is settled before any variant asks to join it.
    const forms = [...seen.entries()]
      .map(([key, occurrences]) => ({ intervals: key.split(',').map(Number), occurrences }))
      .sort((a, b) => b.occurrences.length - a.occurrences.length || a.occurrences[0] - b.occurrences[0])
    const families: RecurringHit[] = []
    for (const form of forms) {
      const family = length >= variantMinLength
        ? families.find((f) => variantOf(f.intervals, form.intervals, bend))
        : undefined
      if (family) {
        family.variants.push({ ...form, relation: variantOf(family.intervals, form.intervals, bend)! })
        family.occurrences.push(...form.occurrences)
      } else {
        families.push({ intervals: form.intervals, occurrences: [...form.occurrences], variants: [] })
      }
    }
    for (const family of families) {
      if (family.occurrences.length < minCount) continue
      family.occurrences.sort((a, b) => a - b)
      found.set(family.intervals.join(','), family)
    }
  }

  // Drop any cell that only ever appears inside a longer recurring cell.
  const hits = [...found.values()].sort((a, b) => b.intervals.length - a.intervals.length)
  const kept: RecurringHit[] = []
  for (const hit of hits) {
    const key = hit.intervals.join(',')
    const swallowed = kept.some((longer) => {
      // A shorter cell that only ever appears inside a longer one.
      if (longer.intervals.length > hit.intervals.length &&
          longer.intervals.join(',').includes(key)) return true
      // Sliding windows over the same figure: [3,-3,1,4,3,4], [-6,1,3,-3,1,4],
      // [1,3,-3,1,4,3] are one cell reported six times. If this hit's notes
      // overlap a cell already kept, it is the same musical event.
      return longer.occurrences.some((a) =>
        hit.occurrences.some(
          (b) => a <= b + hit.intervals.length && b <= a + longer.intervals.length,
        ),
      )
    })
    if (!swallowed) kept.push(hit)
  }
  return kept
}
