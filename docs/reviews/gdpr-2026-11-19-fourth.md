# Two Pizzas: data-protection review, fourth pass (19 November 2026)

Method: read the third-pass report, privacy keys `privacy.summary`, `p0` to `p8` in `app/i18n/en.ts` and `ro.ts`, `app/i18n/identity.ts`, `app/i18n/test/privacy.test.ts`, `worker/src/{index,http,room,region,outbox,sockets}.ts`, `worker/wrangler.toml`, `worker/test/logs.test.ts`, `app/game/controller.ts`, both header files in `public/`, spec section 10 (D-080 to D-090). Ran `npm test` (418 pass, 0 fail) and `cd worker && npm test` (115 pass, 0 fail). No build, server or browser. Not legal advice. The contact address is not repeated here (it is the one in `identity.ts`).

## 1. Scores

- **Code and text: 9.0/10.** Every statement in `p0` to `p8` is true of the code; the Article 13 gaps of the third pass are closed in both languages; the new logs and the outdated-room deletion carry no personal data and agree with the retention text. Nothing mandatory remains in code or text; two optional items are in section 4.
- **Overall: 8.5/10.** The owner's off-code list is unchanged and still open (section 4).

## 2. Previous items

| Item (third pass) | Status | Evidence |
|---|---|---|
| A. p7 portability (13(2)(b)) | Fixed | `en.ts:1063` "a copy of the data you gave us in a portable format"; `ro.ts:1062` "o copie a datelor date de tine într-un format portabil". Pinned in `privacy.test.ts` (last test, `/portable/`, `/portabil/`) |
| B. p6 copy of safeguards (13(1)(f)) | Fixed | `en.ts:799` "Ask at the email address above for a copy of those clauses."; `ro.ts:798` "Poți cere o copie a acestor clauze…". Pinned in the same test |
| C. p2 page load reaches the server (M1) | Fixed | `en.ts:795`, `ro.ts:794` say the page loads the public list and the IP reaches the server then and on create or join. Matches `controller.ts:241` (`fetch('/api/room/leaderboard')`). p1 "The guided tour sends no game data" (`en.ts:794`, `ro.ts:793`) |
| D. p5 language is a choice (M2) | Fixed | `en.ts:798` "remembers the language you pick", `ro.ts:797` "limba aleasă". The test still pins keys `lg-lang`, `lg-seat`, `lg-theme` |
| E. p4 two lists (M3) | Fixed | `en.ts:797` "monthly or the all-time list"; `ro.ts:796` "listei lunare sau ale celei generale". The test pins `top {top}` and `primele {top}` |
| F. Track `worker/.dev.vars` (N7) | Not fixed | `git ls-files --error-unmatch worker/.dev.vars` fails: still untracked and not ignored. D-080 (`docs/spec.md:550`) says "committed". With the fail-closed `region.ts` the file holds one non-secret line (`DO_JURISDICTION=local`). Hygiene only, no privacy effect on the published service |
| Test for portability | Fixed | see A |
| N1 EU placement fails closed | Still closed | `worker/src/region.ts` `inRegion` (only exact `local` lifts it); `wrangler.toml` `DO_JURISDICTION = "eu"`. Real-platform proof stays with the owner |
| N3, N5, N8, S6 | Still closed | unchanged |
| N4 consumer web-mail contact | Open, owner's choice | `identity.ts`; the text still says "We share data with nobody else" (`p6`), which a mailbox provider technically contradicts for request mail |

## 3. New in this pass: refactor, logs, outdated rooms

- **Logs carry no personal data.** All `log(...)` calls in `worker/src/{http,room,sockets,outbox,index}.ts` pass event names plus a code, a count, a boolean or a fixed reason: `machine_error` has the action type only (`room.ts:266, 384, 404`), `state_outdated` has two numbers (`room.ts:244`), `room_destroyed` has a reason and a player count (`room.ts:421`). The single sink `index.ts:43` prints `JSON.stringify({ event, ...fields })`. `http.ts:46` reads `cf-connecting-ip` only as the limiter key; it is never logged or stored. `worker/test/logs.test.ts` asserts that names, a note text, tokens, room code and player ids never appear and that every value is a number, boolean or `[a-z_]+`. `machine_error` catches the exception without logging its message or stack, so a note text cannot leak through an error string. Platform logs are off (`wrangler.toml` `[observability]`, `invocation_logs = false`).
- **Retention still matches `p3`.** An outdated stored room is destroyed on load: `room.ts:243-246` logs and calls `destroy('outdated', 0)`, which runs `deleteAll` and `deleteAlarm`. This is earlier or equal to the 2 h lifetime in the text, never later; it is also covered by spec D-089. The alarm that exists for every room wakes the object, so an old-version room is not left stored beyond its lifetime. Retention numbers come from `config.room` and are pinned by the first test of `privacy.test.ts`.
- **Seats, sockets, outbox** hold token hashes and attachments in the room's own storage, deleted with the room; the leaderboard delivery sends the same public fields as before (`p4`).
- The tests pass: 418 and 115.

## 4. What remains

For the code-and-text score: it stands at 9. Nothing blocks it. Optional, in order:

1. **code** (hygiene): stage `worker/.dev.vars` so the spec's "committed" is true and a fresh clone runs `wrangler dev`. Not a privacy item.
2. **text** (optional): `p6` "We share data with nobody else" is correct for the game data; it holds only as long as the contact mailbox is not counted. Moving the contact address to the firm's own domain removes the point (see item 3 below; the code change is `identity.ts` only).

For the overall score (8.5 to 9), the owner's list outside the code, ranked:

1. **owner, outside the code:** processor agreements for both providers on file, with sub-processors and the transfer mechanism noted (backs `p6`).
2. **owner, outside the code:** written answer from the server provider on recovery copies after `deleteAll` and on EU placement and storage; adjust `p3` and `p6` if the answer differs (D-081).
3. **owner, outside the code:** decide on the contact mailbox (own domain); verify company data in `identity.ts` against the trade register and the authority's name and address.
4. **owner, outside the code:** read the real response headers on the published host (page, asset, API): no `Set-Cookie`, the CSP and `Permissions-Policy` as in `public/`; confirm dashboard log settings are off; ask the web host's access-log retention. Staging check that the EU restriction works.
5. **owner, outside the code:** records of processing (art. 30), legitimate-interest balancing for the IP address, DPIA and DPO decision note, breach procedure, rights-request procedure.
6. **owner, outside the code (lawyer):** confirmation of 6(1)(b) against 6(1)(f), the public list under recital 26, Law 365/2002 art. 5, Law 506/2004 numbering.
7. **owner:** re-read the privacy text whenever a provider, retention value, stored key or the public list changes; the tests pin numbers and keys, not providers.

## Could not check

Accounts, contracts, the real platform's EU placement and recovery behaviour, real response headers, dashboard settings, registry data, the rendered page.
