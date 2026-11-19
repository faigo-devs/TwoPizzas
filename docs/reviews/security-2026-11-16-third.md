# Third security review of the LGTM / Two Pizzas room server

I changed no source file. Scratch is under `.qa/security/` (git-ignored). I ran a local `wrangler dev` on port 8787 and shut it down. My `workerd` processes are gone and port 8787 is closed. Two other `workerd` processes remain; they belong to another engineer's `wrangler dev` on port 8797, which I did not touch. I opened no browser session and did not touch ports 4407 or 4321. I contacted no live service.

Tests: root 206/206 and `worker/` 84/84 pass.

## Score: 8/10 (first review 5, second review 7)

All findings of my second report are fixed or closed, and I could not make the room loop, lock out players or accumulate cost on local workerd. The 9 is held back by three things that I could not close, listed at the end. Two of them concern the real Cloudflare edge, which I cannot reach; the third is a small, certain workflow gap.

## Status of my second-report findings

### HIGH-N1: alarm loop on a closed socket that never completes the handshake: FIXED, reproduced and checked
- **Code:** `room.ts` now has one `closeSocket()` that sets `closing: true` in the attachment (and clears `playerId`). `live()` (attachment present, not closing, `isOpen()` = `readyState === 1`, `index.ts:50`) is used by capacity, `socketTimes()`, the sweep, `broadcast`, `releaseOthers`, `evict` and `load()`. `schedule()` arms at `max(target, now + 1000)`.
- **Reproduction (`live6.mjs`, local workerd, 399 s):**
  - Five rooms.
  - Room 1: 3 raw clients that complete the upgrade and never read or answer a close.
  - Room 2: 2 clients that send `hello`, receive the welcome, then stall.
  - Room 3: a healthy host who kicks a joined client that then stalls.
  - Room 4: 14 stalled unjoined sockets, which triggers 6 evictions.
  - Room 5: a healthy player pinging every 30 s.
- **Alarm count:** I counted alarm invocations, not log lines. I cleared the local trace store and counted `alarm` spans through the explorer endpoint. In 399 s there were 20 alarm invocations in total, in 15-second buckets of 0 to 4. This included the legitimate sweeps at about 5 s and 90 s and the heartbeat wake. Before the fix, one stalled room made about 32 per second. `sockets_swept` showed 9 lines in total.
- **Past-due times that never clear:** I looked for one.
  - A swept or evicted socket is out of every calculation for good (`closing` is never reset, and a socket that is not `isOpen()` is ignored). It cannot bring the alarm back.
  - The other sources of a past time clear themselves: `nextDeadline` only returns future times; `emptySince + 5 min` and `createdAt + 2 h` lead to `destroy`; a failed publish re-arms at `now + 10 s`.
  - So no input leaves a past-due time that spins at 1 Hz. The 1-second floor also cannot starve a deadline, because every action first runs `server.deadline` at its own time.
- **Destroy with stalled peers:** the empty rooms (room 1 and room 4) were destroyed at about 5 minutes (log shows 7 `room_destroyed reason=empty` over my two runs). `destroy()` closes every listed socket and calls `deleteAll`; the stalled peers never answer.
- **Side effect (minor):** the floor can delay a context-switch reveal or a timebox event by up to 1 s when no action arrives in between.

### MEDIUM-N2: idle sockets lock real players out: FIXED, and the engineers' reasoning is right
- **My earlier number was wrong.** In `live2.mjs`, the real joiners I opened (not token reconnects) took the six seats (I closed their sockets but the seats are held for 60 s), so `room_full` after the sixth success was a seat refusal, not a socket refusal. My "79%" mixed the two. The first three refusals (before any seat existed) were genuine socket-cap refusals, so the finding was real but overstated.
- **Now (`live7.mjs`, workerd):** with one attacker holding 8 stalled unjoined sockets and refilling them, 30 of 30 token reconnects by a seated player were welcomed and 5 of 5 new joins were welcomed. At the cap the oldest unjoined socket is closed with 4003 `evicted`, and the hello timeout is 5 s.
- **Eviction abuse:** I tried to evict a legitimate socket that is between connecting and sending `hello`.
  - Constant bursts of 9 stalled sockets (about one burst per 30-50 ms from random addresses) evicted 4 of 80 legitimate token reconnects (5%) before their `hello` arrived (`live9.mjs`).
  - The real client (`remote.ts`) sends `hello` in `onopen`, so the window is one round trip (a few ms locally; 50-200 ms for a real player). On a 4003 close it falls through to `schedule()`, which retries with back-off. A seated player (`welcomed`) retries without limit; a new joiner gives up after 3 attempts. So an attack needs about 300 upgrades per second from many addresses and still only delays people.
  - Result: LOW, no action needed.
- **A new fact from this work:** zombie sockets (see the end) do not count against the caps once flagged. I tested 600 stalled sockets in one room: the median action latency stayed at 15-16 ms from 0 to 600 zombies, and there was no loop.

