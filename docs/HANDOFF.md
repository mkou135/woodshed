# woodshed — handoff

**Written 2026-08-23.** Read this first, then `docs/superpowers/specs/2026-08-23-woodshed-design.md`.

## What this is

A tool for jazz musicians: feed it a transcribed solo, it identifies the
vocabulary the player actually used, and generates exercises that drill it.

The owner is a **tenor saxophonist** (B♭). Their transcriptions live in
`~/Documents/MuseScore4/Scores/` and `~/Downloads/MusicXML Transcriptions/`.
The sibling project `../tune-arcade` is theirs too — same TypeScript/Vite
conventions, and it has OSMD and pitch-detection code worth borrowing later.

## State: a working prototype

35 commits, 161 tests passing, typecheck clean, `npm run build` succeeds.

```bash
npm install
npm run dev        # then drop a .mxl on the page
npm run test:run   # NEVER bare `npm test` — that is watch mode and hangs
npm run typecheck
```

Verified end to end in a browser on the Seamus Blake "Hey Lock!" solo:

```
Instrument   Bb tenor saxophone
Length       122 bars, 550 notes
Form         56-bar chorus, 2 choruses (absolute match, 86% agreement)
Soloists     unknown (bars 1-62), Solo Seamus Blake (bars 63-122)
Vocabulary   20 findings; top is "major-seventh arpeggio from the b3",
             bars 73 and 77, found by all three detectors, confidence 1.00
Exercises    4, rendered as notation, downloadable as MusicXML
```

That top finding was derived by hand from the score before any code existed.
The engine reproducing it is the main evidence that the approach works.

## Layout

```
src/core/       types, pitch/interval/degree math, instrument table
src/ingest/     MusicXML -> Score (readScoreFile, parseScore, parseHarmony, parseChordText)
src/prepare/    cleanup checks -> CleanupReport (soloists, form, checks, adjustments)
src/analyse/    segment, context, detectors/{shapes,targets,recurring}, convergence
src/generate/   transform, validity gate, assembly
src/render/     musicxml writer
src/pipeline.ts run() — the whole thing in one call
app/            the web page (the ONLY place allowed to touch the DOM)
fixtures/       11 synthetic MusicXML files, one per corpus hazard
docs/research/  three research documents, all load-bearing
```

## Non-negotiables

- **`src/` is DOM-free.** Engine must run in node, browser and a CLI. Only `app/` uses the DOM.
- **Chord quality comes from `<kind>`, never the `text` attribute.** See F1 below.
- **`Score` is immutable.** `prepare/` emits `Adjustment[]`; it never edits.
- **The model never touches note data.** Every count, interval and generated note comes from deterministic code. A model that miscounts a semitone puts a wrong note in someone's practice routine. (No AI is wired in yet — this rule is for when it is.)
- **Never modify `fixtures/`.** Tests assert their exact values.
- Style: no semicolons, single quotes, 2-space indent, ESM with explicit `.ts` extensions.

## Decisions, and why

Every one of these came from evidence, not preference. The research documents
carry the working.

**Three senses of "pattern", three algorithms** (`docs/research/what-is-a-pattern.md`).
A *shape* you match, a *device* defined by its relationship to a target, and a
*function* defined by position. The proof they are different: Parker's
`G# G C A Bb B` fails the Weimar Bebop Alphabet's approach rule twice — five
intervals against a limit of two, and a +5 leap against a ±4 ceiling — and
parses as `+X3 +C2` with "enclosure" appearing nowhere. Shape matching misses
it too, because the notes are generated around the target and there is no fixed
shape. Hence the target detector, which is **ours, not from the literature**,
and correspondingly unvalidated.

**Convergence scoring instead of corpus surprisal.** Frieler's mine of Parker's
Omnibook found the most frequent interval patterns are chromatic and diatonic
runs, and that his solos are ~100% pattern-covered. Frequency alone is nearly
vacuous. Proper surprisal needs the Weimar corpus (SQLite + unquantised MIDI, a
second ingestion path, ODbL questions), so v1 scores by how many independent
detectors agree instead. It works: the top Blake finding is the one all three
found.

**Segment on rests only** (`corpus-survey-cleanup.md` addendum). Four variants
tested over four real solos, scored by the Weimar chromaticism asymmetry. Rests
alone won; every "a long note ends a phrase" variant *destroyed* the signal and
fragmented phrases. Do not re-add a long-note or inter-onset rule without
re-running that probe.

**Exercises render in even eighth notes.** What the method books do, and it
means transcription rhythm errors never propagate into a drill.

**One key by default, not twelve.** Coker gives patterns in one key on purpose —
the transposition *is* the exercise. Generating all twelve can generate the
learning away. Currently the cycle exercise does print all twelve; revisit.

