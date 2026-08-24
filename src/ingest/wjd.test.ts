import { describe, it, expect } from 'vitest'
import { scoreFromWjd, wjdChordText } from './wjd.ts'
import type { WjdBeatRow, WjdMelodyRow } from './wjd.ts'

const note = (bar: number, beat: number, tatum: number, pitch: number): WjdMelodyRow =>
  ({ onset: 0, pitch, duration: 0.25, period: 4, division: 2, bar, beat, tatum, beatdur: 0.5 })
const beat = (bar: number, b: number, chord = '', form = ''): WjdBeatRow =>
  ({ bar, beat: b, chord, form, signature: '4/4' })

describe('wjdChordText', () => {
  it('spells WJD symbols the way the text parser reads them', () => {
    expect(wjdChordText('Bbj7')).toBe('Bbmaj7')
    expect(wjdChordText('C-7')).toBe('C-7')
    expect(wjdChordText('G7alt')).toBe('G7')
    expect(wjdChordText('Am7b5')).toBe('Am7b5')
  })
})

describe('scoreFromWjd', () => {
  it('rejects a solo that changes meter', () => {
    const rows = [note(0, 1, 1, 60), { ...note(1, 1, 1, 60), period: 5 }]
    expect(() => scoreFromWjd({ melid: 9, title: '', performer: '', instrument: 'ts' }, rows, [])).toThrow(/meter/)
  })

  const solo = { melid: 1, title: 'Test', performer: 'X', instrument: 'ts' }
  const melody = [note(-1, 3, 1, 60), note(0, 1, 1, 62), note(0, 1, 2, 64), note(0, 2, 1, 65)]
  const beats = [beat(-1, 1), beat(-1, 3), beat(0, 1, 'Bbj7', 'A1'), beat(0, 3, 'G-7'), beat(1, 1, 'C-7'), beat(1, 3, 'F7'), beat(2, 1, 'Bbj7', 'A2')]

  it('renumbers bars from 1 and puts notes on the tick grid', () => {
    const { score } = scoreFromWjd(solo, melody, beats)
    expect(score.notes.map((n) => [n.bar, n.beat])).toEqual([[1, 2], [2, 0], [2, 0.5], [2, 1]])
    expect(score.notes[1].onset).toBe(4 * 960)
    expect(score.barCount).toBe(4)
  })

  it('writes tenor pitches a major ninth above concert', () => {
    const { score } = scoreFromWjd(solo, melody, beats)
    expect(score.notes[0].midi).toBe(74)
    expect(score.instrument.transpose).toEqual({ chromatic: -2, octave: -1 })
  })

  it('reads chords per beat and form labels as rehearsal marks', () => {
    const { score, unparsedChords } = scoreFromWjd(solo, melody, beats)
    expect(unparsedChords).toEqual([])
    expect(score.chordTracks[0].chords.map((c) => [c.bar, c.rootPc, c.quality])).toEqual([
      [2, 10, 'major-seventh'], [2, 7, 'minor-seventh'], [3, 0, 'minor-seventh'], [3, 5, 'dominant'], [4, 10, 'major-seventh'],
    ])
    expect(score.marks).toEqual([{ bar: 2, kind: 'rehearsal', text: 'A' }, { bar: 4, kind: 'rehearsal', text: 'A' }])
  })
})
