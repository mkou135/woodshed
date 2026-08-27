import { barLabel } from '../src/core/bars.ts'
import { exerciseToMusicXml, checkWriting } from '../src/index.ts'
import type { Exercise, PipelineResult, PracticeUnit, Step } from '../src/index.ts'
import { button, download, el } from './dom.ts'
import { renderNotation } from './score.ts'
import type { ScoreView } from './score.ts'
import type { DoneStore } from './done.ts'

/**
 * The practice desk under the score: the idea in hand (from
 * `unit.summary`, never note names — the score shows those), the four steps
 * as a path, one step's exercises at a time, and a done state per step.
 */
export interface Desk {
  setUnits(units: PracticeUnit[]): void
  select(id: string): Promise<void>
  /** Fires on every selection; the index is the unit's rank position. */
  onSelect(cb: (unit: PracticeUnit, index: number) => void): void
  /** Fires when a step is marked done. */
  onDone(cb: () => void): void
}

const TITLES: Record<Step['kind'], string> = {
  loop: 'Loop it as played',
  through: 'Through the tune',
  vary: 'Vary it',
  write: 'Write your own',
}

function intent(step: Step, unit: PracticeUnit, result: PipelineResult): string {
  switch (step.kind) {
    case 'loop': return `Sing it, then play along with the record from bar ${barLabel(result.score, unit.notes[0].bar)}.`
    case 'through': return `The whole line over every matching progression in ${step.tune}; cell and cycle drills follow.`
    case 'vary': return 'New ways into the same arrival; the landing never moves.'
    case 'write': return 'Three lines into the targets; drop the file back to check.'
  }
}

function fileNameOf(exercise: Exercise): string {
  const slug = exercise.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  // Several findings can share a name, so the id keeps the files distinct.
  return `${exercise.id}-${slug || exercise.id}.musicxml`
}

function exerciseCard(exercise: Exercise, result: PipelineResult, withRationale: boolean): {
  card: HTMLElement
  notation: HTMLElement
  xml: string
} {
  const { instrument, keyFifths } = result.score
  // The page shows written pitch; the file keeps <transpose> for MuseScore.
  const xml = exerciseToMusicXml(exercise, instrument, { keyFifths, forDisplay: true })
  const fileXml = exerciseToMusicXml(exercise, instrument, { keyFifths })
  const card = el('article', 'ex')
  const head = el('div', 'exh')
  head.appendChild(el('h3', undefined, exercise.title))
  if (withRationale) head.appendChild(el('span', 'why', exercise.rationale))
  head.appendChild(button('linkish', 'Download MusicXML', () => download(fileNameOf(exercise), fileXml)))
  const notation = el('div', 'notation')
  card.append(head, notation)
  return { card, notation, xml }
}

function writeBlock(step: Extract<Step, { kind: 'write' }>, unit: PracticeUnit): HTMLElement {
  const block = el('div', 'write')
  block.appendChild(button('btn', 'Download the template', () =>
    download(`${unit.id}-write-your-own.musicxml`, step.template)))
  const check = el('label', 'check')
  check.append(el('span', undefined, 'Then check your writing — drop the file here:'))
  const input = el('input')
  input.type = 'file'
  input.accept = '.mxl,.musicxml,.xml'
  const verdict = el('p', 'verdict')
  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const res = checkWriting(new Uint8Array(await file.arrayBuffer()), unit)
      verdict.replaceChildren()
      for (const name of res.found) {
        verdict.appendChild(el('span', 'ok', `✓ ${name} — bars ${res.bars[name].join(', ')}`))
      }
      for (const name of res.missing) verdict.appendChild(el('span', 'miss', `✗ ${name} not found`))
    } catch (error) {
      verdict.textContent = `Could not read that file: ${(error as Error).message}`
    }
  })
  check.appendChild(input)
  block.append(check, verdict)
  return block
}

function ideaHead(unit: PracticeUnit, index: number, total: number): HTMLElement[] {
  const s = unit.summary
  const no = el('div', 'idea-no', String(index + 1))
  no.appendChild(el('small', undefined, `of ${total}`))
  const line = el('div', 'idea-line')
  const where = el('div', 'where')
  const bars = unit.part ? `${s.bars} · part ${unit.part.n} of ${unit.part.of}` : s.bars
  where.append(el('span', 'mono', bars), document.createTextNode(s.chords.join(' → ')))
  const what = el('div', 'what')
  s.cells.forEach((name, i) => {
    if (i > 0) what.appendChild(document.createTextNode(' '))
    what.appendChild(el('span', 'cell', name))
  })
  if (s.cells.length === 0) what.appendChild(el('span', 'faint',
    s.stockKind === 'common-language' ? 'Mostly common jazz language — the language, not the player'
      : s.stock ? 'Mostly a scale run — the language, not the player'
        : 'No named vocabulary — still the player’s idea'))
  if (s.landing) what.appendChild(document.createTextNode(` · lands on the ${s.landing}`))
  if (s.alsoAt.length > 0) what.appendChild(el('span', 'faint', ` · same shape at bar${s.alsoAt.length > 1 ? 's' : ''} ${s.alsoAt.join(', ')}`))
  line.append(where, what)
  return [no, line]
}

