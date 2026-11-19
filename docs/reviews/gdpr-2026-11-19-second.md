# Two Pizzas: data-protection review, second pass (19 November 2026)

Method: read the code and copy again (`app/i18n/en.ts`, `ro.ts`, `identity.ts`, `index.ts`, `test/privacy.test.ts`, `app/ui/Footer.tsx`, `app/game/*`, `worker/src/region.ts`, `index.ts`, `wrangler.toml`, `.dev.vars`, `core/config.ts`); ran `npm test` at the root (258 pass, 0 fail). No file was changed. Not legal advice; **[lawyer]** marks what needs one. The firm's contact address is not repeated here (it is in `app/i18n/identity.ts`).

## Score

**7.5/10 now. About 8.5/10 once the owner's off-code items below are done. 9 needs the lawyer's confirmation and a real-platform check that rooms are created in the EU.** Up from 5/10. Every Required item of the first report is now in the text. What remains is mostly proof that the text is true (providers, EU placement, no cookies set by the network layer) and a few small copy and config points.

## Status of the first report's items

| Item | Status | Evidence |
|---|---|---|
| R1 controller identity and contact | **Done** | `privacy.p0` (EN, RO) uses `identity` (name, seat, CIF, Reg. Com., contact address) through `privacyParams`; `privacy.test.ts` asserts it appears in p0 and nowhere else on the page. Rendered folded in `Footer` on every screen. See N5 for the label of the fold |
| R2 purposes and bases | **Done** | p1 gives 6(1)(b), p2 gives 6(1)(f); p7 gives the right to object to processing on legitimate interest. Wording of 6(1)(b): see N6 |
| R3 recipients, processors, transfers | **Done in text; proof pending** | p6: host and "network and server provider" by category, under data processing agreements, room data in the EU, SCCs outside the EEA. Whether the agreements exist and the EU placement works is not verifiable from the code (N1, N2) |
| R4 rights, complaint | **Done** | p7: access, rectification, erasure, restriction, objection, room code plus name while the room exists, ANSPDCP in plain text; name optional |
| R5 IP sentence | **Done** | p2 now says the providers process it in their own technical logs |
| R6 "deleted" and public-list retention | **Done, hedged** | p3 adds "the provider's own recovery copies may keep it for up to 30 days"; p4 adds "as long as the result stays in the top {top}"; `core/config.ts` `emptyGraceMs` is 15 minutes (test `config.test.ts` pins 900 000); text takes minutes, hours and `top` from the config and `privacy.test.ts` checks them. Romanian plural checked: 15 gives "15 minute", 2 hours gives "2 ore", correct |
| R7 Law 365/2002 art. 5 identification | **Done** | name, seat, CIF, Reg. Com. and an e-mail address are in p0. Visibility: N5 |
| S1 EU jurisdiction | **Done in code, fail-open, unverified** | `inRegion(env.ROOM, env.DO_JURISDICTION)` and the same for `LEADERBOARD` on every `getByName` call in `worker/src/index.ts`; `DO_JURISDICTION = "eu"` in `wrangler.toml`; `region.test.ts` unit-tests `inRegion`. See N1 |
| S2 hints at free text | **Mostly done** | `lobby.yourNameHint` and `retro.noteHint` in both languages, rendered in `Lobby.tsx` and `Retro.tsx`. The free working-agreement field (`retro.action.freeHint`, `Retro.tsx` line 334) has no such hint (N3) |
| S3 balancing test, S4 provider logs, S5 rate limiter | Off-code, still open | Checklist |
| S6 text tied to config | **Done** | `app/i18n/test/privacy.test.ts` (delay, lifetime, top, storage keys, identity placement, rights words) |

Children, DPIA, DPO: unchanged, nothing required.

## New since the first review

**Personal pause.** `pausedUntil` (a timestamp) is in every player's view and the others see "away until HH:MM"; the length is 1 to 15 minutes (`config.pause`); no reason is collected. It lives in the room state, so it is deleted with the room. It is an in-game status of a player the others already see by name, inside the purpose "run the game". **No new sentence needed** ("what you do in the game" already covers it). The pause controller is hidden in the tour.

