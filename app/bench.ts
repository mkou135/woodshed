/**
 * The benchmark page: draws `goldens/benchmarks.json`, the snapshots
 * `npm run bench` commits. Charts are inline SVG built here — no library, no
 * CDN — thin marks on a recessive grid, a legend whenever there are two
 * series, direct labels on the last point, a crosshair tooltip, and a table
 * under every chart so nothing is colour-alone. A snapshot marked `spec`
 * (copied from the docs by hand) draws hollow; a measured one draws solid.
 */
import snapshots from '../goldens/benchmarks.json'
import { el } from './dom.ts'

type Prf = { p: number; r: number; f1: number }
interface Snapshot {
  date: string
  commit: string
  source: 'measured' | 'spec'
  note?: string
  wjd?: { solos: number; phrases: Prf; ideas: Prf }
  brackets?: Record<string, { matched: number; owner: number; falseStarts: number; ok: boolean }>
  owner?: Record<string, { phrases: Prf; ideas: Prf; seeded: boolean }>
  stock?: { bins: string[]; signals: Record<string, { auc: number; bins: number[] }> }
  blake?: { findings: number; units: number; phrases: number; top: string; topBars: number[]; exercises: Record<string, number> }
  timing?: { files: number; notes: number; median: Stage; blake: Stage }
}
type Stage = { ingest: number; prepare: number; analyse: number; practice: number; total: number }

const history = (snapshots as Snapshot[]).slice().sort((a, b) => a.date.localeCompare(b.date))
const latest = history[history.length - 1]
const root = document.getElementById('bench-root')!
root.replaceChildren()

/** Human agreement on phrase boundaries (ENGINE_SPEC §Segmentation). */
const HUMAN_CEILING = 83
/** Colours the analyser already uses for the two boundary levels; validated as a pair. */
const SERIES = { phrases: 'var(--phrase)', ideas: 'var(--idea)' }

const svgEl = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, text?: string): SVGElementTagNameMap[K] => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v))
  if (text !== undefined) node.textContent = text
  return node
}

interface Series { key: string; label: string; colour: string; points: { x: number; y: number; snap: Snapshot }[] }

/**
 * A line chart over snapshot dates. One y axis; the y range is fitted to the
 * data with headroom so a two-point drift still reads, and the ceiling, when
 * given, is always inside it.
 */
