# OPEN QUESTIONS

Everything unresolved, with what would resolve it. Remove an entry only by
moving its resolution into DECISIONS.md.

- **A pickup before the first chorus shows as its own "chorus" region** in
  the profile (Blake 63–64). Resolve: label regions before the first chorus
  start as "pickup" in `analyse/profile.ts` and the page.
- **Parker "All the Things" chart has chords only as staff text** (41
  parsed at 0.7 confidence) and a pickup numbered bar 0; a single chorus,
  so no form. Resolve: check the text-chord degrees look right on the page;
  decide whether bar 0 should be renumbered at ingest.
- **A 2–4 bar vamp is taken as the form** in 34 WJD solos (modal tunes,
  "Nature of the Beast", one Stardust): `smallestPeriod` accepts the first
  p > 0.75. Resolve: when rehearsal marks exist, prefer the smallest period
  consistent with same-letter mark spacing; otherwise a minimum period
  (8?) — but `transposing-form` pins period 4, so decide with the owner.
- **Mixed-meter solos** (3 in WJD) are rejected; MusicXML with a mid-score
  `<time>` change silently takes the last one. Resolve: per-bar time
  signatures in `Score`, or reject in `parseScore` the same way.
- **Corpus numbers are printed, not pinned.** Resolve: a golden file for
  `corpus:wjd` (per-solo findings/units counts) so a change shows its blast
  radius — like `pipeline.test.ts` does for Blake.
- **Omnibook as a regression corpus.** 50 Parker heads+solos (Inria, CC
  BY-NC-SA, `~/dev/woodshed-data/omnibook`) all run; ~1,800 units. Not in
  the repo (licence, 50 MB with the WJD copy). Resolve: an
  `npm run eval:omnibook` that points at the folder and pins counts, like
  `eval:wjd`; decide whether the licence allows a few as fixtures.
- **Correct tune, weak vote** — Barbados 33%, Perhaps 41%, Cheryl 24%
  (period detected as 24 not 12), Blue Bird, Relaxing With Lee (title →
  Donna Lee). Resolve: try the vote over period × phase offsets, not just
  the detected phase; that is also the "rank the book by changes" item.
- **Tunes not in the book** ("Blues in all keys", "Rhythm Changes", "Hey
  Lock") only get "paste a link". Resolve: aliases (rhythm changes → I Got
  Rhythm; blues → a 12-bar template) and, later, ranking the book by how
  well each chart's changes vote against the solo.
- **Blues in all keys reports 87% on a 12-bar period by absolute roots**,
  which a key-changing blues should not. Resolve: inspect the chord track.
- **Charts with neither letters nor double bars** fall back to bar 1 with
  no warning. Resolve: when `phaseFrom` is 'none' and the solo starts
  mid-period, raise a warning adjustment; test on such a chart when one
  arrives.
- **Idea recall is 68%.** The missing boundaries are changes of character /
  motivic repetition with no duration cue (14% have no surface cue at all).
  Resolve: a "same contour or rhythm as the previous unit" detector, scored
  against WJD IDEA sections.
- **BYOK on the public page** (from the agent-layer design, 2026-08-25).
  Two checks before job 1 ships on Pages: confirm browser-direct calls with
  `anthropic-dangerous-direct-browser-access` work from a GitHub Pages
  origin, and settle the wording next to the key field (key stays in the
  visitor's localStorage). Resolve: a 20-line probe page + owner reads the
  copy. The old "AI summariser blocked on key/where it runs" question is
  closed by the design spec (runs wherever a key is; replay fixtures until
  the owner has one).
- **Cycle exercise: twelve keys printed, or one key + "take it through the
  cycle"?** Coker says the latter; code prints twelve (as a non-default
  now). Resolve: owner tries both on the horn.
- **8 of 18 Blake phrase ends are non-chord-tones.** Blake ending on
  tensions, or the last note actually belongs to the next chord
  (anticipation), or boundaries a note off? Resolve: check those 8 spots by
  ear against the record; also test "phrase can end at a chord-tone target
  without a rest" (Weimar hypothesis 8).
