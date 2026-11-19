# Usability test, simulated first-time players, 2026-11-19

Build served from `.qa/dist-u` on port 4430 (server and all `u-*` sessions shut down). Screenshots and helper scripts: `.qa/usability/` (`ana-*.png`, `mihai-*.png`, `sarah-*.png`, `sarah-13-print.pdf`). No source file changed.

## Limits of this test (read first)

- One tester who knows far more than a beginner played three roles. Think-aloud is reconstructed from what each screen shows; it is not a measurement of real confusion.
- Times are wall-clock with automation overhead (every click is a tool call). They are only useful as order of magnitude. The game's own timeboxes ran in real time.
- Local scripted teammates act in seconds. They took items and gave verdicts before the human could (a "Verify" button vanished before it was clicked; "Take" became a review at once), and in Sprint 2 / Round 2 a scripted facilitator advanced steps (Mihai never saw the WIP-limit decision being made). Local mode also has "Skip ahead", which I used for stretches of work. None of that says how a real team of people feels.
- Not covered: pause for 1 minute and return (not run); a code-review puzzle solved (only seen as a verdict card); a real room (no server). The deploy order, incident and merge puzzles were solved, the incident and deploy order as reviewer too.
- Some automation misses (a label click that matched two elements) looked like product bugs and were re-checked; one case remains unconfirmed (see F-14).

---

## 1. Players

### Ana, 24, junior tester, Romanian, phone 390x844

Summary: arrives alone, finds the tour from the link right under the headline, and the tour works as a short guided walk. The best moments are the item workspace, the LGTM explanation at the verdict, and the Review reveal that names an escaped defect. The worst moments are on the phone: the tour card scrolls out of view, and the partner's rules sit in the tour card while the puzzle is below it.

First minute (`ana-01-start.png`, `ana-01b-start-full.png`): "Two Pizzas ... learns Scrum or Kanban by doing the work" tells what it is. The pink underlined line "Alone? Take the 10-minute guided tour" sits right under the headline, so it is clearly different from "Create a room". The pink tour card with the 14 numbered steps is below the fold on a phone but the link finds it. Red box "The list could not be loaded" with "Try again" (expected locally) is the first alarming thing she scrolls into; she would assume the site is broken.

Condensed think-aloud:
- Tour 1 `ana-03-tour1.png`: "A small version of this, only me with simulated colleagues. 10 minutes. OK." Below it a phase card "Sprint: partea de lucru" with "Se asteapta ca Scrum Master-ul sa inceapa". "I am alone, who is the Scrum Master? Ignore it."
- Tour 2 `ana-04-tour2.png`: board with four columns; "Ce ai de facut acum" yellow box is the thing she follows. "Valoare", "Estim.", "DEPLOY ORDER", "fara" are unexplained but she ignores them.
- Tour 3 `ana-06/07`: after "Ia" the page scrolls so the tour card is off screen; "Gata. Continua cand vrei." and the "Inainte" button are above the viewport. She has to scroll up to find how to go on. The yellow box says "Nu mai ai nimic de facut. Poti lua #7": "nothing to do, but I can take #7?"
- Tour 4 `ana-08/09`: deploy order with up/down arrows is self-evident. After "Trimite raspunsul" nothing says it was accepted; the item just appears in Review.
- Tour 5: step starts with #8 already open and asks to "open the second item"; she opens another, the 8 s countdown screen explains the cost of switching well.
- Tour 6 `ana-12-tour6.png`: the colleague's rules are in the pink card above, her own rules in the puzzle below: scrolling back and forth on a phone to merge two lists.
- Tour 7: "Promite ajutor" on the board and "Le-am spus colegilor" in a panel; the tour text says "bifa din panou" (the tick). Understandable, a bit scattered.
- Tour 8/9 `ana-15`: "LGTM vine de la Looks Good To Me ... LGTM-ul tau este o promisiune" at the verdict is the clearest teaching moment. Because she checks carefully, step 9 ("an LGTM to a wrong answer becomes an escaped defect") never happens to her; she Requests changes.
- Tour 10 `ana-18`: Daily: "Parcurge tabla de la dreapta" list with counts is clear; board split into numbered columns 1-2-3 with a question each is good.
- Tour 11 `ana-21/22/23`: Review reveals verdicts; "#8 escaped defect" explained in one paragraph. "I never gave an LGTM to #8, who did?" Then "Valoare livrata 2 / Velocity 0" confuses; "Sprint Goal neatins" with the reasons list is clear.
- Tour 12 `ana-25/26`: three columns, "Nu stiu ce sa scriu" opens three questions and six proposals: useful but a long wall on a phone (`ana-26b-helper-full.png`). She uses a proposal; the note then did not show in the revealed list (F-14).
- Tour 13/14 `ana-29`: votes fine; the action step has the sticky bar eating a quarter of the phone screen; "WIP limit ... vine din Kanban" is mentioned without ever being explained to her.
- End `ana-31/32`: "Verificare rapida: how should a retrospective end?" is quick and rewarding. "Inapoi la inceput" is the exit.