function lineChart(series: Series[], opts: { ceiling?: number; unit: string; yMin?: number; yMax?: number }): HTMLElement {
  const W = 720, H = 260, L = 44, R = 70, T = 16, B = 34
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b)
  const ys = series.flatMap((s) => s.points.map((p) => p.y)).concat(opts.ceiling !== undefined ? [opts.ceiling] : [])
  const lo = opts.yMin ?? Math.floor(Math.min(...ys) - 2)
  const hi = opts.yMax ?? Math.ceil(Math.max(...ys) + 2)
  const x = (v: number): number => xs.length === 1 ? (L + (W - R)) / 2 : L + ((v - xs[0]) / (xs[xs.length - 1] - xs[0])) * (W - L - R)
  const y = (v: number): number => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' })
  const grid = svgEl('g', { class: 'grid' })
  const axis = svgEl('g', { class: 'axis' })
  const steps = 4
  for (let i = 0; i <= steps; i++) {
    const v = lo + ((hi - lo) * i) / steps
    grid.appendChild(svgEl('line', { x1: L, x2: W - R, y1: y(v), y2: y(v) }))
    axis.appendChild(svgEl('text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end' }, v.toFixed(v % 1 ? 1 : 0)))
  }
  for (const d of xs) {
    axis.appendChild(svgEl('text', { x: x(d), y: H - 10, 'text-anchor': 'middle' }, new Date(d).toISOString().slice(5, 10)))
  }
  svg.append(grid, axis)
  if (opts.ceiling !== undefined) {
    svg.appendChild(svgEl('line', { class: 'ceiling', x1: L, x2: W - R, y1: y(opts.ceiling), y2: y(opts.ceiling) }))
    svg.appendChild(svgEl('text', { class: 'label faint', x: W - R + 8, y: y(opts.ceiling) + 4 }, `human ${opts.ceiling}`))
  }
  for (const s of series) {
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')
    svg.appendChild(svgEl('path', { class: 'series', d, stroke: s.colour }))
    for (const p of s.points) {
      const spec = p.snap.source === 'spec'
      svg.appendChild(svgEl('circle', { class: `marker${spec ? ' spec' : ''}`, cx: x(p.x), cy: y(p.y), r: 4.5, ...(spec ? { stroke: s.colour } : { fill: s.colour }) }))
    }
    const last = s.points[s.points.length - 1]
    if (last) svg.appendChild(svgEl('text', { class: 'label', x: x(last.x) + 8, y: y(last.y) + 4, fill: s.colour }, `${s.label} ${last.y}`))
  }
  // Crosshair + tooltip: nearest date wins, every series reported at once.
  const cross = svgEl('line', { class: 'crosshair', x1: 0, x2: 0, y1: T, y2: H - B })
  svg.appendChild(cross)
  const hit = svgEl('rect', { class: 'hit', x: L, y: T, width: W - L - R, height: H - T - B })
  svg.appendChild(hit)
  const fig = el('figure')
  const tip = el('div', 'tip')
  fig.append(svg, tip)
  hit.addEventListener('mousemove', (e) => {
    const box = svg.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    const near = xs.reduce((best, d) => Math.abs(x(d) - px) < Math.abs(x(best) - px) ? d : best, xs[0])
    cross.setAttribute('x1', String(x(near))); cross.setAttribute('x2', String(x(near))); cross.style.opacity = '1'
    const rows = series.map((s) => { const p = s.points.find((q) => q.x === near); return p ? `${s.label} ${p.y}${opts.unit}` : null }).filter(Boolean)
    const snap = history.find((h) => Date.parse(h.date) === near)
    tip.textContent = `${snap?.date ?? ''} ${snap?.source === 'spec' ? '(from spec)' : snap?.commit ?? ''} · ${rows.join(' · ')}`
    tip.style.left = `${(x(near) / W) * box.width}px`; tip.style.top = `${(T / H) * box.height}px`
    tip.classList.add('on')
  })
  hit.addEventListener('mouseleave', () => { cross.style.opacity = '0'; tip.classList.remove('on') })
  return fig
}

function legend(items: { label: string; colour: string }[], hollowNote = true): HTMLElement {
  const box = el('div', 'legend')
  for (const it of items) { const s = el('span'); const sw = el('span', 'sw'); sw.style.background = it.colour; s.append(sw, it.label); box.appendChild(s) }
  if (hollowNote && history.some((h) => h.source === 'spec')) { const s = el('span'); s.append(el('span', 'sw hollow'), 'hollow = copied from the spec, not measured'); box.appendChild(s) }
  return box
}

function table(head: string[], rows: (string | HTMLElement)[][], numeric: number[] = []): HTMLElement {
  const t = el('table')
  const tr = el('tr'); for (const h of head) tr.appendChild(el('th', '', h)); t.appendChild(tr)
  for (const r of rows) { const row = el('tr'); r.forEach((c, i) => { const td = el('td', numeric.includes(i) ? 'n' : ''); if (typeof c === 'string') td.textContent = c; else td.appendChild(c); row.appendChild(td) }); t.appendChild(row) }
  return t
}

function disclosure(label: string, body: HTMLElement): HTMLElement {
  const d = el('details'); d.appendChild(el('summary', '', label)); d.appendChild(body); return d
}

function section(title: string, lede: string, ...body: HTMLElement[]): HTMLElement {
  const s = el('section'); s.append(el('h2', '', title), el('p', 'lede', lede), ...body); return s
}

