# Two Pizzas: final design and usability review, 2026-11-19

Build of commit a97de29 (page on 4431, frozen room server behind `/api/room`). One session, `rev-f1` (closed). Screenshots: `.qa/review6/`. Rubric: decision 28, `docs/spec.md` section 9 ("Review scale"): blocker, major, minor; 9 = no blocker and no major.

## Scores

**Design: 9 / 10. Usability for real beginners: 9 / 10.**
No blocker and no major found in what I drove. The caveats are what I could not reach (last section); a score of 9 requires evidence for every requirement, and two items rest on earlier-pass or kit evidence.

## Blockers and majors

None found.

## Fixed from the fifth pass (verified)

| Item | Result | Evidence |
|---|---|---|
| Fold with no marker (the one blocker) | **Fixed** | Every `.lg-obs--fold` summary draws ▸ (computed `::before` is "▸", 44 px high) in the Scrum retrospective at 1280 EN (`retro1280.png`) and at 390 RO ("Ce s‑a întâmplat în Sprint Review", `ro-retro390.png`). It reads as a control like "All steps". |
| Lobby fold "How the session goes" | **Fixed, good** | Events in order with minutes in Sprint 1 / Sprint 2, "Total: 45 game minutes" (6+4+2+4+4+5 = 25 and 4+4+2+4+3+3 = 20, correct), and "With talking on the call, a session takes about 45–60 minutes" (`lobby-fold.png`). In the real room the fold sits under the team name (`room-lobby.png`). |
| Sprint Goal vote lists items | **Fixed, good** | Each option shows its items ("#1 api-gateway, #2 config-loader, #7 file-uploader" / four Platform items) and "+5 value" (`goal1280.png`). |
| Tour texts and scenes | **Fixed** | Shorter steps with plain definitions in place: Sprint Backlog ("the items the team chose for this Sprint"), Developers ("the people who do the work"), Increment ("all the finished work so far"), WIP limit ("a cap on how many items may be in progress at once"), the review step says what Request changes does ("LGTM approves it, Request changes sends it back"), the Retrospective step names the action (14 steps read at 390, `tour-8.png`). |
| Tour on a phone: Submit in the page flow | **Fixed** | At 360x740, step 4: the Submit button follows the order list in the card, nothing sticky except the one-row tour bar ("Step 4 of 14 ↑ Next"); all four rows visible (`tour360-s4.png`); no horizontal overflow. |
| Destructive confirms: Cancel focused, Escape closes | **Fixed** | Ending the retrospective with no action chosen: inline "End the retrospective with no action chosen? The game will note it." with "Yes, end it" and "Cancel"; focus on Cancel; Escape closes it and returns focus to "End the retrospective" (`retro-end-confirm.png`). |
| Real room still works | **Verified** | Create a room: the code in large tiles with "Copy code", "Each player opens this page, chooses Join and types the code.", optional name, "Volunteer as Scrum Master", Lock the room; reloading the page resumed the same seat (`room-lobby.png`). |

## Nice to have (do not block v1)

1. In the Romanian local game the scripted teammates' retrospective notes are in English ("Pairing worked well", "We finish an item before starting a new one"; `ro-retro390.png`). Local mode only; real players type their own text.
2. Desktop "Pause" and "Leave the game" are still small grey text (1280, 768), bordered only on a phone; fine because rare, but consistent borders would help discovery.
3. The sticky Submit footer on a phone in a normal game (not the tour) overlays the lower rows while scrolling, as before.
4. "Value / Est." legend is small 14 px grey; "+5 value" is still unexplained.
5. The retro vote screen with no notes (seen once in an automated capture) should say "no notes to vote on".

## What I could not reach

- **The 10-second connect timeout and the "back to the start page" offer:** I could not provoke a no-answer connect (the frozen room server answers at once); a reload mid-game resumed the seat correctly.
- **A three-player room played through, the real-game Scrum finish confirm after this change, and the Kanban finish confirm in a game:** not reached (memory limit on browsers; the Kanban finish bar and its confirm were seen only in the design kit earlier; the Scrum finish confirm was seen in a real local game in the third pass and the retrospective confirm today).
- **Unsent puzzle answers surviving a phase change; the role timer's announcements and raised contrast; the Kanban work-item-age line and "how round 2 starts":** not checked this pass.
- **Screen readers and real devices.**
