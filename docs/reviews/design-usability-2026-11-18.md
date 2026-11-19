# Two Pizzas: design and usability review, 2026-11-18

Build: `npx astro build --outDir .qa/dist-d`, served on port 4420, global `playwright-cli` session `d-a` (closed, server stopped).
Screenshots: `.qa/design/` (names below are relative to it). Widths 1280, 390 and 360 were driven live; 768 was not.
A scripted full-game driver for the summary was started but not finished; the summary and print layout come from older runs in `.qa/review/` (see "Could not check").

## Findings, by severity

### Blocker

None found. No screen stops a session, nothing overflows horizontally at 360 or 390 (`scrollWidth` equals viewport), and every action has a button.

### Major

**M1. The Sprint Goal names a theme, but no item card shows its theme (Scrum, planning and board, all widths, EN).**
Evidence: `s1-select-full.png`, `s1-board-1280.png`, `s1-rev-3.png`. The goal reads "Make the Accounts theme work end to end" and the rule is that every item of that theme, selected or not, must be done. The item cards show only kind, id, name, value and estimate. `item.theme.*` strings exist, but only the goal line and the review feedback use them (`app/game/screens/Work.tsx`, `Inspect.tsx`). In my run I selected the first three backlog items by order, the goal was "not met", and the Review screen said only "Sprint Goal not met" with no reason or missing item.
Why it matters: a beginner cannot act on the goal, so the central Scrum lesson (a goal guides what you select) turns into a coin flip, and then the failure is unexplained.
Fix: add a theme chip to every item card (planning, selection, board, review), mark theme items in the "Select" list, and let the goal-not-met panel list the theme items that were missing or wrong ("2 of 5 Accounts items: #4 not selected, #3 wrong answer").

**M2. Two buttons named "Step done" with different meanings on the same screen (Scrum Review, Retro, Poker, Kanban; all widths).**
Evidence: `s1-rev-2.png` (large yellow "Step done" in the content card advances the event step; small ghost "Step done" in the facilitator script ticks the script), `s1-rev-3.png`, `s1-retro-vote.png`. The first Tab/Enter target is ambiguous for a screen reader too.
Fix: rename the content button to what it does ("Next: Sprint Goal and value", "Go to the vote"), and rename the script one ("Mark script step as read") or make it a checkbox-like control.

**M3. The retrospective's primary button skips the choice (Scrum and Kanban retro step 3).**
Evidence: `s1-retro-action.png`. "End the retrospective" is large, yellow and enabled; "Choose this action" is a small disabled ghost button above it. A beginner who has just picked a radio sees the yellow button and ends with no action, which the game then records as a defect of the team.
Fix: make "Choose this action" the primary (yellow) button once a radio is checked, and show "End without an action" as a quiet secondary link with the consequence stated.

**M4. Keyboard focus is dropped to `body` after actions that remove the focused control (board, all widths).**
Evidence: after "Submit the answer" the live check returned `activeElement = BODY`. Same pattern for "Take", "Select for the Sprint" and "Record the median" when the card moves. Focus moving to the new screen's heading on step changes works (`H2 tabindex=-1`, also in the tour), which makes the gap stand out.
Why it matters: a keyboard or screen-reader player restarts from the top of the page after every item action; the spec says the whole game must be reachable by keyboard.
Fix: after a board action, move focus to the new heading of the affected region (the item workspace heading or the "What you should do now" heading), or to the next sensible control.

**M5. On a 1280x800 laptop the thing you must act on is below the fold in many screens (all widths below ~1000 px of height).**
Evidence: `s1-phase-full-1280.png` (the "Begin" button is at y ~1000; the "Facilitator script" box above it has its own "Step done"), `s1-poker-1280.png` (own cards under the fold), `s1-merge-open-full.png` (puzzle starts at y ~590, submit at y ~1200), `t8.png` (tour: coach panel pushes the LGTM / Request changes buttons to y ~1000), `k-rep-1.png`.
Why it matters: "what you should do now" is visible on top, but the puzzle and the answer button are not; a beginner scrolls to find them and loses the coach text while doing so (the coach is not sticky: `position: static`).
Fix: on the phase card put "Begin" next to the purpose/timebox, not at the end; on the board, make the open item's workspace sit directly under "What you should do now" (it already does on 390, where it works well, see `tm4-full.png`) and let the facilitator script column be collapsible on desktop; for the tour, make the coach a compact sticky bar (title, one line, Next) with details expandable.

**M6. Tour step 1 shows irrelevant feedback and the tour skips Planning (tour, all widths).**
Evidence: `t1.png` shows "Items selected without an estimate" and "Planning stayed on time", observations about a planning that never happened, under a phase card whose "typical mistake" is about a different event; the step list has no Sprint Planning, estimation or second iteration, although the start card says "take part in a retrospective" only and the intro says "two short iterations".
Why it matters: the tour is the first thing a lone beginner meets; the first screen is noisy and contradicts its own claim ("a small version of that").
Fix: suppress observation callouts in the tour until a step needs them; state on the start card and in step 1 what the tour does not cover (planning, poker, second iteration, Kanban); optionally add one step on "choose a goal" for Scrum.

