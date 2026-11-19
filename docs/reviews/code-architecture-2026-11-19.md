# Code, maintainability and architecture review, 19 November 2026

Scope read: `core/` (machine, wire, rng, tasks, types), `worker/src/` (room, index, http, encoding), `app/game/` (controller, store, transports, local room), `scripts/`, the CI workflows, `docs/spec.md` section 10 headings, and the test layout. Run: `npm test` (285 pass), `npm run typecheck` (clean), `cd worker && npm test` (101 pass). The `app/ui`, `app/styles`, `app/i18n` and `app/kit` files were skimmed only, since they are being edited.

## 1. Scores

| Area | Score | Threshold |
|---|---|---|
| Code quality | 8 | 9 |
| Maintainability | 7 | 9 |
| Architecture design | 8 | 9 |

## 2. Strong, keep

- The core is genuinely pure and deterministic: `reduce` clones the state, returns a refusal code or a new state, and never touches a clock or randomness (`core/machine/reduce.ts`). The seed-derived RNG, with `state()` as a draw counter, makes whole games replayable.
- The worker is written against injected ports (`worker/src/ports.ts`): storage, sockets, clock, randomness, leaderboard. `RoomHandler` is therefore unit-testable without a runtime, and 101 worker tests exercise it that way.
- Wire parsing is strict: exact key sets, patterns, size caps, and one single entry point (`parseClientMessage`). The seat token travels in a subprotocol and only its hash is stored.
- `FrameworkRules` (`core/machine/rules.ts`) is the right idea: one seam with a table keyed by framework. The Scrum and Kanban machines share phases, work, retro and scoring.
- Views are built per player on the server (`viewFor`), so a browser never receives private data. The fingerprint check avoids resending unchanged views.
- Test depth in the core is good: scripted full games for both frameworks, refusal tests, hardening tests, SHA-256 known-answer vectors (`core/test/rng.test.ts`), worker socket-limit and alarm tests.
- Reasons are recorded in spec section 10 rather than in comments, as the house rules want; the spec cites review dates and measured values.
- Local practice mode runs the same machine in the browser behind the same `Transport` interface, which keeps one rule set.

## 3. What blocks 9

### 3.1 Code quality (8 to 9)

1. **`RoomHandler.hello` and `seatProven` are convoluted, with a duplicated token check.** `worker/src/room.ts:129-133` hashes the player id as a dummy when no hash is stored and then also tests `stored !== ''`. `room.ts:338-395` declares `let playerId` and `let token`, returns inside an `if`, then has an `else` that assigns them. The same "known hash or refuse" logic appears again around `room.ts:361-366`. Fix: one `verifySeat(playerId, token): boolean` helper used by `admit` and `hello`, and split `hello` into `joinNew` and `resumeSeat`. Size S.
2. **A machine exception has no safe path.** `currentIteration` and `iterationAt` throw `'no iteration'` (`core/machine/util.ts:32,38`), and `reduce` (`core/machine/reduce.ts:122`) has no guard. The state stays intact because of the clone, but `RoomHandler.onMessage` (`worker/src/room.ts:200+`) and `alarm` would reject without telling the player, and an alarm that throws repeatedly is retried by the platform. Fix: catch around the `reduce` call in `RoomHandler.step`, log `machine_error`, answer `bad_request`, and add a test that injects a corrupt state. Size S.
3. **The type says optional where the machine always sets the value.** `Signals.inProgressMax?` and `reviewMax?` (`core/types.ts:573-574`) are initialised in `emptySignals` (`core/machine/util.ts:69-70`) yet read as `?? 0` in `core/machine/work.ts:255-256`. `IterationState.flowEndedAt?` is the same. These are leftovers of earlier shapes; they invite undefined at the view and scoring layers. Fix: make them required and drop the `?? 0`. Size S.
4. **Error-code lists and close codes are copied three times.** `app/game/controller.ts:11`, `app/game/transport/remote.ts:6-8` and `worker/src/room.ts:20-24` each repeat the eight `ErrorCode` literals or the 4000/4001 close codes. Adding a code means editing three places and the compiler will not say so. Fix: export `ERROR_CODES` and the close codes from `core` (next to `ErrorCode`, `core/types.ts:~1040`, or `config.room`) and derive the guards. Size S.
5. **The action list is synchronised by hand in four places.** `ClientAction` (`core/types.ts:836`), `parseAction` (`core/wire.ts:79`), the dispatch switch in `core/machine/reduce.ts:45-116` (which ends in `default: bad_request`), and the client. A new action that is missing from one place fails silently at runtime. Fix: a `satisfies Record<ClientActionType, ...>` table or an `assertNever` in the dispatch and in `parseAction`, plus a wire test that iterates every `ClientActionType`. Size M.
6. **Invisible characters in source.** `core/machine/util.ts:80` embeds U+115F, U+1160, U+2800, U+3164 and U+FFA0 literally in a regex class. They cannot be seen in review and are easy to lose in a reformat. Fix: write them as `\u` escapes. Size S.
7. **A stale-meta race in the publish outbox.** `flushOutbox` (`worker/src/room.ts:543-555`) copies `this.meta`, awaits an RPC to another object (where the input gate is open), then writes `{ ...meta, outbox: null }`. If anything changed `this.meta` during the await it is overwritten. Publishing happens once per room, so it is low risk today; fix by re-reading `this.meta` after the await. Size S.

