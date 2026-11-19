# Sixth security review of the LGTM / Two Pizzas room server

I changed no source file. Scratch is under `.qa/security/` (git-ignored). I ran a local `wrangler dev` on port 8787 (it read `.dev.vars` automatically) and shut it down: port 8787 is closed and no `workerd` process is running. I opened no browser session and did not touch the `u-*` sessions or port 4430. I contacted no live service.

Tests: root 258/258 and `worker/` 101/101 pass.

## Scores

- **The code as it stands: 8/10** (fifth review: 8, with the backstop as the one open point; that point is only half closed, see MEDIUM-F1).
- **Once the staging test passes: 9/10.**
- **What in the code still stands between the current state and 9:** the value of `socketsBackstopMax`. 256 is better than 2,000, but local workerd still used about 0.43 MB per stalled socket (110 MB for 255), which would be close to the 128 MB limit of a production Durable Object if production costs anywhere near the same. Set it to 128 (or lower) now, since seated players are exempt and strangers need very little, and let the staging memory measurement confirm it. Nothing else in the code stands in the way.

## Status of the earlier open items

- **MEDIUM-F1 (backstop too high): half fixed.**
  - `core/config.ts` now has `socketsBackstopMax: 256`.
  - On local workerd (`h12.mjs`): 255 stalled strangers accepted and the rest got HTTP 503; a seated player past the backstop was welcomed in 11 ms; a stranger got 503; action latency stayed at 14.5-15.5 ms (baseline 18.8 ms). The workerd memory rose from 319 MB to 429 MB, about 0.43 MB per socket, the same per-socket figure as in the fifth review. The figure includes the dev server's own overhead, so it may be much lower in production. If it is not, 256 sockets would use about the whole 128 MB.
  - Fix: set the value to 128, and let the staging memory check decide. (The staging criterion in the fifth report asked for under 0.25 MB per socket; the local 0.43 MB fails it, so the local run alone would have said "lower it".)