### LOW-N3: publish job ran code from the artifact: FIXED for the tool; one residue
- **Fixed:** `publish-server.yml` now checks out the repository and installs the deploy tool from `worker/package-lock.json` into `$RUNNER_TEMP/tool` with `npm ci --ignore-scripts`. The artifact carries only `out/bundle` (the `index.js` and a `wrangler.toml`).
- **Residue (LOW):** `out/bundle/wrangler.toml` is built by the build job (`sed` over `wrangler.toml`) and is passed to `wrangler deploy --no-bundle` in the job that holds `CLOUDFLARE_API_TOKEN`. A compromised build can therefore change what is deployed through the config: routes, vars, migrations (for example `deleted_classes`), and possibly `[build] command`, which wrangler may run on deploy. I did not test whether `--no-bundle` skips a custom build command. The `index.js` is deployed code by design, so a compromised build can always change the Worker; the point is about the credential and the Durable Object data.
- **Fix:** in the `publish` job, take `wrangler.toml` from the checkout (apply the same `sed` there) and take only `index.js` from the artifact.
- **What crosses the boundary and can execute:** only `index.js` (deployed as the Worker, not run in the job) and `wrangler.toml` (read by wrangler, above). The page workflow passes only `dist/` as data to the FTP action. All actions are pinned by SHA. I could not check the artifact action SHAs against their tags (no network).

### LOW-N4: host lock: FIXED; abuse checked on workerd (`live8.mjs`)
- A non-host `lobby.lock` got `not_allowed`; the host's lock showed `locked: true` and `unlock_room` only in the host's controls. A new join while locked got `room_locked` and was closed. A seated player reconnecting with a token while locked was welcomed. A non-host unlock got `not_allowed`.
- **Host leaves (60 s grace):** the next seat became host with `locked` still true and `unlock_room` in its controls; it unlocked, and a new join then succeeded. The lock cannot trap a room: an empty room dies at 5 minutes; a host swept or replaced hands the role on.
- **Kick** is still a removal, not a ban; a locked room is the host's answer.
- Client codes include `room_locked` (`remote.ts`, `controller.ts`).

### SOCKET_LIMIT 120 per minute per address: accepted
Verified in `wrangler.toml` (`limit = 120`). With the eviction and the 5 s hello timeout, one address can still hold the 8 slots, but that no longer blocks anyone. The previous test of the limit (429 at the limit) stands.

### Copy: claims only what is true
- `leaderboard.note` (en): "A team appears only when it chooses to publish, under a generated team name and with no personal data. Results are published by the teams themselves and are not checked. There are no accounts, so one person can fill every seat. Read the list as a bit of fun, not as a ranking of skill."
- `summary.publishHint` (en): "... Nothing else. The result is not verified. It can be done once."
- The Romanian versions say the same. All sentences are true (the code publishes what the team sends after a server-side computation, accepts unverified results and has no account). The note appears under the public list and under the publish panel (`LeaderboardPanel.tsx:65,98`). The only residue is the earlier remark that the list also stores a random internal publish id (not personal); the hint's "Nothing else" is fine for a reader.

### `sanitize` collapses double spaces: FIXED
`"a ​ b"`, `"a    b"`, `"aㅤ ㅤb"` and `" a  \t b "` all give `"a b"`.

## Other things I re-verified
- SHA-256, the 256-bit secret and the kick still hold from the second report; tests are green.
- I did not re-run the fuzz of the reducer, since `core` changed only by `lobby.lock`, which my live test covers.
- Local mode and privacy text: unchanged since the second review.

## New findings
1. **LOW: the artifact's `wrangler.toml`** (see LOW-N3 residue above).
2. **LOW (unverified in production): flagged-closing sockets are free.** A socket the room has closed but the peer has not acknowledged stays in `getWebSockets()`. It no longer counts against any cap, and `onMessage` returns early for it before the rate limit. In my test, 600 such sockets cost nothing measurable (flat latency, no alarms). But the room never forgets them until it is destroyed (at most 2 hours), so an attacker is bounded only by the upgrade limit (120 per minute per address) and by whatever the real edge does to a peer that never answers a close. Messages sent on such a socket still wake the room (I could not see this in logs; billed as a request). Cloudflare may reap them quickly; I could not test it.
3. **INFO:** the one-second alarm floor delays a context-switch reveal or a timebox end by at most 1 s when the room is quiet.

## What stands between 8 and 9
1. **Close the workflow gap:** take `wrangler.toml` from the checkout in the `publish` job. This is a small, certain change.
2. **Prove the socket handling on the real edge.** My reproduction is local workerd only. A staging deployment with the same stalled-client test, counting alarm invocations over 5 minutes, would settle whether stalled peers are reaped and whether the 600-zombie case behaves the same. If they are not reaped, add a hard cap on listed sockets (for example, refuse new sockets above about 50 total, including closing ones) and drop messages from closing sockets before waking the logic.
3. **Residual by decision:** the five-letter room code and plain-text tokens stay by the owner's choice, and the single-person leaderboard is covered by honest copy. If the code were longer than five letters, or tokens were stored hashed, I would move to 9; as they stand, 9 is still reachable once items 1 and 2 are done.

## What I could not check
- Cloudflare's production edge: stalled-peer reaping, the rate-limit service, the Cache API, billing.
- Whether wrangler runs `[build] command` under `--no-bundle`.
- GitHub environment protection, and the artifact action SHAs against their tags.
- Browsers: this round I opened none.
