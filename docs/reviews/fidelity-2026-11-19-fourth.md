# Fourth fidelity review: Two Pizzas against the Scrum Guide (2020), Kanban Guide v2025.5, Agile Manifesto

Read-only. Score: **8/10** (third review 9/10).

Method and limits. I read all 121 `learn.*` keys in `en.ts` and `ro.ts`, `app/game/learn.ts`, `app/game/screens/Learn.tsx`, `app/ui/Check.tsx`, `app/ui/Phase.tsx`, `app/game/screens/Card.tsx`, the tour steps (`app/game/tour/steps.ts`), and the changed `start.*`, `tour.*`, `pause.*`, `privacy.*`, gloss and status keys in both languages. I looked at the current Scrum card (`.qa/micro/scrum-en-1280-card-3.png`) and two older Kanban tour shots (`.qa/tour2/`, taken before the fold and objective changes: they show the roles unfolded, so I used them only for tour copy). I did not re-fetch the guides: the first review's fetches (2026-11-16) cover every quote here (Planning at most 8 h, Daily 15 min, Review at most 4 h, Retrospective at most 3 h, Sprint one month or less; Review "a working session"; the four Kanban metrics and the Service Level Expectation; "prescribes no meetings"). Anything else is from memory and marked.

## 1. Findings by severity

### Misleading

**F1. The phase card now hides the real duration and the scale note behind the fold.**
- Visible on the card (`Phase.tsx`): the learning objective, purpose, the timebox box ("Timebox 4 minutes" plus `phase.ends.*`), Begin, and "Good to know". Folded under "Roles, real life, typical mistake": the roles, `phase.scale` ("In this game: 4 minutes, a scale model of the real event. A timebox is the longest time an event may take.") and `.real` ("At most eight hours for a one-month Sprint..." / "One month or less, fixed length...").
- Effect: a beginner who never opens the fold reads "Timebox: 6 minutes" for Sprint Planning and "4 minutes" for the Sprint, and the visible `phase.ends.soft` ("In Scrum an event ends within its timebox") does not say what the real timebox is. The real duration is the second of the three things the learning goal asks a beginner to state (purpose, duration, typical mistake). It remains on the summary sheet and, for Planning only, in a check question (see F2), but the card is where a beginner meets it. The gloss "A timebox is the longest time an event may take" (accurate: Guide, Scrum Events, timeboxes are maxima) is folded too.
- Guide (Scrum Events, fetched): Sprint Planning at most 8 hours, Daily Scrum 15 minutes, Sprint Review at most 4 hours, Retrospective at most 3 hours, Sprint one month or less.
- Fix: show one line under the timebox box on every Scrum card, outside the fold: `phase.scrum.<event>.real` as it is ("In real life: at most eight hours for a one-month Sprint"), and move the timebox gloss next to it. For Kanban cards show the `.real` line (e.g. "The Kanban Guide prescribes no meetings and no timebox."). The roles and the typical mistake can stay folded. Same in Romanian.

**F2. The check questions do not cover the durations the learning goal names.**
- Question sets: duration is asked only in `learn.scrum.plan.2` (8 hours). The Daily Scrum's 15 minutes appears only in the `why` of `learn.scrum.daily.1`; the Review (4 hours), the Retrospective (3 hours) and the Sprint (one month or less) are asked nowhere. Because the variant is chosen by `(seed + iteration) % 2`, a team sees one of two sets per event per iteration, so it will see at most the two sets of each event over the two iterations; for Review and Retrospective neither set has a duration.
- Fix: make one set per event carry the duration: Review "How long can a Sprint Review take for a one-month Sprint?" (ok "At most four hours"; no "At most fifteen minutes", "At most two days"), Retrospective ("At most three hours"), Daily ("A 15-minute event"), Sprint ("One month or less"). Keep the `why` as "That is the Scrum Guide's timebox; this game uses minutes as a scale model." Same in Romanian.

**F3. The Kanban "What does a WIP limit do?" question can be asked in round 1, before the game has shown a limit.**
- Key: `learn.kanban.work.2`. `buildQuestion` picks the variant from `(seed + iteration) % 2`, so after round 1's Flow the team may get this set, when round 1 has no limits and the only mention is in `phase.kanban.work.practice`. `limits.explain` appears only in round 2's planning.
- Effect: a question about something the game has not yet taught.
- Fix: pin Kanban `work` variant 1 to round 1 and variant 2 to round 2 (or swap the two sets so the round-1 question is about "Starting before finishing"). Alternatively ask the WIP question after round 2 only.

