# Beginner user test, Two Pizzas, 2026-11-19

Phone viewport 390x844, Romanian. Screenshots in `.qa/users/beginner/`.
Scope reached: the whole 14-step guided tour, including the closing quick question. The Scrum practice game could not be started: "Creează o cameră" fails (see criticism 1). I did not reach a game summary sheet.

## 1. In one paragraph

It is a team game where you do small cooperative tasks (put four or five components in start-up order, check a colleague's answer) while going through the Scrum events: work, Daily Scrum, Sprint Review, Retrospective. The point is to feel why Scrum has those events. After the tour I roughly understand the rhythm of a Sprint, and the "LGTM is a promise" idea stuck. I would go to Thursday's session, but only half prepared: the terms are shown in context, not explained for someone who has never heard them, and I could not define Sprint Goal or Sprint Backlog from memory. I could not try the "alone with simulated teammates" game: the room would not open.

## 2. What I learned (my words)

- **Sprint**: a fixed block of time in which the team does the work, and inside it all the other meetings happen. The game said "a month or less, fixed length"; the work part here was 4 minutes.
- **Sprint Goal**: the theme the team aims at in this Sprint (the board said "Conturi funcționează complet" and counted how many of its 3 items were Done). I understood it as "what we aim to finish", but nothing told me why it exists or who sets it.
- **Daily Scrum**: the clock stops, the team walks the board right to left (Review, In Progress, Sprint Backlog) and fixes what is stuck: take over a check, join a pair, promise help.
- **Sprint Review**: you look at what was finished and see for each item whether the answer was right. A wrong answer that someone approved is an "escaped defect" and does not count.
- **Retrospective**: everyone writes private notes in three columns (went well / slowed us down / will try), notes are revealed, each person gets two votes, and the team picks one action for next time.
- **Other terms**: LGTM (a verifier who did not work on the item approves it), Request changes, Done (only when checked by someone else), timebox, WIP limit (max items in progress, offered as an action), blocked item, pair work, the columns Sprint Backlog / In Progress / Review / Done, escaped defect.
- **Not got**: Sprint Planning (the tour says it skips it), Product Owner and Scrum Master roles (only "Se așteaptă ca Scrum Master-ul să înceapă" and a collapsed "Roluri" box I never opened), Increment, Developers.

## 3. Criticisms, worst first

1. **Practice game cannot be started** (blocker). Screen: start page after "Creează o cameră", `.qa/users/beginner/27-create-fail.png`. Pressing "Creează o cameră" (Scrum selected) twice gives only "Nu a mers. Încearcă din nou." and the page stays the same. I expected a room code or a clear reason. There is also no visible "play alone with simulated teammates" button on the start page: the only solo thing is the tour. So I could not reach a full Scrum game or a summary sheet. A real beginner would give up here. (Probably the frozen copy has no room server, but the page gives no explanation or alternative such as "try the tour instead".) The leaderboard block at the bottom of the start page also says "Lista nu este disponibilă acum" with a retry button; the console shows 404s.
2. **The tour contradicts what I just did** (major). Screens: `09-step5.png`, `13-step8.png`, `14-step9.png`. Step 5 asks me to open a second item and watch the countdown, but #8 was already open when I arrived and I saw no countdown. In step 8 the game says "nu ai lucrat la acest element" and asks me to verify #7, the item I solved myself in step 4, and the answer shown was the one I submitted. In step 9 the same #7 comes back with a different, wrong answer. In step 7 I promised help on #1, but at the Daily Scrum it said "1 element blocked nu are ajutor". The Sprint Review showed #8 as "Răspuns greșit" though I never touched it. I could follow the idea, but it made me doubt the board was really mine, and who worked on what is exactly the lesson of LGTM.
3. **The closing quick question tests something the tour never taught** (major). Screen: `25-quiz.png`. "Cât poate dura un Sprint Retrospective pentru un Sprint de o lună?" I answered "treizeci de minute" and got "Nu chiar." The right answer (three hours) was nowhere in the 14 steps, so it felt like a trick question, not a recap.
4. **Dense, jargon-heavy copy for someone who has never heard of Agile** (major). Screens: `02-tour1.png`, `16-step10.png`. Step 10 is one long paragraph: "În Scrum Guide, Developers aleg structura; parcurgerea de la dreapta este regula jocului...". The panel below the tour card adds "Scop / Timebox / În realitate: o lună sau mai puțin...", a "Bine de știut" box about the Definition of Done and a collapsed "Roluri, în realitate, greșeala tipică". On a phone, in a few seconds, I skipped most of it. Developers, Increment, Sprint Backlog, Scrum Guide and WIP limit appear without a one-line plain definition. The short text in the tour card is good; the lower panel is what overloads.
5. **The tour card and the thing to press are far apart on a phone** (major). Screens: `07-opened.png`, `09-step5.png`. The instruction sits at the top, the board is far below, and the pink bottom bar ("Pasul 3 din 14", "Înainte") plus the yellow "Trimite răspunsul" button cover the rules list so the last rule is cut off. I kept scrolling up and down to remember what I was asked to do. The small up arrow in the bar helps, but I only guessed what it did.
6. **"Înainte" is missing until the task is done, then shows only in the bottom bar** (minor). At step 3 the top card has no "Înainte"; after "Gata. Continuă când vrei." the button was off-screen. I hesitated about 20 seconds before spotting the bottom bar.
7. **English words on a Romanian screen** (minor). Screen: `15-reqchanges.png`. Buttons "LGTM" and "Request changes", plus "In Progress", "To do", "Review". "Request changes" is never explained.
8. **Odd simulated retro notes** (minor). Screen: `21-votes.png`. "Prea multe elemente erau deschise deodată" appears twice in one column, and my own note was missing on the vote screen and only showed up later. "0 elemente blocked nu au ajutor" reads awkwardly.
9. **The Sprint Review step shows only verdicts, not the meeting** (minor). Screen: `19-review.png`. I learned that the review reveals right and wrong, but not what a Sprint Review is for (inspect the result with others and adapt). Sprint Planning being skipped is stated honestly, but it leaves Sprint Goal without a source.
10. **Page opens in English** (minor). The phone is Romanian, so I switched with the RO toggle, which was easy to find and worked.

## 4. What worked well

- The start page is clear in two seconds: name, one sentence, and a pink link "Nu ai echipa la tine? Fă turul ghidat", which is exactly my situation.
- Each tour step is short, the dots and "Pasul X din 14" show how long it is, and every step has a clear "Rândul tău" instruction.
- The ordering puzzle is small, fair and a bit fun; the up/down arrows are big enough for a thumb.
- "Jocul nu spune dacă răspunsul e corect, așa că verifică tu" makes LGTM real: I had to check the rules and caught the wrong answer.
- The Retrospective flow (private notes, reveal, two votes, one action with suggested options) is easy and written in plain words.
- The game is honest about what it skips and about "în joc" versus "în realitate".
- The Romanian reads naturally and the quick question gives feedback with the correct answer.

## 5. Scores

- Likelihood to recommend to a colleague: **6/10** (the tour yes; the real game I could not open).
- Clarity for a beginner: **6/10** (steps are clear; vocabulary, the lower info panels and the tour's inconsistent state are not).
