/**
 * Score the engine's phrase/idea starts against the owner's own annotations,
 * saved by the annotation app to `annotations/*.json`. A report, not a gate
 * — `brackets` stays the gate on phrase starts.
 *
 *   npm run eval:owner              # every annotation file
 *   npm run eval:owner -- --misses  # also print the boundary cue at every miss/false start
 *
 * Annotation files live in `annotations/` (repo); the .mxl/.musicxml they
 * annotate lives in ~/dev/woodshed-data/peers (never in the repo). Override
 * either with ANNOTATIONS_DIR / PEERS_DIR.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { run, TICKS_PER_QUARTER, describeFinding } from '../src/index.ts'
import { writtenBar } from '../src/core/bars.ts'
import { parsePosition, formatPosition } from '../src/core/position.ts'
import { matchStarts, prf } from '../src/annotation/eval.ts'
import { boundaryCue, DEFAULTS } from '../src/analyse/segment.ts'
import type { Position } from '../src/core/position.ts'
import type { AnnotationFile } from '../src/annotation/store.ts'
import type { PipelineResult } from '../src/index.ts'
import type { Note } from '../src/core/types.ts'
import type { Finding } from '../src/analyse/index.ts'

const ANNOTATIONS = process.env.ANNOTATIONS_DIR ??
  fileURLToPath(new URL('../annotations/', import.meta.url))
const PEERS = process.env.PEERS_DIR ?? join(homedir(), 'dev', 'woodshed-data', 'peers')
/** Half a beat: the owner's pencil and the engine's grid agree to this. */
const TOLERANCE = 0.5

const showMisses = process.argv.includes('--misses')

// Copied from scripts/brackets.ts:35-46 — scripts don't import each other.
/** Printed bar and 1-based beat of every phrase start. */
function engineStarts(result: PipelineResult): { bar: number; beat: number }[] {
  const { score, analysis } = result
  const ticksPerBar = score.timeSig[0] * (4 / score.timeSig[1]) * TICKS_PER_QUARTER
  return analysis.phrases.map((p) => {
    const first = p.notes[0]
    const barStart = first.onset - first.beat * TICKS_PER_QUARTER
    const w = writtenBar(score, first.bar)
    const beat = (p.onset - barStart) / TICKS_PER_QUARTER + 1
    // A phrase onset before its first note's bar (a tuplet rest) stays in that bar.
    return { bar: w.bar + Math.floor((p.onset - barStart) / ticksPerBar), beat }
  })
}

/** Printed bar and 1-based beat of every idea start, including each phrase's first idea. */
function engineIdeaStarts(result: PipelineResult): { bar: number; beat: number }[] {
  const { score, analysis } = result
  return analysis.phrases.flatMap((p) => p.ideas).map((idea) => {
    const first = idea.notes[0]
    const w = writtenBar(score, first.bar)
    return { bar: w.bar, beat: first.beat + 1 }
  })
}

/** Printed bar and 1-based beat of each phrase's last note — the engine's phrase ends. */
function enginePhraseEnds(result: PipelineResult): { bar: number; beat: number }[] {
  const { score, analysis } = result
  return analysis.phrases.map((p) => {
    const last = p.notes[p.notes.length - 1]
    const w = writtenBar(score, last.bar)
    return { bar: w.bar, beat: last.beat + 1 }
  })
}

/** Printed bar and 1-based beat of each idea's last note. */
function engineIdeaEnds(result: PipelineResult): { bar: number; beat: number }[] {
  const { score, analysis } = result
  return analysis.phrases.flatMap((p) => p.ideas).map((idea) => {
    const last = idea.notes[idea.notes.length - 1]
    const w = writtenBar(score, last.bar)
    return { bar: w.bar, beat: last.beat + 1 }
  })
}

// Copied from src/analyse/segment.ts:150-154 — scripts don't import each other.
function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function resolvePeer(basename: string): string | null {
  const base = basename.replace(/\.(mxl|musicxml)$/, '')
  for (const ext of ['.mxl', '.musicxml']) {
    const p = join(PEERS, base + ext)
    if (existsSync(p)) return p
  }
  return null
}