export function practiceDesk(host: HTMLElement, result: PipelineResult, view: ScoreView, done: DoneStore): Desk {
  const head = el('div', 'desk-head')
  const steps = el('div', 'steps')
  host.append(head, steps)

  let units = result.units
  let selected: PracticeUnit | null = null
  const selectListeners: ((unit: PracticeUnit, index: number) => void)[] = []
  const doneListeners: (() => void)[] = []

  const nav = el('div', 'nav')
  const prev = button('btn quiet', '‹ Prev', () => step(-1))
  const next = button('btn quiet', 'Next ›', () => step(1))
  const reset = button('btn quiet', 'Reset ticks', () => { done.reset(); if (selected) void select(selected.id) })
  reset.title = 'Forget which steps are done for this solo'
  nav.append(prev, next, reset)

  const step = (by: number): void => {
    if (!selected) return
    const at = units.indexOf(selected)
    const to = units[at + by]
    if (to) void select(to.id)
  }

  const renderSteps = async (unit: PracticeUnit): Promise<void> => {
    steps.replaceChildren()
    const path = el('ol', 'path')
    const pane = el('div', 'pane')
    steps.append(path, pane)

    const items: { li: HTMLLIElement; show: () => Promise<void> }[] = []
    let current = 0

    const paint = (): void => {
      items.forEach(({ li }, i) => {
        li.classList.toggle('on', i === current)
        li.classList.toggle('done', done.has(unit.id, unit.steps[i].kind))
        li.setAttribute('aria-current', i === current ? 'step' : 'false')
      })
    }
    const show = async (i: number): Promise<void> => {
      current = Math.max(0, Math.min(items.length - 1, i))
      paint()
      await items[current].show()
    }

    unit.steps.forEach((s, i) => {
      const li = el('li')
      li.tabIndex = 0
      li.append(el('span', 'n', String(i + 1)), el('span', 't', TITLES[s.kind]), el('span', 's', intent(s, unit, result)))
      li.addEventListener('click', () => { void show(i) })
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void show(i) } })
      path.appendChild(li)

      // Notation renders the first time the step is shown.
      let pending: { notation: HTMLElement; xml: string }[] | null = null
      const body = el('div')
      const build = (): void => {
        body.appendChild(el('p', 'prompt', s.prompt))
        const exercises = s.kind === 'loop' ? [s.exercise] : s.kind === 'write' ? s.examples : s.exercises
        pending = []
        for (const ex of exercises) {
          // The loop step's one exercise says what the head already said.
          const { card, notation, xml } = exerciseCard(ex, result, s.kind !== 'loop')
          body.appendChild(card)
          pending.push({ notation, xml })
        }
        if (s.kind === 'write') body.appendChild(writeBlock(s, unit))
        const foot = el('div', 'foot')
        const last = i === unit.steps.length - 1
        const label = last ? 'Done — next idea →' : `Done — ${TITLES[unit.steps[i + 1].kind].toLowerCase()} →`
        foot.appendChild(button('btn solid', label, () => {
          done.mark(unit.id, s.kind)
          for (const cb of doneListeners) cb()
          if (last) step(1)
          else void show(i + 1)
        }))
        body.appendChild(foot)
      }
      const showThis = async (): Promise<void> => {
        if (!pending) build()
        pane.replaceChildren(body)
        for (const item of pending!.splice(0)) await renderNotation(item.notation, item.xml)
      }
      items.push({ li, show: showThis })
    })

    // Open at the first step not yet done.
    const first = unit.steps.findIndex((s) => !done.has(unit.id, s.kind))
    await show(first === -1 ? 0 : first)
  }

  const select = async (id: string): Promise<void> => {
    const unit = units.find((u) => u.id === id)
    if (!unit) return
    selected = unit
    const at = units.indexOf(unit)
    head.replaceChildren(...ideaHead(unit, at, units.length), nav)
    prev.disabled = at === 0
    next.disabled = at === units.length - 1
    view.highlight(unit)
    for (const cb of selectListeners) cb(unit, at)
    await renderSteps(unit)
  }

  return {
    setUnits(next) {
      units = next
      // The same idea survives a tune change: ids are ranks, so find it by notes.
      const same = selected ? units.find((u) => u.startIndex === selected!.startIndex && u.endIndex === selected!.endIndex) : null
      if (same) void select(same.id)
      else if (units[0]) void select(units[0].id)
    },
    select,
    onSelect(cb) { selectListeners.push(cb) },
    onDone(cb) { doneListeners.push(cb) },
  }
}
