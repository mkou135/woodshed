import { describe, expect, it } from 'vitest'
import { instrumentFromTranspose } from '../../core/instrument.ts'
import { TICKS_PER_QUARTER as Q } from '../../core/types.ts'
import type { Chord, Note, Score } from '../../core/types.ts'
import type { PracticeUnit } from '../unit.ts'
import type { Tune } from '../tune.ts'
import { resolutionChord, throughStep } from './through.ts'

const chord = (rootPc: number, quality: Chord['quality'], onset: number, bar: number): Chord => ({
  rootPc, quality, onset, bar, tensions: [],
})

const harmony = [
  chord(2, 'minor-seventh', 0, 1),
  chord(7, 'dominant', 4 * Q, 2),
]

const notes: Note[] = [62, 65, 69, 72, 71].map((midi, i) => {
  const onset = Q / 2 + i * Q
  return { midi, onset, duration: Q / 2, bar: Math.floor(onset / (4 * Q)) + 1, beat: (onset % (4 * Q)) / Q }
})

const unit: Omit<PracticeUnit, 'steps'> = {
  id: 'u1', phrase: 0, idea: 0, notes, startIndex: 0, endIndex: notes.length - 1,
  harmony, degrees: ['1', '3', '5', '7', '3'],
  findings: [{
    id: 'f1', kind: 'cell', name: 'minor seventh arpeggio',
    spans: [{ startIndex: 0, endIndex: 3, bar: 1, beat: 0.5 }],
    degrees: ['1', '3', '5', '7'], intervals: [3, 4, 3], quality: 'minor-seventh',
    detectedBy: ['shape'], weights: { shape: 1 }, confidence: 1,
  }],
  arrival: { degree: '3', chordTone: true }, stock: 0, stockParts: { run: 0, corpus: 0, language: 0 }, rank: 1, header: '',
  summary: { bars: 'Bars 1–2', chords: ['Dm7', 'G7'], landing: '3', alsoAt: [], stock: false },
}

const tune: Tune = {
  title: 'Slot Tune', timeSig: [4, 4],
  bars: [
    { chords: [chord(4, 'minor-seventh', 0, 1)] },
    { chords: [chord(9, 'dominant', 0, 2)] },
    { chords: [chord(9, 'minor-seventh', 0, 3)] },
    { chords: [chord(2, 'dominant', 0, 4)] },
    // Same chord classes but the wrong root motion: this must not take the line.
    { chords: [chord(0, 'minor-seventh', 0, 5)] },
    { chords: [chord(6, 'dominant', 0, 6)] },
  ],
}

const score: Score = {
  notes, chordTracks: [{ chords: harmony, provenance: 'file', confidence: 1 }],
  instrument: instrumentFromTranspose(0, 0), timeSig: [4, 4], marks: [], barCount: 2,
}

const played = (bars: ReturnType<typeof throughStep>[number]['exercises'][number]['bars']): number[] =>
  bars.flatMap((bar) => bar.events ?? []).flatMap((event) => event.midi === null ? [] : [event.midi])

describe('throughStep', () => {
  it('carries the whole line through every matching progression slot', () => {
    const [step] = throughStep(unit, tune, score, tune.title)
    const line = step.exercises.find((exercise) => exercise.transformation === 'through-tune')

    expect(line?.title).toBe('The line through Slot Tune')
    expect(line?.bars).toHaveLength(4)
    expect(played(line!.bars)).toEqual([
      64, 67, 71, 74, 73,
      57, 60, 64, 67, 66,
    ])
    expect(line?.bars.flatMap((bar) => bar.events ?? []).filter((event) => event.midi !== null).map((event) => event.duration))
      .toEqual(new Array(10).fill(Q / 2))
    expect(line?.rationale).toContain('bars 1–2')
    expect(line?.rationale).toContain('bars 3–4')
    expect(line?.rationale).not.toContain('bars 5–6')
  })

  it('includes the chord the line resolves into when matching its slot', () => {
    const shortNotes = notes.slice(0, 4).map((note, i) => ({ ...note, onset: Q / 2 + i * (Q / 2), bar: 1, beat: 0.5 + i / 2 }))
    const resolutionUnit = { ...unit, notes: shortNotes, endIndex: 3, harmony: [harmony[0]] }
    const resolutionScore = {
      ...score,
      notes: shortNotes,
      chordTracks: [{ chords: harmony, provenance: 'file' as const, confidence: 1 }],
    }

    const [step] = throughStep(resolutionUnit, tune, resolutionScore, tune.title)
    const line = step.exercises.find((exercise) => exercise.transformation === 'through-tune')

    expect(line?.bars).toHaveLength(4)
    expect(line?.bars[1].chords?.[0]).toMatchObject({ rootPc: 9, quality: 'dominant', onset: 0 })
    expect(line?.bars[3].chords?.[0]).toMatchObject({ rootPc: 2, quality: 'dominant', onset: 0 })
    expect(line?.rationale).toContain('bars 1–2')
    expect(line?.rationale).toContain('bars 3–4')
    expect(line?.rationale).not.toContain('bar 5')
  })

  it('does not invent a progression from a resolution when the line has no source harmony', () => {
    const shortNotes = notes.slice(0, 4).map((note, i) => ({ ...note, onset: Q / 2 + i * (Q / 2), bar: 1, beat: 0.5 + i / 2 }))
    const unharmonised = { ...unit, notes: shortNotes, endIndex: 3, harmony: [] }
    const source = {
      ...score,
      notes: shortNotes,
      chordTracks: [{ chords: harmony, provenance: 'file' as const, confidence: 1 }],
    }

    const [step] = throughStep(unharmonised, tune, source, tune.title)

    expect(step.exercises.some((exercise) => exercise.transformation === 'through-tune')).toBe(false)
  })

  it('does not call a chord change during the final held note a resolution', () => {
    const held = [{ ...notes[0], onset: 2 * Q, duration: 3 * Q, beat: 2 }]
    const heldUnit = { ...unit, notes: held, endIndex: 0, harmony: [harmony[0]] }
    const heldScore = {
      ...score,
      notes: held,
      chordTracks: [{ chords: harmony, provenance: 'file' as const, confidence: 1 }],
    }

    expect(resolutionChord(heldUnit, heldScore)).toBeNull()
  })
})

describe('cell drill provenance', () => {
  it('says which notes of the line the cell is, and why isolating it matters', () => {
    const [step] = throughStep(unit, tune, score, tune.title)
    const drill = step.exercises.find((e) => e.id.endsWith('-cell'))!
    expect(drill.rationale).toContain('notes 1–4 of the line (bar 1)')
    expect(step.prompt).toContain('transferable')
  })
})
