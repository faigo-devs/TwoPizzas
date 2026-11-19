# Fourth security review of the LGTM / Two Pizzas room server

I changed no source file. Scratch is under `.qa/security/` (git-ignored). I ran a local `wrangler dev` on port 8787 and shut it down; my `workerd` processes are gone and port 8787 is closed. The two `workerd` processes that remain belong to the other engineer (port 8797). I opened no browser session. I contacted no live service.

Tests: root 220/220 and `worker/` 90/90 pass.

## Score for the code as it stands: 6/10 (third review 8)

The hard cap on listed sockets (point 2) lets anyone who knows a room code, from one address and in about half a minute, keep every new connection and every reconnect out of that room for as long as the room lives (at least 4 minutes in my test; up to the 2-hour limit). Before the cap this attack did nothing. The other points are fine.

- **Once the staging test passes:** 8/10 if the production edge drops stalled peers within a few seconds (the cap is then harmless, see the analysis). If the edge behaves like local workerd, the staging test fails and the score stays at 6 until the code changes.
- **What stands between the code and 9:** change the cap rule (below). With that change and a passing staging test: 9/10.

## Point 1: workflow gap: FIXED

I re-read the whole `.github/workflows/publish-server.yml`.
- The build job (no secrets) uploads `out/`, which holds only the files from `wrangler deploy --dry-run --outdir` minus the map and README, and the job checks `index.js` exists. It no longer writes a `wrangler.toml`.
- The publish job (with secrets) checks out the repository, downloads the artifact, and builds a `deploy/` folder: `cp out/bundle/index.js deploy/index.js` is the only artifact file used, and `deploy/wrangler.toml` is made with the `sed` over `worker/wrangler.toml` from the checkout. The deploy tool is installed from the repository's lock with `--ignore-scripts`. Everything else in the artifact is ignored.
- **What still crosses and how it can be read:** one JavaScript module, `index.js`. It is uploaded as the Worker's code and is never executed or parsed as configuration in the job. Configuration (routes, migrations, bindings, any `[build]` command) comes from the repository. A compromised build can still change what the Worker does (inherent in building outside the secret job), but cannot change the deploy, the credential's use or the Durable Object migrations.
- Remaining note: I could not check the two artifact action SHAs against their tags (no network).

## Point 2: hard cap on listed sockets: works as written, but it opens a worse hole

**What I verified on workerd** (`live10.mjs`, `live11.mjs`, `live12.mjs`, `live13.mjs`, `staging-check.mjs`):
- With `socketsListedMax = 64`, 63 stalled sockets were accepted (101) and the rest got a plain HTTP 503 (`{"code":"rate_limited"}`, `retry-after: 5`), with no socket created.
- A healthy second room was unaffected (the reconnect there went straight in).
- A room that holds only zombies was destroyed on schedule (5 minutes after the last player; log: `room_destroyed reason=empty`). The stalled peers never answered the close, and after destruction a further upgrade to that code still got 503 (the zombies are still listed), which is harmless.
- Messages on a closing socket return before any bookkeeping (`room.ts`, right after the attachment check).

**What a legitimate reconnect experiences during the attack: the room is shut. This is the finding.**
- `live13.mjs`, three rooms, 66 stalled sockets each (63 accepted), then a legitimate returning player tries to upgrade:
  - Room A (host sends `ping` every 25 s, probe every 10 s): never got in during 240 s. Blocked for the whole test.
  - Room C (host pings, probe every 2 s): never got in during 240 s.
  - Room B (host silent, so swept at 90 s): got in after 70 s. In my earlier runs the same happened whenever the host was silent. The cause is that the host's own sweep released the zombies; I did not establish exactly why. The point is that with a normal, pinging player the zombies stayed for as long as I watched.
- A second test (`live12.mjs`) with an attacker who keeps replenishing zombies at about 78 upgrades per minute from one address (under the 120 limit): from the moment the cap was reached, all 26 following legitimate reconnect attempts got 503, over 2 minutes.
- **Plain answer to the owner's question:** yes. An attacker who knows a room code can now hold a room's reconnects and joins out for the room's lifetime: one address, about 64 upgrades, under half a minute, no seat needed. Already connected players are unaffected (the connected host kept working), but any player who loses their connection cannot come back, and loses their seat after 60 s in the lobby or has their items released in the game. A new player cannot join.
- **Compared with before the cap:** the same attack did nothing. In the third review I held 600 zombies in one room and the action latency stayed flat (15-16 ms), with no loop and nobody locked out. The cap converts a harmless condition into a lockout.
- **Local workerd only:** the production edge may drop a peer that never answers a close within seconds. The staging test below measures that. If it does, a sustained attack needs more than 64 new zombies within a few seconds' lifetime, which is over the limit of 120 upgrades per minute for one address (for example, if the lifetime is 20 s the attacker needs 192 per minute). The cap is then harmless. If not, the cap is the problem.

**Which rule would be better (my recommendation, in order):**
1. **Exempt returning players from every socket cap by authenticating at the upgrade.** The client already holds its token. Have it send the player id and token in a header the browser can set on a WebSocket (the subprotocol list, `Sec-WebSocket-Protocol`), and let the room check the hash in `fetch` before applying any cap. Then no attacker action can keep a seated player out, whatever the number of zombies. (Not as a URL parameter, which ends up in logs.)
2. **Stop counting closing sockets against the small cap.** Count only live (unclosed, not flagged) sockets against 64, and give flagged-closing sockets a high backstop such as 2,000-4,000 for memory only. My 600-zombie test cost nothing measurable. Any lower limit on a population that persists for the room's lifetime is a lockout tool for a patient attacker (a limit of N zombies costs one address N/120 minutes); 4,000 costs 33 minutes of one address's allowance and does not stop real players if rule 1 is in place.
3. **Per-address limits are the only rule that could replace rule 1,** but the room does not know the address (and the privacy text says it is not kept). Storing a salted hash of the address in the socket attachment for the socket's life would work, with the copy adjusted, and it would not help against many addresses. It would also have to allow several players behind one classroom address.

