# Third fidelity review: Two Pizzas against the Scrum Guide (2020), Kanban Guide v2025.5, Agile Manifesto

Read-only. Score: **9/10** (first review 7, second 8).

Method and limits. I re-read the phase cards (EN and RO), every key that changed, the screens that render them (`Card.tsx`, `RetroHelp.tsx`, `Parts.tsx`, `Delivery.tsx`, `Flow.tsx`, `Summary.tsx`, `Retro.tsx`), the dictionary test, and `core/machine/scoring.ts` and `views.ts`, then went once through the whole English dictionary again for claims about Scrum or Kanban. The guides were not re-fetched: the first review's fetches (2026-11-16) cover every quote here; guide wording not marked "(fetched)" is from memory. The screenshots in `.qa/copy/` are fresh: `en.ts` and `ro.ts` were last written at 12:21, the PNGs at 12:23 to 12:36. I looked at the Scrum Sprint Review card (EN 1280 px, RO 390 px) and the Kanban Replenishment card (EN 1280 px); I did not open every screenshot.

## 1. Status of each finding of the second report

| Id | Status | Evidence (key, current text) |
|---|---|---|
| N1 Sprint starts after Planning | **Fixed** | `commit.start` "Start the work", `commit.minimum` "Select at least one item to start the work.", `commit.waitingStart` "Waiting for the {role} to start the work.", `script.scrum.plan.commit.3` "Start the work when the team agrees on what it can finish.", `script.scrum.work.card.1` "Read the purpose aloud, then begin the work part of the Sprint." RO: "Începeți lucrul", "partea de lucru a Sprint-ului". The one remaining "starts the Sprint" is the Guide's sentence in `phase.scrum.plan.purpose` (see P2). |
| N2 Sprint Goal vs engine | **Fixed** | `goal.note` "...it measures the goal by one rule: every item of the theme, selected or not, must be done with a right answer."; `goal.hint` "...To meet it, the team must select and finish every item of the theme."; `commit.hint` "...To meet the goal, select every item of the theme..."; `work.goalProgress` "...are Done on the board. The Sprint Review checks the answers." Matches `scoring.ts:23-29` (every item of the theme in `state.items` has `status === 'done'` and `outcome === 'accepted'`) and `goalView` (counts `done` only). RO equivalent. |
| N6 PO outside the Scrum Team | **Fixed** | `phase.scrum.inspect.role.productOwner` "...In real Scrum there is no acceptance step: the Scrum Team, its Product Owner included, shows the Increment (work that meets the Definition of Done) to the stakeholders." (Guide: the Scrum Team presents the results of its work to key stakeholders.) `phase.scrum.work.role.productOwner` "...is not involved while the Developers work. A real Product Owner is available to them." |
| N3 / U4 WIP note in Scrum | **Fixed** | `RetroHelp.tsx` shows `agreement.wip_limit.scrumNote` when the overload question or a `.wip` proposal is present in a Scrum game; `Parts.tsx` does so for `work.wipLow`/`work.wipHigh`; `Retro.tsx:302` next to the agreement. |
| N7 Round 1 on purpose on the board | **Fixed, one side effect** | `board.noLimits` "No WIP limits in this round (round 1 has none on purpose). Kanban asks a team to control work in progress." Side effect: see N8. |
| N5 throughput proposal | **Fixed** | `retro.help.p.went_well.throughput` "We finished more items than in round 1." (matches `throughput = verdictItems.length`). |
| N4 averages only | **Open (polish)** | `kanban.metric.cycleTime.text` and the comparison still give the average and median; the Service Level Expectation appears only on `phase.kanban.inspect.practice`. |
| Kanban retro mistake | **Fixed** | `phase.kanban.retro.mistake` "Listing complaints without choosing any improvement." |
| Work-card PO wording | **Fixed** | see N6. |
| RO `item.status.rejected` | **Fixed** | "Răspuns greșit (escaped defect)", same as the verdict label. |
| Card length | **Fixed** | Every card row is at most two sentences (test); on screen the cards read in about fifteen seconds (see section 3). |
| Dictionary test | **Fixed, small gaps** | See section 4. |

All earlier findings of the first report keep the status given in the second report; none has regressed.

## 2. New findings

### Misleading