### Minor

**m1. Facilitator-script panel is shown in the solo tour (tour, step 10-14; `t14.png`).** A third instruction source next to the coach and "What you should do now"; a solo learner does not "facilitate". Hide it in the tour or label it "In a real game, the Scrum Master would read this".

**m2. The phase card's "In real life · Typical mistake" disclosure has no marker (`s1-phase-full-1280.png`).** It is a `<details>` that looks like plain text; the typical mistake is a stated learning goal. Add a chevron/plus (the footer's "Privacy" has one) or open it by default.

**m3. Merge puzzle: result fields are pre-filled with the base value and look like answers (`s1-merge-open-full.png`).** Line 3 is correct untouched, so a beginner cannot tell whether to touch it; "·" for "unchanged" has no legend and is read as "·" by a screen reader. Leave the fields empty (or placeholder "your value"), and add a legend ("· = this side did not change the line", with `aria-label="unchanged"`).

**m4. Disabled primary buttons look muddy (`s1-goal-1280.png`, `k-rep-1.png`).** Dim gold with black text reads as a wrong colour, not as disabled; the reason sits below the button ("No votes yet", "Put at least one request in Ready"). Use the neutral disabled style and put the reason above or inside the button area.

**m5. "Sum of estimates 0 / Estimated: 1" in estimation (`s1-poker-revealed.png`).** The sum counts only selected items, so it reads 0 while one item is estimated; hide it until selection, or label it "Selected so far".

**m6. Planning poker: "Record the median: 13" for cards 5, 13, 8, 13 (`s1-poker-revealed.png`).** The median of those is 10.5; the game uses the upper value. Say "Record the middle card: 13" or explain "rounded up to a card".

**m7. Counts that disagree without explanation (Daily, `s1-daily-full.png`).** "3 items are already Done" next to "1 of 4 items of this theme is Done". Say "3 items Done, 1 of them in the goal theme".

**m8. Touch targets below 44 px (measured, 390 px).** Language radios 40x40, "Leave the game" 114x40, "Step done" 108x40, "Reveal" 90x40, lobby buttons "Another team name" 164x40, "Lock the room" 132x40, "Volunteer as Scrum Master" 204x40. Everything else sampled (chips, vote circles, arrows) is >= 44. Raise the shared button minimum height to 44.

**m9. Header at 390 px uses ~170 px of the first screen (`m-board-390.png`, `m-poker-full-390.png`).** Logo, timer and language/Leave each take a row. Put the timer on the same row as the logo and move the language control into the footer or a menu while playing.

**m10. Retro screen: the helper is far from the notes (`s1-retro-helper.png`).** "I don't know what to write" is a collapsed panel under "Reveal the notes", at y ~900; a stuck beginner will not scroll for it, and the heading and the opening button have the same label. Put a "Need ideas?" button next to the note field and open the panel under it.

**m11. Vote counts "1 votes" (`s1-retro-vote.png`).** Missing singular. Also the vote hint "2 votes left" is plain 16 px text; style it as a counter near the buttons.

**m12. "Leave" under an in-progress card is a text-only control (`s1-merge-open-full.png`).** It looks like a caption, not a button; it also undoes the player's claim. Give it the ghost-button outline.

**m13. Romanian copy defects seen in `.qa/copy-ro/` (older run; re-check in the current build).** "Se așteaptă ca facilitator să stabilească limitele" (missing article, "facilitatorul"); "niciunul deschis" breaking onto two lines in a metric card; the mixed line "WIP limits: In Progress: 3, Review: 2" inside Romanian text; "00:31" as cycle time needs a unit hint (mm:ss).

**m14. Tour step 14: "Leave the tour" wraps under "Finish the tour" and the toolbar jumps (`t14.png` vs `t10.png`).** Reserve space or shorten the label.

**m15. Duplicate heading on single-card screens (Kanban Replenishment: "Choose the first requests" as page title and card title, `k-rep-1.png`).** Drop the card title or the page title.

**m16. Start screen order and weight (`start-en-1280-full.png`, `start-en-390-full.png`).** Both zones have the same size and a coloured border. The primary action (Create a room) and the tour button are distinct (yellow vs pink), but "Join a room" is wider than the "Create" button and the tour zone has 14 steps listed, as much text as the team zone. At 390 the tour is below the fold, so a lone beginner sees "Create a room / Join a room" first. Add a line under the hero ("Alone? Take the 10-minute tour", an anchor to the second card) and shorten the tour card to three lines plus the button; keep the 14-step list behind a disclosure.

### Polish

