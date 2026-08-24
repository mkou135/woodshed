/**
 * Why are WJD idea (or phrase) boundaries missed? Feature rates at missed
 * boundaries vs ordinary gaps, and the precision of candidate rules over
 * the gaps segment() does not already mark.
 *
 *   npm run diag:wjd                 # idea level
 *   LEVEL=phrase npm run diag:wjd    # phrase level
 */
import { DatabaseSync } from 'node:sqlite'
import { notesFromWjd } from '../src/ingest/wjd.ts'
import type { WjdMelodyRow } from '../src/ingest/wjd.ts'
import { segment, boundaryCue } from '../src/analyse/segment.ts'
import { scoreFromWjd } from '../src/ingest/wjd.ts'
import type { WjdBeatRow, WjdSolo } from '../src/ingest/wjd.ts'
import { findRecurring } from '../src/analyse/detectors/recurring.ts'
import { contextualise } from '../src/analyse/context.ts'
import type { NoteContext } from '../src/analyse/context.ts'
import type { Note } from '../src/core/types.ts'
const db = new DatabaseSync(`${process.env.HOME}/dev/woodshed-data/wjazzd.db`)
const solos = db.prepare('select melid, title, performer, instrument from solo_info order by melid').all() as unknown as WjdSolo[]
type F = Record<string, number>
const acc: Record<string, { n: number; sum: F }> = {}
const rows2: { cls: string; f: F }[] = []
function add(cls: string, f: F) {
  rows2.push({ cls, f })
  const a = (acc[cls] ??= { n: 0, sum: {} }); a.n++
  for (const k in f) a.sum[k] = (a.sum[k] ?? 0) + f[k]
}
function median(xs: number[]) { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
let CTX: NoteContext[] = []
let BEATS = 4
let FAM_START = new Set<number>(), FAM_END = new Set<number>(), FAM_START4 = new Set<number>(), FAM_VAR = new Set<number>()
function feats(notes: Note[], i: number, med: number): F {
  const h = notes[i], n = notes[i + 1]
  const ch = CTX[i], cn = CTX[i + 1]
  const strong = h.beat % 2 === 0
  const c = boundaryCue(notes, i, med)
  const dirBefore = i > 0 ? Math.sign(h.midi - notes[i - 1].midi) : 0
  const dirAfter = Math.sign(n.midi - h.midi)
  const dirAfter2 = i + 2 < notes.length ? Math.sign(notes[i + 2].midi - n.midi) : 0
  const iv = (k: number) => notes[k + 1].midi - notes[k].midi
  let repeat = 0
  if (i + 3 < notes.length) {
    const pat = [iv(i + 1), iv(i + 2)]
    for (let k = Math.max(0, i - 12); k < i - 1; k++) if (iv(k) === pat[0] && iv(k + 1) === pat[1]) { repeat = 1; break }
  }
  const beatPos = n.beat % 1
  const dur = (k: number) => notes[k].duration
  return {
    shortRest: c.gap > 0 && c.rest === 0 ? 1 : 0,
    rest: c.rest > 0 ? 1 : 0,
    leap: Math.abs(n.midi - h.midi) >= 5 ? 1 : 0,
    held: h.duration >= 2 * med ? 1 : 0,
    nextLong: n.duration >= 2 * med ? 1 : 0,
    reversal: dirBefore !== 0 && dirAfter !== 0 && dirBefore !== dirAfter ? 1 : 0,
    peak: dirBefore > 0 && dirAfter < 0 ? 1 : 0,
    downbeat: n.beat === 0 ? 1 : 0,
    onBeat: beatPos === 0 ? 1 : 0,
    beat3: n.beat === 2 ? 1 : 0,
    offbeat8: beatPos === 0.5 ? 1 : 0,
    durChange: i > 0 && dur(i) !== dur(i + 1) ? 1 : 0,
    repeat,
    samePitch: n.midi === h.midi ? 1 : 0,
    rest8: c.gap >= 480 ? 1 : 0,
    held15: h.duration >= 1.5 * med ? 1 : 0,
    leap7: Math.abs(n.midi - h.midi) >= 7 ? 1 : 0,
    hereCT: ch?.chordTone ? 1 : 0,
    here135: ch && ['1', '3', '5'].includes(ch.degree ?? '') ? 1 : 0,
    here135strong: ch && ['1', '3', '5'].includes(ch.degree ?? '') && strong ? 1 : 0,
    nextCT: cn?.chordTone ? 1 : 0,
    chordChange: ch?.chord && cn?.chord && ch.chord !== cn.chord ? 1 : 0,
    hereChrom: ch?.chromatic ? 1 : 0,
    pickup: n.beat >= BEATS - 0.5 && notes[i + 2]?.bar === n.bar + 1 && notes[i + 2].beat === 0 ? 1 : 0,
    pickupHeld: n.beat >= BEATS - 0.5 && notes[i + 2]?.bar === n.bar + 1 && notes[i + 2].beat === 0 && h.duration >= 2 * med ? 1 : 0,
    pickupHeld3: n.beat >= BEATS - 0.5 && notes[i + 2]?.bar === n.bar + 1 && notes[i + 2].beat === 0 && h.duration >= 3 * med ? 1 : 0,
    pickupHeldChord: n.beat >= BEATS - 0.5 && notes[i + 2]?.bar === n.bar + 1 && notes[i + 2].beat === 0 && h.duration >= 2 * med && ch?.chord && CTX[i + 2]?.chord && ch.chord !== CTX[i + 2].chord ? 1 : 0,
    famStart: FAM_START.has(i + 1) ? 1 : 0,
    famStart4: FAM_START4.has(i + 1) ? 1 : 0,
    famEnd: FAM_END.has(i + 1) ? 1 : 0,
    famVar: FAM_VAR.has(i + 1) ? 1 : 0,
  }
}
for (const solo of solos) {
  const melid = solo.melid
  const rows = db.prepare('select onset, pitch, duration, period, division, bar, beat, tatum, beatdur from melody where melid = ? order by onset').all(melid) as unknown as WjdMelodyRow[]
  if (rows.length < 10) continue
  const beats = db.prepare("select bar, beat, coalesce(chord, '') as chord, coalesce(form, '') as form, coalesce(signature, '') as signature from beats where melid = ? order by onset").all(melid) as unknown as WjdBeatRow[]
  let sc; try { sc = scoreFromWjd(solo, rows, beats).score } catch { continue }
  CTX = contextualise(sc.notes, sc.chordTracks[0]?.chords ?? [])
  BEATS = sc.timeSig[0]
  FAM_START = new Set(); FAM_END = new Set(); FAM_START4 = new Set(); FAM_VAR = new Set()
  for (const h of findRecurring(CTX)) {
    for (const o of h.occurrences) { FAM_START.add(o); FAM_END.add(o + h.intervals.length + 1); if (h.intervals.length >= 4) FAM_START4.add(o) }
    for (const v of h.variants) for (const o of v.occurrences) FAM_VAR.add(o)
  }
  const secs = db.prepare("select type, start from sections where melid = ? and type in ('PHRASE','IDEA') and start > 0").all(melid) as { type: string; start: number }[]
  const ph = new Set(secs.filter((s) => s.type === 'PHRASE').map((s) => s.start))
  const id = new Set(secs.filter((s) => s.type === 'IDEA').map((s) => s.start))
  if (!ph.size) continue
  const notes = sc.notes
  const med = median(notes.map((n) => n.duration))
  const pred = new Set<number>(); let ix = 0
  const PH = process.env.LEVEL === 'phrase'
  for (const p of segment(notes)) { if (PH) { if (ix > 0) pred.add(ix); ix += p.notes.length; continue } for (const d of p.ideas) { if (ix > 0) pred.add(ix); ix += d.notes.length } }
  if (PH) { id.clear(); for (const x of ph) id.add(x); ph.clear() }
  for (let i = 0; i < notes.length - 1; i++) {
    const at = i + 1
    if (ph.has(at)) continue
    const f = feats(notes, i, med)
    if (id.has(at) && !pred.has(at)) add('FN', f)
    else if (id.has(at) && pred.has(at)) add('TP', f)
    else if (!id.has(at) && pred.has(at)) add('FP', f)
    else add('none', f)
  }
}
const rules: Record<string, (f: F) => boolean> = {
  anyGap: (f) => f.shortRest + f.rest > 0,
  rest16: (f) => f.rest > 0,
  rest8: (f) => f.rest8 > 0,
  'rest16&held': (f) => f.rest > 0 && f.held > 0,
  'rest16&held15': (f) => f.rest > 0 && f.held15 > 0,
  'rest16&leap': (f) => f.rest > 0 && f.leap > 0,
  'rest16&(held15|leap)': (f) => f.rest > 0 && (f.held15 > 0 || f.leap > 0),
  'rest16&downbeat': (f) => f.rest > 0 && f.downbeat > 0,
  'rest16&onBeat': (f) => f.rest > 0 && f.onBeat > 0,
  'rest16&reversal': (f) => f.rest > 0 && f.reversal > 0,
  'rest8&held15': (f) => f.rest8 > 0 && f.held15 > 0,
  'held&leap': (f) => f.held > 0 && f.leap > 0,
  'held15&leap': (f) => f.held15 > 0 && f.leap > 0,
  'held&reversal': (f) => f.held > 0 && f.reversal > 0,
  'leap&reversal': (f) => f.leap > 0 && f.reversal > 0,
  'leap7': (f) => f.leap7 > 0,
  'leap7&reversal': (f) => f.leap7 > 0 && f.reversal > 0,
  'held15&nextLong': (f) => f.held15 > 0 && f.nextLong > 0,
  'here135': (f) => f.here135 > 0,
  'here135strong': (f) => f.here135strong > 0,
  'here135&held15': (f) => f.here135 > 0 && f.held15 > 0,
  'here135strong&held15': (f) => f.here135strong > 0 && f.held15 > 0,
  'here135&rest16': (f) => f.here135 > 0 && f.rest > 0,
  'here135&leap': (f) => f.here135 > 0 && f.leap > 0,
  'chordChange': (f) => f.chordChange > 0,
  'chordChange&rest16': (f) => f.chordChange > 0 && f.rest > 0,
  'hereCT&rest16&held15': (f) => f.hereCT > 0 && f.rest > 0 && f.held15 > 0,
  'pickup': (f) => f.pickup > 0,
  'pickupHeld': (f) => f.pickupHeld > 0,
  'pickupHeld3': (f) => f.pickupHeld3 > 0,
  'pickupHeldChord': (f) => f.pickupHeldChord > 0,
  'pickupHeld|rest8&held15': (f) => f.pickupHeld > 0 || (f.rest8 > 0 && f.held15 > 0),
  'famStart': (f) => f.famStart > 0,
  'famStart4': (f) => f.famStart4 > 0,
  'famVar': (f) => f.famVar > 0,
  'famEnd': (f) => f.famEnd > 0,
  'famStart&rest16': (f) => f.famStart > 0 && f.rest > 0,
  'famStart&(rest|held15|leap)': (f) => f.famStart > 0 && (f.rest > 0 || f.held15 > 0 || f.leap > 0),
  'famStart&downbeat': (f) => f.famStart > 0 && f.downbeat > 0,
  'famStart&onBeat': (f) => f.famStart > 0 && f.onBeat > 0,
  'famEnd&(rest|held15|leap)': (f) => f.famEnd > 0 && (f.rest > 0 || f.held15 > 0 || f.leap > 0),
  'anyGap&held15': (f) => f.shortRest + f.rest > 0 && f.held15 > 0,
}
const keys = Object.keys(acc.FN.sum)
console.log('class'.padEnd(6), 'n'.padStart(6), ...keys.map((k) => k.padStart(10)))
for (const cls of ['FN', 'TP', 'FP', 'none']) {
  const a = acc[cls]
  console.log(cls.padEnd(6), String(a.n).padStart(6), ...keys.map((k) => ((a.sum[k] / a.n) * 100).toFixed(0).padStart(10)))
}

console.log('\nrule (over gaps not currently predicted): hits = idea boundaries, fires = total, precision')
for (const [name, r] of Object.entries(rules)) {
  let hit = 0, fires = 0
  for (const { cls, f } of rows2) { if (cls === 'TP' || cls === 'FP') continue; if (r(f)) { fires++; if (cls === 'FN') hit++ } }
  console.log(name.padEnd(22), String(hit).padStart(6), String(fires).padStart(8), ((hit / Math.max(1, fires)) * 100).toFixed(0).padStart(5) + '%', ' recall gain', ((hit / acc.FN.n) * 100).toFixed(0).padStart(4) + '%')
}