interface Tally {
  matched: number
  missed: number
  falseStarts: number
  owner: number
  engine: number
}

const emptyTally = (): Tally => ({ matched: 0, missed: 0, falseStarts: 0, owner: 0, engine: 0 })

function fmtPrf(t: Tally): string {
  const { precision, recall, f1 } = prf(t.matched, t.missed, t.falseStarts)
  return `P ${precision.toFixed(2)} R ${recall.toFixed(2)} F1 ${f1.toFixed(2)} (${t.owner} / ${t.engine})`
}

/** The note whose printed position is nearest `mark`. */
function nearestNoteIndex(notes: Note[], score: PipelineResult['score'], mark: Position, beatsPerBar: number): number {
  let best = -1
  let bestDistance = Infinity
  notes.forEach((n, i) => {
    const w = writtenBar(score, n.bar)
    const distance = Math.abs((w.bar - mark.bar) * beatsPerBar + (n.beat + 1 - mark.beat))
    if (distance < bestDistance) {
      bestDistance = distance
      best = i
    }
  })
  return best
}

function printCueAt(
  label: string,
  level: string,
  mark: Position,
  notes: Note[],
  score: PipelineResult['score'],
  medianDuration: number,
  beatsPerBar: number,
): void {
  const i = nearestNoteIndex(notes, score, mark, beatsPerBar)
  if (i <= 0) {
    console.log(`  ${label} ${level} ${formatPosition(mark)} → nearest note n${i} has no gap before it`)
    return
  }
  const cue = boundaryCue(notes, i - 1, medianDuration)
  console.log(
    `  ${label} ${level} ${formatPosition(mark)} → gap before n${i}: rest ${cue.rest.toFixed(2)} ` +
    `length ${cue.length.toFixed(2)} leap ${cue.leap.toFixed(2)} total ${cue.total.toFixed(2)} ` +
    `(threshold ${DEFAULTS.threshold}), beat ${mark.beat} of ${beatsPerBar}`,
  )
}

function findingOverlaps(score: PipelineResult['score'], findings: Finding[], from: Position, to: Position): string {
  const hits = findings.filter((f) =>
    f.spans.some((s) => {
      const bar = writtenBar(score, s.bar).bar
      return bar >= from.bar && bar <= to.bar
    }),
  )
  if (hits.length === 0) return 'no engine finding overlaps'
  return hits.map((f) => {
    const view = describeFinding(f, score)
    return `${view.name} (${view.location})`
  }).join(', ')
}

if (!existsSync(ANNOTATIONS)) {
  console.log(`No annotations yet — save some from the annotation app to ${ANNOTATIONS}.`)
  process.exit(0)
}

const files = readdirSync(ANNOTATIONS).filter((f) => f.endsWith('.json')).sort()
if (files.length === 0) {
  console.log(`No annotations yet — save some from the annotation app to ${ANNOTATIONS}.`)
  process.exit(0)
}

const pooledPhrases = emptyTally()
const pooledIdeas = emptyTally()