- The "In ready / Requests waiting" and "Sprint Backlog / Product Backlog" two-column selection layouts leave the right half empty under the facilitator panel (`s1-select-full.png`).
- Disabled arrows in the deploy-order list are very faint (`t4-full.png`); fine for disabled, but a lighter "first/last" hint would help.
- The "Local mode" banner is `role=status` and persistent, using the same blue box on every screen; it costs ~40 px. Make it a small chip next to the logo.
- 11 px text exists (timer state, kind label, callout tag, badge) at contrast >= 6.0:1, which passes AA but is small; keep the labels at 12 px.
- Full-page screenshots show the sticky header floating mid-page; it is a capture artefact, not a bug.

## What works well (do not undo)

- **"What you should do now" box before the board** on every board state, in plain words, with the matching button inside it (`s1-board-1280.png`, `m-board-390.png`). At 390 the workspace follows directly (`tm4-full.png`).
- **The three puzzles seen are solvable from the screen alone**: Incident (rules in order, 5 chips, solved in ~20 s; `s2-solve-full.png`), Deploy order (arrow buttons, ~30 s; `t4-full.png`), Merge (A/B highlight, ~1 min; `s1-merge-open-full.png`). The review screen with "Is the submitted answer right? Your LGTM is a promise" and green/red buttons is excellent (`t8b.png`). The code-review kind was not opened by me.
- **The switching countdown** is calm, explains its cost in one sentence and shows nothing of the item meanwhile (`s1-merge-wrong-full.png`).
- **The Review verdict cards** and the escaped-defect explanation teach the main lesson without scolding (`s1-rev-2.png`).
- **The retro helper** (questions about the team's own numbers, editable proposals) and the private notes with striped placeholders (`s1-retro-helper.png`, `s1-retro-notes.png`).
- **The tour's colour**: pink for tour chrome and highlight, yellow for the game; the dashed pink outline marks what the coach talks about without covering it (`t2.png`, `t10.png`). Coach text is short, with a "Your move" line.
- **Colour contrast**: sampled ~65 distinct text styles on the start screen, tour, game and Kanban; lowest ratio 6.07:1, most above 8:1; focus ring is a 3 px solid white outline; reduced motion is handled globally (`base.css`); `lang` switches (`ro`/`en`); the timer is `role=timer` and not live; one polite status region only.
- **Typography and tokens**: IBM Plex Sans/Mono used consistently; the mono for ids and labels, status colours with a single meaning (to do grey, doing blue, review purple, done green, blocked red).
- **Timers**: the header timer shows "Counting down" or "Ends at zero" with a lock icon, and the daily states "The work clock is stopped during the daily".
- No horizontal overflow at 360 and 390.

## Could not check

- **768 px**: not driven.
- **Real remote lobby, join by code, reconnection, a human Scrum Master across devices**: needs the room server (the start-screen leaderboard shows its error state without one, `start-en-1280-full.png`; the error is handled and has "Try again").
- **Kanban**: only Replenishment was driven live (`k-rep-1.png`); limits, flow, delivery review and charts come from `.qa/copy-ro/ro-kanban-1280-17...` and `-24...` (older run). Charts (cycle-time dot plot, bars) are legible in those images; their accessible alternative was not inspected.
- **Summary sheet and print layout** from `.qa/review/summary-2-full-dark.png` and `summary-5-print.png` (older build; that capture still shows a theme toggle that the spec says no longer exists, so it is stale). The print layout there is light, one page-width, readable, with a large empty area under a one-row cycle-time chart.
- **Code-review puzzle**, blocked items and a held "info" item in a real pair, and the Retro "own action" free-text path were not solved by me.
- **Screen reader testing** (names and live regions were read from the DOM only), real touch devices, and RO text outside the screens above.

## Scores

**Design (visual and interaction): 7.5 / 10.**
It reads as one coherent developer tool: the slate surfaces, the mono labels, and the stamp and card details are consistent, and contrast and focus are strong. It loses points for several screens whose primary action or puzzle sits below the fold on a laptop, duplicated same-named buttons, ghost controls that do not look like controls, and a 170 px header on phones.
Changes that would raise it most: (1) the compact sticky tour coach and the workspace directly under "What you should do now" on desktop; (2) one button vocabulary (primary = next thing, no two "Step done"); (3) 44 px minimum targets and the header slimmed on phones.

**Usability for real beginners: 6.5 / 10.**
The moment-to-moment work (take, open, solve, review) is clear and quick. The learning loop breaks at the Sprint Goal (items carry no theme and the failure is unexplained), at the retro's "End" button, and in the keyboard path after board actions; the tour starts with noise and does not say what it omits.
Changes that would raise it most: (1) show the theme on every item and explain a missed goal item by item; (2) make "Choose this action" the primary button and rename the duplicate "Step done" buttons; (3) restore focus after board actions and trim the tour's first screen and its facilitator panel.
