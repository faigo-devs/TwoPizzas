# Language review, final pass, 2026-11-19

Scope: `app/i18n/en.ts` and `app/i18n/ro.ts`, whole files, with most attention on the new and changed keys. Read-only; no tests or builds run.

## 1. Scores

| Language | Score | Why |
|---|---|---|
| Romanian | 8.5 | no blocker, one major (shared with English); fixed, it is a 9 |
| English | 8.7 | no blocker, one major (the same sentence); fixed, it is a 9 |

The new copy is clean: the Romanian grammar around English terms is natural, the register is "tu" / "voi" throughout, no vendor names, diacritics correct, plural forms correct (checked `few` and `other` with "de" in the new keys). One sentence on the tour path teaches the verdict wrongly; everything else is minor.

## 2. Blockers and majors

No blockers.

### Major 1. `tour.right.text` (both languages): "done" is tied to Request changes

The sentence says an item is done only when someone "says LGTM or sends it back with Request changes". A beginner reads "sends it back" as a way to finish. Sending back does the opposite. It is on the tour path and defines the core verdict pair.

EN, current:
`A teammate finished this item. It is done only when someone who did not work on it says LGTM (“Looks Good To Me”) or sends it back with Request changes. The game does not say whether the answer is right, so check it against the rules yourself.`

EN, replacement:
`A teammate finished this item. It counts as done only after someone who did not work on it checks it: LGTM (“Looks Good To Me”) approves it, Request changes sends it back. The game does not say whether the answer is right, so check it against the rules yourself.`

RO, current:
`Un coleg a terminat acest element. Un element e gata doar când cineva care nu a lucrat la el spune LGTM („Looks Good To Me”) sau îl trimite înapoi cu Request changes. Jocul nu spune dacă răspunsul e corect, așa că verifică-l tu față de reguli.`

RO, replacement:
`Un coleg a terminat acest element. Un element contează ca gata doar după ce îl verifică cineva care nu a lucrat la el: LGTM („Looks Good To Me”) îl aprobă, Request changes îl trimite înapoi. Jocul nu spune dacă răspunsul e corect, așa că verifică-l tu față de reguli.`

## 3. Minors

### Both languages
- `tour.review.text` and `tour.review.text.kanban` (the first only): the Increment is defined as "all the finished work so far", but wrong answers are finished too and earn no value. Align with the Definition of Done used in `phase.scrum.inspect.role.productOwner`.
  - EN: `The Increment is the finished work that meets the Definition of Done.`
  - RO: `Increment-ul este munca terminată care respectă Definition of Done.` (current: `Increment e tot ce s-a terminat până acum.`)
- `tour.limit.title`: "A limit stops a start" is odd in English and worse in Romanian.
  - EN: `A limit stops a new start`
  - RO: `O limită oprește începerea unui element` (current: `O limită oprește un start`)
- `tour.showTask`: name the button.
  - EN: `Show the task and the Back button` (current: `Show the task and Back`)
  - RO: `Arată sarcina și butonul Înapoi` (current: `Arată sarcina și Înapoi`)
- `lobby.agenda.note`:
  - EN: `These are the game’s minutes, not real timeboxes. Each event’s card gives the real ones.`
  - RO: `Acestea sunt minutele jocului, nu timebox-urile reale. Cardul fiecărui eveniment le arată pe cele reale.` (current starts `Sunt minutele jocului`, which reads clipped.)

### English only
- `work.next.waitArrivals`: "more ... still coming" is redundant.
  - Replacement: `Nothing to do right now: {count, plural, one {# more request will arrive} other {# more requests will arrive}}. “{label}” appears once they have all arrived.`
- `commit.unestimated`: `Items without an estimate count 0 in velocity. Prefer items the team has estimated.` (drop "the" before velocity.)
- `held.title` is `Info you hold` and `tour.held.title` the same; elsewhere the text says "information". Use `Information you hold` in both, or leave as an accepted short form.

### Romanian only
- `kanban.metric.age.text`: "ședințele" is the only use of that word; everywhere else the game says "întâlniri", and "ședință" is heavier and bureaucratic.
  - Replacement: `Timpul scurs de când a fost început un element încă deschis. Se numără tot timpul, întâlnirile incluse.`
- `tour.action.text`: `Sprint Retrospective planifică moduri…` lacks the article form used everywhere else.
  - Replacement: start with `Sprint Retrospective-ul planifică moduri de a lucra mai bine.`
- `tour.daily.text`: `Scrum Guide le lasă lor structura` → `Scrum Guide-ul le lasă lor structura`.
- `script.scrum.plan.commit.2`: `velocity din Sprint 1` → `velocity-ul din Sprint 1`.
- `observation.plan.overcommitted.text`: `velocity din iterația trecută a fost {velocity}` → `velocity-ul din iterația trecută a fost {velocity}`.
- `phase.scrum.daily.mistake`: `pentru Scrum Master` → `pentru Scrum Master-ul`.
- `phase.scrum.plan.role.productOwner`, the tail `…și a negocia sfera de lucru, și la retrospectivă.` is clumsy.
  - Replacement: `…și a negocia sfera de lucru, iar la retrospectivă participă și el.`
- `privacy.p7`: `o copie a datelor date de tine` repeats "date".
  - Replacement: `o copie a datelor pe care ni le-ai furnizat, într-un format portabil`.
- `retro.help.p.try.review_care`: `Verificăm singuri răspunsul înainte să spunem LGTM.` "singuri" can read as "alone". The English says "ourselves".
  - Replacement: `Verificăm noi înșine răspunsul înainte să dăm LGTM.`
- `bot.note.went_well.2`: `Review-urile au venit repede` → `Verificările au venit repede`, to match the item vocabulary ("verificare", "verificator") used everywhere else.
- `commit.hint`: acceptable; if shortened, `Compară suma estimărilor cu capacitatea voastră (oamenii și timpul pe care le aveți). Velocity-ul dintr-un singur Sprint este o prognoză slabă.` reads more easily than the colon form.

## 4. Checked and fine
`retro.end.*` (formal "Încheiați" is the plural "voi" to the team, not "dumneavoastră"), `error.network`, `daily.summary.clear`, `delivery.freshBoard`, `inspect.verdict.notDoneText.kanban`, `inspect.escapedNote`, `summary.velocityNote`, `commit.capacity`, `lobby.agenda.*` (plurals included), `shell.menu`, and the remaining `tour.*` and `bot.note.*` keys. No vendor or tool names, no "dumneavoastră", diacritics with comma below throughout, terms consistent between the two dictionaries.
