/**
 * Run the whole pipeline on a .mxl and print what a player would see.
 *
 *   npm run solo -- "path/to/solo.mxl"
 *
 * Green tests are not evidence the output is good. This is how you read it.
 */
import { barLabel } from '../src/core/bars.ts'
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
console.log(`soloists: ${report.soloists.map((s) => `${s.name} (${barLabel(score, s.startBar)}-${barLabel(score, s.endBar)})`).join(', ')}`)
console.log(`phrases: ${analysis.phrases.length}`)
console.log()

const { profile } = analysis
const region = (label: string, r: typeof profile.overall): void => {
  const reg = r.register ? `${note(r.register.lo)}-${note(r.register.hi)} (mean ${note(Math.round(r.register.mean))})` : '-'
  console.log(
    `  ${label.padEnd(14)} bars ${barLabel(score, r.startBar).padStart(3)}-${barLabel(score, r.endBar).padEnd(4)}` +
    ` ${r.notesPerBar.toFixed(1)} notes/bar  silence ${Math.round(r.silence * 100)}%` +
    `  ${r.phrases} phrases of ~${Math.round(r.meanPhraseNotes)}  register ${reg}` +
    `  chromatic ${Math.round(r.chromaticRatio * 100)}%`,
  )
}
console.log('profile')
region('overall', profile.overall)
profile.choruses.forEach((c, i) => region(`chorus ${i + 1}`, c))
console.log(
  `  phrase edges: chromatic at start ${Math.round(profile.phraseChromaticism.start * 100)}%,` +
  ` at end ${Math.round(profile.phraseChromaticism.end * 100)}%`,
)
const busiest = [...profile.bars].sort((a, b) => b.notes - a.notes).slice(0, 3).map((b) => `${barLabel(score, b.bar)} (${b.notes})`)
const silent = profile.bars.filter((b) => b.silence >= 0.75).map((b) => barLabel(score, b.bar))
console.log(`  busiest bars: ${busiest.join(', ')}; mostly silent: ${silent.join(', ') || 'none'}`)
console.log()

console.log(`findings: ${analysis.findings.length}`)
for (const f of analysis.findings) {
  const bars = [...new Set(f.spans.map((s) => barLabel(score, s.bar)))].join(',')
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

console.log()
console.log(`practice units: ${result.units.length}`)
for (const u of result.units.slice(0, 6)) {
  console.log(`  ${u.id}  rank ${u.rank.toFixed(2)}  stock ${Math.round(u.stock * 100)}%  ${u.header}`)
  for (const s of u.steps) {
    const n = s.kind === 'loop' ? 1 : s.kind === 'write' ? 1 : s.exercises.length
    console.log(`      ${s.kind.padEnd(9)} ${n} exercise(s)  ${s.prompt.slice(0, 90)}…`)
  }
}
