# OPEN QUESTIONS

Everything unresolved, with what would resolve it. Remove an entry only by
moving its resolution into DECISIONS.md.

- **Form phase is anchored to bar 1.** Blake has a 6-bar intro; period 56
  is right, chorus starts (1, 57) are wrong, so per-chorus profile and the
  "through this solo" tune use head+intro bars. Resolve: phase the
  autocorrelation against rehearsal marks / the soloist region in
  `prepare/form.ts`; check `agreesWithMarks` flips true on Blake.
- **Idea recall is 68%.** The missing boundaries are changes of character /
  motivic repetition with no duration cue (14% have no surface cue at all).
  Resolve: a "same contour or rhythm as the previous unit" detector, scored
  against WJD IDEA sections.
- **Are the practice units right, musically?** Built from one session of
  choices; peers are being shown the hosted page. Resolve: peer feedback on
  (a) phrase/idea marks, (b) which units they'd practise, (c) whether the
  four steps match how they shed.
- **AI summariser** (SoloProfile → two-paragraph overview + one line per
  finding). Blocked: owner has no API key yet; and where should the call
  run (CLI with env key vs local proxy for the page)? Resolve: owner gets a
  key and picks; build the deterministic SoloProfile prompt around
  `analysis.profile`.
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
- **Analyse the head (bars 9–62)** to catch the soloist quoting the tune.
  Cheap once form phase is fixed.
- **displace step and 3/4+ time**: placements assume 4/4 feel (beat 2,
  and-of-1). Check against a 3/4 solo when one arrives.