### 3.2 Maintainability (7 to 9)

1. **The client has almost no automated tests.** `npm test` covers `core/test` and `app/i18n/test` only. Nothing covers `app/game/transport/remote.ts` (reconnect and back-off, replaced and removed close codes, the `welcomed` flag), `app/game/controller.ts`, `app/game/store.ts`, `app/game/local/bots.ts` (325 lines that decide what practice teammates do and drive `skipEvent` loops with a 1200 guard), or `app/game/tour/script.ts`. The browser e2e scripts exist but are manual and are not in the CI workflows. This is the largest gap and the main reason for the score. Fix: pure-function tests for `parseIncoming`, a fake-`WebSocket` test of the transport state machine, a test that bots plus `skipEvent` finish a Scrum and a Kanban game, and a store test. Size L.
2. **No property or invariant test of the machine, and no state-size test.** The machine is tested with scripts only. Missing checks: random legal actions, then assert that each item has exactly one status, `workers` are real players, a refused action leaves the state deep-equal, and `reduce` is idempotent for `server.deadline`. The whole `RoomState` (with every puzzle and its parts, observations and retro notes) is written under the single storage key `state` (`worker/src/room.ts:persist`), and nothing asserts its serialised size stays under the platform's per-value limit at a full game of six players. Fix: a seeded random-play test in `core/test/` and a size assertion on a finished game. Size M.
3. **Reasons are only findable by reading.** Section 10 of the spec is about 260 lines of flat bullets (`docs/spec.md:307-566`) and, since code carries no inline comments, it is the only home for "why". There are no stable ids, so neither a test name nor an exported doc comment can point at a decision. Fix: number the decisions (D-001 and so on), group them by module, and have the test names or `/** */` summaries cite the ids for the traps (SHA-256 hand-written, 128-socket backstop, grace times, sanitiser classes). Size M.
4. **Very large uncommitted change.** `git status` shows about 80 modified files and dozens of untracked ones (the whole `app/game/screens`, `tour`, `core/machine/rights.ts`, `core/sha256.ts`, many tests, new CSS) on `main` since the last commit. Nothing of it has been through CI, bisect is impossible, and a failed edit cannot be reverted. Fix: commit in coherent slices (core, worker, client, styles, tests) before the next review. Size S, but it is a real maintainability risk.
5. **Two modules are too big for their single responsibility.** `core/types.ts` (958 lines) mixes state, views, wire messages, actions and error codes. `worker/src/room.ts` (577 lines) holds seat authentication, socket admission and rate-limit policy, sweeping, persistence, alarm scheduling and the publish outbox in one class with 15 private methods. Fix: split `types.ts` into `state.ts`, `views.ts` and `wire.ts`, and extract `SeatRegistry`, `SocketPolicy` and `Outbox` from `RoomHandler`; the existing port tests carry over. Size M.
6. **Partial test entry points.** `npm test` at the root skips `worker/` and `scripts/check-dist.test.mjs`; CI runs them in separate steps. A new developer can believe the tests are green when the worker is red. Fix: one `npm run test:all` (root, worker, check-dist test) that the contributing guide names. Size S.

### 3.3 Architecture (8 to 9)

