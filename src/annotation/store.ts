import type { Position } from '../core/position.ts'
import { formatPosition, parsePosition } from '../core/position.ts'

export type BoundaryLevel = 'idea' | 'phrase'

export interface Span {
  from: Position
  to: Position
}

export interface AnnotationFile {
  file: string
  phrases: string[]
  ideas: string[]
  outside: { from: string; to: string }[]
  stars: { from: string; to: string }[]
  annotated: string
}

type SpanKind = 'outside' | 'stars'

const order = (p: Position) => p.bar * 1000 + p.beat

const withinSpan = (span: Span, p: Position): boolean => {
  const v = order(p)
  return order(span.from) <= v && v <= order(span.to)
}

const byPosition = (a: string, b: string): number => order(parsePosition(a)) - order(parsePosition(b))

export class AnnotationStore {
  readonly file: string
  readonly boundaries: Map<string, BoundaryLevel> = new Map()
  private readonly spanLists: Record<SpanKind, Span[]> = { outside: [], stars: [] }

  constructor(file: string) {
    this.file = file
  }

  cycleBoundary(p: Position): BoundaryLevel | null {
    const key = formatPosition(p)
    const current = this.boundaries.get(key) ?? null
    const next: BoundaryLevel | null = current === null ? 'idea' : current === 'idea' ? 'phrase' : null
    if (next === null) this.boundaries.delete(key)
    else this.boundaries.set(key, next)
    return next
  }

  boundaryAt(p: Position): BoundaryLevel | null {
    return this.boundaries.get(formatPosition(p)) ?? null
  }

  addSpan(kind: SpanKind, from: Position, to: Position): void {
    const [earlier, later] = order(from) <= order(to) ? [from, to] : [to, from]
    this.spanLists[kind].push({ from: earlier, to: later })
  }

  removeSpanAt(kind: SpanKind, p: Position): boolean {
    const list = this.spanLists[kind]
    const idx = list.findIndex(span => withinSpan(span, p))
    if (idx === -1) return false
    list.splice(idx, 1)
    return true
  }

  spans(kind: SpanKind): Span[] {
    return [...this.spanLists[kind]]
  }

  counts(): { phrases: number; ideas: number; outside: number; stars: number } {
    let phrases = 0
    let ideas = 0
    for (const level of this.boundaries.values()) {
      if (level === 'phrase') phrases++
      else ideas++
    }
    return { phrases, ideas, outside: this.spanLists.outside.length, stars: this.spanLists.stars.length }
  }

  toJSON(date: string): AnnotationFile {
    const phrases: string[] = []
    const ideas: string[] = []
    for (const [key, level] of this.boundaries) {
      if (level === 'phrase') phrases.push(key)
      else ideas.push(key)
    }
    phrases.sort(byPosition)
    ideas.sort(byPosition)
    const spanJSON = (kind: SpanKind) =>
      [...this.spanLists[kind]]
        .sort((a, b) => order(a.from) - order(b.from))
        .map(span => ({ from: formatPosition(span.from), to: formatPosition(span.to) }))
    return {
      file: this.file,
      phrases,
      ideas,
      outside: spanJSON('outside'),
      stars: spanJSON('stars'),
      annotated: date,
    }
  }

  static fromJSON(json: AnnotationFile): AnnotationStore {
    const store = new AnnotationStore(json.file)
    for (const key of json.ideas) store.boundaries.set(formatPosition(parsePosition(key)), 'idea')
    for (const key of json.phrases) store.boundaries.set(formatPosition(parsePosition(key)), 'phrase')
    for (const { from, to } of json.outside) store.addSpan('outside', parsePosition(from), parsePosition(to))
    for (const { from, to } of json.stars) store.addSpan('stars', parsePosition(from), parsePosition(to))
    return store
  }
}
