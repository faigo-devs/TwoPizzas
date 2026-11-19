# Second fidelity review: Two Pizzas against the Scrum Guide (2020), Kanban Guide v2025.5, Agile Manifesto

Read-only. Score: **8/10** (first review: 7/10).

Method and limits. I read all of `app/i18n/en.ts` (1004 lines) and the Romanian keys for every English key that changed, `app/i18n/test/dictionaries.test.ts`, `app/game/screens/{Card,Summary,Retro,Plan,Inspect,Delivery}.tsx`, `app/game/tour/*`, and the engine (`core/machine/scoring.ts`, `views.ts`, `inspect.ts`). I did not re-fetch the guides: the first review's fetches (2026-11-16) cover every quote used here. Guide wording not marked "(fetched)" is from memory, unverified verbatim. The screenshots in `.qa/copy/` are older than the last edit of `en.ts` (screenshots 07:19 to 07:28, `en.ts` 11:45); the Kanban replenishment shot still shows the old facilitator row and the Scrum soft-timebox sentence, which `Card.tsx` no longer selects for Kanban (it uses `phase.ends.soft.kanban`). So I judged card length from the text and `Card.tsx`, and I could not verify the current visual result.

## 1. Status of each finding of the first report

| Id | Status | Evidence (key, current text) |
|---|---|---|
| W1 Sprint as container | **Partly** | Fixed: `phase.scrum.work.name` "Sprint: the work"; `.purpose` "The Sprint contains all the other events. Here it is the time in which the Developers work on the Sprint Backlog toward the Sprint Goal."; `.real` "One month or less, fixed length. Sprint Planning, the Daily Scrum, the Sprint Review and the Sprint Retrospective all happen inside it."; the Sprint is the first of five events on the sheet (`Summary.tsx` `ScrumEvents`). Still open: see N1 ("Start the Sprint" at the end of Planning). |
| W2 soft timebox | **Fixed** | `phase.ends.soft` "In this game the clock keeps running after the time is up, and the overrun is recorded. In Scrum an event ends within its timebox."; `.soft.kanban` "...The Kanban Guide has no timebox."; `timer.soft` "Counting down", `timer.overtime` "Over by", `a11y.overtime` rewritten. `Card.tsx:47` picks the Kanban variant. |
| W3 accept/reject | **Fixed** (wording) | `phase.scrum.inspect.role.productOwner` "The game checks each finished item's answer... In real Scrum there is no acceptance step: work that meets the Definition of Done is the Increment..."; `inspect.verdict.accepted` "Right answer", `.rejected` "Wrong answer (escaped defect)". No user-visible text still says accept or reject (grep of both dictionaries and `app/game`, `app/ui`: only key and type names remain). One new wording problem: N6. |
| W4 Product Owner absent | **Fixed** | `phase.scrum.plan.role.productOwner` "...In real Scrum a person is the Product Owner: available during the Sprint to clarify items and negotiate scope, and present at the Sprint Retrospective."; `phase.scrum.retro.role.productOwner` "...In real Scrum the Product Owner takes part in the Sprint Retrospective."; `.work.role.productOwner` "...stays out of the way". Romanian matches. |
| W5 roles | **Fixed** | `start.framework.scrum.line` "Sprints, five events and three accountabilities, as in the Scrum Guide." (RO "trei responsabilități"). The "role" UI word remains as the game's own term; acceptable. |
| W6 Kanban round 1 | **Fixed** | `start.framework.kanban.line` "...round 1 without control of work in progress, round 2 with it."; `limits.none` "Round 1 has no WIP control on purpose, so you can see what uncontrolled work does. Kanban asks a team to control it."; `phase.kanban.work.practice` ("before" picture); `phase.kanban.work.purpose` "...learns to keep work in progress under control (from round 2 the game enforces it)". |
| U1 disclosure in fold | **Fixed** | `Card.tsx`: `note={{label: practiceLabel, text: practice}}` is outside the fold; the fold now holds only "In real life" and "Typical mistake". |
| U2 poker | **Fixed** | `poker.note` "Planning poker and these numbers are a common practice, not part of the Scrum Guide. The numbers are the team's own: talk first, then vote." |
| U3 velocity | **Fixed** | `poker.velocity` "(common practice, not in the Scrum Guide)"; `script.scrum.plan.commit.2` "Velocity is a common practice, not in the Scrum Guide; from one Sprint it is a weak forecast."; both `observation.plan.overcommitted/fitsVelocity` texts carry the note; `commit.hint`, `inspect.velocityNote` too. |
| U4 WIP limit in Scrum | **Partly** | `agreement.wip_limit.scrumNote` "A WIP limit comes from Kanban; a Scrum team may adopt it as its own agreement." is shown only beside the radio option (`Retro.tsx:302`). Still unmarked in Scrum: `retro.help.q.overload`, `retro.help.p.try.wip` ("Keep at most {suggested} items In Progress."), `observation.work.wipLow/wipHigh` (praise or warn about WIP with no note). |
| U5 Kanban roles | **Fixed** | `phase.kanban.plan.real` "The Kanban Guide defines no roles, meetings, iterations or timebox. The facilitator, the customer's verdicts, the meetings, the two rounds and the clock are this game's way...", `phase.kanban.plan.role.facilitator` "...The Kanban Guide defines no roles: this one is the game's.", `lobby.facilitatorHint.kanban` "...The Kanban Guide has no such role." Note: `.real` is inside the fold; the unfolded copies are the facilitator row, the lobby hint and `phase.ends.soft.kanban`. |
| U6 "no timebox" vs clock | **Fixed** | `phase.kanban.work.real` "Kanban has no timebox. This game gives each round a clock so a session fits in under an hour." |
| U7 escaped defect, Kanban walk | **Fixed** (core) | `inspect.verdict.rejectedText` / `rejectedTextKanban` gloss it ("a mistake that slipped past the review (a common term, not from either guide)"); `phase.kanban.daily.practice` "Walking the board from the right is this game's rule; it serves the Guide's advice not to let items age unnecessarily." The label is not glossed again in `summary.defects`, `leaderboard.defects`, `kanban.metric.defects`: acceptable, it appears after the gloss. |
| U8 "the demo" | **Fixed** | `phase.scrum.inspect.aka` "the demo (not the Guide's word: the Review is a working session, not a presentation)"; daily and retro "(a nickname, not the Guide's name)". |
| O1 commit | **Fixed** | "Selecting", "More work selected than last time", "enough to choose the Sprint's work". Only key names keep "commit". |
| O2 pull | **Fixed** | `commit.pull` "Select for the Sprint", `step.scrum.plan.commit` "Select items for the Sprint Backlog". |
| M1 Sprint Goal | **Partly** | Fixed: `goal.option` "Make the {theme} theme work end to end"; `goal.note` "A real Sprint Goal is an objective, not a list: the exact items may change during the Sprint. The game measures it by whether every item of the theme is done." New problem: N2 (what the engine actually measures). |
| M2 DoD | **Fixed** | `phase.scrum.work.practice` "In this game the Definition of Done is: reviewed by someone who did not work on the item. Real teams write their own, describing the quality an Increment must have."; `phase.kanban.work.role.team` "...the Review step is an explicit policy of the team's workflow." Residual polish: `tour.7.text` still says "An item is done only when someone who did not work on it says LGTM" without "in this game". |
| M3 Scrum Master | **Fixed** | `phase.scrum.plan.role.scrumMaster` "Here the Scrum Master presses the buttons for the Developers' decisions. In real Scrum the Developers decide, and the Scrum Master makes sure the events take place and stay within the timebox." |
| M4 weak forecast | **Fixed** | `inspect.velocityNote`, `commit.hint`, script line. |
| M5 metrics | **Fixed** (polish left) | `kanban.metric.wip.text` "Items started and not yet finished. Highest in the round: {value}."; `throughput.text` "Items finished per round"; `cycleTime.text` "Time elapsed from the start to the finish of an item. Average: {value}."; `age.text` "Time elapsed since an item that is still open was started."; SLE example on `phase.kanban.inspect.practice`. The screens still show averages and medians only; the SLE appears only as a sentence on the card. |
| M6 three practices, DoW, SLE | **Fixed** | `phase.kanban.plan.practice` "Kanban asks a team to define and visualize its workflow, actively manage the items in it and improve it. A real team defines its own columns and policies (its Definition of Workflow); here: Ready, In Progress, Review, Done. A WIP limit as a number and this meeting are common practices." |
| M7, M8, M9 | **Fixed** | `phase.scrum.daily.practice` (once per Sprint; any player may end it; walk from the right); `observation.daily.planUnchanged.*` "No change was made. That is fine if none was needed." |
| Typical mistakes | **Fixed** (Scrum), **partly** (Kanban) | Scrum: plan "Selecting more work than the Developers can finish."; sprint "Ending the Sprint with items started but none meeting the Definition of Done."; daily "...status report for a manager or the Scrum Master..."; review "Treating it as a presentation to applaud instead of a working session..."; retro "Listing complaints without choosing any improvement." Kanban retro keeps "...or choosing so many that none of them gets tried" (common practice, not from the Guide; polish). |
| Learning goal | **Fixed** | Sprint on the sheet with purpose, duration and mistake; `summary.learned.kanban` "The Kanban Guide prescribes no events. You tried meetings that teams commonly hold, and the four flow measures the Guide names..."; `summary.learnedTitle.kanban`. `tour.8.text` and `.kanban` variants. |
| Sources | **Fixed** | `sources.ts` RO Manifesto title "Manifestul pentru dezvoltarea agilă de software"; links unchanged and correct. |

