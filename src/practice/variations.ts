import type { Note } from '../core/types.ts'

/**
 * Compositional device transforms (Ligon's taxonomy; Bergonzi's editing).
 * Pure: a new Note[] every time, or null when the line cannot support the
 * device. Callers gate the results before showing them — a transform here
 * is raw material, not yet an exercise.
 */

/** A strict prefix or suffix of at least three notes — fragmentation. */
export function fragment(notes: Note[], take: 'prefix' | 'suffix'): Note[] | null {
  const size = Math.max(3, Math.ceil(notes.length / 2))
  if (size >= notes.length) return null
  return take === 'prefix'
    ? notes.slice(0, size).map((n) => ({ ...n }))
    : notes.slice(notes.length - size).map((n) => ({ ...n }))
}

/** Same intervals, durations and spacing scaled — augmentation (×2) or diminution (×0.5). */
export function augment(notes: Note[], factor: 2 | 0.5): Note[] {
  const start = notes[0]?.onset ?? 0
  return notes.map((n) => ({
    ...n,
    onset: start + (n.onset - start) * factor,
    duration: n.duration * factor,
  }))
}

/**
 * Bergonzi's editing: one or two middle notes removed, everything else in
 * place — "listen for the spaces they leave". Nulls mark the rests.
 */
export function edit(notes: Note[], keepLast: boolean): { notes: (Note | null)[] } | null {
  const last = keepLast ? notes.length - 1 : notes.length
  // Middle = everything but the first note and the protected arrival.
  const middle: number[] = []
  for (let i = 1; i < last; i++) middle.push(i)
  if (middle.length === 0) return null
  const drop = new Set<number>()
  // Deterministic choice: the middle-most note, and its off-beat neighbour
  // when the line is long enough to spare two.
  drop.add(middle[Math.floor(middle.length / 2)])
  if (middle.length >= 4) drop.add(middle[Math.floor(middle.length / 4)])
  return { notes: notes.map((n, i) => (drop.has(i) ? null : { ...n })) }
}
