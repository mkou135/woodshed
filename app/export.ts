import type { OverlayItem } from './score.ts'

/**
 * The annotation export: one standalone HTML file — the rendered score with
 * every engine overlay drawn and badge-labelled, the list of annotations
 * with what each device is, and a legend that says what every mark means
 * and the parameters it was detected with. The numbers here are prose
 * copies of ENGINE_SPEC values; update them in the same commit as any
 * parameter change (the spec's own rule).
 */

interface LegendEntry {
  vector: OverlayItem['vector'] | 'phrase' | 'idea'
  name: string
  swatch: string
  meaning: string
  parameters: string
}

const LEGEND: LegendEntry[] = [
  {
    vector: 'phrase',
    name: 'Phrase tick (amber, numbered)',
    swatch: '#c4641d',
    meaning: 'Where the engine hears a phrase begin — the breath-to-breath unit. A half-opacity tick is a phrase it opened on a call it was not sure of: the boundary that opened it cleared the 0.45 threshold by less than 0.15, which is the same width of doubt a grey caret marks. The two are not alternatives and often land on the same gap: the caret says the call was close, the faint tick says the engine cut there anyway. A faint tick with no caret under it is a chorus start, where the rest the caret requires need not be there at all.',
    parameters: 'Boundary strength per gap = min(1, 0.6·rest + 0.45·length + 0.25·leap); a phrase ends when the total reaches 0.45 with a real rest present (rests under a 16th are articulation; a quarter or more counts in full). A gap into a chorus downbeat is tested without the rest requirement and with a 0.45 chorus prior added — min(1, total + 0.45) ≥ 0.45 — but only after the idea test, so a chorus start that already reads as an idea stays one, and never when the line picked up into that downbeat from the last two beats of the bar before — a phrase that runs over the bar line is not cut at it. Scored 80.8 F1 against the 456-solo Weimar Jazz Database.',
  },
  {
    vector: 'idea',
    name: 'Idea tick (blue, numbered n.2, n.3 …)',
    swatch: '#2b6cb0',
    meaning: 'A gesture boundary inside a phrase — the units practice is cut into.',
    parameters: 'Opens on the idea profile reaching 0.45, on a local peak (a gap ≥ 0.35 that is the strongest within ±4 gaps and ≥ 2.5× their mean), on the pickup gesture (a note held ≥ 3× the median into a lone last-half-beat note landing on the downbeat), or on a riff restatement.',
  },
  {
    vector: 'cell',
    name: 'Named cell (blue underline)',
    swatch: '#2f6fb2',
    meaning: 'A dictionary vocabulary cell: the notes spell a named figure (digital pattern 1235, major-seventh arpeggio, dominant b9 cell …) in chord-relative degrees over the sounding chord.',
    parameters: 'Hand-written dictionary keyed by degree string and chord quality; cells of 3–8 notes, matched longest first (a shorter hit inside a longer one is dropped), all notes on one chord, never across an idea boundary. Underline opacity = 0.35 + 0.65·confidence.',
  },
  {
    vector: 'device',
    name: 'Target device (orange underline)',
    swatch: '#d97706',
    meaning: 'An approach or enclosure: a short window of notes aiming at a goal note (the engine names the target degree and direction).',
    parameters: 'Window of 2–5 notes; last step 1–2 semitones into the target; target strength ≥ 0.3 (built from beat position +0.4/+0.2, being longer than the next note +0.3, a new harmony +0.3, landing on 3/7/b7 +0.2). Diatonic monotone walks are excluded. Enclosures outscore plain approaches.',
  },
  {
    vector: 'recurring',
    name: 'Recurring cell (green underline)',
    swatch: '#2f855a',
    meaning: 'A figure the player keeps returning to: the same interval shape appearing more than once, named by its intervals when no dictionary name exists.',
    parameters: 'Interval n-grams of 4–7 notes with ≥ 2 occurrences; all-step one-direction runs excluded as trivia; cells of ≥ 5 notes join a variant family when they are the head’s exact inversion or differ in one interval by ≤ 2 semitones.',
  },
  {
    vector: 'language',
    name: 'Common language (magenta underline)',
    swatch: '#b83280',
    meaning: 'Common bebop/jazz vocabulary: a named cliché from the pedagogy literature, or an unnamed stretch whose degree pattern is widespread in recorded jazz (the mined corpus table). Identification, not discovery.',
    parameters: 'Named clichés are exact degree matches (bebop descents, b9 cells and resolutions, ii–V 1235 into 3-5-7-9 — cross-chord licks check the root moving down a fifth). Mined stretches: degree windows of 4–8 notes (or 2–4 a side across one chord change) whose pattern appears in at least 25% of 441 Weimar Jazz Database solos; the table itself keeps patterns at ≥ 10% WJD share or ≥ 8 of 1,785 Bopland licks. Opacity tracks the corpus share.',
  },
  {
    vector: 'candidate',
    name: 'Boundary candidate (grey caret)',
    swatch: '#5a5f68',
    meaning: 'A gap the engine could not call: nearly a phrase boundary, not quite. These are the judgement calls it ducked (and puts to the agent when one runs) — the best places to check its ear against yours.',
    parameters: 'A gap with a real rest whose phrase-cue total lands within ±0.15 of the 0.45 threshold.',
  },
  {
    vector: 'stock',
    name: 'Stock shading (grey wash)',
    swatch: '#8892a0',
    meaning: 'A practice unit the engine discounts as everyone’s vocabulary rather than the player’s: mostly a scale run / plain arpeggio, or mostly corpus-common language.',
    parameters: 'Shown when the largest of three shares reaches 0.5 — run (notes inside ≥ 4-note one-direction step or third/fourth runs), corpus (per-note best WJD 4-note contour share), language (the mined degree-pattern cover). Rank penalty uses max(run, corpus) × 2; the language share is descriptive only.',
  },
]

