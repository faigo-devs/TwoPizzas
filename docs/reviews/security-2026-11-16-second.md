# Second security review of the LGTM / Two Pizzas room server

I changed no source file. Scratch is under `.qa/security/` (git-ignored). I ran a local `wrangler dev` (port 8787, `ALLOWED_ORIGINS` for 127.0.0.1:4394) and shut it down: no `workerd` process is left and port 8787 is closed. I opened one browser session (`sec2`) and one static server (port 4394, scratch `serve2.mjs`), and closed both. I did not touch ports 4407 or 4321 or any `t-*` session. I contacted no live service.

Tests: root 203/203 and `worker/` 76/76 pass.

## Score: 7/10 (first review: 5/10)

The seed, the room-code lockout, the write amplification, the CSP and the workflow secrets are all properly fixed. One new defect in the heartbeat and sweep code (a self-triggering alarm loop) is serious and cheap to cause, so it keeps the score from going higher. A second new issue (idle-socket cap) lets one address lock players out of a room.

## New findings

### HIGH-N1: alarm loop when a swept or timed-out socket's peer does not finish closing
- **Where:** `worker/src/room.ts`, `socketTimes()` (~L331-342), `sweepSockets()` (~L344-366), `schedule()` (~L407-413), `nextAlarm()` (~L30-40).
- **Cause:** `sweepSockets` closes a socket and sets its `playerId` to null. In workerd the closed socket stays in `getWebSockets()` until the peer completes the close handshake. `socketTimes()` then counts it as an unjoined socket with `acceptedAt + 10 s`, which is already in the past. `nextAlarm()` returns a past time, `setAlarm` fires immediately, the sweep runs again, and the cycle repeats.
- **Scenario:** an attacker opens a WebSocket to a live room code (the upgrade needs no valid code, only 60 per minute per address) and stops reading. Nothing needs a seat. An honest player on a half-open mobile connection triggers the same path after the 90 s silence sweep.
- **Verified on local workerd (not on Cloudflare's edge):** three raw TCP clients completed the upgrade and then never read. The log showed `sockets_swept {idle:3}` about 32 times per second, for as long as I watched (about 3 minutes, more than 5,500 sweeps), until I killed the client; then it stopped. Each loop iteration is a Durable Object alarm invocation plus an alarm write. Whether the production edge reaps such a socket sooner is untested; I could not check it.
- **Why the harness missed it:** `FakeSocket` sockets disappear from `sockets()` the moment `close()` is called.
- **Fix:**
  - Mark a swept or timed-out socket as closing (a flag in its attachment) and skip it in `socketTimes()`.
  - Also skip sockets whose `readyState` is not OPEN.
  - Floor every alarm at `now + 1 s`.
  - Add a harness test where a closed socket stays listed in `sockets()`.

### MEDIUM-N2: eight idle sockets from one address keep real players, and returning players, out of a room
- **Where:** `room.ts` `accepted()` (~L109-125), `config.room.unjoinedSocketsMax = 8`, `helloTimeoutMs = 10 s`.
- **Cause:** a socket that has not sent `hello` counts as unjoined, and a ninth is refused with `room_full`. A returning player also arrives as an unjoined socket.
- **Scenario:** an attacker needs only the room code and one address. Holding 8 sockets for 10 s each costs about 48 upgrades per minute, which is below the 60 per minute limit. Every join and every reconnect during that time gets `room_full`. A player who drops for a moment cannot get back in, loses the seat after 60 s (lobby) or has their items released (game).
- **Verified on workerd:** one address held 8 idle sockets with a lazy refill, and 23 of 29 real join attempts (79%) were refused. A tuned attacker would approach 100%. (The legitimate client used different addresses via `cf-connecting-ip`.)
- **Cost note:** each of those sockets still costs a Durable Object wake and an alarm.
- **Fix:**
  - When the unjoined cap is reached, close the oldest unjoined socket and accept the newcomer instead of refusing it.
  - Optionally cut `helloTimeoutMs` to 3-5 s.

### LOW-N3: the publish jobs run code that came from the build job's artifact while holding secrets
- **Where:** `.github/workflows/publish-server.yml`, `publish` job: it downloads `out/`, runs `npm ci --ignore-scripts` in `out/tool` (the lock file came from the artifact), then runs `../tool/node_modules/.bin/wrangler` with `CLOUDFLARE_API_TOKEN`.
- **Scenario:** a compromised build (for example an install script in `npm ci` of the build job) can replace `out/tool/package-lock.json` with one that installs a malicious `wrangler`. It runs in the job that holds the token. It can also change `out/bundle` to deploy different Worker code.
- **What is good:** the build job holds no secrets, `persist-credentials: false`, actions pinned by SHA, no `${{ }}` in `run:` bodies, the remote directory goes through `GITHUB_OUTPUT` with a newline check, fork pull requests get no secrets. For the page workflow only `dist/` data crosses the boundary, so the same attack there can deface but not steal.
- **Fix:** in the `publish` job, run `actions/checkout` and install the tool from the repository's own lock file, not from the artifact. Treat the bundle as data.
- **Unchecked:** I could not confirm the `upload-artifact` and `download-artifact` SHAs against their tags (I made no network contact). Environment branch rules are still not visible to me.

### LOW-N4: kick has no memory, and host promotion follows the new sweep
- A kicked player can rejoin at once as a new player (a new socket, no token needed), so the host cannot lock or ban. Verified: the kicked player reconnected with the old token and got `not_allowed`, then rejoined as new and was welcomed.
- A host whose phone is silent for 90 s (sweep) plus the 60 s grace is dropped from the lobby, and the next seat becomes host and can kick people. The sweep makes this easier than before.
- Fix (optional): a host-only "lock lobby" action; a longer grace for the host.

### INFO
- `SOCKET_LIMIT` counts reconnects and sweep-induced reconnects, per address. A classroom behind one NAT address could hit 60 per minute during a mass reload; the client then sees an error.
- Local `wrangler dev` output prints request lines with room codes. App logs are clean. Platform logs and `wrangler tail` would still show URLs; observability is set off in `wrangler.toml`.
- `sanitize` removes the zero-width joiner, so family emoji split into parts, and it can leave a double space. Cosmetic.
- The leaderboard cache can show a result up to about 2 minutes late (60 s in memory plus 60 s at the edge). Acceptable.

## Status of my first findings

| First finding | Status | Evidence |
|---|---|---|
| HIGH-1 recoverable seed | **Fixed** | See below |
| MEDIUM-1 one person plays all seats | **Open, accepted by the owner** | Copy advice below |
| MEDIUM-2 room code only, no throttling, idle sockets, no kick | **Mostly fixed**; one regression (MEDIUM-N2) | Upgrade limit works (60 upgraded, 10 got 429 in my test). Hello timeout 4003 and kick verified. |
| MEDIUM-3 cost, uncached leaderboard | **Fixed** (new risk: HIGH-N1) | Below |
| LOW-1 size partly visible | **Fixed** | `workersNeeded` is null for backlog and todo; `blocked` and `waitingForPair` need a started item |
| LOW-2 holder can join as worker | **Open, accepted as intended play** | - |
| LOW-3 duplicate tab loop | **Fixed** | Client treats 4000 as "elsewhere" and stops; 4001 clears the seat |
| LOW-4 robustness | **Fixed**, except tokens in plain text (decision) | Below |
| LOW-5 CSP | **Fixed** | Below |
| LOW-6 privacy text | **Fixed**, with two small notes | Below |
| Workflow points | **Mostly fixed** (LOW-N3 remains) | Above |

### HIGH-1 verified fixed
- `RoomState.secret` is 32 random bytes in hex (`worker/src/room.ts:~91`). Every draw is SHA-256 of `secret|rng|label|counter` (`core/rng.ts`); item keys are `deriveKey(secret, 'item:N')`; puzzles use `createRng(itemKey, 'puzzle')`.
- Labels cannot collide: the tags `|key|` and `|rng|` differ and the counter is numeric. Names use `String(nameSeed)` as their own secret and nothing else uses `nameSeed` (grep of `core/`, `app/`, `worker/src/`).
- **Attack re-run:** names still give back the 32-bit name seed (3 names, 1 candidate in the window searched). A room rebuilt from that name seed, or from guesses such as the decimal and hex name seed, the empty string or the room code, reproduced 0 of 10 answers and sizes. The player views contain neither the secret nor the name seed.
- **SHA-256:** my own check (`sha-check.mjs`) against Node's `crypto` found 0 mismatches in 1,210 cases: every length 0-400 three times with random bytes, lengths up to 1 MB, and the two standard vectors.
- **Fuzzing:** 4 runs of 60,000 random actions (3 Scrum, 1 Kanban) with `lobby.kick` added (`fuzz-second.mjs`). Every view passed the repo's `assertNoLeak` (which now also checks `secret` and `nameSeed`). There were no stale work views and no violations. The runs reached the summary phase, with state at or below 14 KB.
- **Local mode:** `app/game/local/room.ts` draws its secret with `crypto.getRandomValues` and shares only `core`, not any server path.

### MEDIUM-3 and LOW-4 verified fixed
- **Write amplification:**
  - 2,000 refused messages cost 15 microseconds each and no storage writes.
  - I ran 12,000 random actions (6,000 each of Scrum and Kanban) through the harness, with about 600 simulated evictions and alarm firing, comparing memory to storage after every message and after every eviction. There were 0 divergences, so the fingerprint ignoring `now` loses nothing. Puts and alarm writes stayed near 70 and 100 per 6,000 actions.
  - Tokens are cleaned and persisted together with the state in one multi-key put.
- **Heartbeat on workerd (`live4.mjs`):** a silent seat was closed with 4002 after 89 s and shown as disconnected to the others. A seat that sent only `ping` for 100 s stayed open, so the auto-response counts as life without waking the room. The swept player reconnected with the token and got the seat back. One player's silence did not sweep another's seat. The cost is one wake per room roughly every 60-90 s while sockets are joined. This is acceptable, apart from HIGH-N1.
- **Kick on workerd (`live1.mjs`):** a non-host kicking the host, the host kicking itself and an unknown id all got `not_allowed`. The host kicked a player, who received `removed` and close code 4001, and the player list updated. The facilitator was recomputed, and the old token was refused. The host cannot be removed or locked out.
- **Leaderboard cache:** the query string is ignored, so `?x=...` makes no new key. The key host comes from the routed host only. The cached body comes from the Durable Object, never from request data, and the edge read is guarded with try/catch. I could not exercise the real Cache API.
- **Other caps:** the message length is checked before reading (`wire.ts`, `readCapped` in `http.ts`). Origins are closed by default (empty `ALLOWED_ORIGINS`: all three POST origin tests returned 403).

### LOW-5 verified fixed (page policy)
- `dist/` was freshly built (the built policy lists 3 script hashes and 1 style hash, no `'unsafe-inline'`, and has `script-src-attr 'none'; style-src-attr 'none'`). `node scripts/check-dist.mjs` passes.
- I served `dist/` with exactly the policy from `dist/web.config` and drove the real app in Chromium to the Kanban replenishment board. There were 0 console errors and no policy violations. I did not test remote mode through a proxy, nor other browsers.

### LOW-6 privacy text re-checked against the code
- p1, p2 and p4 are true, including the local storage for language and theme and the tab-only seat. Nothing else uses `localStorage`, `sessionStorage` or cookies.
- p3 is true; the list also stores a random internal publish id (not personal), so "nothing else" is very slightly generous.
- The "no cookie" claim holds for the app; the host or Cloudflare zone settings could add one, and I cannot see them.
- p2 holds, with the nuance that "gone" now means a silent or closed socket, 90 s after its last sign of life.

## Leaderboard copy (MEDIUM-1 stays a decision)
The current text says nothing that is false, but it suggests a ranking of teams. Suggested additions:
- `leaderboard.note`: "Results are published by the teams themselves and are not checked. There are no accounts, so one person can fill every seat; read the list as a bit of fun, not as a ranking of skill." (Romanian version to match.)
- `summary.publishHint`: add "The result is not verified." after "Nothing else."

## What I could not check
- Cloudflare's production edge: whether an unresponsive client's socket is dropped sooner than on local workerd (HIGH-N1), the real rate-limit and Cache API behaviour, and billing figures.
- GitHub environment protection and the artifact action SHAs.
- Browsers other than Chromium, and remote mode behind the final host headers.
- Whether the zone adds a cookie.

## What would raise the score
1. Fix HIGH-N1: skip closed or closing sockets when computing alarms, floor alarms at one second ahead, and add a harness test where a closed socket stays listed. This alone moves the score to about 8.
2. Fix MEDIUM-N2 by evicting the oldest unjoined socket instead of refusing newcomers.
3. Install the deploy tool in the `publish` job from the repository's own lock, and add the "not verified" sentence to the leaderboard and publish copy. After these, about 9/10.
