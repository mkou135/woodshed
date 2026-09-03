/**
 * One snapshot of how the engine is doing, appended to `goldens/benchmarks.json`
 * and drawn by the bench page. Aggregate numbers only — the corpora never
 * enter the repo (DECISIONS 2026-08-24 "Corpus licensing").
 *
 *   npm run bench              # measure and append (replaces today's entry)
 *   npm run bench -- --dry     # measure and print, write nothing
 *
 * Quality comes from the four eval scripts run with `--json`, so nothing here
 * parses prose. Timing is `run()`'s own per-stage clock over Blake and the
 * peers, median per stage, in Node — the page records the browser's own.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { run } from '../src/pipeline.ts'
import type { StageTiming } from '../src/pipeline.ts'

const dry = process.argv.includes('--dry')
const GOLDEN = new URL('../goldens/benchmarks.json', import.meta.url)
const PEERS = process.env.PEERS_DIR ?? join(homedir(), 'dev/woodshed-data/peers')
// Blake is one of the peers (byte-identical to the MuseScore original); see src/test/solos.ts.
const BLAKE = join(PEERS, 'hey-lock.mxl')

export interface Snapshot {
  date: string
  commit: string
  /** 'measured' by this script, or 'spec' when copied from ENGINE_SPEC / DECISIONS by hand. */
  source: 'measured' | 'spec'
  wjd?: { solos: number; phrases: { p: number; r: number; f1: number }; ideas: { p: number; r: number; f1: number } }
  brackets?: Record<string, { matched: number; owner: number; falseStarts: number; ok: boolean }>
  owner?: Record<string, { phrases: { p: number; r: number; f1: number }; ideas: { p: number; r: number; f1: number }; seeded: boolean }>
  stock?: { bins: string[]; signals: Record<string, { auc: number; bins: number[] }> }
  blake?: { findings: number; units: number; phrases: number; top: string; topBars: number[]; exercises: Record<string, number> }
  timing?: { files: number; notes: number; median: StageTiming; blake: StageTiming }
  note?: string
}

function jsonLine(script: string): unknown {
  const out = execFileSync('node', ['--experimental-strip-types', '--no-warnings', script, '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 })
  const line = out.trim().split('\n').reverse().find((l) => l.startsWith('{'))
  if (!line) throw new Error(`${script} printed no JSON line`)
  return JSON.parse(line)
}

function timeFile(path: string): { timing: StageTiming; notes: number; result: ReturnType<typeof run> } {
  const bytes = new Uint8Array(readFileSync(path))
  run(bytes) // warm the JIT once; the measured run is the second
  const result = run(bytes)
  return { timing: result.timing!, notes: result.score.notes.length, result }
}

const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0 }
const r1 = (x: number): number => Math.round(x * 10) / 10

const snapshot: Snapshot = {
  date: new Date().toISOString().slice(0, 10),
  commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(),
  source: 'measured',
}

console.log('eval:wjd …')
snapshot.wjd = jsonLine('scripts/eval-wjd.ts') as Snapshot['wjd']
console.log('brackets …')
snapshot.brackets = (jsonLine('scripts/brackets.ts') as { sets: Snapshot['brackets'] }).sets
console.log('eval:owner …')
snapshot.owner = (jsonLine('scripts/eval-owner.ts') as { files: Snapshot['owner'] }).files
console.log('eval:stock …')
{
  const s = jsonLine('scripts/eval-stock.ts') as NonNullable<Snapshot['stock']>
  snapshot.stock = { bins: s.bins, signals: s.signals }
}

console.log('timing …')
const files = existsSync(PEERS) ? readdirSync(PEERS).filter((f) => /\.(mxl|musicxml)$/.test(f)).map((f) => join(PEERS, f)) : []
const timed = files.map(timeFile)
const stage = (k: keyof StageTiming): number => r1(median(timed.map((t) => t.timing[k])))
const blakeRun = files.includes(BLAKE) ? timed[files.indexOf(BLAKE)] : undefined
snapshot.timing = {
  files: timed.length,
  notes: Math.round(median(timed.map((t) => t.notes))),
  median: { ingest: stage('ingest'), prepare: stage('prepare'), analyse: stage('analyse'), practice: stage('practice'), total: stage('total') },
  blake: blakeRun ? Object.fromEntries(Object.entries(blakeRun.timing).map(([k, v]) => [k, r1(v)])) as unknown as StageTiming : { ingest: 0, prepare: 0, analyse: 0, practice: 0, total: 0 },
}
if (blakeRun) {
  const r = blakeRun.result
  const exercises: Record<string, number> = {}
  for (const u of r.units) for (const s of u.steps) {
    const n = s.kind === 'loop' ? 1 : s.kind === 'write' ? s.examples.length : s.kind === 'visualise' ? 0 : s.exercises.length
    exercises[s.kind] = (exercises[s.kind] ?? 0) + n
  }
  const top = r.analysis.findings[0]
  snapshot.blake = {
    findings: r.analysis.findings.length,
    units: r.units.length,
    phrases: r.analysis.phrases.length,
    top: top?.name ?? '—',
    topBars: [...new Set((top?.spans ?? []).map((s) => s.bar))],
    exercises,
  }
}

console.log(JSON.stringify(snapshot, null, 2))
if (!dry) {
  const history: Snapshot[] = existsSync(GOLDEN) ? JSON.parse(readFileSync(GOLDEN, 'utf8')) : []
  const kept = history.filter((h) => !(h.date === snapshot.date && h.source === 'measured'))
  kept.push(snapshot)
  kept.sort((a, b) => a.date.localeCompare(b.date))
  writeFileSync(GOLDEN, JSON.stringify(kept, null, 2) + '\n')
  console.log(`\nwrote ${kept.length} snapshots to goldens/benchmarks.json`)
}
