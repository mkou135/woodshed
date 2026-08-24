/**
 * Dictionary coverage against the Bopland lick corpus (local only — see
 * CLAUDE.md on corpus licensing): how many licks, run with their own
 * changes, get a named finding, any finding, or nothing?
 *
 *   npm run bench:bopland                 # all treble-clef licks
 *   npm run bench:bopland -- --limit 200
 *   BOPLAND=/path/to/bopland npm run bench:bopland
 */
import { readFileSync } from 'node:fs'
import { ingest } from '../src/ingest/index.ts'
import { parseChordSymbol } from '../src/ingest/parseChordText.ts'
import { prepare } from '../src/prepare/index.ts'
import { analyse } from '../src/analyse/index.ts'
import { barTicks } from '../src/practice/tune.ts'
import type { Chord, Score } from '../src/core/types.ts'

const root = process.env.BOPLAND ?? `${process.env.HOME}/dev/woodshed-data/bopland`
const limitArg = process.argv.indexOf('--limit')
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity
const verbose = process.argv.includes('--verbose')

interface Tags { data: { chords: Record<string, Record<string, string[]>> } }
const tags = JSON.parse(readFileSync(`${root}/licks/jsonTag/treble-clef-licks.json`, 'utf8')) as Tags

/** Bopland's lowercase text ("gbmaj", "bm7-5", "bb7") → the engine's symbol dialect. */
function symbol(text: string): string {
  return text
    .replace(/^([a-g])/, (m) => m.toUpperCase())
    .replace(/-5/, 'b5')
    .replace(/maj$/, 'maj7')
}

function chordsFor(progression: string, score: Score): Chord[] | null {
  const ticks = barTicks(score.timeSig)
  const cells = progression.split('|').map((c) => c.trim()).filter(Boolean)
  const chords: Chord[] = []
  cells.forEach((cell, bar) => {
    const names = cell.split(/\s+/).filter(Boolean)
    names.forEach((name, k) => {
      const parsed = parseChordSymbol(symbol(name))
      if (!parsed) { chords.length = 0; return }
      chords.push({
        onset: bar * ticks + Math.round((k * ticks) / names.length),
        bar: bar + 1,
        rootPc: parsed.rootPc,
        quality: parsed.quality,
        tensions: parsed.tensions,
      })
    })
  })
  return chords.length ? chords : null
}

const licks: { id: string; progression: string }[] = []
for (const byMeter of Object.values(tags.data.chords)) {
  for (const [progression, ids] of Object.entries(byMeter)) for (const id of ids) licks.push({ id, progression })
}

const tally = { named: 0, unnamed: 0, none: 0, noChords: 0, tiny: 0, failed: 0 }
const names = new Map<string, number>()
const unparsed = new Map<string, number>()
let n = 0
for (const { id, progression } of licks.slice(0, limit)) {
  let score: Score
  try {
    score = ingest(new Uint8Array(readFileSync(`${root}/licks/musicXML/treble-clef-licks/${id}.xml`)))
  } catch { tally.failed++; continue }
  if (score.notes.length < 4) { tally.tiny++; continue }
  const chords = chordsFor(progression, score)
  if (!chords) {
    tally.noChords++
    for (const cell of progression.split('|')) for (const name of cell.trim().split(/\s+/)) {
      if (name && !parseChordSymbol(symbol(name))) unparsed.set(name, (unparsed.get(name) ?? 0) + 1)
    }
    continue
  }
  const withChords: Score = { ...score, chordTracks: [{ chords, provenance: 'reference', confidence: 1 }] }
  const a = analyse(withChords, prepare(withChords))
  n++
  const named = a.findings.filter((f) => f.degrees)
  if (named.length) {
    tally.named++
    for (const f of named) names.set(f.name, (names.get(f.name) ?? 0) + 1)
  } else if (a.findings.length) tally.unnamed++
  else tally.none++
  if (verbose) console.log(id.padEnd(10), progression.padEnd(40), a.findings.slice(0, 2).map((f) => f.name).join('; '))
}

console.log(`\n${n} licks analysed (skipped: ${tally.failed} unreadable, ${tally.tiny} < 4 notes, ${tally.noChords} unparsed changes)`)
const pct = (x: number) => `${((x / Math.max(1, n)) * 100).toFixed(1)}%`
console.log(`named finding   ${String(tally.named).padStart(5)}  ${pct(tally.named)}`)
console.log(`unnamed only    ${String(tally.unnamed).padStart(5)}  ${pct(tally.unnamed)}`)
console.log(`nothing         ${String(tally.none).padStart(5)}  ${pct(tally.none)}`)
console.log('\nmost-named:')
for (const [name, c] of [...names.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(c).padStart(4)}  ${name}`)
if (unparsed.size) {
  console.log('\nunparsed chord text:')
  console.log('  ' + [...unparsed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `${k}×${v}`).join('  '))
}
