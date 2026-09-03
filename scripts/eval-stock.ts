/**
 * Score the stock signals against the Weimar Jazz Database's midlevel-unit
 * labels: does what the engine calls "stock" separate the annotators'
 * *lines* (scale and arpeggio runs) from their *licks* (vocabulary)?
 *
 *   npm run eval:stock                 # all solos
 *   npm run eval:stock -- --limit 50   # first N
 *   npm run eval:stock -- --verbose    # per-class label census
 *   WJD=/path/to/wjazzd.db npm run eval:stock
 *
 * The unit of measurement is the annotated IDEA section itself, not an
 * engine practice unit, so segmentation error stays out of the number.
 * Each section's notes are rebuilt on the grid by the same ingest the
 * corpus sweep uses and contextualised against the solo's chords; the
 * three signals the rank already has (`stockShare`, `corpusShare`,
 * `languageShare`) are called the way `buildUnits` calls them, with no
 * named-cell exemption, alongside four candidates from
 * `practice/stockFeatures.ts`. Per signal: AUC for "line" vs "lick"
 * (0.5 = chance, threshold-free), and precision / recall for "line" at
 * `STOCK_SHOWN` 0.5, the page's own threshold. A report, not a gate.
 */
import { DatabaseSync } from 'node:sqlite'
import { scoreFromWjd } from '../src/ingest/wjd.ts'
import type { WjdSolo, WjdMelodyRow, WjdBeatRow } from '../src/ingest/wjd.ts'
import { contextualise } from '../src/analyse/context.ts'
import { languageShare } from '../src/analyse/language.ts'
import { stockShare } from '../src/practice/unit.ts'
import { corpusShare } from '../src/practice/corpus.ts'
import {
  stepShare, runShare, intervalVariety, chordToneDownbeatShare, mluBase,
} from '../src/practice/stockFeatures.ts'
import type { Note } from '../src/core/types.ts'
import type { NoteContext } from '../src/analyse/context.ts'

const dbPath = process.env.WJD ?? `${process.env.HOME}/dev/woodshed-data/wjazzd.db`
const limitArg = process.argv.indexOf('--limit')
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity
const verbose = process.argv.includes('--verbose')
/** Print one JSON line at the end for `npm run bench`. */
const asJson = process.argv.includes('--json')

/** Sections shorter than this say nothing about running versus vocabulary. */
const MIN_NOTES = 3
/** The page's "mostly stock" threshold (`STOCK_SHOWN`, practice/unit.ts). */
const SHOWN = 0.5

const db = new DatabaseSync(dbPath)
const solos = db.prepare('select melid, title, performer, instrument from solo_info order by melid').all() as unknown as WjdSolo[]
const melodyQ = db.prepare('select onset, pitch, duration, period, division, bar, beat, tatum, beatdur from melody where melid = ? order by onset')
const beatsQ = db.prepare("select bar, beat, coalesce(chord, '') as chord, coalesce(form, '') as form, coalesce(signature, '') as signature from beats where melid = ? order by onset")
const ideasQ = db.prepare("select start, \"end\", value from sections where melid = ? and type = 'IDEA' order by start")

type Signal = { name: string; of: (notes: Note[], ctx: NoteContext[]) => number | null }
const SIGNALS: Signal[] = [
  { name: 'stockShare (run)', of: (n) => stockShare(n) },
  { name: 'corpusShare', of: (n) => corpusShare(n) },
  { name: 'max(run, corpus) = stock', of: (n) => Math.max(stockShare(n), corpusShare(n)) },
  { name: 'languageShare', of: (_, c) => languageShare(c) },
  { name: 'stepShare', of: (n) => stepShare(n) },
  { name: 'runShare (direction only)', of: (n) => runShare(n) },
  { name: 'intervalVariety', of: (n) => intervalVariety(n) },
  { name: 'chordToneDownbeatShare', of: (_, c) => chordToneDownbeatShare(c) },
  { name: 'length (notes)', of: (n) => n.length },
]

/** One observation per signal: value, whether the section is a line, its length. */
type Obs = { value: number; line: boolean; n: number }
const samples: Obs[][] = SIGNALS.map(() => [])
/**
 * Length bins for the stratified table. Length alone separates the two
 * classes (lines run long, licks are short), and every share-type signal
 * grows with length, so the pooled AUC overstates what a signal knows.
 */
const BINS: [number, number, string][] = [[3, 5, '3–5'], [6, 9, '6–9'], [10, 15, '10–15'], [16, Infinity, '16+']]
const census = new Map<string, number>()
let solosUsed = 0
let sectionsUsed = 0
let rejected = 0

