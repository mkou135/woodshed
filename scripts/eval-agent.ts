/**
 * Score agent-adjudicated segmentation against the WJD annotations, from
 * recorded verdicts only — no live calls here, ever.
 *
 *   npm run eval:agent
 *
 * Recordings live outside the repo (corpus licensing): record them by running
 * the fixed subset with a key and AGENT_RECORD pointing at
 * ~/dev/woodshed-data/agent-fixtures/<melid>/. Absent recordings are skipped
 * and said so; deltas are engine-with-overrides minus engine-alone.
 */
import { DatabaseSync } from 'node:sqlite'
import { existsSync, readFileSync } from 'node:fs'
import { notesFromWjd } from '../src/ingest/wjd.ts'
import type { WjdMelodyRow } from '../src/ingest/wjd.ts'
import { boundaryCandidates, segment } from '../src/analyse/segment.ts'
import type { Note } from '../src/core/types.ts'
import { BoundaryVerdicts } from '../src/agent/verdicts.ts'

const dbPath = process.env.WJD ?? `${process.env.HOME}/dev/woodshed-data/wjazzd.db`
const fixturesRoot = process.env.AGENT_FIXTURES_WJD ?? `${process.env.HOME}/dev/woodshed-data/agent-fixtures`
const SUBSET = 20

const db = new DatabaseSync(dbPath)
const toNotes = (rows: WjdMelodyRow[]): Note[] => notesFromWjd(rows, Math.min(...rows.map((r) => r.bar)))

interface Tally { tp: number; fp: number; fn: number }
const tally = (): Tally => ({ tp: 0, fp: 0, fn: 0 })

function scoreSet(predicted: Set<number>, actual: Set<number>, slack: number, t: Tally): void {
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

const recall = (t: Tally): number => (t.tp / Math.max(1, t.tp + t.fn)) * 100

function ideaStarts(notes: Note[], overrides?: Map<number, boolean>): Set<number> {
  const out = new Set<number>()
  let index = 0
  for (const phrase of segment(notes, [], { overrides })) {
    for (const idea of phrase.ideas) {
      if (index > 0) out.add(index)
      index += idea.notes.length
    }
  }
  return out
}

const solos = db.prepare('select melid from solo_info order by melid limit ?').all(SUBSET) as { melid: number }[]

let scored = 0
let skipped = 0
const engine = tally()
const agent = tally()

for (const { melid } of solos) {
  const file = `${fixturesRoot}/${melid}/segment.json`
  if (!existsSync(file)) { skipped++; continue }
  const rows = db.prepare(
    'select onset, pitch, duration, period, division, bar, beat, tatum, beatdur from melody where melid = ? order by onset',
  ).all(melid) as unknown as WjdMelodyRow[]
  if (rows.length < 10) continue
  const sections = db.prepare(
    "select start from sections where melid = ? and type = 'IDEA' and start > 0",
  ).all(melid) as { start: number }[]
  const actual = new Set(sections.map((s) => s.start))
  if (actual.size === 0) continue

  const notes = toNotes(rows)
  const verdict = BoundaryVerdicts.safeParse(JSON.parse(readFileSync(file, 'utf8')))
  if (!verdict.success) { console.log(`melid ${melid}: recording fails the schema — skipped`); skipped++; continue }
  const byId = new Map(boundaryCandidates(notes).map((c) => [c.id, c.index]))
  const overrides = new Map<number, boolean>()
  for (const v of verdict.data.verdicts) {
    const index = byId.get(v.candidateId)
    if (index !== undefined) overrides.set(index, v.boundary)
  }

  scoreSet(ideaStarts(notes), actual, 1, engine)
  scoreSet(ideaStarts(notes, overrides), actual, 1, agent)
  scored++
}

if (scored === 0) {
  console.log(`No recordings under ${fixturesRoot}.`)
  console.log('Record the subset with a key:')
  console.log('  for each of the first 20 WJD solos, run the pipeline with ANTHROPIC_API_KEY set and')
  console.log('  AGENT_RECORD=~/dev/woodshed-data/agent-fixtures/<melid> — then re-run npm run eval:agent.')
  process.exit(0)
}

console.log(`scored ${scored} solos (${skipped} without recordings)`)
console.log(`idea recall, near (±1): engine ${recall(engine).toFixed(1)} → adjudicated ${recall(agent).toFixed(1)}`)
console.log('ship rule: the adjudicated number must beat the engine before job 3 goes live by default.')
