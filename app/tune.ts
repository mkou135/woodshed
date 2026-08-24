import bookLink from './data/jazz1460.irealb.txt?raw'
import {
  parseIReal, parseIRealBook, practiseOver, transposeTune, tuneFromScore,
  guessTitle, searchTunes, inferTransposition,
} from '../src/index.ts'
import type { IRealSong, PipelineResult, PracticeUnit } from '../src/index.ts'
import { button, el } from './dom.ts'

/**
 * Which tune the ideas are taken through. The chip in the header is always
 * visible; it is amber, and nothing is auto-taken, whenever the chord vote
 * is not confident — a wrong file-name guess ("strode rode" for St Thomas)
 * must never pass silently.
 */
export interface TuneChoice {
  units: PracticeUnit[]
  /** null: the solo's own changes. */
  title: string | null
}

const TUNE_KEY = 'woodshed.tune'

let bookCache: IRealSong[] | null = null
/** The 1,460-standard forum book, parsed on first use (about a second). */
function book(): IRealSong[] {
  if (!bookCache) bookCache = parseIRealBook(bookLink).songs
  return bookCache
}

const pct = (agreement: number): string => `${Math.round(agreement * 100)} %`

export function tuneChip(
  result: PipelineResult,
  filename: string,
  onChange: (choice: TuneChoice) => void,
): { chip: HTMLButtonElement; picker: HTMLElement } {
  const chip = button('tune', '')
  chip.setAttribute('aria-haspopup', 'dialog')
  const lbl = el('span', 'lbl', 'Through')
  const val = el('span', 'val')
  const pctSpan = el('span', 'pct')
  const caret = el('span', undefined, '▾')
  chip.append(lbl, val, pctSpan, caret)

  const picker = el('div', 'pop')
  picker.hidden = true
  picker.setAttribute('role', 'dialog')
  picker.appendChild(el('h3', 'label', 'Take it through which tune?'))
  const search = el('input')
  search.type = 'search'
  search.placeholder = 'search the book'
  search.setAttribute('aria-label', 'Search the book of tunes')
  const results = el('ul')
  const paste = el('p', 'paste', 'Not in the book? Paste an irealb:// link.')
  const pasteInput = el('input')
  pasteInput.type = 'text'
  pasteInput.placeholder = 'irealb://…'
  paste.appendChild(pasteInput)
  const msg = el('p', 'msg')
  picker.append(search, results, paste, msg)

  let pasted: IRealSong[] = []
  const chartShift = -result.score.instrument.transpose.chromatic
  const starts = result.report.form?.chorusStarts ?? []
  const soloTune = tuneFromScore(result.score, starts)

  const setChip = (state: 'sure' | 'unsure' | 'own', text: string, detail = ''): void => {
    chip.classList.toggle('unsure', state === 'unsure')
    val.textContent = text
    pctSpan.textContent = detail
  }

  const close = (): void => { picker.hidden = true }

  const choose = (song: IRealSong): void => {
    // Charts are concert pitch; the player reads written pitch. The solo's
    // own changes say which instrument this is better than the file does —
    // a bar-by-bar vote, so substitutions cost votes, not the match.
    const vote = inferTransposition(soloTune, song.tune)
    const shift = vote?.confident ? vote.chromatic : chartShift
    if (vote?.confident) setChip('sure', `${song.title} (${song.key})`, `${pct(vote.agreement)} ✓`)
    else setChip('unsure', `${song.title} (${song.key})`, vote ? `${pct(vote.agreement)} — right tune?` : 'no chords to compare')
    search.value = song.title
    close()
    onChange({ units: practiseOver(result, transposeTune(song.tune, shift), song.title), title: song.title })
  }

  const chooseOwn = (): void => {
    setChip('own', 'this solo’s changes')
    close()
    onChange({ units: result.units, title: null })
  }

  const fill = (): void => {
    const hits = searchTunes(search.value, [...pasted, ...book()], 6)
    results.replaceChildren(
      ...hits.map((h) => {
        const li = el('li')
        const vote = inferTransposition(soloTune, h.song.tune)
        const b = button('', '', () => choose(h.song))
        b.append(el('span', 't', h.song.title), el('span', 'k', `${h.song.key} · ${h.song.tune.bars.length} bars`))
        if (vote) {
          const good = vote.agreement >= 0.5
          b.appendChild(el('span', good ? 'v' : 'v bad',
            good ? `${pct(vote.agreement)} of bars agree ✓` : `${pct(vote.agreement)} — probably not`))
        }
        li.appendChild(b)
        return li
      }),
    )
    const own = el('li', 'own')
    const ob = button('', '', chooseOwn)
    ob.append(el('span', 't', 'This solo’s own changes'), el('span', 'k', 'as written in the file'))
    own.appendChild(ob)
    results.appendChild(own)
  }

  search.addEventListener('input', fill)
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') results.querySelector('button')?.click()
    if (event.key === 'Escape') close()
  })
  pasteInput.addEventListener('change', () => {
    const link = pasteInput.value.trim()
    if (!link) return
    try {
      pasted = parseIReal(link)
      try { localStorage.setItem(TUNE_KEY, link) } catch { /* private mode */ }
      msg.textContent = ''
      choose(pasted[0])
    } catch (error) {
      msg.textContent = (error as Error).message
    }
  })
  try {
    const saved = localStorage.getItem(TUNE_KEY)
    if (saved) { pasteInput.value = saved; pasted = parseIReal(saved) }
  } catch { /* no storage, or a stale link */ }

  chip.addEventListener('click', () => {
    picker.hidden = !picker.hidden
    if (!picker.hidden) { fill(); search.focus(); search.select() }
  })
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close() })

  // Guess from the title (or file name); take it only if the changes agree.
  const query = guessTitle(result.score, filename)
  search.value = query
  const guess = searchTunes(query, [...pasted, ...book()], 1)[0]
  const vote = guess ? inferTransposition(soloTune, guess.song.tune) : null
  if (guess && vote?.confident) choose(guess.song)
  else {
    setChip('unsure', 'which tune?')
    onChange({ units: result.units, title: null })
  }

  return { chip, picker }
}
