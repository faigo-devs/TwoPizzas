# Two Pizzas: second design and usability review, 2026-11-19

Build: `npx astro build --outDir .qa/dist-d2`, then `node scripts/csp-hashes.mjs .qa/dist-d2`, served on port 4420; `playwright-cli` session `d-b` (closed, server stopped).
Screenshots: `.qa/design/r2/`. Driven live: 1280x800 (EN), 768 (RO lobby only), 390 and 360 (EN and RO), Scrum local, Kanban local (to round 2), the tour at 1280 and 390, mouse and keyboard probes.
Not reached in this run: the result sheet and its print layout, Kanban delivery metrics and charts, the Sprint 2 half, the code-review puzzle as a solver (see "Could not check").

## Scores

**Design (visual and interaction): 8.5 / 10.**
**Usability for real beginners: 8 / 10.**

Both are up from 7.5 and 6.5. The two things that hold them under 9 are listed at the end, with the few changes that would lift each to 9 or above.

## 1. Status of my first-report findings

| First report | Status | Evidence |
|---|---|---|
| M1 theme invisible, goal miss unexplained | **Fixed** | Theme chip on every item, Sprint Goal theme marked in yellow (`r2/select-full.png`, `r2/board.png`); "Items of the Platform theme that kept the goal from being met: #3 wrong answer, #5 not selected or not finished" (`r2/rev2.png`). Residual: "not selected" and "not finished" are listed together (the spec says the view cannot tell them apart; say it once in the card header instead of a grey line under the list). |
| M2 two "Step done" buttons | **Fixed** | Content button is now "Next step" / "Show the next verdict"; the script is one line with "Mark as done" and an "All steps" fold (`r2/rev1.png`, `r2/rev2.png`). |
| M3 retro "End" more prominent than "Choose" | **Fixed** | Both are secondary until a radio is checked and the action is confirmed; then "End the retrospective" turns primary (`r2/k-04...png` vs `r2/k-stuck.png`). |
| M4 focus drops to `body` | **Partly fixed** | After "Add note" focus returns to the note field (pressed with the keyboard). After "Select for the Sprint" and "Move to Ready" focus goes to the screen heading (`H2`), not to the next control, so a keyboard user must Tab through the whole list again for each item. After "Submit the answer" and "Take" I did not re-measure. |
| M5 action below the fold on a laptop | **Fixed** | "Begin" and the timebox are in the first screen (`r2/phase.png`); own poker cards sit above the table (`r2/poker.png`); a sticky action bar carries the step buttons (`r2/finish-half.png`, `r2/rev1.png`); on a phone the RO phase card shows "Începe" inside the first 844 px (`r2/ro-phase-390.png`). |
| M6 tour first screen noisy, skips planning silently | **Fixed** | Step 1 states "This tour skips Sprint Planning and the second iteration; the real game has both"; no stray observation callouts (`r2/t1.png`); the dashed outline now follows the game's own "What you should do now" (`r2/t3.png`). |
| m1 facilitator script in the tour | **Not re-checked** (tour steps 10-14 not walked this time). |
| m2 disclosure without a marker | **Fixed** (triangle on "Roles, real life, typical mistake" and "All steps"). |
| m3 pre-filled merge fields | **Fixed** ("Your results start empty"; legend "· means this side did not change the line"; `r2/merge-pair-full.png`). |
| m4 muddy disabled buttons | **Fixed** (neutral dark disabled style; `r2/goal.png`). |
| m5 "Sum of estimates" | **Fixed** ("Estimates of the selected items"). |
| m6 median | **Fixed** ("Record the middle card: 8. With an even number of votes, this is the higher of the two middle cards"). |
| m7 contradicting counts in the Daily | **Fixed** (the "3 items already Done" line is gone; `r2/daily.png`). |
| m8 touch targets under 44 px | **Mostly fixed**: nothing under 44 px on the start screen, lobby, phase card, poker, board, retro or the 390 px tour. One regression: the "Product Backlog: n items you can still take" fold header (`<summary>`) is 358x25 px. |
| m9 header height on a phone | **Improved**: one row on the start screen; two rows in a game (`r2/ro-phase-390.png`), about 100 px instead of 170 px. |
| m10 retro helper far from the note | **Fixed** ("I don't know what to write" sits under the note field; `r2/retro1-full.png`). |
| m11 "1 votes" | **Not re-checked.** |
| m12 "Leave" as text | **Fixed** (outlined button next to "Open"). |
| m13 Romanian copy defects | **Not re-checked in full.** New: the same sentence mixes "Sprintului" and "Sprint-ul" (`r2/ro-phase-390.png`). |
| m14 tour toolbar jump | **Not re-checked**; "Leave the tour" still drops under "Next" at 1280 (`r2/t1.png`), which is acceptable. |
| m15 duplicate heading on Replenishment | **Not re-checked.** |
| m16 start screen | **Fixed**: one fold at 1280, "Create a room" next to the Scrum/Kanban switch, a pink "Alone? Take the 10-minute guided tour" anchor at the top on a phone, the 14-step list kept (`r2/start-1280-full.png`, `r2/start-390.png`). |

