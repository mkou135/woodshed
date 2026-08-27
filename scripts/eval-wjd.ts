/**
 * Score segment() against the Weimar Jazz Database's human phrase and idea
 * annotations.
 *
 *   npm run eval:wjd                 # all solos
 *   npm run eval:wjd -- --limit 50   # first N
 *   WJD=/path/to/wjazzd.db npm run eval:wjd
 *
 * The database is ODbL-licensed and lives outside the repo. Onsets are
 * rebuilt on the metrical grid (bar, beat, tatum) so the input looks like a
 * score, which is what the engine normally sees. Boundaries are compared as
 * note indices; "near" allows one note of slack either way.
 *
 * Chorus starts are passed to `segment()` the way `analyse/index.ts` passes
 * `form.chorusStarts`, so the corpus scores the chorus rule instead of
 * silently skipping it. `--no-chorus` restores the old empty-list behaviour
 * for a before/after.
 */
import { DatabaseSync } from 'node:sqlite'
import { notesFromWjd } from '../src/ingest/wjd.ts'
import type { WjdMelodyRow } from '../src/ingest/wjd.ts'
import { segment } from '../src/analyse/segment.ts'
import type { SegmentOptions } from '../src/analyse/segment.ts'
import type { Note } from '../src/core/types.ts'

const dbPath = process.env.WJD ?? `${process.env.HOME}/dev/woodshed-data/wjazzd.db`
const limitArg = process.argv.indexOf('--limit')
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity
const verbose = process.argv.includes('--verbose')
const optsArg = process.argv.indexOf('--opts')
const opts: Partial<SegmentOptions> = optsArg > -1 ? JSON.parse(process.argv[optsArg + 1]) : {}
const noChorus = process.argv.includes('--no-chorus')

const db = new DatabaseSync(dbPath)

type Row = WjdMelodyRow
const toNotes = (rows: Row[]): Note[] => notesFromWjd(rows, Math.min(...rows.map((r) => r.bar)))

interface BeatRow { bar: number; chorus_id: number }

/**
 * Chorus starts, as internal bar numbers on the same origin `toNotes` uses.
 *
 * From `beats.chorus_id`, not the `form` column. `form` carries a label only
 * where the label *changes*, so a one-section form (every blues here) records
 * "A1" at the first chorus and nothing after: deriving starts from it finds a
 * single chorus on 121 of the 456 solos. `chorus_id` is the annotators' own
 * per-chorus counter and agrees with the form derivation on the other 335.
 */
function chorusStarts(beats: BeatRow[], minBar: number): number[] {
  const out: number[] = []
  let last: number | null = null
  for (const b of beats) {
    if (b.chorus_id === last) continue
    last = b.chorus_id
    // 0 is the intro; a chorus start before the first note produces no gap.
    if (b.chorus_id >= 1) out.push(b.bar - minBar + 1)
  }
  return out
}

interface Tally { tp: number; fp: number; fn: number }
const tally = (): Tally => ({ tp: 0, fp: 0, fn: 0 })

function score(predicted: Set<number>, actual: Set<number>, slack: number, t: Tally): void {
  const matched = new Set<number>()
  for (const p of predicted) {
    let hit = false
    for (let d = -slack; d <= slack && !hit; d++) {
      if (actual.has(p + d) && !matched.has(p + d)) { matched.add(p + d); hit = true }
    }
    if (hit) t.tp++
    else t.fp++
  }
  t.fn += actual.size - matched.size
}

const prf = (t: Tally): string => {
  const p = t.tp / Math.max(1, t.tp + t.fp)
  const r = t.tp / Math.max(1, t.tp + t.fn)
  const f = (2 * p * r) / Math.max(1e-9, p + r)
  return `P ${(p * 100).toFixed(1).padStart(5)}  R ${(r * 100).toFixed(1).padStart(5)}  F1 ${(f * 100).toFixed(1).padStart(5)}`
}

const solos = db.prepare(
  'select melid, performer, title, instrument from solo_info order by melid',
).all() as { melid: number; performer: string; title: string; instrument: string }[]

const totals = {
  phraseExact: tally(), phraseNear: tally(), ideaExact: tally(), ideaNear: tally(),
}
let count = 0
let predictedPhrases = 0
let actualPhrases = 0
let predictedIdeas = 0
let actualIdeas = 0

for (const solo of solos.slice(0, limit)) {
  const rows = db.prepare(
    'select onset, pitch, duration, period, division, bar, beat, tatum, beatdur from melody where melid = ? order by onset',
  ).all(solo.melid) as unknown as Row[]
  if (rows.length < 10) continue
  const sections = db.prepare(
    "select type, start from sections where melid = ? and type in ('PHRASE', 'IDEA') and start > 0",
  ).all(solo.melid) as { type: string; start: number }[]
  const actualPhrase = new Set(sections.filter((s) => s.type === 'PHRASE').map((s) => s.start))
  const actualIdea = new Set(sections.filter((s) => s.type === 'IDEA').map((s) => s.start))
  if (actualPhrase.size === 0) continue

  const beats = noChorus ? [] : db.prepare(
    'select bar, chorus_id from beats where melid = ? order by onset',
  ).all(solo.melid) as unknown as BeatRow[]

  const notes = toNotes(rows)
  const forced = chorusStarts(beats, Math.min(...rows.map((r) => r.bar)))
  // beatsPerBar stays at the default 4 so this number remains comparable with
  // every earlier corpus run; 437 of the 456 solos are in 4/4 anyway.
  const phrases = segment(notes, forced, opts)
  const predictedPhrase = new Set<number>()
  const predictedIdea = new Set<number>()
  let index = 0
  for (const phrase of phrases) {
    if (index > 0) predictedPhrase.add(index)
    let inner = index
    for (const idea of phrase.ideas) {
      if (inner > 0) predictedIdea.add(inner)
      inner += idea.notes.length
    }
    index += phrase.notes.length
  }

  const local = { phraseNear: tally(), ideaNear: tally() }
  score(predictedPhrase, actualPhrase, 0, totals.phraseExact)
  score(predictedPhrase, actualPhrase, 1, totals.phraseNear)
  score(predictedIdea, actualIdea, 0, totals.ideaExact)
  score(predictedIdea, actualIdea, 1, totals.ideaNear)
  score(predictedPhrase, actualPhrase, 1, local.phraseNear)
  score(predictedIdea, actualIdea, 1, local.ideaNear)
  predictedPhrases += predictedPhrase.size
  actualPhrases += actualPhrase.size
  predictedIdeas += predictedIdea.size
  actualIdeas += actualIdea.size
  count++
  if (verbose) {
    console.log(
      `${String(solo.melid).padStart(3)} ${(solo.performer + ' — ' + solo.title).slice(0, 44).padEnd(44)} ` +
      `${solo.instrument.padEnd(4)} phrases ${prf(local.phraseNear)}   ideas ${prf(local.ideaNear)}`,
    )
  }
}

console.log(`\n${count} solos`)
console.log(`phrases  predicted ${predictedPhrases}  annotated ${actualPhrases}`)
console.log(`  exact  ${prf(totals.phraseExact)}`)
console.log(`  ±1     ${prf(totals.phraseNear)}`)
console.log(`ideas    predicted ${predictedIdeas}  annotated ${actualIdeas}`)
console.log(`  exact  ${prf(totals.ideaExact)}`)
console.log(`  ±1     ${prf(totals.ideaNear)}`)