- **Session planning / interleaving.** Research says rotate units in short
  blocks and mix keys (feels worse, retains better). Resolve: design a
  "today's session" view over units once units themselves are validated.
- **Dictionary is 13 entries.** Grow quality-aware (Coker's elements:
  7-3 resolution, CESH, bebop-scale runs). Resolve: add with tests per
  entry, watch the Blake goldens.
- **WBA atom parser as substrate** — probe said its output reads as
  nothing on its own. Keep deferred unless something needs it.
- **Analyse the head (bars 9–64)** to catch the soloist quoting the tune.
  Form phase is fixed, so this is now cheap.
- **displace step and 3/4+ time**: placements assume 4/4 feel (beat 2,
  and-of-1). Check against a 3/4 solo when one arrives.

- **Owner annotation (`annotate.html`, `npm run eval:owner`) unblocks two
  stalled questions**: departure detection (killed 2026-08-25 "Death #5"
  for lack of human-labelled departures — the app's outside/colour spans
  are exactly that target) and ranking ground truth (the agent's `rank`
  job has no held-out signal to check against — the app's drill stars
  are "I'd practice this"). Resolve: get a real solo annotated (more than
  the e2e smoke marks) and re-open both with the new labels as the target.
- **What formally scores outside spans and stars?** `eval:owner` only
  prints overlapping `analysis.findings`, no precision/recall — spans
  don't line up with findings or phrase starts the way boundary marks do.
  Resolve: decide a matching rule (span overlap? contained finding?) once
  there are enough owner spans to design against.

- **Owner brackets: the St Thomas 8th.** `npm run brackets` (session 6)
  scores scripts/brackets.json against the peers files. Mintzer 3–34 is the
  owner's list (12/13, 22.1 known). St Thomas 57–76 is the engine's output
  frozen after riff binding + articulation rest — 7 starts where session 4
  matched 8 brackets; the bar.beat list was never written down. Resolve:
  owner re-reads 57–76 on the page and corrects the JSON. Also still open:
  the unmarked-pickup warn on Mintzer shifts beat positions.

## Segmentation cues (2026-08-24, from a ChatGPT comparison)

Tested against WJD the same day (DECISIONS 2026-08-24): separate idea
profile with rest/rhythm-change terms, harmonic arrival, metric position —
all rejected, no surface cue reaches 20% precision on the unmarked gaps.
Local peak picking accepted (ideas F1 77.6); similarity (family starts)
also rejected, 3% precision — idea recall is at its ceiling. Still open:

- **Variant clustering — done for bend/inversion** (DECISIONS 2026-08-24).
  Not yet: retrograde, a bent interval in a 3-note cell, two small bends in
  a 6-note cell, and "same idea, different length" (a 4-note head inside a
  5-note variant). Also a near-trivia family ([-1,-1,-1,-1,-1,2] vs …,3])
  passes because trivia is judged on the whole cell. Resolve: look at the
  families on the page for a few solos before widening.
- **Contour closure cue.** Line reaches an extreme then settles. Peak
  (up-then-down) was 23% at missed boundaries vs 20% elsewhere — likely
  nothing; only if headroom remains.
- **Stock-vocabulary discount, corpus version** — in (DECISIONS 2026-08-24
  "Stock discount, corpus version"): WJD document frequency, named 4-note
  cells exempt. Left open: Omnibook and Bopland are not in the table yet
  (WJD only); "5-3-2-1 descent" and "scalar cell 1234" are exempt as named
  cells although they are the most stock cells the dictionary has (St
  Thomas u2/u3) — should a cell's own corpus frequency discount its
  finding?; and the owner's page read of unit order on 2–3 solos is still
  the real test.
- **Bopland lick corpus** (~/dev/woodshed-data/bopland; licensing in
  DECISIONS 2026-08-24). Uses in payoff order: dictionary-coverage
  benchmark (named vs unnamed licks with their changes); second corpus for
  the stock-vocabulary frequency table; variant-family checks. OMR noise
  unmeasured — spot-check against the PNGs before trusting any lick.