## 2. Status of the simulated usability test (F-1 to F-18)

| Finding | Status | Note |
|---|---|---|
| F-1 focus after in-place actions | **Partly fixed** | See M4 above (notes: fixed; select and move: lands on the heading). |
| F-2 identical names on repeated controls | **Fixed** | "Select for the Sprint: #3 rate-limiter", "Take: #4 profile-page", "Move to Ready: #1 user-sync", "Leave: #4 profile-page", "Join as partner: #3 search-index". Poker "Vote 5" is unique per card. |
| F-3 phone: tour card scrolls away | **Fixed, with a flaw** | Sticky bar "Step 4 of 14 + one-line task + Back + Next" (`r2/tm4-scrolled.png`). Flaw: the task line is cut mid-sentence ("submit th...", "apo..."), and at scroll 0 the same instruction is shown twice (inline card and bar, `r2/tm4-ro.png`). Hide the bar while the inline card is on screen, and allow two lines. |
| F-4 estimation order | **Fixed** | Goal theme first ("Payments / Sprint Goal theme" chip on the item to estimate, `r2/poker.png`). Velocity after Sprint 1 not re-checked. |
| F-5 other events' text on the phase card | **Fixed** | One objective line, purpose, timebox, Begin, one "Good to know"; roles/real life/typical mistake and "What happened in ..." in folds; quick check at the right (`r2/workcard-full.png`). |
| F-6 contradicting "what to do now" | **Mostly fixed** | "Take the next item: #3 search-index." and "The Sprint Backlog is empty. You can take #5 report-builder from the Product Backlog." are clear. Remaining: for a Blocked item the box says "Open #3 to work on it" and does not say it is blocked and waiting for information (`r2/codereview-view.png`). |
| F-7 no confirmation after submit | **Not verified** | |
| F-8 who gave the LGTM in the tour | **Not verified** | |
| F-9 eleven verdict clicks | **Not verified** (the Scrum run had one verdict; Kanban verdicts were not captured). |
| F-10 result sheet | **Not verified** | |
| F-11 warning on good news | **Not verified** | |
| F-12 unexplained card words | **Partly** | "Value" and "Est." still have no gloss on the card; "Good to know" glosses planning terms. |
| F-13 "waiting for the facilitator" with no hint | **Partly fixed** | Retains a quiet line "Waiting for the facilitator to begin" (`r2/k-12...png`); the quick check gives the waiting player something to do, which helps. |
| F-14 retro note missing | **Not reproduced** | A typed note was added and the note field refocused. |
| F-15 sticky bar covers content | **Partly** | The bar floats over the last card on short pages (`r2/finish-half.png`, "Finish this half now" over the Done card; `r2/k-stuck.png`, over "Your own action"). It is translucent and the page scrolls past it, but the final option is hidden until you scroll; add bottom padding equal to the bar height. |
| F-16 check question tests nothing | **Partly** | The answers are now short and wrong ones are plausible ("The stakeholders / The Developers / The Scrum Master, as a status report"); good. |
| F-17 red error box for the public list | **Not fixed** | `r2/start-1280-full.png` still shows "The list could not be loaded" (expected without a server, but a failing list in production reads as a broken page; show "No teams yet" or hide). |
| F-18 merge "include the name?" | **Not checked.** |