### Undisclosed practice

**F4. Disclosures that sit only in the fold.**
- `phase.kanban.plan.role.facilitator` ("The Kanban Guide defines no roles: this one is the game's."), `phase.kanban.plan.real` ("The Kanban Guide defines no roles, meetings, iterations or timebox...") and `phase.scrum.inspect.role.productOwner` ("In real Scrum there is no acceptance step...") are now behind the fold. My earlier finding U1 asked for the practice note outside the fold, and that is still satisfied: `Card.tsx` keeps `note` ("Good to know") outside and the practice notes still name the Scrum Guide or the Kanban Guide (checked in `en.ts` and `ro.ts`). But a Kanban team that never opens the fold sees a "facilitator" and a "customer" with no sentence saying the Guide has neither.
- Mitigation that exists: `lobby.facilitatorHint.kanban` ("...The Kanban Guide has no such role."), `phase.ends.soft.kanban` ("The Kanban Guide has no timebox.").
- Fix (small): add the roles clause to the visible `phase.kanban.plan.practice` ("...the Kanban Guide defines no roles; the facilitator and the customer are this game's") and keep the two-sentence limit by dropping "and improve it" wording if needed. For Scrum the correction is acceptable in the fold because the verdict screens use "Right answer / Wrong answer".

**F5. The tour does not say, for Kanban, that the retrospective and the vote are a common practice, nor, for Scrum, that walking the board from the right is the game's rule.**
- `tour.note.text` ("The team looks back. Everyone writes notes in private, in three columns...") and `tour.vote.text` are shared by both tours; `tour.daily.text` (Scrum) says "The clock stops and the team walks the board from the right...". Kanban's daily is labelled ("The Kanban Guide prescribes no meetings, but many teams hold a short daily at the board."), the Kanban retrospective is not. The real-game cards carry the notes; the tour does not show the card for those steps.
- Fix: add a Kanban variant `tour.note.text.kanban` ("A retrospective is a common practice, not something the Kanban Guide prescribes. The team looks back. ...") and add to `tour.daily.text`: "In the Scrum Guide the Developers choose the structure; walking the board from the right is this game's rule." Same in Romanian.

### Polish

- **P1. "After this event you will know..." for Kanban.** `learn.kanban.*.goal` and RO "După acest eveniment" call Replenishment, the daily, the delivery review and the retrospective "events"; the Kanban Guide prescribes no events (and `summary.learned.kanban` says "meetings"). Fix: "After this meeting you will know..." for `plan`, `daily`, `inspect`, `retro`, and "After this round you will know..." for `work`; RO "După această întâlnire", "După această rundă".
- **P2. `learn.kanban.work.1.q` "What comes first in Kanban?"** is broader than the Guide. The Guide says to control WIP, avoid unnecessary aging and "start new work only when there is clear capacity" (summary of the fetch; from memory in this wording). The reason correctly says "the typical mistake of the flow" (the card's words, not the Guide's), but the question reads as a Guide rule. Fix: "In a flow with work in progress under control, what comes first?" Same in Romanian.
- **P3. `learn.scrum.inspect.2.why`** "The Scrum Guide calls it a working session, not a presentation." The Guide's words are "a working session and the Scrum Team should avoid limiting it to a presentation" (the team does present its results to the stakeholders; from memory, consistent with the earlier fetch). Fix: "The Scrum Guide calls it a working session, not just a presentation." RO "nu doar o prezentare".
- **P4. Romanian register.** `learn.*`, `tour.*`, `start.*`, `privacy.*`, `pause.*` now use the informal singular ("vei ști", "Fă turul"); the repository's rule is the formal plural. A language matter, not fidelity; reported only because it conflicts with `CLAUDE.md`.
- **P5. Observation block on the tour's first Kanban step** shows "Planning stayed on time" (Replenishment) on a "Flow" card (screenshot `.qa/tour2/kanban-en-1280-idea.png`). The tour skips planning ("This tour skips choosing the first requests"), so the callout is scripted noise; `Card.tsx` already hides `Observations` in tour mode, so this may be an older screenshot.

## 2. The check questions and objectives, one line each

