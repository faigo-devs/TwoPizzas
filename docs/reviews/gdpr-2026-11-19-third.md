# Two Pizzas: data-protection review, third pass (19 November 2026)

Method: read the predecessors' reports, the privacy keys (`privacy.summary`, `p0` to `p8`) in `app/i18n/en.ts` and `ro.ts`, `identity.ts`, `core/config.ts`, `worker/src/{index,http,room,leaderboard,region}.ts`, `worker/wrangler.toml`, `app/game/{session,controller}.ts`, the two header files in `public/`, `app/i18n/test/privacy.test.ts`, spec section 10 and handover decisions 22 to 24. No file was changed, no test was run. Not legal advice; **[lawyer]** marks what needs one. The firm's contact address is not repeated here (it is in `app/i18n/identity.ts`).

## Scores

- **Code and text: 8.0/10.** The text is now nearly true of the code in every line; what holds it under 9 is one Article 13 gap (portability, which follows from the 6(1)(b) basis the text itself claims), one missing copy-of-safeguards pointer, and three small accuracy points (page load contacts the server, "needed" for language, which list the retention refers to).
- **Whole, once the owner's off-code list is done: 8.5/10** (9 with the lawyer's confirmations and a real-platform check of EU placement and response headers, as before).

With the five wording changes in section 4 applied, code and text reach 9.

## 1. Is each statement true of the code?

| Statement | Verdict | Evidence |
|---|---|---|
| p0 operator line, contact in one place only | True | `identity.ts` through `privacyParams`; `privacy.test.ts` asserts it appears in p0 only |
| p1 server receives optional name, notes, votes, actions; teammates see name and notes | True | name is nullable (`core/machine/lobby.ts` `cleanName`, `lobby.set_name`); notes and votes live in room state |
| p1 "The guided tour sends nothing" | True of the tour, incomplete for the visit | `controller.ts` `init()` returns at `?local=1` before `loadLeaderboard()`; but a normal visit without a kept seat calls `fetch('/api/room/leaderboard')` (line 231, called at line 276) |
| p2 IP limits create/join and keeps the service safe; the game does not store it; providers log it | True, with a gap | `http.ts` line 48 `addressOf` uses the connecting address only as the limiter key (create, socket); not stored, not logged (`log` calls carry counts and codes only). Gap: the leaderboard GET is not limited but the address reaches the network provider and the host at page load; "providers process it in their own technical logs" covers it, but the text ties the IP to rooms only (see M1) |
| p3 room deleted after the last player is gone 15 min, or 2 h after creation, whichever first | True | `config.ts` lines 21 to 22; `room.ts` lines 46 to 59 (`cleanupReason`), `destroy` calls `deleteAll` (line 569); `emptySince` starts at creation (`core/machine/reduce.ts` line 28) and is set when no player is connected (`connection.ts` line 10); a paused seat counts as disconnected |
| p3 "recovery copies may keep deleted data for up to 30 days" | Honest, unverified | spec section 10 lines 532 to 533: the provider documents 30-day recovery and does not say whether it survives deletion; "may" is correct. Off-code (provider answer) |
| p4 public list content and "no names, no other personal data" | True | `leaderboard.ts` stores framework, generated team name (`names.ts`, no free text), players, score, escaped defects, cycle time, date; also a random publish id (`room.ts` line 103, 18 random bytes) and the month; neither identifies anyone |
| p4 "for as long as the result stays in the top {top} of its list" | True but ambiguous | `leaderboard.ts` `prune` keeps the union of the all-time top 10 and the current month's top 10 per framework; "its list" does not say there are two (M3) |
| p5 no account, no cookie, no tracker | True of the page | no `document.cookie`, no `Set-Cookie` in `app/`, `worker/src/`, `public/web.config` or `.htaccess`; CSP `default-src 'self'` with `connect-src` limited to the page's own origin and its own socket origin; no third-party script, font or image. The network layer is outside the repository (off-code, section 2) |
| p5 browser keeps language and, only while the tab is open, the seat | True | `session.ts`: `sessionStorage` `lg-seat` (code, player id, token), `localStorage` `lg-lang` written only by `setLanguage` (a user choice), `lg-theme` only removed. `privacy.test.ts` pins the three keys |
| p5 "Both are needed for the game to work" | Slightly strong | the language is a remembered choice, not needed for the game to run (M2) |
| p6 web host and network/server provider under data processing agreements; rooms in the EU; SCCs outside the EEA; "nobody else" | True of the code; contracts unverifiable | `inRegion()` fail-closed (only exact `local` lifts it), used on all four `getByName` calls in `worker/src/index.ts`; `DO_JURISDICTION = "eu"` in `wrangler.toml` line 18, pinned by `worker/test/region.test.ts` line 35; observability and invocation logs are disabled (`wrangler.toml` lines 6 to 11). "Nobody else" ignores the mailbox provider of the contact address (owner decision 24, see N4) |
| p7 rights, name optional, room code and name while the room exists, ANSPDCP | True; incomplete | see section 3 (portability) |
| p8 no audio | True | `Permissions-Policy: camera=(), microphone=(), geolocation=()` in both header files; no media code |
| Personal pause (1 to 15 min) | No sentence needed | `pausedUntil` lives in room state and is deleted with the room; no reason collected; inside purpose "run the game" |
| Micro-learning answers | No sentence needed | `store.learn` is memory only and not in the wire |

