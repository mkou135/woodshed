import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const PEERS = join(homedir(), 'dev', 'woodshed-data', 'peers')
const ANNOTATIONS = fileURLToPath(new URL('../annotations/', import.meta.url))

const stem = (name: string): string => name.replace(/\.(mxl|musicxml|xml)$/, '')

interface EngineSeedResult {
  phrases: string[]
  ideas: string[]
  outside: { from: string; to: string; confidence: number }[]
  variations: { from: string; to: string }[][]
  stars: { from: string; to: string }[]
  scales: { at: string; name: string; because: string; declared: boolean }[]
}

/** Sliding window for out-of-scale density; a hotter run seeds one outside span. */
const SPICE_WINDOW = 6
/**
 * Hot = this much above the solo's own baseline off-scale rate. Absolute
 * thresholds flooded on chromatic solos: the mintzer.mxl audit (2026-08-27)
 * marked 40% of the notes at a flat 1/3 against a 0.29 baseline.
 */
const SPICE_MARGIN = 0.15
/** Most outside spans / variation groups a seed proposes; correction, not a flood. */
const SPICE_CAP = 12
const VARIATION_CAP = 6
/** Occurrences of one finding within this many bars are development; beyond it, vocabulary. */
const VARIATION_NEAR_BARS = 16
/** A finding recurring this often is the player's vocabulary — seed a star to drill. */
const STAR_MIN_OCCURRENCES = 3
const STAR_CAP = 5

const seedCache = new Map<string, { mtimeMs: number; data: EngineSeedResult }>()

/**
 * Run the pipeline on a peers file and return everything the annotate page
 * can seed, in the annotation position dialect. Imported lazily so `vite dev`
 * doesn't pay for the engine at config load; only the seed/scales buttons do.
 * Cached by mtime: the scales toggle hits this route on every use.
 */
