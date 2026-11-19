# Code, maintainability and architecture review, second pass, 19 November 2026

Read only, nothing run. Read: `core/` (reduce, rules, wire, actions, errors, state, views, agenda, util), `worker/src/` (room, seats, outbox, sockets), `app/game/` (controller, transport/remote, framework, drafts, local, tour transport), `app/i18n` test layout, `core/test` (dispatch, machine-random, state-size), `worker/test` (benchmark and names), CI workflows, spec decision ids. Not read in depth: the screens (`.tsx`), the CSS, tour `script.ts`, the puzzle generators, the e2e scripts.

## 1. Scores

| Area | First pass | Final | Threshold |
|---|---|---|---|
| Code quality | 8 | **9** | 9 |
| Maintainability | 7 | **8** | 9 |
| Architecture design | 8 | **9** | 9 |

No blocker. No major in code quality or architecture. Maintainability stays at 8 because of one major: the tree is again a large uncommitted change (finding M-1).

## 2. First-pass items

| # | Item | Status | Evidence |
|---|---|---|---|
| 3.1.1 | `hello` and token check convoluted | Fixed | `worker/src/seats.ts` `SeatRegistry.verify` is the one check, used by `admit` (`room.ts:106`) and `resumeSeat` (`room.ts:305`); `hello` splits into `resumeSeat` and `joinNew` (`room.ts:282-328`). |
| 3.1.2 | Machine exception has no safe path | Fixed on the server | `RoomHandler.reduce` catches, sets `faulted`, logs `machine_error`, answers `bad_request` (`room.ts:259-269`); `nextAlarm` drops the machine deadline while faulted (`room.ts:34`); `schedule` and `broadcast` also guarded; `worker/test/machine-errors.test.ts`. Not guarded in the browser-side local and tour transports (see m-3). |
| 3.1.3 | Optional where always set | Fixed | `inProgressMax`, `reviewMax` required (`core/state.ts:514-515`), no `?? 0` left. `flowEndedAt: number \| null` (`state.ts:534`) is a real null (flow not ended). |
| 3.1.4 | Error and close codes copied 3 times | Fixed | `core/errors.ts` (`ErrorCodes`, `isErrorCode`, `CloseCodes`), re-exported by `core/index.ts:5`; used by `controller.ts`, `remote.ts`, `room.ts`. |
| 3.1.5 | Action list synchronised by hand | Fixed | `ActionParsers` is a mapped type over `ClientActionType` (`core/wire.ts:95`); `dispatchServer`/`dispatchPlayer` end in `unhandled(_action: never)` (`core/machine/reduce.ts:57-65`); `core/test/dispatch.test.ts` iterates `clientActionTypes` against `Samples`. |
| 3.1.6 | Invisible characters in source | Fixed | A grep for U+115F, U+1160, U+2800, U+3164, U+FFA0 in `core/machine/util.ts` finds none. |
| 3.1.7 | Stale-meta race in the outbox | Fixed | `Outbox.flush` re-reads `this.meta` after the await and drops the write if the entry changed (`worker/src/outbox.ts:66-79`). |
| 3.2.1 | Client untested | Fixed in substance | `app/game/test/`: `remote.test.ts` (fake socket env), `controller.test.ts`, `store.test.ts`, `local.test.ts` (every framework and player count reaches the summary), `tour.test.ts`, `drafts`, `confirm`, `timer-aria`, `goal-items`, `contrast`. `npm test` now includes `app/game/test`. The browser e2e runs are still manual and not in CI. |
| 3.2.2 | No invariant or size test | Fixed | `core/test/machine-random.test.ts` (seeded random play both frameworks, one status per item, no duplicate or dangling worker, refused action leaves state equal, `server.deadline` idempotent, leak check); `core/test/state-size.test.ts` (under 128 KiB, three seeds, both frameworks); `worker/test/benchmark.test.ts`. |
| 3.2.3 | Reasons not findable | Partly fixed | D-001 to D-116 exist in the spec. Only 7 ids are cited from tests: D-036, D-046, D-061, D-062, D-077, D-089, D-091. D-059 (token hashes), D-046 sanitiser and the grace times are cited; most other traps are not (see m-2). |
| 3.2.4 | Large uncommitted change | Not fixed | `git status` at start: 53 tracked files changed (+5676/-4974) and 12 untracked files, on top of commit 561dc7c. See M-1. |
| 3.2.5 | Two modules too big | Fixed | `types.ts` split into `state.ts`, `views.ts`, `actions.ts`, `errors.ts`; `room.ts` 577 to 433 lines with `SeatRegistry`, `SocketPolicy`, `Outbox` extracted. `state.ts` is 584 lines, one concern. |
| 3.2.6 | Partial test entry | Fixed | `npm run test:all` (`package.json:13`), used by `verify.yml:21`. The two publish workflows still run only `npm test` (appropriate for their own job). |
| 3.3.1 | Framework seam leaks | Fixed | `core/machine/rules.ts` now has `onIterationStart`, `onWorkBegin`, `onWorkTick`, `wipCount`, `cycleTime`, `openAge`, `observationCandidates`, `scriptSteps`, `view`. In core, `framework ===` remains only in `flow.ts:14,23,78` (guard clauses inside the Kanban flow module). Client: `app/game/framework.ts` holds `Profile` flags and copy keys and `byFramework`; no `framework ===` in screens. What remains in screens is `view.framework` used to build copy keys (see m-1). |
| 3.3.2 | Plan pull duplicated | Half fixed | The file is renamed `scrum-plan.ts`. `plan.pull` and `plan.unpull` are still written twice (`scrum-plan.ts:152-169`, `kanban.ts:42-59`). The guards differ on purpose (Ready cap, `readyAt`), so the duplication is small. See m-4. |
| 3.3.3 | `PlayerView` wide optional | Fixed | `PlayerView = ScrumPlayerView \| KanbanPlayerView` discriminated on `framework` (`core/views.ts:326-348`); one narrowing point `byFramework`, with `boardOf`, `goalOf`, `goalThemeOf`, `submitLimited`. No cast to a variant anywhere in `app/`. |
| 3.3.4 | No state versioning | Fixed | `StateVersion` in `core/state.ts`; `RoomHandler.load` ends the room as `outdated` on a different or non-numeric version (`room.ts:242-247`); tests in `worker/test/machine-errors.test.ts`. The policy is "end the room", not "migrate", which suits a game with a bounded lifetime. |
| 3.3.5 | Whole-state cost unmeasured | Fixed (measured) | `worker/test/benchmark.test.ts` times clone, fingerprint and views for a full game. The design is unchanged, which is fine. |