// ---- 1. Corpus boundaries over time ----
{
  const withWjd = history.filter((h) => h.wjd)
  const series: Series[] = [
    { key: 'phrases', label: 'phrases', colour: SERIES.phrases, points: withWjd.map((h) => ({ x: Date.parse(h.date), y: h.wjd!.phrases.f1, snap: h })) },
    { key: 'ideas', label: 'ideas', colour: SERIES.ideas, points: withWjd.map((h) => ({ x: Date.parse(h.date), y: h.wjd!.ideas.f1, snap: h })) },
  ]
  const rows = withWjd.map((h) => [h.date, h.source === 'spec' ? 'spec' : h.commit, `${h.wjd!.phrases.p} / ${h.wjd!.phrases.r} / ${h.wjd!.phrases.f1}`, `${h.wjd!.ideas.p || '—'} / ${h.wjd!.ideas.r || '—'} / ${h.wjd!.ideas.f1}`])
  root.appendChild(section(
    'Boundaries against the Weimar corpus',
    `Phrase and idea F1 over ${latest.wjd?.solos ?? 456} human-annotated solos, exact note match. Rule-based models top out near 65 on this kind of task and humans agree with each other at about ${HUMAN_CEILING}. The chorus-start prior and riff binding are kept against this number because your own marks say so.`,
    lineChart(series, { ceiling: HUMAN_CEILING, unit: ' F1' }),
    legend([{ label: 'phrases F1', colour: SERIES.phrases }, { label: 'ideas F1', colour: SERIES.ideas }]),
    disclosure('The numbers (P / R / F1)', table(['date', 'commit', 'phrases', 'ideas'], rows)),
  ))
}

// ---- 2. Your own marks ----
{
  const withOwner = history.filter((h) => h.brackets || h.owner)
  const rows = withOwner.map((h) => {
    const b = h.brackets ?? {}
    const cells = Object.entries(b).map(([file, r]) => { const s = el('span', r.ok ? 'ok' : 'bad'); s.textContent = `${file.split('-')[0]} ${r.matched}/${r.owner}${r.falseStarts ? ` +${r.falseStarts} false` : ''}`; return s })
    const wrap = el('span'); cells.forEach((c, i) => { if (i) wrap.append(' · '); wrap.appendChild(c) })
    const hl = h.owner?.['hey-lock']
    return [h.date, h.source === 'spec' ? 'spec' : h.commit, wrap, hl ? `${hl.phrases.f1.toFixed(2)} / ${hl.ideas.f1.toFixed(2)}` : '—']
  })
  const series: Series[] = [
    { key: 'hl-p', label: 'Hey Lock phrases', colour: SERIES.phrases, points: withOwner.filter((h) => h.owner?.['hey-lock']).map((h) => ({ x: Date.parse(h.date), y: Math.round(h.owner!['hey-lock'].phrases.f1 * 100), snap: h })) },
    { key: 'hl-i', label: 'Hey Lock ideas', colour: SERIES.ideas, points: withOwner.filter((h) => h.owner?.['hey-lock']).map((h) => ({ x: Date.parse(h.date), y: Math.round(h.owner!['hey-lock'].ideas.f1 * 100), snap: h })) },
  ]
  root.appendChild(section(
    'Against your own ear',
    'The bracket sets are the gate no corpus number may override: a change that loses one of these is reverted. Hey Lock is the one blind-annotated solo, scored the same way.',
    lineChart(series, { unit: ' F1' }),
    legend([{ label: 'Hey Lock phrases F1', colour: SERIES.phrases }, { label: 'Hey Lock ideas F1', colour: SERIES.ideas }]),
    table(['date', 'commit', 'brackets matched', 'Hey Lock phrases / ideas F1'], rows),
  ))
}

// ---- 3. Stock signals vs the lick/line labels (latest) ----
if (latest.stock) {
  const { bins, signals } = latest.stock
  const keep = ['stockShare (run)', 'corpusShare', 'max(run, corpus) = stock', 'languageShare', 'chordToneDownbeatShare', 'length (notes)']
  const rows = keep.filter((k) => signals[k]).map((k) => {
    const s = signals[k]
    const bar = el('span'); const b = el('span', 'inbar'); b.style.width = `${Math.max(0, (s.auc - 0.5) * 2) * 10}rem`; bar.append(b, s.auc.toFixed(3))
    return [k, bar, ...s.bins.map((v) => v.toFixed(3))]
  })
  root.appendChild(section(
    'Stock signals against the annotators’ lick / line labels',
    `AUC for "this is a line, not vocabulary", on ${latest.stock ? '12,393' : ''} annotated idea sections; 0.5 is chance, the bar shows how far above it. By length bin because length alone separates the two classes. The run share is the rule in force for the stock penalty.`,
    table(['signal', 'AUC (pooled)', ...bins.map((b) => `${b} notes`)], rows, [2, 3, 4, 5]),
  ))
}

