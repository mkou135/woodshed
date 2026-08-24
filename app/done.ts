import type { Step } from '../src/index.ts'

/**
 * Which steps of which ideas the player has marked done, per solo, in
 * localStorage. Ticks survive a reload; Reset clears the solo's ticks.
 * Storage may be unavailable (private mode) — every access is guarded.
 */
export interface DoneStore {
  has(unitId: string, step: Step['kind']): boolean
  mark(unitId: string, step: Step['kind']): void
  reset(): void
  /** Called after every change. */
  onChange(cb: () => void): void
}

export function doneStore(soloKey: string): DoneStore {
  const key = `woodshed.done.${soloKey}`
  let set = new Set<string>()
  try {
    const raw = localStorage.getItem(key)
    if (raw) set = new Set(JSON.parse(raw) as string[])
  } catch { /* no storage or a stale value */ }
  const listeners: (() => void)[] = []
  const save = (): void => {
    try { localStorage.setItem(key, JSON.stringify([...set])) } catch { /* private mode */ }
    for (const cb of listeners) cb()
  }
  return {
    has: (unitId, step) => set.has(`${unitId}:${step}`),
    mark: (unitId, step) => { set.add(`${unitId}:${step}`); save() },
    reset: () => { set = new Set(); save() },
    onChange: (cb) => { listeners.push(cb) },
  }
}
