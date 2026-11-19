# Final security review of the Two Pizzas room server and page

Date: 19 November 2026. Reviewer: independent application-security pass, read-only. Scale: `docs/spec.md` section 9, "Review scale".
Earlier reports were not credited; every claim below was checked in the code. `npm run test:all` (463 + 115 + 69 tests) passes and `npm run typecheck` passes for the root and for `worker/`. No server, browser, e2e or network call was run.

## 1. Scores

| | Score | Why |
|---|---|---|
| Code, judged locally | **9** | No blocker, no major. Seven minors. |
| Overall | **9, provisional** | Same findings. It holds only if the owner's deploy-time checks in section 5 pass; a failure of D1 to D4 would be a major. |

## 2. Findings

No blocker. No major.

### Minor

**m1. Per-address limits are keyed by the full address, so an IPv6 attacker can rotate past them.** `worker/src/http.ts:46`, used at `:87` (room creation, 5 per minute) and `:134` (upgrades, 120 per minute).
- Threat: one host with a /64 has 2^64 addresses. Creation and upgrade limits then stop nothing, so rooms (each a Durable Object with a write, living up to 15 minutes empty) and sockets can be created without bound, which is a cost-abuse path. It also erodes the room-code estimate in D-039 ("about seven hours of probing per address"): with rotation the probing is unthrottled. Five letters from 19 give about 2.5 million codes.
- Evidence: `addressOf` returns `cf-connecting-ip` verbatim as the limiter key.
- Fix: key IPv6 addresses by their /64 prefix (first four groups), IPv4 unchanged. A few lines plus a test.

**m2. A socket that exceeds the message rate is answered but never closed.** `worker/src/room.ts:162-166`, `worker/src/sockets.ts:169-185`.
- Threat: an unjoined socket, or a seated one, can send at full line rate. Each message wakes the object, writes the attachment and sends an error. The bound is only the 12 live bound sockets plus 8 unjoined per room, times the upgrade limit (see m1).
- Evidence: `overLimit` returns true and the caller sends `rate_limited`; there is no counter of consecutive violations and no `close`.
- Fix: close with the policy code after, say, three consecutive over-limit windows. Pings are auto-answered by the platform and stay free.

**m3. The random-play leak test is weaker than its name.** `core/test/machine-support.ts:87-116`, used by `core/test/machine-random.test.ts:176`.
- By reading (no mutation run): it would catch a leak of another player's whole part, the answer, the full part, the seed, the secret, the name seed, a hidden note, and any of the forbidden keys. It would miss these regressions.
  - Per-item outcomes: the "verdict before reveal" check at lines 105-108 uses `revealedAny`, a global flag. Once any verdict of any iteration is revealed, no outcome is checked for any item, including the unrevealed ones of the same iteration, which is where `itemView` could regress.
  - Pre-reveal result numbers (`escapedDefects`, `valueDelivered`, `goalMet`, `velocity` in `metrics`) are not asserted.
  - The RNG state `state.rng` is checked only by the key name `rng`, not by value; `defect` is not a forbidden key.
  - Line 93 whitelists whatever is in the viewer's own `workspace.part`, so a view that shows a player a part that is not theirs (for example through a stale open item) passes.
  - The check runs every 25 steps of 1500 in the random games; the scenario tests with `checks` on do check every action.
- Related defence in depth: `workspaceView` (`core/machine/views.ts:77-95`) falls back to `parts[0]` when the viewer is not in `item.workers` (`index` is `max(0, -1)`). I traced every path that sets or clears `player.open` (`work.ts:57,97,114,157,171`, `transitions.ts:75`) and found none that leaves a non-worker open on a work item, so this is not exploitable today. It rests on that invariant alone.
- Fix: assert per item that `outcome` is null unless the item is in the revealed set; assert `workspace.part` equals `puzzle.parts[index of the viewer in workers]` or null; assert pre-reveal metrics are null; add the `rng` value and `defect`. In `workspaceView` return null for work mode when `!item.workers.includes(p.id)`.

**m4. The `verify` workflow checks out with the default credential persistence, and nothing watches dependencies.** `.github/workflows/verify.yml:14,32`; `.github/` holds only workflows.
- The publishing workflows set `persist-credentials: false`; `verify` does not. The token is read-only and the job runs no secrets, so the exposure is small. There is no `npm audit`, no Dependabot configuration and no scheduled check, so a vulnerable caret range (`^`) is only noticed by hand. Lock files exist and `npm ci` is used everywhere.
- Fix: add `persist-credentials: false`; enable dependency alerts or a weekly audit job.

**m5. Worker API responses carry no `X-Content-Type-Options`.** `worker/src/http.ts:9-14`.
- JSON with an explicit content type, so exploitation is not practical. Cheap to add `nosniff` for consistency with the page.

