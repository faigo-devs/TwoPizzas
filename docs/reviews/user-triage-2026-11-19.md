# Triage of the user testers' criticisms, 19 November 2026

The orchestrator acts only on a criticism that reproduces, hurts learning or the session's flow, and does not
contradict an owner's decision (decision 26). Each line: the criticism, the verdict, the action.

## Beginner (phone, Romanian): recommend 6, clarity 6

| # | Criticism | Verdict | Action |
|---|---|---|---|
| 1 | "Create a room" fails with "Nu a mers. Încearcă din nou." and no reason | Partly real. The failure itself came from the test setup: the page copy on port 4430 had no room server behind it. The message is real: when the room server cannot be reached it gives no reason and no next step. "No solo practice button" is by design: the solo path is the tour (owner's decision), and practice mode is a test address only. | Fix the copy: say that the rooms cannot be reached right now, and offer the tour meanwhile. |
| 2 | The tour contradicts what the player just did (step 5 countdown, step 8 "you did not work on this item" for #7 that the player solved, step 7 help lost by the Daily, #8 shown wrong although never touched) | Real. The tour is scripted, so it reproduces every time, and it confuses a beginner exactly where it teaches. | Make the scenes consistent with the player's own actions. |
| 3 | The closing quick question asks for the Retrospective timebox, which the tour never taught | Real. Micro-learning must test what was taught. | Ask about something the tour covered, or have the tour say it. |
| 4 | Jargon-heavy copy: no plain definition of Developers, Increment, Sprint Backlog or WIP limit; step 10 is a long paragraph | Real for the target audience (people who never worked in Agile). Terms stay in English by owner's decision, so the fix is a definition, not a translation. | Define each term in plain words once, where the tour first uses it. Shorten the longest step texts. Add nothing to the screen. |
| 5 | On a phone the sticky Submit and the tour bar cover the rules list | Real. A second, independent source (fifth design review, nice-to-have) saw the same. | During the tour on a phone, Submit sits in the page flow instead of being sticky. |
| 6 | "Next" appears only in the bottom bar after the task is done | Minor. | None before version 1. |
| 7 | English words (LGTM, Request changes, In Progress) on Romanian screens | By design (owner's decision: technical terms stay in English). "Request changes" is never explained, which is real and minor. | The tour's review step says in a few words what Request changes does. |
| 8 | A simulated retro note appears twice; the player's own note is missing on the vote screen; "0 elemente blocked nu au ajutor" | Real. D-088 says a note written in the tour is carried into the vote scene, so this is a regression. An observation with a count of 0 should not be shown. | Fix the carry-over and the duplicate. Do not show zero-count observations. |
| 9 | The Sprint Review step shows only verdicts, not what the meeting is for | Minor. The card states the purpose. | None. |
| 10 | The page opens in English | Not a defect. The page follows the browser's language, and the test browser was English. | None. |

## Facilitator (desktop, a real room with three pages): use with team 5, facilitator support 6

The tester reached Sprint Planning and the start of the first work half; the room server of the test setup then died
(its file watcher rebuilt it while another engineer edited the core, and the build service crashed). The later events
were not reached. Testers now run against a frozen copy of the server (`.qa/snap`), so edits no longer restart it.

| # | Criticism | Verdict | Action |
|---|---|---|---|
| 1 | "Connection lost" on every seat; after a reload the page sits on "Connecting to the room" with no way back | The drop itself was the test setup. Being stuck is real: a page that cannot reach its room keeps trying with no exit, which strands a facilitator whenever the server hangs. | Time out a connection attempt that gets no answer, and always offer a way back to the start page while connecting or after a fatal error. |
| 2 | No pre-brief and no total session time; the game starts straight into Sprint Planning | Partly real. The phase cards brief each event, but a facilitator has no view of the whole session before starting. | One fold in the lobby: "How the session goes", with the events in order, the game minutes of each and the total. Nothing else is added. |
| 3 | The facilitator script shows only the current event's steps; there is no agenda with minutes | Same need as 2. | Covered by the lobby fold. |
| 4 | The Sprint Goal vote shows no backlog: players vote on a theme without seeing its items | Real. A Sprint Goal is chosen from the Product Backlog, so the vote must show what each theme contains. | Under each goal option, list the items of that theme (id and name). |
| 5 | The backlog is not grouped by theme; there is no room link, only a code; players are anonymous | The anonymity is by design (no personal data). The others are minor. | None before version 1. |

The tester found nothing wrong about Scrum in Sprint Planning.

## Sceptical developer (laptop, English, a real Kanban room): recommend 6, trust in content 8

| # | Criticism | Verdict | Action |
|---|---|---|---|
| 1 | Flow rounds are short and the team finished 0 items in both, so the metrics were all zeros | Not reproduced. The tester drove three seats alone at about a second per action. The scripted whole-game runs finish items in every round. Round length is a pilot setting (the timeboxes live in `core/config.ts` so the pilot can tune them). | None now. Watch it in the pilot. |
| 2 | Round 2 starts empty, but the delivery review says open items "stay open, and age keeps growing" | Real. The copy contradicts what the game does and blurs a Kanban lesson. | Say both: in real work open items stay open and age keeps growing; the game starts round 2 on a fresh board so the two rounds compare fairly. |
| 3 | A phase change mid-puzzle silently drops the player's unsent answer | Real. Every work half ends on the clock, so anyone mid-puzzle loses their draft at the Daily and must redo it. | Keep each item's unsent puzzle state in the client across phase changes until it is submitted or the item leaves the player. |
| 4 | Keyboard: the leave confirm focuses "Yes, leave" and Escape does not cancel it; on the retro action step, Tab then Enter ends the retrospective with no action | Real. A destructive default is one key away. | Destructive confirms focus Cancel and close on Escape. Ending the retrospective with no action chosen asks for confirmation first. |
| 5 | The work item age (07:28 in a short round) is unexplained; one outside info duplicated a rule the pair already had | The age is minor: one line says it counts all time since the item started, meetings included. The duplicated info is real if the task generator can repeat a pair's rule, because it defeats the dependency between pairs. | Add the age line. Check the generator and fix it with a test if it can duplicate. |

What held up, per the tester: metric definitions and the "not in the Kanban Guide" labels are accurate; the LGTM review is the best part; a reload mid-game rejoins the same step; double clicks are safe; joining mid-game gets a clear refusal.