**N8. `board.noLimits` is reused in places where the "round 1 on purpose" clause does not fit.**
- Used in `Flow.tsx:96` (board header), `Delivery.tsx:55` and `:185` ("Limits in round 2: ..."), and `Summary.tsx:52` (each iteration's "WIP limits" cell).
- In round 2, a team that sets no limits (`limits.startWithout` warns "round 2 would run like round 1") reads "No WIP limits in this round (round 1 has none on purpose)". That says the absence is deliberate design, when in round 2 it is the team's choice. The summary and delivery lines also repeat the two-sentence text in a table cell.
- The Guide (Kanban Guide, Practices): "Kanban system members must explicitly control the number of work items in a workflow from started to finished" (fetched).
- Fix: two keys. Round 1: "No WIP limits in round 1, on purpose." Round 2 (and the cells): "No WIP limits set. Kanban asks a team to control work in progress." Use the round-1 variant only where the iteration is 1. Same in Romanian.

### Polish

- **P1. `phase.scrum.work.practice`** now reads "The Scrum Guide has the team write its own [Definition of Done]". The Guide (Increment): if the Definition of Done is an organizational standard, all Scrum Teams follow it as a minimum; otherwise the Scrum Team creates one. Fix: "The Scrum Guide has the team write its own, unless the organization has a standard, describing the quality an Increment must have; ..." (still two sentences). RO the same.
- **P2. `phase.scrum.plan.purpose`** "Sprint Planning starts the Sprint by laying out the work..." is the Guide's wording ("initiates the Sprint"), but next to `phase.scrum.work.purpose` ("The Sprint contains all the other events") a beginner may read a contradiction. Optional fix: "Sprint Planning kicks off the Sprint's work by laying out..." or keep the Guide's word and add nothing; the test rightly exempts it.
- **P3. The two-sentence test can be gamed with semicolons.** `phase.scrum.work.practice`, `phase.scrum.daily.practice` and `phase.kanban.work.practice` each hold two sentences with a semicolon or colon making them long (about 40-50 words). Fine for now; tighten the test to a word limit (for example 45 words per row).
- **P4. "Customers" and "stakeholders".** `inspect.feedback.title` and `step.scrum.inspect.feedback` say "customers"; the Guide's word for Review attendees is "stakeholders" (the Review card uses both). Acceptable as the game's word, but one clause would remove the doubt: "the customers (the Guide says stakeholders)".
- **P5. The Kanban cards still label the clock "Timebox: 6 minutes"** (`phase.timeboxLabel`). The sentence beneath ("The Kanban Guide has no timebox") disarms it. Optional: label "Clock" on Kanban cards.
- N4 above (open).

## 3. Phase cards in the screenshots

- Scrum Sprint Review (EN 1280 and RO 390): purpose, timebox box, three role rows, "Good to know" and the fold ("In real life · Typical mistake") fit one screen on desktop and about two on a phone; the longest row (Product Owner, 41 words) takes five lines. The "Good to know" note is visible without opening anything. Readable in about fifteen seconds.
- Kanban Replenishment (EN 1280): "The Kanban Guide has no timebox." under the 6-minute box; the facilitator row "The Kanban Guide defines no roles: this one is the game's."; "Good to know: The Kanban Guide asks a team to define and visualize its workflow, manage the items in it actively and improve it. A real team sets its own columns and policies (its Definition of Workflow); a numeric WIP limit and this meeting are common practices." Complete and accurate.
- Nothing was lost in trimming that matters: every Scrum practice note still names the Scrum Guide; every Kanban card still names the Kanban Guide in its practice or real-life line. The one detail dropped is "here: Ready, In Progress, Review, Done" from the Kanban plan note; the board shows it, so this is acceptable.

## 4. The dictionary test

It now covers: no "soft/flexible timebox"; no reject/accept family (allows "acceptance step" because the pattern needs `accept(ed|s)?`); no "three roles"; no "Development Team", "three questions", "ceremon"; no "commit/commitment" in values; bare "demo" only in `phase.scrum.inspect.aka`; no "pull into/items"; no "start/begin the Sprint" except before Review, Retrospective, Planning, Goal, Backlog and in `phase.scrum.plan.purpose`; and positive checks (Scrum practice notes name the Scrum Guide, Kanban cards name the Kanban Guide, poker and velocity lines carry the disclosure, the goal rule, the WIP-from-Kanban note, the soft-timebox pair, and the two-sentence limit). That is the right list. Gaps:
1. A word limit instead of sentence count (P3).
2. No check that `board.noLimits` is not shown in round 2 with a round-1 clause (needs the N8 split).
3. No ban for "pull" in Scrum values beyond "pull into/items" (for example "pull a goal"): negligible.

## 5. Romanian fidelity

I read the Romanian text of every key that changed this round (commit and work-start keys, goal rule keys, `work.goalProgress`, Review and plan Product Owner rows, work card, practice notes, `board.noLimits`, throughput proposal, `item.status.rejected`, Kanban retro mistake) and the card rows on screen. Each says what the English says; technical terms stay in English. Nothing claims more or less than the Guide. Language quality is out of scope.

## 6. End-to-end pass of both dictionaries

Went through all of `en.ts` again for anything the guides do not support. Nothing new that is wrong. Residuals are P1-P5 and N4 above. Points confirmed faithful:
- Events, durations, purposes, the Sprint as container, "no acceptance step", the Scrum Master and Product Owner descriptions as honest game simplifications, the Definition of Done defined once as the game's own, the Kanban practices, the Definition of Workflow, the four flow metrics and the Service Level Expectation example, the "no roles, meetings, iterations or timebox" statements, the disclosure notes outside the fold, "Right answer" / "Wrong answer" consistent, the Scrum-only metrics (velocity, estimates) kept out of Kanban, the tour and its Kanban variants, privacy `p1`-`p6`, lobby lock and remove texts, and the leaderboard note.
- The goal rule against `scoring.ts`: exact, including that items not selected, returned items and feedback items count.

## 7. Could not check

- Verbatim guide text beyond the first review's fetches.
- Every screenshot (opened three; the rest are the same cards in other phases and widths).
- Every Romanian observation and puzzle key that did not change.

## 8. Score: 9/10

The model of both frameworks is honest, every disclosure is where the reader sees it, the goal rule matches the engine, and the cards read quickly. What remains is polish.

To reach 10:
1. N8: split `board.noLimits` into a round-1 and a "no limits set" variant (EN and RO).
2. P1: mention the organizational Definition of Done standard.
3. N4: show a Service Level Expectation line next to the cycle-time average on the delivery screen.
4. P3-P5: word limit in the test, "customers (stakeholders)" and the Kanban "Clock" label.
