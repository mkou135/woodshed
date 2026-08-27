/**
 * Run the whole pipeline on a .mxl and print what a player would see.
 *
 *   npm run solo -- "path/to/solo.mxl"
 *
 * Green tests are not evidence the output is good. This is how you read it.
 */
import { barLabel } from '../src/core/bars.ts'
import { readFileSync } from 'node:fs'
import { run, runWithAgent, liveClient, replayClient } from '../src/index.ts'
import { loadFixtures } from '../src/agent/fixtures.ts'
import type { AgentClient } from '../src/index.ts'

const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const pc = (n: number): string => NAMES[((n % 12) + 12) % 12]
const note = (midi: number): string => `${pc(midi)}${Math.floor(midi / 12) - 1}`

const args = process.argv.slice(2)
const noAgent = args.includes('--no-agent')
const persona = args.includes('--jaded') ? 'jaded' as const : 'teacher' as const
const path = args.find((a) => !a.startsWith('--'))
if (!path) {
  console.error('usage: npm run solo -- <file.mxl> [--no-agent] [--jaded]')
  process.exit(1)
}

// Key sources, in order: --no-agent wins; AGENT_FIXTURES replays recorded
// verdicts; ANTHROPIC_API_KEY goes live (AGENT_RECORD saves the verdicts).
// No key: deterministic output, exactly as before the agent existed.
function chooseClient(): AgentClient | null {
  if (noAgent) return null
  if (process.env.AGENT_FIXTURES) return replayClient(loadFixtures(process.env.AGENT_FIXTURES))
  if (process.env.ANTHROPIC_API_KEY) {
    return liveClient(process.env.ANTHROPIC_API_KEY, { recordDir: process.env.AGENT_RECORD, model: process.env.ANTHROPIC_MODEL })
  }
  console.log('agent: no ANTHROPIC_API_KEY — deterministic output (docs/superpowers/specs/2026-08-25-agent-layer-design.md)')
  return null
}

const client = chooseClient()
const bytes = new Uint8Array(readFileSync(path))
const result = client ? await runWithAgent(bytes, client, undefined, persona) : { ...run(bytes), agent: null }
const { score, report, analysis, exercises } = result

console.log(`${score.instrument.name}; ${score.barCount} bars, ${score.notes.length} notes`)
if (report.form) {
  console.log(`form: ${report.form.periodBars}-bar chorus x${report.form.chorusStarts.length} (${Math.round(report.form.agreement * 100)}% agreement)`)
}
console.log(`soloists: ${report.soloists.map((s) => `${s.name} (${barLabel(score, s.startBar)}-${barLabel(score, s.endBar)})`).join(', ')}`)
console.log(`phrases: ${analysis.phrases.length}`)
for (const a of report.adjustments) {
  const where = 'bar' in a.target
    ? `bar ${barLabel(score, a.target.bar)}`
    : `bars ${barLabel(score, a.target.range[0])}-${barLabel(score, a.target.range[1])}`
  console.log(`  ${a.severity} ${a.kind} ${where}: ${a.reason}`)
}
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
  const common = f.language
    ? `  · common language${f.lickShare !== undefined ? ` (in ${(f.lickShare * 100).toFixed(0)}% of recorded solos)` : ''}`
    : ''
  console.log(
    `  ${f.confidence.toFixed(2)}  ${f.detectedBy.join('+').padEnd(22)} ` +
    `${f.name.padEnd(44)} bars ${bars.padEnd(14)} ${played}${common}`,
  )
}

console.log()
const declared = analysis.scaleSpans.filter((s) => s.declared)
console.log(`chord scales: ${analysis.scaleSpans.length} spans, ${declared.length} declared by the chart`)
for (const s of analysis.scaleSpans.slice(0, 24)) {
  console.log(
    `  bar ${barLabel(score, s.bar).padEnd(6)} ${(s.declared ? '*' : ' ')} ` +
    `${s.name.padEnd(20)} ${s.because}`,
  )
}
if (analysis.scaleSpans.length > 24) console.log(`  ... ${analysis.scaleSpans.length - 24} more`)

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

if (result.agent) {
  const { narration, ranking, sessionPlan, boundaries, usage, degraded } = result.agent
  console.log()
  console.log('agent')
  if (boundaries) console.log(`  boundaries adjudicated: ${boundaries.size}`)
  if (narration) {
    console.log()
    for (const p of narration.overview) console.log(`  ${p}`)
    for (const f of narration.findingNames) console.log(`  ${f.id}: ${f.name}`)
    for (const l of narration.lookFors) console.log(`  ${l.unitId}: ${l.text}`)
  }
  if (ranking) {
    console.log()
    console.log('  menu (agent order)')
    for (const o of ranking.order) console.log(`    ${o.keep ? 'keep' : 'cut '} ${o.unitId}  ${o.reason}`)
  }
  if (sessionPlan) {
    console.log()
    console.log('  session')
    for (const u of sessionPlan.units) console.log(`    ${u.unitId}: ${u.steps.join(' → ')}${u.note ? `  (${u.note})` : ''}`)
    console.log(`    interleave: ${sessionPlan.interleave}`)
  }
  if (degraded.length) console.log(`  degraded to the deterministic path: ${degraded.join(', ')}`)
  for (const u of usage) console.log(`  agent tokens: ${u.job} ${u.inputTokens} in / ${u.outputTokens} out`)
}
