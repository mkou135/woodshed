/**
 * Write src/data/corpusLicks.ts: degree-pattern document frequencies for
 * common-language identification, mined from the Weimar Jazz Database and
 * the Bopland treble-clef licks. Aggregate statistics only — no note data
 * leaves ~/dev/woodshed-data (DECISIONS 2026-08-27 "Corpus-derived lick
 * table"). Keys come from src/analyse/language.ts so what is counted here
 * is exactly what the runtime looks up.
 *
 *   npm run corpus:licks [-- --min-wjd 0.10 --min-bop 8]
 *   WJD=/path/to/wjazzd.db BOPLAND=/path/to/bopland npm run corpus:licks
 */
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, writeFileSync } from 'node:fs'
import { scoreFromWjd } from '../src/ingest/wjd.ts'
import type { WjdBeatRow, WjdMelodyRow, WjdSolo } from '../src/ingest/wjd.ts'
import { ingest } from '../src/ingest/index.ts'
import { parseChordSymbol } from '../src/ingest/parseChordText.ts'
import { contextualise } from '../src/analyse/context.ts'
import { languageWindows } from '../src/analyse/language.ts'
import { barTicks } from '../src/practice/tune.ts'
import type { Chord, Score } from '../src/core/types.ts'

const dbPath = process.env.WJD ?? `${process.env.HOME}/dev/woodshed-data/wjazzd.db`
const bopRoot = process.env.BOPLAND ?? `${process.env.HOME}/dev/woodshed-data/bopland`
const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name)
  return i > -1 ? Number(process.argv[i + 1]) : fallback
}
const minWjd = arg('--min-wjd', 0.10)
const minBop = arg('--min-bop', 8)

const keysOf = (ctx: ReturnType<typeof contextualise>): Set<string> =>
  new Set(languageWindows(ctx).map((w) => w.key))

// ---- WJD: every solo's degree windows against its own beat-level chords.
const db = new DatabaseSync(dbPath)
const solos = db.prepare('select melid, title, performer, instrument from solo_info order by melid').all() as unknown as WjdSolo[]
const melodyQ = db.prepare('select onset, pitch, duration, period, division, bar, beat, tatum, beatdur from melody where melid = ? order by onset')
const beatsQ = db.prepare("select bar, beat, coalesce(chord, '') as chord, coalesce(form, '') as form, coalesce(signature, '') as signature from beats where melid = ? order by onset")

const wjdFreq = new Map<string, number>()
let wjdN = 0
for (const solo of solos) {
  const melody = melodyQ.all(solo.melid) as unknown as WjdMelodyRow[]
  const beats = beatsQ.all(solo.melid) as unknown as WjdBeatRow[]
  if (melody.length < 10) continue
  let score: Score
  try { score = scoreFromWjd(solo, melody, beats).score } catch { continue }
  const chords = score.chordTracks[0]?.chords ?? []
  if (chords.length === 0) continue
  wjdN++
  for (const k of keysOf(contextualise(score.notes, chords))) wjdFreq.set(k, (wjdFreq.get(k) ?? 0) + 1)
}

// ---- Bopland: each lick's windows against the changes it is tagged with
// (same accessors as scripts/bench-bopland.ts).
interface Tags { data: { chords: Record<string, Record<string, string[]>> } }
const tags = JSON.parse(readFileSync(`${bopRoot}/licks/jsonTag/treble-clef-licks.json`, 'utf8')) as Tags

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

const bopFreq = new Map<string, number>()
let bopN = 0
let bopSkipped = 0
for (const { id, progression } of licks) {
  let score: Score
  try {
    score = ingest(new Uint8Array(readFileSync(`${bopRoot}/licks/musicXML/treble-clef-licks/${id}.xml`)))
  } catch { bopSkipped++; continue }
  if (score.notes.length < 4) { bopSkipped++; continue }
  const chords = chordsFor(progression, score)
  if (!chords) { bopSkipped++; continue }
  bopN++
  for (const k of keysOf(contextualise(score.notes, chords))) bopFreq.set(k, (bopFreq.get(k) ?? 0) + 1)
}

// ---- Keep and write.
const allKeys = new Set([...wjdFreq.keys(), ...bopFreq.keys()])
const rows = [...allKeys]
  .map((k) => ({ k, wjd: wjdFreq.get(k) ?? 0, bop: bopFreq.get(k) ?? 0 }))
  .filter((r) => r.wjd / wjdN >= minWjd || r.bop >= minBop)
  .sort((a, b) => b.wjd - a.wjd || b.bop - a.bop || (a.k < b.k ? -1 : 1))

const out = `/**
 * Degree-pattern document frequencies for common-language identification,
 * derived from the Weimar Jazz Database (Frieler et al., Hochschule für
 * Musik Franz Liszt Weimar, ODbL; ${wjdN} solos) and the Bopland
 * treble-clef licks (${bopN} licks, local-only per DECISIONS 2026-08-27
 * "Corpus-derived lick table"). Aggregate numbers only — how many solos /
 * licks contain each pattern at least once. Regenerate with
 * \`npm run corpus:licks\`; patterns below ${minWjd} WJD share and ${minBop}
 * Bopland licks are omitted (${allKeys.size - rows.length} of ${allKeys.size}).
 */
export const LICK_WJD_SOLOS: number = ${wjdN}
export const LICK_BOP_LICKS: number = ${bopN}

export const LICK_PATTERNS: Record<string, { wjd: number; bop: number }> = {
${rows.map((r) => `  '${r.k}': { wjd: ${r.wjd}, bop: ${r.bop} },`).join('\n')}
}
`
writeFileSync('src/data/corpusLicks.ts', out)
console.log(`WJD ${wjdN} solos · Bopland ${bopN} licks (${bopSkipped} skipped) · ${allKeys.size} patterns, ${rows.length} kept (wjd ≥ ${minWjd} or bop ≥ ${minBop})`)
for (const r of rows.slice(0, 15)) console.log(`  ${r.k.padEnd(40)} wjd ${(100 * r.wjd / wjdN).toFixed(0).padStart(3)}%  bop ${r.bop}`)
const cross = rows.filter((r) => r.k.includes('|'))
console.log(`cross-chord patterns kept: ${cross.length}`)
for (const r of cross.slice(0, 10)) console.log(`  ${r.k.padEnd(40)} wjd ${(100 * r.wjd / wjdN).toFixed(0).padStart(3)}%  bop ${r.bop}`)