## 2. New findings

### Misleading

**N1. The Sprint still "starts" at the end of Planning.**
- Keys (EN and RO): `commit.start` "Start the Sprint", `commit.minimum` "Select at least one item to start the Sprint.", `commit.waitingStart`, `script.scrum.plan.commit.3` "Start the Sprint when the team agrees on what it can finish.", `script.scrum.work.card.1` "...then begin the Sprint.", RO `commit.start` "Porniți Sprint-ul".
- Guide (Scrum Events, the Sprint): Planning happens inside the Sprint; the Sprint starts when the previous one ends. These strings contradict the corrected cards.
- Fix: "Start the work" / "Select at least one item to start the work." / "Start the work when the team agrees on what it can finish." / "Read the purpose aloud, then begin the work part of the Sprint." Same in Romanian.

**N2. The Sprint Goal copy does not say what the engine measures.**
- Engine: `core/machine/scoring.ts:23-29`: the goal is met when every item of the theme anywhere in `state.items` is `done` and `accepted` (right answer). That includes items the team did not select for the Sprint, items returned to the backlog and the feedback items. `views.ts goalView` (shown as `work.goalProgress`) counts `status === 'done'`, so LGTM-done items, including wrong ones.
- Copy: `goal.note` ends "...whether every item of the theme is done"; `observation.inspect.goalMet.text` says "done with a right answer"; `goal.note` says the exact items "may change during the Sprint" while the game scores a fixed set of the whole theme.
- Effect: a team that selects fewer than all theme items cannot meet the goal, and the game never says so. The Guide's point (scope may be renegotiated) is stated and then contradicted by the mechanic.
- Fix: `goal.note` = "A real Sprint Goal is an objective, not a list, and the exact items may change during the Sprint. To keep the game simple it measures the goal by one rule: every item of the theme, selected or not, must be done with a right answer." Add to `commit.hint` or `goal.hint`: "To meet the goal, select every item of the theme." Make `work.goalProgress` say "Done on the board (a right answer is still needed)". Same in Romanian.

