import { el } from './dom.ts'

const KEY = 'woodshed.anthropicKey'

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
  row.append(
    el('span', undefined, 'Anthropic API key (optional)'),
    input,
    el('small', undefined, 'Stays in this browser’s storage and is sent only to api.anthropic.com; with it, an agent narrates and orders the menu.'),
  )
  return row
}

export function agentKey(): string | null {
  try {
    const key = clean(localStorage.getItem(KEY) ?? '')
    return key || null
  } catch {
    return null
  }
}
