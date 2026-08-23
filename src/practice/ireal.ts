import { TICKS_PER_QUARTER } from '../core/types.ts'
import type { Chord, Quality } from '../core/types.ts'
import type { Tune, TuneBar } from './tune.ts'

/**
 * iReal Pro charts, from an `irealb://` link as the app's Share button or
 * the forum playlists produce them.
 *
 * The chord body is lightly scrambled in 50-character blocks; the layout is
 * a grid of cells, one cell per beat, where a chord symbol takes one cell
 * and a space is an empty cell. Repeats, endings and repeat-bar marks are
 * unrolled so the result is the sequence of bars actually played. Charts
 * are in concert pitch; the caller transposes for the instrument.
 *
 * Chord quality comes from an explicit suffix table. An unknown suffix is
 * an error naming it, never a guess.
 */

export class UnsupportedChartError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedChartError'
  }
}

const PREFIX = '1r34LbKcu7'

function unscrambleBlock(s: string): string {
  const out = s.split('')
  for (let i = 0; i < 5; i++) {
    out[i] = s[49 - i]
    out[49 - i] = s[i]
  }
  for (let i = 10; i < 24; i++) {
    out[i] = s[49 - i]
    out[49 - i] = s[i]
  }
  return out.join('')
}

export function unscramble(body: string): string {
  let s = body
  let r = ''
  while (s.length > 50) {
    const block = s.slice(0, 50)
    s = s.slice(50)
    r += s.length < 2 ? block : unscrambleBlock(block)
  }
  r += s
  return r.replace(/XyQ/g, '   ').replace(/LZ/g, ' |').replace(/Kcl/g, '| x')
}

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/**
 * iReal quality cores → Quality. Tensions (b9, #11, alt, add9, #5 …) are
 * stripped first and kept as text, so "7b9#11" is the dominant core "7"
 * with two tensions. The one tension that changes the quality is #5 on a
 * dominant, which is the augmented seventh.
 */
const CORE: Record<string, Quality> = {
  '': 'major', '6': 'major', '69': 'major', '2': 'major', '5': 'major',
  '^': 'major-seventh', '^7': 'major-seventh', '^9': 'major-seventh', '^13': 'major-seventh',
  '-': 'minor', '-6': 'minor', '-69': 'minor',
  '-7': 'minor-seventh', '-9': 'minor-seventh', '-11': 'minor-seventh',
  '-^': 'minor-major', '-^7': 'minor-major', '-^9': 'minor-major',
  'h': 'half-diminished', 'h7': 'half-diminished', 'h9': 'half-diminished',
  'o': 'diminished', 'o^7': 'diminished', 'o7': 'diminished-seventh',
  '+': 'augmented', '7+': 'augmented-seventh', '+7': 'augmented-seventh',
  '7': 'dominant', '9': 'dominant', '11': 'dominant', '13': 'dominant',
  'sus': 'suspended-fourth', 'sus4': 'suspended-fourth', 'sus2': 'suspended-fourth',
  '7sus': 'suspended-fourth', '9sus': 'suspended-fourth', '13sus': 'suspended-fourth',
}

