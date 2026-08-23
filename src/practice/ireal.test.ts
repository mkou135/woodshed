import { describe, it, expect } from 'vitest'
import { parseIReal, unscramble, UnsupportedChartError } from './ireal.ts'
import { TICKS_PER_QUARTER as Q } from '../core/types.ts'

/**
 * Build an irealb:// link from readable chart text. The 50-character block
 * swap is its own inverse, so scrambling is unscrambling without the token
 * substitutions — which these fixtures simply avoid.
 */
function link(title: string, key: string, chart: string, style = 'Medium Swing'): string {
  const scrambled = scramble(chart)
  const body = `${title}=Fixture==${style}=${key}==1r34LbKcu7${scrambled}=Swing=120=1`
  return 'irealb://' + encodeURIComponent(body)
}
function scramble(s: string): string {
  let rest = s
  let out = ''
  while (rest.length > 50) {
    const block = rest.slice(0, 50)
    rest = rest.slice(50)
    out += rest.length < 2 ? block : swap(block)
  }
  return out + rest
}
function swap(s: string): string {
  const o = s.split('')
  for (let i = 0; i < 5; i++) { o[i] = s[49 - i]; o[49 - i] = s[i] }
  for (let i = 10; i < 24; i++) { o[i] = s[49 - i]; o[49 - i] = s[i] }
  return o.join('')
}

const N = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const show = (song: ReturnType<typeof parseIReal>[0]): string[] =>
  song.tune.bars.map((b) => b.chords.map((c) => `${N[c.rootPc]}${c.quality}@${c.onset / Q}`).join(' '))

describe('unscramble', () => {
  it('is the inverse of the fixture scrambler on a long chart', () => {
    const chart = '[*AT44F7   |Bb7   |F7   |C-7 F7 |Bb7   |Bo7   |F7   |A-7 D7 |G-7   |C7   |F7 D7 |G-7 C7 Z'
    expect(unscramble(scramble(chart))).toBe(chart)
  })
})

describe('parseIReal', () => {
  it('reads a twelve-bar blues with two chords in a bar on beats 1 and 3', () => {
    const [song] = parseIReal(link('F Blues', 'F',
      '[*AT44F7   |Bb7   |F7   |C-7 F7 |Bb7   |Bo7   |F7   |A-7 D7 |G-7   |C7   |F7 D7 |G-7 C7 Z'))
    expect(song.title).toBe('F Blues')
    expect(song.tune.timeSig).toEqual([4, 4])
    expect(song.tune.bars).toHaveLength(12)
    expect(show(song)[3]).toBe('Cminor-seventh@0 Fdominant@2')
    expect(show(song)[5]).toBe('Bdiminished-seventh@0')
  })

  it('unrolls a repeat with two endings', () => {
    const [song] = parseIReal(link('Endings', 'C',
      '{T44C^7   |A-7   |N1D-7   |G7   }|N2D-7 G7 |C^7   Z'))
    // Pass 1: C A- D- G7; pass 2: C A- (D-7 G7) C^7.
    expect(show(song)).toEqual([
      'Cmajor-seventh@0', 'Aminor-seventh@0', 'Dminor-seventh@0', 'Gdominant@0',
      'Cmajor-seventh@0', 'Aminor-seventh@0', 'Dminor-seventh@0 Gdominant@2', 'Cmajor-seventh@0',
    ])
  })

  it('repeats the previous bar for x and the previous two for r', () => {
    const [song] = parseIReal(link('Repeats', 'C', '[T44C^7   |x   |D-7   |G7   |r   |    Z'))
    expect(show(song)).toEqual([
      'Cmajor-seventh@0', 'Cmajor-seventh@0', 'Dminor-seventh@0', 'Gdominant@0',
      'Dminor-seventh@0', 'Gdominant@0',
    ])
  })

  it('reads a 3/4 tune', () => {
    const [song] = parseIReal(link('Waltz', 'Eb', '[T34Eb^7  |F-7  |Bb7  |Eb6  Z'))
    expect(song.tune.timeSig).toEqual([3, 4])
    expect(song.tune.bars).toHaveLength(4)
  })

  it('maps the common suffixes explicitly', () => {
    const [song] = parseIReal(link('Suffixes', 'C',
      '[T44C-^7   |Dh7   |G7alt   |Eb+   |F7sus   |A-6   |Bb69   |C   Z'))
    expect(song.tune.bars.map((b) => b.chords[0].quality)).toEqual([
      'minor-major', 'half-diminished', 'dominant', 'augmented', 'suspended-fourth',
      'minor', 'major', 'major',
    ])
    expect(song.tune.bars[2].chords[0].tensions).toEqual(['alt'])
  })

  it('ignores bass-only cells and annotations', () => {
    const [song] = parseIReal(link('Bass', 'E', '[*AT44E W/G,W/A,|E,n  |<D.C.>A7   Z'))
    expect(show(song)).toEqual(['Emajor@0', 'Emajor@0', 'Adominant@0'])
  })

  it('names an unknown chord quality instead of guessing', () => {
    expect(() => parseIReal(link('Bad', 'C', '[T44Cxyz   Z'))).toThrow(UnsupportedChartError)
    expect(() => parseIReal(link('Bad', 'C', '[T44Cxyz   Z'))).toThrow(/xyz/)
  })

  it('rejects anything that is not an irealb link', () => {
    expect(() => parseIReal('irealbook://x')).toThrow(UnsupportedChartError)
  })

  it('reads a playlist of several songs', () => {
    const two = link('One', 'C', '[T44C   Z') + '===' + link('Two', 'F', '[T44F   Z').slice('irealb://'.length)
    expect(parseIReal(two).map((s) => s.title)).toEqual(['One', 'Two'])
  })
})
