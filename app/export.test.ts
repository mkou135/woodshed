import { describe, expect, it } from 'vitest'
import { annotationExportHtml } from './export.ts'
import type { OverlayItem } from './score.ts'

// annotationExportHtml is a pure string function — no DOM required — so it
// is tested directly. downloadHtml and ScoreView.exportAnnotations need a
// live browser (Blob, URL.createObjectURL, a rendered OSMD SVG) and are not
// covered here; see task-3-report.md.

const SVG = '<svg viewBox="0 0 100 50"><rect class="phrase-tick" width="4" height="4"/></svg>'

/** One item per vector but 'stock', so the "no section when empty" case is real. */
const ITEMS: OverlayItem[] = [
  { id: 'f3', label: 'digital pattern 1235', where: 'b12', detail: 'degrees 1 2 3 5 over Cmaj7', vector: 'cell' },
  { id: 'f7', label: 'major-seventh arpeggio from the b3', where: 'b73', detail: 'degrees b3 5 7 9', vector: 'cell' },
  { id: 'u5', label: 'approach into the 3rd', where: 'b20', detail: 'chromatic enclosure, target strength 0.62', vector: 'device' },
  { id: 'b41', label: 'recurring cell [2, -2, -5]', where: 'b31, b55', detail: 'intervals [2, -2, -5], 2 occurrences', vector: 'recurring' },
  { id: 'L2', label: 'dominant arpeggio 3 to the b9', where: 'b92', detail: 'degrees 3 5 b7 b9', vector: 'language' },
  { id: 'c1', label: 'boundary candidate', where: 'b44', detail: 'phrase-cue total 0.38, within 0.15 of threshold', vector: 'candidate' },
]

describe('annotationExportHtml', () => {
  it('embeds the SVG markup verbatim', () => {
    const html = annotationExportHtml('Hey Lock!', SVG, ITEMS)
    expect(html).toContain(SVG)
  })

  it('sets the title argument in both <title> and <h1>', () => {
    const html = annotationExportHtml('Hey Lock!', SVG, ITEMS)
    expect(html).toContain('<title>Hey Lock! — engine annotations</title>')
    expect(html).toContain('<h1>Hey Lock! — what the engine heard</h1>')
  })

  it('emits one section per non-empty vector with the item count in its heading', () => {
    const html = annotationExportHtml('Hey Lock!', SVG, ITEMS)
    expect(html).toContain('<h3>Named cells (2)</h3>')
    expect(html).toContain('<h3>Target devices (1)</h3>')
    expect(html).toContain('<h3>Recurring cells (1)</h3>')
    expect(html).toContain('<h3>Common language (1)</h3>')
    expect(html).toContain('<h3>Boundary candidates (1)</h3>')
  })

  it('omits the section heading for a vector with no items', () => {
    const html = annotationExportHtml('Hey Lock!', SVG, ITEMS)
    expect(html).not.toContain('Stock stretches')
  })

  it('renders every item id, label, where and detail', () => {
    const html = annotationExportHtml('Hey Lock!', SVG, ITEMS)
    for (const item of ITEMS) {
      expect(html).toContain(item.id)
      expect(html).toContain(item.label)
      expect(html).toContain(item.where)
      expect(html).toContain(item.detail)
    }
  })

  it('renders the full legend, one entry per vector including phrase and idea ticks', () => {
    const html = annotationExportHtml('Hey Lock!', SVG, ITEMS)
    expect(html).toContain('Phrase tick (amber, numbered)')
    expect(html).toContain('Idea tick (blue, numbered n.2, n.3 …)')
    expect(html).toContain('Named cell (blue underline)')
    expect(html).toContain('Target device (orange underline)')
    expect(html).toContain('Recurring cell (green underline)')
    expect(html).toContain('Common language (magenta underline)')
    expect(html).toContain('Boundary candidate (grey caret)')
    expect(html).toContain('Stock shading (grey wash)')
    // The legend explains detection parameters too, not just names.
    expect(html).toContain('How it is detected:')
  })

  it('describes the phrase tick as the engine does now: a chorus prior, and faint means unsure', () => {
    const html = annotationExportHtml('Hey Lock!', SVG, ITEMS)
    // The engine has no structural boundary kind any more — the chorus wall
    // became the wChorus prior, and the legend is a prose copy of the spec.
    expect(html).not.toContain('structural boundary')
    expect(html).toContain('min(1, total + 0.45) ≥ 0.45')
    expect(html).toContain('A half-opacity tick is a phrase it opened on a call it was not sure of')
    // One-sided: confidence is floored at the threshold, so it is never below it.
    expect(html).toContain('cleared the 0.45 threshold by less than 0.15')
    // `boundaryCandidates` does not exclude gaps that became boundaries, so a
    // caret and a faint tick routinely mark the same gap. Measured across the
    // peer solos: 16 of 37 faint ticks sit on a candidate; the rest are
    // chorus starts, where the caret's `rest > 0` test excludes the gap.
    expect(html).toContain('The two are not alternatives and often land on the same gap')
    expect(html).toContain('80.8 F1')
  })

  it('escapes <, > and & in item labels and details rather than emitting them raw', () => {
    const dangerous: OverlayItem[] = [
      {
        id: 'x1',
        label: 'dominant b9 <script>alert(1)</script> & sharp-9',
        where: 'b1',
        detail: 'degrees 3 5 b7 b9 <also & more>',
        vector: 'cell',
      },
    ]
    const html = annotationExportHtml('Hey Lock!', SVG, dangerous)

    // The raw dangerous substrings must not appear unescaped anywhere.
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('alert(1)</script>')

    // The escaped forms must be present in place of the raw label and detail.
    // esc() replaces '&' first, so a literal '&' becomes '&amp;' before any
    // '<'/'>' next to it are escaped — this is the order that matters.
    expect(html).toContain('dominant b9 &lt;script&gt;alert(1)&lt;/script&gt; &amp; sharp-9')
    expect(html).toContain('degrees 3 5 b7 b9 &lt;also &amp; more&gt;')
  })

  it('escapes < and > in the title, in both <title> and <h1>', () => {
    const html = annotationExportHtml('A <weird> & unusual title', SVG, ITEMS)
    expect(html).toContain('<title>A &lt;weird&gt; &amp; unusual title — engine annotations</title>')
    expect(html).toContain('<h1>A &lt;weird&gt; &amp; unusual title — what the engine heard</h1>')
    expect(html).not.toContain('<weird>')
  })

  // esc() escapes '"' to '&quot;' too, even though today every esc() call
  // site sits between '>' and '<' (text content — <title>, <h1>, <h3>,
  // <td>, <p>) and the file's one attribute interpolation,
  // style="background:${swatch}", uses LEGEND's hardcoded hex colours, never
  // a caller-supplied string — so no live injection reaches an attribute
  // right now. The escaping is here anyway so esc() is safe by construction
  // for whoever next interpolates a label into an attribute (a title=
  // tooltip, say), rather than safe only because of how it happens to be
  // called today.
  it('escapes double quotes as &quot;, safe by construction for a future attribute interpolation', () => {
    const html = annotationExportHtml('Hey Lock!', SVG, [
      { id: 'x2', label: 'a "quoted" label', where: 'b1', detail: 'a "quoted" detail', vector: 'cell' },
    ])
    expect(html).not.toContain('a "quoted" label')
    expect(html).not.toContain('a "quoted" detail')
    expect(html).toContain('a &quot;quoted&quot; label')
    expect(html).toContain('a &quot;quoted&quot; detail')
  })
})