**Micro-learning answers.** `store.learn` (`Record<string, number>`) is kept in memory only; I found no write to `localStorage`, `sessionStorage`, cookies or IndexedDB outside `session.ts` (grep of `app/`), and `learn` appears nowhere in `app/game/transport` or `core/wire.ts`, so it is never sent. It is reset with the rest of the store (`controller.ts` line 71). In-page memory is not "storage on the terminal" for art. 5(3) and the answers never reach the controller, so no sentence is required. An optional half-sentence ("your answers to the check questions stay in your browser") would be accurate but adds length; I would leave it out.

## New findings

### Strongly recommended

**N1. The EU placement fails open and is not proven.** `inRegion` returns the unrestricted namespace for any value other than `"eu"`, including a missing variable, so a deploy that loses the variable silently creates rooms anywhere, while p6 promises "stored in the EU". Fix: fail closed. Treat only an explicit `local` (from `worker/.dev.vars`) as unrestricted; anything else, including undefined, is `eu`. Add a test that reads `wrangler.toml` and asserts `DO_JURISDICTION = "eu"`. On the real platform, check once in staging that an object created through the restricted namespace reports its jurisdiction from the inside (the platform documents reading the jurisdiction from within a Durable Object). Remember the documented caveat: the object id is logged outside the jurisdiction, and edge handling of the request is not restricted; p6 says "room data is stored in the EU", which is accurate if the restriction works, and it does not claim that nothing leaves the EU.

**N2. "No cookie" and "no tracker" describe the page, but the network layer is not in the repository.** A proxy in front can set its own cookies (bot-management or rate-limiting cookies exist in some Cloudflare configurations) and can inject an analytics script; the static host or its panel can set a cookie too. The page's CSP blocks foreign scripts but does not stop a `Set-Cookie` header. Before publishing: request the page, an asset and `/api/room/leaderboard` on the real host and read the response headers for `Set-Cookie`; check the zone for Bot Fight Mode, Web Analytics auto-injection and similar. If a cookie remains and is strictly necessary for security, adjust p5 ("no cookie for tracking") instead of leaving a false statement. **[lawyer]** for the "strictly necessary" call on such a cookie.

**N3. The free working-agreement field has no "no real names" hint.** Add the same sentence to `retro.action.freeHint`.
- EN: `Up to {max} characters. The game cannot track it. No real names or private details about other people.`
- RO: `Cel mult {max} de caractere. Jocul nu o poate urmări. Fără nume reale sau detalii private despre alții.` (use the existing RO key text and append the last sentence).

**N4. The contact mailbox is a consumer web-mail address.** Requests will contain a room code and a name; they would sit in a consumer mail service whose terms the firm cannot adjust as a processor agreement, and a free address on the privacy line reads less trustworthy. Use a mailbox on the firm's own domain (the firm already owns one) and change `identity.ts`. The test needs no change.

### Good practice

**N5. Make the fold findable for the e-commerce identification.** The identity sits under the summary "Privacy". For Law 365/2002 art. 5 ("permanent, easily accessible") the label should say it holds the operator too: EN `Privacy and operator`, RO `Confidențialitate și operator`. One key each (`privacy.summary`). **[lawyer]** only if the owner wants certainty about the free-service question.

**N6. Wording of 6(1)(b).** "We use them only to run the game for you and your team, because you asked to play (art. 6(1)(b) GDPR)" is understandable and acceptable as plain-language information: the data is necessary for the service the person requested. Two cautions: (a) a lawyer may prefer 6(1)(f) because no written terms exist and EDPB reads "contract" narrowly (the first report offered 6(1)(f) as the alternative; if switched, add "and you may object" to p1, already covered by p7); (b) say "to provide the game you asked to play" rather than "because you asked to play" if the copy is shortened (below). **[lawyer]**.

**N7. `worker/.dev.vars` is neither tracked nor ignored** (`git check-ignore` returns 1; not in `.gitignore`). It holds only `DO_JURISDICTION=local`, but a dev-only file that turns the restriction off should not be committable by accident. Add it to `.gitignore`, and let `npm run dev` create it if missing, or document it.

**N8. The kit mock text** (`app/kit/mock.ts` line 33, "A room lives for a few hours and is deleted when the last player has left") is a dev-only page; make sure `/kit` is not in the production build (the handover says dev only), otherwise the sentence is inconsistent with the 15 minutes and the 2 hours.

## Review of the specific questions

