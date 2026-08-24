import { describe, it, expect } from 'vitest'
import { guessTitle, searchTunes } from './tuneSearch.ts'
import type { IRealSong } from './ireal.ts'

const song = (title: string): IRealSong =>
  ({ title, composer: '', style: '', key: 'C', tune: { title, timeSig: [4, 4], bars: [] } })
const book = ['Sandu', 'I Remember Clifford', 'Autumn Leaves', 'All The Things You Are', 'All Of Me', 'Tenor Madness', 'Blues For Alice', "After You've Gone"].map(song)

describe('guessTitle', () => {
  it('strips the words that describe the transcription, not the tune', () => {
    expect(guessTitle({ title: 'Autumn Leaves Solo Transcription' })).toBe('autumn leaves')
    expect(guessTitle({ title: 'Patrick Bartley on After You\'ve Gone' })).toBe('patrick bartley after youve gone')
    expect(guessTitle({ title: '26-2 Tenor Solo' })).toBe('26 2')
  })
  it('falls back to the file name when the title is a placeholder', () => {
    expect(guessTitle({ title: 'Title' }, 'Hey Lock! - Seamus Blake Solo Transcription.mxl')).toBe('hey lock seamus blake')
    expect(guessTitle({}, 'tenor-madness.mxl')).toBe('madness')
  })
})

describe('searchTunes', () => {
  it('ranks exact, then prefix, then all words present', () => {
    expect(searchTunes('all of me', book)[0].song.title).toBe('All Of Me')
    expect(searchTunes('all', book).map((m) => m.song.title)).toEqual(['All Of Me', 'All The Things You Are'])
    expect(searchTunes('things are', book)[0].song.title).toBe('All The Things You Are')
  })
  it('matches letter by letter and survives extra words from a transcription title', () => {
    expect(searchTunes('aut', book)[0].song.title).toBe('Autumn Leaves')
    expect(searchTunes('patrick bartley after youve gone', book)[0].song.title).toBe("After You've Gone")
    expect(searchTunes('clifford brown sandu', book)[0].song.title).toBe('Sandu')
  })
  it('returns nothing for an empty query', () => {
    expect(searchTunes('', book)).toEqual([])
  })
})
