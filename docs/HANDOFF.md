# woodshed — handoff (narrative history)

**Superseded as the live state on 2026-08-24** by the four continuous
files: `ENGINE_SPEC.md`, `DECISIONS.md`, `OPEN_QUESTIONS.md`, `LEDGER.md`.
Read those first; this file is background and is no longer kept current.

**Written 2026-08-23, revised the same day after a second review.** Read this
first, then `docs/superpowers/specs/2026-08-23-woodshed-design.md`.

## What this is

A tool for jazz musicians: feed it a transcribed solo, it identifies the
vocabulary the player actually used, and generates exercises that drill it.

## Thesis (settled 2026-08-23)

The job is to reduce the cost of getting from *"I transcribed this"* to *"I am
practising something"*. Consequences:

- **The findings list is a menu, not a verdict.** The top item must be
  credible so the list is trusted; beyond that the player chooses. We do not
  need corpus surprisal to say "here are eight things in your solo, pick one".
- **The annotated transcription is the product.** An exercise is an action on
  an item in it, not a parallel output. Built: `app/main.ts` renders the
  whole solo with OSMD, lists findings beside it, highlights the selected
  finding's notes in the score and shows its drills under the item.
- **A wrong note in a drill is worse than no drill.** Exercises are kept to
  what cannot be wrong; anything the validity gate cannot re-detect is dropped.
- **Any model is a describer, not a curator.** It narrates deterministic
  measurements (a `SoloProfile` of density, phrase length, register,
  chromaticism over time) and writes one line per finding. It never reads
  pitches and never chooses for the player.

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

**Phrase boundaries are a strength profile, not a rule** (`corpus-survey-cleanup.md`
addendum 2). LBDM-style: rest weighted most, held note (from 2x median, full
at 4x) and leap as secondary cues, threshold 0.45, no phrase under three
notes. Replaced rests-only, which split Blake's lines at eighth-rest breaths.
The earlier probe's "long notes destroy the signal" was about a hard rule at
2x; 4x is a different claim. Blake: 23 phrases, median 11 notes (Weimar
median 12). Checked by the owner's ear the same day: rests make phrases,
held notes make *ideas* within a phrase — so `Phrase.ideas` is a second
level, and a phrase starting inside a tuplet begins on the beat. **Then
scored against the Weimar Jazz Database** (`npm run eval:wjd`, 456 solos):
phrase boundaries F1 83.8 — the human–human ceiling is .83 — and idea
boundaries 76.3. Weights tuned there; see `phrases-and-ideas.md` §8. Blake:
18 phrases, 21 ideas. Detectors never match across an idea boundary.

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

## Second-review fixes (2026-08-23)

Found by running the pipeline on the Blake solo and reading the output, not by
tests — every one of these shipped with 161 tests green.

- **Generated drills had the wrong contour.** `3 5 7 2` rebuilt from degrees
  mod 12 gave `+4 +3 -8`; the cycle exercise ended on a leap down a seventh
  Blake never played. Shape hits now carry the intervals as played.
- **A maj7 arpeggio over D7 was called "seventh arpeggio" and drilled through
  every dominant and sus chord in the tune.** The dictionary is now keyed by
  quality, not family, and the validity gate re-runs `matchShapes` rather than
  comparing degree strings. `overChanges` only uses chords the cell is
  vocabulary over.
- **The target detector threw its own score away**, so six findings tied at
  0.90 in insertion order. `Finding.weights` now carries each detector's own
  confidence and detector credit is weighted by it.
- **Diatonic scale walks (`F G Ab` into the b3) were reported as devices** —
  six occurrences in one solo. An approach must now be chromatic or change
  direction, and a diatonic approach gets three notes of lead at most.
- **`targets.ts` used object identity on chords** — the trap this document
  already warned about.
- **A confidence floor of 0.4** turns 26 findings into 12.
- `npm run solo -- <file.mxl>` prints what a player would see, and
  `pipeline.test.ts` pins the Blake output as a golden test.

Blake after: 12 findings, top unchanged, the `Gb F G Ab` chromatic turn into
the b3 (bars 81, 90, 106) now visible where it was previously buried.

## Known limitations