## Corpus findings that shaped the cleanup phase

From surveying nine real transcriptions. Full detail in `corpus-survey-cleanup.md`.

- **F1 — the chord `text` attribute is systematically wrong.** Under
  `use-symbols="yes"`, MuseScore writes `text="7"` for `major-seventh`,
  `minor-seventh`, `half-diminished`, `diminished-seventh` and
  `augmented-seventh` alike. 112 of 220 harmonies in the Coltrane 26-2 file.
  Silent and unidirectional: everything becomes a dominant, which looks
  plausible in a jazz chart while corrupting every degree.
- **F2 — 1 file in 8 has no `<harmony>` at all**, storing chords as staff text
  in its own dialect (`D-`, `Fmaj`, `E7+9`). Hence `parseChordText.ts`.
- **F3 — one file contains two soloists** (Tenor Madness: `Trane` m1, `Sonny`
  m85). Analysing across that boundary blends two vocabularies.
- **F5 — form is recoverable from harmony autocorrelation** in 6 of 7 chorded
  files, including three with no structural annotation at all. The relative-root
  fallback catches forms that transpose each chorus.
- **F7 — range violations are NOT error signals.** One player has 50 notes above
  the normal written range because he plays altissimo. Flag, never correct.
- **F10 — transcribers annotate their own doubt** (`sloppy`, `flat`, `lay back`).
  Machine-readable, already in the file, and directly relevant to the
  "what the player meant vs what came out" problem.

## Traps that already cost time

- **`npm test` is watch mode and will hang a tool call.** Use `npm run test:run`.
- **Object identity fails for chords.** A cell often spans two bars carrying the
  same chord as two separate `<harmony>` elements. Compare root and quality.
- **Do not count every accidental as chromatic.** The ♭7 of a dominant is spelt
  with a flat and is the most consonant note in the chord. Chromatic means
  *altered AND not a chord tone*. Getting this wrong hid a real signal entirely.
- **Merging findings has two independent rules, not one.** Same identity anywhere
  = the same vocabulary recurring. Overlapping spans from different detectors =
  convergence. Requiring both at once breaks both. Convergence must add
  *evidence*, not spans — absorbing spans makes findings snowball until one
  claims the whole solo.
- **A device is its procedure and target, not its notes.** Comparing interval
  vectors before names splits one device into as many findings as it has shapes.
- **Never graft one detector's interval vector onto a finding that has degrees.**
  Different lengths; every generated exercise then fails its own validity gate
  and vanishes silently.
- The engine passed 156 tests while producing bad output (81 findings, the good
  one ranked 9th). **Green tests are not evidence the output is any good.** Run
  it on a real solo and read what comes out.

## Known limitations

- **Target/enclosure devices produce no exercises.** They are found and reported,
  but only dictionary cells generate drills. Re-targeting is designed in the spec
  and not built.
- **13 of 20 Blake findings come from the target detector alone** and are noisier
  than they should be.
- **Names are dictionary strings**, not prose. `major-seventh arpeggio from the b3`
  rather than something a teacher would write.
- **No AI layer at all.** The spec's §8 describes it; nothing is wired up.
- **The shape dictionary is tiny** — 10 entries across two chord families.
- The WBA atom parser is designed but deliberately unbuilt: a probe showed its
  output (`-X4 -F2 +A4 +D7`) is dominated by residuals and reads as nothing.
- Vite warns the bundle is 1.4 MB, driven by OSMD.

## Suggested next steps, highest value first

1. **The AI naming and curation layer** (spec §8). Turn
   `major-seventh arpeggio from the b3` into a sentence a teacher would write,
   and choose which of 20 findings are worth someone's practice time. The
   output format is already settled — Mintzer's numbered *things to look for*
   list, each item anchored to a bar. Use `claude-opus-5`, TypeScript SDK, tool
   runner, structured outputs. **No fine-tuning**: the model does no musical
   computation, so there is nothing to fine-tune for.
2. **Re-targeting**, so devices generate exercises. It is the novel contribution
   and currently produces nothing for the player.
3. **Grow the shape dictionary**, quality-aware.
4. **Density and silence measurement.** Mintzer's best observation is about notes
   that *aren't there*; no detector can currently see that.
5. **Implied reharmonisation.** Compare played against written to infer the
   substitution. F6 gives the raw material free — low periodicity agreement marks
   exactly the choruses where changes were substituted.

## Open questions for the owner

- Should the cycle exercise print all twelve keys, or one key and the cycle named?
  (Coker's argument says the latter; currently it prints twelve.)
- Is the WBA atom parser worth building as substrate, given it reads as nothing
  on its own?
- Should the head (bars 9-62 in the Blake file) be analysed too, to detect the
  soloist quoting or developing the tune?
