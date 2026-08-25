import { describe, it, expect } from 'vitest'
import { boundaryCandidates, segment } from './segment.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'
import type { Note } from '../core/types.ts'

/** Build notes back to back from a list of [midi, durationInQuarters, gapAfter]. */
function notesFrom(spec: [number, number, number][]): Note[] {
  const out: Note[] = []
  let onset = 0
  for (const [midi, dur, gap] of spec) {
    const duration = dur * Q
    out.push({
      midi,
      onset,
      duration,
      bar: Math.floor(onset / (4 * Q)) + 1,
      beat: (onset % (4 * Q)) / Q,
    })
    onset += duration + gap * Q
  }
  return out
}

describe('segment', () => {
  it('returns no phrases for no notes', () => {
    expect(segment([])).toEqual([])
  })

  it('keeps notes with no gaps in one phrase', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0], [64, 1, 0], [65, 1, 0]])
    const phrases = segment(notes)
    expect(phrases).toHaveLength(1)
    expect(phrases[0].notes).toHaveLength(4)
    expect(phrases[0].startBar).toBe(1)
  })

  it('splits on a rest of a quarter or longer', () => {
    const q = [60, 0.5, 0] as [number, number, number]
    const notes = notesFrom([q, q, q, [62, 0.5, 1], [67, 0.5, 0], [65, 0.5, 0], [64, 0.5, 0], [62, 0.5, 0]])
    const phrases = segment(notes)
    expect(phrases.map((p) => p.notes.length)).toEqual([4, 4])
    expect(phrases[0].confidence).toBe(1)
    expect(phrases[1].confidence).toBeGreaterThanOrEqual(0.6)
  })

  it('treats an eighth rest among eighths as a breath, not a phrase end', () => {
    // Blake, bar 66: G Ab E [eighth rest] G G F G Ab A. One line.
    const e = (m: number, gap = 0): [number, number, number] => [m, 0.5, gap]
    const notes = notesFrom([e(67), e(68), e(64, 0.5), e(67), e(67), e(65), e(67), e(68), e(69)])
    expect(segment(notes)).toHaveLength(1)
  })

  it('reads an eighth plus an eighth rest as a staccato quarter, even before a leap', () => {
    // Mintzer rhythm changes bars 30-31: C [eighth rest] leap up — three
    // phrases split there that the owner hears as one. Eighth rest + leap of
    // an octave scored 0.52 before the articulation rule.
    const e = (m: number, gap = 0): [number, number, number] => [m, 0.5, gap]
    const notes = notesFrom([e(60), e(62), e(64, 0.5), e(76), e(74), e(72), e(71), e(69)])
    expect(segment(notes)).toHaveLength(1)
  })

  it('still splits when the rest outlasts the note before it', () => {
    // A sixteenth then a dotted-eighth rest is a real gap, not articulation.
    const e = (m: number, gap = 0): [number, number, number] => [m, 0.5, gap]
    const notes = notesFrom([e(60), e(62), [64, 0.25, 0.75], e(76), e(74), e(72), e(71), e(69)])
    expect(segment(notes).length).toBeGreaterThan(1)
  })

  it('does not split on a gap shorter than a sixteenth', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0.2], [64, 1, 0], [65, 1, 0]])
    expect(segment(notes)).toHaveLength(1)
  })

  it('does not split on a note twice the local norm, which the corpus probe showed is wrong', () => {
    // A quarter among eighths is not an arrival, and neither is a half note
    // on its own (Weimar: a held note alone has low precision as an idea cue).
    // The half note ends on beat 3 here, so this is not the pickup gesture.
    const e = (m: number): [number, number, number] => [m, 0.5, 0]
    expect(segment(notesFrom([e(60), e(62), [64, 1, 0], e(65), e(67), e(69)]))).toHaveLength(1)
    const half = segment(notesFrom([e(60), e(62), [67, 2, 0], e(65), e(67), e(69), e(70), e(72)]))
    expect(half).toHaveLength(1)
    expect(half[0].ideas).toHaveLength(1)
  })

  it('makes a held note an idea boundary inside the phrase, not a phrase end', () => {
    // A half note among eighths, then more line with no rest. The owner
    // hears bar 120's held G and the tag after it as one phrase; the held
    // note ends an idea.
    const e = (m: number): [number, number, number] => [m, 0.5, 0]
    // Three beats among eighths (6x the median): the Weimar annotations say
    // a two-beat hold on its own is not enough.
    const notes = notesFrom([e(60), e(62), e(64), [67, 3, 0], e(65), e(67), e(69), e(70)])
    const phrases = segment(notes)
    expect(phrases).toHaveLength(1)
    expect(phrases[0].ideas.map((i) => i.notes.length)).toEqual([4, 4])
    expect(phrases[0].ideas[1].confidence).toBeLessThan(1)
  })

  it('begins a phrase on the beat when its first note is inside a tuplet', () => {
    // Blake bar 76: a triplet-eighth rest then two triplet eighths. The rest
    // belongs to the phrase; it starts on beat 4, not a third of the way in.
    const e = (m: number, gap = 0): [number, number, number] => [m, 0.5, gap]
    const t = (m: number): [number, number, number] => [m, 1 / 3, 0]
    const notes = notesFrom([e(60), e(62), e(64), e(67, 2 + 1 / 3), t(65), t(63), e(62), e(63), e(67)])
    const [, second] = segment(notes)
    expect(second.notes[0].beat).toBeCloseTo(1 / 3, 3)
    expect(second.onset / Q).toBe(4)
  })

  it('does not split an eighth-grid group with a beat onset', () => {
    const e = (m: number, gap = 0): [number, number, number] => [m, 0.5, gap]
    const notes = notesFrom([e(60), e(62), e(64, 1.5), e(65), e(67), e(69)])
    const [, second] = segment(notes)
    expect(second.onset).toBe(second.notes[0].onset)
  })

  it('never leaves a phrase of fewer than three notes', () => {
    // Two notes between quarter rests get absorbed into a neighbour.
    const e = (m: number, gap = 0): [number, number, number] => [m, 0.5, gap]
    const notes = notesFrom([e(60), e(62), e(64), e(65, 1), e(67), e(69, 1), e(60), e(62), e(64), e(65)])
    for (const p of segment(notes)) expect(p.notes.length).toBeGreaterThanOrEqual(3)
  })

  it('forces a boundary before a listed bar and marks it lower confidence', () => {
    // Eight quarter notes, no rests: bars 1 and 2.
    const notes = notesFrom(Array.from({ length: 8 }, () => [60, 1, 0] as [number, number, number]))
    const phrases = segment(notes, [2])
    expect(phrases).toHaveLength(2)
    expect(phrases[0].notes).toHaveLength(4)
    expect(phrases[1].startBar).toBe(2)
    expect(phrases[1].confidence).toBe(0.6)
  })

  it('records the bar range each phrase covers', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0], [64, 1, 0], [65, 1, 0], [67, 1, 0]])
    const [phrase] = segment(notes)
    expect(phrase.startBar).toBe(1)
    expect(phrase.endBar).toBe(2)
  })
})