- **Dictionary coverage on Bopland is 37% named / 39% unnamed-only / 24%
  nothing** (`npm run bench:bopland`, 1,785 licks with their own changes).
  The "nothing" sample shows shapes the degree-cell dictionary lacks: bare
  triads in any order (done 2026-08-24: nothing 23.9 → 14.8%),
  dominant b9 cells (done 2026-08-24: nothing 14.8 → 14.3%), and 3-note
  approach cells. Coverage now 69.3% named / 16.4% unnamed / 14.3% nothing;
  the remaining "nothing" sample has not been re-read since the triads went
  in. Adding cells changes what the app names on every solo, so it is
  the owner's call: propose triads first (measure the Blake/WJD finding
  counts before and after), then the b9 family.
- **8 of 50 Omnibook files detect no form.** Each is a multiple of 12 or
  32/64 plus 1–2 bars, with no pickup and starting at measure 1 — so
  trailing tag/coda bars look like they defeat the residue-class phase
  rule. Resolve: run form phase on `Cosmic_Rays` (37 = 3x12+1) and
  `Red_Cross` (66 = 2x32+2) from `~/dev/woodshed-data/omnibook/`; see
  `docs/research/datasets.md`.
- **Are the Omnibook files head+solo?** LORIA ships "themes *and*
  improvisations"; Donna Lee's chorus 1 runs 6.9 notes/bar against 5.6/5.7
  after, which reads as the composed head pooled with the solo. Decides
  whether that corpus can be scored as improvised vocabulary. Resolve:
  compare chorus 1 against the known melody for a few tunes.
- **Does 12-key drilling transfer, given vocabulary is partly motor-encoded?**
  Norgaard, Bales & Hansen, *Cognition* 230:105308 (2023) — ~100,000 notes
  from one artist-level pianist across 11 live performances against a
  24-pianist control — find recurring 5-tone patterns carry linked timing
  and velocity motor programs, so transposition is not a free operation on
  an abstract cell. Bears directly on the cycle-exercise question above
  (twelve keys printed vs one key + "take it through the cycle"). Resolve:
  owner tries both; the motor argument cuts against printing twelve.

## From the jazz pedagogy literature (2026-08-24)

Full write-up and citations in `docs/research/jazz-pedagogy-literature.md`
— **local only**, gitignored because it summarises copyrighted method
books; ask the owner for a copy.
All of these are proposals; none is implemented.

- **7-3 resolution is undetected** (b7 of II-7 → 3 of V7; also V7 → I).
  Coker gives it a whole chapter; Ligon and Owens arrive at it
  independently. It is the only device on Coker's list that looks *across*
  a chord change, which no detector of ours does. Resolve: build it from
  the chord track and `NoteContext` degrees, and decide deliberately
  whether it may cross an idea boundary (`samePhrase` currently forbids
  that for every detector).
- **Phrase boundaries carry a metric and formal position we ignore.**
  Baker: phrases mostly end on the upbeat of beat 1 or 3. Owens: Parker's
  phrase endings cluster in bars 7–8 of each 8-bar section. Bergonzi and
  Ligon both tell students to attend to exactly this. `segment()` uses only
  rest, length and leap. Resolve: try (a) a metric-position term and (b) a
  form-position bonus at bars 7–8 of each section, scored against
  `eval:wjd` and `npm run brackets`. This is the most promising lead on
  "Idea recall is 68%", since a form prior helps precisely the boundaries
  that have no surface cue.
- **We never report where the player's phrases start and end.** `Phrase.onset`
  exists; the profile says nothing about it. Resolve: add a metric-position
  summary to `SoloProfile` ("phrases mostly begin on the and-of-4").
- **A bebop scale and a random scale run score the same.** Baker's rule for
  the bebop scale is entirely metric — the added chromatic note exists so
  that chord tones land on downbeats. `stockShare` penalises any run of ≥ 4
  same-direction steps regardless of placement. Resolve: measure the
  chord-tone-on-downbeat share of a run, and decide whether it earns a
  detector of its own or a term that lifts the stock penalty.