Mismatches to quote (none is a false statement; each is an omission or an overstatement):

- M1. `app/game/controller.ts` lines 231 and 276: the page asks the server for the public list on load, so the IP reaches the server before any room exists; `privacy.p2` (en.ts line 795) speaks only of creating or joining rooms.
- M2. `en.ts` line 798 / `ro.ts` line 797, p5: "Both are needed for the game to work"; `session.ts` line 65 shows the language is stored only after the user picks one.
- M3. `en.ts` line 797 / `ro.ts` line 796, p4: "its list" while `leaderboard.ts` lines 138 to 143 keep two lists' union.

## 2. Earlier findings: what is closed, what remains

| Finding | Status | Kind |
|---|---|---|
| First report R1 to R7 (identity, bases, recipients, rights, IP sentence, deletion wording, Law 365/2002 art. 5) | Closed in text | code/text |
| N1 EU placement fails open | **Closed.** `region.ts` fails closed; test pins `wrangler.toml`. Real-platform proof remains | code done; off-code check |
| N3 hint on free working-agreement field | **Closed** (`retro.action.freeHint` has the sentence in both languages) | code/text |
| N5 fold label | **Closed** (`privacy.summary` is "Privacy and operator" / "Confidențialitate și operator") | code/text |
| N6 6(1)(b) wording and the shortened text | **Applied**; basis choice still needs the lawyer, and see portability below | text + lawyer |
| N8 kit mock text | **Closed**: kit page is built only when `import.meta.env.DEV`; the mock sentence no longer exists | code |
| S6 text tied to config | Closed (`privacy.test.ts`) | code |
| N7 `worker/.dev.vars` | **Open, and the spec is wrong about it.** The file is untracked (`git status`: `??`) and not ignored, while spec section 10 line 530 says "committed". With the fail-closed code a clone without the file runs `wrangler dev` with the jurisdiction call. Fix: commit the file on purpose (it holds one non-secret line) | code (one `git add`) |
| N4 contact mailbox is a free consumer web-mail address | **Open, owner's choice** (decision 24). Costs: requests (room code, name) sit with a consumer mail service that is a recipient the text denies ("nobody else"), and the privacy line looks less trustworthy. Moving to a mailbox on the firm's own domain needs no code beyond `identity.ts` | off-code (owner) |
| N2 no cookie from the network layer | Open | off-code: read response headers (page, asset, API) for `Set-Cookie`; check zone bot and analytics features; **[lawyer]** if a strictly necessary cookie remains |
| Provider data processing terms (both), sub-processors, SCC coverage | Open | off-code (owner) |
| Provider written answers: does `deleteAll` remove recovery data and for how long; EU run and storage; does the rate-limit binding store the address | Open | off-code (owner, provider) |
| Staging check that the EU restriction works | Open | off-code |
| Confirm log settings in the dashboard (Workers Logs, traces, log push off); web-host access-log retention | Open | off-code |
| S3 balancing test (legitimate interest for the IP), art. 30 record, DPIA/DPO decision note, breach procedure, rights-request procedure | Open | off-code (records) |
| 6(1)(b) vs 6(1)(f); recital 26 view of the public list; Law 365/2002 art. 5 for a free game; Law 506/2004 numbering; authority name and address | Open | **[lawyer]** |

