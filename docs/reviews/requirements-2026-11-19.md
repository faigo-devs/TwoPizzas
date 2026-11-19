# Two Pizzas: requirements audit, 2026-11-19

Independent read-only audit. Nothing was run; evidence is test files, run logs, screenshots, review reports and code that I read myself.

## Abbreviations

- **S7** = `.qa/work/e2e-scrum7.out`: Scrum, three real browsers, PASS, 4684 assertions, 0 known failures (run dir `.qa/e2e/scrum-20261119-163545`).
- **K6** = `.qa/work/e2e-kanban6.out`: Kanban, PASS, 6094 assertions, 0 known failures (run dir `.qa/e2e/kanban-20261119-161058`).
- **T8** = `.qa/work/e2e-tour-8.out`: Scrum tour (14 steps) and Kanban tour (15 steps), PASS, 125 assertions, on the latest build.
- `e2e-kanban-8.out` was still running at the time of reading (review verdicts of round 1) and `e2e-scrum-8.out` did not exist yet. **S7 and K6 predate the Scrum/Kanban boundary refactor** (handover: verified 17:45; S7 ended about 17:00), so they prove the game before that change only.
- Test paths: `c/` = `core/test/`, `w/` = `worker/test/`, `i/` = `app/i18n/test/`, `g/` = `app/game/test/`, `d` = `scripts/check-dist.test.mjs`.
- Status: **done**, **partial**, **missing**, **owner** (only the owner can do it).

## 1. Totals

Counted from the table in section 3.

| Status | Count |
|---|---|
| done | 181 |
| partial | 11 |
| missing | 2 |
| owner | 5 |
| **Total lines** | **199** |

(15 of the "done" lines are marked "done (weak)" and several more carry a weak part; all are listed in section 4. The two "missing" lines are the same fact: the three user-role evaluators have not run, O-26 and S-9.6. The partial lines are O-5c, O-13b, O-20b, O-27, T-4, S-2.2, S-2.3, S-5.1, S-9.4, S-9.5 and S-10.10; O-15 is counted as owner.)

## 2. Partial and missing, ranked by how much they matter to a beginner's session

