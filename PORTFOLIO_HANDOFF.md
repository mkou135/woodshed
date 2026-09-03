# Portfolio handoff — making woodshed presentable to employers

Context for this session: Michael is job-hunting (AI-adjacent product engineering,
Melbourne) and wants this repo to be the piece of his GitHub a hiring manager or
ML engineer opens first. The engine is good. The problem is first impressions for
someone who clones or skims the repo without the owner's machine or ear.

Follow the session protocol in CLAUDE.md first (ENGINE_SPEC + LEDGER tail). Log
each of these in LEDGER as you go. None of them change detection; do not touch
`fixtures/` or the engine. This is presentation work.

## 1. A fresh clone must be green

Six test files read the Blake transcription from the owner's MuseScore folder and
fail on a fresh clone (README "The corpora" admits it). Reviewers who clone and
see red stop there. Make those tests skip cleanly when the file is absent, the
way the peer-solo tests already do, and say so in one line where they skip.
Verify by running `npm run test:run` with the MuseScore path temporarily
unreachable (e.g. an env var override, or a `WOODSHED_BLAKE` path that defaults
to the owner's folder). Do not weaken the golden checks when the file IS present.

## 2. CI that runs tests and typecheck on push

There is only `pages.yml`. Add a workflow that runs `npm ci`, `npm run typecheck`,
`npm run test:run` on push and PR to main, Node 22. Put the status badge at the
top of the README. Item 1 must land first or the badge is red.

## 3. A screenshot in the README

The README has no image of the thing. Add one screenshot of the annotated score
view with findings visible (the Blake bars 73/77 top finding is the obvious
frame), and ideally a short GIF of dropping a file on the page. Put it directly
under the first paragraph. Store under `public/` or `docs/img/`, not as a data URI.

## 4. One plain-English sentence before any jazz vocabulary

The first paragraph of the README goes straight to "segments the solo into
phrases and ideas". Non-musician hiring managers need one sentence first,
something like: "It reads sheet music of a jazz solo and turns it into practice
drills, the way a teacher would." Then the existing paragraph.

## 5. A "How this was built" section

252 commits in 11 days will make some reviewers assume the repo is entirely
generated. Convert that into a selling point rather than leaving it to be
guessed. Short section, near the end, saying plainly: built with Claude Code;
the owner made the calls (thesis, segmentation corrections by ear, which corpus
optimum to reject, licensing stance, "judges never generates"); the agent wrote
most of the code and every session starts by reading the four state files; the
DECISIONS log is where you can see who decided what — it already records
"owner" vs "engine" on every entry. Keep it factual, no defensiveness.

## 6. "Start here" — three files to open

15k lines is too many to read. Add a short "If you read three files" pointer
list in the README. Suggested: the 7-3 resolution detector (a complete detector
end to end), DECISIONS 2026-09-02 "Fitted segmentation weights rejected" (the
logistic regression that beat the hand-tuned weights on corpus F1 and was
rejected on the owner's brackets — the best story in the repo), and the agent
verdict types (the judges-never-generates contract in code). Confirm the exact
paths before linking.

## 7. Say what the ML is, accurately

Nowhere in the README does the logistic-regression evaluation appear. Add two
or three sentences under "How it works" or a new "Evaluation" heading: the
engine is deterministic; segmentation is scored against the Weimar Jazz
Database (456 solos) and the owner's own annotations; a logistic model fitted
on ~18k gaps reached higher corpus F1 than the shipped weights and was rejected
because it failed the owner's brackets (link the decision). Do not call the
project "machine learning" — call it evaluation-driven; let the fitted model be
the concrete example. Pull every number from the DECISIONS entry, not from memory.

## 8. Repo hygiene (quick)

- Repo description and topics on GitHub: music-information-retrieval, musicxml,
  jazz, typescript, vite, anthropic. Michael sets these in the GitHub UI; remind him.
- Confirm `dist/` is ignored and not committed.
- A LICENSE file if there isn't one (Michael to choose; MIT is the default
  suggestion — note that the corpus-derived statistics in `goldens/` carry their
  own attribution note already).

Order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Items 1 and 2 are the ones that matter
if time is short.