## 3. Romanian text and Article 13

Register: informal "tu" to the player throughout (ți, ai cerut, tău, poți, te poți opune, trimite), no slip found; "voi" form is not needed in the privacy text. Diacritics are correct. Plural forms are correct (15 "minute", 2 "ore" via `few`/`other` with "de"). Short sentences, one idea each; a beginner can follow it. Small points:

- p4 says "escaped defects" and "cycle time-ul" while the leaderboard table, which the player sees beside it, says "Defecte" and has no cycle column in Romanian. The project rule keeps technical terms in English, so this is acceptable; "numărul de defecte" would match the table better.
- p0 glosses CIF and Reg. Com. in plain words: good.

Article 13 for this processing, line by line:

| Requirement | Where | Status |
|---|---|---|
| 13(1)(a) controller identity and contact | p0 | Met |
| 13(1)(b) DPO contact | none | Not applicable (no DPO required; the decision note belongs in the records) |
| 13(1)(c) purposes and legal basis | p1, p2 | Met |
| 13(1)(d) the legitimate interests pursued | p2 ("limits how often... keeps the service safe") | Met |
| 13(1)(e) recipients | p1 (teammates), p4 (public list), p6 | Met |
| 13(1)(f) transfers outside the EEA, safeguards, **how to obtain a copy** | p6 | **Gap:** safeguards named, the way to get a copy is not |
| 13(2)(a) retention | p3, p4 | Met |
| 13(2)(b) rights: access, rectification, erasure, restriction, objection, **portability** | p7 | **Gap:** portability is not named, and portability applies to processing based on contract (6(1)(b)), the basis p1 claims. Either name it or switch p1 to 6(1)(f) **[lawyer]** |
| 13(2)(c) withdrawal of consent | none | Not applicable (no consent is used) |
| 13(2)(d) complaint to the authority | p7 | Met |
| 13(2)(e) whether providing data is required, and the consequence | p7 "Giving a name is optional"; p1 | Met in substance; the lawyer may want one more clause (the game cannot run without your actions in the room) |
| 13(2)(f) automated decision-making | none | Not applicable (none exists) |
| Art. 21(4) objection "clearly and separately" | p7, inside a long sentence | Acceptable; the lawyer may want it as its own sentence |

## 4. Changes that bring the score to 9

All keys exist; parameters are unchanged. `privacy.test.ts` keeps passing: p3 and p4 still carry the numbers (`top {top} ` and `primele {top} ` stay as written below), p5 still has "language"/"seat" and "limba"/"locul", p7 keeps "access", "erasure", "room code", "ANSPDCP" and "acces", "ștergere", "codul camerei", "ANSPDCP".

**A. p7: name portability (13(2)(b)).**

- EN before: `Giving a name is optional. At the email address above you can ask for access, rectification, erasure or restriction and object to processing based on legitimate interest; while the room exists, include the room code and your name. You can complain to ANSPDCP, the Romanian data-protection authority (dataprotection.ro).`
- EN after: `Giving a name is optional. At the email address above you can ask for access, rectification, erasure, restriction or a copy of the data you gave us in a portable format, and you can object to processing based on legitimate interest; while the room exists, include the room code and your name. You can complain to ANSPDCP, the Romanian data-protection authority (dataprotection.ro).`
- RO before: `Numele este opțional. La adresa de email de mai sus poți cere acces, rectificare, ștergere sau restricționare și te poți opune prelucrării bazate pe interes legitim; cât timp camera există, trimite codul camerei și numele tău. Poți face plângere la ANSPDCP, autoritatea română pentru protecția datelor (dataprotection.ro).`
- RO after: `Numele este opțional. La adresa de email de mai sus poți cere acces, rectificare, ștergere, restricționare sau o copie a datelor date de tine într-un format portabil, și te poți opune prelucrării bazate pe interes legitim; cât timp camera există, trimite codul camerei și numele tău. Poți face plângere la ANSPDCP, autoritatea română pentru protecția datelor (dataprotection.ro).`

**B. p6: how to get a copy of the safeguards (13(1)(f)).** Append one sentence.

- EN append: ` Ask at the email address above for a copy of those clauses.`
- RO append: ` Poți cere o copie a acestor clauze la adresa de email de mai sus.`