**N6. The Product Owner is described as outside the Scrum Team.**
- `phase.scrum.inspect.role.productOwner`: "...the Product Owner, a person, discusses it with the Scrum Team and the stakeholders."
- Guide: the Product Owner is a member of the Scrum Team, and the Scrum Team presents results to the stakeholders.
- Fix: "...the Scrum Team, whose Product Owner is a person, presents the Increment to the stakeholders and they discuss it." Same in Romanian.

### Undisclosed practice

**N3. The WIP note is incomplete in Scrum.** `retro.help.q.overload`, `retro.help.p.try.wip` and `observation.work.wipLow/wipHigh` carry no "from Kanban" note (rest of U4). Fix: one short tag on the help proposal, for example "(a WIP limit comes from Kanban)".

**N7. The Kanban round 1 "before" disclosure is in two places only.** The "not Kanban without WIP control" statement is in `limits.none` and `phase.kanban.work.practice`; the Round 1 board shows only `board.noLimits` "No WIP limits in this round." Fix: `board.noLimits` = "No WIP limits in this round, on purpose. Kanban asks a team to control work in progress."

### Polish

- **N4. `kanban.metric.cycleTime.text` and the comparison use averages.** The Guide asks for a Service Level Expectation from cycle times, for example "85% of work items will be finished in eight days or less" (fetched). The game teaches the average. Fix: add the SLE sentence to `delivery` or `kanban.metrics` as well as the card.
- **N5. `retro.help.p.went_well.throughput`** says "We finished more items than in round 1: {accepted} with a right answer." while the metric is `throughput = verdictItems.length` (all finished items, including escaped defects). Fix: use the finished count, or say "finished" without "with a right answer".
- **Kanban retro mistake** `phase.kanban.retro.mistake`: drop "or choosing so many that none of them gets tried", as done for Scrum.
- **`phase.scrum.work.role.productOwner`** "stays out of the way": the Guide has the Product Owner available to the Developers; the plan card says so once. Better "is not involved while the Developers work (a real Product Owner is available to them)".
- RO `item.status.rejected` "Defect scăpat" against `inspect.verdict.rejected` "Răspuns greșit (escaped defect)": use the same term in both.
- `phase.ends.hard` is formatted `'phase.ends.hard':'...'` without a space after the colon (style only).

