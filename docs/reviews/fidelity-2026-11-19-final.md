# Final fidelity review: Two Pizzas against the Scrum Guide (2020), Kanban Guide v2025.5

Read-only. Score: **9/10** (fifth review 9/10). No blocker, no major. Seven minors, all optional.

Method and limits. I read `app/i18n/en.ts` in full around every key that changed (phase cards, tour, lobby agenda, planning, Review, delivery review, retro, observations, learn sets, work.* texts), the Romanian lines of each new or changed key for meaning, spec section 3 (core rules), section 9 (scale), section 11 (sources) and D-097, D-102, D-106, D-110, D-111, D-114. I did not re-fetch the guides; statements are from the first review's fetches (spec section 11) and my knowledge of the 2020 Guide and the Kanban Guide. `git diff HEAD -- app/i18n` is a whole-file diff (line endings), so I read the current file, not the diff.

## 1. Blockers and majors

None.

## 2. Minors

**m1. Lobby agenda note says "real timeboxes" for Kanban too.**
- Key: `lobby.agenda.note` (one text for both frameworks; RO the same).
- Current: "These are the game's minutes, not real timeboxes. The card of each event gives the real ones." / "Sunt minutele jocului, nu timebox-urile reale. Cardul fiecărui eveniment le arată pe cele reale."
- Guide: the Kanban Guide prescribes no events and no timebox; the Kanban cards say so. For Kanban the note implies that real timeboxes exist.
- Replacement, Kanban variant (`lobby.agenda.note.kanban`): "These are the game's minutes. Kanban has no timeboxes: the clock only fits a session into under an hour." / "Sunt minutele jocului. Kanban nu are timebox-uri: ceasul doar face ca sesiunea să încapă în mai puțin de o oră." Scrum keeps the current text.

**m2. Scrum tour: "counts as done only after someone who did not work on it checks it" reads as a Scrum rule.**
- Key: `tour.right.text` (the Scrum card says correctly "In this game the Definition of Done is...", the tour does not).
- Guide: the Definition of Done is the team's own; the Guide prescribes no reviewer.
- Replacement: "A teammate finished this item. In this game it counts as done only after someone who did not work on it checks it: ..." / "Un coleg a terminat acest element. În joc, contează ca gata doar după ce îl verifică cineva care nu a lucrat la el: ..." Kanban variant is already framed as the team's own policy on its card.

**m3. Plain definitions in the tour are shorter than the Guide's (acceptable, one clause would close the gap).**
- `tour.board.text`: "Sprint Backlog (the items the team chose for this Sprint)". Guide: the Sprint Backlog is the Sprint Goal, the items selected and a plan to deliver them. Replacement: "Sprint Backlog (the Sprint Goal, the items the team chose for this Sprint and the plan to deliver them; the column shows the items)" / "Sprint Backlog (Sprint Goal-ul, elementele alese de echipă pentru acest Sprint și planul de a le livra; coloana arată elementele)".
- `tour.review.text`: "The Increment is all the finished work so far." Guide: the Increment is a concrete step toward the Product Goal and meets the Definition of Done; Increments are additive. Replacement: "The Increment is all the finished work so far that meets the Definition of Done." / "Increment e tot ce s-a terminat până acum și respectă Definition of Done." (In the game an escaped defect still passed the review; the Review text above already says so.)

**m4. "Anyone can select items" at Sprint Planning.**
- Key: `commit.hint`. Current: "Anyone can select items from the Product Backlog for the Sprint Backlog."
- Guide: the Developers select the items, through discussion with the Product Owner. In the game all players are Developers, so it is true here, but a Scrum Master or a Product Owner role is not "anyone".
- Replacement: "Any Developer can select items from the Product Backlog for the Sprint Backlog, in talk with the Product Owner (the game)." / "Orice Developer poate selecta elemente din Product Backlog pentru Sprint Backlog, în dialog cu Product Owner-ul (jocul)."

**m5. "Developers ... choose the Sprint Goal".**
- Key: `phase.scrum.plan.role.developers`. Guide: the whole Scrum Team collaborates on the Sprint Goal. The Product Owner row (the game offers two goals) partly covers it.
- Replacement: "All players are Developers: they vote on the Sprint Goal the game offers, estimate and select items for the Sprint Backlog." / "Toți jucătorii sunt Developers: votează Sprint Goal-ul oferit de joc, estimează și selectează elemente pentru Sprint Backlog."