async function engineSeed(name: string): Promise<EngineSeedResult> {
  const { mtimeMs } = statSync(join(PEERS, name))
  const cached = seedCache.get(name)
  if (cached && cached.mtimeMs === mtimeMs) return cached.data

  const { run, TICKS_PER_QUARTER } = await import('../src/index.ts')
  const { writtenBar } = await import('../src/core/bars.ts')
  const { formatPosition } = await import('../src/core/position.ts')
  const { chordScales } = await import('../src/analyse/chordScale.ts')
  const result = run(new Uint8Array(readFileSync(join(PEERS, name))))
  const { score, analysis } = result
  const ticksPerBar = score.timeSig[0] * (4 / score.timeSig[1]) * TICKS_PER_QUARTER
  const notes = analysis.contexts.map((c) => c.note)
  const printed = (n: { bar: number; beat: number }): string =>
    formatPosition({ bar: writtenBar(score, n.bar).bar, beat: n.beat + 1 })

  // Copied from scripts/eval-owner.ts engineStarts/engineIdeaStarts — scripts
  // don't import each other.
  const phrases = analysis.phrases.map((p) => {
    const first = p.notes[0]
    const barStart = first.onset - first.beat * TICKS_PER_QUARTER
    const w = writtenBar(score, first.bar)
    const beat = (p.onset - barStart) / TICKS_PER_QUARTER + 1
    return formatPosition({ bar: w.bar + Math.floor((p.onset - barStart) / ticksPerBar), beat })
  })
  const ideas = analysis.phrases.flatMap((p) => p.ideas).map((idea) => printed(idea.notes[0]))

  // Outside candidates: merged runs of hot out-of-scale windows, scanned
  // within one phrase at a time (a departure lives inside a phrase; crossing
  // starts is how the 9-bar monsters happened). Finds the chromatic-intense
  // species of spicy only — measured AUC 0.74 on the owner's Mintzer spans,
  // at/below chance on contextual outside (hey-lock); see DECISIONS
  // 2026-08-25 on why nothing stronger is inferred from pitch.
  const scaleSpans = chordScales(score.chordTracks[0]?.chords ?? [], score.keyFifths ?? 0)
  // How far off the declared scale each note is, 0–1. Over a dominant the
  // altered tensions are vocabulary every player reaches for, so they count
  // half: still detectable as a dense altered run, cooled enough that a
  // rhythm-changes bridge doesn't flood (the mintzer audit's conflation), and
  // the natural 7 — the one truly wrong pc — counts in full.
  const MAJOR_FAMILY = new Set(['major', 'major-seventh', 'major-sixth'])
  const outWeight = notes.map((n): number => {
    let s: (typeof scaleSpans)[0] | null = null
    for (const sc of scaleSpans) if (sc.chord.onset <= n.onset && (!s || sc.chord.onset > s.chord.onset)) s = sc
    if (!s) return 0
    const pc = ((n.midi % 12) + 12) % 12
    if (s.pcs.includes(pc)) return 0
    if (s.chord.quality === 'dominant') return pc === (s.chord.rootPc + 11) % 12 ? 1 : 0.5
    // The blue notes over a major-family chord are genre grammar, like
    // altered tensions over a dominant — half spicy, not departure.
    if (MAJOR_FAMILY.has(s.chord.quality)) {
      const above = (pc - s.chord.rootPc + 12) % 12
      if (above === 3 || above === 10) return 0.5
    }
    return 1
  })
  // A repeated pitch is one tension, however long the pedal: only the first
  // note of a same-pc run carries weight (the mintzer C-pedal flagged itself).
  for (let i = notes.length - 1; i > 0; i--) {
    if (notes[i].midi % 12 === notes[i - 1].midi % 12) outWeight[i] = 0
  }
  // Chromaticism that resolves is grammar, not departure: any note the target
  // detectors already claimed as part of an enclosure or approach figure
  // stops counting as outside (Sandu's proposals were mostly F#-A-G over Gm7).
  for (const f of analysis.findings) {
    if (!/enclosure|approach/.test(f.name)) continue
    for (const span of f.spans) {
      for (let k = span.startIndex; k <= span.endIndex; k++) outWeight[k] = 0
    }
  }
  const baseline = outWeight.reduce((a, b) => a + b, 0) / (outWeight.length || 1)
  const hotAt = baseline + SPICE_MARGIN
  const phraseRanges: { start: number; end: number }[] = []
  {
    let at = 0
    for (const p of analysis.phrases) {
      phraseRanges.push({ start: at, end: at + p.notes.length - 1 })
      at += p.notes.length
    }
  }
  const runs: { start: number; end: number; confidence: number }[] = []
  for (const range of phraseRanges) {
    for (let i = range.start; i + SPICE_WINDOW - 1 <= range.end; i++) {
      let out = 0
      for (let k = i; k < i + SPICE_WINDOW; k++) out += outWeight[k]
      const rate = out / SPICE_WINDOW
      if (rate < hotAt) continue
      const last = runs[runs.length - 1]
      if (last && i <= last.end && last.end >= range.start) {
        last.end = i + SPICE_WINDOW - 1
        last.confidence = Math.max(last.confidence, rate)
      } else {
        runs.push({ start: i, end: i + SPICE_WINDOW - 1, confidence: rate })
      }
    }
  }
  // Trim each run to its actual off-scale notes — the window pads both ends
  // with in-scale neighbours — and re-score confidence over the trimmed span.
  const trimmed = runs.flatMap((r) => {
    const outIdx: number[] = []
    for (let k = r.start; k <= r.end; k++) if (outWeight[k] > 0) outIdx.push(k)
    if (outIdx.length < 3) return []
    const from = outIdx[0]
    const to = outIdx[outIdx.length - 1]
    const weight = outIdx.reduce((a, k) => a + outWeight[k], 0)
    return [{ from, to, confidence: Math.min(1, weight / (to - from + 1)) }]
  })
  const outside = trimmed
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, SPICE_CAP)
    .sort((a, b) => a.from - b.from)
    .map((r) => ({
      from: printed(notes[r.from]),
      to: printed(notes[r.to]),
      confidence: Math.round(r.confidence * 100) / 100,
    }))

  // Variation groups: occurrences of one finding that sit close together —
  // development, an idea being worked. The same cell recurring across the
  // whole solo is vocabulary, not variation (mintzer audit paired bar 3 with
  // bar 119): those seed stars below instead.
  const printedBar = (idx: number): number => writtenBar(score, notes[idx].bar).bar
  // Substance gate: a 3-note enclosure or triad spelling is vocabulary, not
  // an idea being developed — only findings whose occurrences run ≥ 4 notes
  // seed variations or stars (26-2's triad-permutation groups were noise).
  const substantial = (f: (typeof analysis.findings)[0]) =>
    f.spans.every((s) => s.endIndex - s.startIndex + 1 >= 4)
  const clusters = analysis.findings
    .filter((f) => f.spans.length >= 2 && substantial(f))
    .sort((a, b) => b.confidence - a.confidence)
    .flatMap((f) => {
      const sorted = [...f.spans].sort((a, b) => a.startIndex - b.startIndex)
      const groups: (typeof sorted)[] = []
      for (const span of sorted) {
        const current = groups[groups.length - 1]
        const prev = current?.[current.length - 1]
        // An occurrence overlapping the previous is the same passage matched
        // against its own offset copy (26-2's opening motif) — drop it.
        if (prev && span.startIndex <= prev.endIndex) continue
        if (prev && printedBar(span.startIndex) - printedBar(prev.startIndex) <= VARIATION_NEAR_BARS) {
          current.push(span)
        } else {
          groups.push([span])
        }
      }
      return groups.filter((g) => g.length >= 2)
    })
  const variations = clusters
    .slice(0, VARIATION_CAP)
    .map((group) => group.map((s) => ({
      from: printed(notes[s.startIndex]),
      to: printed(notes[s.endIndex]),
    })))

  // Stars: the player's recurring vocabulary — a finding with enough
  // occurrences is what drilling wants. One star at the first occurrence;
  // the finding list carries the rest.
  const stars = analysis.findings
    .filter((f) => f.spans.length >= STAR_MIN_OCCURRENCES && substantial(f))
    .sort((a, b) => b.spans.length - a.spans.length || b.confidence - a.confidence)
    .slice(0, STAR_CAP)
    .map((f) => {
      const first = [...f.spans].sort((a, b) => a.startIndex - b.startIndex)[0]
      return { from: printed(notes[first.startIndex]), to: printed(notes[first.endIndex]) }
    })

  // Scales, anchored at the first solo note at/after each chord: chart tensions
  // win, else the function rule — never inferred from the melody.
  const scales = scaleSpans.flatMap((sc) => {
    const anchor = notes.find((n) => n.onset >= sc.chord.onset)
    if (!anchor) return []
    return [{ at: printed(anchor), name: sc.name, because: sc.because, declared: sc.declared }]
  })
    // Chords with no note before the next chord share an anchor; the one
    // actually sounding under that note (the last) wins.
    .filter((s, i, all) => i === all.length - 1 || all[i + 1].at !== s.at)

  const data: EngineSeedResult = { phrases, ideas, outside, variations, stars, scales }
  seedCache.set(name, { mtimeMs, data })
  return data
}

