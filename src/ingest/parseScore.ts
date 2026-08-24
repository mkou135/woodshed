import { XMLParser } from 'fast-xml-parser'
import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Mark, Note, Score } from '../core/types.ts'
import { instrumentFromTranspose } from '../core/instrument.ts'

export class UnsupportedScoreError extends Error {}

const STEP_SEMITONES: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

/**
 * `preserveOrder` keeps sibling ordering, which matters: a <harmony> or
 * <direction> takes its position in the bar from where it sits between notes.
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  parseTagValue: false,
  trimValues: true,
})

type Node = Record<string, unknown>

function childrenOf(node: Node): Node[] {
  const key = Object.keys(node).find((k) => k !== ':@')
  const value = key === undefined ? undefined : node[key]
  return Array.isArray(value) ? (value as Node[]) : []
}

function tagOf(node: Node): string {
  return Object.keys(node).find((k) => k !== ':@') ?? ''
}

function textOf(node: Node): string {
  const kids = childrenOf(node)
  const t = kids.find((k) => '#text' in k)
  return t === undefined ? '' : String(t['#text'])
}

function findChild(node: Node, tag: string): Node | undefined {
  return childrenOf(node).find((c) => tagOf(c) === tag)
}

function findDeep(node: Node, tag: string): Node | undefined {
  for (const child of childrenOf(node)) {
    if (tagOf(child) === tag) return child
    const nested = findDeep(child, tag)
    if (nested) return nested
  }
  return undefined
}

function findAllDeep(node: Node, tag: string, out: Node[] = []): Node[] {
  for (const child of childrenOf(node)) {
    if (tagOf(child) === tag) out.push(child)
    findAllDeep(child, tag, out)
  }
  return out
}

function numberOf(node: Node | undefined, tag: string, fallback: number): number {
  if (!node) return fallback
  const child = findChild(node, tag)
  if (!child) return fallback
  const value = Number(textOf(child))
  return Number.isFinite(value) ? value : fallback
}

const FORBIDDEN = ['segno', 'coda']

export interface PlayedMeasure {
  node: Node
  /** Bar number in played order: the written number plus the bars inserted before it. */
  bar: number
}

/**
 * Written order → played order. A forward repeat (or the start of the piece)
 * opens a section; a backward repeat plays it again. With first and second
 * endings, the second pass stops before ending 1 and continues after it.
 * Two passes only: `times` is ignored. Segno and coda stay unsupported.
 * Transcriptions write the head once with a repeat and the solo straight
 * through; the engine needs the head's bars to line up with the changes.
 */
export function playedMeasures(part: Node): { measures: PlayedMeasure[]; repeats: { from: number; to: number }[] } {
  const written = childrenOf(part).filter((m) => tagOf(m) === 'measure')
  const numberOfMeasure = (m: Node): number => Number((m[':@'] as Node | undefined)?.['@_number'] ?? 0)
  const barlines = (m: Node) => childrenOf(m).filter((el) => tagOf(el) === 'barline')
  const repeatDirection = (m: Node): string[] =>
    barlines(m).flatMap((b) => findAllDeep(b, 'repeat')).map((r) => String((r[':@'] as Node | undefined)?.['@_direction'] ?? ''))
  const endingStart = (m: Node): string | null => {
    const e = barlines(m).flatMap((b) => findAllDeep(b, 'ending'))
      .find((e) => (e[':@'] as Node | undefined)?.['@_type'] === 'start')
    return e ? String((e[':@'] as Node | undefined)?.['@_number'] ?? '') : null
  }

  const measures: PlayedMeasure[] = []
  const repeats: { from: number; to: number }[] = []
  let inserted = 0
  let sectionStart = 0
  let ending1Start: number | null = null
  for (let i = 0; i < written.length; i++) {
    const m = written[i]
    const directions = repeatDirection(m)
    if (directions.includes('forward')) { sectionStart = i; ending1Start = null }
    if (endingStart(m) === '1') ending1Start = i
    measures.push({ node: m, bar: numberOfMeasure(m) + inserted })
    if (directions.includes('backward')) {
      const end = ending1Start ?? i + 1
      for (let k = sectionStart; k < end; k++) {
        inserted++
        measures.push({ node: written[k], bar: numberOfMeasure(written[i]) + inserted })
      }
      repeats.push({ from: numberOfMeasure(written[sectionStart]), to: numberOfMeasure(written[i]) })
      sectionStart = i + 1
      ending1Start = null
    }
  }
  return { measures, repeats }
}

