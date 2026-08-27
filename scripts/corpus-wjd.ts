/**
 * Run the whole pipeline over every Weimar Jazz Database solo and report
 * what it makes of them: parse failures, chord symbols it cannot read, form
 * detection, finding and unit counts.
 *
 *   WJD=/path/to/wjazzd.db npm run corpus:wjd [-- --limit N --verbose]
 *
 * Without --limit the sweep also diffs itself against `goldens/corpus-wjd.json`
 * and exits non-zero on any difference, so a change to segmentation or
 * detection shows its blast radius over 456 solos the way `pipeline.test.ts`
 * shows it over one. `--write-golden` re-pins the file after a change the
 * owner has read and accepted.
 *
 * The database is ODbL-licensed and lives outside the repo; the golden holds
 * derived counts per melid and nothing else. See the attribution note the
 * writer puts at its head.
 */
import { DatabaseSync } from 'node:sqlite'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { scoreFromWjd } from '../src/ingest/wjd.ts'
import type { WjdBeatRow, WjdMelodyRow, WjdSolo } from '../src/ingest/wjd.ts'
import { prepare } from '../src/prepare/index.ts'
import { analyse } from '../src/analyse/index.ts'
import { buildUnits } from '../src/practice/unit.ts'
import { tuneFromScore } from '../src/practice/tune.ts'

const dbPath = process.env.WJD ?? `${process.env.HOME}/dev/woodshed-data/wjazzd.db`
const goldenPath = fileURLToPath(new URL('../goldens/corpus-wjd.json', import.meta.url))
const limitArg = process.argv.indexOf('--limit')
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity
const verbose = process.argv.includes('--verbose')
const writeGolden = process.argv.includes('--write-golden')

// The corpus is a local-only checkout, so an absent database is the normal
// state on a fresh clone rather than a failure. Say so and stop, before
// anything tries to open it.
if (!existsSync(dbPath)) {
  console.log(`skipped: no Weimar Jazz Database at ${dbPath}`)
  console.log('  the corpus is ODbL-licensed and lives outside the repo; set WJD=<path> to point elsewhere.')
  process.exit(0)
}

const db = new DatabaseSync(dbPath)

const solos = db.prepare('select melid, title, performer, instrument from solo_info order by melid').all() as unknown as WjdSolo[]
const melodyQ = db.prepare('select onset, pitch, duration, period, division, bar, beat, tatum, beatdur from melody where melid = ? order by onset')
const beatsQ = db.prepare("select bar, beat, coalesce(chord, '') as chord, coalesce(form, '') as form, coalesce(signature, '') as signature from beats where melid = ? order by onset")

/**
 * What the golden pins per solo: four counts and the provenance of the form
 * phase. `form` is not a count, but it names *which marks* the detector
 * locked the chorus grid to — the thing this engine is most likely to move —
 * and it is a four-value enum about the detector, not a fact about the
 * recording. A solo the engine refuses records why instead; a rejection that
 * silently stops happening is as much a regression as a count that moves.
 */
interface Counts {
  findings: number
  units: number
  phrases: number
  ideas: number
  form: string
}
type Entry = Counts | { rejected: string }
const isCounts = (e: Entry): e is Counts => !('rejected' in e)

const COUNT_FIELDS = ['findings', 'units', 'phrases', 'ideas'] as const

/**
 * Rejections are stored as a stable code, not as the thrown message. The
 * message interpolates the solo's actual meters, which is a musical fact
 * about a specific recording and so may not live in the repo; a code also
 * survives rewording the message.
 */
function reasonCode(message: string): string {
  if (message.includes('changes meter')) return 'mixed-meter'
  return 'error'
}

const unparsed = new Map<string, number>()
const phase = new Map<string, number>()
const findings: number[] = []
const units: number[] = []
const errors: string[] = []
const current = new Map<number, Entry>()
let n = 0
const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0