**Length and plainness.** Nine paragraphs, about 390 words in English. A reader in a game will not read this; the legal minimum is lower than what is shown. Without dropping a Required item it can fall to about 290 words by cutting what the field hints already say (the "do not write real names" sentence in p1, now repeated at each field), compressing p3, p5, p6, p7 and keeping p0, p2, p4, p8 as they are. Proposed text below. Keeping the folded paragraph order (who, what, IP, deletion, public list, device, providers, rights, audio) is right.

**"Dataprotection.ro" in plain text.** Fine: Art. 13 requires naming the authority or the right to lodge a complaint, not a link; plain text respects the three-links rule (checked: `Footer` renders text paragraphs, no autolink). "ANSPDCP (dataprotection.ro)" suffices.

**Anything promised that cannot be kept.**
1. "Room data is stored in the EU": see N1 (fail-open, unverified).
2. "under data processing agreements": true only when the owner has accepted/filed both (the host's is unknown to me).
3. "no cookie, no tracker": see N2.
4. "Deleted data leaves the game's server; recovery copies may keep it up to 30 days": honest; the 30 days is the documented point-in-time window, and the sentence says "may". If the provider confirms in writing that deletion also removes recovery copies, the second half can go; if it says longer, change the number.
5. "The game does not store [the IP]": true of the code; the rate limiter is a platform binding keyed with the address (checklist).
6. "We share data with nobody else": true of the code; the mailbox provider is one more recipient of requests (N4).

**Romanian register.** Informal "tu" throughout (ți, ai cerut, tău, te poate readuce, ne poți cere, te poți opune, spune-ne, Poți face). One slip of tone is not found. "Colegii tăi" is fine. "Turul ghidat" matches the product's wording (the start screen says "turul de unul singur"; keep one name, check against the start copy). "Operator: ... CIF ..." is standard. "primele {top} ale listei lui" is correct but heavy; the shortened text rephrases it.

## Proposed wording still to change (both languages)

The shortened text keeps every Required element (p0 identity and contact, bases, recipients and transfers, retention, rights and complaint, optional provision). Keys stay the same, parameters unchanged.

**English**
- `privacy.summary`: `Privacy and operator`
- `p0` (unchanged): `Operator: {name}, {seat}, CIF {cif}, Reg. Com. {regCom}. For any request about your data: {email}.`
- `p1`: `While you play, the room server receives an optional name, your notes, your votes and your actions. We use them only to provide the game you asked to play (art. 6(1)(b) GDPR). Your teammates see your name and notes. The guided tour sends nothing.`
- `p2`: `Your IP address limits how often rooms are created or joined and keeps the service safe (legitimate interest, art. 6(1)(f)). The game does not store it; our providers process it in their own technical logs.`
- `p3`: `A room and everything in it are deleted when the last player has been gone for {minutes, plural, one {# minute} other {# minutes}}, or {hours, plural, one {# hour} other {# hours}} after it was created, whichever comes first. The provider’s recovery copies may keep deleted data for up to 30 days.`
- `p4` (unchanged).
- `p5`: `No account, no cookie, no tracker. Your browser keeps your language and, only while this tab is open, your seat in the room. Both are needed for the game to work.`
- `p6`: `A web host (the page) and a network and server provider (the rooms) process data for us under data processing agreements. Rooms are stored in the EU; processing outside the EEA uses standard contractual clauses. We share data with nobody else.`
- `p7`: `Giving a name is optional. At the address above you can ask for access, rectification, erasure or restriction and object to processing based on legitimate interest; while the room exists, include its code and your name. You can complain to ANSPDCP, the Romanian data-protection authority (dataprotection.ro).`
- `p8` (unchanged).

**Romanian (tu)**
- `privacy.summary`: `Confidențialitate și operator`
- `p0` (unchanged).
- `p1`: `Cât joci, serverul camerei primește un nume opțional, notele, voturile și acțiunile tale. Le folosim doar ca să-ți oferim jocul pe care ai cerut să-l joci (art. 6 alin. 1 lit. b din GDPR). Colegii tăi îți văd numele și notele. Turul ghidat nu trimite nimic.`
- `p2`: `Adresa ta IP limitează cât de des se creează camere sau se intră în ele și ține serviciul în siguranță (interes legitim, art. 6 alin. 1 lit. f). Jocul nu o stochează; furnizorii noștri o prelucrează în propriile jurnale tehnice.`
- `p3`: `O cameră și tot ce conține sunt șterse când ultimul jucător a lipsit {minutes, plural, one {# minut} few {# minute} other {# de minute}}, sau {hours, plural, one {# oră} few {# ore} other {# de ore}} de la creare, oricare vine prima. Copiile de recuperare ale furnizorului pot păstra datele șterse până la 30 de zile.`
- `p4` (unchanged).
- `p5`: `Fără cont, cookie sau tracker. Browserul păstrează limba ta și, doar cât timp această filă e deschisă, locul tău în cameră. Amândouă sunt necesare ca jocul să funcționeze.`
- `p6`: `O gazdă web (pagina) și un furnizor de rețea și server (camerele) prelucrează datele pentru noi, pe baza unor acorduri de prelucrare a datelor. Camerele sunt stocate în UE; prelucrarea în afara SEE folosește clauze contractuale standard. Nu dăm datele nimănui altcuiva.`
- `p7`: `Numele este opțional. La adresa de mai sus poți cere acces, rectificare, ștergere sau restricționare și te poți opune prelucrării bazate pe interes legitim; cât timp camera există, trimite codul ei și numele tău. Poți face plângere la ANSPDCP, autoritatea română pentru protecția datelor (dataprotection.ro).`
- `p8` (unchanged).

`privacy.test.ts` keeps passing with these: p3 and p4 still carry the numbers; the p5 test looks for the words "language"/"seat" (EN) and "limba"/"locul" (RO), which remain; p7 keeps "access", "erasure", "room code", "ANSPDCP" and "acces", "ștergere", "codul", "ANSPDCP" (RO p7 now says "codul ei": the test looks for "codul camerei", so update that assertion to "codul"). In the Romanian p1 the old test is not affected.

## Owner's checklist outside the code (updated)

Done by the engineers (remove from your list): the 15-minute change, the identity line, the bases, retention wording, text-to-config test, field hints (except N3), EU jurisdiction in code.

1. **Verify the company data in `identity.ts`** against the trade register (CIF, Reg. Com., seat, contact address) and move the contact to a mailbox on the firm's own domain (N4).
2. **Accept and file the provider's data processing terms** (network and server provider) and **obtain/file the web host's**; note each one's location and sub-processors; note the standard contractual clauses or data-privacy-framework coverage. Without these, p6 is not true.
3. **Ask the server provider in writing**: (a) does deleting a Durable Object (`deleteAll`) also remove its point-in-time recovery data, and for how long can anyone recover it; (b) confirm that objects created through the EU jurisdiction run and store only in the EU; (c) whether its rate-limiting binding stores the client address. Adjust p3 and p6 to the answer.
4. **Check in staging that the EU restriction works** (N1) and make it fail closed.
5. **Read the real response headers** (page, an asset, the API) for `Set-Cookie`, and check the network zone for bot-management features and analytics auto-injection (N2). Confirm in the dashboard that Workers Logs, traces and log push are off for production; ask the web host how long it keeps access logs and shorten if possible.
6. **Write the short records**: processing record (art. 30), the legitimate-interest assessment for the IP address (three lines: purpose, necessity, balance), the decision note that no DPIA and no DPO are needed, a breach procedure (72 hours to ANSPDCP if risk; keep a log), and a rights-request procedure (one mailbox, one month, identity by room code and name, the answer "rooms are deleted automatically").
7. **Ask the lawyer** to confirm: 6(1)(b) versus 6(1)(f) for the game; the "no personal data" view of the public list (recital 26); whether Law 365/2002 art. 5 applies to a free game (it is met anyway); the exact numbering of Law 506/2004 art. 4 for the storage exemption; the cookie question if N2 finds one.
8. **Verify the authority's name and web address** before publishing (the text only names `dataprotection.ro`).
9. **Review the privacy text again** whenever a provider, a retention value, a stored key or the public list changes; the test covers the numbers and keys, not the providers.

## What I could not check

- Any account or contract: the host, the processor agreements, EU placement on the real platform, log settings, bot-management or analytics settings, whether the real response headers carry a cookie.
- Whether the real platform's recovery window survives `deleteAll`.
- The deployed Worker's behaviour; `region.test.ts` unit-tests `inRegion` only, not a real restricted namespace.
- The current ANSPDCP address and the registry data in `identity.ts`.
- The rendering of the new text in the browser (read from source; build-time `check-dist` not run by me).

## Summary of the score

7.5/10 now. With the owner's items 1 to 6 done and N1 to N4 applied, 8.5/10. With the lawyer's confirmations (item 7) and a real-platform check of the EU placement and of the headers, 9/10.
