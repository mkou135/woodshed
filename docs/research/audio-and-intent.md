# Listening to the player: audio input and intent-relative feedback (2026-08-25)

Speculative. Nothing here is built or committed to. Captured so the
thinking is not lost — this is an idea store, not a plan, and none of it
has been costed or scheduled.

Prompted by: a second codebase, `cadenceplayground`
(`~/dev/personal/cadenceplayground`, private, also on GitHub as
`mkou135/cadenceplayground` and upstream `flavius289/cadenceplayground`),
carries a large amount of finished audio-detection research. The question
was what woodshed could do with it.

## Verdict in one line

Audio's job is small and single: **know what the player played**. Every
interesting feature above it is deterministic code over a chord track and
a degree table, and most of it can be built and validated on notation
before any DSP exists.

---

## 1. What cadenceplayground already has

Under `src/features/audio/`:

- **Detectors** behind one interface (`detectors/types.ts`): harmonic
  sieve, WASM resonator, WebAudio resonator, pitchy autocorrelation,
  CREPE, Basic Pitch / Magenta neural transcription. All tested.
- **`evaluation/metrics.ts`** — 470 lines, explicitly side-effect-free
  and Node-importable: `matchOnsets`, `matchPitchOnsets`, precision /
  recall / F1, onset jitter stats, false-positive breakdown, frame-level
  F1, offset F1, true-negative scoring for silence.
- **`evaluation/headlessRunner.ts`** — the frames-to-events bridge
  (~lines 1066–1208). Turns per-frame `activeMidiNotes` into onset events
  with timestamps. Liftable, but buried in a 1738-line Node-coupled
  runner; extraction is roughly 150 lines.
- **A benchmark/tuning apparatus** (`testground/`): Optuna sweeps, grid
  search, preset management, explainability, spectral waterfall.

### The two facts that make this cheap

1. **`PolyphonicDetectionFrame` carries `expectedMidi`.**
   `HarmonicSieveDetector` scopes its search to exactly those pitches and
   only falls back to a blind `DEFAULT_SCAN_MIDI` sweep without them. It
   wants to be told what note is coming — and a woodshed `Exercise`
   (`generate/transform.ts`: `bars[].midis`, or `events` for rhythm) is
   already that list.
2. **`evaluation/engineRuntime.ts` marks `harmonic-sieve`, `flux-fft` and
   `superflux-fft` as `runtime: 'both'`, `requiresAudioContext: false`,
   `requiresModelAssets: false`, `supportsOfflineEvaluation: true`.**
   The good detectors are pure DSP. No AudioContext, no model weights.
   They could live in woodshed's DOM-free `src/`, run headless in tests,
   and ship to static GitHub Pages. Only a mic tap would need `app/`.

Don't port `testground/`. That apparatus exists to *choose and tune*
detectors; that tournament was already run in cadenceplayground. Import
the winner and its parameters, not the machinery.

---

## 2. Two ways audio could enter

### (a) Play into it — grading a practice step

Expected notes from a generated step, detector scoped to them, verdict
per rep: which notes landed, timing jitter, pass/fail at tempo.

Cheapest possible integration, and it never produces `Note` data — the
detector's output is only ever compared against deterministic
expectations. Record-the-rep-then-score beats live streaming: no
AudioWorklet, no real-time budget, fully testable headless against
synthetic buffers (cadenceplayground has `evaluation/syntheticFixtures.ts`).

### (b) Play a solo into it — transcribe, then analyse

The richer one, and the direction the owner wants. Player blows a chorus
over the changes; the app transcribes it and runs the existing analysis
on the result. See §3 onward for what that unlocks.

**Why this is more tractable than blind transcription:**

- **You own the clock.** The app supplies the chart and the click, so
  bar/beat alignment is bookkeeping, not inference. Deciding *this note
  is the and-of-2 in bar 4 over the Dm7* is normally where naive
  transcription falls apart; here it's given.
- **Headphones make it monophonic.** Backing track to the ears, mic hears
  only the horn. Close-mic'd single-line source is the case the detectors
  were tuned on.
- **After-the-take, not live.** You don't want commentary mid-chorus, and
  "you didn't enclose there" is useless in real time. Dropping the
  real-time constraint means the *slow accurate* model (Basic Pitch) is
  available instead of the fast approximate one. The use case that sounds
  harder is the one that gets the better tools.

---

## 3. Intent-relative feedback — the core idea

The trap is assuming the engine must decide what is *musically better*.
It doesn't. **The player supplies the objective function**, and
consistency against a stated rule is a fact rather than a judgement:

> "You set out to outline a 7-9-11 upper structure on beat 1 of every
> dominant. You held it on 7 of 9 — bars 12 and 28 you didn't."

### A declared intent is a dictionary entry

`analyse/detectors/shapes.ts` already stores exactly this shape:

```ts
interface Entry {
  degrees: string        // '3572'
  name: string           // '3-5-7-9 upper structure'
  qualities: Quality[]   // the chord qualities this is vocabulary over
}
```

An intent is that, plus a site rule. Two independent halves:

- **Site selector** — every dominant; every bar 1 of the A section; these
  two maj7 bars. Chord track + form phase + bar numbers make this a filter.
- **Requirement** — a degree set, a dictionary shape, an interval
  pattern, or a device such as enclosure from `detectors/targets.ts`.

Cross them and the report writes itself: held at N of M sites, missed
at these bars. No aesthetics involved.

