# Two Pizzas, experienced developer review (Kanban, 3 players, English, desktop 1440x900)

Screenshots are in `.qa/users/developer/` (written below as `shots/NN-*.png`). The room server was up throughout; no "server down" event.

Method note: the tester drives the browser from a command line, so each action costs about a second. Both Flow rounds ended before any item finished review. I therefore never saw a finished item, a customer verdict, a cycle-time chart with data, or a non-zero score. This is flagged where it matters; it is not counted as a game defect by itself, but see criticism 1.

## 1. Verdict

I would not yet forward it to my manager as "worth the team's hour", but I would not bin it. The content is better than most Agile training I have sat through: the metric definitions are right (WIP, throughput, cycle time, work item age), every practice that is not in the Kanban Guide is labelled as such ("The Kanban Guide has no timebox", "A limit as a number per column is a common practice"), and the cooperative puzzles (information split between a pair and an outside player; a reviewer who must verify an answer, so an LGTM is "a promise") teach something real about hand-offs. The weak part is pacing and the loop: Flow is 4 minutes and is cut in half by a daily, a pair item needs three people to coordinate plus an 8-second switching penalty, and unfinished work vanishes at round 2. In my run nobody finished anything, so the delivery review and the compare-two-rounds screen showed zeros. Real beginners will probably finish one or two items, which is thin evidence for "flow metrics". Fix the pacing and I would recommend it.

## 2. Criticisms, worst first

1. **Flow time is too short for the work the game asks for; the metrics lesson can end in all zeros.** (major)
   Screens: round 1 and 2 Flow, delivery review (`shots/13-delivery.png`, `shots/14-metrics.png`, `shots/30-r2-verdicts.png`, `shots/32-compare.png`).
   Happened: Flow is 4 minutes, interrupted by a Daily at the board mid-phase. Puzzles need typing or reordering, a pair item needs a partner plus an outside holder, review needs a third person, and switching items costs 8 s. In both rounds my team finished 0 items: "No item was done in this iteration", Throughput 0, Cycle time "no item finished", score 0. Expected: something to read in the delivery review, which is the point of the Kanban lesson. At minimum warn when the round is about to end with items in Review, or extend the phase while a submitted item awaits review.

2. **Unfinished items disappear between rounds, which contradicts the metric just taught.** (major)
   Screen: round 2 Replenishment (`shots/21-r2-replen.png`). The delivery review says an open item "stays open, and its work item age keeps growing"; round 2 then "starts empty, with new requests". In real Kanban open work carries over, and that carry-over is the lesson on ageing and WIP. Either carry it over or explain the reset.

3. **A phase change silently discards what you are typing or clicking.** (major on the typing path)
   Screens: `shots/08-submitted.png`, `shots/26-after-daily.png`. When the timer moved the room from Flow to the Daily, my puzzle entries and reorder clicks made at that moment were lost (the list was back in its original order afterwards). The item stayed open, which is good, but my input did not survive. Expected: a visible "phase ends in 10 s" cue, or a preserved draft.

4. **Work item age figure is unexplained.** (minor, needs checking)
   Screens: `shots/14-metrics.png`, `shots/31-r2-metrics.png`. Round 2 shows age 07:55 for an item started a few minutes earlier in a 4-minute round; round 1 shows 07:28. It may be game-clock time including meetings, but a sceptic cannot reconcile it.

5. **The outside holder added no information in my run.** (minor)
   Screens: `shots/24-pair-a.png`, `shots/24-pair-b.png`, `shots/27-c-info.png`. The "Info you hold" rule on the third player (database starts before queue) was already shown to one pair member, so the "info outside the pair" lesson did not bite. Possibly by design for this deal, but it weakens the idea.

6. **The puzzles are lookup toys, but honestly labelled.** (minor, taste)
   The merge task (`shots/07-puzzle.png`) is "keep the value from side B", a few seconds of lookup. Not real work; fine for a game, but do not sell it as real tasks.