**C. p2 and p1: the page load reaches the server (M1).**

- EN p2 before: `Your IP address limits how often rooms are created or joined and keeps the service safe (legitimate interest, art. 6(1)(f)). The game does not store it; our providers process it in their own technical logs.`
- EN p2 after: `Opening the page loads the public list from our server, so your IP address reaches it then and whenever you create or join a room. We use it to limit how often rooms are created or joined and to keep the service safe (legitimate interest, art. 6(1)(f)). The game does not store it; our providers process it in their own technical logs.`
- RO p2 before: `Adresa ta IP limitează cât de des se creează camere sau se intră în ele și ține serviciul în siguranță (interes legitim, art. 6 alin. 1 lit. f). Jocul nu o stochează; furnizorii noștri o prelucrează în propriile jurnale tehnice.`
- RO p2 after: `Deschiderea paginii încarcă lista publică de pe serverul nostru, deci adresa ta IP ajunge la el atunci și ori de câte ori creezi o cameră sau intri într-una. O folosim ca să limităm cât de des se creează camere sau se intră în ele și ca să ținem serviciul în siguranță (interes legitim, art. 6 alin. 1 lit. f). Jocul nu o stochează; furnizorii noștri o prelucrează în propriile jurnale tehnice.`
- p1 last sentence, EN before `The guided tour sends nothing.` after `The guided tour sends no game data.`; RO before `Turul ghidat nu trimite nimic.` after `Turul ghidat nu trimite date de joc.`

**D. p5: language is a choice, not a need (M2).**

- EN before: `No account, no cookie, no tracker. Your browser keeps your language and, only while this tab is open, your seat in the room. Both are needed for the game to work.`
- EN after: `No account, no cookie, no tracker. Your browser remembers the language you pick and, only while this tab is open, your seat in the room, so the game works as you asked.`
- RO before: `Fără cont, cookie sau tracker. Browserul păstrează limba ta și, doar cât timp această filă e deschisă, locul tău în cameră. Amândouă sunt necesare ca jocul să funcționeze.`
- RO after: `Fără cont, cookie sau tracker. Browserul îți reține limba aleasă și, doar cât timp această filă e deschisă, locul tău în cameră, ca jocul să meargă cum ai cerut.`

**E. p4: two lists (M3).**

- EN before: `...for as long as the result stays in the top {top} of its list.`
- EN after: `...for as long as the result stays in the top {top} of the monthly or the all-time list.`
- RO before: `...cât timp rezultatul rămâne în primele {top} locuri ale listei.`
- RO after: `...cât timp rezultatul rămâne în primele {top} locuri ale listei lunare sau ale celei de dintotdeauna.`

**F. Not wording, one line of repository hygiene:** track `worker/.dev.vars` on purpose (N7) and fix nothing else in the spec, which already says "committed".

Additionally, add one assertion to `privacy.test.ts` that `privacy.p7` names portability ("portable"/"portabil") so the gap cannot reopen.

## 5. Owner's list outside the code (still open, unchanged in substance)

1. Verify the company data in `identity.ts` against the trade register; decide on N4 (mailbox on the firm's own domain).
2. Accept and file the provider's data processing terms and obtain the web host's; note sub-processors and the transfer mechanism.
3. Ask the server provider in writing: recovery after `deleteAll` and for how long; EU run and storage; whether the rate-limit binding stores the address. Adjust p3 and p6 to the answers.
4. Check in staging that the EU restriction works on the real platform.
5. Read real response headers for `Set-Cookie`; check the zone for bot and analytics features; confirm logging is off in the dashboard; ask the host's log retention.
6. Write the records: art. 30 register, legitimate-interest assessment for the IP address, DPIA/DPO decision note, breach procedure (72 hours), rights-request procedure (one month).
7. Lawyer: 6(1)(b) vs 6(1)(f) (and so whether portability stays); recital 26 for the public list; Law 365/2002 art. 5 for a free game; Law 506/2004 numbering; cookie question if one is found.
8. Verify the authority's name and web address before publishing.
9. Re-read the privacy text whenever a provider, retention value, stored key or the public list changes (the test pins numbers and keys, not providers).

## What I could not check

Accounts, contracts, the real platform's EU placement and recovery behaviour, real response headers, dashboard log settings, the registry data and the authority's address, and the rendered page (read from source only; no tests were run in this pass).