This also unblocks the standing "dictionary is 13 entries" question:
authoring stops being a bottleneck and becomes a user feature, because
players write entries as a side effect of setting their own homework.

### Intent as hypothesis (the better version)

The player need not declare anything in advance. The engine can notice
**near-consistency** and offer it back:

> "You played the 3-5-b7-9 on six of the seven dominants — bar 19 is the
> odd one out. Was that the plan?"

That is the recurring detector plus a site-completeness check. It catches
intentions the player had but didn't articulate, and ones they didn't
know they had. **The near-miss is the highest-value object in a solo** —
a rule held at 6/7 is far more informative than one at 7/7 or 2/7.
Feedback could be ranked on that alone: surface the sites where a rule
was *almost* held.

### Stating an intent without building a theory UI

An LLM layer (planned; see OPEN_QUESTIONS "AI summariser") can infer the
intent from chat — "I want to nail 7-9-11 on every dominant" — and
compile it to a predicate. This stays inside the non-negotiable: **the
model writes the rule; deterministic code evaluates it** and produces
every count, interval and generated note.

---

## 4. Superimposition — exploration, not correction

The second genre the owner described is not a correction at all:

> "You were implying tritone subs — have you considered imposing a
> dominant on these two maj7 bars, and then the tritone sub on that
> imposition?"

This is a **chord algebra**: given a chord, enumerate legal impositions
(related ii-V, dominant-of, tritone sub, diminished passing, upper
structure triads, side-slip) and let them *compose*, so stacking falls
out of the rules instead of being enumerated. Deterministic theory, no
judgement, no model.

Output is a menu of substrate harmonies over a bar. Feed each into
`generate/transform.ts`, which already renders a cell against a given
chord, and the suggestion arrives as playable notation rather than prose
theory. Two existing modules with one new algebra between them.

**This half needs no audio and no solo.** "Here are the superimpositions
available over this tune, bar by bar" is buildable against an iReal chart
today. Audio only makes it responsive — narrowing the menu to sites the
player actually played through, and to ones they left inside.

---

## 5. Other directions worth keeping

- **Rut detection.** The recurring n-gram detector run on the player's
  own solos: "here are the five things you can't stop playing."
- **Did the shed transfer?** You spent a week on the b3 major-seventh
  arpeggio. Did it appear once in free play? Nothing currently measures
  the only test that matters.
- **Time-feel profiling.** Aggregated jitter from `metrics.ts`: where the
  player's eighth notes actually sit relative to the click, and whether
  that shifts with tempo or difficulty. Swing feel, measured.
- **Making the changes.** Chord track + target detector: what fraction of
  bars arrive on a chord tone at the change, versus running scales
  through it. One honest number about the thing everyone claims to work on.
- **Sing it, then play it.** Monophonic detection works on voice. Check
  both, and check they match each other.
- **Call and response.** App plays a cell drawn from the player's own
  findings; they play it back without seeing notation.
- **Retention scheduling.** Not "was the rep clean" but "is it still
  there in a week" — the missing measurement for the standing
  session-planning / interleaving question.
- **Show the transcription and let them correct it.** Fixes the data
  before analysis, makes the error bar visible rather than hidden, and
  checking a machine transcription against what you just played is itself
  ear training. Turns the weakest link into a practice activity.

---

## 6. Open problems, honestly

- **The non-negotiable.** *"Any future model layer never produces or
  reasons about note data."* Transcribing the player's own playing
  produces note data by definition. This needs an explicit DECISIONS
  entry before it happens. Likely resolution: a transcription of your own
  playing and a notated transcription of Blake are **different objects
  that share detectors** — the player's carries its own confidence track,
  never becomes a fixture, and never feeds the goldens. But that is a
  decision with teeth, not a formality.
- **Absence claims are where errors become confident nonsense.** A note
  the detector missed manufactures a missed opportunity that never
  existed. Positive findings degrade gracefully (you just miss some);
  negative findings degrade into telling a player they failed to do
  something they did. Absence should be held to a much higher confidence
  bar than presence, and only claimed in regions that transcribed cleanly.
- **Written vs concert pitch.** Woodshed stores *written* MIDI (tenor
  reads B♭); every detector returns concert. Unstated, that seam silently
  transposes everything by two semitones. It belongs at
  `instrument.transpose.chromatic`, so the detector never sees written pitch.
- **Compliance dynamics.** Report an intent as *held 7 of 9*, never as a
  grade or a streak, and make it trivial to retire. A declared constraint
  is temporary scaffolding for a shed session; the moment it feels like a
  score to defend, the player is satisfying the checker instead of
  playing.
- **Privacy.** Carry cadenceplayground's stance verbatim: metadata only,
  raw microphone samples never persisted.

---

## 7. If this is ever picked up

Rough order, cheapest risk-reduction first. Not a commitment.

1. **Site selectors and requirement predicates on notation.** Build and
   validate against Blake and the Omnibook. No audio. If "held at N of M
   sites" reads as useful there, the interesting half is de-risked.
2. **Near-miss ranking.** Same substrate; the hypothesis feature.
3. **Chord algebra + superimposition menus** over an iReal chart. Still
   no audio.
4. **DECISIONS entry** on model-derived note data.
5. **Audio last**, and only then: lift the pure-DSP detector plus
   `metrics.ts` into a DOM-free `src/listen/`, mic and buffer capture in
   `app/`.
