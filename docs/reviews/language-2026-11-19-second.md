# Language review, second pass, 2026-11-19

Scope: `app/i18n/ro.ts` (1,208 lines) and `app/i18n/en.ts` (1,211 lines), both read in full against `docs/spec.md` section 7. Screenshots opened: `.qa/design-fix/start-ro-1280.png`, `.qa/pause/ro-1280-2-paused.png`, `.qa/micro/scrum-en-1280-check1-answered.png`, `.qa/gdpr-fix/footer-ro-1280.png`, `.qa/tour2/kanban-ro-390-held.png`. No file was changed.

Warning about the screenshots: `.qa/tour2/kanban-ro-390-held.png` still shows the old formal plural ("Nu aveți niciun element deschis", "Luați", "Voi ajuta", "Înainte") and `.qa/gdpr-fix/footer-ro-1280.png` shows an older privacy text ("Turul individual", "Compania care găzduiește pagina"). Both predate the current dictionary, so I judged the dictionary and could not confirm how the current privacy text and the tour render. Please regenerate them.

Scores: **Romanian 8.5/10, English 8.5/10** (first pass: 7 and 8).

---

## 1. Status of the first-report findings

### Romanian

| # | Finding | Status |
|---|---|---|
| R1 | Roles without definite article ("ca facilitator") | Fixed: `role.facilitator.*.def` exist and `format.ts` passes them to the waiting, `summary.onlyFacilitator` and `work.endEarly.wait` texts. |
| R2 | Incident levels do not agree with the indicator | Fixed: per-indicator `token.indicator.*.is` and `token.level.<indicator>.<level>`; "erorile sunt scăzute", "coada este plină". |
| R3 | "adaug-o" | Fixed ("adaugă-o"). |
| R4 | Garbled Definition of Done sentence | Fixed (`phase.scrum.work.practice`). |
| R5 | "Verificare" = peer review and event title | Mostly fixed (`inspect.title` "Inspectare", "Inspectează Increment-ul"). Residual: `learn.title` "Verificare rapidă", `learn.summary.title` "Verificările tale rapide" (see N8). |
| R6 | Forced masculine | Mostly fixed ("Gata", "fără echipă", "Lucrezi doar tu"). New regression in `start.tourLink` "Ești singur?" (N4). |
| R7 | Article rule for English terms | Fixed in the phase, script, observation and tour copy ("Sprint Review-ul", "Scrum Master-ul", "Sprint Goal-uri"). Residual in the new `learn.*` copy (N1). |
| R8 | "apel al tău / apel propriu" | Mostly fixed (`start.how`, `tour.end.text`, privacy use "apel separat"). Residual: `start.team.facts` "cu un apel propriu" (N5). |
| R9 | "lucrător" | Fixed ("partener", "Cine lucrează", "cei care lucrează"). |
| R10 | "control al muncii în desfășurare" | Fixed. |
| R11 | Calques and stiff phrases | Fixed, all listed keys (aka label, "ține evenimentul în timebox", "Merită atenție", "de nemarcat", held.*, goal.note, estimate.3/.4, previous.2, tour.action.text, noscript, "Estim.", "Elemente estimate", openOldest). |
| R12 | `lobby.status.joining` | Fixed ("Se alătură"). |
| R13 | `tour.held.text` register | Fixed ("spune-le în apel"). |
| R14 | escaped defect vs defect scăpat | Fixed by decision: "escaped defect" everywhere in Romanian, matching the spec; defined once in `inspect.verdict.rejectedText`. Only `leaderboard.defects` ("Defecte") differs, which is fine for a column. |
| R15 | flow metrics vs măsuri de flux | Fixed (both languages). |
| R16 | blocked vs blocat | Fixed. |
| R17 | WIP limits / limite WIP, "obișnuită" | Partly fixed: `limits.practice` and `delivery.limitsInRound2` fixed. New split: "WIP limit-uri" in running text vs "WIP limits" (N10), and `tour.action.text.kanban` "WIP limits este" (N4). |
| R18 | Column vs status names | Fixed (statuses use the board's words in English). |
| R19 | `item.status.rejected` differs between languages | **Open**: Romanian "Răspuns greșit (escaped defect)", English "Escaped defect" (N11). |
| R20 | Helper screen mixes tu/voi | Left as is, which the spec allows; acceptable. |
| Polish | stale `ro.ts` header, `start.tagline`, `tour.limit.text`, `work.next.pull`, `summary.history.none`, `summary.learned`, `item.promiseHelp`, duplicated retro headings | Fixed (`retro.help.panelTitle`, `retro.noteTitle`). |

### English

| # | Finding | Status |
|---|---|---|
| E1 | "errors is low" | Fixed ("error rate is low"; per-indicator `.is` keys). |
| E2 | "solo tour" | Fixed. |
| E3 | Unquoted labels | Fixed. |
| E4 | "{name} is {role} first" | Fixed. |
| E5 | pair / partner / second worker; "I will help"; flow measures; try.* imperatives | Fixed ("partner", "Promise help", "Withdraw help", "We take a review ..."). Still open: `item.status.rejected` (N11). "Framework" for Kanban stays by spec decision; leave. |
| E6 | "worker" for a person | Fixed ("Who works", "the people on {item}"); "Restart the workers" now has only the server meaning. |
| E7 | Over-long sentences | Partly fixed (`phase.scrum.work.practice` shorter; `retro.help.q.wait` restructured). Still long: `phase.kanban.plan.practice` (about 60 words), `goal.note`. |
| E8 | Small items | Fixed except `error.room_not_found` ("may also have been closed"), `start.tour.text` ("A real board"), `summary.learned` ("You should now be able to say"). |
| B2 | Beginner glosses | Fixed for LGTM, Request changes, timebox (`phase.gloss`), WIP (`limits.explain`, plan purpose), planning poker and story points. Open: "stakeholders" is never defined; "Increment" glossed only once. |
| B3 | Privacy and leaderboard | Rewritten; see N7. Leaderboard note unchanged and fine. |

---

## 2. New findings

### Romanian

**Wrong**

**N1. New quiz copy breaks the hyphen rule.** "Sprintul / Sprintului" without hyphen.
- `learn.scrum.plan.goal` "munca Sprintului" -> "munca Sprint-ului"
- `learn.scrum.plan.1.ok` "Munca Sprintului și un Sprint Goal" -> "Munca Sprint-ului și un Sprint Goal"
- `learn.scrum.plan.1.why` "Pornește Sprintul" -> "Pornește Sprint-ul"
- `learn.scrum.inspect.goal` and `learn.scrum.inspect.1.ok`/`.why` "rezultatul Sprintului" -> "rezultatul Sprint-ului"
- also `learn.scrum.work.1.no1` "Developer-ul": spec says "Developers" is always bare; use "Când cel care a lucrat la el spune că e gata".

**N4. Two grammar slips.**
- `start.tourLink` "Ești singur? Fă turul ghidat de 10 minute" is masculine again (R6). -> "Nu ai echipa la tine? Fă turul ghidat de 10 minute".
- `tour.action.text.kanban` "După runda 1, WIP limits este înțelegerea sugerată." (English plural with a singular verb) -> "După runda 1, înțelegerea sugerată este „Stabilește WIP limits”."

**Unnatural**

**N2.**
- `phase.gloss` "Timebox-ul este cel mai lung timp pe care îl poate dura un eveniment." -> "Timebox-ul este timpul maxim pe care îl poate avea un eveniment."
- `learn.kanban.work.1.q` "Într-un flux cu munca în curs sub control" ("în curs" is not the term used elsewhere) -> "Când munca în desfășurare este sub control, ce vine primul?"
- `learn.kanban.plan.2.why` "cere membrilor să controleze numărul de elemente de la început la sfârșit" -> "cere ca membrii să controleze numărul de elemente începute și neterminate."
- `pause.away` "Ești în pauză încă 01:00. Echipa te vede în pauză până la 00:38." (screenshot): "încă 01:00" reads as a clock time, and "până la 00:38" is the game clock. -> "Mai ai 01:00 de pauză. Echipa te vede plecat până la 00:38 pe ceas."
- `privacy.p4` "în primele {top} ale listei lui" -> "în primele {top} locuri ale listei".
- `privacy.p7` "La adresa de mai sus" is ambiguous (postal address or e-mail; `privacy.p0` gives both). -> "La adresa de email de mai sus".

**Inconsistent**

**N3.** `learn.scrum.daily.1.no2` "Pentru stakeholders" against "părțile interesate" everywhere else. -> "Pentru părțile interesate".

**N5.** `start.team.facts` "fiecare pe propriul dispozitiv, cu un apel propriu" (visible on the start screen) still carries the calque. -> "fiecare pe propriul dispozitiv, pe un apel separat".

**N8.** `learn.title` "Verificare rapidă" and `learn.summary.title` "Verificările tale rapide" reuse "verificare" (peer review) for the quiz. -> "Întrebare rapidă" / "Întrebările tale rapide".

**N10.** "WIP limit-uri" in `phase.kanban.plan.role.team` and `phase.kanban.work.practice` against the spec ("WIP limits" is the only name) and the rest of the dictionary. -> "WIP limits" in both.

**Polish**
- `pause.back` "Am revenit" is a statement on a button; `pause.button` "Pauză" suggests the game pauses (see N9).
- `privacy.p1` quotes "art. 6 alin. 1 lit. b din GDPR" inside a player text; correct and required by the GDPR reviews, but the sentence reads better with the citation in parentheses at the end (already so). Fine.
- `puzzle.role.reviewer` "Ești verificatorul": acceptable.

### English

**Wrong / unclear**

**N1e. `privacy.p4` is ungrammatical.** "Only if your team chooses to publish its result, the public list keeps ..." needs inversion or a rewrite. -> "If your team chooses to publish its result, the public list keeps the framework, a generated team name, the number of players, the score, the number of escaped defects, the average cycle time and the date, for as long as the result stays in the top {top} of its list. Nothing is published otherwise. It holds no names and no other personal data." (Romanian "Doar dacă ... lista publică păstrează" is fine as written.)

**N2e.**
- `privacy.p7` "At the address above" is ambiguous (the seat or the e-mail). -> "At the email address above".
- `privacy.p0` uses Romanian abbreviations without gloss for an English reader. -> "CIF (tax ID)", "Reg. Com. (trade register no.)" if the layout allows.

**N9. "Pause" promises something the screen does not do.** The pause only marks a player away; the game and its clock keep running (the clock is visible in `.qa/pause/ro-1280-2-paused.png`). A player may expect the game to stop. Both languages: add one sentence to the chooser, `pause.legend` or a hint: "The game keeps running; your team only sees that you are away." / "Jocul continuă; echipa vede doar că ești plecat." The English also mixes "Pause" and "break" (`pause.away` "You are on a break for {left} more"): -> "You are paused for {left} more. Your team sees you away until {time}." `pause.back` "I’m back" -> "Resume" (or keep, as a statement).

**Inconsistent / unnatural**
- `error.room_not_found` "the room may also have been closed" (first report E8, still open) -> "Check the code, or the room may have been closed."
- `start.tour.text` "A real board" (it is simulated) -> "A full board, scripted teammates, about 10 minutes: ..."; Romanian "O tablă reală" -> "O tablă completă".
- `start.team.facts` "on a call of your own" against `start.how` "separate call" -> "on a separate call".
- `summary.learned` "You should now be able to say" -> "You can now say the purpose, the timebox and the typical mistake of each event." (the Romanian was already changed).
- `learn.scrum.plan.1.why` "It initiates the Sprint by laying out the work to be performed" is Guide wording, stiffer than the rest -> "It starts the Sprint by laying out the work to be done (Scrum Guide)."
- `learn.kanban.plan.2.why` "from started to finished" has the same fault as the Romanian: -> "The Kanban Guide asks members to control how many items are started but not finished."
- `learn.summary.count` "You answered {right} of {total} right." -> "You got {right} of {total} right."
- `phase.kanban.plan.practice` is still about 60 words; split after "(its Definition of Workflow);".
- Screenshot `.qa/micro/scrum-en-1280-check1-answered.png`: the timebox card reads "In real life: One month or less" (capital after a colon) and then the new gloss. Lower-case the sentence or drop the colon (layout or `phase.realLabel` use).

### Both

**N11.** `item.status.rejected`: Romanian "Răspuns greșit (escaped defect)", English "Escaped defect". `inspect.verdict.rejected` is "Wrong answer (escaped defect)" in English. Use "Wrong answer (escaped defect)" for the status too, or "Escaped defect" in both; the first is better for a beginner.

**N6. Quiz copy (`learn.*`, 10 objectives and 20 question sets).** Correct, short, with one clear right answer, wrong options plausible but not silly, Guide facts consistent with `phase.*` copy, and each "why" cites the Scrum Guide or marks a common practice. The tone ("Not quite", "After this event you will know that ...") is friendly and not condescending. Only the fixes above apply. "Customers prefer slow delivery" (`learn.kanban.plan.2.no2`) is the one distractor that reads as a joke; -> "Customers want everything late".

**N7. Privacy text (language only).** Much better than the first draft and now in plain words in both languages; each paragraph has one topic. Remaining: N1e, N2e, `privacy.p4`/`p7` in Romanian, and note that the operator address on the screenshot is a free-mail address while spec section 7 forbids vendor names in the copy; that is a business choice, but a reader sees a provider name on the page.

**N12.** "Stakeholders" is never defined in English; "Increment" is glossed only in `phase.scrum.inspect.role.productOwner`. Add "(the people who use or pay for the product)" once, in `phase.scrum.inspect.role.productOwner`.

---

## 3. What is good
- Every first-report Wrong item is fixed; no remaining grammatical error in the core game copy except N1 and N4 in Romanian and N1e in English.
- Role names, incident readings and article use now read like Romanian written by a person; the English-terms article rule is applied almost everywhere.
- The one-name-per-thing list is applied in both languages (partner, escaped defect, flow metrics, WIP limits, blocked, Done).
- Glosses for LGTM, Request changes, timebox, WIP, planning poker and story points appear where each term first shows.
- The copy was shortened without losing disclosures; the "not in the Guide" notes still match in both languages.
- Plurals, "de" from 20, quotation marks, diacritics and clitic hyphenation remain correct.

## 4. What I could not check
- Rendering of the current privacy text and the Romanian tour (the screenshots are stale, see the top).
- 360 and 768 px layouts and the `design-fix` Kanban tour screenshots beyond the ones listed; truncation of the longer new keys (`learn.*.why`, `work.pb.title`, `pause.away`).
- Whether the game clock really continues while a player is paused (N9 assumes it, from the screenshot).
- Whether "half" in `work.endEarly` (RO "jumătate") is clear to a beginner without seeing the screen; the key texts are correct.
- Facts against spec section 11 beyond what the copy states.

## 5. Scores and what raises them to 9

**Romanian 8.5/10.** To reach 9: N1 (hyphens in `learn.*`), N4 (`start.tourLink`, `tour.action.text.kanban`), N5 (`start.team.facts`), N8 (`learn.title`), N10 ("WIP limits"), N3 ("părțile interesate"), N2 (`phase.gloss`, `pause.away`, `privacy.p4`, `privacy.p7`), N11 (`item.status.rejected`), and regenerate the stale screenshots to confirm the formal plural is gone from the tour.

**English 8.5/10.** To reach 9: N1e (`privacy.p4`), N2e (`privacy.p7`, `privacy.p0`), N9 (pause wording and the "game keeps running" line), `error.room_not_found`, `start.tour.text`, N11, and shorten `phase.kanban.plan.practice`.
