/**
 * Candidate stock signals, scored against the Weimar midlevel-unit labels
 * by `npm run eval:stock`. Each is a pure function over a line's notes (or
 * their contexts). None is wired into the unit rank; the eval decides
 * whether any earns that. See OPEN_QUESTIONS "The WJD midlevel-unit labels
 * are unused".
 */
import type { Note } from '../core/types.ts'
import type { NoteContext } from '../analyse/context.ts'
import { intervalsOf } from '../core/pitch.ts'

const intervals = (notes: Note[]): number[] => intervalsOf(notes.map((n) => n.midi))

/** Share of intervals that are steps (1–2 semitones). 0 below two notes. */
export function stepShare(notes: Note[]): number {
  const ivs = intervals(notes)
  if (ivs.length === 0) return 0
  return ivs.filter((iv) => Math.abs(iv) >= 1 && Math.abs(iv) <= 2).length / ivs.length
}

/** Fewer notes than this moving one way is a turn, not a run (matches `STOCK_RUN`). */
const RUN_NOTES = 4

/**
 * Share of notes inside a run of ≥ `RUN_NOTES` notes moving one direction,
 * whatever the interval sizes. `stockShare` additionally requires one
 * interval *kind* per run; this asks only about direction.
 */
export function runShare(notes: Note[]): number {
  if (notes.length === 0) return 0
  const ivs = intervals(notes)
  const inRun = new Array<boolean>(notes.length).fill(false)
  let runStart = 0
  for (let i = 1; i <= ivs.length; i++) {
    const continues = i < ivs.length && ivs[i] !== 0 && Math.sign(ivs[i]) === Math.sign(ivs[i - 1])
    if (continues) continue
    if (ivs[runStart] !== 0 && i - runStart + 1 >= RUN_NOTES) {
      for (let k = runStart; k <= i; k++) inRun[k] = true
    }
    runStart = i
  }
  return inRun.filter(Boolean).length / notes.length
}

/** Distinct interval sizes (direction ignored) over interval count. 0 below two notes. */
export function intervalVariety(notes: Note[]): number {
  const ivs = intervals(notes)
  if (ivs.length === 0) return 0
  return new Set(ivs.map(Math.abs)).size / ivs.length
}

/**
 * Baker's bebop-scale test: of the notes that fall on a beat, how many are
 * chord tones. Null when nothing is on a beat or no chord is known, so the
 * eval can skip the line rather than score a 0 that means "unknown".
 */
export function chordToneDownbeatShare(ctx: NoteContext[]): number | null {
  const onBeat = ctx.filter((c) => c.chord !== null && Number.isInteger(c.note.beat))
  if (onBeat.length === 0) return null
  return onBeat.filter((c) => c.chordTone).length / onBeat.length
}

/**
 * The base class of a Weimar midlevel-unit label: `~#-lick` → `lick`,
 * `line_w_alds` → `line`, `void->melody` → `melody`, `quote:?` → `quote`.
 * Frieler's modifiers (`#`, `~`, `+`, `-`, `*`, `=`) and the direction and
 * sub-type suffixes are dropped; a `void->x` unit reads as `x`.
 */
export function mluBase(value: string): string {
  const last = value.split('->').pop() ?? ''
  const m = /[a-z]+/i.exec(last)
  return (m?.[0] ?? '').toLowerCase()
}