| Rank | Id | Status | What is missing | Why it matters |
|---|---|---|---|---|
| 1 | S-9.4 | partial | The whole-game browser runs that exist (S7, K6) predate the Scrum/Kanban boundary refactor. Only the tour (T8) ran on the final build; `e2e-kanban-8` is mid-run and Scrum-8 has not started. | The boundary refactor changed the views every player screen reads; only a whole-game run shows that a team can still get through both frameworks. |
| 2 | O-27 / S-9.5 | partial | Reviewer gate not met yet: design 8.9, usability 8.9 (fifth pass), Romanian 8.9, security 8 on code (9 after staging), code quality / maintainability / architecture 8 / 7 / 8 (first pass, second pass pending), GDPR 9 code and text but 8.5 overall. English 9 and fidelity 9 are met. The confirming round is task 6 of the handover. | It is the owner's definition of "version 1 is done". |
| 3 | O-5c | partial | "Capacity" in Sprint Planning (owner's words) has no counterpart in Sprint 1: the commit step shows the sum of estimates, and only Sprint 2 shows a velocity beside it. The word "capacity" is not in the copy. | A beginner in Sprint 1 has nothing to compare the sum against; the weak-forecast sentence is the only guidance. |
| 4 | O-26 | missing | The three user-role evaluators (beginner on a phone in Romanian, facilitator, sceptical developer) have not run; `docs/reviews/usability-test-2026-11-19.md` is the simulated test they replace. Decision 26 says they do not gate version 1. | Real friction for a facilitator would surface here. |
| 5 | S-5.1 | partial | Spec section 5 says an empty room is deleted after 5 minutes; code and decision 22 / D-078 say 15 (`core/config.ts` `emptyGraceMs: 15 * 60_000`). The code is right and the contract text is stale. Spec section 1 header also says "fourteen decisions" (27 exist). | The privacy text and the contract must agree. |
| 6 | S-2.3 | partial | `reference/piesa-lipsa/` is still in the tree; deletion is step 7 of the handover. | Housekeeping. |
| 7 | O-13b | partial | Internal names `lgtm` (`package.json`), `lgtm-worker` (`worker/package.json`) and `lgtm-rooms` (`worker/wrangler.toml`) are still the old name; D-001 says they are renamed with the repository (final step). | Invisible to players. |
| 8 | S-2.2 | partial | `sharp` is a dependency of `package.json` but not in the spec's list (Astro, Preact, fonts, TypeScript). No decision records the agreement. | Process rule, not play. |
| 9 | S-9.1 | partial | The rule "no host name in code" (`CLAUDE.md`) is broken by `astro.config.mjs:5` (`site` holds the game's address); spec D-006 requires it, so the contract and the guidance disagree. | Public repository hygiene. |
| 10 | O-15 | owner/partial | The repository is `faigo-devs/TwoPizzas` (remote set) and has a `LICENSE`, but the work is uncommitted (`git status` shows most files modified or untracked) and not pushed. | Owner's step. |

## 3. The full table

### 3.1 The owner's decisions (`docs/handover.md`, "Decizii ale proprietarului")

| Id | Requirement | Status | Evidence |
|---|---|---|---|
| O-1a | Audience is beginners with no Agile work | done | Copy and glosses: `i/dictionaries.test.ts` "beginner glosses are present once where the term first appears"; tour is for visitors; `.qa/usability/ana-*.png` |
| O-1b | After a session a player can state purpose, duration and typical mistake of each event and has gone through each once | owner | Needs the pilot. Automated part: e2e asserts the sheet has "purpose, duration and typical mistake block" (S7 9x, K6 9x) and each event is played (S7 "screens reached") |
| O-2a | 3 to 6 players, each on their own device | done | `c/machine-lobby.test.ts` "the first player to join is the host and the seventh is refused", "start needs the host and three connected players"; `c/machine-game.test.ts` whole game 3 to 6 players; S7 "three distinct seats" (3 browsers) |
| O-2b | Session lasts 45 to 60 minutes | done (weak) | `core/config.ts` timeboxes: Sprint 1 6+4+4+2+4+5 = 25 min, Sprint 2 4+4+4+2+3+3 = 20 min, total 45 min plus cards; `c/config.test.ts`. e2e ran 22 to 25 minutes with fast simulated players. No measured session with people |
| O-2c | Voice is not built; the call is external | done | No `getUserMedia`/`RTCPeer` anywhere in `app/`, `core/`, `worker/src` (searched); D-072; spec section 1 |
| O-3a | Framework chosen at the start: Scrum or Kanban, both in v1 | done | S7 and K6 (both frameworks, whole game); `c/machine-lobby.test.ts` "a Kanban room starts like a Scrum room" |
| O-3b | No other framework named | done | Searched `app/i18n/en.ts` for other frameworks: none |
| O-4a | Backlog of about 10 tasks of four kinds (code review, deploy order, incident, merge) | done | `c/config.test.ts` "the backlog is ten items and dependencies fit inside their sizes"; `c/tasks-{review,order,incident,merge}.test.ts`; S7 items of all four kinds submitted |
| O-4b | Three sizes, each with a value | done | `core/config.ts` composition S4 M4 L2, values 1 to 8; `c/config.test.ts`; `c/tasks-review.test.ts` "sizes change the amount of keys and differences" |
| O-4c | More items than fit in a sprint | done (weak) | Ten items; S7 sprint 1 produced 6 verdicts of 10 and sprint 2 6 more. No test pins "more than fit" |
| O-4d | Work in pairs, in parallel | done | `c/machine-sprint.test.ts` "a pair item waits visibly for its second worker and the puzzle appears when the pair is complete"; S7 "a pair item was solved from two different parts" |
| O-4e | Some tasks block until information comes from someone else | done | `c/machine-sprint.test.ts` dependency-holder tests (2); S7 "an item was solved with a piece handed over by its holder", "private held captured". Deviation: the holder is a player outside the item, not "another pair" (spec 3.3; with three players no second pair exists) |
| O-5a | Sprint Planning: Sprint Goal chosen by vote and confirmed | done | `c/machine-lobby.test.ts` "goal votes pick the Sprint Goal and the facilitator confirms it"; S7 "the goal with the most votes is confirmed" |
| O-5b | Planning poker, cards revealed all at once | done | `c/machine-lobby.test.ts` "planning poker hides votes until all have voted or the facilitator reveals, allows one re-vote"; S7 "poker votes stay hidden before the reveal", "revealed poker votes are the same on all pages" |
| O-5c | Capacity in planning | partial | No capacity concept in Sprint 1; the commit step shows the sum of estimates (`c/machine-lobby.test.ts` "commitment shows the sum of estimates and Sprint 2 shows the velocity of Sprint 1"). To close: either add a capacity line to the Sprint 1 commit step or record in the spec that "capacity" means the velocity comparison of Sprint 2 |
| O-5d | In Sprint 2 planning is done by velocity | done | same test; `c/machine-help.test.ts` plan.fitsVelocity/overcommitted observations; `i/dictionaries.test.ts` "planning poker and velocity lines say they are not in the Scrum Guide" |
| O-5e | Daily Scrum mid-Sprint, Sprint clock stopped, 2 to 3 minutes | done | `c/machine-sprint.test.ts` "the Daily Scrum allows re-planning, any player ends it and the Sprint clock is stopped"; `core/config.ts` daily 2 min; S7 "screen daily:1:0:walk" |
| O-5f | Daily is a walk of the board toward the goal, not the three questions | done | `i/dictionaries.test.ts` "the daily script only asks to keep the timebox", "no 2017 or non-Guide Scrum wording: Development Team, three questions, ceremonies"; D-015, D-070 |
| O-5g | Sprint Review: only what meets the Definition of Done is accepted, e.g. "checked by a colleague outside the pair" | done | `c/machine-sprint.test.ts` "a malformed response is a bad request and a worker cannot review their own item", "an escaped defect gets no value, returns to the top of the backlog"; S7 "the wrong answer that got an LGTM is an escaped defect" |
| O-5h | Customer feedback reorders the backlog | done | `c/machine-sprint.test.ts` "feedback shifts the priority of one theme and adds three new items"; `c/machine-summary.test.ts` "the customers feedback creates exactly the configured three items"; S7 "the feedback is the same on all pages" |
| O-5i | Retrospective columns went well, slowed us down, we will try | done | `core/config.ts` retro.columns; `i/dictionaries.test.ts` "every ... column has copy"; S7 "all notes are shown after the reveal" |
| O-5j | Two votes per player | done | `c/machine-sprint.test.ts` "every player has two votes ..."; S7 "six votes are counted on the notes" |
| O-5k | One action: from a trackable list or free text | done | `c/machine-sprint.test.ts` five agreement tests (wip_limit, review_wait, no_new_while_blocked, pair_first, free text); S7 "the chosen agreement is among the suggestions" |
| O-5l | End of Sprint 2 shows whether the action was kept and how the numbers changed | done | `c/machine-sprint.test.ts` "Sprint 2 retrospective opens with the result of the agreement"; `c/machine-summary.test.ts` "a broken tracked agreement reports how many times it was broken"; S7 "the previous action result is shown" and "the summary has both iterations" |
| O-6a | The game is the Product Owner | done | `i/dictionaries.test.ts` "the Product Owner does not accept or reject work"; spec 3.2; no PO seat in `c/machine-lobby.test.ts` |
| O-6b | One player is Scrum Master with a script on their own screen | done | `c/machine-summary.test.ts` "the facilitator script also covers the running Sprint, and only for the facilitator"; `i/dictionaries.test.ts` "script lines are numbered without gaps"; S7 "only the facilitator may begin the phase" (10x) |
| O-6c | The role rotates in Sprint 2 | done | `c/machine-lobby.test.ts` "a volunteer facilitates the first iteration and the role passes on in the second", "rotation skips a player who is away" |
| O-6d | Developers run the Daily Scrum; the Scrum Master only keeps timebox | done | S7 "anyone may end the daily"; `c/machine-sprint.test.ts` Daily test; `i/dictionaries.test.ts` "the daily script only asks to keep the timebox" |
| O-7a | Kanban two rounds, round 1 without WIP limits, round 2 with | done | `c/machine-kanban.test.ts` "round 1 has no limits", "round 2 enforces both limits"; K6 "round 1 shows that no limits are set" (6x), "limits set and shown on every page", "a WIP limit was hit and refused in round 2" |
| O-7b | A chart compares cycle time, throughput, WIP, work item age between rounds | done | `c/machine-kanban.test.ts` "flow metrics on a hand-built round", "the comparison appears only in round 2"; K6 "kanban comparison: numbers ... identical on all pages"; screenshots `.qa/kanban/remote-16-delivery-r2-comparison.png`, `.qa/ux-fix4/kanban-en-1280-s09.png` |
| O-7c | Simulated meetings: daily at the board, replenishment, delivery review, retrospective | done | K6 screens `daily`, `plan:replenish`, `inspect:flow`, `retro` in both rounds; `i/dictionaries.test.ts` "every phase and step has a card, copy and a script for each framework it exists in" |
| O-8a | Before each event a 15-second card (purpose, duration) | done | `i/dictionaries.test.ts` card tests, "no phase-card row is longer than two sentences"; S7 and K6 "the facilitator may begin the phase"; screenshots `.qa/ux-fix3/*card*` |
| O-8b | During the event guided steps | done | `i/dictionaries.test.ts` "script lines are numbered without gaps"; S7/K6 screens by step |
| O-8c | After the event an observation from what was seen on the board | done | `c/machine-lobby.test.ts` "observations keep a positive and a watch-out one when both exist, at most two"; all 34 observation ids present in `core/machine/candidates.ts`, `app/i18n/en.ts` and at least one test; S7 "each observation of the history is on the sheet" (57x) |
| O-8d | The game does not hear the call | done | D-014, D-072; observation rules read board state only (`core/machine/candidates.ts`) |
| O-8e | Final summary sheet that can be saved or printed | done | `c/machine-summary.test.ts` first test; S7/K6 "the session sheet is shown" (3x); print: `.qa/review/summary-5-print.png`, `.qa/review/summary.pdf`, `.qa/kanban/en-390-summary.pdf`; `@media print` in `app/styles/game-review.css:366`, `polish.css` |
| O-8f | A visitor who arrives alone gets a guided tour | done | `g/tour.test.ts` (steps, scenes, transport run); T8 PASS (14 and 15 steps, focus on each step) |
| O-9a | Player text is free, at most 140 characters, name optional | done | `core/config.ts` noteMax 140; `c/machine-sprint.test.ts` "retro notes are private until revealed, sanitised and limited"; `c/machine-lobby.test.ts` names optional; `c/hardening.test.ts` D-046 |
| O-9b | "I do not know what to write" asks 2 or 3 questions and proposes notes, from rules, no AI | done | `c/machine-help.test.ts` (23 tests); `c/machine-sprint.test.ts` "the 'I do not know what to write' help is data"; S7 "the helper proposal fills the note field", "works end to end" |
| O-9c | Room and contents deleted when the last player leaves or after 2 hours | done | `w/alarm.test.ts` "everything is deleted when the last player has been gone for the grace", "the room is deleted at its lifetime even with players connected"; `core/config.ts` lifetimeMs 2 h |
| O-9d | Nothing in logs | done | `w/logs.test.ts`; `worker/wrangler.toml` observability and logs off; spec 5 |
| O-9e | A short privacy text on the page | done | `i/privacy.test.ts` (5 tests); `.qa/gdpr-fix/fold-*-390.png`, `footer-*.png`; GDPR review fourth pass 9 on code and text |
| O-10a | Romanian and English on one page | done | `i/dictionaries.test.ts` "both dictionaries have exactly the same keys"; S7 "page 1 switched to Romanian" |
| O-10b | Chosen per player by a toggle; first visit browser language, else Romanian | done | `i/plural.test.ts` "first visit language"; `g/init.test.ts` "reads the language"; `app/i18n/index.ts:19` default `ro`; `.qa/ux-fix3/hdr-*` |
| O-10c | Technical terms always English in both languages | done | `i/dictionaries.test.ts` "escaped defect, flow metrics and WIP limit keep their English names in Romanian", "card statuses use the words of the board columns", "English terms used as a Romanian subject take the hyphenated article" |
| O-10d | Official event names, the everyday name mentioned once | done | `i/dictionaries.test.ts` "demo is a nickname with a disclaimer, never the name of the Sprint Review"; `i/fidelity.test.ts` |
| O-11a | Real-time room server in Cloudflare (Durable Object) | done | `worker/src/room.ts`, `leaderboard.ts`, `worker/wrangler.toml`; `w/room.test.ts` (22 tests); S7/K6 run on a real local `wrangler dev` |
| O-11b | One static page on the host | done | `d` "an extra HTML page fails", "a kit folder fails"; `.qa/dist-check` |
| O-11c | Exactly three outbound links to primary sources, new tab, Romanian where a translation exists | done | `app/i18n/sources.ts` (Scrum RO community PDF, Kanban EN only, Manifesto RO); `app/ui/Footer.tsx:26` `target="_blank" rel="noopener noreferrer"`; `d` "own origin, source URLs and namespace identifiers pass", "another path on a source host fails"; RO Scrum PDF address confirmed in `docs/reviews/fidelity-2026-11-16.md:181`. Note: the Scrum RO text is a community translation (the owner said "official where it exists"; spec section 11 records the choice) |
| O-12a | Public leaderboard only if the team chooses "Publish result" at the end | done | `w/room.test.ts` "publishing the result sends one entry to the leaderboard, once", "only the facilitator can publish"; S7/K6 "the publish control disappears after publishing" |
| O-12b | Team names generated by the game, "another" until it pleases | done | `c/names.test.ts` (3); `c/machine-lobby.test.ts` team name re-draw; `c/machine-summary.test.ts` team-name control; S7 "the new team name is the same on all pages" |
| O-12c | Measures delivered value; top 10 of the month and all-time record; separate for Scrum and Kanban | done | `w/leaderboard.test.ts` "the month list holds only the current month, the all-time list keeps older rows", "the lists hold at most ten rows per framework", "pruning keeps the two frameworks apart"; S7/K6 "the team is under the list of its own framework" |
| O-12d | Only the generated name, team size, score, date are kept | done | `w/leaderboard.test.ts` "invalid entries are refused and unknown fields are dropped"; `app/i18n/en.ts` `summary.publishHint` also names escaped defects and cycle time (tie-break fields, spec 3.7) |
| O-13a | Name Two Pizzas with an explanatory line under it in the chosen language | done | `app/i18n/en.ts:44` `start.tagline` (and Romanian via the key test); `.qa/rename/start-1280.png`, `start-360.png` |
| O-13b | LGTM only remains as the code-review stamp | partial | Stamp: `app/ui/Callout.tsx:38`. Wire name `lgtm.v1` and CSS prefix `lg-` are kept on purpose (D-001, D-060). Package names `lgtm`, `lgtm-worker`, `lgtm-rooms` still to rename with the repository |
| O-13c | New visual style: developer-tool look | done | `.qa/kit/*`, `.qa/design-fix/*`; design review fifth pass confirms ("what works") |
| O-13d | No "made by" line and no firm data block; footer has only privacy and the three sources | done | `i/privacy.test.ts` "the firm and its contact address appear in the privacy text and nowhere else on the page"; `.qa/gdpr-fix/footer-*.png` |
| O-14a | Nothing is published before v1 is ready; order: pilot, repair, reviewers 9/10, publish | owner | Publish jobs are inert: `.github/workflows/publish-*.yml` run only if `vars.PUBLISH_ENABLED == 'true'` (D-002). Pilot and the decision to publish are the owner's |
| O-14b | Old Workers stopped at publication | done (superseded) | Replaced by decision 21: the firm's site and its Workers are untouched |
| O-15 | Separate public open-source repo `faigo-devs/TwoPizzas`; assistant is long-term owner | owner | Remote `origin` is that repo, `LICENSE` present; commit and push of the current work, rename of internal names and re-clone are the owner's final step (handover task 7) |
| O-16 | Romanian register: "tu" to a player, "voi" to the team, never "dumneavoastra" | done | `i/dictionaries.test.ts` "Romanian is informal: no dumneavoastra, no dvs.", "Romanian buttons for one player are imperative singular"; `i/tour.test.ts` |
| O-17a | Solo tour announced as about 10 minutes | done | `app/i18n/en.ts:51-52` "about 10 minutes"; D-052; T8 (14/15 steps) |
| O-17b | The tour has its own zone on the start page, a colour distinct from the main button, a route-like look | done | D-050, D-051; screenshots `.qa/usability/ana-01-start.png`, `.qa/design-fix/start-*`, `.qa/rename/start-*.png`. Weak on the contrast pairings (see section 4) |
| O-18 | Dark theme only, no switch; only the printed sheet is light | done | `app/layouts/Base.astro:23` `color-scheme` dark; no `data-theme`, no toggle in `app/` (searched); light only in `@media print` (`game-review.css:366`) |
| O-19a | Each event states one objective ("after this event you will know ...") | done | `i/learn.test.ts` "every event has one objective sentence in both languages"; screenshots `.qa/micro/scrum-en-1280-card-*` |
| O-19b | Each event ends with a check question, 10 to 20 s, three choices | done | `i/learn.test.ts` (5 tests: two variants per event, three distinct choices, one right, same for the room); screenshots `.qa/micro/*check*`, `.qa/ux-fix4/kanban-en-1280-check*`. Not asserted by any whole-game run |
| O-19c | The summary sheet shows how many answers were right | done | `app/i18n/en.ts:1180` `learn.summary.title`, D-054 "You answered n of m right"; screenshot `.qa/ux-fix4/kanban-en-1280-print-checks.png`. No test of the count itself |
| O-19d | Separate short lessons: not now | done | Not built, as decided |
| O-20a | UX first; no cluttered interface; principles of Don't Make Me Think | done | Spec section 8 "Usability first"; five design/usability reviews (`docs/reviews/design-usability-*`, fifth pass 8.9 / 8.9, one fix applied since: `polish.css` fold marker, D-098); `.qa/review4/`, `.qa/review5/` |
| O-20b | Usability is tested: simulated players before the pilot, real people in it | partial | Simulated test done (`docs/reviews/usability-test-2026-11-19.md`); real people in the pilot are the owner's (see O-26 for the replacement evaluators) |
| O-20c | Favicon is the Two Pizzas mark | done | `public/favicon.svg`, `public/favicon.ico`; `.qa/favicon-48.png`; `d` expects built output |
| O-21a | Game address `twopizzas.faigo.ro`; repo name stays | done | `astro.config.mjs:5`; `worker/src` routes come from `SITE_HOSTS` in `publish-server.yml:125` |
| O-21b | Subdomain, hosting directory and the zone routing exist | owner | Outside the repo (handover "Pe lista proprietarului") |
| O-22a | Personal pause of 1 to 15 minutes, default 5; items and role stay reserved; others see until when; team clock runs | done | `c/pause.test.ts` (11 tests); `w/pause.test.ts`; `i/pause.test.ts`; screenshots `.qa/pause/*` |
| O-22b | An empty room is deleted after 15 minutes | done | `core/config.ts` `emptyGraceMs: 15 * 60_000`; `w/alarm.test.ts` "everything is deleted when the last player has been gone for the grace"; `i/privacy.test.ts` "the privacy text states the room delay and lifetime from the configuration" |
| O-23 | The owner-approved privacy text is in place; a GDPR reviewer checks it | done | `i/privacy.test.ts`, `i/pause.test.ts` (provider recovery copies); `docs/reviews/gdpr-2026-11-19-fourth.md` (9.0 on code and text) |
| O-24 | Operator line (company, address, tax and registry numbers, the contact address) in the folded privacy text only, address only in `identity.ts` | done | `i/privacy.test.ts` "the firm and its contact address appear in the privacy text and nowhere else on the page"; repository search: the address appears only in `app/i18n/identity.ts`. Registry data checked by the owner: owner item |
| O-25 | The orchestrator is the team's Scrum Master and keeps the task list in the handover | done (weak) | Working rule; `docs/handover.md` "Progres si sarcini ramase". Not testable |
| O-26 | Three user-role evaluators run, criticisms triaged | missing | Not run yet (handover task 4); `docs/reviews/usability-test-2026-11-19.md` is the simulated test they replace. Explicitly not gating v1 |
| O-27 | v1 is done when the whole requirement list has evidence and every other evaluator gives at least 9, at most two passes each | partial | This audit is the requirement-list check. Scores: fidelity 9 (`fidelity-2026-11-19-fifth.md`), English 9, Romanian 8.9 (`language-2026-11-19-fourth.md`), design and usability 8.9 / 8.9 (`design-usability-2026-11-19-fifth.md`, one blocker since fixed), security 8 on code (`security-2026-11-19-sixth.md`; the backstop value it asked for is now 128 in `core/config.ts`; 9 only after staging), GDPR 9 code and text, 8.5 overall (`gdpr-2026-11-19-fourth.md`), code quality / maintainability / architecture 8 / 7 / 8 (`code-architecture-2026-11-19.md`, first pass; its first finding, client tests, is now `app/game/test/`). Confirming round pending |

### 3.2 What follows technically from the decisions

| Id | Requirement | Status | Evidence |
|---|---|---|---|
| T-1 | Answers verified by the server; the page never receives answers | done | `c/hardening.test.ts` "no view of a started room holds the secret, the name seed or an item key"; `w/room.test.ts` "views are never sent to the wrong player and hold no secret"; S7/K6 "leak scans" (898 and 2400), "outcome-hidden checks" (1620 and 1596) |
| T-2 | The 9/10 threshold applies to two languages plus a fidelity reviewer | done | Reports `language-*`, `fidelity-*` exist for both |
| T-3 | Own web directory for the subdomain; the two publish flows can both be active | done (weak) | `publish-page.yml` takes `FTP_REMOTE_DIR` from a variable; D-002; spec section 2. The DNS and directory are the owner's (O-21b) |
| T-4 | Secrets for publishing are added by the owner; no host, account or provider name in code, documents or workflows | partial | Workflows read secrets and variables only (searched `.github/`, `app/`, `core/`, `worker/`, `scripts/`: no provider host). Exception: `astro.config.mjs:5` holds the game's own address (see S-9.1). Secrets themselves: owner |

### 3.3 The contract, `docs/spec.md` sections 1 to 9

#### Section 1 and 2

| Id | Requirement | Status | Evidence |
|---|---|---|---|
| S-1.1 | Free browser game on its own subdomain; 3 to 6 beginners learn Scrum or Kanban in two short iterations | done | S7, K6; `astro.config.mjs:5` |
| S-1.2 | Each player on their own device; no audio in the game | done | S7 (three pages); O-2c |
| S-1.3 | Romanian and English chosen per player | done | O-10 |
| S-1.4 | Success: a beginner can state purpose, timebox and typical mistake of each event | owner | Pilot (O-1b) |
| S-2.1 | `core/`, `worker/`, `app/` layout, core pure and shared | done | Repository tree; `c/` and `w/` import the same core |
| S-2.2 | No dependencies beyond the agreed ones | partial | `package.json` lists `sharp`, not in the spec's list; no decision recorded. To close: record the agreement in section 10 or drop it |
| S-2.3 | `reference/piesa-lipsa/` deleted when the port is done | partial | Still present (handover task 7) |
| S-2.4 | Page and server publish to different roots; both workflows can be enabled | done (weak) | `.github/workflows/publish-page.yml`, `publish-server.yml`; check: dry run of both with `PUBLISH_ENABLED=false` |

#### Section 3

| Id | Requirement | Status | Evidence |
|---|---|---|---|
| S-3.1a | `reduce` is pure; no `Date.now()` or `Math.random()` in `core/` | done | Search of `core/` (non-test): none; `c/rng.test.ts`; `c/machine-random.test.ts` D-093 |
| S-3.1b | Server is the only authority; `viewFor` hides secrets and sizes | done | `c/hardening.test.ts` "an item shows no workers needed before it is started"; S7/K6 leak scans |
| S-3.2a | 3 to 6 players; first joiner is host and chooses framework | done | `c/machine-lobby.test.ts` |
| S-3.2b | Names optional, at most 20 characters, default "Player N" | done | `c/machine-lobby.test.ts` "names are cleaned, capped and optional"; `core/config.ts` nameMax 20 |
| S-3.2c | Facilitator: Scrum Master in Scrum, facilitator in Kanban; volunteer in the lobby, otherwise host; rotation in iteration 2; also works on items | done | `c/machine-lobby.test.ts` role tests; `c/hardening.test.ts` "a removed seat can be filled again and the facilitator role follows the remaining players" |
| S-3.2d | Game is Product Owner / customer | done | O-6a |
| S-3.2e | In Daily Scrum any player may end it | done | S7 "anyone may end the daily" (2x) |
| S-3.3a | Item fields: id, kind, hidden size, value 1 to 8, theme, subject, estimate, status flow | done | `c/config.test.ts`; `c/tasks-common.test.ts`; `c/machine-random.test.ts` (one valid status per item) |
| S-3.3b | People per item: S one, M and L two; every L and some M have a dependency | done | `c/config.test.ts` "dependencies fit inside their sizes"; `core/config.ts` dependencies S0 M2 L2 |
| S-3.3c | Take, wait for second worker, puzzle generated, dependency holder with fewest dependencies, "blocked: needs info from the team" | done | `c/machine-sprint.test.ts` (3 tests); `c/hardening.test.ts` workers-needed visibility; board text key checked by `i/dictionaries.test.ts`; screenshots `.qa/design/s1-board-1280.png` |
| S-3.3d | One open item at a time; switching costs 8 s during which nothing is shown | done | `c/machine-sprint.test.ts` "a context switch hides the item for the configured delay and the server is told when it passes"; `core/config.ts` contextSwitchMs 8000; D-013; screenshot `.qa/design-fix/local-scrum-en-1280-6-switching.png` |
| S-3.3e | Submit does not say whether the answer is right | done | `c/machine-sprint.test.ts` "submitting never says whether the answer is right"; S7 "no escaped defect is announced before the review" |
| S-3.3f | Definition of Done: reviewed by someone who did not work on it; LGTM or Request changes | done | `c/machine-sprint.test.ts` "Request changes sends the item back to its workers; LGTM completes it"; S7 "the item that came back with Request changes was fixed and accepted" |
| S-3.3g | End of iteration: right answers accepted; wrong answer with LGTM is an escaped defect; leftovers return to backlog (Scrum), Kanban leftovers age and leave | done | `c/machine-sprint.test.ts` "an escaped defect ...", "unfinished work at the hard end goes to the Daily Scrum, then back to the backlog"; `c/machine-kanban.test.ts` "round 2 starts from an empty board ... round 1 leftovers stay in round 1 numbers"; S7/K6 escaped-defect checks |
| S-3.3h | A full item takes roughly 30 to 45 s of attention | done (weak) | Puzzle-size tests only (`c/tasks-*.test.ts`); no timing evidence; pilot should measure |
| S-3.4a | Review puzzle: two copies, set of differing keys | done | `c/tasks-review.test.ts` (6) |
| S-3.4b | Order puzzle: exactly one fitting order, no part alone suffices | done | `c/tasks-order.test.ts` (4) |
| S-3.4c | Incident puzzle: first fitting rule wins | done | `c/tasks-incident.test.ts` (5) |
| S-3.4d | Merge puzzle: the merge rule is the dependency | done | `c/tasks-merge.test.ts` (5); `scripts/e2e/solvers.selftest.mjs` (not run) |
| S-3.5a | Timeboxes per phase and iteration as in the table | done | `core/config.ts` timeboxMs, phaseEnds; `c/config.test.ts` "the numbers of the specification are in the config" |
| S-3.5b | Every phase opens with a card; its timebox starts when the facilitator begins it | done | `c/machine-lobby.test.ts` "the card of every phase must be begun by the facilitator, and its timebox starts then" |
| S-3.5c | Soft timebox may overrun and the overrun is recorded; hard one ends on time | done | `c/machine-lobby.test.ts` "a soft timebox may be overrun and the overrun is recorded and observed"; `c/machine-game.test.ts` "timeboxes start at phase.begin and the Sprint ends hard"; `w/alarm.test.ts` hard-end alarm; S7 "work half ... ended after 236s" |
| S-3.5d | All durations in one config object | done | `c/config.test.ts` "the config is deeply frozen" |
| S-3.5e | Scrum backlog: 10 items 4 S, 4 M, 2 L, ordered by value, priority not equal to size order, three themes | done (weak) | `c/config.test.ts`; "priority order is not size order" is not pinned by a test I found. Check: a property test over several seeds |
| S-3.5f | Plan: Sprint Goal (two options, +5, vote, confirm) | done | `c/machine-lobby.test.ts` goal tests; `core/config.ts` goal |
| S-3.5g | Plan: planning poker cards 1 2 3 5 8 13, reveal, one re-vote, median default, stop any time | done | `c/machine-lobby.test.ts` (2 poker tests); `core/config.ts` poker; S7 "poker revote used" |
| S-3.5h | Plan: commitment, sum of estimates, Sprint 2 velocity, at least one item | done | `c/machine-lobby.test.ts` "items can be pulled and unpulled only during the commitment", "commitment shows the sum ..."; S7 "the Sprint Backlog shows how many items were selected" |
| S-3.5i | Work: board with four columns and an item workspace | done | S7/K6 whole runs; `.qa/design-fix/local-scrum-en-1280-5-board.png` |
| S-3.5j | Daily: clock stopped; walk from the right; re-plan: leave, join as second worker, promise help, take a review | done | `c/machine-sprint.test.ts` Daily test; `c/machine-summary.test.ts` "item actions cover take, join, open, review, leave and help on a running Sprint"; S7 "a promise of help was made" |
| S-3.5k | Inspect: verdict per item, goal met or not, value, velocity, then feedback (priority shift plus three items) | done | `c/machine-sprint.test.ts` feedback test; `c/machine-summary.test.ts` goal test; S7 "scrum review result: numbers in .lg-stats are identical on all pages", "the feedback is the same on all pages" |
| S-3.5l | Retro: private notes in three columns, two votes, one action; Sprint 2 opens with the result | done | O-5i to O-5l; S7 "others' notes stay hidden before the reveal" |
| S-3.5m | Trackable agreements: WIP limit, review under 60 s, no new item while blocked has no helper, no new item while one waits for a second worker; none names a size | done | `c/machine-sprint.test.ts` four agreement tests plus pair_first tests; `core/config.ts` agreements |
| S-3.5n | Kanban board Ready / In Progress / Review / Done; requests arrive every 45 s, eight per round, seeded, into Ready, marked | done | `c/machine-kanban.test.ts` "requests arrive on the arrival interval, eight per round, in Ready, stamped with their time", "arrivals are seeded"; marking: D-029, screenshot `.qa/kanban/05-arrival.png` (no test of the 12-second mark) |
| S-3.5o | Kanban plan: pool of eight, at most four enter Ready; round 2 also sets limits; limit may be unset | done | `c/machine-kanban.test.ts` "Replenishment in round 1 ...", "round 2: the facilitator records limits in their own step", "a null limit leaves its column open"; K6 "Ready refuses a request beyond its size" |
| S-3.5p | Request changes may put an item back In Progress above the limit and is not a start | done (weak) | `core/machine/rights.ts:16` and `flow.ts:13`: the limit guards only a `todo` take, so a change request is unrestricted by construction. No test names this case. Check: a test in `c/machine-kanban.test.ts` that requests changes at the limit |
| S-3.5q | Kanban WIP counts In Progress and Review; cycle time and age leave out the daily | done | `c/machine-kanban.test.ts` "highest WIP counts In Progress and Review together", "flow metrics on a hand-built round: cycle time without the daily" |
| S-3.5r | Kanban observation ids work.limitReached ... inspect.cycleTimeSlower | done | `c/machine-kanban.test.ts` three observation tests; all seven ids present in `candidates.ts` and `en.ts` |
| S-3.5s | Round 1 no limits; round 2 empty board, comparable requests, limits enforced | done | `c/machine-kanban.test.ts` (3 tests); K6 |
| S-3.5t | Delivery review: four flow metrics plus escaped defects; chart of both rounds | done | `c/machine-kanban.test.ts`; K6 "kanban review flow: numbers in .lg-metrics are identical on all pages"; screenshots `.qa/ux-fix4/kanban-en-1280-s09.png` |
| S-3.5u | Kanban retro as Scrum; after round 1 "set WIP limits" suggested | done | `c/machine-kanban.test.ts` "the limits agreement: suggested first after round 1 ...", "the Kanban retrospective: wip_limits_set first after round 1"; K6 "retro action: wip_limits_set" |
| S-3.6a | Phase card, script, up to two observations plus the typical mistake | done | Observation tests above; S7/K6 "the session sheet has the purpose, duration and typical mistake block" |
| S-3.6b | All 27 Scrum observation ids exist | done | Search: each id in `core/machine/candidates.ts` (1 file), `app/i18n/en.ts` (2 keys) and at least one test file |
| S-3.6c | Observations are framework-aware | done | `c/machine-kanban.test.ts` "Scrum-only observations are never raised in Kanban and the reverse"; `c/machine-kanban-game.test.ts` "a Scrum game never raises a Kanban-only observation" |
| S-3.6d | Notes free text, max 140; helper by rules, no AI model | done | O-9a, O-9b |
| S-3.6e | Summary: result, recap of every event, printable | done | O-8e; S7 "the session sheet shows scrum iteration 1 / 2" |
| S-3.7a | Score = accepted value plus goal bonuses; tie-breaks | done | `w/leaderboard.test.ts` "scrum order: score, fewer escaped defects, earlier date, earlier entry", "kanban breaks the last tie by the lower average cycle time" |
| S-3.7b | Team name generated, adjective-animal, host may redraw, never typed | done | `c/names.test.ts` |
| S-3.7c | Published once per room by the facilitator; stored fields; top 10 month and all-time per framework | done | O-12 |

#### Section 4 and 5

| Id | Requirement | Status | Evidence |
|---|---|---|---|
| S-4.1 | `POST /api/room` returns a code; same origin only; 5 per minute per address | done | `w/http.test.ts` (creation, foreign origin, "five rooms per minute per address"); `worker/wrangler.toml` CREATE_LIMIT 5 per 60 s |
| S-4.2 | WebSocket route; hello, welcome, view; reconnect with id and token in sessionStorage | done | `w/room.test.ts`; `w/handshake.test.ts`; `g/remote.test.ts`; `i/privacy.test.ts` "the device storage the page uses is the storage the privacy text names"; S7 "a reload keeps the same seat" |
| S-4.3 | Client `do`; refused actions get `error` with a code only; the six codes | done | `c/machine-refusals.test.ts`; `c/wire.test.ts` "the error codes and room codes the wire shares are checked from one list"; `w/room.test.ts` "a refused action answers an error and nobody else hears of it" |
| S-4.4 | `GET /api/room/leaderboard` cacheable 60 s | done | `w/http.test.ts` "the leaderboard answers both lists and may be cached for sixty seconds"; `w/hardening.test.ts` leaderboard cache tests; S7/K6 list shows the team |
| S-4.5 | Limits: 2 KB per message, 20 per 5 s, 6 per room | done | `c/wire.test.ts` "a message over 2 KB is refused, counted in bytes"; `w/room.test.ts` "twenty messages per five seconds per connection", "the seventh player gets room_full" |
| S-4.6 | Every view carries server `now` and `controls` | done | `c/machine-lobby.test.ts` "controls tell each player what they may do right now"; `g/store.test.ts` "estimates the server time from the last view" |
| S-4.7 | Tokens kept by the server; joining is a server action | done | `w/tokens.test.ts`; `c/wire.test.ts` "a client may never send a server action" |
| S-4.8 | Room code: five letters from the fixed alphabet | done | `w/http.test.ts` "generated codes only use the alphabet"; `g/controller.test.ts` code normalisation |
| S-5.1 | Room deleted when empty for the grace or 2 hours after creation; hibernation; alarm | partial | Code and tests are right (`w/alarm.test.ts`, 11 tests; hibernation `w/room.test.ts` "a state written before hibernation is read back"), grace is 15 min. Spec text still says 5 minutes. Fix the spec |
| S-5.2 | Leaderboard: one object, SQLite, only rows that can appear | done | `w/leaderboard.test.ts` "rows that can no longer appear in any list are pruned"; `worker/wrangler.toml` storage sqlite |
| S-5.3 | Logs: event names, codes, counts only | done | `w/logs.test.ts` |
| S-5.4 | Routes only on the game host, `workers_dev = false`, own workflow | done | `worker/wrangler.toml` `workers_dev = false`, no `routes`; `publish-server.yml:125` `--route "${host}/api/room*"` from `SITE_HOSTS`; actual deploy: owner |
| S-5.5 | CSP allows the site and `wss://` of the host in `connect-src`, nothing else | done | `d` "a wrong connect-src fails in both files", "an extra connect-src origin fails", all `unsafe-*` tests; S7/K6 "served with the build's real Content-Security-Policy ... any violation fails the run" |

#### Section 6

| Id | Requirement | Status | Evidence |
|---|---|---|---|
| S-6.1 | Preact, one island; rendering is a function of the view | done | `app/game/` structure; `g/controller.test.ts`, `g/store.test.ts`; D-007 |
| S-6.2 | Local mode with scripted teammates; ten-minute solo tour | done | `g/local.test.ts` (reaches the summary, both frameworks, 3 to 6 players); `g/tour.test.ts`; T8 |
| S-6.3 | The listed screens exist | done | S7/K6 "screens reached" (44 and 41); tour; screenshots |
| S-6.4a | Every action by keyboard and by a button; dragging never the only way | done (weak) | No drag handlers in `app/` (searched); focus rules D-084; `e2e` drives by clicks only. Check: a keyboard-only run of one screen per phase in `scripts/e2e/` |
| S-6.4b | Focus moves to the new screen's heading | done | S7 "phase heading has focus after a screen change" (105x), K6 (96x); T8 "the coach heading has focus on each step" |
| S-6.4c | Timers not announced every second | done (weak) | `app/ui/Timer.tsx` (bar is `aria-hidden`); D-013. No test of the live-region behaviour |
| S-6.4d | Contrast AA | done (weak) | D-051 and design reviews state it; `.qa/contrast.mjs` is not a test and still reads a light theme that no longer exists. Check: a unit test of `app/styles/tokens.css` pairs, dark only |
| S-6.4e | Usable from 360 px; laid out for a laptop | done | `.qa/ux-fix3/hdr-*-360-*.png`, `.qa/design-fix/local-scrum-en-360-*`, `.qa/review5/tour360-*.png`, `lobby390.png`; S7/K6 "scroll width checks" (1629 and 1605, at 390 px on page 2) |
| S-6.5 | Below the game: short privacy text and exactly three outbound links; no byline | done | O-11c, O-13d; `d` link tests |

#### Section 7

| Id | Requirement | Status | Evidence |
|---|---|---|---|
| S-7.1 | Two dictionaries with the same keys; a missing key fails | done | `i/dictionaries.test.ts` "both dictionaries have exactly the same keys", "every parameter is present in both languages". A test failure, not the build itself |
| S-7.2 | Per-player toggle; first visit browser language else Romanian; language in localStorage, seat in sessionStorage; privacy text says both | done | `i/plural.test.ts`; `i/privacy.test.ts` device-storage test; `g/init.test.ts` |
| S-7.3 | Technical terms stay English; official event names; everyday name once | done | O-10c, O-10d; `i/fidelity.test.ts` |
| S-7.4 | Romanian article rules for English terms; "Developers" bare; statuses in English; "partner"; fixed names | done | `i/dictionaries.test.ts` (hyphenated article, partner, escaped defect, statuses, non-breaking hyphen tests) |
| S-7.5 | Glosses once for LGTM, Request changes, timebox, WIP, planning poker, story points | done | `i/dictionaries.test.ts` "beginner glosses are present once where the term first appears" |
| S-7.6 | Romanian register in detail | done | `i/dictionaries.test.ts` register tests (4); `i/tour.test.ts` |
| S-7.7 | Romanian friendly and informal, "email" without hyphen; English plain | done | `i/dictionaries.test.ts` "no cedilla letters, no hyphenated email, no exclamation marks in English"; language reviews (RO 8.9, EN 9) |
| S-7.8 | No platform, vendor or tool names | done | `i/dictionaries.test.ts` "no vendor, platform or tool names" |
| S-7.9 | Nothing claimed about Scrum or Kanban that the guides do not support; common practices are marked | done | `i/dictionaries.test.ts` (12 fidelity tests), `i/fidelity.test.ts` (9); `fidelity-2026-11-19-fifth.md` 9/10 |

#### Section 8

| Id | Requirement | Status | Evidence |
|---|---|---|---|
| S-8.1 | Dark only, no theme switch; printed sheet alone is light | done | O-18 |
| S-8.2 | IBM Plex Sans and Mono; status colours with one meaning each | done | `app/styles/fonts.css`; `app/styles/tokens.css`; `.qa/kit/g-tokens.png` |
| S-8.3 | Cards read like work items; stamp at LGTM; playful moments | done | `app/ui/Callout.tsx:38`; `app/ui/WorkItemCard.tsx`; screenshots `.qa/review/review-3-verdicts.png` |
| S-8.4 | Every animation respects reduced motion | done (weak) | Global rule `app/styles/base.css:168`. Not tested |
| S-8.5 | Firm's name not on the page | done | `i/privacy.test.ts` (the name appears only in the privacy text, per decision 24) |
| S-8.6 | One primary action per screen; Krug principles; trunk test | done (weak) | Five design/usability reviews, 8.9 at the fifth; no automated check, which is natural for this item |
| S-8.7 | Favicon is the top-bar mark | done | `public/favicon.svg`, `public/favicon.ico` |
| S-8.8 | Design review 18 Nov: theme chip, goal theme marked, sticky action bar, facilitator script one line, folded roles, focus, 44 px | done | Reviews 2 to 5; `.qa/ux-fix2` to `ux-fix4`; touch-target probe in `design-usability-2026-11-19-fifth.md` (no control under 44 px at 390) |
| S-8.9 | Poker estimates goal theme first; `item.take` from backlog during Sprint in Scrum; `work.end_early` | done | `c/sprint-extra.test.ts` (8 tests) |
| S-8.10 | Third review: phone top bar one row with Menu; confirms in the panel; chart sizing; fold headers 44 px; velocity counts only estimated items | done | `.qa/ux-fix3/hdr-*`; `.qa/review5/menu390.png`, `paused390.png`; `i/fidelity.test.ts` "items without an estimate count 0" |

#### Section 9

| Id | Requirement | Status | Evidence |
|---|---|---|---|
| S-9.1 | TypeScript strict; type-stripping-safe tests | done | `core/tsconfig.json`; `npm test` command in `package.json` uses `--experimental-strip-types`. Note the host-name rule tension recorded in rank 9 above |
| S-9.2 | No prose comments in code | done (weak) | Rule stated in `CLAUDE.md`; sampled files carry doc comments only. Check: a lint script that fails on `//`, `/*`, `<!--` outside allowed forms |
| S-9.3 | No names of people, no email addresses, no mentions in code, documents, commits | done (weak) | The one contact address is only in `app/i18n/identity.ts` and the privacy text, as allowed (`i/privacy.test.ts`). Check: a script over the repo and the commit log |
| S-9.4 | Before "finished": tests, clean build of both variants, output check, browser run of a whole game on three pages | partial | S7 and K6 PASS but predate the boundary refactor; T8 PASS on the final build; Kanban-8 running, Scrum-8 not started. Close by reading `e2e-scrum-8.out` and `e2e-kanban-8.out` when both end with `RESULT PASS` |
| S-9.5 | Before publication: pilot with real beginners, reviewers 9/10 each | partial | Reviewer table under O-27; pilot is the owner's |
| S-9.6 | Three user reviewers do not gate v1 | missing | Not run (O-26) |
| S-9.7 | Tests and CI | done | `.github/workflows/verify.yml` runs `npm run test:all` (D-095); counts in the handover (418 root, 115 worker, 69 output check) were not re-run by me |
| S-9.8 | State-version and machine-error handling (D-089, D-090, D-091) | done | `w/machine-errors.test.ts` (6), `c/dispatch.test.ts`, `c/state-size.test.ts`, `w/benchmark.test.ts` |

#### Section 10, decisions D-001 to D-101: sampling of "does the code still match"

I checked the decisions that are easiest to drift from the code. The rest are pinned by tests that carry the id in their name (D-101) or by the files named in the table above.

| Id | Requirement | Status | Evidence |
|---|---|---|---|
| S-10.1 | D-025, D-026, D-049: CSP hashes, two-job publish, no unsafe-inline | done | `d` (hash, unsafe-inline, handler, style attribute tests); `scripts/csp-hashes.mjs`; `publish-*.yml` two-job structure |
| S-10.2 | D-036, D-037, D-059 to D-063: secret, token hash, handshake, caps | done | `c/rng.test.ts` D-036; `w/handshake.test.ts` D-061, D-062; `w/tokens.test.ts`; `core/config.ts` `socketsBackstopMax: 128` (matches D-062) |
| S-10.3 | D-077 to D-079: pause and grace | done | `c/pause.test.ts`; `w/pause.test.ts`; D-077 tests named in `c/machine-lobby.test.ts` |
| S-10.4 | D-080: EU jurisdiction, fails closed | done | `w/region.test.ts` (3 tests); `worker/wrangler.toml` `DO_JURISDICTION = "eu"` |
| S-10.5 | D-099, D-100: framework rules and split views | done | `core/machine/rules.ts`, `scrum-view.ts`, `kanban-view.ts`; `c/machine-kanban.test.ts` cross-framework tests. Handover says the full runs after this change are still pending (S-9.4) |
| S-10.6 | D-089: stale stored state ends the room | done | `w/machine-errors.test.ts` D-089 (two tests); `core/config` state version via `c/dispatch.test.ts` |
| S-10.7 | D-053, D-054, D-087: micro-learning as built | done | `i/learn.test.ts`; screenshots `.qa/micro/`, `.qa/ux-fix2/` to `ux-fix4/` |
| S-10.8 | D-094: the client logic is tested under node | done | `app/game/test/*.test.ts` (7 files) |
| S-10.9 | D-005, D-006: output check and size budget | done | `d` (budget tests); `scripts/check-dist.mjs` |
| S-10.10 | Spec text itself consistent | partial | The contract text lags in two places (section 5 grace 5 minutes; section 1 header "fourteen decisions"); see rank 5 |

## 4. Weak-evidence list, and what would make each strong

| Id | Why weak | What would make it strong |
|---|---|---|
| O-2b | Timebox arithmetic only | Pilot session with a stopwatch; or add a config test that sums timeboxes and asserts 45 to 60 minutes with cards |
| O-4c | "More than fit" is inferred from run logs | Test: ten items with total estimated capacity above what a three-player team can finish; or keep as an assertion in the e2e that the Sprint ends with items left |
| O-17b | Colour distinctness has no test | Contrast and distinctness test of `--lg-tour` against the primary accent tokens |
| O-19c | The "n of m right" line has no test | Unit test of the summary view builder, or an e2e assertion after answering a check question |
| O-19b | No whole-game run answers a check question | Add one answered and one skipped question to `scripts/e2e/` |
| O-25 | Process rule | None needed; the handover is the record |
| S-2.4, T-3 | Workflows inert until `PUBLISH_ENABLED=true` | Dry run of both workflows on a branch; the staging check for the server |
| S-3.3h | No timing data | Pilot timings per item size |
| S-3.5e | "Priority order is not size order" not pinned | Property test across seeds on the generated backlog |
| S-3.5n | The "please start now" mark has no test | e2e assertion in the arrival step; K6 only checks the arrival happens |
| S-3.5p | Request changes above the WIP limit is true by construction, no test | Test in `core/test/machine-kanban.test.ts`: limit reached, request changes on a review item, item returns to In Progress |
| S-6.4a | No keyboard-only evidence | Keyboard-only e2e of one screen per phase |
| S-6.4c | No test of live-region behaviour | Component test or e2e reading `aria-live` regions during the context-switch countdown |
| S-6.4d | `.qa/contrast.mjs` is manual and stale (reads a light theme) | Move into `app/i18n/test` or `scripts/` as a test over dark tokens |
| S-8.4 | Global CSS rule, untested | Computed-style check under emulated reduced motion in a browser probe |
| S-8.6 | Subjective | Keep as reviewer score (needs 9) |
| S-9.2 | Rule enforced by convention | Lint script failing on prose comments |
| S-9.3 | Rule enforced by convention | Script over files and `git log` for addresses and mentions |
| O-1b, S-1.4 | Needs people | The pilot session with three closing questions |
| O-20b | Real people only in the pilot | Pilot |
| O-26 | Not run | The three evaluator runs |

Every row marked "done (weak)" in section 3 is in this list.

## 5. Notes for the owner

- Everything in section 3 that says "owner" needs no code: publish decision (O-14a), subdomain and directory (O-21b), repository commit, push and re-clone (O-15), and the pilot (O-1b, S-1.4, S-9.5). The off-code items of the GDPR and security reports (staging test, processing agreements, lawyer) are outside this list and stay on the handover's owner list.
- The three whole-game logs I could use (S7, K6, T8) are strong evidence for play, leaks, focus, publication and the leaderboard, with the limit that two of them predate the boundary refactor.
- Nothing in this audit found a requirement that is entirely unimplemented except the three user-role evaluators.