"Defensible wrong choice" means a beginner who is right could be marked wrong; I found one case (Q-work.1).

Scrum objectives (card purposes and typical mistakes):
- `learn.scrum.plan.goal` faithful (Planning lays out the work and a Sprint Goal). `.work.goal` faithful (Increment counts when Done). `.daily.goal` faithful (Developers inspect progress toward the Sprint Goal and adapt). `.inspect.goal` faithful ("determine future adaptations"). `.retro.goal` faithful ("plan ways to increase quality"; "not a list of complaints" is the card's typical mistake). All five match the `purpose` rows; the objective for Planning does not mention its typical mistake, which no question asks (acceptable).
- Kanban objectives: `plan` (game's term, labelled elsewhere as a common practice), `work` (game's "typical mistake"), `daily`, `retro` are common practices; `inspect` (the four metrics) is faithful to the Guide. Only the "event" wording (P1) is off.

Scrum questions:
- `plan.1` ("What does Sprint Planning lay out?") faithful; reason quotes the Guide ("initiates the Sprint by laying out the work to be performed").
- `plan.2` (eight hours) faithful; reason labels the scale model.
- `work.1` ("When does an item count as finished?" / Definition of Done) right answer faithful. **Problem:** choice `no1` "When a Developer says so" is defensible in this game, because in the game's own Definition of Done the reviewer is a Developer who says LGTM. A beginner who read the DoD card ("reviewed by someone who did not work on the item") may pick it and be marked wrong. Fix: `no1` "When the Developer who worked on it says so" (RO "Când Developer-ul care a lucrat la el spune că e gata").
- `work.2` ("typical mistake at the end of a Sprint") right answer faithful to the card; wrong choices are not defensible; the reason correctly cites the card ("as the card says"), not the Guide.
- `daily.1` (who the Daily Scrum is for: the Developers) faithful; reason quotes the Guide's 15-minute event for the Developers.
- `daily.2` (inspect progress toward the Sprint Goal and adapt the plan) faithful; the reason cites the Guide only for the purpose and the card for the mistake.
- `inspect.1` (the outcome of the Sprint) faithful; "Only the estimates" is not defensible.
- `inspect.2` ("working session about what to change") faithful; see P3 for the reason's wording.
- `retro.1` (ways to increase quality and effectiveness) faithful; "The items of the next Sprint" is not defensible as the Guide's purpose.
- `retro.2` ("How should a Retrospective end?" / an improvement to try) consistent with the purpose and the card; the reason says "the typical mistake" (the game's), not the Guide's. "With a new Sprint Goal" is not defensible.

Kanban questions:
- `plan.1` faithful and labelled ("A common practice, not in the Kanban Guide").
- `plan.2` ("Too much work in progress slows everything down") reason cites the Guide only for controlling the number of items started to finished (fetched); "slows everything down" is common knowledge, not the Guide's words; acceptable. The wrong choices are absurd rather than tempting, which is fine.
- `work.1` right answer defensible as the flow's rule; see P2.
- `work.2` ("What does a WIP limit do?") faithful and honestly labelled ("A numeric limit is a common practice"; the Guide does not use the phrase "WIP limit", fetched); see F3 for timing.
- `daily.1` ("closest to done first") labelled a game rule that serves the Guide's advice on aging; faithful.
- `daily.2` faithful and labelled a common practice.
- `inspect.1` faithful: WIP, throughput, work item age and cycle time are the four; velocity and story points are not in the Kanban Guide (fetched).
- `inspect.2` (cycle time: elapsed from started to finished) faithful to the Guide (fetched).
- `retro.1` faithful as a common practice; the reason cites the card's typical mistake.
- `retro.2` ("Is a retrospective part of the Kanban Guide?" No, a common practice) faithful: the Guide prescribes no meetings (fetched). The wrong choices ("Yes, every day / once a month") are implausible but harmless; the question tests the disclosure, which the game did teach.

Romanian text of all 121 `learn.*` keys: each says what the English says; technical terms stay in English; the glosses and reasons cite the Guide in the same places. (Register: P4.)

## 3. Language-review changes (glosses, statuses, partner)

- `puzzle.verdict.note` "LGTM means 'Looks Good To Me': you approve the answer. Request changes sends it back." accurate (RO matches).
- `phase.scale` "A timebox is the longest time an event may take." accurate (the Scrum Guide's timeboxes are maxima; the Daily Scrum is fixed at 15 minutes). It sits in the fold (F1).
- `phase.scrum.plan.practice` "Planning poker (the team votes on estimates with cards), story points (the unit of those estimates) and velocity are common practices, not part of the Scrum Guide." accurate.
- `phase.kanban.plan.purpose` "...how much work in progress (WIP) is allowed" accurate.
- Card statuses (`item.status.*`): "In Progress", "Review", "Done", "Blocked", "To do", "Backlog" in English in both languages; "Waiting for a partner" / "Așteaptă un partener" consistent with the new wording; no "second worker" remains in either dictionary.
- `phase.scrum.work.practice` (Definition of Done in the game, "In the Scrum Guide, the team writes its own, unless the organization has a standard") accurate (the third review's P1 is fixed).
- "Framework" kept in English in `start.frameworkLegend` and `privacy.p4`: fine.

## 4. Design-review changes

- Practice note outside the fold: yes, `Card.tsx` passes `note` and `Phase.tsx` renders it before the `<details>`; "Good to know" is visible on the current screenshot. The roles, the scale note, the real duration and the typical mistake are folded (F1, F4).
- Learning objective is rendered above the purpose; it matches the purpose row (section 2).
- Facilitator script is one line; no fidelity claim in it that I could see (`script.*` unchanged except where noted earlier).
- "Middle card": `poker.median` "Middle card", `poker.recordMedian` "Record the middle card: {value}", `poker.middleNote` "With an even number of votes, this is the higher of the two middle cards." Honest and covered by `poker.note` ("not part of the Scrum Guide"); RO "cea mai mare dintre cele două cărți din mijloc" matches.

## 5. Tour, start screen, pause, privacy

- Tour (14 steps in Scrum, 15 in Kanban): `steps.ts` adds the `limit` step only for Kanban, so no WIP-limit step reaches a Scrum tour. `tour.idea.skips` and `.kanban` say what the tour skips. `tour.right.text` and `tour.wrong.text` are accurate (the game does not say whether the answer is right; an LGTM on a wrong answer is the lesson; escaped defect glossed in the review text). `tour.review.text` ("Right answer, or Wrong answer when a wrong answer got an LGTM") agrees with the cards. Gaps: F5.
- Start screen: `start.framework.scrum.line` "Sprints, five events and three accountabilities, as in the Scrum Guide." and `start.framework.kanban.line` ("round 1 without control of work in progress, round 2 with it") are accurate. `start.tour.text` makes no framework claim.
- Pause (`pause.*`): no statement about Scrum or Kanban. Observation, not a finding: a pause that stops a Scrum event clock would have a game rule; none is claimed in the copy.
- Privacy (`privacy.p0`-`p8`): nothing about Scrum or Kanban; `p4` names "escaped defects" and "cycle time" as stored fields only.

## 6. Checked and faithful

Event purposes and numbers on the cards, the sheet and the questions; the Sprint as container; the practice notes still outside the fold and still naming the Guide; the Definition of Done, Right answer / Wrong answer, Kanban metrics, Service Level Expectation wording and the "no roles, meetings, iterations or timebox" statements; the tour's Kanban-only limit step; glosses (LGTM, timebox, planning poker, story points, WIP); the 10 objectives and 20 question sets (with F2, F3, P1-P3 and the Q-work.1 choice); privacy and pause texts.

## 7. Could not check

- The Romanian screens in place (I read the keys; opened no Romanian screenshot this round).
- Every micro-learning screenshot (I opened one English card; the logic in `learn.ts` I read in full).
- Verbatim guide text beyond the first review's fetches; items not marked "(fetched)" are from memory.

## 8. Score: 8/10

The questions are accurate and mostly well-labelled; the card is clean and the practice note stays outside the fold. The score drops one point because folding moved the real durations out of sight just as the questions skip most of them, and one Kanban question can precede its teaching.

To reach 9:
1. F1: show the real duration line (and the timebox gloss) under the timebox box, outside the fold, on every card, EN and RO.
2. F2: make one set per Scrum event carry its duration (Review four hours, Retrospective three, Daily fifteen minutes, Sprint one month or less).
3. F3 and the `work.1` choice: pin the WIP question to round 2; change "When a Developer says so".
4. F4, F5, P1: the roles clause on the Kanban plan note, the tour's Kanban retrospective label, "meeting" for Kanban objectives.
