# Two Pizzas: requirements re-check of the partial and missing lines, 2026-11-19, 23:30

Commit a97de29. The orchestrator checked each line that `requirements-2026-11-19.md` left partial or missing.

| Id | Was | Now | Evidence |
|---|---|---|---|
| S-9.4 | partial | done | Whole-game runs on the final code: tour `e2e-tour-9.out` PASS; Kanban `e2e-kanban-10.out` PASS, 8041 assertions; Scrum `e2e-scrum-10.out` PASS, 7287 assertions; 0 failures. `npm run test:all` 469 / 115 / 69 |
| O-5c | partial | done | D-102: the selection step of both Sprints shows the team's capacity next to the sum of estimates; "capacity" is in both dictionaries |
| O-26, S-9.6 | missing | done | The three user reviewers ran (`user-beginner`, `user-facilitator`, `user-developer` 2026-11-19); triage in `user-triage-2026-11-19.md`; the real findings fixed as D-106 to D-116 |
| S-5.1, S-10.10 | partial | done | `docs/spec.md` says a room empty for 15 minutes is deleted (D-078), matching `core/config.ts`; the header says decisions 1–27 |
| O-13b | partial | done | D-103: `two-pizzas`, `two-pizzas-worker`, `two-pizzas-rooms`; `lgtm.v1` and the `lg-` prefix stay on purpose (D-001, D-060) |
| S-2.2 | partial | done | D-103: `sharp` removed; `package.json` has no dependency outside the agreed list |
| S-9.1, T-4 | partial | done | `CLAUDE.md` names the one exception, the game's own address twopizzas.faigo.ro (owner's decision 21), and where it appears |
| S-2.3 | partial | open, final step | `reference/piesa-lipsa/` is deleted in the final step, with its line in `CLAUDE.md` |
| O-27, S-9.5 | partial | open | Every reviewer at 9 except design and usability, whose final pass is running; the pilot is the owner's |
| O-15 | owner | owner | Committed locally (a97de29); the push is the owner's, in the final step |
| O-20b | partial | owner | The simulated test and the three user reviewers are done; real people come in the owner's pilot |

Weak evidence kept as is: O-19c ("You answered n of m right") is checked by screenshots, not by a test. It does not block version 1.