### Length of cards in a timed game

Longest rows now (words): `phase.scrum.inspect.role.productOwner` about 55, `phase.kanban.plan.practice` about 62, `phase.kanban.plan.real` about 50 (in the fold), `phase.scrum.plan.role.productOwner` about 48, `phase.scrum.plan.role.scrumMaster` about 38. The facilitator reads the card once per event, so this is tolerable but at the edge. Cut each row to two sentences: the game's rule first, "In real Scrum..." second. The screenshots in `.qa/copy/` are out of date, so a re-shoot is needed to judge the real layout.

## 3. Romanian fidelity

I read the Romanian text of every changed key (cards, practices, goal, verdicts, metrics, tour, privacy, leaderboard, summary, lobby lock and kick). Every Romanian sentence says what the English one says; technical terms stay in English. Findings are only: `phase.kanban.inspect.practice` says "Ghidul" where the rest says "Kanban Guide" (harmless); `phase.kanban.work.practice` RO "nu are control al WIP intenționat" is awkward (language reviewer's job); `item.status.rejected` (above). Every fix proposed above needs the same change in the Romanian key.

## 4. The dictionary test (`app/i18n/test/dictionaries.test.ts`)

The "wording the fidelity review removed does not come back" test bans: `soft timebox`, `accepts or rejects`, `three roles`, `commit/committed` (outside `commit.*` keys), `the demo` not followed by " (", Romanian `timebox flexibil`, `acceptă sau respinge`, `trei roluri`. It is the right core and it passes on today's text. Gaps:
1. No ban on the root of W3: add `/\breject(ed|s)?\b/i` and `/\baccept(ed|s)?\b/i` for EN values (allow the phrase "acceptance step" with a negative lookahead) and `/respins/`, `/acceptă/` for RO.
2. No ban on other known 2017 or non-Guide wording: `/development team/i`, `/three questions/i`, `/ceremon/i`, `/\bpull(ed)? (into|items)/i` in Scrum keys, and a bare `/\bdemo\b/` outside `phase.scrum.inspect.aka`.
3. The test only forbids; it never requires the disclosures. Add positive assertions: every `phase.scrum.*.practice` that mentions poker, points or velocity contains "Scrum Guide" (RO the same); `poker.note`, `poker.velocity`, `commit.hint`, `inspect.velocityNote` contain "Scrum Guide" (or "weak forecast"); every `phase.kanban.*.real` or `.practice` contains "Kanban Guide"; `phase.ends.soft` contains "Scrum" and `phase.ends.soft.kanban` contains "Kanban Guide".
4. Add the N1 string: `commit.start` and `commit.minimum` must not contain "Sprint" once the fix is applied (`/start the sprint/i` on non-`commit.`... keys needs an exception only for the key names).

## 5. Checked and faithful

- Numbers and purposes: 8 h, 15 min, 4 h, 3 h, one month or less; the four purpose sentences; the Sprint as fixed-length container; the Daily Scrum belonging to the Developers; "The Scrum Guide prescribes no fixed questions".
- Kanban: the three practices, Definition of Workflow, the four flow metrics (defined as in the Guide), the SLE example; "no meetings, iterations, roles or timebox" stated; WIP control framed as the Guide's ("Kanban asks a team to control it").
- Disclosures sit outside the fold on every phase card, on the poker screen, the velocity lines, the WIP agreement (Scrum), the goal selection and the verdict texts.
- No user-visible "accept/reject" remains; "Right answer" / "Wrong answer" agree across cards, sheet, observations, retro helper, accessibility strings and Romanian.
- Solo tour: `tour.1`-`tour.8` and the closing panel are faithful; `tour.2.text.kanban` and `tour.8.text.kanban` correct the Scrum wording for Kanban ("meetings that teams commonly hold... the four flow measures of the Kanban Guide"); `tour.end.text` "45 to 60 minutes" matches the learning-goal framing.
- Kanban screens: `replenish.*`, `limits.*` (`limits.practice` "A limit as a number per column is a common practice."), `delivery.*`, `board.*` arrival and limit texts, `kanban.*`, and the Kanban helper questions make no claim beyond the Guide or the game.
- Privacy `p1`-`p6`, lobby lock, kick and "seat open elsewhere", and `leaderboard.note` make no statement about Scrum or Kanban.

## 6. Could not check

- The current rendering and length of the cards (screenshots older than the last copy edit).
- Verbatim guide text beyond what the first review fetched.
- Every Romanian observation and puzzle key (read only the keys that changed and the sampled ones).

## 7. Score: 8/10, and what stands between it and 9

The model of both frameworks is now honest, every disclosure sits where the reader sees it, and the learning goal can be met from the sheet. What is left is two mismatches between copy and mechanics, one residual model error and some loose ends.

To reach 9:
1. N1: stop saying the Sprint starts after Planning (6 strings, EN and RO).
2. N2: say what the Sprint Goal really measures (every theme item, selected or not, done with a right answer) and drop or qualify "the exact items may change" for the game; fix `work.goalProgress`.
3. N6, N3: the Product Owner sentence in the Review card; the Kanban note on the WIP proposals in Scrum.
4. The test: add the reject/accept and 2017-wording bans and the positive disclosure checks.
5. Re-shoot `.qa/copy/` and trim the three longest card rows.
