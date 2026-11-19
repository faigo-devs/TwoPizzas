# Two Pizzas: third design and usability review, 2026-11-19

Build `.qa/dist-d3` (`astro build`, then `scripts/csp-hashes.mjs`), served on 4420; session `d-c` (closed, server stopped).
Screenshots of this run: `.qa/design/r3/`. Screens of the summary sheet, print layout, Kanban comparison: `.qa/ux-fix2/` (EN and RO, 1280 and 390); the Kanban verdicts and flow metrics I reached myself in local mode (`r3/k-verdicts-all.png`, `r3/k-metrics.png`).
Driven live: 1280x800 (EN), 390 and 360 (EN, a RO probe through `.qa/ux-fix2/`), mouse and real keyboard (Enter on focused buttons). 768 was not driven this time (clean in the last run).

## Scores

**Design: 8.5 / 10. Usability for real beginners: 8.5 / 10.**
Both are 0.5 to 1 above the second review, not yet 9. What stands between each and 9 is in section 5.

## 1. Status of the second report

| Second-report finding | Status | Evidence |
|---|---|---|
| Native `window.confirm` x2 | **Fixed, with one new defect** | Leave: inline in the top bar ("Leave this game? You will lose your progress." + red "Yes, leave" + "Cancel"), focus on "Yes, leave", "Cancel" returns focus to "Leave the game" (`r3/leave.png`). Finish half: inline in the sticky bar ("This ends the first half of the Sprint and moves on to the Daily Scrum. Continue?"), focus on "Yes, finish it" (`r3/finish-click.png`). **New defect:** at 390 and 360 px the Leave confirm pushes the language toggle off screen and the page scrolls sideways (`scrollWidth` 417 at 390 and 392 at 360; `r3/leave-390.png`, `r3/leave-360.png`). |
| Focus after list actions (select, put back, take, move) | **Fixed for select; partly for take** | Keyboard Enter on "Select for the Sprint: #3" moved focus to "#4", Enter again to "#5" (a whole list can be selected from the keyboard). "Take: #2" with Enter ended on the `H2 Board` heading (the scripted team moved the item into Review in the same moment, so the button was gone; one probe, not conclusive). "Move to Ready" was fixed by the team but I did not re-probe it. |
| Focus after the pause | **Fixed** ("Start the pause" puts focus on "I'm back"). After "I'm back" focus goes to the screen heading, not back to "Pause"; acceptable. |
| Focus after a cancelled confirmation | **Fixed** (Cancel on Leave returns to "Leave the game"; the finish confirm's Cancel was not reached because the clock moved on, but it uses the same component). |
| "Finish this half" not mentioned in "What you should do now" | **Fixed** ("Or, if the team is done, finish this half of the Sprint now (the button is at the bottom)", `r3/finish-bar.png`). |
| Blocked item not stated as blocked | **Fixed** ("#4 config-loader is blocked: it needs information from the team. Ask your teammates, or open it to look."). |
| Confirm names the wrong event in Kanban | **Fixed for Scrum** (names the Daily Scrum for half 1; the Sprint Review for half 2 per the code); Kanban's bar was not reached. |
| Sticky bar over the last content | **Fixed** by the 7rem padding in the live page (the full-page captures still show the bar mid-page; that is a capture artifact). |
| Product Backlog fold header 25 px | **Fixed** (44 px measured). **But** the other fold, "What happened in Sprint Planning/Delivery review" (`<summary>`), is still 358x25 at 390 px (`r3` probe; also at 1280). |
| Quick check touches "What you should do now" | **Not re-verified** (I did not reach a board with a check this time); the team's fix was to move it below. |
| Phone tour bar cut and duplicate | **Fixed** (bar appears only after the coach scrolled away; the task wraps to two lines: "Step 4 of 14 Move the components with the arrows until every rule holds, then submit the answer."; `r3/tm-scrolled.png`, `r3/tm-top.png`). Residual: at the first scroll the bar (about 130 px) covers the puzzle's arrows and Submit button until you scroll past (`r3/tm-scrolled.png`). |
| "Value" and "Est." unexplained | **Fixed** (a grey line under the heading of the estimate and select steps: "Value: what the item is worth when it is Done with a right answer. Est.: the team's estimate, in story points.", `r3/poker.png`). It is 14 px low-contrast grey; fine for a legend. "+5 value" on the goal cards was not covered. |
| Public-list failure | **Fixed** ("Leaderboard / The list is not available right now. Try again", `r3/start.png`). |
| Pause time as a duration | **Fixed** ("You are on a break, 5 minutes left. The game keeps running; your team sees you away until 10:15."). |
| "this half of the Sprint" | **Fixed** (bar and hint say "this half of the Sprint"). |
| Romanian "Sprintului / Sprint-ul" | **Not re-checked**; "Se așteaptă ca facilitatorul…" (missing article) is fixed (`ux-fix2/kanban-ro-390-s14.png`). |
| Header height on a phone | Unchanged: two rows in a game at 390 px, three in Romanian with the timer (`ux-fix2/kanban-ro-390-s11.png`), about 200 px before content. |

### Remaining items from the usability test (F-7 to F-18), now seen
- **F-9 eleven reveal clicks: fixed.** "Show all verdicts" exists next to "Show the next verdict" (`r3/k-verdicts-all.png`).
- **F-10 result sheet: fixed.** The score has a one-line definition ("Score = the value of the items with a right answer in both Sprints, plus the Sprint Goal bonus. An item with a wrong answer that got an LGTM adds no value."), "Print or save" is at the top and at the end, and "Your quick checks: You got 3 of 6 right" with an "Each question and its answer" fold (`ux-fix2/scrum-en-1280-summary-full.png`).
- **F-11 warning on good news: fixed** ("Items still open: No item is still open: nothing is waiting." with a check mark, `r3/k-metrics.png`).
- **F-7 / F-8 / F-18:** not verified (not reached).

## 2. The screens I could not reach last time

**Summary sheet, EN 1280** (`ux-fix2/scrum-en-1280-summary-full.png`): clear. Score, the formula sentence, four KPIs, a per-iteration table, a paired bar chart (hatched Sprint 1, yellow Sprint 2, values at the end of each bar), the cycle-time dots with an average marker, "Recap of the events" with "Used 00:12 of 06:00 · inside the timebox", observations as WORTH A LOOK / WENT WELL, the quick checks, and "What each event is for" in cards. It is long (about 4000 px at 1280) but ordered by importance. Weak points: Velocity "0" in Sprint 1 beside 44 value (no estimates were made; the observation explains it, but the KPI looks like an error); the bar chart's Sprint 1 hatch is heavy; the card for the last event sits alone on the left.
**Print layout** (`.../scrum-en-1280-summary-print-full.png`): white, ink-friendly, status colours darkened, buttons dropped, quick-check answers expanded ("Right answer ... You chose ..."). **One defect:** the bottom "Print or save" button appears at the end of the printed page (the print rules hide `button`, but the new end-of-sheet button is still drawn in the print capture).
**Phone** (`ux-fix2/*-390-summary-full.png`): not opened in full; the 390 captures exist for all four combinations.
**Kanban comparison of rounds** (`ux-fix2/kanban-en-1280-s16.png`): good. "The action from last round: No action was chosen last time", and four paired bars (value, right answers, throughput, escaped defects) with a legend "Round 1 / Round 2". It does not say which direction is better, and the bars fill only the left half of the card (wide empty right).
**Delivery review verdicts** (`r3/k-verdicts-all.png`): clear, but the long "escaped defect" explanation is repeated on every wrong card (three times in a row). Say it once at the top ("An escaped defect is...") and keep the card to "Wrong answer (escaped defect)".
**Delivery review flow metrics** (`r3/k-metrics.png`): four plain cards (WIP, Throughput, Cycle time, Work item age) with one sentence each; "Escaped defects: 3 · WIP limits: none". **Defect:** in the cycle-time chart the top dot of the tallest stack overlaps the chart's title ("CYCLE TIME OF EACH FINISHED ITEM"), and the chart is squeezed into a narrow column beside the "Items still open" card. The verdicts list is shown again under the metrics (duplicate of the previous step).
**Romanian** (`ux-fix2/kanban-ro-390-s11.png`, `s14.png`): copy is natural ("Roagă-i pe toți să scrie note…", "Se așteaptă ca facilitatorul să stabilească limitele", "nicio limită încă"); the three-row header (Pauză / Părăsește jocul / language, then the timer) is the heaviest part on a phone.

## 3. New findings

### Major
- **Leave confirmation breaks the header at 390 and 360 px** (page 417 and 392 px wide; the language toggle is clipped). Let the confirm take its own row below the top bar on a phone, or make it a bar like the finish confirm.

### Minor
1. **Two fold headers are 25 px** ("What happened in ..." on every phase card and board). Make them 44 px like the Product Backlog fold.
2. **Print: the end-of-sheet "Print or save" button is not hidden.**
3. **Cycle-time chart overlaps its own title, and is too narrow** (`r3/k-metrics.png`); give it the full card width or add top margin for the dot stack.
4. **The inline finish confirm is cramped** (text wraps in the sticky bar; "Cancel" is a bare text button; the old hint "Nothing is left to do..." stays beside it). Hide the hint while confirming and make "Cancel" a ghost button with the same 44 px height.
5. **Verdict cards repeat the escaped-defect definition** on each card.
6. **Focus after "Take" lands on the screen heading** when the card disappears at once (one probe).
7. **The tour's sticky bar covers the puzzle's controls** at the first scroll on a phone.
8. **Header is two or three rows on a phone**; put "Pause" and "Leave the game" into one menu button on phones.
9. **Velocity 0 in Sprint 1 next to a large value** in the summary: add a subtitle "no estimates" under the 0.

### Polish
- Compare-rounds bars use half of the card width; wide screens waste the right half.
- "Done" items in the Review fold and the final summary use slightly different label styles for the same verdicts.

## 4. What works well (do not undo)

The start screen and its calm "list is not available" line; the one-line phase card; the poker legend and "middle card"; theme chips; the goal-miss explanation; "What you should do now" with its new sentences (blocked, "or finish this half"); the inline confirmations in place of native dialogs (same look as the rest, Yes/Cancel, focus handling); the keyboard-selectable planning list; "Show all verdicts"; the plain metric cards with one sentence each; the summary's score definition, quick-check recap and end-of-sheet print button; the print stylesheet (white, dense, answers expanded); the phone tour bar that appears only when the coach is off screen and wraps to two lines; contrast (min ratio measured 6.07 in the earlier sample, unchanged); no horizontal overflow at 360/390 except the Leave confirm.

## 5. What stands between each score and 9

**Design 8.5, to 9:** (1) fix the Leave confirm overflow at 360-390 px; (2) fix the chart-title overlap and give the flow-metrics chart room (and the comparison bars); (3) 44 px fold headers everywhere, hide the print button, and calm the cramped finish confirm. Everything else is polish.

**Usability 8.5, to 9:** (1) finish focus after "Take" (and verify "Move to Ready" and "Put back" with the keyboard); (2) say the escaped-defect lesson once in the Delivery review/Review rather than on every card, and remove the duplicate verdict list under the metrics; (3) make the phone header one row in a game (menu for Pause/Leave) so the first screen shows content, and keep the tour bar from covering the puzzle's own buttons. Then the pilot with real beginners: the F-7 and F-8 findings and the Kanban finish bar (and its confirm text) are still to be seen on screen.

## 6. Could not check
768 px this run; the Kanban "Finish this half of the round" bar and its confirm text; the Romanian leave confirm at 390 (likely wider than the English text, so the overflow is probably worse); the quick check's new position; F-7, F-8, F-18; real remote rooms, screen readers, real touch devices.