- **A note that fits the next chord is still called chromatic.**
  `analyse/context.ts` judges each note against the current chord only.
  Coker's rule is to look at the chords before *and* after before drawing a
  conclusion, and he names the phenomenon (bar-line shift). Resolve: test
  the note against neighbouring chords; see whether this explains the 8 of
  18 Blake phrase ends that are non-chord-tones.
- **Variant families do not say what the variation is.** Ligon's taxonomy
  has thirteen devices (sequencing, fragmentation, augmentation,
  diminution, retrograde, displacement, interpolation …); `variantOf`
  implements two. Fragmentation is actively discarded by the swallow rule.
  Resolve: name the relation between a variant and its family head, and
  surface it — it is what turns a repeat count into motivic development.
- **Coker's list of the jazz language is two-thirds unimplemented.**
  Missing: change running, harmonic generalization, CESH, quotes, bar-line
  shifts, side-slipping, the bebop lick, named licks. Resolve: decide which
  are worth detecting and in what order; harmonic generalization is
  interesting because it explains the *absence* of change running.
- **The shape dictionary hand-lists orderings.** Bergonzi's system is one
  four-note set (1-2-3-5 major/dominant, 1-3-4-5 minor — both already ours)
  times its 24 permutations. Resolve: consider restating entries as
  set + permutation, which would collapse the six triad entries into one
  and generate a "play it in another order" practice step.
- **Four practice steps the sources have and we do not**: visualise (away
  from the horn — Bergonzi; answers the faculty consensus that memorising
  beats notating), edit (omit notes for rhythmic variety), permutation, and
  connect-by-step into the next chord. Resolve: owner tries them; visualise
  is nearly free since it renders no exercise.
- **A pentatonic run may escape the stock penalty.** `stockShare` matches
  a run of ≥ 4 notes moving one way by steps of 1–2 semitones *or* by
  3–5 semitones. A major (1-2-3-5-6) or minor (1-b3-4-5-b7) pentatonic run
  mixes 2s and 3s, so it matches neither bucket — while being exactly the
  stock material the penalty exists to demote. Resolve: check whether such
  runs occur in the corpus and currently score as non-stock; if so, add a
  "stays inside one pentatonic collection" predicate.
- **Ligon's three melodic outlines are two-thirds already in the
  dictionary, without their resolutions.** Outline 2 opens with our `1357`
  and outline 3 with our `5321`; both are defined by the 7th that follows
  falling to the 3rd of the next chord. Resolve: with the 7-3 detector
  (above), decide whether an outline is a finding in its own right or a
  property attached to an existing cell finding — the latter would let a
  finding say what it is *for*, which is what the summariser needs.
- **We have no concept of a break** — the 2, 4 or 8 unaccompanied bars that
  often open a solo (Levine's glossary). It sits exactly where our pickup
  and intro handling already gets delicate. Resolve: check whether any
  corpus solo starts with one and how `prepare/form.ts` currently treats it.
- **"head" is used in the profile without saying which sense.** Levine
  gives three. Resolve: pick one (probably "the first pass through the
  melody") and use it consistently on the page and in the CLI.
- **The app can be used without ever listening.** The faculty surveyed are
  split on transcription software, and the dissenting view is that students
  who lean on it do worst. Resolve: make "play it with the record" a
  standing rule in the AI summariser's output, and decide whether the page
  should say it too.
- **Function-aware chord scales in non-functional passages.** Nettles p.166/169:
  over contiguous dominants and constant structures there is no controlling
  tonic and Lydian is appropriate, so the p.92 function rule misfires exactly
  where the harmony is most interesting. Resolve: count how often a transcribed
  solo's changes are non-functional in this sense, and decide whether the
  default table needs an escape hatch.
- **Blues defaults.** Nettles pp.105-106: on a blues the default for I7 is
  Mixolydian #9, and b9/#9/n9/b5 sit inside default scales elsewhere in the
  form. The full-coverage layer will mislabel blues unless it knows the form is
  a blues. Resolve: detect a blues from the changes and swap the I7 default.
