import { describe, it, expect } from 'vitest'
import { parseChordSymbol, chordTrackFromMarks } from './parseChordText.ts'
import type { Mark } from '../core/types.ts'

describe('parseChordSymbol', () => {
  it('parses the dash-minor dialect', () => {
    expect(parseChordSymbol('D-')).toMatchObject({ rootPc: 2, quality: 'minor' })
    expect(parseChordSymbol('D-7')).toMatchObject({ rootPc: 2, quality: 'minor-seventh' })
  })

  it('parses dominants', () => {
    expect(parseChordSymbol('C7')).toMatchObject({ rootPc: 0, quality: 'dominant' })
    expect(parseChordSymbol('Bb7')).toMatchObject({ rootPc: 10, quality: 'dominant' })
  })

  it('parses the maj dialect', () => {
    expect(parseChordSymbol('Fmaj')).toMatchObject({ rootPc: 5, quality: 'major' })
    expect(parseChordSymbol('Fmaj7')).toMatchObject({ rootPc: 5, quality: 'major-seventh' })
  })

  it('parses sharp roots', () => {
    expect(parseChordSymbol('F#-7')).toMatchObject({ rootPc: 6, quality: 'minor-seventh' })
  })

  it('captures altered tensions', () => {
    expect(parseChordSymbol('E7+9')).toMatchObject({
      rootPc: 4, quality: 'dominant', tensions: ['#9'],
    })
    expect(parseChordSymbol('C7b9')).toMatchObject({ tensions: ['b9'] })
  })

  it('parses diminished and half-diminished', () => {
    expect(parseChordSymbol('Bo7')).toMatchObject({ quality: 'diminished-seventh' })
    expect(parseChordSymbol('Em7b5')).toMatchObject({ quality: 'half-diminished' })
  })

  it('parses suspended and augmented chords', () => {
    expect(parseChordSymbol('G7sus')).toMatchObject({ quality: 'suspended-fourth' })
    expect(parseChordSymbol('C+')).toMatchObject({ quality: 'augmented' })
  })

  it('returns null for text that is not a chord symbol', () => {
    expect(parseChordSymbol('Swing')).toBeNull()
    expect(parseChordSymbol('sloppy')).toBeNull()
    expect(parseChordSymbol('lay back')).toBeNull()
    expect(parseChordSymbol('')).toBeNull()
  })
})

describe('chordTrackFromMarks', () => {
  it('builds a track from chord-like words and skips the rest', () => {
    const marks: Mark[] = [
      { bar: 1, kind: 'words', text: 'Swing' },
      { bar: 1, kind: 'words', text: 'D-' },
      { bar: 2, kind: 'words', text: 'G7' },
      { bar: 2, kind: 'words', text: 'sloppy' },
    ]
    const track = chordTrackFromMarks(marks)!
    expect(track.chords).toHaveLength(2)
    expect(track.chords[0]).toMatchObject({ bar: 1, rootPc: 2, quality: 'minor' })
    expect(track.chords[1]).toMatchObject({ bar: 2, rootPc: 7, quality: 'dominant' })
  })

  it('marks text-derived chords as lower confidence than harmony elements', () => {
    const track = chordTrackFromMarks([{ bar: 1, kind: 'words', text: 'C7' }])!
    expect(track.provenance).toBe('file')
    expect(track.confidence).toBeLessThan(1)
  })

  it('returns null when no words parse as chords', () => {
    expect(chordTrackFromMarks([{ bar: 1, kind: 'words', text: 'Swing' }])).toBeNull()
  })
})
