import { el } from './dom.ts'

const KEY = 'woodshed.anthropicKey'
const MOOD = 'woodshed.agentMood'
const MODEL = 'woodshed.agentModel'

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

/** The bring-your-own-key row: the key lives in this browser only. */
export function agentKeyRow(): HTMLElement {
  const row = el('label', 'agent-key')
  const input = el('input')
  input.type = 'password'
  input.placeholder = 'sk-ant-…'
  input.autocomplete = 'off'
  input.setAttribute('aria-label', 'Anthropic API key')
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
  row.append(
    el('span', undefined, 'Anthropic API key (optional)'),
    input,
    model,
    mood,
    el('small', undefined, 'Stays in this browser’s storage and is sent only to api.anthropic.com; with it, an agent narrates and orders the menu.'),
  )
  return row
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