/** Dev-only bridge for annotate.html: list peers files, serve bytes, save JSON. */
export function annotatePlugin(): Plugin {
  return {
    name: 'annotate',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__annotate', (req, res) => {
        const urlPath = (req.url ?? '').split('?')[0] ?? ''
        const [route, raw = ''] = urlPath.replace(/^\//, '').split('/')
        const name = decodeURIComponent(raw)
        if (name !== basename(name) || name.includes('..')) { res.statusCode = 400; res.end(); return }
        const json = (body: unknown): void => {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(body))
        }
        try {
          if (route === 'files') {
            json(readdirSync(PEERS).filter((f) => /\.(mxl|musicxml)$/.test(f)).sort()
              .map((f) => ({ name: f, annotated: existsSync(join(ANNOTATIONS, `${stem(f)}.json`)) })))
          } else if (route === 'file') {
            res.setHeader('content-type', 'application/octet-stream')
            res.end(readFileSync(join(PEERS, name)))
          } else if (route === 'engine') {
            if (!existsSync(join(PEERS, name))) { res.statusCode = 404; res.end(); return }
            engineSeed(name)
              .then(json)
              .catch((error) => { res.statusCode = 500; res.end(String(error)) })
          } else if (route === 'annotation') {
            const path = join(ANNOTATIONS, `${stem(name)}.json`)
            if (!existsSync(path)) { res.statusCode = 404; res.end(); return }
            json(JSON.parse(readFileSync(path, 'utf8')))
          } else if (route === 'save' && req.method === 'POST') {
            const origin = req.headers.origin
            if (origin) {
              const host = new URL(origin).hostname
              if (host !== 'localhost' && host !== '127.0.0.1') { res.statusCode = 403; res.end(); return }
            }
            let body = ''
            req.on('data', (c) => { body += c })
            req.on('end', () => {
              try {
                writeFileSync(join(ANNOTATIONS, `${stem(name)}.json`),
                  JSON.stringify(JSON.parse(body), null, 2) + '\n')
                res.statusCode = 204
                res.end()
              } catch (error) {
                res.statusCode = 400
                res.end(String(error))
              }
            })
          } else { res.statusCode = 404; res.end() }
        } catch (error) {
          res.statusCode = 500
          res.end(String(error))
        }
      })
    },
  }
}
