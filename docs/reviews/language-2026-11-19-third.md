# Language review, third pass, 2026-11-19

Scope: `app/i18n/ro.ts` (1,225 lines) and `app/i18n/en.ts` (1,228 lines). I checked every key from my second report and every key added since, and read the surrounding copy in place on the screenshots (`.qa/ux-fix2/`, `.qa/copy-lang2/`, about 20 opened, Scrum and Kanban, RO and EN, 1280 and 390 px). No file was changed. This pass compared against what I read before, rather than re-reading unchanged blocks line by line.

Scores: **Romanian 8.8/10, English 9/10** (second pass: 8.5 and 8.5).

---

## 1. Status of the second-report findings

### Romanian
| Finding | Status |
|---|---|
| N1 hyphens in `learn.*` ("Sprintului") and "Developer-ul" | Fixed ("Sprint-ului", "Când cel care a lucrat la el ..."). |
| N2 `phase.gloss`, `learn.kanban.work.1.q`, `learn.kanban.plan.2.why`, `pause.away`, `privacy.p4` | Fixed. `privacy.p4` now says "primele {top} locuri", `pause.away` uses a localized duration. |
| N3 "stakeholders" in `learn.scrum.daily.1.no2` | Fixed ("părțile interesate"). |
| N4 `start.tourLink` masculine, `tour.action.text.kanban` | Fixed ("Nu ai echipa la tine?", „Stabilește WIP limits” in quotes). |
| N5 `start.team.facts` "apel propriu" | Fixed ("pe un apel separat"). |
| N8 `learn.title` / `learn.summary.title` | Fixed ("Întrebare rapidă", "Întrebările tale rapide"). |
| N10 "WIP limit-uri" | Fixed ("WIP limits" in both keys). |
| N11 `item.status.rejected` | Fixed (Romanian and English both "Wrong answer (escaped defect)"). |
| `privacy.p7` ambiguous "adresa" | Fixed ("adresa de email"); `privacy.p0` now glosses CIF and Reg. Com. |
| Pause reads as stopping the game | Fixed: `pause.legend` and `pause.away` say "Jocul continuă; echipa vede doar că lipsești / te vede în pauză". |
| Stale screenshots | Fixed: the new tour and privacy screenshots show "tu" and the current text. |
| `pause.back` "Am revenit" (statement on a button) | Not changed; acceptable, see polish. |

### English
| Finding | Status |
|---|---|
| N1e `privacy.p4` | Fixed ("If your team chooses to publish ... Nothing is published otherwise."). |
| N2e `privacy.p7`, `privacy.p0` | Fixed ("At the email address above", "CIF (tax ID)", "Reg. Com. (trade register no.)"). |
| N9 pause | Mostly fixed: `pause.legend` and `pause.away` say the game keeps running. The word "break" in `pause.away` against "Pause" on the button remains (polish). |
| `error.room_not_found`, `start.tour.text`, `start.team.facts`, `summary.learned`, `learn.scrum.plan.1.why`, `learn.summary.count`, `learn.kanban.plan.2.why`, `learn.kanban.plan.2.no2` | All fixed. |
| `phase.kanban.plan.practice` length | Fixed (two shorter sentences, about 45 words). |
| Lower-case after "In real life:" | Fixed on screen ("În realitate: cel mult trei ore ..."), the new timebox gloss reads cleanly in both languages. |
| N12 "stakeholders" undefined | Fixed (parenthetical gloss in `phase.scrum.inspect.role.productOwner`, also in Romanian). |

---

## 2. New findings

### Romanian

**Wrong / inconsistent**

**P1. `work.next.openBlocked` regresses the one-name rule.** "{item} este **blocat**: are nevoie de informații de la echipă." Every other key (and the board status "Blocked") uses "blocked". -> "{item} este blocked: are nevoie de informații de la echipă. Întreabă-i pe colegi sau deschide-l ca să vezi." ("Întreabă-ți colegii" is also off: "Întreabă-i pe colegi".)

**P2. `item.legend` and `item.legend.kanban` name labels the card does not show.** The Romanian legend says "Value: ... Est.: ..." but the cards show "Valoare" and "Estim." (`item.label.value`, `item.label.estimate`; confirmed in `.qa/copy-lang2/tour-1280-07.png`). -> `item.legend`: "Valoare: cât valorează elementul când e Done cu răspuns corect. Estim.: estimarea echipei, în story points." `item.legend.kanban`: "Valoare: cât valorează cererea când e Done cu răspuns corect." (The English legend matches its labels and is fine.)

**P3. Hyphenated words break at the hyphen on screen, against spec section 7.** `.qa/ux-fix2/scrum-ro-1280-s09.png`: "apoi începe Sprint Review-" / "ul." and "rezultatul Sprint-" / "ului" in the purpose line; the same shows in the Kanban cards. This is a rendering fix, not a copy edit: use a non-breaking hyphen (U+2011) in the article suffix, or wrap term-plus-suffix in a no-wrap span. It affects every "Sprint-ul / Review-ul / Daily Scrum-ul / ..." in the dictionary.

