# Two Pizzas: data-protection review, final round (19 November 2026)

Method: read the fourth-pass report, `privacy.p0` to `p8` in `app/i18n/en.ts` and `ro.ts`, `app/i18n/identity.ts`, `app/game/session.ts`, `app/game/drafts.ts`, the diff of `app/game/controller.ts`, `app/game/transport/remote.ts`, `core/config.ts`, `worker/wrangler.toml`, and a grep of every storage, fetch, log and socket call in `app/` and `worker/src/`. Ran `npm test` (469 pass, 0 fail) and `cd worker && npm test` (115 pass, 0 fail). No build, server or browser. Not legal advice. The contact address is the one in `identity.ts` and is not repeated here.

## 1. Scores (scale of spec section 9, "Review scale")

- **Code and text, judged locally: 9/10.** No blocker, no major. Every statement in `p0` to `p8` still matches the code; every requirement of the domain has evidence in code, tests or text.
- **Overall: 8/10.** One owner-side major: the text asserts processor agreements, EU storage and a 30-day recovery window that no document in the repository evidences (finding O1). With that closed, overall is 9.

## 2. Findings by severity

### Blocker

None.

### Major

- **O1 (owner, major).** `privacy.p6` ("under data processing agreements", "Rooms are stored in the EU", "standard contractual clauses") and `privacy.p3` ("recovery copies may keep deleted data for up to 30 days") state facts about the providers that only the owner can evidence (`en.ts:805`, `en.ts:808`, `ro.ts:804`, `ro.ts:807`). Fix: file the processor agreements, get the written answer on recovery copies and EU placement, and change `p3`/`p6` if the answer differs. Same item as D-081 and fourth-pass owner items 1 and 2.

### Minor

- **M1 (text, optional).** `p6` "We share data with nobody else" holds for game data; a consumer web-mail contact address technically involves a mailbox provider for request mail (`identity.ts:9`). Fix: move the contact address to the firm's own domain (one line in `identity.ts`), or leave as is.
- **M2 (code, hygiene).** `worker/.dev.vars` is still untracked while D-080 says "committed"; it holds no secret. Not a privacy effect.
- **M3 (owner).** The worker was renamed in `worker/wrangler.toml` (`name = "two-pizzas-rooms"`). A new name means a new deployment with an empty Durable Object namespace; if a previous deployment under the old name ever held rooms, delete it so no stored data outlives the retention text. No privacy text change.

## 3. What changed since the fourth pass, with a data effect

| Change | Data effect | Evidence |
|---|---|---|
| Connect timeout 10 s, close the socket and reconnect (D-108) | None. Same endpoint, same protocol; no new request type, no stored value; the timer is in memory | `remote.ts` `AttemptMs = config.room.connectTimeoutMs`, `core/config.ts` `connectTimeoutMs: 10_000` |
| Error messages: `refusalOf` returns `network` when a refused create carries no code (D-109) | None. Codes only; response bodies are not shown or logged | `controller.ts` `carriedCode`, `refusalOf` |
| Lobby agenda (D-110) | None. Pure core data and copy; no storage or request | `core/agenda.ts`, `app/i18n/test/agenda.test.ts`; grep finds no storage, fetch or console in it |
| Goal vote item list (D-111) | None. Reads the view the server already sends, adds nothing to the protocol that carries personal data | `app/game/test/goal-items.test.ts` |
| Tour changes (D-106, D-107) | None. The tour stays local with no network call, as `p1` says | `app/game/tour/*`: no storage, fetch or socket call in the diff |
| Unsent answer drafts (new `app/game/drafts.ts`) | Players' unsent answers are held in a JavaScript `Map` only: no localStorage, sessionStorage, IndexedDB or cookie; cleared on leave and on fatal error (`teardown` calls `clearDrafts`), pruned when an item is submitted or leaves the player. Consistent with `p5` | `drafts.ts`, `controller.ts` `pruneDrafts`/`clearDrafts` |
| Storage keys | Unchanged: `lg-seat` (sessionStorage), `lg-lang` (localStorage), `lg-theme` removed on load | `app/game/session.ts` |
| Server logs and storage | Unchanged: `console.log` only in `worker/src/index.ts:43` (event name plus numbers or fixed codes); `cf-connecting-ip` read only as the limiter key (`http.ts:47`); `deleteAll`/`deleteAlarm` on destroy (`room.ts:220, 423-424`); worker tests pass, including the log content test | grep of `worker/src/` |
| New request, log or storage | None found | grep of `app/` (non-test): fetch only at `controller.ts:110` and `controller.ts:255`; WebSocket at `remote.ts:74`; storage only in `session.ts` |

The privacy text still pins retention numbers, storage keys and the portability and clause-copy sentences in `app/i18n/test/privacy.test.ts`; the full test run passes.

## 4. Owner's list (outside the code), ranked

1. Processor agreements for both providers on file, with sub-processors and the transfer mechanism (backs `p6`). This is O1.
2. Written answer from the server provider on recovery copies after deletion and on EU placement; adjust `p3`/`p6` if it differs (O1).
3. Decide on the contact mailbox (own domain); verify company data in `identity.ts` against the trade register and the authority's name and address.
4. Read the real response headers on the published host (page, asset, API): no `Set-Cookie`, CSP and `Permissions-Policy` as in `public/`; confirm dashboard log settings are off; ask the web host's access-log retention; staging check that the EU restriction works.
5. Records of processing (art. 30), legitimate-interest balancing for the IP address, DPIA and DPO decision note, breach procedure, rights-request procedure.
6. Lawyer: 6(1)(b) against 6(1)(f), the public list under recital 26, Law 365/2002 art. 5, Law 506/2004 numbering.
7. Re-read the privacy text whenever a provider, retention value, stored key or the public list changes; tests pin numbers and keys, not providers.
8. Check the old worker deployment name is gone (M3).

## Could not check

Accounts, contracts, the real platform's EU placement and recovery behaviour, real response headers, dashboard settings, registry data, the rendered page. Another engineer is editing `app/`; findings there may shift.