for (const solo of solos.slice(0, limit)) {
  const melody = melodyQ.all(solo.melid) as unknown as WjdMelodyRow[]
  const beats = beatsQ.all(solo.melid) as unknown as WjdBeatRow[]
  const ideas = ideasQ.all(solo.melid) as unknown as { start: number; end: number; value: string }[]
  if (melody.length < 10 || ideas.length === 0) continue
  let score
  try {
    score = scoreFromWjd(solo, melody, beats).score
  } catch {
    rejected++
    continue
  }
  const chords = score.chordTracks[0]?.chords ?? []
  const ctxAll = contextualise(score.notes, chords)
  solosUsed++
  for (const idea of ideas) {
    const base = mluBase(idea.value)
    census.set(base, (census.get(base) ?? 0) + 1)
    if (base !== 'lick' && base !== 'line') continue
    const notes = score.notes.slice(idea.start, idea.end + 1)
    if (notes.length < MIN_NOTES) continue
    const ctx = ctxAll.slice(idea.start, idea.end + 1)
    sectionsUsed++
    SIGNALS.forEach((s, i) => {
      const v = s.of(notes, ctx)
      if (v !== null && Number.isFinite(v)) samples[i].push({ value: v, line: base === 'line', n: notes.length })
    })
  }
}

/** Area under the ROC curve for "line" by rank, ties at half credit. */
function auc(obs: Obs[]): number {
  const sorted = [...obs].sort((a, b) => a.value - b.value)
  let lines = 0
  let licks = 0
  let sum = 0
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j < sorted.length && sorted[j].value === sorted[i].value) j++
    const tieLines = sorted.slice(i, j).filter((o) => o.line).length
    const tieLicks = j - i - tieLines
    // Every line in this tie beats the licks below it and halves the licks beside it.
    sum += tieLines * (licks + tieLicks / 2)
    lines += tieLines
    licks += tieLicks
    i = j
  }
  return lines === 0 || licks === 0 ? 0.5 : sum / (lines * licks)
}

function atThreshold(obs: Obs[], t: number): { p: number; r: number } {
  const flagged = obs.filter((o) => o.value >= t)
  const tp = flagged.filter((o) => o.line).length
  const lines = obs.filter((o) => o.line).length
  return { p: tp / Math.max(1, flagged.length), r: tp / Math.max(1, lines) }
}

const pct = (x: number): string => (x * 100).toFixed(1).padStart(5)
const lines = samples[0].filter((o) => o.line).length
console.log(`\n${solosUsed} solos (${rejected} rejected by ingest), ${sectionsUsed} lick/line sections of ≥ ${MIN_NOTES} notes: ${lines} line, ${sectionsUsed - lines} lick`)
if (verbose) {
  console.log('label census (base class):')
  for (const [k, v] of [...census].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(12)} ${v}`)
}
console.log(`\n${'signal'.padEnd(28)} ${'n'.padStart(6)}  AUC(line)   at ≥ ${SHOWN}: P(line)  R(line)`)
SIGNALS.forEach((s, i) => {
  const obs = samples[i]
  const a = auc(obs)
  const { p, r } = atThreshold(obs, SHOWN)
  const thr = s.name.startsWith('length') ? '        —        —' : `        ${pct(p)}    ${pct(r)}`
  console.log(`${s.name.padEnd(28)} ${String(obs.length).padStart(6)}    ${a.toFixed(3)}${thr}`)
})
console.log(`\nAUC by section length (line share per bin in the header):`)
const header = BINS.map(([lo, hi, label]) => {
  const inBin = samples[0].filter((o) => o.n >= lo && o.n <= hi)
  const share = inBin.filter((o) => o.line).length / Math.max(1, inBin.length)
  return `${label} (n ${inBin.length}, ${pct(share).trim()}% line)`.padStart(26)
}).join('')
console.log(`${'signal'.padEnd(28)}${header}`)
SIGNALS.forEach((s, i) => {
  if (s.name.startsWith('length')) return
  const row = BINS.map(([lo, hi]) => auc(samples[i].filter((o) => o.n >= lo && o.n <= hi)).toFixed(3).padStart(26)).join('')
  console.log(`${s.name.padEnd(28)}${row}`)
})
if (asJson) {
  const r3 = (x: number): number => Math.round(x * 1000) / 1000
  const signals: Record<string, { auc: number; bins: number[] }> = {}
  SIGNALS.forEach((s, i) => {
    signals[s.name] = { auc: r3(auc(samples[i])), bins: BINS.map(([lo, hi]) => r3(auc(samples[i].filter((o) => o.n >= lo && o.n <= hi)))) }
  })
  console.log(JSON.stringify({ solos: solosUsed, sections: sectionsUsed, lines, bins: BINS.map((b) => b[2]), signals }))
}
console.log('\nAUC 0.5 = chance; > 0.5 = higher values mean "line". Lines are the annotators\' scale and arpeggio runs, licks their vocabulary.')