**P4. Tour board banner capitalizes after a colon.** `.qa/copy-lang2/tour-1280-07.png`: "Sprint Goal: Tema Conturi funcționează complet". `goal.option` starts with a capital ("Tema ...") because it is also a list label; `inspect.goal` correctly has "tema" in lower case. Compose the banner from a lower-case form, or accept as is (polish).

**Polish**
- `work.next.endHalf.*` "închei acum această jumătate ... (butonul e jos)": clear, friendly; "butonul e jos" is vague if the button is above on a phone; "(vezi butonul de mai jos)" is safe. Same for English "(the button is at the bottom)".
- `pause.back` "Am revenit" is a statement on a button; "Revin în joc" would match the imperative buttons. `shell.leaveYes` "Da, plec" is first person while `lobby.kickYes` and `work.endEarly.yes` are imperatives ("Da, scoate", "Da, încheie"); both are readable, and a confirm in first person is natural.
- `leaderboard.empty` ("Încă nu sunt rezultate.") and `leaderboard.emptyState` ("Încă nu există echipe.") say two things for the same state; keep one wording if both can appear together.

### English

**Wrong**

**P5. `work.endEarly.wait.scrum` / `.kanban`: missing article.** "Nothing is left to do. {role} can finish this half of the Sprint." renders "Scrum Master can finish ..." (the Scrum role value has no "the"; the Romanian side is correct, "Scrum Master-ul poate termina"). Every other English key says "the {role}". -> "Nothing is left to do. The {role} can finish this half of the Sprint." (and the same in the Kanban key). Only the Scrum key is reachable today (`Work.tsx` shows it for Scrum), but the Kanban key would read "The facilitator" correctly after the fix.

**Polish**
- `pause.away` "You are on a break" vs the button "Pause" and `pause.confirm` "Start the pause": -> "You are paused, {left} left. The game keeps running; your team sees you away until {time}."
- `item.legend` "Value: what the item is worth when it is Done with a right answer": fine.
- The quiz "Quick check" appears at the start of the next event and asks about the previous one (for example a Sprint Review question on the Sprint Retrospective card, `.qa/ux-fix2/scrum-ro-1280-card-30.png`/`s13.png`). The question names the event, so it is not wrong, but a one-line lead ("About the Sprint Review you just finished") would help a beginner; `learn.title` could carry it.

### Both
- **Pause and tone.** The pause wording, the "game keeps running" sentence and the new `shell.leaveConfirm` ("Îți pierzi progresul" / "You will lose your progress") are clear and honest.
- **New keys, general check.** `leaderboard.unavailable`, `leaderboard.emptyState`, `shell.leaveYes`, `work.endEarly.*` per framework, `pause.leftMinutes/Seconds` (correct 1, 2, 20 plural forms in Romanian), `item.legend*`: all read naturally in both languages apart from P1, P2, P5.
- **Privacy text (language).** Plain, short, one topic per paragraph, the legal citations sit in parentheses; the English "If your team chooses ... Nothing is published otherwise" removes the earlier ambiguity. Nothing a reader would misunderstand. The screenshot shows a free-mail operator address (business choice, noted before).

---

## 3. What is good
- All Wrong items from the first and second report are fixed; the Romanian register is consistently "tu" in the new copy, with "voi" for the team.
- The one-name-per-thing list holds in both languages (partner, escaped defect, flow metrics, WIP limits, Blocked/blocked, Done), with the single exception P1.
- The article rule for English terms and the hyphen forms are applied throughout, including the new quiz.
- Glosses (LGTM, Request changes, timebox, WIP, planning poker, story points, stakeholders) appear where the term first shows, in both languages, and read cleanly on screen.
- The quiz questions and answers are correct, short and consistent with the phase copy.

## 4. What I could not check
- 360 and 768 px layouts; only 1280 and 390 px screenshots were opened (about 20 of 479 files).
- The `item.legend` text in place (no opened screenshot showed it; I judged it against the card labels).
- Whether any screen shows the Kanban version of `work.endEarly.wait` (the code shows it only for Scrum).

## 5. What stands between each score and 9

**Romanian 8.8.** Four small items: P1 (`work.next.openBlocked`: "blocked" and "Întreabă-i pe colegi"), P2 (`item.legend` labels "Valoare" and "Estim."), P3 (no break at the hyphen, a CSS or U+2011 change), and the polish of `pause.back`. With P1 to P3 done it reaches 9.

**English 9.** P5 (`work.endEarly.wait.*`: add "The") and the `pause.away` wording remove the last visible slips; after that, nothing visible stands in the way of 9.5.