**m6. The public host name is written in `public/web.config` and `public/.htaccess`, while `CLAUDE.md` forbids host names in the public repository.** The build requires it (`scripts/check-dist.mjs` demands the `wss://` entry in `connect-src`), and `'self'` already covers same-host sockets in current browsers. Not a security defect; an owner decision to reconcile the rule and the check.

**m7. Leaderboard scores have no proof of play.** Accepted by D-048 (no accounts). Team names are server-generated (D-083), so the list cannot carry text from a player. Noted so the owner does not treat the list as authoritative.

## 3. Checked and found sound

**Views (the focus).**
- `viewFor` (`core/machine/views.ts:166-198`) builds a `BaseView` and hands it to `rulesFor(s).view`, which only adds framework fields (`scrum-view.ts`, `kanban-view.ts`). I read every field of both unions in `core/views.ts`. None carries `secret`, `seed`, `rng`, `nameSeed`, `size`, `puzzle`, `answer`, `defect`, tokens or hashes.
- Items: `ItemView` omits size, seed, puzzle and defect. `workersNeeded` is null in Backlog and To do (D-038). `outcome` is shown only for items in the revealed verdicts (`revealedIds`), per item and per iteration.
- Puzzle parts: a worker gets only `parts[index of self]`, and only after the context-switch delay (`readyAt`; the server wakes at `readyAt` through `nextDeadline`, so the view is not early). The dependency part goes only to `dependencyHolder`. The full part and the submission go only to the claimed reviewer of an item in Review.
- Results: `metrics` are set only after all verdicts are revealed (`inspect.ts:84-85`, `kanban.ts:107-108`). Observations are computed at the end of an event, not before it. `events` hold timings only.
- Retro: other players' notes are absent until reveal, author ids are null for others, hidden counts only. Poker: other votes only after reveal. Help answers are per player.
- Pure core: `reduce` works on a JSON copy (`reduce.ts:140`), so a refused or thrown action cannot half-mutate the stored state.

**Handshake and seats.**
- `core/wire.ts`: the seat entry is anchored and length-bounded (`seat.<id up to 64>.<token up to 128>`); the server echoes only the game name `lgtm.v1`, never the seat entry (`room.ts:107`, `index.ts:99`).
- `seats.ts`: only SHA-256 of each token is stored; comparison is over hashes with `safeEqual`; an unknown seat costs the same comparison; `Object.hasOwn` blocks prototype keys; ids and tokens are 96 and 192 bits from the platform RNG.
- A wrong or missing token at upgrade does not refuse and does not lock the real seat: it is treated as a stranger and must send a valid `hello`. A resume `hello` is verified the same way and a failure closes with `not_allowed`. `welcome` carries the token only for a new seat.
- Takeover: a verified new socket closes the others of that seat (`releaseOthers`); the old socket's close does not mark the player disconnected because `close` clears its `playerId` first (`sockets.ts:79-80`, `room.ts:200-207`).
- Caps: `admitStranger` and `live()` count only open, non-closing sockets; strangers are refused at 12 bound sockets and the oldest unjoined socket is evicted at 8; a proven seat skips the caps; the backstop of 128 counts everything the platform lists and applies only to strangers (`room.ts:109-113`). Hello timeout 5 s and silence timeout 90 s are enforced by the alarm.
- Kick and removal: the seat's sockets are closed and its hash is pruned in the same commit.

**Abuse.**
- `parseClientMessage`: text only, length check before the byte check, then JSON, an exact key set per action (`hasKeys`), patterns for ids, bounded text and integers, no prototype keys accepted (unknown keys fail). Puzzle responses are bounded (`tasks/index.ts:66-92`). The rate limit runs before parsing.
- Alarm after a machine fault: `reduce` is wrapped; a fault sets `faulted`, the room keeps its last good state, `nextAlarm` then ignores the machine's deadline and the minimum alarm distance is one second (`room.ts:376-392`). A deadline time is only ever returned if it is in the future (`connection.ts:100`), so a deadline the machine fails to clear cannot make a tight loop. A room still ends by lifetime or by being empty.
- A stored state from another version destroys the room and closes its sockets (`room.ts:240-247`).
- Leaderboard: reachable only through the Room's RPC; `parseEntry` re-validates every field; all values are bound parameters; the only interpolated pieces are a constant `LIMIT` and a fixed `ORDER BY`; inserts are idempotent per room id and pruned to what can still appear in a list; at most about 20 bound values in `NOT IN`. Outbox delivery retries without duplicating (unique room id).