- **Form phase is anchored to bar 1.** The Blake file has a 6-bar intro;
  autocorrelation finds the 56-bar period correctly but reports chorus starts
  at 1 and 57 when the marks say the solo choruses begin at 63 (and B at 73).
  `agreesWithMarks: false` already flags it. Until `prepare/form.ts` phases
  the period against marks or the soloist region, `SoloProfile.choruses` is a
  single region for this file and forced phrase boundaries land in the wrong
  bar.
- **Idea recall is 68%.** The missing boundaries are changes of character
  and motivic repetition with no duration cue; they need a "same contour or
  rhythm as the previous unit" detector, not more tuning.
- **The Weimar database is ODbL** and lives at
  `~/dev/personal/woodshed-data/wjazzd.db`, outside the repo. Never commit
  it. `npm run eval:wjd` reads it from there (or `$WJD`).
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

## Practice units (2026-08-23)

Spec: `docs/superpowers/specs/2026-08-23-practice-units-design.md`. The
owner chose four steps from the methodology research as the spine:
*analyse → micro-units → through a tune → vary and write your own.*

- **The practice unit is the idea** (`Phrase.ideas[]`), split at bar lines
  into parts of at most two bars when long (`practice/unit.ts`,
  `partition`). Findings are chips inside it. Ranked by strongest finding,
  breadth, recurrence, a chord-tone landing, and +2 if it can be taken
  through a tune. Blake: 32 units; u1 is the maj7-from-the-b3 line at 76–77.