// ---- 4. The Blake targets ----
if (latest.blake) {
  const b = latest.blake
  const check = (ok: boolean): HTMLElement => { const s = el('span', ok ? 'ok' : 'bad'); s.textContent = ok ? '✓' : '✗'; return s }
  const rows: (string | HTMLElement)[][] = [
    ['top finding', b.top, 'major-seventh arpeggio from the b3', check(b.top === 'major-seventh arpeggio from the b3')],
    ['at bars', b.topBars.join(', '), '73, 77', check(b.topBars.includes(73) && b.topBars.includes(77))],
    ['findings', String(b.findings), '15', check(b.findings === 15)],
    ['phrases', String(b.phrases), '15', check(b.phrases === 15)],
    ['practice units', String(b.units), '34', check(b.units === 34)],
    ['exercises', Object.entries(b.exercises).map(([k, v]) => `${k} ${v}`).join(', '), 'loop 34 · through 47 · vary 174 · write 16', check(b.exercises.loop === 34 && b.exercises.through === 47)],
  ]
  const trend = history.filter((h) => h.blake).map((h) => [h.date, h.source === 'spec' ? 'spec' : h.commit, String(h.blake!.findings), String(h.blake!.units), String(h.blake!.phrases)])
  root.appendChild(section(
    'The verification target',
    'The Seamus Blake solo the project is tuned against, as CLAUDE.md states it. The tests pin these; this is the same check, visible.',
    table(['what', 'now', 'target', ''], rows),
    disclosure('Blake counts over time', table(['date', 'commit', 'findings', 'units', 'phrases'], trend, [2, 3, 4])),
  ))
}

// ---- 5. Timing ----
{
  const STAGES: (keyof Stage)[] = ['ingest', 'prepare', 'analyse', 'practice']
  const COLOURS: Record<string, string> = { ingest: 'var(--ov-stock)', prepare: 'var(--ov-language)', analyse: 'var(--idea)', practice: 'var(--phrase)' }
  const stack = (t: Stage, title: string, sub: string): HTMLElement => {
    const box = el('div')
    box.append(el('strong', '', title), el('div', 'faint', sub))
    const bar = el('div', 'stage')
    for (const k of STAGES) { const s = el('span'); s.style.width = `${(t[k] / t.total) * 100}%`; s.style.background = COLOURS[k]; s.title = `${k} ${t[k]} ms`; bar.appendChild(s) }
    box.appendChild(bar)
    box.appendChild(table(['stage', 'ms'], STAGES.map((k) => [k, t[k].toFixed(1)]).concat([['total', t.total.toFixed(1)]]), [1]))
    return box
  }
  const parts: HTMLElement[] = []
  if (latest.timing) {
    parts.push(stack(latest.timing.median, 'Node, median of the peers', `${latest.timing.files} solos, median ${latest.timing.notes} notes, second run after a warm-up`))
    parts.push(stack(latest.timing.blake, 'Node, Blake', 'the verification solo'))
  }
  let browser: (Stage & { at: string; notes: number; title: string }) | null = null
  try { browser = JSON.parse(localStorage.getItem('woodshed.timing') ?? 'null') } catch { /* none */ }
  if (browser) parts.push(stack(browser, 'This browser, your last run', `${browser.title}, ${browser.notes} notes, ${new Date(browser.at).toLocaleString()}`))
  else parts.push((() => { const d = el('div'); d.append(el('strong', '', 'This browser'), el('div', 'faint', 'No run yet — analyse a solo and come back.')); return d })())
  const key = el('div', 'stage-key')
  for (const k of STAGES) { const s = el('span'); const i = el('i'); i.style.background = COLOURS[k]; s.append(i, k); key.appendChild(s) }
  const grid = el('div', 'stack'); grid.append(...parts)
  root.appendChild(section(
    'Speed',
    'Wall clock per stage of one run: reading the file, preparing the score, analysing, building the practice units. The page is only as slow as the browser rendering the notation, which is not timed here.',
    grid, key,
  ))
}

