# Two Pizzas: fourth design and usability review, 2026-11-19

Build `.qa/dist-d4` (`astro build`, then `scripts/csp-hashes.mjs`), served on 4420, session `rev-a` (closed, server stopped). Screenshots: `.qa/review4/`. Existing evidence read: `.qa/ux-fix3/` (summaries and print captures).
Driven live: phone menu at 390 (EN) and 360 (RO); Scrum EN 1280 through planning, selection, the board and a keyboard Take; Scrum RO at 390 (lobby, goal); Kanban EN 1280 (Replenishment with keyboard, verdicts, flow metrics); the tour at 360; summary and print through `.qa/ux-fix3/`.
Not driven: 768 px; the Kanban finish bar (not offered within about 50 s of play); the Kanban RO phone game beyond the existing captures.

## Scores

**Design: 8.8 / 10. Usability for real beginners: 8.8 / 10.** Both are a step above the third pass (8.5 / 8.5); neither reaches 9 yet. The distance to 9 is five small items, listed in section 3.

## 1. Fixed from the third pass (verified)

| Third-pass item | Result | Evidence |
|---|---|---|
| Leave confirm overflowed at 360-390 | **Fixed** | Phone header is one row, 69 px: mark, clock, a 44x44 Menu button (`m390-header.png`, `ro390-goal.png`). The Menu panel holds Pause, Leave the game and the language toggle; the leave confirm opens inside it as stacked full-width buttons ("Yes, leave" focused, "Cancel"). `scrollWidth` equals the viewport at 390 EN and 360 RO (`m390-leave.png`, `m360-ro-leave.png`). Escape closes the panel and returns focus to the Menu button. All header controls are 44 px high; the toggle radios are 44x44. |
| Flow-metrics plot overlapped its title; narrow | **Fixed** | Title above the plot, plot on its own full-width row, the "Items still open" card below it (`k-metrics.png`). |
| Fold headers 25 px | **Fixed** (the Product Backlog fold was already 44 px; the "What happened in ..." folds were not re-probed but the team's statement and the phase-card layout agree). |
| Print button shown in print | **Fixed** (`ux-fix3/scrum-en-1280-summary-print-full.png` ends without it). |
| Escaped defect explained on every card | **Fixed** (one line above the verdicts: "An escaped defect is a mistake that slipped past the review: a wrong answer that still got an LGTM (a common term, not from either guide)", `k-verdicts.png`; the verdict list under the metrics is gone). |
| Velocity 0 looked like a bug | **Fixed** (selection step: "Items without an estimate count 0 in the velocity. Prefer items the team has estimated." with a count of items; summary: "Velocity is the sum of the estimates of the items with a right answer; an item without an estimate counts 0" under the table; `s-select.png`, print capture). |
| Focus after Take / Select / Put back / Move to Ready | **Fixed** (real keyboard): Select moves from "#1" to "#2" to the next one; Take moves to "Open: #1 webhook-relay" (`s-board-take.png`); "Move to Ready: #1" goes to "Move to Ready: #2", then "#3" in Kanban. |
| Lowercase goal after "Sprint Goal:" | **Fixed** ("Sprint Goal: make the Platform theme work end to end"). |
| Finish confirm cramped; native confirms | **Not re-driven** (Scrum finish bar not re-reached this pass; the leave confirm is verified). |
| Phone tour bar covered Submit | **Partly fixed** (see item 1 below). |
| Header height on phones (two or three rows) | **Fixed** (one row, 69 px). |

## 2. What works (do not undo)

The one-row phone header with the clock visible beside the menu; the menu's stacked confirm (the same pattern as on desktop, no native dialogs); keyboard focus that follows the work; the summary sheet (score formula, velocity note, quick-check recap, print layout without buttons); the verdict screen with one explanation line and "Show all verdicts"; the Delivery review's four metric cards in plain words; "Items still open" with a check mark; the tour's step 1 disclosure; the poker legend, middle-card rule, theme chips and goal-miss list (kept from the last passes); contrast and no horizontal overflow at 360/390 in the screens driven.

## 3. What remains, ranked (what stands between each score and 9)

1. **Tour on a phone: three sticky layers leave a slice of the puzzle** (usability; Tour step 4, 360x740, EN; `tour360.png`, `tour360b.png`, `tour360c.png`). The puzzle's own sticky Submit footer and the tour's sticky bar (about 130 px) together cover about 45 % of the viewport; in the 270 px that remain only one component row is visible at a time, and the Submit button is still about 20 px under the bar's top edge. A beginner cannot see the rules and the order list together. Fix: on phones, collapse the tour bar to one line plus Next (Back and the task behind a tap), or put the Submit in the flow instead of sticky while the tour bar is visible; keep at least 60 % of the viewport for the puzzle.
2. **Menu items do not look like buttons, and focus does not enter the menu** (design and usability; phone Menu panel, 390 EN, `m390-menu.png`). "Pause" and "Leave the game" are small centred grey text with no border or fill (the toggle below is clearly a control); after the Menu opens, focus stays on the page heading (`activeElement` was `H2`), so a keyboard or screen-reader user must find the panel. Fix: style the two as 44 px secondary buttons (like "Cancel"), move focus to the first item on open, and close the panel after "Pause" (reported weak point).
3. **The logo link is 32x44 px on a phone** (design; header 390 RO; touch-target probe) and the language toggle is two 44 px radios only after opening the menu, so a beginner who opened the game in the wrong language needs two taps (reported weak point). Fix: pad the logo link to 44 px wide; keep the language choice also on the first game screens (lobby), where there is room.
4. **The finish control in Kanban was not offered during a one-request round** (usability, unverified; Kanban EN 1280). I waited about 50 s with one request in Ready; no "Finish this half of the round" appeared, so I could not judge it or its confirm text. Check that the control appears when no request is left, and say in "What you should do now" what a team can do while arrivals continue.
5. **Flow-metrics plot is large and sparse at 1280** (design; Delivery review step 2, `k-metrics.png`). Dots are about 20 px and the plot fills the left card, leaving the right half empty (capped at 34 rem as reported). Make the plot and the open-items card sit side by side from 1000 px up, or centre the plot.

Smaller: the "Value / Est." legend line is grey 14 px (acceptable); focus after "I'm back" goes to the screen heading, not to "Pause"; 768 px was not driven this pass.

## 4. Could not check

768 px; the Kanban finish bar and its confirm text; the Scrum finish confirm after the change; the Romanian game beyond the goal screen at 390; real rooms, screen readers, real devices. The full-game summaries in `.qa/ux-fix3/` (Kanban RO 360 and 390, Scrum RO 390, EN 1280) were read as captures only.