First-pass nice-to-haves: `isRoomCode` is now shared (`core/wire.ts:21`, used by the controller). Controller is still a module of globals (`transport`, `toastId`, `backTimer`, `saidId`, `tourFramework`), but `controller.test.ts` resets it with `leave()`, so it is testable. `at()` still returns 0 and `reduce` still clones with `JSON.parse(JSON.stringify())`: not fixed, harmless.

## 3. New findings

### Blocker
None.

### Major

**M-1. Maintainability. A large uncommitted tree again.** `git status`: 53 tracked files modified, about 5.7k lines added and 5.0k removed, plus 12 new files (`app/game/drafts.ts`, `core/agenda.ts`, `app/ui/timer-aria.ts` and 9 tests). The features of D-112 to D-116 (drafts, confirm focus, agenda, dependency test) sit only in the working tree. Same class of problem as first-pass 3.2.4: no bisect, no CI run on this exact tree, no revert. Fix: commit in slices (core, worker, client, copy, styles, tests, docs) before the pilot. Size S.

### Minor

- **m-1. 82 unchecked dynamic copy keys.** `key(value: string): Key` is a bare cast (`app/game/format.ts:8`), used 82 times with template strings (`phase.${view.framework}.…`, `board.column.${view.framework}.${status}`, `daily.end.${view.framework}`, and others). `createT` indexes the dictionary and passes the result to `parse` (`app/i18n/index.ts:197-201`); a missing key gives `undefined` and a thrown error during render. Today every combination I checked exists, and `dictionaries.test.ts` enumerates phases, steps, agreements and errors, but board columns, `daily.*`, `lobby.facilitatorHint.*`, `leaderboard.*` and `start.framework.*` are covered only by habit. Fix: a test that scans `app/` for `key(\`…\`)` templates and expands them over `Framework` and the status/event unions, or move per-framework keys into `Profile` (partly done) so they are typed. Size M.
- **m-2. Decision ids rarely cited.** 7 of 116 ids appear in tests. Traps without a cited id include D-059, the 64-socket history (D-061 has it), the poker and Kanban rules, D-112 to D-116 (the five newest decisions are not cited in any test name: `drafts.test.ts`, `confirm.test.ts`, `agenda.test.ts`, `tasks-dependency.test.ts` carry no id). Fix: prefix the test titles with the id, for at least every decision that has a trap test. Size S.
- **m-3. No error boundary and no guard around the in-browser engine.** No `ErrorBoundary` or `componentDidCatch` in `app/`. `local/transport.ts` and `tour/transport.ts` call `machine.reduce` without `try/catch`, unlike the server (`room.ts:259`). A thrown error in render or in the engine blanks the page for a beginner. Fix: one boundary at the `App` root that shows a restart screen, and a `try/catch` in the two transports that reports a code through `onError`. Size S.
- **m-4. Plan pull duplication.** See 3.3.2. A shared `pullIntoTodo(s, item, state)` and `returnToBacklog(item)` would keep the two guard sets and drop the repeated mutation. Size S.
- **m-5. `RoomHandler.load` sets `loaded = true` before it reads storage** (`worker/src/room.ts:235-236`). Under the platform's input gates nothing interleaves, so it works. If a storage read throws, `loaded` stays true with `state === null`: the room then answers `room_not_found`, and `create` would take the empty state as free and overwrite the stored one. Fix: set `loaded` after success, or keep the load promise and reset it on failure. Size S.
- **m-6. Wall-clock budget in a unit test.** `worker/test/benchmark.test.ts:108-109` asserts mean under 25 ms and max under 250 ms per action. On a loaded CI runner or a machine busy with browsers the max can exceed the budget without any defect. The budget is generous, but make it an opt-in or a ratio. Size S.
- **m-7. Spec contradiction.** D-061 says "a backstop of 256 listed sockets" (`docs/spec.md:521`); D-062 and `core/config.ts:33` say 128, and the test is named for 128. Fix the sentence in D-061 (it is history, so say "first 256, then 128"). Size S.
- **m-8. `framework` guards remain in `flow.ts:14,23,78`.** Three `s.framework !== 'kanban'` early returns in functions that are only called through Kanban rules or from shared code. Either call them through `rulesFor` or drop the guard where the caller already knows. Size S.
- **m-9. Draft store is module-global and cleared only in `teardown`.** `app/game/drafts.ts` keys by item id; `startLocal`, `startTour` and `connect` do not clear it when they replace a running transport. `pruneDrafts` on the next view removes drafts of items that are not the player's, so a stale draft needs the same item id in the new game with the player also working on it, which is narrow. Fix: call `clearDrafts()` in `connect`, `startLocal`, `startTour`. Size S.

## 4. Nice to have

- `reduce` clones with `JSON.parse(JSON.stringify())`, and `RoomHandler.step` reduces `server.deadline` then the action, so two clones per action. `structuredClone`, or skip the first reduce when `nextDeadline(state) > now`. The benchmark shows it is cheap; do it only if the number changes.
- Check that `fingerprint` (`room.ts:51`) and the broadcast key (`room.ts:407`) cannot diverge in what they ignore (`now`); both are `{ ...x, now: 0 }` today.
- `controller.ts` could become a created object (`createController(env)`) like `createRemoteTransport(…, env)`, so the tests need no global stubs.
- Bring the manual browser runs (`scripts/e2e/run.mjs`) into a nightly or pre-release CI job; they are the only check of the real rendering.
- `app/game/local/bots.ts` (326 lines) is tested only through "every game reaches the summary"; a few targeted tests of the bot choices (when it submits, when it asks for help) would protect the practice mode.

## 5. What I did not check

Tests, build and browsers (not run, as instructed); screens and CSS in depth; puzzle generators beyond their test names; tour `script.ts`; the e2e scripts; real Durable Object behaviour (gates, hibernation, alarm retry).