const TENSION = /[b#]\d+|alt|add\d+/g

function parseChord(token: string, bar: number, onset: number): Chord {
  const m = /^([A-G])([b#]?)(.*)$/.exec(token)
  if (!m) throw new UnsupportedChartError(`unrecognised chord "${token}"`)
  const [, step, accidental, rest] = m
  const suffix = rest.replace(/\/[A-G][b#]?$/, '')
  const tensions: string[] = suffix.match(TENSION) ?? []
  let core = suffix.replace(TENSION, '')
  // "7susb9" and "7b13sus": the sus can sit either side of a tension.
  if (core.endsWith('sus') && core !== 'sus' && !(core in CORE)) core = core.replace(/sus$/, '') + 'sus'
  let quality = CORE[core]
  if (quality === undefined) {
    throw new UnsupportedChartError(`unknown chord quality "${suffix}" in "${token}"`)
  }
  if (core === '7' && tensions.includes('#5')) quality = 'augmented-seventh'
  if (core === '-7' && tensions.includes('b5')) quality = 'half-diminished'
  const rootPc = ((STEP[step] + (accidental === 'b' ? -1 : accidental === '#' ? 1 : 0)) % 12 + 12) % 12
  return { onset, bar, rootPc, quality, tensions }
}

/** Cells per bar for an iReal time signature token, e.g. T44 → 4. */
function cellsOf(sig: string): [number, [number, number]] {
  const table: Record<string, [number, [number, number]]> = {
    '44': [4, [4, 4]], '34': [3, [3, 4]], '24': [2, [2, 4]], '54': [5, [5, 4]],
    '64': [6, [6, 4]], '74': [7, [7, 4]], '22': [2, [2, 2]], '32': [3, [3, 2]],
    '58': [5, [5, 8]], '68': [2, [6, 8]], '78': [7, [7, 8]], '98': [3, [9, 8]],
    '12': [4, [12, 8]],
  }
  const found = table[sig]
  if (!found) throw new UnsupportedChartError(`time signature T${sig}`)
  return found
}

interface RawBar {
  cells: (string | null)[]
  /** Mark this bar opens / closes a repeat, or starts an ending. */
  open?: boolean
  close?: boolean
  ending?: number
}

/** Split the unscrambled body into bars of cells. */
function tokenise(body: string): { bars: RawBar[]; timeSig: [number, number]; cells: number } {
  let timeSig: [number, number] = [4, 4]
  let cellsPerBar = 4
  const bars: RawBar[] = []
  let current: RawBar = { cells: [] }
  let i = 0
  const s = body

  const flush = (): void => {
    const hasContent = current.cells.some((c) => c !== null)
    if (hasContent || current.open || current.ending) bars.push(current)
    current = { cells: [] }
  }

  while (i < s.length) {
    const c = s[i]
    if (c === '|' || c === '[' || c === ']' || c === 'Z') { flush(); i++; continue }
    if (c === '{') { flush(); current.open = true; i++; continue }
    if (c === '}') { current.close = true; flush(); i++; continue }
    if (c === 'T') { const [cells, sig] = cellsOf(s.slice(i + 1, i + 3)); cellsPerBar = cells; timeSig = sig; i += 3; continue }
    if (c === 'N') { current.ending = Number(s[i + 1]); i += 2; continue }
    if (c === '*') { i += 2; continue }
    if (c === '<') { const end = s.indexOf('>', i); i = end === -1 ? s.length : end + 1; continue }
    if (c === '(') { const end = s.indexOf(')', i); i = end === -1 ? s.length : end + 1; continue }
    if (c === ' ' || c === ',') { if (c === ' ') current.cells.push(null); i++; continue }
    if (c === 'W') {
      // Bass note only, no chord: a cell with nothing to play over.
      const m = /^W\/[A-G][b#]?/.exec(s.slice(i))
      current.cells.push(null)
      i += m ? m[0].length : 1
      continue
    }
    if ('YUSQfls'.includes(c)) { i++; continue }
    if (c === 'x' || c === 'r' || c === 'n' || c === 'p') { current.cells.push(c); i++; continue }
    if (/[A-G]/.test(c)) {
      let j = i + 1
      while (j < s.length && !/[\s|\[\]{}ZN<(,]/.test(s[j]) && !(s[j] === 'T' && /\d\d/.test(s.slice(j + 1, j + 3)))) j++
      current.cells.push(s.slice(i, j))
      i = j
      continue
    }
    throw new UnsupportedChartError(`unexpected "${c}" at ${i}`)
  }
  flush()
  return { bars, timeSig, cells: cellsPerBar }
}

/** Resolve x / r / p / n and cell positions into chords, then unroll repeats. */
function realise(raw: RawBar[], cellsPerBar: number, timeSig: [number, number]): TuneBar[] {
  const ticksPerCell = (timeSig[1] === 8 ? TICKS_PER_QUARTER * 1.5 : TICKS_PER_QUARTER * (4 / timeSig[1]))
  const out: TuneBar[] = []
  let last: Chord | null = null

  const build = (bar: RawBar, number: number): TuneBar => {
    const chords: Chord[] = []
    let cell = 0
    for (const token of bar.cells) {
      if (token === null) { cell++; continue }
      if (token === 'x') {
        const prev = out[out.length - 1]
        return { chords: prev ? prev.chords.map((c) => ({ ...c, bar: number })) : [] }
      }
      if (token === 'r') {
        const prev = out[out.length - 2]
        return { chords: prev ? prev.chords.map((c) => ({ ...c, bar: number })) : [] }
      }
      if (token === 'n') { cell++; continue }
      if (token === 'p') {
        if (last && chords.length === 0) chords.push({ ...last, onset: cell * ticksPerCell, bar: number })
        cell++
        continue
      }
      const chord = parseChord(token, number, Math.min(cell, cellsPerBar - 1) * ticksPerCell)
      chords.push(chord)
      last = chord
      cell++
    }
    if (chords.length === 0 && last) chords.push({ ...last, onset: 0, bar: number })
    return { chords }
  }

  // Unroll: a repeat section plays twice; numbered endings select per pass.
  let i = 0
  while (i < raw.length) {
    if (!raw[i].open) {
      out.push(build(raw[i], out.length + 1))
      // An `r` consumes the blank bar that follows it on the page.
      if (raw[i].cells.includes('r')) {
        out.push({ chords: out[out.length - 2]?.chords.map((c) => ({ ...c, bar: out.length + 1 })) ?? [] })
        if (raw[i + 1] && raw[i + 1].cells.every((c) => c === null)) i++
      }
      i++
      continue
    }
    let end = i
    while (end < raw.length && !raw[end].close) end++
    const section = raw.slice(i, end + 1)
    for (const pass of [1, 2]) {
      let ending = 0
      for (const bar of section) {
        if (bar.ending) ending = bar.ending
        if (ending && ending !== pass) continue
        out.push(build(bar, out.length + 1))
      }
    }
    i = end + 1
  }
  return out
}

export interface IRealSong {
  title: string
  composer: string
  style: string
  key: string
  tune: Tune
}

/** Parse an `irealb://` link: one song or a whole playlist. */
export function parseIReal(link: string): IRealSong[] {
  const trimmed = link.trim()
  if (!trimmed.startsWith('irealb://')) {
    throw new UnsupportedChartError('expected an irealb:// link (irealbook:// is not supported)')
  }
  const body = decodeURIComponent(trimmed.slice('irealb://'.length))
  const songs: IRealSong[] = []
  for (const entry of body.split('===')) {
    const fields = entry.split('=')
    if (fields.length < 7) continue
    const [title, composer, , style, key, , chords] = fields
    if (!chords.startsWith(PREFIX)) throw new UnsupportedChartError(`"${title}" has no chord body`)
    const text = unscramble(chords.slice(PREFIX.length))
    const { bars, timeSig, cells } = tokenise(text)
    songs.push({
      title, composer, style, key,
      tune: { title, timeSig, bars: realise(bars, cells, timeSig) },
    })
  }
  if (songs.length === 0) throw new UnsupportedChartError('no songs in link')
  return songs
}