const started = Date.now()
for (const solo of solos.slice(0, limit)) {
  const melody = melodyQ.all(solo.melid) as unknown as WjdMelodyRow[]
  const beats = beatsQ.all(solo.melid) as unknown as WjdBeatRow[]
  // Too short to analyse. Recorded rather than skipped silently: if an ingest
  // change starves a solo of notes, that should read as a change, not as a
  // solo that quietly left the corpus.
  if (melody.length < 10) {
    current.set(solo.melid, { rejected: 'too-few-notes' })
    continue
  }
  try {
    const { score, unparsedChords } = scoreFromWjd(solo, melody, beats)
    for (const c of unparsedChords) unparsed.set(c, (unparsed.get(c) ?? 0) + 1)
    const report = prepare(score)
    const a = analyse(score, report)
    const u = buildUnits(a, score, { tune: tuneFromScore(score, report.form?.chorusStarts ?? []) })
    n++
    const key = report.form ? `${report.form.periodBars}·${report.form.phaseFrom}` : 'none'
    const phaseFrom = report.form?.phaseFrom ?? 'no-form'
    phase.set(phaseFrom, (phase.get(phaseFrom) ?? 0) + 1)
    findings.push(a.findings.length)
    units.push(u.length)
    current.set(solo.melid, {
      findings: a.findings.length,
      units: u.length,
      phrases: a.phrases.length,
      ideas: a.phrases.reduce((s, p) => s + p.ideas.length, 0),
      form: phaseFrom,
    })
    if (verbose) {
      console.log(`${String(solo.melid).padStart(3)} ${(solo.performer + ' — ' + solo.title).slice(0, 44).padEnd(44)} ${solo.instrument.padEnd(4)} bars=${String(score.barCount).padStart(3)} form=${key.padEnd(12)} ${String(a.findings.length).padStart(2)}f ${String(u.length).padStart(3)}u  top="${a.findings[0]?.name ?? '—'}"`)
    }
  } catch (e) {
    const message = (e as Error).message
    errors.push(`${solo.melid} ${solo.performer} — ${solo.title}: ${message}`)
    current.set(solo.melid, { rejected: reasonCode(message) })
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

// ---------------------------------------------------------------- the golden

const ATTRIBUTION = [
  'Derived aggregate counts from the Weimar Jazz Database (Jazzomat Research',
  'Project, Hochschule fur Musik FRANZ LISZT Weimar), licensed under the Open',
  'Database License (ODbL) v1.0. This file is a derived statistic: it holds',
  'melid -> engine output counts and nothing else — no titles, performers,',
  'instruments, tunes, notes or chord symbols. The database itself is never',
  'committed. Regenerate with: npm run corpus:wjd -- --write-golden',
]

/** One solo per line, so `git diff` reads as a list of solos that moved. */
function serialise(entries: Map<number, Entry>): string {
  const note = ATTRIBUTION.map((l) => `    ${JSON.stringify(l)}`).join(',\n')
  const lines = [...entries.keys()].sort((a, b) => a - b)
    .map((melid) => `    "${melid}": ${JSON.stringify(entries.get(melid))}`)
  return `{\n  "attribution": [\n${note}\n  ],\n  "solos": {\n${lines.join(',\n')}\n  }\n}\n`
}

/** How many solos moved in each field, filled in as `report` walks them. */
const fieldMoved = new Map<string, number>()

if (limit !== Infinity) {
  // A partial sweep can neither be compared nor pinned: every solo past the
  // limit would read as removed, and writing one would poison the golden.
  console.log(writeGolden
    ? '\ngolden: NOT written — --limit runs only part of the corpus. Re-run without it.'
    : '\ngolden: not compared — --limit runs only part of the corpus.')
} else if (writeGolden) {
  writeFileSync(goldenPath, serialise(current))
  console.log(`\ngolden: wrote ${current.size} solos to goldens/corpus-wjd.json`)
} else if (!existsSync(goldenPath)) {
  console.log('\ngolden: none yet — run with --write-golden to pin this sweep.')
} else {
  const golden = new Map<number, Entry>(
    Object.entries((JSON.parse(readFileSync(goldenPath, 'utf8')) as { solos: Record<string, Entry> }).solos)
      .map(([k, v]) => [Number(k), v]),
  )
  if (!report(golden, current)) process.exit(1)
}

/**
 * Print what moved, and return true when nothing did. Designed to be read
 * after a segmentation change over 452 solos: the counts of solos changed per
 * field come first, because "phrases moved in 340 solos, findings in 12" is
 * the sentence that tells you what you did, and it survives the cap that
 * truncates the per-solo list.
 */
function report(golden: Map<number, Entry>, now: Map<number, Entry>): boolean {
  const added = [...now.keys()].filter((m) => !golden.has(m)).sort((a, b) => a - b)
  const removed = [...golden.keys()].filter((m) => !now.has(m)).sort((a, b) => a - b)
  const changed: { melid: number; size: number; text: string }[] = []
  let unchanged = 0

  for (const [melid, was] of golden) {
    const is = now.get(melid)
    if (!is) continue
    if (JSON.stringify(was) === JSON.stringify(is)) { unchanged++; continue }
    // A solo crossing between analysed and rejected is the loudest kind of
    // change there is, so it sorts above any numeric delta.
    if (!isCounts(was) || !isCounts(is)) {
      const label = (e: Entry): string => (isCounts(e) ? `analysed (${e.findings}f)` : `rejected: ${e.rejected}`)
      changed.push({ melid, size: Infinity, text: `${label(was)} → ${label(is)}` })
      continue
    }
    const parts: string[] = []
    let size = 0
    for (const f of COUNT_FIELDS) {
      if (was[f] === is[f]) continue
      const d = is[f] - was[f]
      size += Math.abs(d)
      parts.push(`${f} ${was[f]}→${is[f]} (${d > 0 ? '+' : ''}${d})`)
      fieldMoved.set(f, (fieldMoved.get(f) ?? 0) + 1)
    }
    if (was.form !== is.form) {
      parts.push(`form ${was.form}→${is.form}`)
      fieldMoved.set('form', (fieldMoved.get('form') ?? 0) + 1)
    }
    changed.push({ melid, size, text: parts.join('  ') })
  }

  const clean = changed.length === 0 && added.length === 0 && removed.length === 0
  console.log(`\ngolden (${golden.size} solos): unchanged ${unchanged}, changed ${changed.length}, added ${added.length}, removed ${removed.length}`)
  if (clean) return true

  if (fieldMoved.size > 0) {
    console.log('  solos moved per field: ' + [...fieldMoved.entries()]
      .sort((a, b) => b[1] - a[1]).map(([f, c]) => `${f} ${c}`).join(', '))
  }
  const totals = [...COUNT_FIELDS].map((f) => {
    const sum = (m: Map<number, Entry>): number => [...m.values()].reduce((s, e) => s + (isCounts(e) ? e[f] : 0), 0)
    const a = sum(golden)
    const b = sum(now)
    return `${f} ${a}→${b} (${b - a > 0 ? '+' : ''}${b - a})`
  })
  console.log('  totals: ' + totals.join(', '))
  if (added.length > 0) console.log(`  added: ${added.slice(0, 20).join(', ')}${added.length > 20 ? ` … and ${added.length - 20} more` : ''}`)
  if (removed.length > 0) console.log(`  removed: ${removed.slice(0, 20).join(', ')}${removed.length > 20 ? ` … and ${removed.length - 20} more` : ''}`)

  // Biggest movers first: after a broad change the tail is all the same story.
  const shown = changed.sort((a, b) => b.size - a.size || a.melid - b.melid).slice(0, 25)
  for (const c of shown) console.log(`    ${String(c.melid).padStart(3)}  ${c.text}`)
  if (changed.length > shown.length) console.log(`    … and ${changed.length - shown.length} more`)
  console.log('\n  read the changes, then re-pin with: npm run corpus:wjd -- --write-golden')
  return false
}