7. **Quick checks are patronising for an experienced person.** (minor, taste)
   e.g. "What does a WIP limit do?" (`shots/29-review-pair.png`). They are skippable, so low harm. Collapsed by default would be kinder.

8. **"0 of 8 requests have arrived" while Ready already holds 3.** (minor)
   Round 1 Flow strip. "Arrived" means new inflow, but it reads like a bug at first sight.

9. **Facilitator role moves in round 2 with little signal.** (minor)
   `shots/20-next.png`: the old facilitator only sees "Waiting for the facilitator to begin" and I looked for Begin on the wrong screen. Say who facilitates this round.

10. **Facilitator script block ("Mark as done", "All steps") repeats the main button on every screen.** (minor, taste)

## 3. Keyboard-only findings

Done with keyboard only: Replenishment picking (round 1), one puzzle fill, round 2 Retrospective end to end (notes, reveal, vote, action step, end), and the result screen. Keys used: Tab, Enter, Space, arrows.

- Good: on each step change focus lands on the new step heading (Write your notes, Vote, Choose one action, Result). After Move to Ready focus moves to the next card, so repeated Enter fills Ready. After Add note focus returns to the note field. Vote becomes "Take back vote" with a clear accessible name. Category radios work with arrow keys. A "Skip to the game" link is the first tab stop. Puzzle reordering uses real "Move X up/down" buttons. No focus trap found.
- Choose-one-action step: first Tab landed on the last radio ("Help first") rather than the first option, and "Choose this action" is disabled until something is selected, so Tab then Enter ends the retrospective without an action. (minor)
- "Leave the game" confirmation puts focus on "Yes, leave" (the destructive option) and Escape does not dismiss it (`shots/35-leave.png`). Expected: Escape cancels, safe option focused. Pressing Enter leaves the room and loses progress. (major for keyboard users)
- On the Flow board there are several tab stops (quick check, disclosures) before the actual work area; I could not confirm a full keyboard path to LGTM/Request changes because the phase ended while I tabbed. (minor, unverified)

## 4. Robustness findings

- Reload mid-game: session c reloaded in the retrospective and rejoined the same room and step. Good.
- Second tab, same browser: shows the start page with no resume. Joining the code mid-game gives a clear message, "The game has already started, so no one can join now." (`shots/18-join-midgame.png`). Clear, but a player who loses browser state cannot get back in. (minor, possibly major for a real class)
- Double clicks: double-click on Move to Ready moved the item once; double-click on Vote used the two votes and stopped at "0 votes left". No duplicates or negative counts.
- WIP limits: the board shows "WIP limit 0/2" and "1/1" with a warning badge, and limits are set with selects from 1 to 6. Works.
- Switching cost: visible countdown ("Switching to #17, 3 s left") and the item stays hidden meanwhile. Clear.
- No server outage during the run.

## 5. What worked well

- Metric definitions and the "the Guide has no timebox / no roles / common practice" labels are accurate and consistent; I found no cargo cult presented as a rule.
- The reviewer sees the full answer and must decide; the LGTM text ("The game does not say whether it is right, so your LGTM is a promise") is the best idea in the game.
- Split-information pair item makes the team talk.
- Round 1 without WIP limits as a deliberate "before" picture, then limits set by the team in round 2.
- Retro flow (notes, hidden reveal, votes, one action), print or save session sheet, a plain privacy note.
- Guided tour: 14 steps, "about 10 minutes", but Next is not gated, so an experienced person can click through in a minute or two. It respects my time. It is a Scrum tour even though I chose Kanban for the room (it says it skips Planning and iteration 2).
- Clear labels, good contrast, sensible landing claim ("45 to 60 minutes").

## 6. Scores

- Likelihood I recommend it to my team: **6/10** (8 if Flow did not end with zero finished items).
- Trust in its content: **8/10** (definitions and caveats are careful; the round-2 reset and the unexplained age figure cost points).