## 3. The two controls nobody had seen

**"Finish this half now"** (`r2/finish-half.png`, Scrum, facilitator, Sprint Backlog empty and nothing in progress).
- Looks right: a sticky bar at the bottom of the board, secondary button "Finish this half now", a plain hint "Nothing is left to do in this half", it appears only when `end_work` is a control. It does not compete with the yellow "Take" in "What you should do now".
- First half: no confirmation, and none is needed (the work resumes after the Daily Scrum; `r2/daily.png` follows). Second half: a native confirmation ("This ends the work of the Sprint and moves on to the Sprint Review. Continue?").
- Weak points: (1) "What you should do now" says "The Sprint Backlog is empty. You can take #5 ..." and never mentions that the team may also finish, so a facilitator may miss the bar; add "or finish this half" to the box. (2) The bar only appears at the very end of the page, under the fold when the Product Backlog fold is open. (3) After cancelling the confirmation, focus lands on the "Board" heading instead of returning to the button (measured). (4) The message names the "Sprint Review"; Kanban has the "Delivery review" (the string `work.endEarly.confirm` should be per framework; I did not reach the Kanban bar).

**"Product Backlog: n items you can still take"** (`r2/pbfold-full.png`).
- Works: closed it is one line under the board; open it shows the sentence "The Sprint Goal stays the same; the Sprint Backlog may change during the Sprint (Scrum Guide)." and a 4-column grid of item cards with theme chips and outlined "Take" buttons (secondary, so the board's yellow action stays the main one). The goal-theme item is marked, and "What you should do now" suggests the right one.
- Flaws: the summary line is 25 px high (target size), the title does not say that taking changes the plan ("... and add to the Sprint"), and nothing says that taking more work than you can finish is the typical planning mistake (a single line would turn the feature into a lesson).

**Native `window.confirm` (leave the game; end the second half).** It is functionally right (two rare, irreversible actions; the half-1 ending skips it), but it does not fit: a white OS dialog on a polished dark interface, unstyled, no focus return, English or Romanian text but browser-language buttons, and browsers can suppress it after repeated use ("prevent this page from creating more dialogs"), in which case the action silently proceeds or fails. Replace both with an inline two-step control (the button becomes "Confirm: end the work" plus "Cancel", same place, focus kept) or a small in-page dialog with `role="alertdialog"`; for "Leave the game" say what is lost in the local mode and tour ("you will lose your progress") rather than "your seat".

## 4. New findings (fresh look)

### Major
None.

### Minor
1. **Focus after list actions goes to the heading** (Scrum "Select for the Sprint", Kanban "Move to Ready"); move focus to the next item's button, or to the "Start the work" button after the last one. (Same as M4 above.)
2. **"Product Backlog" fold target 25 px.** Make the summary 44 px high.
3. **Sticky bar overlaps the last content** on retro action and board (`r2/k-stuck.png`); add `padding-bottom` to the screen.
4. **Phone tour bar truncates the task and duplicates the inline card** (F-3 flaw above).
5. **Quick check card touches the "What you should do now" card with no gap** (`r2/board-check.png`) and sits above the main action during work (second half); it pushes the primary action down by about 100 px. Put it after the board or collapse it to one line during the work.
6. **Pause popover:** after "Start the pause" focus lands on the language radio (`INPUT`) (`r2/paused.png`); move it to "I'm back". The popover covers the local-mode banner while open (harmless).
7. **The blocked item says only "Needs info from the team"** on the card, and the box above says "Open #3". State "blocked: ask your teammates for ..." in the box (F-6 remainder).
8. **Step counter "Step 1 of 3" and "+5 value" remain small and unexplained** (`r2/goal.png`).
9. **Romanian:** "Sprintului" vs "Sprint-ul" in one sentence; check the whole dictionary for the hyphenation rule (spec: a hyphenated word never breaks at its hyphen, and a consistent form).
10. **Leaderboard failure box on the start screen** (F-17).

### Polish
- The focus ring on the quick-check result (a heavy white 3 px box around the whole result) is more than needed; use the same ring but with 2 px and an offset.
- In the tour the "Leave the tour" link and "Back/Next" stack unevenly at 1280.
- Full-page screenshots show the sticky bar mid-page; that is a capture artifact.

## 5. What works well (do not undo)

- The start screen: one fold, two zones, the tour linked from the top on a phone.
- The phase card: objective sentence in bold ("After this event you will know..."), purpose, timebox, Begin, one "Good to know", everything else folded.
- The quick check: one question, plain answers, immediate "Right." with a Guide-based reason, "Skip" always available.
- The item card with theme chips, the Sprint Goal marked, and the goal-miss explanation by item.
- "What you should do now" (now with "Take the next item: #3 ..." and "The Sprint Backlog is empty. You can take ...").
- Sticky action bar with one primary button per step; the bar is the same place on every screen.
- Poker: own cards above the table, the middle-card rule explained.
- Merge pair: "not yours" for the partner's column, empty result fields, legend for "·".
- Retro: helper next to the note field; the note field keeps focus after "Add note".
- Pause: five choices, a clear banner with the return time ("Your team sees you away until 06:49"), "I'm back" in the same row.
- Colour, contrast (no text pair below 6:1 in my sample: start screen, tour, Kanban), focus ring, reduced motion, `lang` switching (checked RO and EN).
- Unique accessible names on every repeated control.
- Tour: own pink colour, "skips Sprint Planning and the second iteration", the dashed outline marks what the coach talks about without covering it, the sticky bar on the phone.

## 6. Could not check

- **Result sheet and print layout** of this build (the game did not reach the end in the time I had; the Kanban scripted facilitator makes whole rounds long). Re-check the print: the previous run showed a large empty area under a one-row cycle-time chart.
- **Kanban delivery metrics and charts, WIP limit controls, the Kanban "Finish this half" bar and its message** (round 2 was reached; only Replenishment, the retro and the delivery card were seen).
- **The code-review puzzle as a solver** (the scripted teammates solved my item before I could), blocked items resolved by a human, F-7, F-8, F-9, F-10, F-11, F-18.
- **768 px beyond the RO lobby** (clean, no overflow).
- **Real remote room**, reconnection, screen readers, real touch devices.

## 7. What would take each score to 9 or above

**Design 8.5, to 9+:** (1) replace the two native confirmations with an inline in-page confirmation in the design's own style; (2) fix the layout collisions: bottom padding for the sticky bar, a 44 px "Product Backlog" fold header, a gap and a lower position for the quick-check card during work; (3) show the phone tour bar only when the inline card is off-screen and let its task wrap to two lines.

**Usability for real beginners 8, to 9+:** (1) finish the focus work: after select/move/submit/take put focus on the next logical control, and return it to the trigger after a cancelled confirmation; (2) make the facilitator's "what to do" box complete: mention "finish this half" when nothing is left, say when an item is blocked and what to ask, and name "Delivery review" or "Sprint Review" correctly in the confirmation; (3) explain "Value", "Est." and "+5 value" once on first sight (a small "?" on the first item card), and make the public-list failure a calm "No teams yet". Then run the pilot: the three open "not verified" findings (F-7 to F-11) and the result sheet are the next things to see on screen.
