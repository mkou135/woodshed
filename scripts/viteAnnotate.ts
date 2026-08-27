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
  scales: { at: string; name: string; because: string; declared: boolean }[]
}

/** Sliding window for out-of-scale density; a hotter run seeds one outside span. */
const SPICE_WINDOW = 6
/** A window with at least this fraction of its notes off the declared scale is hot. */
const SPICE_THRESHOLD = 1 / 3
/** Most outside spans / variation groups a seed proposes; correction, not a flood. */
const SPICE_CAP = 12
const VARIATION_CAP = 6

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

  // Outside candidates: merged runs of hot out-of-scale windows. Finds the
  // chromatic-intense species of spicy only — measured AUC 0.74 on the
  // owner's Mintzer spans, at/below chance on contextual outside (hey-lock);
  // see DECISIONS 2026-08-25 on why nothing stronger is inferred from pitch.
  const scaleSpans = chordScales(score.chordTracks[0]?.chords ?? [], score.keyFifths ?? 0)
  const inScale = notes.map((n) => {
    let s: (typeof scaleSpans)[0] | null = null
    for (const sc of scaleSpans) if (sc.chord.onset <= n.onset && (!s || sc.chord.onset > s.chord.onset)) s = sc
    return s ? s.pcs.includes(((n.midi % 12) + 12) % 12) : true
  })
  const runs: { start: number; end: number; confidence: number }[] = []
  for (let i = 0; i + SPICE_WINDOW <= notes.length; i++) {
    let out = 0
    for (let k = i; k < i + SPICE_WINDOW; k++) if (!inScale[k]) out++
    const rate = out / SPICE_WINDOW
    if (rate < SPICE_THRESHOLD) continue
    const last = runs[runs.length - 1]
    if (last && i <= last.end) {
      last.end = i + SPICE_WINDOW - 1
      last.confidence = Math.max(last.confidence, rate)
    } else {
      runs.push({ start: i, end: i + SPICE_WINDOW - 1, confidence: rate })
    }
  }
  // Trim each run to its actual off-scale notes — the window pads both ends
  // with in-scale neighbours — and re-score confidence over the trimmed span.
  const trimmed = runs.flatMap((r) => {
    const outIdx: number[] = []
    for (let k = r.start; k <= r.end; k++) if (!inScale[k]) outIdx.push(k)
    if (outIdx.length < 3) return []
    const from = outIdx[0]
    const to = outIdx[outIdx.length - 1]
    return [{ from, to, confidence: outIdx.length / (to - from + 1) }]
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

  // Variation groups: each recurring finding with 2+ occurrences is a family.
  const variations = analysis.findings
    .filter((f) => f.spans.length >= 2)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, VARIATION_CAP)
    .map((f) => f.spans.map((s) => ({
      from: printed(notes[s.startIndex]),
      to: printed(notes[s.endIndex]),
    })))

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

  const data: EngineSeedResult = { phrases, ideas, outside, variations, scales }
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