**HTTP edge.**
- Creation needs an allowed `Origin`; an empty `ALLOWED_ORIGINS` allows none, and the origin is checked before the limiter is spent. The body is capped by header and by streaming read. The JSON must have exactly one key with an allowed framework. No CORS header is sent anywhere, so other sites cannot read responses. Upgrades check the origin when one is present (browsers always send it).
- Jurisdiction: `inRegion` returns the unrestricted namespace only for the exact string `local`, so a missing or mistyped value still keeps data in the EU (`region.ts`); both Room and Leaderboard use it. `wrangler.toml` sets `eu`; the publish workflow does not pass `local`.
- Logs: events plus counts and codes only (`room.ts`, `sockets.ts`, `http.ts`, `outbox.ts`); no address, name, code, token or note. Workers observability is off in `wrangler.toml`.
- Page: CSP without `unsafe-inline` or `unsafe-eval`, `script-src-attr` and `style-src-attr` `'none'`, `object-src 'none'`, `base-uri` and `form-action` `'self'`, `frame-ancestors 'self'`, upgrade-insecure-requests, nosniff, referrer and permissions policies, no HSTS (the host sends it), the sync-state file hidden. `scripts/csp-hashes.mjs` hashes inline blocks and refuses inline handlers and style attributes; `scripts/check-dist.mjs` checks that both host files carry the same policy, that the hashes match the blocks one to one, that `connect-src` is exactly `'self'` plus the game host, and rejects third-party URLs, trackers, cookies, beacons, source maps and dev pages. The page has no `innerHTML`, `dangerouslySetInnerHTML` or `eval`; the seat is kept in `sessionStorage` only.

**Supply chain.**
- Every action is pinned to a full commit SHA; workflow permissions are `contents: read`; build jobs hold no secrets; publishing needs `environment: production` and the `PUBLISH_ENABLED` variable; the secrets are read only in the publish jobs; `SITE_HOSTS` is validated against a strict host pattern before it reaches a command line; the deploy tool is installed from the lock with `--ignore-scripts`, and the deploy uses the checked bundle with the repository's own `wrangler.toml`; the clean-slate FTP option is manual only and off by default; FTPS is used.
- Dependencies are few: Astro, Preact and two font packages at runtime; TypeScript and wrangler for the worker. No server framework, no database client.

## 4. What I could not check

- Behaviour of the platform bindings (rate limiter, hibernation, auto-response timestamps, jurisdiction) against real infrastructure.
- Whether the pinned action SHAs match the upstream releases (no network).
- The app code under `app/` and `core/tasks/` beyond the transport and the storage use, because it is being edited.
- Mutation of the leak test (read-only), so m3 is by reading.

## 5. The owner's deploy-time checks

- **D1. Run `scripts/staging-check.mjs` against a real staging deploy** (about 6.5 minutes). This is the check that moved the last pass from 8 to 9. It must show the caps, the rate limit, the hello timeout, takeover, the sweep and the eviction working on the real platform, including after the object has hibernated and woken.
- **D2. Rate limits on the platform.** The Workers rate-limit binding counts per location and is approximately consistent, not global. Confirm in staging that 5 creations per minute and 120 upgrades per minute behave, and decide on m1 before launch.
- **D3. Jurisdiction.** Create a room and a leaderboard entry on staging and confirm in the dashboard that both objects live under the EU jurisdiction, and that no dashboard variable overrides `DO_JURISDICTION` (it must not be `local`).
- **D4. Origins.** After the publish workflow ran, `ALLOWED_ORIGINS` must hold exactly the page's `https://` origin. Check a creation and an upgrade with a foreign `Origin` (both 403) and with the real one (works).
- **D5. Headers as served.** On the live page exactly one `Strict-Transport-Security`, one `Content-Security-Policy` that matches the built file, no `/cdn-cgi/` or other injection by a proxy (email obfuscation, rocket loader, web analytics), and `/.ftp-deploy-sync-state.json` not served. The workflow warns about some of these; read its output on the first run.
- **D6. Caching.** `POST /api/room` and the WebSocket path must never be cached; only the leaderboard is cacheable (60 s).
- **D7. Logging at the platform.** No Logpush or request-header logging that would capture `Sec-WebSocket-Protocol` (it carries the seat token) or addresses; Workers Logs stays off.
- **D8. GitHub settings (the repository is public).** Required reviewers on the `production` environment; secret scanning and push protection on; branch protection on `main`; the Cloudflare API token scoped to this Worker only; the FTP account restricted to the game's own folder; confirm the pinned action SHAs against the official releases.
- **D9. Policy in the deploy folder.** After the first FTP publish, confirm the host really applies `web.config` (or `.htaccess`) rather than ignoring it; fetch the headers from outside.