for (const file of files) {
  const annotation = JSON.parse(readFileSync(join(ANNOTATIONS, file), 'utf8')) as AnnotationFile
  const peerPath = resolvePeer(annotation.file)
  if (!peerPath) {
    console.log(`skip ${annotation.file}: no .mxl/.musicxml in ${PEERS}`)
    continue
  }

  const result = run(new Uint8Array(readFileSync(peerPath)))
  const { score, analysis } = result
  const beatsPerBar = score.timeSig[0] * (4 / score.timeSig[1])

  const engPhrases = engineStarts(result)
  const engIdeas = engineIdeaStarts(result)
  const ownerPhrases = annotation.phrases.map(parsePosition)
  const ownerIdeas = [...annotation.phrases, ...annotation.ideas].map(parsePosition)

  const phraseResult = matchStarts(ownerPhrases, engPhrases, beatsPerBar, TOLERANCE)
  const ideaResult = matchStarts(ownerIdeas, engIdeas, beatsPerBar, TOLERANCE)

  const phraseTally: Tally = {
    matched: phraseResult.matched.length,
    missed: phraseResult.missed.length,
    falseStarts: phraseResult.falseStarts.length,
    owner: ownerPhrases.length,
    engine: engPhrases.length,
  }
  const ideaTally: Tally = {
    matched: ideaResult.matched.length,
    missed: ideaResult.missed.length,
    falseStarts: ideaResult.falseStarts.length,
    owner: ownerIdeas.length,
    engine: engIdeas.length,
  }

  for (const key of ['matched', 'missed', 'falseStarts', 'owner', 'engine'] as const) {
    pooledPhrases[key] += phraseTally[key]
    pooledIdeas[key] += ideaTally[key]
  }

  // A seeded file was corrected from engine output, not marked blind — its
  // agreement is biased toward the engine, so it wears a tag.
  const seededTag = annotation.seeded ? ' (seeded)' : ''
  console.log(
    `${annotation.file.padEnd(20)}phrases ${fmtPrf(phraseTally)}   ideas ${fmtPrf(ideaTally)}${seededTag}`,
  )

  if (showMisses) {
    const notes = analysis.contexts.map((c) => c.note)
    const medianDuration = median(notes.map((n) => n.duration))
    for (const m of phraseResult.missed) printCueAt('missed', 'phrase', m, notes, score, medianDuration, beatsPerBar)
    for (const f of phraseResult.falseStarts) printCueAt('false', 'phrase', f, notes, score, medianDuration, beatsPerBar)
    for (const m of ideaResult.missed) printCueAt('missed', 'idea', m, notes, score, medianDuration, beatsPerBar)
    for (const f of ideaResult.falseStarts) printCueAt('false', 'idea', f, notes, score, medianDuration, beatsPerBar)
  }

  // End marks are sparse — the owner only places one where the implicit end
  // (note before the next start) is wrong — so score them per level only when
  // any exist, and don't pool them with the start metrics.
  const ownerPhraseEnds = (annotation.phraseEnds ?? []).map(parsePosition)
  const ownerIdeaEnds = (annotation.ideaEnds ?? []).map(parsePosition)
  if (ownerPhraseEnds.length > 0) {
    const r = matchStarts(ownerPhraseEnds, enginePhraseEnds(result), beatsPerBar, TOLERANCE)
    console.log(`  phrase ends: ${r.matched.length}/${ownerPhraseEnds.length} matched` +
      (r.missed.length ? ` — missed ${r.missed.map(formatPosition).join(', ')}` : ''))
  }
  if (ownerIdeaEnds.length > 0) {
    const engEnds = [...enginePhraseEnds(result), ...engineIdeaEnds(result)]
    const r = matchStarts(ownerIdeaEnds, engEnds, beatsPerBar, TOLERANCE)
    console.log(`  idea ends: ${r.matched.length}/${ownerIdeaEnds.length} matched` +
      (r.missed.length ? ` — missed ${r.missed.map(formatPosition).join(', ')}` : ''))
  }

  const variationGroups = annotation.variations ?? []
  variationGroups.forEach((group, g) => {
    const letter = String.fromCharCode(65 + (g % 26))
    const ranges = group.map((s) => `${s.from}–${s.to}`).join(', ')
    console.log(`  variation group ${letter}: ${ranges}`)
  })

  for (const span of annotation.outside) {
    const from = parsePosition(span.from)
    const to = parsePosition(span.to)
    console.log(`  outside ${formatPosition(from)}–${formatPosition(to)}: ${findingOverlaps(score, analysis.findings, from, to)}`)
  }
  for (const span of annotation.stars) {
    const from = parsePosition(span.from)
    const to = parsePosition(span.to)
    console.log(`  star ${formatPosition(from)}–${formatPosition(to)}: ${findingOverlaps(score, analysis.findings, from, to)}`)
  }
}

console.log(`${'pooled'.padEnd(20)}phrases ${fmtPrf(pooledPhrases)}   ideas ${fmtPrf(pooledIdeas)}`)
process.exit(0)