const VECTOR_ORDER: OverlayItem['vector'][] = ['cell', 'device', 'recurring', 'language', 'candidate', 'stock']
const VECTOR_TITLE: Record<OverlayItem['vector'], string> = {
  cell: 'Named cells',
  device: 'Target devices',
  recurring: 'Recurring cells',
  language: 'Common language',
  candidate: 'Boundary candidates',
  stock: 'Stock stretches',
}

// '&' first, always, so it doesn't re-escape the entities the other
// replacements introduce. No current call site interpolates into an HTML
// attribute — every one lands in text content, where '"' is legal — but
// escaping it anyway makes this safe by construction rather than safe only
// because of how it happens to be called today.
export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The SVG classes the score markup carries, inlined so the file stands alone. */
const SVG_CSS = `
  .phrase-tick rect { fill: #c4641d } .phrase-tick text { fill: #c4641d; font: 700 13px sans-serif }
  .phrase-tick.weak rect, .phrase-tick.weak text { opacity: 0.5 }
  .idea-tick rect { fill: #2b6cb0 } .idea-tick text { fill: #2b6cb0; font: 600 12px sans-serif }
  .scale-band path { fill: none; stroke: #5a5f68; stroke-width: 1.2 }
  .scale-band text { fill: #5a5f68; font: 500 11px sans-serif }
  .scale-band.declared path { stroke: #1a1c20; stroke-width: 1.8 }
  .scale-band.declared text { fill: #1a1c20; font-weight: 700 }
  .eng-overlay.ov-cell rect, .eng-overlay.ov-cell text { fill: #2f6fb2 }
  .eng-overlay.ov-device rect, .eng-overlay.ov-device text { fill: #d97706 }
  .eng-overlay.ov-recurring rect, .eng-overlay.ov-recurring text { fill: #2f855a }
  .eng-overlay.ov-language rect, .eng-overlay.ov-language text { fill: #b83280 }
  .ov-badge { font: 700 9px sans-serif }
  .cand-caret path { fill: #5a5f68; opacity: 0.8 }
  .cand-caret .ov-badge { fill: #5a5f68 }
  .stock-shade { fill: #8892a0; fill-opacity: 0.13 }
  .agent-marker circle { fill: #b7791f }
`

