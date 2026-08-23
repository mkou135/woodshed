/**
 * Run the whole pipeline on a .mxl and print what a player would see.
 *
 *   npm run solo -- "path/to/solo.mxl"
 *
 * Green tests are not evidence the output is good. This is how you read it.
 */
import { readFileSync } from 'node:fs'
import { run } from '../src/index.ts'

const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const pc = (n: number): string => NAMES[((n % 12) + 12) % 12]
const note = (midi: number): string => `${pc(midi)}${Math.floor(midi / 12) - 1}`

const path = process.argv[2]
if (!path) {
  console.error('usage: npm run solo -- <file.mxl>')
  process.exit(1)
}

const result = run(new Uint8Array(readFileSync(path)))
const { score, report, analysis, exercises } = result

console.log(`${score.instrument.name}; ${score.barCount} bars, ${score.notes.length} notes`)
if (report.form) {
  console.log(`form: ${report.form.periodBars}-bar chorus x${report.form.chorusStarts.length} (${Math.round(report.form.agreement * 100)}% agreement)`)
}
console.log(`soloists: ${report.soloists.map((s) => `${s.name} (${s.startBar}-${s.endBar})`).join(', ')}`)
console.log(`phrases: ${analysis.phrases.length}`)
console.log()

console.log(`findings: ${analysis.findings.length}`)
for (const f of analysis.findings) {
  const bars = [...new Set(f.spans.map((s) => s.bar))].join(',')
  const played = f.spans
    .slice(0, 3)
    .map((s) => analysis.contexts.slice(s.startIndex, s.endIndex + 1).map((c) => note(c.note.midi)).join(' '))
    .join('  /  ')
  console.log(
    `  ${f.confidence.toFixed(2)}  ${f.detectedBy.join('+').padEnd(22)} ` +
    `${f.name.padEnd(44)} bars ${bars.padEnd(14)} ${played}`,
  )
}

console.log()
console.log(`exercises: ${exercises.length}`)
for (const e of exercises) {
  console.log(`  ${e.title}`)
  for (const bar of e.bars.slice(0, 4)) {
    console.log(`      ${pc(bar.rootPc)} ${bar.quality}: ${bar.midis.map(note).join(' ')}`)
  }
  if (e.bars.length > 4) console.log(`      ... ${e.bars.length - 4} more bars`)
}
