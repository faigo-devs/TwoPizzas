# Fifth fidelity review: Two Pizzas against the Scrum Guide (2020), Kanban Guide v2025.5, Agile Manifesto

Read-only. Score: **9/10** (fourth review 8/10).

Method and limits. I re-read the phase cards (EN and RO), all 110 `learn.*` values of the ten objectives and twenty question sets (EN), the Romanian text of every key that changed, `app/game/learn.ts` and `Card.tsx`, the new work-phase texts (`work.pb.*`, `work.endEarly.*`, `work.next.*`), the item legend, the tour variants, the pause and privacy texts, and one fresh Romanian Scrum card (`.qa/copy-lang3/ro-scrum-1280-09-...`). I did not re-fetch the guides: the first review's fetches (2026-11-16) cover the durations, purposes, the Kanban measures and "no meetings". Statements about the Sprint Backlog and the Sprint Goal during the Sprint are from my reading of the 2020 Guide, marked "(memory)".

## 1. Status of the fourth report's findings

| Id | Status | Evidence |
|---|---|---|
| F1 real duration and timebox gloss visible | **Fixed (Scrum); Kanban n/a** | `Card.tsx:51` renders `real` outside the fold for Scrum: "In real life: at most four hours for a one-month Sprint, shorter for shorter Sprints. A timebox is the longest time an event may take." (`phase.gloss`; RO "În realitate: cel mult patru ore ... Timebox-ul este timpul maxim pe care îl poate avea un eveniment."), visible inside the timebox box on the Romanian Review card. Kanban cards keep `.real` in the fold, which is right since the Guide has no timebox (the visible `phase.ends.soft.kanban` says so). |
| F2 durations in the question sets | **Fixed** | Variant 2 of every Scrum event asks its duration: `learn.scrum.plan.2` eight hours, `work.2` "How long can a Sprint last? One month or less", `daily.2` "15 minutes", `inspect.2` "At most four hours", `retro.2` "At most three hours"; the variant alternates with the iteration, so every team meets each once. See N2 and N3 for side effects. |
| F3 WIP question pinned to round 2 | **Fixed** | `learn.ts:65-66`: Kanban `work` uses variant = iteration (round 1: "When work in progress is under control, what comes first?", round 2: "What does a WIP limit do?"). Defensible choice fixed: `learn.scrum.work.1.no1` "When the Developer who worked on it says so" (RO "Când cel care a lucrat la el spune că e gata"). |
| F4 Kanban roles on the visible note | **Fixed** | `phase.kanban.plan.practice` "...It defines no roles, so the facilitator and the customer are this game's; a numeric WIP limit and this meeting are common practices." (RO matches.) |
| F5 tour variants | **Fixed** | `tour.note.text.kanban` "A retrospective is a common practice, not something the Kanban Guide prescribes...", `tour.vote.text.kanban` "Again a common practice...", `tour.daily.text` (Scrum) "In the Scrum Guide the Developers choose the structure; walking from the right is this game's rule." RO matches. |
| P1 Kanban "event" | **Fixed** | `learn.kanban.*.goal`: "After this meeting..." / "After this round..." (RO "După această întâlnire / rundă"). |
| P2 Kanban "what comes first" | **Fixed** | `learn.kanban.work.1.q` "When work in progress is under control, what comes first?" |
| P3 "not a presentation" | **Partly** | `learn.scrum.inspect.2` (the old "working session" question) was replaced by the duration question; the card's `phase.scrum.inspect.aka` still says "the Review is a working session, not a presentation" while the Guide says to avoid limiting it to a presentation. Optional "not just a presentation". |
| P4 Romanian register | Unchanged (informal singular), language matter | not fidelity |
| P5 tour callout | Not re-checked (screenshots newer); `Card.tsx` hides observations in tour mode | |
| Stakeholders gloss | **Fixed** | `phase.scrum.inspect.role.productOwner` "...brings the stakeholders' feedback (the people who use or pay for the product)" (RO "părților interesate (cei care folosesc sau plătesc produsul)") — a common definition; the Guide does not define the term. |

## 2. New findings

### Misleading

**N1. "Finish this half of the Sprint now" contradicts "fixed length" on the same card.**
- Keys: `work.endEarly.scrum` "Finish this half of the Sprint now", `.hint.scrum` "Nothing is left to do in this half of the Sprint.", `.confirm.scrum.2` "This ends the work of the Sprint and moves on to the Sprint Review. Continue?", `work.next.endHalf.scrum`. RO the same ("Termină acum această jumătate a Sprint-ului").
- Guide (Scrum Events, the Sprint): Sprints are "fixed length events of one month or less to create consistency"; the Sprint is not shortened because work ran out; if the Developers finish the Sprint Backlog early, they work with the Product Owner on more work (memory). `phase.scrum.work.real` on the card says "fixed length". The game pairs the button with `work.pb.*` (take more from the Product Backlog), which is the right Scrum behaviour, then offers to end the Sprint instead.
- Verdict: an acceptable shortcut for a 45-60 minute session, but it needs one sentence, otherwise a beginner learns that a Sprint ends when the team is out of work.
- Fix: `work.endEarly.hint.scrum` = "Nothing is left to do in this half of the Sprint. A real Sprint keeps its fixed length; the game lets you move on to save time." Same in Romanian (RO: "Un Sprint real își păstrează durata fixă; jocul vă lasă să mergeți mai departe ca să economisiți timp.", in the register the team uses).

