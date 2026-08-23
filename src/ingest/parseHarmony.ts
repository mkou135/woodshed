import { XMLParser } from 'fast-xml-parser'
import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Chord, ChordTrack, Quality } from '../core/types.ts'

const STEP_SEMITONES: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

/**
 * MusicXML <kind> values -> our Quality. Covers everything the corpus uses.
 * The `text` attribute is deliberately never consulted: under
 * use-symbols="yes" MuseScore writes text="7" for minor-seventh,
 * major-seventh, half-diminished, diminished-seventh and augmented-seventh
 * alike, which would collapse all of them to a dominant.
 */
const KIND_TO_QUALITY: Record<string, Quality> = {
  'major': 'major',
  'minor': 'minor',
  'dominant': 'dominant',
  'dominant-ninth': 'dominant',
  'dominant-11th': 'dominant',
  'dominant-13th': 'dominant',
  'major-seventh': 'major-seventh',
  'major-sixth': 'major',
  'major-ninth': 'major-seventh',
  'minor-seventh': 'minor-seventh',
  'minor-sixth': 'minor',
  'minor-ninth': 'minor-seventh',
  'minor-major': 'minor-major',
  'half-diminished': 'half-diminished',
  'diminished': 'diminished',
  'diminished-seventh': 'diminished-seventh',
  'augmented': 'augmented',
  'augmented-seventh': 'augmented-seventh',
  'suspended-fourth': 'suspended-fourth',
}

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
  const t = childrenOf(node).find((k) => '#text' in k)
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

function degreeLabel(node: Node): string | null {
  const value = findChild(node, 'degree-value')
  const alter = findChild(node, 'degree-alter')
  if (!value) return null
  const a = alter ? Number(textOf(alter)) : 0
  const prefix = a === -1 ? 'b' : a === 1 ? '#' : ''
  return `${prefix}${textOf(value)}`
}

export function parseHarmonyTrack(xml: string): ChordTrack | null {
  const root = parser.parse(xml) as Node[]
  const part = findDeep({ root }, 'part')
  if (!part) return null

  const measures = childrenOf(part).filter((m) => tagOf(m) === 'measure')
  const chords: Chord[] = []

  let divisions = 1
  let timeSigTicks = 4 * TICKS_PER_QUARTER
  let scoreTicks = 0

  for (const measure of measures) {
    const bar = Number((measure[':@'] as Node | undefined)?.['@_number'] ?? 0)
    const measureStart = scoreTicks
    let cursor = 0

    for (const el of childrenOf(measure)) {
      const tag = tagOf(el)

      if (tag === 'attributes') {
        const div = findChild(el, 'divisions')
        if (div) divisions = Number(textOf(div))
        const time = findChild(el, 'time')
        if (time) {
          const beats = Number(textOf(findChild(time, 'beats') ?? {})) || 4
          const beatType = Number(textOf(findChild(time, 'beat-type') ?? {})) || 4
          timeSigTicks = (beats * 4 / beatType) * TICKS_PER_QUARTER
        }
        continue
      }

      const scale = TICKS_PER_QUARTER / divisions

      if (tag === 'harmony') {
        const rootEl = findChild(el, 'root')
        const kindEl = findChild(el, 'kind')
        if (!rootEl || !kindEl) continue

        const step = textOf(findChild(rootEl, 'root-step') ?? {})
        const alterEl = findChild(rootEl, 'root-alter')
        const alter = alterEl ? Number(textOf(alterEl)) : 0
        const rootPc = (((STEP_SEMITONES[step] ?? 0) + alter) % 12 + 12) % 12

        const kindText = textOf(kindEl)
        const quality = KIND_TO_QUALITY[kindText] ?? 'unknown'

        const offsetEl = findChild(el, 'offset')
        const offset = offsetEl ? Number(textOf(offsetEl)) * scale : 0

        const tensions = childrenOf(el)
          .filter((c) => tagOf(c) === 'degree')
          .map(degreeLabel)
          .filter((d): d is string => d !== null)

        chords.push({
          onset: measureStart + cursor + offset,
          bar,
          rootPc,
          quality,
          tensions,
        })
        continue
      }

      if (tag === 'backup') {
        cursor -= Number(textOf(findChild(el, 'duration') ?? {})) * scale
      } else if (tag === 'forward') {
        cursor += Number(textOf(findChild(el, 'duration') ?? {})) * scale
      } else if (tag === 'note' && !findChild(el, 'chord')) {
        cursor += Number(textOf(findChild(el, 'duration') ?? {})) * scale
      }
    }

    scoreTicks = measureStart + timeSigTicks
  }

  if (chords.length === 0) return null
  return { chords, provenance: 'file', confidence: 1 }
}