describe('local peak', () => {
  // Eighths with one note held 5.2x the median: the held-note cue alone is
  // 0.45 * 0.8 = 0.36, under the threshold, but it towers over silent
  // neighbours, so it opens an idea (WJD ideas F1 76.3 -> 77.6).
  const eighths = (n: number, from = 60): [number, number, number][] =>
    Array.from({ length: n }, (_, i) => [from + (i % 3), 0.5, 0])
  const notes = notesFrom([...eighths(4), [64, 2.6, 0], ...eighths(4)])

  it('opens an idea at a sub-threshold cue that stands out locally', () => {
    const phrases = segment(notes)
    expect(phrases).toHaveLength(1)
    expect(phrases[0].ideas.map((i) => i.notes.length)).toEqual([5, 4])
  })

  it('is off when peakMin is 0', () => {
    expect(segment(notes, [], { peakMin: 0 })[0].ideas).toHaveLength(1)
  })
})

describe('pickup gesture', () => {
  // Blake bars 69-70: a note held three medians, a lone eighth on the
  // and-of-4, the downbeat of the next bar. The owner hears a new idea at
  // the pickup; the note before it ends the old one.
  const eighths = (n: number): [number, number, number][] =>
    Array.from({ length: n }, (_, i) => [60 + (i % 3), 0.5, 0])
  // 4 eighths (2 beats) + a dotted quarter (beat 3 to 4.5) + pickup eighth + downbeat
  const notes = notesFrom([...eighths(4), [67, 1.5, 0], [70, 0.5, 0], [72, 0.5, 0], ...eighths(3)])

  it('opens an idea before the pickup', () => {
    const phrases = segment(notes)
    expect(phrases).toHaveLength(1)
    expect(phrases[0].ideas.map((i) => i.notes.length)).toEqual([5, 5])
    expect(phrases[0].ideas[1].notes[0].midi).toBe(70)
  })

  it('is off when pickupHeld is 0', () => {
    expect(segment(notes, [], { pickupHeld: 0 })[0].ideas).toHaveLength(1)
  })

  it('needs the held note: plain eighths into a downbeat are one idea', () => {
    expect(segment(notesFrom(eighths(12)))[0].ideas).toHaveLength(1)
  })
})

