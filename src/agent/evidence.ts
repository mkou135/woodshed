import type { Analysis, Finding } from '../analyse/index.ts'
import type { BoundaryCandidate } from '../analyse/segment.ts'
import type { Score } from '../core/types.ts'
import { barLabel } from '../core/bars.ts'
import { chordName } from '../practice/unit.ts'
import type { PracticeUnit } from '../practice/unit.ts'

/**
 * The evidence the model judges from: everything is a number or name the
 * engine computed, rendered once per solo and reused by every job as the
 * cached prompt prefix. Deterministic by construction — no timestamps, no
 * ordering that is not already the engine's.
 */

function findingLine(f: Finding, score: Score): string {
  const bars = f.spans.map((s) => barLabel(score, s.bar)).join(', ')
  const degrees = f.degrees ? ` · degrees ${f.degrees.join(' ')}` : ''
  const quality = f.quality ? ` over ${f.quality}` : ''
  const language = f.language
    ? ` · common language${f.lickShare !== undefined ? ` (in ${(f.lickShare * 100).toFixed(0)}% of recorded solos)` : ''}`
    : ''
  return `${f.id} · ${f.kind} · ${f.name}${quality} · bars ${bars}${degrees} · confidence ${f.confidence.toFixed(2)} · detected by ${f.detectedBy.join('+')}${language}`
}

function unitLine(u: PracticeUnit): string {
  const chords = u.harmony.map(chordName).join(' → ') || 'no chords'
  const findings = u.findings.map((f) => f.id).join(', ') || 'none'
  const arrival = u.arrival ? `arrives on ${u.arrival.degree}${u.arrival.chordTone ? ' (chord tone)' : ''}` : 'no arrival'
  const part = u.part ? ` (part ${u.part.n}/${u.part.of})` : ''
  const stock = `stock ${u.stock.toFixed(2)} (run ${u.stockParts.run.toFixed(2)}, corpus ${u.stockParts.corpus.toFixed(2)}, language ${u.stockParts.language.toFixed(2)})`
  return `${u.id}${part} · ${u.summary.bars} · ${chords} · findings: ${findings} · ${arrival} · ${stock} · engine rank ${u.rank.toFixed(2)}`
}

export function analysisDocument(analysis: Analysis, units: PracticeUnit[], score: Score): string {
  const o = analysis.profile.overall
  const register = o.register ? `${o.register.lo}-${o.register.hi} (mean ${Math.round(o.register.mean)})` : 'empty'
  const chorusLines = analysis.profile.choruses.map(
    (c, i) => `chorus ${i + 1} (bars ${barLabel(score, c.startBar)}-${barLabel(score, c.endBar)}): ${c.notesPerBar.toFixed(1)} notes/bar, silence ${(c.silence * 100).toFixed(0)}%, phrases ${c.phrases}, chromatic ${(c.chromaticRatio * 100).toFixed(0)}%`,
  )
  const scaleLines = analysis.scaleSpans
    .filter((s) => s.declared)
    .map((s) => `bar ${barLabel(score, s.bar)}: ${chordName(s.chord)} played on ${s.name} (declared by the chart)`)
  return [
    '# Solo profile',
    `bars ${barLabel(score, o.startBar)}-${barLabel(score, o.endBar)} · ${o.notes} notes · ${o.notesPerBar.toFixed(1)} notes/bar · silence ${(o.silence * 100).toFixed(0)}% · phrases ${o.phrases} (mean ${o.meanPhraseNotes.toFixed(1)} notes) · register ${register} · chromatic ${(o.chromaticRatio * 100).toFixed(0)}%`,
    `phrase-edge chromaticism: starts ${(analysis.profile.phraseChromaticism.start * 100).toFixed(0)}%, ends ${(analysis.profile.phraseChromaticism.end * 100).toFixed(0)}%`,
    ...chorusLines,
    '',
    '# Findings (id · kind · dictionary name · where · evidence)',
    ...analysis.findings.map((f) => findingLine(f, score)),
    '',
    '# Practice units (id · where · harmony · contents)',
    ...units.map(unitLine),
    ...(scaleLines.length ? ['', '# Chart-declared scales', ...scaleLines] : []),
  ].join('\n')
}

export function segmentDocument(candidates: BoundaryCandidate[], timeSig: [number, number]): string {
  return [
    `# Ambiguous boundary candidates (${timeSig[0]}/${timeSig[1]}; cue components 0-1; the engine's phrase threshold is what put these in doubt)`,
    ...candidates.map(
      (c) =>
        `${c.id} · after the note at bar ${c.bar} beat ${c.beat} · total ${c.cue.total.toFixed(2)} · rest ${c.cue.rest.toFixed(2)} · length ${c.cue.length.toFixed(2)} · leap ${c.cue.leap.toFixed(2)} · rhythm ${c.cue.rhythm.toFixed(2)} · silence ${c.cue.gap} ticks`,
    ),
  ].join('\n')
}