/** The annotation tables, one section per vector that has any items. */
export function annotationTablesHtml(items: OverlayItem[]): string {
  return VECTOR_ORDER.map((vector) => {
    const rows = items.filter((i) => i.vector === vector)
    if (rows.length === 0) return ''
    return `<h3>${esc(VECTOR_TITLE[vector])} (${rows.length})</h3>
<table>${rows.map((i) => `<tr><td class="id">${esc(i.id)}</td><td class="what">${esc(i.label)}</td><td class="where">${esc(i.where)}</td><td class="detail">${esc(i.detail)}</td></tr>`).join('\n')}</table>`
  }).join('\n')
}

/** What every mark means and the parameters behind it. */
export function legendHtml(): string {
  return LEGEND.map((l) => `<div class="entry">
<h3><span class="swatch" style="background:${l.swatch}"></span>${esc(l.name)}</h3>
<p>${esc(l.meaning)}</p>
<p class="params"><strong>How it is detected:</strong> ${esc(l.parameters)}</p>
</div>`).join('\n')
}

/**
 * The shared page: one stylesheet, one shell, for both the annotation export
 * and the fuller session report. Print rules live here because both documents
 * exist to be turned into a PDF by the browser — the score and the exercises
 * are inline SVG, so printing keeps the notation vector-sharp.
 */
export function pageHtml(docTitle: string, heading: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(docTitle)}</title>
<style>
  body { font: 15px/1.5 Georgia, serif; color: #1a1c20; margin: 2rem auto; max-width: 1200px; padding: 0 1rem; background: #fff }
  h1 { font-size: 1.5rem } h2 { font-size: 1.2rem; margin-top: 2.5rem; border-bottom: 1px solid #d7dae0; padding-bottom: 0.3rem }
  h3 { font-size: 1rem; margin: 1.4rem 0 0.4rem }
  .note { color: #5a5f68; font-style: italic }
  .score { overflow-x: auto; border: 1px solid #d7dae0; margin: 1rem 0 }
  .score svg { display: block }
  table { border-collapse: collapse; width: 100%; font: 13px/1.45 ui-monospace, monospace }
  td { border-top: 1px solid #eceef1; padding: 0.3rem 0.6rem 0.3rem 0; vertical-align: top }
  td.id { font-weight: 700; white-space: nowrap } td.where { white-space: nowrap; color: #5a5f68 }
  .entry p { margin: 0.2rem 0 } .entry .params { color: #5a5f68 }
  .swatch { display: inline-block; width: 0.85em; height: 0.85em; border-radius: 3px; margin-right: 0.45em; vertical-align: -0.05em }
  .idea { margin: 1.6rem 0 } .idea .where { color: #5a5f68; font-size: 0.9rem }
  .idea ul { margin: 0.3rem 0; padding-left: 1.2rem; color: #5a5f68 }
  .verdict { border-left: 3px solid #b7791f; padding-left: 0.7rem; margin: 0.5rem 0 }
  .verdict .who { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: #b7791f }
  .drill { margin: 0.8rem 0 } .drill .dt { font-size: 0.9rem; color: #5a5f68 }
  .drill svg { max-width: 100% ; height: auto }
  ${SVG_CSS}
  @page { margin: 14mm }
  @media print {
    body { margin: 0; max-width: none }
    .score { border: none; overflow: visible }
    h2 { break-after: avoid }
    .idea, .drill, .entry { break-inside: avoid }
    .page-break { break-before: page }
  }
</style></head><body>
${heading}
${body}
</body></html>`
}

export function annotationExportHtml(title: string, svgMarkup: string, items: OverlayItem[]): string {
  return pageHtml(
    `${title} — engine annotations`,
    `<h1>${esc(title)} — what the engine heard</h1>
<p class="note">Every mark below is deterministic engine output — exact matching and measured cues, no model in the loop. Underline and wash faintness tracks confidence: a faint mark is a weak guess. Badges on the score reference the lists below.</p>`,
    `<h2>The score, annotated</h2>
<div class="score">${svgMarkup}</div>
<h2>The annotations</h2>
${annotationTablesHtml(items)}
<h2>Legend — what each mark means, and how it is detected</h2>
${legendHtml()}
<p class="note">Generated by Woodshed. Parameter values mirror docs/ENGINE_SPEC.md at export time.</p>`,
  )
}

export function downloadHtml(filename: string, html: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Deferred: revoking synchronously can cancel the download Chrome has
  // only just queued.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
