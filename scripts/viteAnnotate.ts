import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const PEERS = join(homedir(), 'dev', 'woodshed-data', 'peers')
const ANNOTATIONS = fileURLToPath(new URL('../annotations/', import.meta.url))

const stem = (name: string): string => name.replace(/\.(mxl|musicxml|xml)$/, '')

/**
 * Run the pipeline on a peers file and print its phrase/idea starts in the
 * annotation position dialect. Imported lazily so `vite dev` doesn't pay for
 * the engine at config load; only the seed button does.
 */
async function engineSeed(name: string): Promise<{ phrases: string[]; ideas: string[] }> {
  const { run, TICKS_PER_QUARTER } = await import('../src/index.ts')
  const { writtenBar } = await import('../src/core/bars.ts')
  const { formatPosition } = await import('../src/core/position.ts')
  const result = run(new Uint8Array(readFileSync(join(PEERS, name))))
  const { score, analysis } = result
  const ticksPerBar = score.timeSig[0] * (4 / score.timeSig[1]) * TICKS_PER_QUARTER
  // Copied from scripts/eval-owner.ts engineStarts/engineIdeaStarts — scripts
  // don't import each other.
  const phrases = analysis.phrases.map((p) => {
    const first = p.notes[0]
    const barStart = first.onset - first.beat * TICKS_PER_QUARTER
    const w = writtenBar(score, first.bar)
    const beat = (p.onset - barStart) / TICKS_PER_QUARTER + 1
    return formatPosition({ bar: w.bar + Math.floor((p.onset - barStart) / ticksPerBar), beat })
  })
  const ideas = analysis.phrases.flatMap((p) => p.ideas).map((idea) => {
    const first = idea.notes[0]
    const w = writtenBar(score, first.bar)
    return formatPosition({ bar: w.bar, beat: first.beat + 1 })
  })
  return { phrases, ideas }
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