- **LOW (`wrangler tail` and Logpush can show seat tokens): still open, by nature.** Nothing in the code changed; the owner keeps header logging off and does not tail production during games.
- **LOW (a stranger's in-flight `hello` can be evicted by a burst):** unchanged, retried by the client.
- **INFO items** (delayed 4000 for an idle replaced socket, the address limit for seated players behind one busy address, 503 instead of `room_not_found` after a room is destroyed): unchanged.
- **Earlier rounds:** tokens stored as hashes and sent once, the handshake authentication, the close codes, the alarm floor, the closing flag, eviction, the lock and the kick are untouched by this round's changes. The five-letter code stays by the owner's decision. The single-person leaderboard is accepted and the copy is honest. I still could not check the two artifact action SHAs against their tags.

## 2. Personal pause

**What I verified** (a harness test, `pause-probe.test.ts`; live workerd, `p1.mjs`; and the updated `staging-check.mjs`):
- Wire validation (`core/wire.ts:43`): minutes must be an integer from 1 to 15. 0, 16, 1.5, the string `"5"`, -3 and 1e9 all got `bad_request`. A pause in the lobby (and in the summary) is refused with `not_allowed`.
- Re-pausing replaces the time (15 minutes then 1 minute gave 1.0 minute). `pausedUntil` is always `now + at most 15 minutes`, so it is bounded and never beyond what the alarm and the 2-hour room life allow (the alarm is the minimum of all times, including the room's lifetime).
- A paused, disconnected player's item was still held 10 minutes after the disconnect, still held at 15.5 minutes (pause over, grace running), and released at 16.2 minutes (pause end plus the 60 s grace). A paused facilitator who disconnected kept the role at 8 minutes.
- The team sees the pause: `pausedUntil` is in every player's view (5.0 minutes in my live test) and the paused player's controls change from "pause" to "resume".
- Reconnecting through the seat (a takeover with 4000) clears the pause: verified live; the old socket was closed with 4000.
- A pause that ends does not loop the alarm: live, a paused player dropped and the pause ended after one minute; the player was still seated and `pausedUntil` became null; in the harness, 30 further alarm runs after the pause end wrote the alarm only 3 times. The deadline is in `nextDeadline` and `endPauses` runs inside `server.deadline`, which every action and every alarm already runs.

**Abuse questions:**
- **Holding items or the role forever by pausing again and again?** Only a connected player can send a pause (it is an action on a live socket), and any other action, and every reconnect, clears it (`dispatch` clears a pause on any action except `player.pause`). A disconnected player cannot extend a pause without reconnecting, and reconnecting clears it. A person or a script that stays connected and pings can hold items or the facilitator role indefinitely, but that was already possible without any pause (a connected idle player is never released); the pause adds one case, a player who is away: up to 15 minutes plus 60 s per pause, and the player must come back to renew it. So no new capability, and no way to hold from a dead connection.
- **Blocking a pair partner or the team?** Yes, for as long as the pause: the paused player's items and role stay held, and the team can neither take them nor replace the facilitator (the pause is ignored by the team's controls, which only see the "away until" banner). A hostile insider can do this in two steps (take items, pause 15 minutes, close the tab), and the team has no remedy except waiting. As before, a hostile insider can already take items and stay connected and idle. It only hurts the insider's own team and its own score. It is also a good reason for a "release this player's items" action for the facilitator, not an exploit. I rate this LOW.
- **Alarm storms and deadline loops:** none found (above).
- **Kick, lock, hello timeout, rate limits:** a pause cannot be set in the lobby, so the kick and the lock (lobby only) cannot interact with it. A kicked player is removed; a paused player cannot be kicked after the start (no kick then). The hello timeout applies only to unjoined sockets, not to seated ones. A pause message counts toward the 20 messages per 5 s per socket limit, and each pause that changes the time writes the state and the alarm (up to about 4 per second per seat), the same as any other state-changing action. This is INFO.
- **Leaderboard result:** nothing in the score or the published entry depends on `pausedUntil`. Timeboxes and arrivals run regardless of pauses, so pausing neither stops nor extends the clock. No effect on scores.

## 3. EU jurisdiction

- **No access path bypasses `inRegion`:** every use of the two namespaces in `worker/src/index.ts` goes through it: the Room's leaderboard publish (line 71), room creation (152), the WebSocket connect (153) and the leaderboard read (155). A search of `worker/src` for `getByName`, `idFromName` and `.get(` finds no other.
- **Fails closed (`region.mjs`):** only the exact string `local` returns the unrestricted namespace. `undefined`, the empty string, `eu`, `EU`, `LOCAL`, `local ` (trailing space), ` local`, `localhost` and `true` all return the EU-restricted namespace.
- **Cross-reach:** a Durable Object id made through a jurisdiction-restricted namespace differs from the id of the same name in the unrestricted namespace, so a room cannot be reached through the wrong one. I could not test this locally (`wrangler dev` does not implement jurisdictions; that is why `.dev.vars` sets `local`), and I rely on Cloudflare's documented behaviour. A consequence: any room or leaderboard data stored earlier in the unrestricted namespace becomes unreachable after the switch. That is acceptable before publication.
- **The dev file cannot leak into a deploy:** `worker/.dev.vars` (`DO_JURISDICTION=local`) is read by `wrangler dev` only (the dev log said "Using secrets defined in .dev.vars" and listed `DO_JURISDICTION` as `local`). In `.github/workflows/publish-server.yml` the publish job builds `deploy/` from `out/bundle/index.js` and the repository's `worker/wrangler.toml` (`DO_JURISDICTION = "eu"`); the file is not copied, `wrangler deploy` does not read it, and the deploy passes only `--var ALLOWED_ORIGINS`. It is also not tracked by git. One small point: `.dev.vars` is neither tracked nor in `.gitignore`, so it could be added by accident; adding the line or deciding to commit it on purpose would settle it. If it were committed it would still not reach the deploy.
- **What a staging deployment must prove:** that `jurisdiction('eu').getByName(...)` works on the real platform. The script's existing checks do prove it, because room creation and the WebSocket both go through that call: a failure would be a 500 on `POST /api/room`. Whether the objects really sit in the EU cannot be read from outside; the owner checks the Durable Objects page of the staging namespace once (the objects should be listed under the EU jurisdiction).
- Not covered by the jurisdiction (and not stated otherwise in the copy): the front Worker runs at the edge nearest the player and sees each request (IP and the seat header), the rate limiters and the Cache API (a public leaderboard) are not in the EU object.

## 4. Copy: does it promise anything about security that is not true?

- `leaderboard.note` and `summary.publishHint`: true (unchanged; they say results are not checked and one person can fill every seat).
- `privacy.p1`, `p2`: true. The address is not stored by the game; providers process it. It says nothing about the header token.
- `privacy.p3`: deletion times are as coded; the 30-day recovery copies are a provider fact I cannot verify, but the sentence is the honest side to err on.
- `privacy.p4`: true for the fields (framework, team name, players, score, escaped defects, cycle time, date). "As long as the result stays in the top N of its list" matches the pruning. The list also keeps a random internal id, not personal data.
- `privacy.p5`: slightly short: the browser also keeps the colour theme in local storage (`lg-theme`), and the text names only language and seat. LOW, a one-word fix.
- `privacy.p6`: "Rooms are stored in the EU" is true only once the deploy has `DO_JURISDICTION = "eu"` and the staging check passes; it says that processing outside the EEA uses standard contractual clauses, which is the right side. It does not claim that the edge handling is in the EU.
- The pause banner (`pause.away`: "Your team sees you away until {time}") is true (the time is in every view). No copy says the pause protects anything or keeps items beyond what the code does.

## New findings by severity

1. **MEDIUM (open, half fixed): the backstop value** (see MEDIUM-F1 above; set it to 128 and confirm with the staging memory check).
2. **LOW: a pause lets a hostile insider keep a seat's items or the facilitator role for 15 minutes plus 60 s per pause while away,** and the team has no way to release them. Only the insider's own team suffers, and the same insider could stay connected and idle with the same effect. A facilitator-only "release this player's items" action would remove the asymmetry.
3. **LOW: `privacy.p5` omits the colour theme** held in local storage.
4. **INFO: `.dev.vars` is untracked and not ignored.** **INFO: pause actions are state-changing and subject to the usual rate limit** (up to about 4 writes per second per seat).

## Staging test (updated `.qa/security/staging-check.mjs`, now `scripts/staging-check.mjs`)

Run: `node .qa/security/staging-check.mjs https://<staging host>` from the repository root. It needs Node 22 and the `ws` package under `worker/node_modules`. The staging `ALLOWED_ORIGINS` must contain the base address. It uses about 270 upgrades from one address and takes about 6.5 minutes; it exits 0 only if every automatic check passes.

- **Automatic checks and pass criteria:**
  1. Leaderboard returns 200 with `cache-control: public, max-age=60`.
  2. Handshake selects `lgtm.v1` only; the first welcome carries a token; a seat in the handshake gets the welcome first without a token or `hello`; a wrong token is a silent stranger.
  3. Raw requests: no protocol header gives a plain 101 without a selection; no game name gives 400; a valid seat entry gets only `lgtm.v1` back.
  4. **New, phase P (pause):** pause is refused in the lobby; after the start, the lengths 0, 16, 1.5 and "5" are all refused; a 5-minute pause is visible to a teammate as `pausedUntil` about 5 minutes ahead; returning through the seat clears it. (This also proves, on the real platform, that room creation through `jurisdiction('eu').getByName(...)` works, since every room here is created that way; a failure would be a 500 on room creation.)
  5. **Phase A:** 66 stalled sockets in a room with a pinging seated player, then 20 returning-player reconnects. **Pass: none fails and the slowest welcome is 2,000 ms or less;** a stranger still joins.
  6. **Phase B:** 5 stalled sockets held 300 s. **Pass: the seated player gets in afterwards.**
  7. **Phase C:** 130 upgrades to a code that does not exist. **Pass: the first 429 comes between upgrade 60 and 125.**
  8. **Phase D:** 100 leaderboard reads return one identical body.
- **Owner counts from the Cloudflare side** (the script prints phase B's start and end times):
  - Alarm invocations of that room in the 5 minutes of phase B. **Pass: 10 or fewer.**
  - Requests to the `Leaderboard` object during phase D. **Pass: 5 or fewer.**
  - Durable Object memory and resets: read the room object's memory before and after phase A, and after a separate run with 130 stalled strangers (phase A with 130 instead of 66, which is about 1.5 minutes of the address allowance; and 250 if the backstop stays at 256). **Pass: no reset and growth per stalled socket below 0.25 MB.** If the growth is higher, lower `socketsBackstopMax` until 128 sockets fit in 32 MB.
  - **Jurisdiction (manual, once):** in the Cloudflare dashboard, check that the staging `Room` and `Leaderboard` namespaces list their objects under the EU jurisdiction. The script cannot read this from outside.
- **Local run (workerd):** ALL AUTOMATIC CHECKS PASSED in 385 s, including all four new pause checks (refused in the lobby; 4 of 4 bad lengths refused; 5.00 minutes visible; cleared on return); 20 reconnects, 0 failed, slowest 34 ms; the 429 came at upgrade 120.

## What I could not check
- The production edge: stalled-peer reaping, the rate-limit service, the Cache API, Durable Object memory limits (the main open number), billing, and whether `jurisdiction('eu')` objects are placed in the EU (local dev does not implement jurisdictions).
- Firefox and Safari for the subprotocol handshake (answered from the specifications in the fifth report).
- The two artifact action SHAs against their tags, and GitHub environment protection.