1. **The framework seam leaks.** `FrameworkRules` is the right shape, but 57 `framework ===` checks remain, 14 of them inside the core machine outside `rules.ts` and `flow.ts`: `transitions.ts:55,60`, `phases.ts:20`, `work.ts:253`, `connection.ts:139`, `rights.ts:14`, `scoring.ts:31`, `help.ts:34`, `observations.ts:21,103,142,148`, and `views.ts:101,205,223,267,312,313,328`. The client has about 40 more (`app/game/screens/Card.tsx`, `Summary.tsx`, `Work.tsx`, `ItemCell.tsx`, `Inspect.tsx`, `Daily.tsx`, and others). A third framework or a rule change touches all of them. Fix in the core: add to `FrameworkRules` `onIterationStart`, `onWorkBegin`, `wipMetric`, `observationCandidates`, `viewExtras` and `tick` (arrivals), and delete the inline branches. Fix in the client: take framework-specific copy keys and capability flags from the view (or a per-framework screen map) instead of branching in each screen. Size L.
2. **`PlanAction` logic is duplicated across the two frameworks.** `plan.pull` and `plan.unpull` exist in both `core/machine/plan.ts:151-170` and `core/machine/kanban.ts:42-58` with slightly different guards; the neutral file name `plan.ts` actually holds Scrum-only code. Fix: rename to `scrum-plan.ts`, or share a `pullItem(s, item, guard)` helper, and name the per-framework guards. Size S-M.
3. **`PlayerView` is one wide type with framework-specific optionals.** `core/types.ts:690` (`replenish?`), `:822` (`kanban?`), plus `flow?`, `comparison?` and `submitBlockedByLimit?`. Every screen must null-check what the framework guarantees. Fix: a discriminated union `ScrumView | KanbanView` on `framework`, built by `viewFor` through the rules table. Size M.
4. **No versioning policy for stored state.** `RoomState.version` is set to 1 (`core/machine/reduce.ts:createRoom`) but `RoomHandler.load` (`worker/src/room.ts:294`) accepts whatever is stored. Rooms live up to `config.room.lifetimeMs`, so a deploy that changes the shape of the state mid-game will hand the new machine an old state (the missing `inProgressMax` fields above are exactly this class of problem). Fix: on load, compare `version`; run a migration or end the room with a clear code; add a test with a v0 fixture. Size S-M.
5. **Costs scale with whole-state work on every action.** Each action does: a JSON clone in `reduce` (twice, since `RoomHandler.step` first reduces `server.deadline` and then the action), a `JSON.stringify` of the full state as the fingerprint before and after (`room.ts:fingerprint`), a full-state `storage.put`, and one `viewFor` plus a stringify per player. This is fine for six players today, but it is the ceiling of the design and nothing measures it. Fix: record a benchmark test for a full game, and move to per-key or per-section storage only if the number requires it. Size S for the measurement.

## 4. Nice to have

- `app/game/controller.ts` is a module of globals (`transport`, `toastId`, `saidId`, `tourFramework`, `backTimer`) that owns remote, local and tour modes; a small class or closure created in `init` would make it testable. Size M.
- `app/game/controller.ts:116` `createRoom` validates the room code with an inline regex that must match `CodePattern` in the worker; share it from core.
- `core/machine/util.ts:42` `at()` returns 0 for an out-of-range iteration and `median` falls back to 1 (`util.ts:median`); throw or type the index so a bad config cannot hide.
- Replace `JSON.parse(JSON.stringify(state))` in `reduce` with `structuredClone`; add `noUncheckedIndexedAccess` evidence in the tsconfig if not present, since `as number` casts appear in `core/rng.ts` and `core/wire.ts`.
- `core/machine/reduce.ts:dispatch` handles `server.*` and client actions in one switch; two functions (`dispatchServer`, `dispatchPlayer`) would read better.
- `app/kit/Gallery.tsx` (603 lines) and `app/kit/Screens.tsx` (549) are design-kit pages; confirm they are excluded from the production output (the `check` script may already do so).
- Add the `.qa/hardening/*.ts` perf and fuzz scripts to `core/test/` where they are of lasting value; today they live in an ignored folder and cannot protect the code.
- The e2e helpers in `scripts/e2e/lib/` total about 1,200 lines of plain `.mjs`; typing them (or a JSDoc check) would make them as safe as the rest.

## 5. What I could not check

- The build, the e2e runs, any browser or dev server (forbidden); so the real bundle size, the policy hashes and the rendered screens were not checked.
- Whether the serialised `RoomState` of a finished six-player game stays under the platform's per-value storage limit. I did not run a script to measure it; the risk is stated above as an untested assumption.
- Real Durable Object behaviour (input and output gates, hibernation, alarm retry after a throw); the worker tests use fakes.
- `app/ui`, `app/styles`, `app/i18n` content and `app/kit` in depth (being edited); about 5,000 lines of CSS were not reviewed for structure.
- The GitHub workflows beyond their step lists (pinning, secrets), which the security reviews cover.
- Whether every item in spec section 10 matches the current code; I read the structure, not every entry.