## Point 3: tokens stored as hashes: FIXED, verified

- **Code:** the room keeps `tokenHashes` (SHA-256 per seat) and compares them with `safeEqual` (`room.ts:~322`). The token is created on the first `hello` and sent once in `welcome`; a reconnect's `welcome` has no token (`remote.ts` keeps its stored token: `message.token ?? seat.token`).
- **Live (`tok.mjs`, workerd):**
  - A reconnect got `{"t":"welcome","playerId":...}` with no token and replaced the old socket (4000).
  - A wrong token and the stored hash presented as the token (`sha256(token)` as the token) were both refused with `not_allowed`.
  - A kicked seat's old token was refused with `not_allowed`; the token hash is removed with the seat on the next commit.
- **Storage dump on local workerd:** I copied the Room Durable Object's SQLite file and read the `_cf_KV` rows. The room had the keys `meta`, `state` and `tokenHashes`. The raw tokens of both players did not occur in any value, and A's SHA-256 was present in `tokenHashes`. There is no old `tokens` key.
- **Other places a raw token could live:** the socket attachment type holds only `conn`, `playerId`, `windowStart`, `count`, `acceptedAt`, `heardAt`, `closing` (no token). The dev log did not contain either token or hash (app logs hold only event names and counts). The alarm path and the `load()` path read the hashes only.
- **Deploy note (LOW):** rooms that exist when this version is deployed have a `tokens` key and no `tokenHashes`, so their players cannot reconnect, and the raw tokens stay in storage until the room ends (at most 2 hours). Deploy between sessions, or ignore.

## Point 4: staging test for the owner

I wrote `.qa/security/staging-check.mjs` (now `scripts/staging-check.mjs`), which takes the base address as its only argument.
- **Run:** from the repository root, `node .qa/security/staging-check.mjs https://<staging host>`. It needs Node 22 and the `ws` package that is already under `worker/node_modules`. The staging Worker's `ALLOWED_ORIGINS` must contain the base address (the publish workflow derives it from `SITE_HOSTS`, so it does when the host is in that list). Run it from a machine whose address is not shared with other staging tests, because it uses about 270 upgrades from one address.
- **Duration:** about 9 minutes. It prints a line per check and exits 0 only if every automatic check passes.
- **What it does and the pass criteria:**
  - Leaderboard route returns 200 with `cache-control: public, max-age=60`.
  - Token only on first welcome, reconnect replaces the old socket with no token in the welcome, wrong token refused.
  - **Phase A:** 66 stalled sockets (they never read and never answer a close) in a room with one pinging player, then a returning player probes every 2 s for up to 3 minutes. **Pass: the player gets in within 20 s of the first refusal (or is never refused).** This is the check that decides the cap question. On local workerd this check fails (blocked for more than 3 minutes).
  - **Phase B:** 5 stalled sockets held for 5 minutes. **Pass: the room still answers afterwards.**
  - **Phase C:** 130 upgrades to a code that does not exist. **Pass: the first 429 comes between upgrade 60 and 125.**
  - **Phase D:** 100 leaderboard reads in a few seconds return one identical body.
- **What the script cannot count; the owner does it from the Cloudflare side during phase B** (the script prints the start and end times): the number of alarm invocations of that room, and the request count of the `Leaderboard` object during phase D. **Pass: at most 10 alarm invocations for the room in the 5 minutes (on local workerd, 20 across five rooms in 399 s), and at most 5 requests to the `Leaderboard` object for the 100 reads.** For the alarm count, temporarily switch on invocation logs for the staging Worker (`wrangler tail --format json` shows each alarm invocation), or read the Durable Object invocation metrics.
- **Local run of the script:** with `ORIGIN=http://127.0.0.1:4394 node .qa/security/staging-check.mjs http://127.0.0.1:8787` the leaderboard, token, limit and leaderboard-read checks passed and the two zombie checks failed (the cap lockout above), so the script does discriminate.

## New findings by severity

1. **HIGH (new, introduced by the fix): the 64-socket cap on listed sockets is a lockout lever.** Evidence and fix are under point 2. This is the only reason the score is not 9.
2. **LOW (deploy time): rooms alive at the moment of the token-hash deploy** cannot reconnect and keep raw tokens (point 3).
3. **INFO:** a destroyed room whose zombies are still listed answers 503 instead of `room_not_found` for as long as the Durable Object instance remembers them. Harmless.
4. **INFO:** my explanation for why a silent, swept host released the zombies is not established; I only know it happened (room B) and that it did not happen when the host stayed alive (rooms A and C).

## What I could not check

- The production edge: whether a peer that never answers a close is dropped, and after how long; the rate-limit service; the Cache API; billing. The staging script above is written for this.
- The two artifact action SHAs against their tags.
- Cloudflare environment protection and branch rules.
- Why zombies were released in room B (see INFO 4).
- The five-letter room code stays by the owner's decision; I counted it as such.
