/**
 * Score the engine's phrase starts against the owner's brackets, so a
 * segmentation change cannot silently undo a decision the owner's ear made.
 *
 *   npm run brackets            # every set in scripts/brackets.json
 *   npm run brackets -- --print <file.mxl> [from] [to]   # list the engine's starts
 *
 * Brackets are printed bar.beat (1-based beat, fractions as decimals: 4.5
 * is the "and" of 4). Files live in ~/dev/woodshed-data/peers (never in the
 * repo). Exit 1 on any miss or false start not listed as known.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { run, TICKS_PER_QUARTER } from '../src/index.ts'
import { writtenBar } from '../src/core/bars.ts'
import type { PipelineResult } from '../src/index.ts'

interface BracketSet {
  file: string
  /** Printed bars, inclusive: only starts inside this range are scored. */
  range: [number, number]
  /** Owner's phrase starts, "bar.beat". */
  starts: string[]
  /** Starts the engine is known to place elsewhere; a miss here is not a failure. */
  knownMisses?: string[]
  note?: string
}

const PEERS = join(homedir(), 'dev', 'woodshed-data', 'peers')
/** Half a beat: the owner's pencil and the engine's grid agree to this. */
const TOLERANCE = 0.5

/** Printed bar and 1-based beat of every phrase start. */
function engineStarts(result: PipelineResult): { bar: number; beat: number }[] {
  const { score, analysis } = result
  const ticksPerBar = score.timeSig[0] * (4 / score.timeSig[1]) * TICKS_PER_QUARTER
  return analysis.phrases.map((p) => {
    const first = p.notes[0]
    const barStart = first.onset - first.beat * TICKS_PER_QUARTER
    const w = writtenBar(score, first.bar)
    const beat = (p.onset - barStart) / TICKS_PER_QUARTER + 1
    // A phrase onset before its first note's bar (a tuplet rest) stays in that bar.
    return { bar: w.bar + Math.floor((p.onset - barStart) / ticksPerBar), beat }
  })
}

/** "4.4½" (the owner's notation) or "4.4.5". */
const parse = (s: string): { bar: number; beat: number } => {
  const [b, f = '1', rest] = s.replace('½', '.5').split('.')
  return { bar: Number(b), beat: Number(rest === undefined ? f : `${f}.${rest}`) }
}
const fmt = (p: { bar: number; beat: number }): string => {
  const whole = Math.floor(p.beat)
  const frac = p.beat - whole
  return `${p.bar}.${whole}${frac === 0 ? '' : frac === 0.5 ? '½' : `.${frac}`}`
}

const close = (a: { bar: number; beat: number }, b: { bar: number; beat: number }, beatsPerBar: number): boolean =>
  Math.abs((a.bar - b.bar) * beatsPerBar + (a.beat - b.beat)) <= TOLERANCE

const args = process.argv.slice(2)
if (args[0] === '--print') {
  const result = run(new Uint8Array(readFileSync(args[1])))
  const from = Number(args[2] ?? 1)
  const to = Number(args[3] ?? Infinity)
  console.log(engineStarts(result).filter((s) => s.bar >= from && s.bar <= to).map(fmt).join(' '))
  process.exit(0)
}

const sets = JSON.parse(readFileSync(new URL('./brackets.json', import.meta.url), 'utf8')) as BracketSet[]
let failed = false
for (const set of sets) {
  const result = run(new Uint8Array(readFileSync(join(PEERS, set.file))))
  const beatsPerBar = result.score.timeSig[0] * (4 / result.score.timeSig[1])
  const engine = engineStarts(result).filter((s) => s.bar >= set.range[0] && s.bar <= set.range[1])
  const owner = set.starts.map(parse)
  const known = new Set(set.knownMisses ?? [])
  const matched = owner.filter((o) => engine.some((e) => close(o, e, beatsPerBar)))
  const missed = owner.filter((o) => !engine.some((e) => close(o, e, beatsPerBar)))
  let falseStarts = engine.filter((e) => !owner.some((o) => close(o, e, beatsPerBar)))
  const newMisses = missed.filter((m) => !known.has(fmt(m)))
  // A known miss is a start the engine places elsewhere: its displaced
  // start, within two beats, is part of the same known disagreement.
  for (const m of missed.filter((m) => known.has(fmt(m)))) {
    const near = falseStarts.find((e) => Math.abs((e.bar - m.bar) * beatsPerBar + (e.beat - m.beat)) <= 2)
    if (near) falseStarts = falseStarts.filter((e) => e !== near)
  }
  const ok = newMisses.length === 0 && falseStarts.length === 0
  failed ||= !ok
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${set.file} printed ${set.range[0]}–${set.range[1]}: ` +
    `${matched.length}/${owner.length} matched, ${falseStarts.length} false`)
  if (missed.length) console.log(`     missed: ${missed.map(fmt).join(' ')}${newMisses.length ? '' : ' (known)'}`)
  if (falseStarts.length) console.log(`     false:  ${falseStarts.map(fmt).join(' ')}`)
}
process.exit(failed ? 1 : 0)
