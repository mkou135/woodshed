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
- **Analyse the head (bars 9–64)** to catch the soloist quoting the tune.
  Form phase is fixed, so this is now cheap.
- **displace step and 3/4+ time**: placements assume 4/4 feel (beat 2,
  and-of-1). Check against a 3/4 solo when one arrives.