**m6. Kanban tour and learn set use "should" for a common practice.**
- `tour.action.text.kanban` "A retrospective should end with a change to try." and `learn.kanban.retro.1.q` "What should a retrospective end with?". Both sit next to texts that call the retrospective a common practice, so the risk is small.
- Replacement: "A retrospective usually ends with a change to try." / "O retrospectivă se încheie de obicei cu o schimbare de încercat."; question "What does a retrospective usually end with?" / "Cu ce se încheie de obicei o retrospectivă?"
- Also `tour.limit.text` presents "the team may set a WIP limit" without saying it is a common practice (the Plan card does). Optional: add "(a common practice)" / "(o practică uzuală)".

**m7. Scrum tour example of an action is a WIP limit.**
- Key: `tour.action.text`: "for example a WIP limit". A WIP limit is a Kanban idea, not in the Scrum Guide. Optional replacement: "for example finishing an item before starting a new one" / "de exemplu terminarea unui element înainte de a începe altul". The game's trackable agreements may still be the suggested ones.

## 3. Checked and found sound

- **Capacity line (D-102).** "Capacity: {developers} Developers, N minutes of work": the Guide asks for the team's upcoming capacity, not a conversion; there is no points formula; velocity is labelled a common practice and "a weak forecast". `commit.hint` says capacity is "the people and time you have". EN and RO agree.
- **Velocity and estimates.** `phase.scrum.plan.practice`, `inspect.velocityNote`, `poker.velocity`, observations, `script.scrum.plan.commit.2`, `item.legend` ("story points (a common practice)"): every mention says common practice, not in the Scrum Guide. Kanban shows none (D-027); learn set says velocity is not a Kanban measure.
- **Tour scenes and definitions (D-106).** Developers ("the people who do the work"), Request changes, WIP limit (a cap on items in progress), LGTM: accurate. The daily scene says the Guide leaves the structure to the Developers; the Kanban variant says the Guide prescribes no meetings. The escaped-defect scene is explained as a later reveal in the Review.
- **Closing question.** Scrum "What does the Sprint Retrospective plan?" answers "Ways to increase quality and effectiveness": verbatim purpose. Kanban retro question 2 correctly answers "No, it is a common practice".
- **Lobby agenda (D-110).** Scrum text correct: game minutes, not real timeboxes; the cards give the real ones (eight, four, three hours; fifteen minutes; fixed Sprint length). See m1 for Kanban.
- **Sprint Goal vote (D-111).** Listing the theme's Product Backlog items is consistent with the Guide (the Sprint Goal relates to the Product Backlog; the Sprint Backlog holds Goal, items and plan). `work.pb.note` now includes the Product Owner clause; `work.endEarly.hint.scrum` now states the real Sprint keeps its fixed length (fifth report N1 fixed); `phase.gloss` now separates a maximum from a fixed length (N6 fixed); `item.legend` carries "(a common practice)" (N5 fixed).
- **Kanban delivery review (D-114).** "In real work an open item stays open, and its work item age keeps growing" and "The game starts round 2 on a fresh board, so the two rounds compare fairly" are both correct and honest about the game's simplification. Metric definitions match the Guide: WIP = started and not finished; Throughput = finished per period; Cycle Time = start to finish; Work Item Age = since start, for items still open. "It counts all the time, meetings included" is right (elapsed time, not working time). RO matches.
- **Kanban arrivals (D-097).** "N more requests are still coming; the item appears once they have all arrived": a game rule, no Guide claim.
- **Escaped defect.** `inspect.escapedNote` says it is a common term, not from either guide. `inspect.verdict.*` and tour text consistent. D-073 (an escaped defect delivers nothing in its Sprint and can be delivered later) is a game rule and stated as such.
- **Retrospective no-action confirm.** "End the retrospective with no action chosen? The game will note it." No framework claim; the Scrum purpose (plan ways to improve) stays on the card, and the mistake "Listing complaints without choosing any improvement" is a labelled typical mistake.
- **Regression sweep.** Cards for all five Scrum events and the Kanban equivalents (purposes, real durations, roles, mistakes, practices), the 20 question sets, observations, summary and score notes, pause and privacy text: no contradiction of either guide. The Review is described as "a working session" and "no acceptance step", the Daily as the Developers' event with free structure, Kanban as without roles, meetings or timebox.

## 4. Not checked

- The Service Level Expectation sentence in `phase.kanban.inspect.practice` ("also asks a team to state a Service Level Expectation"): I did not re-fetch the Kanban Guide to confirm how firmly the Guide asks for it versus describes it. If it only describes it, use "describes" / "descrie".
- Screenshots in `.qa/`; the tour step targets and `script.ts` mechanics (no copy claims found in `script.ts`).
