# Two Pizzas: fifth design and usability review, 2026-11-19

Build `.qa/dist-d5` (`astro build`, then `scripts/csp-hashes.mjs`), served on 4420; session `rev-b` (closed, server stopped). Screenshots: `.qa/review5/`. Existing evidence read: `.qa/ux-fix4/` (kit finish, Kanban 1280).
Driven live: the tour at 360x740 (steps 1-4, bar collapsed and open); the phone Menu at 390 (EN): open, Pause picker, pause start, "I'm back", focus at each step; the lobby at 390; the Scrum RO game on a phone (390) from the lobby to an open item (lobby, goal, poker, selection, board, deploy-order workspace); Scrum EN at 768 to the board; Scrum EN at 1280 through the Review verdicts to the retrospective. Not driven: the real-game finish confirm (see below), Kanban RO on a phone, the Kanban delivery screens beyond `.qa/ux-fix4/`.

## Scores

**Design: 8.9 / 10. Usability for real beginners: 8.9 / 10.**
One defect separates each from 9, and it is the same one (blocker 1 below). Everything else I found is nice to have.

## 1. Fixed from the fourth pass (verified)

| Fourth-pass item | Result | Evidence |
|---|---|---|
| Tour on a phone: stacked sticky layers | **Fixed** (at 360x740, which they had not run) | The tour bar is one row of 60 px ("Step 4 of 14 ↑" and Next); Back and the task open behind the toggle (`tour360-open.png`). Submit sits at 600-652 px, clear of the bar (top ~677). With the rules and the first rows visible above Submit (`tour360-s4b.png`). Residual only: the sticky Submit footer overlays the second and third rows while you scroll (nice to have). |
| Menu items looked like text; focus not in the menu | **Fixed** | "Pause" and "Leave the game" are 44 px bordered buttons; focus moves to Pause on open (`menu390.png`). |
| Menu stays open after a pause | **Fixed** | After "Start the pause" the panel closes; focus lands on "I'm back" in the banner; after "I'm back" focus returns to the Menu button (`paused390.png`). |
| Logo link 32 px | **Fixed** (the 390 touch-target probe lists no control under 44 px). |
| Language only in the menu | **Fixed for the lobby** (inline RO/EN toggle plus the Menu in the lobby header, `lobby390.png`); in a running game it is in the Menu only, as intended. |
| Kanban finish not offered / unexplained | **Fixed in copy** | "Nothing to do right now: 2 more requests are still coming. 'Finish this half of the round now' appears once they have all arrived." Kit screens: finish bar, then the inline confirm "This ends the work of the round and moves on to the Delivery review. Continue?" with "Yes, finish it" and "Cancel" (EN 1280 and RO 360, `ux-fix4/kit-finish-*`). Reads well. |
| Flow plot half empty | **Fixed** (plot and "Items still open" side by side from 1000 px, `ux-fix4/kanban-en-1280-s09.png`; dots no longer huge). |
| 768 px not driven | **Done**: Scrum EN at 768 plays cleanly: the facilitator line goes full width, the board in two columns, header Pause/Leave/language inline, no overflow (`s768-board.png`). |

## 2. Things I could not reach before

- **Real-game finish confirm (Scrum and Kanban):** not reached again. In two attempts the scripted team either took the items or my own Take clicks pulled Product Backlog items, so the board never went idle in time. What I verified earlier in a real Scrum game (third pass) still holds: the bar, the inline confirm with the next event named, focus on "Yes". Kanban: kit only.
- **Romanian game beyond the goal screen on a phone (390):** fine. Planning poker, selection (aria "Selectează pentru Sprint: #1 ..."), the board ("Ce ai de făcut acum: Ia următorul element: #1 invoice-export"), the workspace ("Lucrezi doar tu la acest element. Vezi tot ce îți trebuie."), no overflow at 390, one-row header with the clock and Menu (`ro-poker390.png`, `ro-board390.png`, `ro-ws390.png`). Copy is natural; "Sprint‑ul" keeps its hyphen together. Small: the button "Ia" is terse next to "Deschide" and "Renunță"; "Valoare" and "Estim." are legible.
- **Retro at 1280 (your lone heading):** it matters, see blocker 1. **Desktop Pause and Leave as plain text:** see nice to have 1.

## 3. Blockers (only these block 9)

**1. The "What happened in ..." fold has no visible disclosure marker (retrospective, Daily/other event folds; 1280 EN, 768, also seen in the Kanban retro at 1280; Romanian the same).**
Screen: Sprint Retrospective, step 1 "Write your notes", right column under the facilitator line (`retro1280.png`). The fold is a `<details>` whose `<summary>` is `display:flex`, which removes the browser's triangle (computed `list-style: inside none disclosure-closed`, `::before` none); only the "All steps" fold draws its own marker. The result is a bold heading with nothing under it, while the content behind it ("Defects escaped the review: 1 item had a wrong answer and still got an LGTM", "The Sprint Goal was met") is exactly the evidence the team needs to write notes (`retro1280-open.png`). A beginner reads it as a dead heading and never opens it; in the second pass it did have a triangle, so this is a regression. It blocks both scores: for usability it hides the learning loop; for design it is a control that does not look like one next to "All steps" and "Roles, real life, typical mistake" which do.
Fix: give this summary the same marker as the other folds (one shared fold style), keep it 44 px high, and consider opening it by default on the retrospective step 1 (the notes are written from it).

## 4. Nice to have (do not block 9)

1. **Desktop Pause and Leave look like plain text** (top bar, 1280 and 768, EN and RO; `retro1280.png`). They are small grey labels beside the language toggle, while on a phone they are bordered buttons. Acceptable because both are rare, but a first-time player may not see Pause as an action. Give them a ghost border (same as the phone buttons).
2. **Tour on 360x740:** the sticky Submit footer overlays rows 2-3 of the order list while scrolling (`tour360-s4b.png`); consider a solid footer background.
3. **Vote step in the automated Kanban capture shows empty columns** (`ux-fix4/kanban-en-1280-s12.png`: "2 votes left" and nothing to vote on). In my own plays the bots' notes appear, so this looks like a runner artifact; check that a team that writes no notes still gets something to vote on or a clear "no notes to vote on" line.
4. **Retro "Typical mistake" paragraph** sits tight under the last observation card (`retro1280-open.png`); add 8 px.
5. **"Ia" (Take) in Romanian** is short; "Ia elementul" may read better on a phone.
6. **The finish confirm in a real Kanban game** should be played once in the pilot.

## 5. What works (do not undo)

The one-row phone header with the clock; the Menu with bordered Pause and Leave, the pause picker inside it and the focus path; the tour's one-row bar with Next always in reach; stacked inline confirms; keyboard focus that follows the work; "What you should do now" in both languages (including Kanban's "N more requests are still coming"); the Romanian game copy and layout on a phone; the 768 two-column board; plot and open-items side by side; the summary and print layout from the earlier pass.