export function parseScore(xml: string): Score {
  const root = parser.parse(xml) as Node[]
  const doc: Node = { root }

  const part = findDeep(doc, 'part')
  if (!part) throw new UnsupportedScoreError('No <part> element found')

  for (const tag of FORBIDDEN) {
    if (findAllDeep(part, tag).length > 0) {
      throw new UnsupportedScoreError(
        `Score contains <${tag}>; written bar order may not equal played order. ` +
          'Flatten the repeats before importing.',
      )
    }
  }

  const { measures, repeats } = playedMeasures(part)

  const titleNode = findDeep(doc, 'work-title') ?? findDeep(doc, 'movement-title')
  const title = titleNode ? textOf(titleNode).trim() || undefined : undefined

  let divisions = 1
  let timeSig: [number, number] = [4, 4]
  let instrument = instrumentFromTranspose(0, 0)
  let sawTranspose = false

  const notes: Note[] = []
  const marks: Mark[] = []
  let scoreTicks = 0

  for (const { node: measure, bar: barNumber } of measures) {
    const measureStart = scoreTicks
    let cursor = 0

    for (const el of childrenOf(measure)) {
      const tag = tagOf(el)

      if (tag === 'attributes') {
        const div = findChild(el, 'divisions')
        if (div) divisions = Number(textOf(div))
        const time = findChild(el, 'time')
        if (time) {
          timeSig = [numberOf(time, 'beats', 4), numberOf(time, 'beat-type', 4)]
        }
        const transpose = findChild(el, 'transpose')
        if (transpose) {
          instrument = instrumentFromTranspose(
            numberOf(transpose, 'chromatic', 0),
            numberOf(transpose, 'octave-change', 0),
          )
          sawTranspose = true
        }
        continue
      }

      if (tag === 'direction') {
        const bar = barNumber
        for (const kind of ['rehearsal', 'words'] as const) {
          for (const found of findAllDeep(el, kind)) {
            const text = textOf(found).trim()
            if (text) marks.push({ bar, kind, text })
          }
        }
        continue
      }

      if (tag === 'barline') {
        const style = findChild(el, 'bar-style')
        // A double bar closes a section; the mark goes on the bar that opens
        // the next one. On the last measure it closes the piece: no mark.
        if (style && textOf(style).trim() === 'light-light' && measure !== measures[measures.length - 1].node) {
          marks.push({ bar: barNumber + 1, kind: 'double-bar', text: '' })
        }
        continue
      }

      const scale = TICKS_PER_QUARTER / divisions

      if (tag === 'backup') {
        cursor -= numberOf(el, 'duration', 0) * scale
        continue
      }
      if (tag === 'forward') {
        cursor += numberOf(el, 'duration', 0) * scale
        continue
      }
      if (tag !== 'note') continue

      // Chord members belong to a note already emitted; this model is monophonic.
      if (findChild(el, 'chord')) continue

      const duration = numberOf(el, 'duration', 0) * scale
      const pitch = findChild(el, 'pitch')

      if (!pitch) {
        cursor += duration
        continue
      }

      const step = textOf(findChild(pitch, 'step') ?? {})
      const octave = numberOf(pitch, 'octave', 4)
      const alter = numberOf(pitch, 'alter', 0)
      const midi = (octave + 1) * 12 + (STEP_SEMITONES[step] ?? 0) + alter

      const ties = findAllDeep(el, 'tie').map(
        (t) => (t[':@'] as Node | undefined)?.['@_type'],
      )
      const previous = notes[notes.length - 1]

      if (ties.includes('stop') && previous && previous.midi === midi) {
        previous.duration += duration
        previous.tiedFrom = true
      } else {
        notes.push({
          midi,
          onset: measureStart + cursor,
          duration,
          bar: barNumber,
          beat: cursor / TICKS_PER_QUARTER,
        })
      }
      cursor += duration
    }

    scoreTicks = measureStart + (timeSig[0] * 4 / timeSig[1]) * TICKS_PER_QUARTER
  }

  if (!sawTranspose) instrument = instrumentFromTranspose(0, 0)

  return {
    title,
    notes,
    chordTracks: [],
    instrument,
    timeSig,
    marks,
    barCount: measures.length,
    ...(repeats.length ? { repeats } : {}),
  }
}