describe('tiny groups', () => {
  const e = (m: number): [number, number, number] => [m, 0.5, 0]

  it('keeps a two-note gesture that sits between full rests as its own phrase', () => {
    // St Thomas printed 68-69: held A, half rest, F#. B, rest. The owner hears
    // "F#. B" as a phrase of its own; GPR 1 must not dissolve it.
    const notes = notesFrom([e(60), e(62), e(64), [65, 1, 2], [66, 1.5, 0], [67, 0.5, 2.5], e(60), e(62), e(64)])
    expect(segment(notes).map((p) => p.notes.length)).toEqual([4, 2, 3])
  })

  it('still dissolves a tiny group that is not rest-bounded', () => {
    // two notes after a leap, no rest either side
    const notes = notesFrom([e(60), e(62), e(64), e(65), [80, 0.5, 0], [81, 0.5, 0], e(60), e(62), e(64), e(65)])
    expect(segment(notes)).toHaveLength(1)
  })
})

describe('chorus start after a pickup', () => {
  const e = (m: number): [number, number, number] => [m, 0.5, 0]

  it('does not cut a phrase that began as a pickup into the chorus', () => {
    // bar 1: 4 eighths, quarter rest, then a 2-note pickup on beats 3 and 3.5; bar 2 = chorus start
    const notes = notesFrom([e(60), e(62), e(64), [65, 0.5, 1], e(69), e(70), e(72), e(74), e(76), e(77), e(79), e(81), e(83)])
    const phrases = segment(notes, [2])
    expect(phrases).toHaveLength(2)
    expect(phrases[1].notes[0].midi).toBe(69)
    expect(phrases[1].notes).toHaveLength(9)
  })

  it('still cuts at the chorus start when the line runs straight through', () => {
    const notes = notesFrom(Array.from({ length: 16 }, (_, i) => e(60 + (i % 5))))
    expect(segment(notes, [2])).toHaveLength(2)
  })
})

describe('riff binding', () => {
  const e = (m: number, gap = 0): [number, number, number] => [m, 0.5, gap]
  // St Thomas printed 33-41: a riff stated, a rest, the riff again with a
  // note or two changed. The owner hears the chain as one phrase; each
  // statement is an idea.
  const riff = (last: number, gap: number) => [e(69), e(64), e(69), e(last, gap)]

  it('binds repeated statements of a figure across rests into one phrase', () => {
    const notes = notesFrom([...riff(62, 1.5), ...riff(63, 1.5), ...riff(62, 1.5), e(60), e(62), e(64)])
    const phrases = segment(notes)
    expect(phrases.map((p) => p.notes.length)).toEqual([12, 3])
    expect(phrases[0].ideas.map((i) => i.notes.length)).toEqual([4, 4, 4])
  })

  it('does not bind a different figure after the rest', () => {
    const notes = notesFrom([...riff(62, 1.5), e(60), e(62), e(64), e(65)])
    expect(segment(notes)).toHaveLength(2)
  })

  it('does not bind across a rest longer than a bar', () => {
    const notes = notesFrom([...riff(62, 5), ...riff(62, 0)])
    expect(segment(notes)).toHaveLength(2)
  })

  it('is off when riffMaxGap is 0', () => {
    const notes = notesFrom([...riff(62, 1.5), ...riff(62, 0)])
    expect(segment(notes, [], { riffMaxGap: 0 })).toHaveLength(2)
  })
})

describe('boundary candidates and overrides', () => {
  // A line with one clear mid-strength gap: enough rest to be a candidate,
  // near the threshold rather than far past it.
  const ambiguous = (): Note[] =>
    notesFrom([[60, 1, 0], [62, 1, 0], [64, 1, 0.75], [65, 1, 0], [67, 1, 0], [69, 1, 0], [72, 1, 0], [74, 1, 0]])

  it('surfaces near-threshold gaps as candidates, and only those', () => {
    const candidates = boundaryCandidates(ambiguous())
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(Math.abs(c.cue.total - 0.45)).toBeLessThanOrEqual(0.15)
      expect(c.cue.rest).toBeGreaterThan(0)
      expect(c.id).toBe(`b${c.index}`)
    }
  })

  it('an override true opens a phrase the threshold alone would not', () => {
    const notes = ambiguous()
    const below = boundaryCandidates(notes).filter((c) => c.cue.total < 0.45)
    if (below.length === 0) return
    const plain = segment(notes).length
    const forced = segment(notes, [], { overrides: new Map([[below[0].index, true]]) }).length
    expect(forced).toBeGreaterThan(plain)
  })

  it('an override false suppresses a phrase boundary the threshold would open', () => {
    const notes = notesFrom([[60, 1, 0], [62, 1, 0], [64, 1, 2], [65, 1, 0], [67, 1, 0], [69, 1, 0]])
    expect(segment(notes).length).toBeGreaterThan(1)
    const suppressed = segment(notes, [], { overrides: new Map([[2, false]]) })
    expect(suppressed.length).toBe(1)
  })

  it('no overrides changes nothing', () => {
    const notes = ambiguous()
    expect(segment(notes, [], { overrides: new Map() })).toEqual(segment(notes))
  })
})