Then local Scrum game (`ana-33` to `ana-53`):
- Lobby: fine; no room code in local mode (expected).
- Phase card `ana-34`: trunk test passes (which event, purpose, timebox, what to press). "Incepe" and "Bifeaza ca facut" are two similar buttons side by side; she presses Incepe.
- Goal vote `ana-35`: two themes with no item list. Second paragraph of grey text (Sprint Goal "not a list...") nobody reads.
- Planning poker `ana-36/38`: cards are clear; after reveal, "Inregistreaza cartea din mijloc: 2" plus "1 vot nou ramas" plus a median rule sentence plus six "Inregistreaza N" buttons is a lot to decide for a first-timer. The item estimated is #1 (backlog order), not an item of the chosen theme.
- Selection `ana-40`: selects the three theme items from the chip; works. She never estimated them.
- Work `ana-43..45`: bots took and finished two items within seconds; hers (#10) was Blocked: "Intreaba echipa" but the team is scripted, so she cannot proceed; "Sari inainte" (local only) used.
- Daily with an empty board `ana-47` (everything already Done), nothing to inspect.
- Review `ana-49..53`: phase card is long (quiz, two observations, typical mistake of the previous event, "WIP limit vine din Kanban" in a Scrum game, facilitator script). Verdicts reveal one by one; final step shows "Sprint Goal atins +5" but "Velocity 0".

Task results (times approximate): understand a phase card before Begin: success, ~20 s. Vote a Sprint Goal: success, ~30 s but chosen blind. Poker: success after ~1 min, hesitated at the median rule. Select items: success. Deploy order puzzle: success, ~1 min. Info I hold / blocked: understood in the tour (~1 min), not resolvable in local mode. Review a teammate's answer: success (tour). Daily: success in the tour. Verdicts / escaped defect: understood. Retro note with helper: success (~1 min); vote: success; action: success; check question: helped, did not annoy. Summary sheet: not reached (stopped at the end of the first Sprint Review as briefed). Tour took about 15 min wall-clock against "about 10".

Trunk test (9 screens: start, tour 2, tour 4, tour 6, daily, review verdicts, retro notes, retro action, phase card): failures: (a) tour 3, phone: "how do I go on" is off screen; (b) tour 6, phone: "what can I do" is split between two cards; (c) tour 12 helper: "what should I do now" is hidden among 3 groups of questions plus 6 proposals; (d) goal vote: "what is this theme" cannot be answered from the screen.

Learning check (from memory, in character): Planning = pick the work and one goal, about 4-6 min in the game; Daily = look at the board from the right and fix blockers, short, for the team; Review = see what is really done, who gave a wrong LGTM, value; Retro = notes, votes, one improvement to try. Typical mistake: retro as a list of complaints (learned from the quick check), reviews as an applause demo (read in the card, forgotten). WIP limit: "at most 2 items in progress", why: fuzzy. LGTM: "Looks Good To Me", a promise: stuck. Score 6 of 10 items stuck. What made it stick: doing LGTM, the switching countdown, the escaped-defect reveal, the one-line check question. What did not: terms only present in grey "Good to know" blocks (Definition of Done, velocity).

Recommendation: 7/10. "Clear and short for a tour, I would send it to a colleague; I would want it to tell me what to do when a screen says I have nothing to do."

### Mihai, 41, team lead from operations, Romanian, laptop 1280x800, Kanban

Summary: the desktop screens are clean and he gets what to press on each. He reads headings, the yellow "what to do" box and buttons, skips the quiz and every grey block. He likes the board, the red WIP-limit state and the flow-metrics screen; he dislikes eleven clicks to reveal eleven verdicts and meetings he cannot skip (Daily, Delivery review).

Start screen (`mihai-01-start-en.png`): two cards side by side, "Play with your team" and "Guided tour", clear at a glance.

Condensed think-aloud:
- Phase card `mihai-03`: "Replenishment - unknown word." The "after this event you will know" line explains it; he clicks Incepe.
- Ready selection `mihai-04`: "Pune cel mult 4 cereri in Ready": clear; the disabled "Porneste runda" says why.
- Round 1 board `mihai-06`: columns Ready / In Progress / Review / Done, "Ia" buttons: he needs no help. "Nicio WIP limit in runda 1, intentionat" tells him this is a trap on purpose: he likes that.
- Merge puzzle `mihai-07`: "Scrie valoarea rezultata" does not say if "port = 8081" or "8081"; he types values, accepted. Submit button (sticky) is greyed until all filled.
- Incident puzzle `mihai-10`: readings and ordered rules; sticky "Trimite raspunsul" overlaps the bottom of the rules list on 800 px high, so rules 3-5 need a scroll.
- Skipped "Verificare rapida" with "Sari peste"; the correct option was the longest one.
- Delivery review `mihai-12/13/14`: eleven locked slots, eleven clicks on the same button, eleven near-identical "Raspunsul este corect" cards; the two escaped defects stand out in red, which is the point. Flow metrics `mihai-14`: WIP, throughput, cycle time, work item age each have a one-line definition: he gets all four. A warning triangle sits on "no item is still open, nothing waits", which is good news.
- Retro `mihai-15/16`: writes a note without the helper; the three-column layout and "private until revealed" are clear. Action list `mihai-16`: "Stabileste WIP limits - Sugerat".
- Round 2 `mihai-18/19`: WIP limits In Progress 3 / Review 2 appear on the columns; red "WIP limit 2/2" badge and "Limita de 2 pentru Review este atinsa. Verifica mai intai un element." is the best single teaching moment for him. He never chose those numbers (scripted facilitator advanced; see limits).
- Summary `mihai-20`: score 87 with no explanation of how it is computed; per-round table; scatter of cycle times; "Pentru ce este fiecare intalnire" cards. Too long for him; he reads the table and the "worth a look" chips.

Task results: phase card before Begin: success (~15 s). Ready selection: success. Take, open and solve merge and incident: success, ~1.5 min each. Review a teammate's answer: failed to get the chance (bots first). Blocked/info: seen as a status only. Daily: pressed through, "waste". Verdicts: success but tedious. Retro note: success; vote: success; action: the first attempt did not register (my automation) and the sheet then said "Nicio actiune aleasa" for round 1 until I redid it in round 2. Check question: skipped (1 of 1 answered, correct). Summary: reached, ~2 min reading.

Trunk test (10 screens: lobby, phase card, ready, board, merge, incident, delivery review, metrics, retro notes, summary): failures: summary "what should I do now / how do I go on" (print button and "Inapoi la inceput" are at the top, away from the end of a very long page); round-2 Replenishment step 1 of 2 says "Se asteapta ca facilitatorul sa continue" with no cue what the player can do meanwhile.

Learning check: Kanban practices: visualise the flow, limit work in progress, pull instead of push, review the flow with numbers; he can name WIP, throughput and cycle time and gives work item age as "how long something has been open". WIP limit: "stops everyone from starting everything": stuck, because he met the red limit. Typical mistake: "let everything in at once": stuck. Duration of meetings: not stuck. LGTM: "approval". Score 7 of 10. What made it stick: round 1 without limits versus round 2 with limits, the refusal text, the four metric tiles. What did not: Replenishment, Delivery review, "Definition of Workflow" in grey notes.

Recommendation: 6/10. "Good for a team that has never looked at its board; the meetings are exactly what I would skip, so keep them short."

### Sarah, 30, product designer, English, laptop 1440x900, keyboard only, Scrum

Summary: keyboard use is workable and the focus ring is strong, but the interface repeatedly drops focus after an action and repeated controls have identical names, so a keyboard or screen-reader user keeps losing their place and cannot tell which item a "Take", "Vote" or "Select" belongs to.

Keyboard findings (screenshots `sarah-01..13`):
- Tab order start screen: skip link, home, language, framework, Create a room, code field, Join, Start the guided tour, retry, Privacy: logical. 3 px solid focus ring, clearly visible on every control tried.
- On screen change focus lands on the new heading (lobby, planning, board): matches the spec.
- Lobby: three "Remove Player N from the room" buttons come before "Start the game" (accidental removal risk with Enter).
- Goal vote: radios work with Space and arrows. Poker: Vote buttons, then "Record the middle card" gets focus after Reveal (good). After recording, focus drops (next Tab starts from Reveal).
- Item selection `sarah-05`: ten buttons all named "Select for the Sprint" with no item name. After selecting one, focus jumps to the page heading, so for three items I had to Tab 8 times from the top each time. Same for "Take", "Verify", "Vote" (retro) and "Add note" (focus falls to BODY, `sarah-08-note.png`).
- Retro: column radios with arrows, textarea, helper button, Add note: all reachable. The action list works with Space/arrows. "Reveal the notes" is reachable and enabled at any time.
- Print `sarah-13-print.png`, `sarah-13-print.pdf`: print media gives a clean light sheet, no buttons, A4 readable, event-by-event recap and the three facts per event. Good. One long page (about 2800 px).

Think-aloud, condensed: "Blog post told me Scrum has events; the phase card tells me what each is for before I press Begin: nice." "Poker: the screen tells me the middle card rule; fine." "I took an item and a second later I am the reviewer of something I did not touch; why?" "Sprint 2: the Scrum Master changed; I only vote, and the screen says the Scrum Master reveals: good, I know I wait." "Summary: velocity 0 in Sprint 1 although two items were done: what?"

Task results: all done by keyboard except the work phase (mouse/skip for stretches). Vote goal: success. Poker: success. Select items: success but slow (about 3x the mouse effort). Puzzle: incident seen as reviewer; arrows/Tab ok. Retro note with and without helper (without only): success. Vote: success but unnamed buttons. Action: success. Print: success.

Trunk test (8 screens): failures: after Add note / select item the page "does not say where I am" (focus lost); item selection screen: "what can I do here" for a screen reader is ten identical buttons.

Learning check: Events: Sprint Planning (work + one Sprint Goal), Daily Scrum (Developers' 15 minutes, progress to the goal), Review (inspect outcome, adapt), Retrospective (improve how we work); durations on the sheet are one-month-sprint maxima (8 h, 15 min, 4 h, 3 h), not the game's minutes, which she notes as a mismatch. Typical mistakes: status report in the Daily, applause demo in the Review, complaints without an improvement in the Retro: she can repeat these from the sheet, because it prints them. WIP limit: "an agreement to cap work in progress" (read in the retro action). LGTM: "Looks Good To Me". Score 8 of 10. What made it stick: the printed per-event sheet; the check question after each event. What did not: roles, which she sees only in a folded "Roles, real life, typical mistake" section she never opens.

Recommendation: 8/10 for the content; "for keyboard use it needs the focus fixed before I would recommend it to anyone who cannot use a mouse."

---

## 2. Findings by severity

No finding stops a session with real beginners outright. The two items that could (F-1 and F-2) are the ones that need the pilot.

### Blocker candidates (confirm in the pilot)

None confirmed. Watch: a team that finishes every item early can only wait for the clock (I saw "Nothing to do now" with 3:57 left and relied on local "Skip ahead"; the real room may differ). Needs confirmation with real people.

### Major

F-1. Focus falls to the page after in-place actions (Sarah; `sarah-08-note.png`). Select for the Sprint -> focus on the page heading; Add note -> BODY; Record card -> lost. Contradicts the spec ("focus never falls to the page after an action"). Fix: keep focus on the next logical control (the next item's button, the note field, or the updated list's heading) and announce the change in a live region.

F-2. Repeated controls have identical names (Sarah; `sarah-05-poker.png`, Ana's `ana-28`). "Select for the Sprint" x10, "Vote" x7, "Take", "Verify", "Put back". Fix: aria-label with the item id and name ("Select #6 notification-hub for the Sprint", "Vote for note: ...").

F-3. Phone: the tour card scrolls away from the action (Ana; `ana-06-tour3b.png`, `ana-07-tour3c.png`, `ana-12-tour6.png`). The "Gata. Continua" text and "Inainte" are off screen after every action, and the partner's rules for step 6 are in the tour card above the puzzle. Fix: a slim sticky tour bar (step n of 14, one-line task, Next); show the partner's lines inside the item card.

F-4. Estimation order wastes the planning time and teaches a wrong lesson (Ana, Sarah; `ana-36`, `ana-40`, Sarah summary). Poker runs in backlog order, not on the chosen theme's items, so the items you then must select have no estimate; result: "Items selected without an estimate", Velocity 0 next to "Value delivered 11" (`ana-52-rev2`), Planning 4 to 6 minutes over. Fix: poker the theme items first (or estimate only selected items), or explain velocity at the point it shows 0.

F-5. Phase cards mix in the wrong event's text (Ana, Mihai; `ana-49-review-card.png`, `mihai-11-next.png`). The Review card shows "Typical mistake (Sprint: the work)" and a Kanban-only WIP sentence in a Scrum game; the Daily card repeats Planning's observations. The quick-check question and the observations sit below Begin, below the fold. Fix: observations only once, on the card of the event they describe or on the next screen; hide Kanban notes in Scrum games.

F-6. "What you should do now" contradicts itself (Ana, Mihai; `ana-04-tour2.png`, `mihai-06-board.png`): "You have nothing else to do. You can take #7". Reads as a bug. Fix: "Take the next item: #7 ..." when there is a free item; "Wait for ..." otherwise.

### Minor

F-7. After "Submit the answer" nothing confirms it was accepted; the card just disappears into Review (Ana, Mihai). Fix: one line "Sent. A teammate checks it next." in the yellow box.

F-8. Step 9 of the tour only teaches the escaped defect to someone who gives a wrong LGTM; a careful player is shown the Review's defect on an item she never reviewed (Ana; `ana-21-tour11b.png`). Fix: say who gave that LGTM ("a simulated teammate approved it").

F-9. Eleven reveal clicks for the Delivery review and eleven identical "correct" cards (Mihai; `mihai-13-verdicts.png`). Fix: "Show all" and compact correct cards.

F-10. Result sheet: the score (87 / 32) is not explained; very long page; print and back buttons at the top only (Mihai; `mihai-20-summary.png`). Fix: one line under the score, repeat the print button at the end.

F-11. Warning triangle on good news ("no item still open") in the flow metrics (Mihai; `mihai-14-metrics.png`).

F-12. Unexplained words in item cards: "Value", "Est.", "none", item-kind labels, "Ready", "Replenishment", "Definition of Done" (all). Mostly glossed once in the grey block; a one-time tooltip or a "?" on the card would do.

F-13. "Se asteapta ca Scrum Master-ul / facilitatorul sa continue" shown to a solo tour player and to non-facilitators with no hint what to do meanwhile (Ana, Mihai). Also the tour ends by showing a real Sprint 2 Planning card behind it although the tour says it skips it (`ana-30-after-tour.png`).

F-14. Unconfirmed: Ana's tour retro note (added via a helper proposal) did not appear among the revealed notes (`ana-27b-votes-full.png`); Mihai's and Sarah's notes did. Could be my automation; check in the pilot.

F-15. Sticky action bar covers 25 percent of a phone screen on the retro action step (`ana-29-tour14.png`) and the bottom of long puzzles on a 1280x800 laptop (`mihai-10-incident.png`); "Edit note / Remove note" are small text controls (`sarah-08-note.png`).

F-16. The check question's correct answer is often the longest option, and the Romanian "Sari peste" is fast to skip; it does not annoy, but it also does not test (Mihai, Ana).

F-17. First screen shows a red error box for the public list (expected locally). In production an empty or failing list should say "no teams yet" or hide itself (Ana).

F-18. Merge puzzle: "write the resulting value" does not say whether to include the name (Mihai).

### Bits that depend on the scripted teammates (pilot to confirm, not product bugs as such)

Bots finish before the human acts (lost Verify chance, Take turning into a review); scripted facilitator skipping the WIP-limit decision; blocked item that cannot be unblocked alone.

## 3. What worked well

- Start screen on a laptop: two cards, team vs tour, no doubt which is which. Tour link right under the headline on a phone.
- Phase card: "After this event you will know ...", purpose, timebox, one Begin button; the trunk test passes on every phase card.
- The yellow "What you should do now" box, the numbered columns of the Daily, the item workspace and puzzle UIs (deploy order, incident, merge) self-evident without reading.
- LGTM explained at the moment of the verdict; the reveal of an escaped defect; Sprint Goal missed with the reasons list.
- Red WIP-limit state with its one-line refusal; the four flow-metric tiles with one-line definitions.
- Focus ring, focus to the new heading, radio groups with arrows, print sheet that is clean and actually usable.

## 4. Score and what raises it most

Usability for real beginners: 7 of 10 (desktop and tour: 7.5; phone tour: 6.5; keyboard: 6). Recommendation scores: Ana 7, Mihai 6, Sarah 8.

Changes that would raise it most:
1. Fix focus handling and unique accessible names for repeated controls (F-1, F-2).
2. Phone tour: sticky tour bar and the partner's lines inside the item card (F-3).
3. Planning flow: estimate the goal theme first, explain velocity 0, and keep planning inside its timebox (F-4).
4. Declutter phase cards: one event's text per card, nothing below Begin that is not needed now (F-5), and a contradiction-free "what to do now" plus a confirmation after submit (F-6, F-7).
5. Shorten the long screens (reveal all, a score line, print button at the end of the sheet) (F-9, F-10).

Needs confirmation in the pilot with real people: whether beginners notice the quick checks, whether the full-length poker step fits the timebox, how the real room behaves when all items are done early, the pause button, the unresolved F-14, and everything that depends on real teammates talking on a call.