### Polish

**N2. The Scrum question sets no longer ask the typical mistake.** With purpose in variant 1 and duration in variant 2, none of the ten Scrum sets asks an event's typical mistake (the Daily's `daily.1.no1` "The Scrum Master, as a status report" touches it). The learning goal names purpose, duration and typical mistake. The mistakes remain on the card (folded) and in the observation block. Optional fix: ask the mistake in one `why` or add a third variant per event ("Which is a typical mistake in the Daily Scrum? Turning it into a status report for a manager").

**N3. A wrong choice that is nearly right: `learn.scrum.work.2.no1`** "Exactly two weeks", asked after "How long can a Sprint last?". A beginner who knows that two-week Sprints are common may reasonably consider it right. Fix: "Always exactly two weeks" (RO "Întotdeauna exact două săptămâni"). Also the three duration questions reuse the same distractors ("At most fifteen minutes", "At most two days"), so the pattern gives the answer away; vary them (for the Retrospective "At most one hour", "At most a week").

**N4. `work.pb.note`** "The Sprint Goal stays the same; the Sprint Backlog may change during the Sprint (Scrum Guide)." Consistent with the Guide (memory: the Sprint Backlog is updated throughout the Sprint as more is learned; no change that endangers the Sprint Goal; scope may be clarified and renegotiated with the Product Owner). The game lets any Developer take an item from the Product Backlog; the Product Owner part is missing. Optional: "...may change during the Sprint as the team learns, in agreement with the Product Owner (Scrum Guide)."

**N5. `item.legend`** "Est.: the team's estimate, in story points." Story points are a common practice; the disclosure is on the Planning card note and on the poker screen but not here. Optional: "...in story points (a common practice)."

**N6. `phase.gloss` on the Sprint card.** "A timebox is the longest time an event may take." appears after "One month or less, fixed length."; for the Sprint the length is fixed (one month or less), not a maximum within it. Optional: for the Sprint card use only the fixed-length sentence.

## 3. Question sets (every one checked in both languages)

- Scrum: `plan.1` (what Planning lays out) faithful, reason now "It lays out the work to be done in the Sprint (Scrum Guide)". `plan.2` eight hours faithful. `work.1` Definition of Done faithful, defensible choice removed. `work.2` Sprint "one month or less" faithful (N3 for `no1`). `daily.1` who it is for faithful; `daily.2` 15 minutes faithful. `inspect.1` outcome of the Sprint faithful; `inspect.2` four hours faithful. `retro.1` ways to increase quality and effectiveness faithful; `retro.2` three hours faithful.
- Kanban: `plan.1` faithful and labelled a common practice; `plan.2` faithful (reason cites the Guide only for controlling items started but not finished, fetched); `work.1` faithful as a flow rule labelled a typical mistake of the flow; `work.2` faithful, labelled "a common practice", asked in round 2 only; `daily.1` labelled this game's rule; `daily.2` labelled a common practice; `inspect.1` faithful (the four metrics; velocity and story points are not in the Guide); `inspect.2` faithful; `retro.1` faithful; `retro.2` faithful ("The Kanban Guide prescribes no meetings", fetched).
- Objectives: five Scrum objectives match the card purposes; Kanban objectives use "meeting"/"round".
- Romanian: all changed `learn.*` and glossed keys say what the English says; `learn.scrum.work.2.why` and the three duration reasons match their English.

## 4. Other changed texts

- Cards, visible and folded (EN and RO): purposes, `.real` durations, practice notes naming the Guide, the roles rows and typical mistakes are faithful; the Kanban plan note now states that the Guide defines no roles.
- Tour: the Kanban retrospective and vote steps are labelled common practices; the Scrum daily states the game's rule; `tour.limit` is still Kanban-only.
- `pause.legend` "The game keeps running; your team only sees that you are away." and `pause.away`: no Scrum or Kanban claim (the clock keeps running, which the text states).
- Privacy `p0`-`p8`: nothing about Scrum or Kanban.
- `summary.scoreNote` (Scrum and Kanban): a game rule, labelled as the score.

## 5. Could not check

- Every screenshot of `.qa/ux-fix2/` and `.qa/copy-lang3/` (opened one).
- Verbatim guide text beyond the first review's fetches; the Sprint Backlog wording in N1 and N4 is from memory.

## 6. Score: 9/10

Every finding of the fourth report is fixed. What remains is one honest-but-unqualified shortcut (N1) and polish. The questions are accurate, labelled and defensible.

To reach 10:
1. N1: qualify "Finish this half of the Sprint now" as a game shortcut (EN and RO).
2. N2: ask or mention each Scrum event's typical mistake in a question or reason.
3. N3 and N4-N6: sharpen the "two weeks" distractor and the repeated duration distractors; add the Product Owner clause to `work.pb.note`; "(a common practice)" on the Est. legend; fixed-length wording on the Sprint card gloss.
