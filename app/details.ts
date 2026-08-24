import { barLabel, barRange } from '../src/core/bars.ts'
import { noteName } from '../src/index.ts'
import type { Adjustment, PipelineResult, Score } from '../src/index.ts'
import { button, el } from './dom.ts'

/**
 * Engine diagnostics — what the pipeline saw — behind one button. Blocking
 * adjustments are not here: they need the player's decision and render
 * inline (see main.ts).
 */

/** An Adjustment targets either a single bar or an inclusive range. */
export function whereOf(adjustment: Adjustment, score: Pick<Score, 'repeats'>): string {
  const target = adjustment.target
  // Repeat sections are reported by written bar already.
  if (adjustment.kind === 'repeat-unrolled' && 'range' in target) return `bars ${target.range[0]}–${target.range[1]}`
  if ('bar' in target) return `bar ${barLabel(score, target.bar)}`
  return barRange(score, target.range[0], target.range[1])
}

const noteOctave = (midi: number): string => `${noteName(midi)}${Math.floor(midi / 12) - 1}`

function summary(result: PipelineResult): HTMLElement[] {
  const { score, report } = result
  const list = el('dl')
  const row = (label: string, value: string): void => {
    list.append(el('dt', undefined, label), el('dd', undefined, value))
  }
  row('Instrument', score.instrument.name)
  row('Length', `${score.barCount} bars, ${score.notes.length} notes`)
  row('Form', report.form
    ? `${report.form.periodBars}-bar chorus, ${report.form.chorusStarts.length} choruses ` +
      `(${report.form.method} match, ${Math.round(report.form.agreement * 100)}% agreement)`
    : 'not detected')
  row('Soloists', report.soloists.length > 0
    ? report.soloists.map((s) => `${s.name} (${barRange(score, s.startBar, s.endBar)})`).join(', ')
    : 'none named')
  return [el('h2', undefined, 'What the file says'), list]
}

function adjustments(result: PipelineResult): HTMLElement[] {
  const rest = result.report.adjustments.filter((a) => a.severity !== 'blocking')
  if (rest.length === 0) return []
  const list = el('ul')
  for (const a of rest) {
    list.appendChild(el('li', undefined, `${a.severity} · ${whereOf(a, result.score)} — ${a.reason}`))
  }
  return [el('h2', undefined, `${rest.length} adjustments`), list]
}

/** The shape of the solo in numbers: what a summary would be written from. */
function profile(result: PipelineResult): HTMLElement[] {
  const { profile } = result.analysis
  const score = result.score
  const regions = profile.choruses.length > 1
    ? profile.choruses.map((c, i) => ({ label: `Chorus ${i + 1}`, r: c }))
    : [{ label: 'Solo', r: profile.overall }]

  const table = el('table')
  const head = el('tr')
  for (const h of ['', 'Bars', 'Notes / bar', 'Silence', 'Phrases', 'Register', 'Chromatic']) {
    head.appendChild(el('th', undefined, h))
  }
  table.appendChild(head)
  for (const { label, r } of regions) {
    const row = el('tr')
    const cells = [
      label,
      `${barLabel(score, r.startBar)}–${barLabel(score, r.endBar)}`,
      r.notesPerBar.toFixed(1),
      `${Math.round(r.silence * 100)}%`,
      `${r.phrases} of ~${Math.round(r.meanPhraseNotes)}`,
      r.register ? `${noteOctave(r.register.lo)}–${noteOctave(r.register.hi)}` : '–',
      `${Math.round(r.chromaticRatio * 100)}%`,
    ]
    for (const c of cells) row.appendChild(el('td', undefined, c))
    table.appendChild(row)
  }

  const silent = profile.bars.filter((b) => b.silence >= 0.75).map((b) => barLabel(score, b.bar))
  const busiest = [...profile.bars].sort((a, b) => b.notes - a.notes).slice(0, 3)
  const note = el('p', 'note',
    `Busiest bars ${busiest.map((b) => barLabel(score, b.bar)).join(', ')}. ` +
    (silent.length ? `Mostly silent: ${silent.join(', ')}. ` : '') +
    `Phrase starts ${Math.round(profile.phraseChromaticism.start * 100)}% chromatic, ` +
    `phrase ends ${Math.round(profile.phraseChromaticism.end * 100)}%.`)
  return [el('h2', undefined, 'Profile'), table, note]
}

export function detailsDrawer(result: PipelineResult): { button: HTMLButtonElement; drawer: HTMLElement } {
  const drawer = el('section', 'details')
  drawer.hidden = true
  drawer.append(...summary(result), ...adjustments(result), ...profile(result))
  const toggle = button('btn quiet', 'Details', () => {
    drawer.hidden = !drawer.hidden
    toggle.setAttribute('aria-expanded', String(!drawer.hidden))
  })
  toggle.setAttribute('aria-expanded', 'false')
  return { button: toggle, drawer }
}