- **Four steps per unit** (`practice/steps/`): *loop* (as played, real
  rhythm, chords; sing, then with the record from bar N beat M), *through*
  (each degree-cell over every fitting chord of the tune; cycle of fourths
  available, not default), *displace* (same pitches and rhythm starting on
  1, the and of 1, 2, or as a pickup — the smallest move modulo the bar;
  dropped if the arrival stops being a chord tone), *write* (MusicXML
  template with the arrival degree as cue notes on fitting chords;
  `checkWriting` ingests the player's file and says which devices are in it).
- **Tunes**: this solo's changes (one chorus) by default, or an
  `irealb://` link pasted on the page (`practice/ireal.ts`). The parser is
  ours; 1,458 of the 1,460 forum jazz standards parse (two are malformed).
  Charts are concert; transposed by `instrument.transpose`. The pasted link
  is kept in `localStorage`. No chart collections are bundled.
- **Renderer** (`render/musicxml.ts`) now takes `ExerciseBar.events`
  (durations in ticks, rests, cue notes, several chords per bar) alongside
  the even-eighth path.
- The page lists **Ideas**, not findings; selecting one highlights its
  notes and opens the four step panels under it. Notation renders when a
  panel opens.

Not done: session planning / interleaving; motivic-repetition detection for
the 14% of idea boundaries with no duration cue.

## Practice methodology (2026-08-23)

`docs/research/practice-methodology.md` surveys how players and teachers
take a solo apart (Terry, Berliner, Baker, Coker, Crook, Galper, Mintzer;
Duke, Stambaugh, Norgaard). Consensus procedure: listen → sing → work in
phrases → play with the record → analyse → micro-units → 12 keys by ear →
through a tune → vary and write your own. Ranked implications for the tool
are in its §7; the top ones — unit = phrase/device, "things to look for"
before each drill, a per-device practice sequence, interleave rather than
block, rank by recurrence and the player's own taste, surface non-pitch
features — are the methodology the owner asked for.

## Suggested next steps, highest value first

0. ~~Practice units with the four steps.~~ Done 2026-08-23; see above.
1. ~~Annotated transcription as the primary view.~~ Done 2026-08-23. Notes
   are matched to OSMD by `bar:beat` (MusicXML measure number, in-measure
   timestamp × 4); highlighting toggles a class on the note's SVG group, no
   re-render. Untested on a score with a pickup bar.
2. ~~`SoloProfile`~~ Done 2026-08-23: `src/analyse/profile.ts`, on
   `Analysis.profile`, printed by `npm run solo` and shown on the page. Per
   bar: notes, silence, register, chromatic count. Per chorus and overall:
   density, silence, phrases, register, chromatic ratio, finding ids. Plus
   phrase-edge chromaticism (Blake: starts 16%, ends 13% — the Weimar
   direction). Blocked on form phase for a real per-chorus split (below).
3. **The AI layer, scoped as a describer** (spec §8, narrowed). A `summarise()`
   that takes the `SoloProfile` plus findings and returns a two-paragraph
   overview (Mintzer's "architecture over time") and one line per finding.
   `claude-opus-5`, TypeScript SDK, structured outputs. It narrates numbers;
   it never reads pitches. **No fine-tuning.**
4. **The same vocabulary over other standards.** Take a finding and generate
   it over the changes of a chosen jazz standard (a stored chord-chart library,
   transposed for the instrument) — "your Blake figure over Stella", bar by
   bar where the chord quality fits. Same generator, different `Chord[]`;
   the work is the chart library and choosing where the cell belongs.
5. **Re-targeting**, so devices generate exercises. Novel, but produces nothing
   a learner needs until the menu is trustworthy. Keep it as a detector.
6. **Grow the shape dictionary**, quality-aware.
7. **Implied reharmonisation.** Compare played against written to infer the
   substitution. F6 gives the raw material free — low periodicity agreement marks
   exactly the choruses where changes were substituted.

## Open questions for the owner

- Should the cycle exercise print all twelve keys, or one key and the cycle named?
  (Coker's argument says the latter; currently it prints twelve. Under the
  thesis above, the safest default is the exact notes played, in the original
  key, chord named, with "take it through the cycle" as the instruction.)
- Is the WBA atom parser worth building as substrate, given it reads as nothing
  on its own?
- Should the head (bars 9-62 in the Blake file) be analysed too, to detect the
  soloist quoting or developing the tune?

## Session 5 handoff (2026-08-24)

State: main at the commit after 8404dd8, 289 tests, live via git push.
Dictionary now names 69% of Bopland licks (triads + dominant b9 cells);
corpus-frequency stock discount in unit rank; `empty-stretch` adjustment;
exercises beamed, in the solo's key, at written pitch on the page; the
left rail is gone — score, then "Idea n of N" chooser, then a stepper of
the four practice steps; "All ideas" opens the list and tune control.

Next: a real UI/UX design pass for a working jazz musician. What the
owner has said about usability so far: the left rail was unreadable at
24rem; notation must be full width; "hide all that data behind some kind
of button". Known rough edges to fold in: the tune guess from the file
name is sometimes wrong ("strode rode" for St Thomas — the tune search
box should be obvious and correctable); the summary/adjustments/profile
blocks above the score are engine diagnostics, not player-facing; the
unit header repeats the note names the score already shows; the write
step's file check is buried; nothing says what to do first. Constraints
that do not move: `src/` is DOM-free, only `app/` touches the DOM; bar
numbers shown are printed ones (`core/bars.ts`); OSMD renders both the
solo and the exercises; no framework in `app/` today (plain DOM in
`app/main.ts`, 700 lines — a redesign may reasonably introduce one, the
owner's call).

Also open before the design pass, if the owner prefers engine work first:
Mintzer rhythm changes phrase markers (OPEN_QUESTIONS) — needs the
owner's brackets on one chorus, then a threshold review for fast tempos.

## Session 6 handoff (2026-08-24)

The page is now the "practice desk" (spec:
docs/superpowers/specs/2026-08-24-practice-desk-design.md; plan:
docs/superpowers/plans/2026-08-24-practice-desk.md). Header with the
solo, a tune chip that is amber and never auto-taken unless the chord vote
is confident, Details for engine data, a start-here strip, the score full
width with the idea in hand painted in highlighter, the desk (big idea
number, bars · chords · named cells, ‹ › All ideas Reset), the four steps
as a path with a remembered done state, and an All-ideas table.
`app/main.ts` is wiring only; the modules are listed in ENGINE_SPEC
"Page". Owner decisions: no framework, self-hosted fonts, done state in
localStorage (DECISIONS 2026-08-24 "Page redesign").

Not yet done from the design: nothing structural. Worth an owner read on a
real practice session: is "Done — through the tune →" the right verb; does
the All-ideas table want the phrase/idea number; does the start-here strip
need to come back on a new visit (it returns on every load today).
