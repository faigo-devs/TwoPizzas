# Facilitator review, Two Pizzas (Scrum), 2026-11-19

Status: PARTIAL. Covered: start page, room creation, joining, lobby, Sprint Planning (goal vote, planning poker, item selection) and the start of Sprint 1 work. The room server became unreachable at the start of the first work half (twice, across two rooms/restarts), so I did not see the work half, Daily Scrum, Review or Retro, and did not see how Kanban is explained beyond the start-page radio.

## 1. Verdict
Not yet, and I cannot fully judge. The Planning half is better than I expected: every event opens with a purpose card, a timebox, a "real life" note and a short facilitator script, so I always knew what to read aloud. I would run it next week only if (a) a connection loss mid-game never strands the whole team (in my run all three players were stuck on "Connecting to the room" with no way back), and (b) I get a short pre-brief telling me how long the whole thing really takes and what the Scrum Master seat must do.

## 2. Facilitation, step by step
- Setting up: Scrum/Kanban radio plus "Create a room" is clear. Room code (5 letters) is shown big with "Copy code". There is no shareable link, only the code; fine on a call but a link would be easier.
- Inviting: colleagues use "Join a room" and type the code. Worked. Lobby shows seats, "Start the game" disabled until 3 players, "Lock the room". The host is automatically Player 1 and Scrum Master, a sensible default. Names are optional, so three seats read "Player 1/2/3", hard to talk about on a call.
- Starting: straight into Sprint Planning. There is no "what this game is, how it works, who does what" screen for newcomers, nor any time estimate per phase for me.
- Sprint Planning (6 min timebox, counts down): script line "Read the purpose on the card aloud, then press Begin", then "Read the two Sprint Goals aloud", vote, confirm, planning poker (cards revealed together, "Record the middle card"), "Stop estimating", select items, "Start the work". Real time with me clicking for three seats: about 1.5 minutes, so a real team of five that talks would use the 6 minutes. Good pacing aid.
- Work half: timebox 4 minutes, a quick-check question for players, script says "Read the purpose aloud, then begin the work part". I could not go further.
- Daily Scrum, Review, Retro, wrap-up: not reached. Kanban: only the radio on the start page, and the guided tour (10 min, solo) is offered for when there are too few people.
- Keeping time: a clear countdown in the header, plus a note that in the game the clock runs on past zero and the overrun is recorded, while in Scrum an event ends within its timebox. Honest and useful.

## 3. Criticisms, worst first
1. **blocker (for the test, possibly for a real session): connection loss strands everyone.** Screen: Sprint 1 work intro, `.qa/users/facilitator/12-work-a.png` and `14-connlost.png`. After pressing Begin on the work phase the banner "Connection lost. Trying to reconnect." and the toast "The game server cannot be reached right now" appeared on all three seats and never recovered in over a minute. After a reload and returning to the start page, the page stays on "Connecting to the room" and I could not get back to the start page's Create/Join controls. Expected: automatic recovery, or a visible "Leave and start again" and a way to rejoin the same room. A facilitator with five people waiting would be embarrassed. (The environment had just been restarted, so this may be a test-server problem; I report what a facilitator would see.)
2. **major: no onboarding or facilitator pre-brief.** Screen: Sprint Planning, `04-after-start-a.png`. The first screen after Start is already Sprint Planning. Nobody is told what Two Pizzas is, what the roles are, what "Done" means in this game, or how long the full session takes. I would have to say all of this myself.
3. **major: the facilitator script is a single line per step and "All steps" shows only the current one.** Screens `04`, `06`. I knew the next click, but not what to say beyond "read aloud", and could not see ahead to plan a 45-60 minute session. A full-session agenda with minutes per event would help.
4. **major: Sprint Goal vote shows no backlog.** Screen `06-planning-a.png`. Players vote for "Platform theme" vs "Accounts theme" before seeing which items belong to each. A newcomer will ask "what is in Platform?" and the answer only appears at the next step.
5. **minor/major: Product Backlog is not grouped by theme.** Screen `09-select-items.png` (earlier room) and my second room: Goal-theme items are scattered among others, marked only by a small "Sprint Goal theme" tag, so five newcomers must hunt for them while the timer runs. A filter or highlight would help.
6. **minor: planning poker on items whose "value" is already shown.** The poker only estimates a few items before I pressed "Stop estimating"; unestimated items count 0 in velocity (the game says so). Reasonable, but a newcomer will not know when to stop; the script does not say.
7. **minor: no room link; anonymous "Player N" names** make talking on the call awkward.
8. **minor: statement accuracy.** I found nothing wrong about Scrum in the screens I saw. The Planning text correctly flags planning poker, story points and velocity as not part of the Scrum Guide, and notes the Definition of Done here is simplified. The "real life" timebox note ("at most eight hours for a one-month Sprint") matches the Guide.

## 4. What worked well
- Every event has a purpose, timebox, "real life" note and a quick-check question.
- Honest labels: common practice vs Scrum Guide, game simplification vs real rule.
- Scripted Scrum Master prompts that match the buttons on screen.
- Simultaneous reveal in planning poker, and the 3-seat minimum with live seat list.
- Visible countdown; the clock doesn't silently cut the team off.
- Guided tour for a team that is not complete.
- Readable dark design at 1280x800, large type.

## 5. Scores
- Likelihood I would use it with my team: 5/10 (would rise to 8 once the connection loss is understood and an intro/agenda exists).
- Support for a facilitator: 6/10 (good per-step prompts, no whole-session view, partial coverage only).
