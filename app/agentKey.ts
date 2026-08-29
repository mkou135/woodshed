import { el } from './dom.ts'

const KEY = 'woodshed.anthropicKey'
const MOOD = 'woodshed.agentMood'
const MODEL = 'woodshed.agentModel'
const ENABLED = 'woodshed.agentEnabled'

/** Model ids offered in the dropdown; the first is the default. */
const MODELS = [
  ['claude-opus-5', 'Opus 5'],
  ['claude-sonnet-5', 'Sonnet 5'],
  ['claude-haiku-4-5', 'Haiku 4.5'],
] as const

type ModelId = (typeof MODELS)[number][0]

/** Pastes arrive with newlines, spaces or the quotes from a shell export line. */
function clean(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, '').trim()
}

/**
 * The optional-assistant row: a switch, off by default, and behind it the
 * bring-your-own-key field. Off is the honest default — the analysis is the
 * engine's, and the assistant only judges close calls, orders and narrates.
 *
 * A `div`, not a `label`: a label binds to its first control, so wrapping
 * both the switch and the key field would make every word in the row toggle
 * the switch.
 */
export function agentKeyRow(): HTMLElement {
  const row = el('div', 'agent-key')
  const input = el('input')
  input.type = 'password'
  input.placeholder = 'sk-ant-…'
  input.autocomplete = 'off'
  try {
    input.value = localStorage.getItem(KEY) ?? ''
  } catch { /* storage unavailable: the field still works for this load */ }
  // 'input', not 'change': the key must be saved even if the next act is
  // dropping a file without ever blurring the field.
  input.addEventListener('input', () => {
    try {
      const key = clean(input.value)
      if (key) localStorage.setItem(KEY, key)
      else localStorage.removeItem(KEY)
    } catch { /* ignore */ }
  })
  const mood = el('label', 'agent-mood')
  const select = document.createElement('select')
  for (const [value, label] of [
    ['teacher', 'encouraging teacher'],
    ['jaded', 'washed-up rival (joke)'],
  ] as const) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    select.appendChild(option)
  }
  select.setAttribute('aria-label', 'Agent mood')
  try {
    select.value = localStorage.getItem(MOOD) === 'jaded' ? 'jaded' : 'teacher'
  } catch { /* default stands */ }
  select.addEventListener('change', () => {
    try { localStorage.setItem(MOOD, select.value) } catch { /* ignore */ }
  })
  mood.append(el('span', undefined, 'mood'), select)
  const model = el('label', 'agent-model')
  const modelSelect = document.createElement('select')
  for (const [value, label] of MODELS) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    modelSelect.appendChild(option)
  }
  modelSelect.setAttribute('aria-label', 'Agent model')
  modelSelect.value = agentModel()
  modelSelect.addEventListener('change', () => {
    try { localStorage.setItem(MODEL, modelSelect.value) } catch { /* ignore */ }
  })
  model.append(el('span', undefined, 'model'), modelSelect)

  // The switch carries its own label, so clicking the sentence toggles it
  // and nothing else in the row does.
  const on = el('label', 'agent-on')
  const toggle = el('input')
  toggle.type = 'checkbox'
  toggle.checked = agentEnabled()
  on.append(toggle, el('span', undefined, 'Add an AI assistant'))

  const fields = el('div', 'agent-fields')
  const keyLabel = el('label', 'agent-field')
  keyLabel.append(el('span', undefined, 'Anthropic API key'), input)
  const needKey = el('small', 'agent-need', 'No key yet — until one is entered, the analysis runs without the assistant.')
  fields.append(
    keyLabel,
    model,
    mood,
    el('small', undefined, 'Stays in this browser’s storage and is sent only to api.anthropic.com.'),
    needKey,
  )

  const off = el(
    'small',
    'agent-note',
    'Off, and the analysis is still complete: every finding, count and exercise is worked out on this page. An assistant only judges the close calls, orders the menu and writes the commentary.',
  )

  /** Switching off hides the field rather than clearing it: a saved key
      survives, so switching back on restores everything as it was. */
  function sync(): void {
    const enabled = toggle.checked
    fields.hidden = !enabled
    off.hidden = enabled
    // Said before the run, not after: once the analysis is on screen it is
    // too late for "it ran without the assistant" to be worth knowing.
    needKey.hidden = !enabled || clean(input.value) !== ''
  }
  toggle.addEventListener('change', () => {
    try { localStorage.setItem(ENABLED, toggle.checked ? '1' : '0') } catch { /* ignore */ }
    sync()
  })
  input.addEventListener('input', sync)

  row.append(on, off, fields)
  sync()
  return row
}

/** Whether the player has asked for the assistant at all. Off by default. */
export function agentEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED) === '1'
  } catch {
    return false
  }
}

export function agentModel(): ModelId {
  try {
    const stored = localStorage.getItem(MODEL)
    return MODELS.some(([id]) => id === stored) ? (stored as ModelId) : MODELS[0][0]
  } catch {
    return MODELS[0][0]
  }
}

export function agentPersona(): 'teacher' | 'jaded' {
  try {
    return localStorage.getItem(MOOD) === 'jaded' ? 'jaded' : 'teacher'
  } catch {
    return 'teacher'
  }
}

export function agentKey(): string | null {
  try {
    const key = clean(localStorage.getItem(KEY) ?? '')
    return key || null
  } catch {
    return null
  }
}
