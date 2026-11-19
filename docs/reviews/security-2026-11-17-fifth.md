# Fifth security review of the LGTM / Two Pizzas room server

I changed no source file. Scratch is under `.qa/security/` (git-ignored). I ran a local `wrangler dev` on port 8787 and shut it down; port 8787 is closed. Two `workerd` processes remain, which belong to the other engineer's room server on port 8797 (I did not touch them or the `c-*` sessions or port 4406). I opened no browser session. I contacted no live service.

Tests: root 226/226 and `worker/` 96/96 pass (the root count rose from 223 while I was working, from other work).

## Scores

- **The code as it stands: 8/10** (fourth review: 6).
- **Once the staging test passes: 9/10.**
- **What in the code still stands between the current state and 9: one setting, the memory backstop.** `socketsBackstopMax = 2000` is too high (see MEDIUM-F1 below). Lower it to about 256 and 9 follows once staging passes. Everything else I found is minor.

## Status of the fourth report's findings

### HIGH-F1 (the 64-socket cap locked rooms): FIXED, verified on workerd
- The rule is now: a seat proven in the handshake skips every cap; strangers are counted against live sockets only (joined 12, unjoined 8 with eviction of the oldest live unjoined socket); sockets flagged closing are never counted; the only limit on listed sockets is the backstop for strangers.
- **Reproduction (`staging-check.mjs`, local workerd, new version):** 66 stalled sockets in a room with a seated player, then 20 returning-player reconnects two seconds apart: 0 failed, slowest welcome 30 ms. A stranger could still join below the backstop. After 5 stalled sockets for 300 s the room still answered (welcome after 21 ms). Result: ALL AUTOMATIC CHECKS PASSED, 379 s.
- **Past the backstop (`h10.mjs`):** with 1,999 stalled sockets accepted in one room and the rest refused, a returning player was welcomed in 57 ms, and a stranger got HTTP 503. An attacker who knows the code can therefore no longer keep a seated player out at any cap. A stranger (a new joiner) can be kept out once 2,000 sockets are listed, which costs one address about 17 minutes of its 120-per-minute allowance (about 2 minutes with nine addresses). This only matters in the lobby, since after the start no stranger can join anyway.

### Staging script and the second recommendation: DONE (see the end)

## Answers to the seven things to look at

### 1. Where can the token in the header end up? Is the header parsed safely?
- **Server code:** the only reads of the header are `request.headers.get('sec-websocket-protocol')` in the Room's `fetch` (`index.ts:81`) and `parseProtocols` (`core/wire.ts`). No `console` call prints a header or a request. Logs are event names and counts only (`upgrade_refused {listed}`). I found no error path that prints it.
- **Parser robustness (`proto.mjs`):** no header, empty, one entry, a seat entry, two seat entries (the first one wins), a seat entry with extra dots, non-ASCII, duplicates, a 5,000-character id, 20,000 entries, CR/LF, a missing game name and a wrong-case game name. None threw; the worst case (20,000 entries) took 2.3 ms. Entries are matched by a strict regex (`seat.<up to 64 base64url>.<up to 128 base64url>`), so no character outside that set is ever used. The parser itself has no length cap, but the platform caps the header size, and the work is linear. The seat entry itself is at most 199 characters.
- **The response never echoes attacker text:** it carries a fixed `lgtm.v1` or no header at all. On the wire (raw upgrade requests, `h1.mjs`): no header gives a plain 101 without a selection; `foo` or a seat entry without the game name give 400; a wrong token, an unknown id, a right token, two seats and a 2,500-entry header all give 101 with `lgtm.v1` and no token anywhere in the response; the response from a right token contained no token.
- **Where the header could still be seen** (reasoning; I cannot test any of this):
  - Cloudflare's edge sees it, as it sees every header of a Worker route. The page's own host (the IIS/Apache host) does not see it, because `/api/room*` is routed to the Worker at the edge and the upgrade never goes to the origin.
  - **Platform logging:** `wrangler.toml` turns observability and invocation logs off. But `wrangler tail` shows live request headers of the Worker, so anyone running `wrangler tail` on production during a game can read tokens. Do not leave a tail running against production, and check that no Logpush job for Workers trace events or HTTP request logs is configured that includes request headers. Local `wrangler dev` output prints only the request line (I checked the log: no token, no hash).
  - The browser: the value is visible in the developer tools' network panel and to extensions that can read request headers. It was already visible in `sessionStorage` and in the `hello` frame, so this is the same trust class. Headers are logged by more kinds of intermediary than WebSocket frames are (for example a TLS-inspecting corporate proxy), so this is a marginal widening. A leaked token is valid only for the room's life (at most 2 hours) and gives one seat.

