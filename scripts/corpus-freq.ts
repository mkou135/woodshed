/**
 * Write src/data/corpusFrequency.ts: for every 4-note interval pattern
 * (three semitone intervals as played, clipped to an octave), the share of
 * Weimar Jazz Database solos that contain it at least once. Aggregate
 * statistics only — no note data leaves ~/dev/woodshed-data (DECISIONS
 * 2026-08-24 "Corpus licensing").
 *
 *   WJD=/path/to/wjazzd.db npm run corpus:freq [-- --min 0.05]
 */
import { DatabaseSync } from 'node:sqlite'
import { writeFileSync } from 'node:fs'
import { scoreFromWjd } from '../src/ingest/wjd.ts'
import type { WjdBeatRow, WjdMelodyRow, WjdSolo } from '../src/ingest/wjd.ts'
import { patternKey, PATTERN_NOTES } from '../src/practice/corpus.ts'

const dbPath = process.env.WJD ?? `${process.env.HOME}/dev/woodshed-data/wjazzd.db`
const minArg = process.argv.indexOf('--min')
const minShare = minArg > -1 ? Number(process.argv[minArg + 1]) : 0.05
const db = new DatabaseSync(dbPath)

const solos = db.prepare('select melid, title, performer, instrument from solo_info order by melid').all() as unknown as WjdSolo[]
const melodyQ = db.prepare('select onset, pitch, duration, period, division, bar, beat, tatum, beatdur from melody where melid = ? order by onset')
const beatsQ = db.prepare("select bar, beat, coalesce(chord, '') as chord, coalesce(form, '') as form, coalesce(signature, '') as signature from beats where melid = ? order by onset")

const docFreq = new Map<string, number>()
let n = 0
for (const solo of solos) {
  const melody = melodyQ.all(solo.melid) as unknown as WjdMelodyRow[]
  const beats = beatsQ.all(solo.melid) as unknown as WjdBeatRow[]
  if (melody.length < 10) continue
  let notes
  try { notes = scoreFromWjd(solo, melody, beats).score.notes } catch { continue }
  n++
  const seen = new Set<string>()
  for (let i = 0; i + PATTERN_NOTES <= notes.length; i++) seen.add(patternKey(notes.slice(i, i + PATTERN_NOTES)))
  for (const k of seen) docFreq.set(k, (docFreq.get(k) ?? 0) + 1)
}

const rows = [...docFreq.entries()]
  .map(([k, c]) => [k, c / n] as const)
  .filter(([, s]) => s >= minShare)
  .sort((a, b) => b[1] - a[1])

const out = `/**
 * Derived from the Weimar Jazz Database (Frieler et al., Hochschule für
 * Musik Franz Liszt Weimar, ODbL): for each 4-note interval pattern, the
 * share of the ${n} solos that contain it at least once. Aggregate numbers
 * only; regenerate with \`npm run corpus:freq\`. Patterns below ${minShare}
 * are omitted (${docFreq.size - rows.length} of ${docFreq.size}).
 */
export const CORPUS_SOLOS = ${n}

export const CORPUS_FREQUENCY: Record<string, number> = {
${rows.map(([k, s]) => `  '${k}': ${s.toFixed(3)},`).join('\n')}
}
`
writeFileSync('src/data/corpusFrequency.ts', out)
console.log(`${n} solos, ${docFreq.size} patterns, ${rows.length} kept at share ≥ ${minShare}`)
for (const [k, s] of rows.slice(0, 15)) console.log(`  ${k.padEnd(12)} ${(s * 100).toFixed(0)}%`)
const buckets = [0.9, 0.7, 0.5, 0.3, 0.2, 0.1, 0.05]
console.log('patterns at share ≥:', buckets.map((b) => `${b}:${rows.filter(([, s]) => s >= b).length}`).join(' '))
