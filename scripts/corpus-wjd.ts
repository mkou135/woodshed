/**
 * Run the whole pipeline over every Weimar Jazz Database solo and report
 * what it makes of them: parse failures, chord symbols it cannot read, form
 * detection, finding and unit counts.
 *
 *   WJD=/path/to/wjazzd.db npm run corpus:wjd [-- --limit N --verbose]
 */
import { DatabaseSync } from 'node:sqlite'
import { scoreFromWjd } from '../src/ingest/wjd.ts'
import type { WjdBeatRow, WjdMelodyRow, WjdSolo } from '../src/ingest/wjd.ts'
import { prepare } from '../src/prepare/index.ts'
import { analyse } from '../src/analyse/index.ts'
import { buildUnits } from '../src/practice/unit.ts'
import { tuneFromScore } from '../src/practice/tune.ts'

const dbPath = process.env.WJD ?? `${process.env.HOME}/dev/woodshed-data/wjazzd.db`
const limitArg = process.argv.indexOf('--limit')
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity
const verbose = process.argv.includes('--verbose')
const db = new DatabaseSync(dbPath)

const solos = db.prepare('select melid, title, performer, instrument from solo_info order by melid').all() as unknown as WjdSolo[]
const melodyQ = db.prepare('select onset, pitch, duration, period, division, bar, beat, tatum, beatdur from melody where melid = ? order by onset')
const beatsQ = db.prepare("select bar, beat, coalesce(chord, '') as chord, coalesce(form, '') as form, coalesce(signature, '') as signature from beats where melid = ? order by onset")

const unparsed = new Map<string, number>()
const phase = new Map<string, number>()
const findings: number[] = []
const units: number[] = []
const errors: string[] = []
let n = 0
const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0

const started = Date.now()
for (const solo of solos.slice(0, limit)) {
  const melody = melodyQ.all(solo.melid) as unknown as WjdMelodyRow[]
  const beats = beatsQ.all(solo.melid) as unknown as WjdBeatRow[]
  if (melody.length < 10) continue
  try {
    const { score, unparsedChords } = scoreFromWjd(solo, melody, beats)
    for (const c of unparsedChords) unparsed.set(c, (unparsed.get(c) ?? 0) + 1)
    const report = prepare(score)
    const a = analyse(score, report)
    const u = buildUnits(a, score, { tune: tuneFromScore(score, report.form?.chorusStarts ?? []) })
    n++
    const key = report.form ? `${report.form.periodBars}·${report.form.phaseFrom}` : 'none'
    phase.set(report.form?.phaseFrom ?? 'no-form', (phase.get(report.form?.phaseFrom ?? 'no-form') ?? 0) + 1)
    findings.push(a.findings.length)
    units.push(u.length)
    if (verbose) {
      console.log(`${String(solo.melid).padStart(3)} ${(solo.performer + ' — ' + solo.title).slice(0, 44).padEnd(44)} ${solo.instrument.padEnd(4)} bars=${String(score.barCount).padStart(3)} form=${key.padEnd(12)} ${String(a.findings.length).padStart(2)}f ${String(u.length).padStart(3)}u  top="${a.findings[0]?.name ?? '—'}"`)
    }
  } catch (e) {
    errors.push(`${solo.melid} ${solo.performer} — ${solo.title}: ${(e as Error).message}`)
  }
}

console.log(`\n${n} solos in ${((Date.now() - started) / 1000).toFixed(1)}s; ${errors.length} errors`)
for (const e of errors.slice(0, 10)) console.log('  ' + e)
console.log('form phase:', [...phase.entries()].map(([k, v]) => `${k} ${v}`).join(', '))
console.log(`findings: median ${median(findings)}, min ${Math.min(...findings)}, max ${Math.max(...findings)}, zero ${findings.filter((f) => f === 0).length}`)
console.log(`units:    median ${median(units)}, min ${Math.min(...units)}, max ${Math.max(...units)}`)
const top = [...unparsed.entries()].sort((a, b) => b[1] - a[1])
console.log(`unparsed chord symbols: ${top.length} distinct, ${top.reduce((s, [, v]) => s + v, 0)} beats`)
console.log('  ' + top.slice(0, 25).map(([k, v]) => `${k}×${v}`).join('  '))