### 2. Timing and enumeration
- **Timing (`h2.mjs`, 100 samples each, twice):** upgrade latency for a known id with a wrong token: median 11.8 ms and 11.1 ms; for an unknown id: 11.2 ms and 12.3 ms, with overlapping quartiles. No measurable difference. In the code the unknown-id path does one extra SHA-256 (the dummy comparison hashes the id), which is microseconds and invisible over a network. Player ids are random and visible to everyone in the room anyway.
- **Any other difference:** a wrong token and an unknown id give an identical 101 and then silence, the same as a stranger who has not sent `hello` yet. The only observable difference is the correct one: a proven seat gets a `welcome` frame at once. A wrong seat entry does not close the socket and sends no error.
- **Brute force:** 192-bit tokens make guessing infeasible at any rate. A failed seat entry costs the attacker one upgrade (120 per minute per address, the same limit as `hello`) and ties up an unjoined slot for 5 s. No per-room throttle is needed.

### 3. Exemption abuse
- **Opening many sockets with one valid seat (`h3`-`h11`):** each new socket flags the earlier ones as closing, so they are free (not counted). The cost to the room is one wake, a welcome and a view per upgrade, bounded by the 120 per minute limit; there is no storage write (the player is already connected, so the state does not change) and no alarm storm.
- **One effect that is new and harmless for real clients:** an earlier handshake-bound socket that has sent nothing is flagged at once but its close frame (4000) arrives only about 10 s later in my test (`h11.mjs`), not immediately. A socket that, like the real client, sends `hello` right after opening is closed 109 ms after its replacement. The room ignores flagged sockets from the moment they are flagged (no views, no messages), so the delay only affects an idle stale tab seeing "open somewhere else" a few seconds later.
- **A malicious seated player filling the backstop:** possible (stalled replaced sockets stay listed), at the same cost as a stranger (17 minutes of one address's allowance); it only blocks strangers, and that player is already in the room.
- **Kicked seat (`h2.mjs`):** the entry is a silent stranger; a following `hello` gets `not_allowed` and the socket is closed. A seat dropped after the 60 s lobby grace behaves the same way, since its token hash is removed with it (by code reading; same path as the kick).
- **The seat entry of one room presented to another room:** a silent stranger (no welcome).
- **A seat whose player was removed while sockets are open** is handled by the unchanged `evict` path.

### 4. Bound sockets, the no-op `hello`, sweep, eviction
- A `hello` naming the same id on a socket bound by the handshake is a silent no-op; a different id gets `bad_request` and the socket stays open (verified live). The real client sends `hello` after every open, so this path is normal.
- A socket bound by the handshake that never sends anything is not subject to the 5 s hello timeout (it is a seated player). The heartbeat sweeps it: the silent one closed with 4002 after 101 s in my test (`h2.mjs`). This is the right behaviour.
- Returning players no longer sit in the unjoined set, so the eviction of the oldest unjoined socket can no longer hit them (I earlier measured 5% of in-flight hellos evicted under a burst; that case is gone). A stranger's own in-flight `hello` can still be evicted by a burst of 8 or more new sockets, as before (a LOW, with retry).

### 5. The backstop at 2,000
- **What one address does:** at 120 upgrades a minute it needs about 17 minutes to reach 2,000 listed sockets; then strangers get 503 for the room's life while seated players are unaffected. A destroyed room's zombies remain listed, so a stranger gets 503 instead of `room_not_found` for a while (harmless).
- **Are 2,000 closing sockets free? Latency yes, memory no.** On local workerd (`h10.mjs`): action latency stayed 15.8-15.9 ms up to 1,200 sockets, 30 ms at 1,600 and 20 ms at 2,000. But the memory of the `workerd` process rose from 280 MB to 1,243 MB with the 1,999 sockets, about 0.5 MB per stalled socket (the figure includes dev-server overhead and may be smaller in production). A Durable Object in production is limited to 128 MB. If even a fifth of the local cost applies, 2,000 stalled sockets could exhaust the object's memory and reset it, which would drop every player's connection. See MEDIUM-F1.

### 6. Browser reality (from the specifications; I could not run Firefox or Safari)
- RFC 6455 section 4: the server must select at most one of the offered subprotocols, and a client must fail the connection if the response names a subprotocol it did not offer. WHATWG's WebSockets standard and Chrome, Firefox and Safari all follow that. Chrome and Firefox also fail a connection where protocols were offered and none is selected, so a server that omits the header when a list was offered would break. This server always answers `lgtm.v1` when any list was offered, and sends no header when none was, so it satisfies both.
- Every offered value must be an HTTP token. Base64url characters and the dots in `seat.<id>.<token>` are all token characters, so `new WebSocket` accepts them in every browser (the constructor throws `SyntaxError` on an invalid token or a duplicate value; the client sends distinct values).
- `socket.protocol` on the page returns only the selected value (`lgtm.v1`), never the seat entry.
- The seat entry appears in developer tools, in `chrome://net-export` and similar logs, and to extensions that can read request headers. These behave the same in Firefox and Safari. The worst-case difference is that older mobile Safari versions have been stricter about subprotocol syntax, but the values here are plain.
- I expect Firefox and Safari to behave the same from the specifications; a manual check of one reconnect in each is cheap and worth doing once.

### 7. Earlier rounds that this change touched
- **Tokens as hashes and sent once:** unchanged; `seatProven` only hashes, nothing stores or logs the token, and a reconnect's welcome has no token. The first welcome still carries one (verified). I did not repeat the storage dump; the new path writes nothing token-related.
- **Close codes:** 4000 (replace, with the timing note above), 4001 (kick), 4002 (sweep, seen), 4003 (hello timeout and eviction) all still occur. **Alarm floor and closing flag:** unchanged; in the local staging run the alarm behaviour was quiet (no loop with 66 and 5 stalled sockets over 300 s; I did not count alarm spans this round, so the owner's alarm count in staging remains the measure). **Lock and kick:** a kick closes the seat's sockets; the kicked seat is then a stranger (verified). The lock was not retested through the handshake; `returning()` does not check it, which is right (a seated player may return to a locked room).

## New findings by severity

1. **MEDIUM-F1 (memory): the backstop of 2,000 is too high.** Local workerd used about 0.5 MB per stalled socket (about 1 GB for 2,000), against a production limit of 128 MB per Durable Object. The effect, if production behaves even partly like this, is a reset of the room and loss of every connection, triggered by one address in 17 minutes. Fix: now that seated players are exempt, strangers need only a small allowance. Set `socketsBackstopMax` to about 256 (12 joined, 8 unjoined and a few hundred transient closing sockets). The staging test below measures the real memory use.
2. **LOW: `wrangler tail` and Logpush can show seat tokens.** Do not tail production during games, and keep header logging off (see answer 1). The token lives only as long as the room.
3. **LOW: a stranger's own in-flight `hello` can be evicted by a burst of new sockets** (retried by the client; seated players are no longer affected).
4. **INFO: the close frame to a replaced idle handshake socket can be delayed by about 10 s** (answer 3). **INFO: `SOCKET_LIMIT` still applies to seated players behind one busy address** (the engineers' own note; the client retries). **INFO: a destroyed room's stalled sockets make strangers see 503 instead of `room_not_found`.**

## The updated staging test for the owner

I rewrote `.qa/security/staging-check.mjs` (now `scripts/staging-check.mjs`) for the new handshake. It takes the base address as its only argument.

- **Run:** from the repository root, `node .qa/security/staging-check.mjs https://<staging host>`. Needs Node 22 and the `ws` package already under `worker/node_modules`. The staging `ALLOWED_ORIGINS` must contain the base address (the publish workflow derives it from `SITE_HOSTS`). Run it from an address not shared with other staging tests: it uses about 270 upgrades from one address. It takes about 6.5 minutes and exits 0 only if every automatic check passes.
- **Automatic checks and their pass criteria:**
  1. Leaderboard returns 200 with `cache-control: public, max-age=60`.
  2. The handshake selects `lgtm.v1` and nothing else; the first welcome carries a token.
  3. A seat in the handshake gets a `welcome` first, with no token and no `hello`, selecting `lgtm.v1`.
  4. A wrong token is a silent stranger: no welcome, no error, no close.
  5. Raw requests: no protocol header gives a plain 101 without a selection; a header without the game name gives 400; a valid seat entry gets only `lgtm.v1` back, never the token.
  6. **Phase A:** 66 stalled sockets (never read, never answer a close) in a room with a pinging seated player, then 20 returning-player reconnects two seconds apart. **Pass: none fails and the slowest welcome is 2,000 ms or less.** A stranger can still join (or is refused for a rule such as lock or room full).
  7. **Phase B:** 5 stalled sockets held for 300 s. **Pass: the seated player gets in afterwards.**
  8. **Phase C:** 130 upgrades to a code that does not exist. **Pass: the first 429 comes between upgrade 60 and 125** (limit 120 per minute, approximate).
  9. **Phase D:** 100 leaderboard reads return one identical body.
- **What the owner counts from the Cloudflare side** (the script prints phase B's start and end times):
  - Alarm invocations of that room during the 5 minutes of phase B. **Pass: 10 or fewer.** (Temporarily switch on invocation logs for staging and use `wrangler tail --format json`, or read the Durable Object invocation metrics.)
  - Requests to the `Leaderboard` object during phase D. **Pass: 5 or fewer.**
  - **New: Durable Object memory and resets.** Before phase A and after it, and again after a separate run that fills the room with 300 stalled strangers (run phase A with 300 instead of 66, which needs three minutes of the per-address allowance), read the room object's memory use and any "exceeded memory" resets. **Pass: no reset, and growth in memory per stalled socket below 0.25 MB** (which keeps 256 sockets under about 64 MB). This is what decides the backstop value.
- **Local run of the new script (workerd):** ALL AUTOMATIC CHECKS PASSED in 379 s; every line above passed (the 20 reconnects: 0 failed, slowest 30 ms; the 429 came at upgrade 120).

## What I could not check
- The production edge: stalled-peer reaping, the rate-limit service, the Cache API, Durable Object memory limits and billing.
- Firefox and Safari (I answered from the specifications), and whether any logging in front of the Worker records the header.
- The two artifact action SHAs against their tags, and GitHub environment protection.
- The lock through the handshake, and the 60 s lobby drop in a live run (covered by code reading and the kick test).
