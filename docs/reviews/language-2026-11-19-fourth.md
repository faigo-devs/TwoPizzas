# Language review, fourth pass, 2026-11-19

Scope: `app/i18n/ro.ts` (1,228 lines) and `app/i18n/en.ts` (1,231 lines). I re-checked every key changed since the third pass and every earlier finding, and read the new text for naturalness. Unchanged blocks were checked by targeted search, not re-read line by line. No file edited. The front-end engineer's dictionary files did not change while I read (both last written 10:26-10:27); I list no changing keys.

Scores: **Romanian 8.9/10, English 9/10.**

## 1. Third-report findings

| Finding | Status |
|---|---|
| P1 `work.next.openBlocked` "blocat" | Fixed ("este blocked", "Întreabă-i pe colegi"). |
| P2 `item.legend*` labels | Fixed: "Valoare / Estim." (RO), "Value / Est." (EN), matching the cards; the legend also marks story points as a common practice. |
| P3 break at the hyphen | Fixed in code (the non-breaking hyphen is applied in `i18n/index.ts` output; the dictionary text is unchanged). I did not re-screenshot it. |
| P4 "Sprint Goal: Tema ..." capital in the tour banner | Open, polish (`goal.option` still starts with "Tema"). |
| P5 `work.endEarly.wait.*` missing "The" | Fixed ("The {role} can finish ..."). |
| `pause.away` "on a break" | Fixed ("You are paused, {left} left. ..."). |
| `leaderboard.empty` vs `emptyState` | Fixed (identical wording in both languages). |
| Vague "(butonul e jos)" | Fixed: `work.next.endHalf.*` now quotes the exact button label, in both languages. |
| `pause.back` "Am revenit" / "I'm back" | Unchanged, acceptable. |

## 2. New and changed keys

Natural and correct: `work.endEarly.hint.scrum` (says a real Sprint keeps its fixed length and the game lets you move on), `work.endEarly.confirm.scrum.2` ("mai devreme" / "early"), `work.pb.note`, `item.legend`, the new distractors ("Întotdeauna exact două săptămâni", "Cel mult o oră / o zi / treizeci de minute / o săptămână", "Always exactly two weeks", "At most one hour / one day / thirty minutes / one week"). All wrong options are plausible and clearly wrong against the Scrum Guide. The Romanian is informal ("tu") and the terms stay in English.

**Q1. The new "why" of each Scrum duration question joins an unrelated fact with no signal (both languages, unclear for a beginner).** The question asks how long; the explanation then adds a typical mistake that has nothing to do with the duration:
- `learn.scrum.plan.2.why`: "That is the Scrum Guide's timebox. A typical mistake is selecting more work than the Developers can finish."
- `learn.scrum.daily.2.why`, `learn.scrum.inspect.2.why`, `learn.scrum.retro.2.why`, `learn.scrum.work.2.why` have the same shape.

A reader may think the mistake is the answer's reason (for example that overcommitting is why Planning lasts eight hours). Mark the shift in each of the five keys, in both languages.
- Before (EN): "That is the Scrum Guide’s timebox. A typical mistake is selecting more work than the Developers can finish."
- After (EN): "That is the Scrum Guide’s timebox. Also worth knowing, the typical mistake of this event: selecting more work than the Developers can finish."
- Before (RO): "Este timebox-ul din Scrum Guide. O greșeală tipică este să selectezi mai multă muncă decât pot termina Developers."
- After (RO): "Este timebox-ul din Scrum Guide. Bine de știut și greșeala tipică a acestui eveniment: să selectezi mai multă muncă decât pot termina Developers."
Apply the same lead-in ("Also worth knowing, the typical mistake of this event:" / "Bine de știut și greșeala tipică a acestui eveniment:") to the other four. For `learn.scrum.work.2.why` use "of the Sprint" / "a Sprint-ului".

**Q2. `phase.gloss` (Romanian is awkward).**
- Before (RO): "Timebox-ul este timpul stabilit pentru un eveniment: maxim pentru majoritatea evenimentelor, durată fixă pentru Sprint."
- After (RO): "Timebox-ul este timpul stabilit pentru un eveniment: un maxim pentru evenimentele din Sprint, o durată fixă pentru Sprint."
- English is fine: "A timebox is the time set for an event: a maximum for most events, a fixed length for the Sprint."

**Q3. Tour banner capital (polish, P4).** The tour banner reads "Sprint Goal: Tema Conturi funcționează complet". Use the lower-case form already in `inspect.goal`: "Sprint Goal: tema Conturi funcționează complet".

## 3. What is good
- All Wrong items from the first three reports are fixed; no grammar error found in the changed keys.
- The Romanian register is consistent in the new text, and the technical terms are in English with the article rule applied ("Sprint-ului", "Product Owner-ul", "Review-ul").
- The English reads plainly; the fidelity additions (real Sprint keeps its fixed length; scope is renegotiated with the Product Owner) are accurate and short.
- Labels in hints and on screen match (the button name is quoted exactly in `work.next.endHalf.*`; the legend names the card labels).

## 4. What I could not check
- That the non-breaking hyphen renders on every screen (I confirmed it is in the code, not on a new screenshot).
- 360 and 768 px layouts; I did not run the game this time.

## 5. What stands between each score and 9
- **Romanian 8.9:** Q1 and Q2 (the five "why" lead-ins and the `phase.gloss` rewording) reach 9; Q3 is a bonus.
- **English 9:** Q1 would remove the only unclear spot; no other change needed.
