import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseScore, UnsupportedScoreError } from './parseScore.ts'
import { TICKS_PER_QUARTER } from '../core/types.ts'

const load = (name: string): string => readFileSync(`fixtures/${name}`, 'utf8')

describe('parseScore', () => {
  it('parses notes with bar and beat positions', () => {
    const s = parseScore(load('minimal-tenor.musicxml'))
    expect(s.notes).toHaveLength(8)
    expect(s.barCount).toBe(2)
    expect(s.timeSig).toEqual([4, 4])
    expect(s.notes[0]).toMatchObject({ midi: 60, bar: 1, beat: 0, onset: 0 })
    expect(s.notes[1]).toMatchObject({ midi: 62, bar: 1, beat: 1 })
    expect(s.notes[4]).toMatchObject({ midi: 65, bar: 2, beat: 0 })
  })

  it('reads the instrument from the transposition', () => {
    expect(parseScore(load('minimal-tenor.musicxml')).instrument.name)
      .toBe('Bb tenor saxophone')
    expect(parseScore(load('words-chords-alto.musicxml')).instrument.name)
      .toBe('Eb alto saxophone')
  })

  it('rescales durations from the file divisions to 960 ticks per quarter', () => {
    // Fixture uses divisions=24, so a quarter note is 24 file units.
    const s = parseScore(load('ties-tuplets-div24.musicxml'))
    const quarter = TICKS_PER_QUARTER
    // First note is two tied quarters, so it should be a half note long.
    expect(s.notes[0].duration).toBe(quarter * 2)
    expect(s.notes[0].tiedFrom).toBe(true)
  })

  it('merges tied notes into one, so the tied pair is a single note', () => {
    const s = parseScore(load('ties-tuplets-div24.musicxml'))
    // Bar 1: tied C + C, E, G = 3 notes. Bar 2: 3 triplet eighths + 3 = 6.
    expect(s.notes.filter((n) => n.bar === 1)).toHaveLength(3)
    expect(s.notes).toHaveLength(9)
  })

  it('keeps triplet durations proportional', () => {
    const s = parseScore(load('ties-tuplets-div24.musicxml'))
    const triplet = s.notes.find((n) => n.bar === 2)!
    // A triplet eighth is 16/24 of a quarter in the fixture -> 640 ticks.
    expect(triplet.duration).toBe(640)
  })

  it('collects rehearsal marks and words verbatim', () => {
    const s = parseScore(load('transcriber-notes.musicxml'))
    expect(s.marks).toEqual([
      { bar: 1, kind: 'words', text: 'Swing' },
      { bar: 2, kind: 'words', text: 'sloppy' },
      { bar: 3, kind: 'words', text: 'flat' },
    ])
  })

  it('collects rehearsal marks with their bars', () => {
    const s = parseScore(load('form-8bar-x3.musicxml'))
    const reh = s.marks.filter((m) => m.kind === 'rehearsal')
    expect(reh).toEqual([
      { bar: 1, kind: 'rehearsal', text: '1' },
      { bar: 9, kind: 'rehearsal', text: '2' },
      { bar: 17, kind: 'rehearsal', text: '3' },
    ])
  })

  it('unrolls a simple repeat: the section plays twice, bars renumbered in played order', () => {
    const s = parseScore(load('has-repeats.musicxml'))
    expect(s.barCount).toBe(4)
    expect(s.notes.map((n) => n.bar)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4])
    expect(s.notes[8]).toMatchObject({ midi: 60, bar: 3, beat: 0, onset: 8 * TICKS_PER_QUARTER })
    expect(s.repeats).toEqual([{ from: 1, to: 2 }])
  })

  it('unrolls first and second endings: pass one takes ending 1, pass two skips to ending 2', () => {
    // Written 1 | 2(ending 1) :| 3(ending 2) | 4  →  played C D C E F
    const s = parseScore(load('repeat-endings.musicxml'))
    expect(s.barCount).toBe(5)
    expect(s.notes.map((n) => n.midi)).toEqual([60, 62, 60, 64, 65])
    expect(s.notes.map((n) => n.bar)).toEqual([1, 2, 3, 4, 5])
    expect(s.repeats).toEqual([{ from: 1, to: 2 }])
  })

  it('still refuses segno and coda', () => {
    const xml = load('minimal-tenor.musicxml').replace('<measure number="1">', '<measure number="1"><direction><sound coda="c"/><direction-type><coda/></direction-type></direction>')
    expect(() => parseScore(xml)).toThrow(UnsupportedScoreError)
  })

  it('leaves chordTracks empty — chords are a later stage', () => {
    expect(parseScore(load('minimal-tenor.musicxml')).chordTracks).toEqual([])
  })
})

describe('double bars', () => {
  it('records a double bar as a mark on the bar that follows it', () => {
    const score = parseScore(load('form-intro-doublebars.musicxml'))
    const bars = score.marks.filter((m) => m.kind === 'double-bar').map((m) => m.bar)
    expect(bars).toEqual([5, 13, 21])
  })
})

describe('final double bar', () => {
  it('does not mark a bar past the end of the score', () => {
    const score = parseScore(load('form-letters-in-chorus.musicxml'))
    const bars = score.marks.filter((m) => m.kind === 'double-bar').map((m) => m.bar)
    expect(bars).toEqual([10])
  })
})

describe('title', () => {
  it('reads the work title', () => {
    const xml = load('form-8bar-x3.musicxml').replace('<part-list>', '<work><work-title>Hey Lock!</work-title></work><part-list>')
    expect(parseScore(xml).title).toBe('Hey Lock!')
  })
  it('is undefined when the score has none', () => {
    expect(parseScore(load('form-8bar-x3.musicxml')).title).toBeUndefined()
  })
})

describe('parseScore with a second voice', () => {
  it('returns notes in onset order, not file order', () => {
    // A `<backup>` rewinds the cursor so a second voice can follow the first
    // in the file. The model is monophonic, but every consumer assumes the
    // note list runs forward in time: `excerpt` lays bars out from the first
    // note's onset, and a later note that starts earlier landed in bar −1
    // (three peers crashed on it, 2026-09-03).
    const base = load('minimal-tenor.musicxml')
    const divisions = Number(/<divisions>(\d+)<\/divisions>/.exec(base)![1])
    const firstMeasureEnd = base.indexOf('</measure>')
    const second =
      `<backup><duration>${divisions * 4}</duration></backup>` +
      `<note><pitch><step>E</step><octave>3</octave></pitch><duration>${divisions}</duration><voice>2</voice><type>quarter</type></note>`
    const xml = base.slice(0, firstMeasureEnd) + second + base.slice(firstMeasureEnd)
    const s = parseScore(xml)
    const onsets = s.notes.map((n) => n.onset)
    expect(onsets).toEqual([...onsets].sort((a, b) => a - b))
    // The added note sounds at the top of the bar; it may share that onset
    // with voice 1's first note but must not trail the whole bar.
    expect(s.notes.findIndex((n) => n.midi === 52)).toBeLessThanOrEqual(1)
  })
})
