# Two Pizzas: specification

The contract for everyone who builds or changes the game. The owner's decisions (from 15 November 2026, numbered 1–27) are in
`docs/handover.md`; this file turns them into rules. When a rule here and the code disagree, fix one of them in
the same change. Reasoning that would otherwise sit in a code comment lives here (section 10).

## 1. What it is

A free browser game on its own subdomain, twopizzas.faigo.ro, in which 3–6 beginners learn Scrum or Kanban by doing real cooperative
work in two short iterations and living through the events around it. Each player uses their own device; they talk over
their own call or in one room (the game carries no audio). Romanian and English, chosen by each player. One page on the
host; a real-time room server in Cloudflare.

Success for one session: a beginner can say the purpose, the timebox and the typical mistake of each event, and has
taken part in each once.

## 2. Parts and layout

| Part | Where | What |
|---|---|---|
| Core | `core/` | Pure TypeScript, no DOM, no network, no clock: tasks, the state machine, per-player views, scoring, observations. Runs in the Worker (authoritative) and in the browser (solo tour, local mode). |
| Room server | `worker/` | Cloudflare Worker + Durable Objects: one `Room` per code (WebSockets, hibernation), one `Leaderboard`. Imports the core. Its own `package.json` (wrangler). |
| Client | `app/` (Astro `srcDir`), `public/` | Preact app in one island, `app/ui/` (presentational components) and `app/game/` (screens, connection); copy in `app/i18n/`; styles in `app/styles/`. One page, `app/pages/index.astro`, plus `404.astro`. |

The root `package.json` is the client's (Astro, Preact, the fonts, TypeScript). Dependencies beyond those need the
owner's (orchestrator's) agreement first. `reference/piesa-lipsa/` holds the earlier no-server game the task generators
are ported from; it is deleted once the port is done.

The game is published on its own subdomain, `twopizzas.faigo.ro` (the owner's decision of 18 November 2026); the
firm's site stays at www.faigo.ro, lives in its own repository and is not touched from here. The two publish to
different web roots, so both workflows can be enabled.

## 3. Core rules

### 3.1 Purity and time
`reduce(state, action)` is a pure function: every action carries `now` (milliseconds, set by the server) and, where
randomness is needed, the state's own seeded generator. No `Date.now()`, no `Math.random()` in `core/`. The server
is the only authority: a browser never receives an answer, another player's private information or an item's true size.
`viewFor(state, playerId)` builds what one player may see.

### 3.2 Players and roles
- 3 to 6 players. The first to join is the host (chooses the framework when creating the room, starts the game).
- Names are optional (max 20 characters); the default is "Player N".
- Facilitator: in Scrum the **Scrum Master**, in Kanban the **facilitator**. A player may volunteer in the lobby;
  otherwise the host. In iteration 2 the role passes to the next connected player in join order. The facilitator also
  works on items like everyone else. The facilitator's screen carries the script of the current event and the controls
  that move it forward.
- The game itself is the **Product Owner** (Scrum) or the customer (Kanban): it owns the backlog order, accepts or
  rejects work and brings feedback.
- In the Daily Scrum the Developers run the event: any player may end it; the Scrum Master only sees that it happens and
  stays in its timebox.

### 3.3 Work items
An item has: an id (`#1`…), a kind (`review` = code review, `order` = deploy order, `incident`, `merge`), a size
(`S`, `M`, `L`; never shown to players), a business value (1–8), a theme (one of three), a subject (an English technical
name such as `payments-api`), an estimate (story points, from planning poker, optional) and a status:
`backlog → todo → doing → review → done`.

- People per item: `S` one worker; `M` and `L` two workers (a pair). Every `L` and some `M` also have a **dependency**:
  one piece of information is given to a player who is not on the item.
- A player takes an item (`todo → doing`); a pair item waits, visibly, until its second worker joins. When the workers
  are complete the puzzle is generated: each worker gets a part, the dependency holder (the connected player outside the
  item who holds the fewest dependencies) gets theirs in an "info you hold" list labelled with the item id. An item whose
  dependency exists shows as **blocked: needs info from the team** on the board until it is submitted.
- A player may be on several items but has one **open** at a time. Opening another item (to work on it or to review it)
  costs a context switch (`contextSwitchMs`, 8 s) during which nothing of it is shown. This is the one mechanic that
  makes high work-in-progress slow.
- Any worker submits the answer (`doing → review`). The server does **not** say whether it is right.
- **Definition of Done: reviewed by someone who did not work on the item.** A reviewer opens the item, sees all the
  information and the submitted answer, and answers **LGTM** (`review → done`) or **Request changes** (`review → doing`,
  same workers).
- At the end of the iteration the Product Owner accepts a done item only when its answer is right. A wrong answer that
  got an LGTM is an **escaped defect**: no value, and the item returns to the top of the backlog. Items not done return
  to the backlog (Scrum); in Kanban they are counted in the round's work item age and leave the board when the next round
  starts, and an escaped defect simply leaves the board.

Sizes change the amount of information (lines, components, rules), not the kind of thinking. A full item with all its
information in one view (the reviewer's, or an `S` worker's) takes roughly 30–45 s of attention.

### 3.4 The four puzzles (ported from `reference/piesa-lipsa/game/engine.mjs`)
- `review`: two copies of one configuration file, lines in a different order; the answer is the set of keys whose values
  differ. A pair holds one copy each; an `S` worker and a reviewer see both.
- `order`: the start order of components from "X starts after Y" rules; exactly one order fits all rules, never one
  worker's rules alone.
- `incident`: readings and numbered intervention rules; the first fitting rule wins and a later rule fits too.
- `merge`: a base file and each side's changes; a line changed by one side takes that change, a line changed by both
  follows the merge rule. The merge rule is the natural dependency piece.

### 3.5 Iterations and phases
Two iterations (a Sprint in Scrum, a round in Kanban). One machine, five phase kinds per iteration, then a summary:

| Phase | Scrum | Kanban | Timebox (it. 1 / it. 2) | Ends |
|---|---|---|---|---|
| `plan` | Sprint Planning | Replenishment | 6 / 4 min | soft |
| `work` (first half) | Sprint | Flow | 4 min | hard |
| `daily` | Daily Scrum | Daily at the board | 2 min | soft |
| `work` (second half) | Sprint | Flow | 4 min | hard |
| `inspect` | Sprint Review | Delivery review | 4 / 3 min | soft |
| `retro` | Sprint Retrospective | Retrospective | 5 / 3 min | soft |

Every phase opens with a card (purpose, timebox, who does what); its timebox starts when the facilitator begins it. A
soft timebox may be overrun; the overrun is recorded. A hard one ends on time. All durations and limits live in one
config object (`core/config.ts`) so that the pilot session can tune them.

**Scrum**
- Backlog at the start: 10 items (4 `S`, 4 `M`, 2 `L`), values and kinds spread so that priority order is not size
  order, three themes. Ordered by value.
- `plan`: (1) **Sprint Goal**: the Product Owner offers two (each: finish every item of one theme; +5 value when met),
  the players vote and the facilitator confirms one; (2) **estimation**: planning poker on backlog items in order, cards 1, 2, 3, 5, 8, 13, revealed
  together when everyone has voted or the facilitator reveals, one re-vote allowed, the facilitator records the
  estimate (default: the median) and may stop estimating at any time; (3) **commitment**: players pull items into the
  Sprint Backlog; the sum of estimates is shown, and in Sprint 2 the velocity of Sprint 1 beside it; the facilitator
  starts the Sprint (at least one item).
- `work`: the board (Sprint Backlog, In Progress, Review, Done) and the item workspace.
- `daily`: the Sprint clock is stopped. The board is walked from the right (Review, In Progress, Sprint Backlog); players
  may re-plan: leave an item, join one as second worker, promise help on a blocked one, take a review.
- `inspect`: (1) the Increment: each done item gets the Product Owner's verdict; (2) Sprint Goal met or not, value
  delivered, velocity (sum of estimates of accepted items); (3) feedback from the customers: a priority shift on one
  theme and three new items; the backlog is re-ordered.
- `retro`: (1) each player writes notes in three columns (went well / slowed us down / we will try), private until the
  facilitator reveals them; (2) two votes each; (3) **one** action: a working agreement the game can track or a free
  text one. In Sprint 2 the retrospective opens with the result of that action.
- Trackable agreements: a WIP limit (at most N items In Progress); nothing waits in Review longer than 60 s; nobody
  starts a new item while a blocked item has no helper; nobody starts a new item while an item is waiting for its
  second worker (sizes are never shown, so no agreement may name one).

**Kanban**
- Board: Ready, In Progress, Review, Done. Requests keep arriving (one every 45 s, eight per round, seeded) straight
  into Ready; an arriving request is marked "please start now".
- `plan` (Replenishment): the team chooses which requests of the opening pool (eight) enter Ready first (at most four).
  Steps: `card`, `replenish`, and in round 2 `limits`. A limit may be left unset, which is why "set WIP limits" can be
  an agreement that is kept or broken. Request changes may put an item back In Progress above the limit: it is not a
  start.
- Kanban's WIP metric counts In Progress and Review together; cycle time and work item age leave out the daily.
- Kanban observation ids: `work.limitReached`, `work.limitNeverReached`, `work.agedWork`, `inspect.throughputUp`,
  `inspect.throughputDown`, `inspect.cycleTimeFaster`, `inspect.cycleTimeSlower`. In round 2 it also sets the WIP limits of In
  Progress and Review, which the server then enforces.
- Round 1 has no limits. Round 2 starts from an empty board with a comparable set of requests and the limits.
- `inspect` (Delivery review): the four flow metrics of the Kanban Guide, throughput, cycle time (started → finished),
  WIP (its highest value) and work item age (of what is still open), plus escaped defects; in round 2 the two rounds
  side by side as a chart.
- `retro`: as in Scrum; after round 1 "set WIP limits" is the suggested agreement.

### 3.6 Learning layer
- Before: the phase card. During: the facilitator's script. After: up to two **observations** computed from what
  happened on the board (the game cannot hear the call), plus the event's typical mistake.
- Observation ids (the client holds the wording): `plan.overtime`, `plan.unestimatedPulled`, `plan.overcommitted`,
  `daily.overtime`, `daily.blockedUnhelped`, `daily.reviewWaiting`, `daily.planUnchanged`, `work.wipHigh`,
  `work.unfinished`, `work.waitingForPair`, `inspect.escapedDefects`, `inspect.goalMet`, `inspect.goalMissed`,
  `retro.noAction`, `retro.actionKept`, `retro.actionBroken`, and the positive ones: `plan.onTime`, `plan.allEstimated`,
  `plan.fitsVelocity`, `daily.onTime`, `daily.blockedHelped`, `daily.reviewFlowing`, `daily.planAdapted`, `work.wipLow`,
  `work.allFinished`, `inspect.noEscapedDefects`, `retro.actionChosen`.
- Observations are framework-aware: the ones about estimates, velocity and the Sprint Goal are raised only in Scrum;
  Kanban has its own about limits and flow.
- Notes: free text, at most 140 characters. "I don't know what to write" asks two or three short questions and proposes
  editable notes; questions and proposals are rules over the iteration's own numbers, written in advance. No AI model.
- Summary: the result, the recap of every event (purpose, timebox, typical mistake), printable.

### 3.7 Score and leaderboard
- Score: total value of accepted items over both iterations, plus Sprint Goal bonuses. Tie-break: fewer escaped defects,
  then (Kanban) lower average cycle time.
- Team name: generated (`adjective-animal`, lower case, from curated English lists); the host may ask for another in the
  lobby. Never typed.
- Published only when the facilitator presses "Publish result" on the summary, once per room. Stored: framework, team
  name, number of players, score, tie-break, date. Shown: top 10 of the current month and the all-time top 10, per
  framework.

## 4. Protocol

- `POST /api/room` `{ framework }` → `{ code }`. Same-origin only; 5 per minute per client address.
- `GET /api/room/<code>/ws` → WebSocket. The client sends `{ t: 'hello', playerId?, token?, name? }`; the server answers
  `{ t: 'welcome', playerId, token }` and then `{ t: 'view', view }` after every change that concerns that player. A
  player reconnects with their id and token (kept in `sessionStorage`) and gets their seat back.
- The client sends `{ t: 'do', action }`. An action the rules refuse is answered `{ t: 'error', code }`; codes only
  (`room_not_found`, `room_full`, `already_started`, `not_allowed`, `bad_request`, `rate_limited`).
- `GET /api/room/leaderboard` → both frameworks' lists; cacheable for 60 s.
- Limits: 2 KB per message, 20 messages per 5 s per connection, 6 players per room.
- Every view carries the server's `now`, so the client can show clocks without trusting its own, and `controls`: what
  this player may do right now, so the client never re-implements a rule.
- A player's token is kept by the room server, not by the core; joining is the server's own action.
- Room code: five letters from `BCDFGHJKLMNPRSTVWXZ`, generated by the server.

## 5. Room server

- `Room`: WebSocket hibernation API; state in the object's storage; an alarm for the next deadline (hard phase ends,
  request arrivals, clean-up). The room and everything in it are deleted when the last player has been gone for 15
  minutes (D-078) or 2 hours after creation, whichever comes first.
- `Leaderboard`: one object, SQLite storage; keeps only rows that can still appear in a list.
- Logs: event names, codes and counts only. Never a name, a note, a room code or an address.
- Routes on the game's host only (`/api/room*` on `twopizzas.faigo.ro`, from `SITE_HOSTS`), `workers_dev = false`, deployed by its own workflow
  (`publish-server.yml`) when `worker/**` or `core/**` change and publication is enabled (section 10). Tests with `node --test` against stubbed bindings, like the other two
  Workers.
- The page's `Content-Security-Policy` allows the site itself plus `wss://twopizzas.faigo.ro` in `connect-src`;
  nothing else.

## 6. Client

- Preact, one island; state = connection status + the last view + local interface state. Rendering is a function of the
  view; nothing about the game is decided in the browser.
- **Local mode**: the same interface driven by the core running in the browser, with scripted teammates. It powers the
  ten-minute **solo tour** for a visitor who arrives alone and lets the interface be developed without the server.
- Screens: start (create or join, solo tour, leaderboard), lobby, phase card, planning (goal, poker, commitment), board
  with the item workspace and "info you hold", daily, review, retrospective, comparison of the two iterations, summary.
- Every action is reachable by keyboard and by a button; dragging is never the only way. Focus moves to the new screen's
  heading. Timers are not announced every second. Contrast AA. Usable from 360 px; laid out for a laptop.
- Below the game: a short privacy text and exactly three outbound links to the primary sources of section 11 (opened
  in a new tab, `rel="noopener noreferrer"`). No other link. The page carries no byline and no identity block of the
  firm (the owner's decision of 16 November 2026).

## 7. Language and copy

- Two dictionaries with the same keys, `app/i18n/ro.ts` and `app/i18n/en.ts`; a missing key is a build error.
  Each player chooses (toggle); first visit: the browser's language, otherwise Romanian. Free text stays as typed.
  The language is remembered in the browser's `localStorage`; the seat (player id and token) in
  `sessionStorage`. The privacy text says both.
- **Technical terms stay in English in both languages**: Sprint, Sprint Planning, Daily Scrum, Sprint Review, Sprint
  Retrospective, Sprint Goal, Product Backlog, Sprint Backlog, Product Owner, Scrum Master, Developers, Increment,
  Definition of Done, story points, planning poker, velocity, WIP, WIP limit, cycle time, throughput, work item age,
  code review, deploy, merge, incident, blocked, LGTM, Request changes. The official event names are used; the everyday name appears once
  ("Sprint Review, often called the demo").
- In Romanian running text an English term used as a singular subject or object takes the hyphenated Romanian
  article ("Sprint Review-ul inspectează…", "Product Owner-ul", "Sprint Goal-ul"); a plural takes "-uri" after a
  hyphen ("Sprint Goal-uri"); the bare term stays after a preposition and in headings, buttons, labels and step
  titles; "Developers" is always bare. Card statuses use the board's own words in English in both languages (To
  do, In Progress, Review, Done, Blocked); "framework" stays English; the other person on a pair item is the
  "partner" in both languages; "escaped defect", "flow metrics" and "WIP limits" are the only names for those.
- A beginner meets a short gloss once for LGTM ("Looks Good To Me"), Request changes, timebox, WIP, planning poker
  and story points, where the term first appears.
- Romanian register, in detail: whatever speaks to one player is "tu" (hints, errors, the work list, puzzle tasks,
  the tour, the privacy text); buttons and step titles are singular imperatives ("Creează o cameră", "Intră",
  "Votează"); the facilitator's script speaks to one person about the team ("Roagă-i pe toți să…", "Întreabă
  echipa…"); "voi" is kept only for sentences about the team as a whole ("echipa voastră", "Ați terminat…", the
  helper's questions); proposals the team adopts stay in the first person plural; where "tu" and "voi" would sit
  side by side, the sentence is impersonal ("întâi se discută, apoi se votează"). A dictionary test forbids
  "dumneavoastră" and checks the one-player buttons.
- Romanian: friendly and informal: "tu" to a player, "voi" to the team, never "dumneavoastră" (the owner's
  decision of 16 November 2026: the formal plural read as stiff); natural, short, no figurative phrasing, "email" without a hyphen, a
  hyphenated word never breaks at its hyphen. English: plain, direct, no marketing tone.
- No names of platforms, vendors or tools in the copy. Nothing claimed about Scrum or Kanban that the primary guides do
  not support (section 11). Where the game uses a common practice that the guides do not prescribe (planning poker,
  story points, velocity, a WIP limit as a number, the Kanban meetings), the copy says so in a few words.

## 8. Look

A new look of its own, the look of a tool developers use, dark only: a review board. There is no light theme and no theme switch (the
owner's decision of 16 November 2026); the printed summary sheet alone is light, because it is paper. Slate
surfaces, IBM Plex Sans for text and IBM Plex Mono for ids, labels and anything code, status colours with one meaning
each (to do, in progress, blocked, in review, done), cards that read like work items, a stamp when an item gets its
LGTM. Playful in its moments (cards turning at the reveal, the stamp), calm otherwise; every animation respects reduced
motion. It imitates no existing product. The firm's name does not appear on the page.

### Usability first

The owner's decision of 18 November 2026: the user experience is the most important part of the game, because how
much a beginner learns, the habits they form and whether they recommend it depend on it. The interface is not
loaded: each screen has one primary action, one thing to read, and nothing a beginner does not need at that moment.
The principles of *Don't Make Me Think* (Steve Krug) apply: every screen is self-evident at a glance (if it needs its
hint, fix the screen); people scan, so visual hierarchy, clearly defined areas and obviously clickable controls;
needless words are cut; conventions over novelty and the primary action in the same place on every screen; the
"trunk test" passes on every screen (which game, which event, what can I do here, how do I go on); no surprises,
hidden required actions or dead ends. Usability is tested, not assumed: simulated first-time players before the
pilot, real beginners in the pilot.

The favicon is the Two Pizzas mark of the top bar (`public/favicon.svg`, and `public/favicon.ico` generated from it
at 16, 32 and 48 pixels).

- After the design review of 18 November 2026: every item shows its theme as a chip and the Sprint Goal's theme is
  marked; a missed goal lists the theme's items that kept it from being met ("wrong answer", or "not selected or not
  finished", which the view cannot tell apart after the review); the step buttons sit in one sticky action bar at the
  bottom and the puzzle's submit and verdict in a sticky footer, so the action is in view on a 1280×800 laptop; the
  facilitator's script is one line with a "Mark as done" tick and an "All steps" disclosure; the phase card shows
  purpose, timebox, Begin and the "Good to know" note, and folds roles, real life and the typical mistake; focus
  never falls to the page after an action; every control is at least 44 px high. The planning-poker result is the
  "middle card", the higher of the two middle cards when the number of votes is even, and the screen says so.

- Planning poker estimates the Sprint Goal's theme first: once the goal is confirmed, the next item to estimate is
  the first unestimated item of that theme in backlog order, then the rest (simulated usability test, 19 November
  2026: in backlog order the selected items stayed unestimated and velocity showed 0).
- When the work runs out before the clock: in Scrum the Developers may take Product Backlog items during the
  running work (`item.take` on a backlog item; it joins the Sprint Backlog of the current iteration, the Sprint Goal
  does not change, as the Scrum Guide allows), and the facilitator may end the half early (`work.end_early`, control
  `end_work`) when no item is To do, In progress or in Review and, in Kanban, no request is left to arrive. Kanban
  takes work only through Replenishment. The Scrum hint says once that a real Sprint keeps its fixed length and that
  ending early is a game shortcut to save time; the timebox gloss calls a timebox a maximum for most events and a
  fixed length for the Sprint (fifth fidelity review, 19 November 2026).
- After the third design review (19 November 2026): in a game on a phone (≤40rem) the top bar is one row (the mark,
  the clock, a 44 px Menu button) and Pause, Leave and the language live in the panel the Menu opens; the leave and
  pause confirms open inside that panel as stacked full-width buttons, so nothing widens the page at 360 px. The start
  screen keeps its inline language toggle. The cycle-time plot sizes its rows to the tallest dot stack with the title
  above it; the review chart and the age panel stack at full card width, the plot capped at 34rem. Every fold header
  is at least 44 px; the sheet's print button is hidden in print. A wrong verdict that still got an LGTM is explained
  once, in one line above the verdict list. Velocity counts only estimated items with a right answer, so an
  unestimated item counts 0: the commit step, the review and the summary say so when it matters. "Sprint Goal:" is
  followed by a lowercase goal.

## 9. Quality

- TypeScript strict. Core and Worker tests run with `node --experimental-strip-types --test` (so: no enums, no
  namespaces, no parameter properties; relative imports carry `.ts`; `import type` for types).
- No prose comments in code, in any syntax. API doc comments on exported symbols, one or two sentences, multi-line
  layout. What needs explaining goes into section 10.
- No names of people, no email addresses, no mentions in code, documents or commits.
- Before anything is shown as finished: tests, a clean build of both variants, the output check, and a browser run of a
  whole game on three pages. Before publication: a pilot session with real beginners, then the independent reviewers at
  9/10 each (design, Romanian copy, English copy, fidelity to the guides, usability, security of the room server, data
  protection, code quality, maintainability, architecture). Version 1 is done when every requirement (the owner's
  decisions and this contract) has its evidence, checked by an independent reviewer, and every reviewer gives at
  least 9. Each reviewer gets at most two more passes after 19 November 2026; what stays under 9 goes to the owner
  with its list. Only what a reviewer says blocks 9 is fixed; the rest waits for after version 1.
- Review scale, the same for every reviewer (proposed by the orchestrator and approved by the owner on 19 November
  2026, to be revisited later). A finding is a **blocker** when a beginner cannot finish a session, when data, security or the law is exposed,
  when the game teaches something the guides contradict, or when a check is broken; **major** when it confuses or slows
  many beginners on the main path, leaves a requirement partly met, breaks a rule of the domain on some screens, widths
  or one language, or makes defects likely; **minor** otherwise (polish, taste, small inconsistency). Scores: 10, no
  finding at all; 9, no blocker and no major, only minors, and every requirement of the domain has evidence; 8, no
  blocker and one to three majors; 7, no blocker and more majors or one systemic major; 5–6, at least one blocker;
  3–4, several blockers; 1–2, unusable, unsafe or unlawful. Each finding names its severity and its evidence; the
  score follows from the findings, not from impression. Only blockers and majors are fixed before version 1.
  Domain yardsticks: fidelity, the Scrum Guide 2020 and the Kanban Guide (section 11); language, natural and correct
  copy in the informal register, consistent terms; design, hierarchy, contrast AA, 44 px targets, no overflow from
  360 to 1280 px; usability, *Don't Make Me Think* (trunk test, one primary action, no hidden required step);
  security, an exploitable path or a missing defence against a likely threat; data protection, GDPR (lawful basis,
  transparency that matches the code, minimisation, retention, rights); code, correctness, tests on risky paths,
  coupling and clarity.
- Three reviewers play users (a beginner on a phone in Romanian, a facilitator running a session for a team, an
  experienced and sceptical developer on a laptop in English). They do not read the internal documents and do not gate
  version 1; the orchestrator acts only on a criticism that reproduces, hurts learning or the session's flow, and does
  not contradict an owner's decision.

## 10. Decisions and reasons

Each decision has a stable id. A new decision takes the next free number at the end; an id is never reused, and
a decision that no longer holds is marked superseded with the id that replaces it.

- **D-001.** The game is named **Two Pizzas** (a team small enough to be fed by two pizzas: the game's 3–6 players); the start
  screen says so once, in the line under the name. It was first called LGTM; the owner dropped that name on 15 November
  2026 because the abbreviation carries other meanings among developers. LGTM stays only as the review verdict and its
  stamp. The `lg-` prefix of the CSS classes and of the browser storage keys is kept: it is an arbitrary prefix and
  renaming it would change every component for no gain. The internal names `lgtm` (root package) and `lgtm-rooms`
  (Worker) are renamed with the repository.
- **D-002.** Publication is off by default: every publishing job runs only when the repository variable `PUBLISH_ENABLED` is
  `true`, in the `production` environment, with a concurrency group that never cancels a running publish. Host,
  account, directory and site address come only from secrets and variables (`FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`,
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; `FTP_REMOTE_DIR`, `SITE_URL`, `SITE_HOSTS`).
- **D-003.** The Worker's routes and its allowed origins are both derived from `SITE_HOSTS` at publish time (`--route
  <host>/api/room*`, `ALLOWED_ORIGINS` as `https://<host>`), so they cannot disagree and `wrangler.toml` names no host.
- **D-004.** Workflows pin every action by full commit SHA because publishing uses long-lived credentials. Resolved on 15
  November 2026: the upload action at tag v4.3.5 = `8e83cea8672e3fbcbb9fdafff34debf6ae4c5f65`; checkout v4 =
  `11d5960a326750d5838078e36cf38b85af677262`; setup-node v4 = `49933ea5288caeca8642d1e84afbd3f7d6820020`.
- **D-005.** The page publish builds without a package cache, runs tests, typecheck, build and `scripts/check-dist.mjs`, uploads,
  then fails only if the served home page is not byte-identical to the build; a wrong 404, a served sync-state file, a
  missing policy header or injected code are warnings. The live server is only ever asked for
  `GET /api/room/leaderboard`: a smoke test never creates a room.
- **D-006.** `scripts/check-dist.mjs` reads the site origin from `astro.config.mjs` and the three source addresses from
  `app/i18n/sources.ts`, allows nothing else but XML namespace identifiers, requires identical policies in `web.config`
  and `.htaccess`, and holds a size budget (JS 455 kB, CSS 150 kB, fonts 300 kB; 260, 61 and 206 kB on 15 November; 451, 90 and 206 kB on
  19 November, D-116).
- **D-007.** The review, retrospective and summary screens render only what the server's view holds: verdicts, scores, chart
  values and the average cycle time come from the view; nothing is computed in the browser.
- **D-008.** A control is offered whenever `view.controls` allows it and never under a stricter rule of the client's own: ending
  the retrospective without an action is allowed, because the observation that follows is the lesson.
- **D-009.** In the "I don't know what to write" helper, "Use" on a proposal sends the action and puts the text into the note
  field, where the player edits it and adds the note: a proposed note is never posted on the player's behalf.
- **D-010.** The public list on the start screen has a loading, a ready and an error state with a retry. Local mode shows no list
  and no publishing rather than a fake one.
- **D-011.** The summary prints as a sheet: light colours whatever the theme, no top bar, footer, banners or buttons, sections
  kept whole across pages.
- **D-012.** On the board, what the player should do now comes before the columns, on a phone and on a laptop: a beginner never
  hunts for the next action.
- **D-013.** The context-switch wait is shown as a countdown on the server's clock; its seconds are hidden from screen readers so
  a timer is never announced every second.
- **D-014.** Handing over a dependency piece is spoken, not an action of the game: the game cannot hear the call. The holder's
  "I have told the team" tick is private to that browser and changes nothing on the server.
- **D-015.** The Daily Scrum screen walks the board from right to left (Review, In Progress, Sprint Backlog) with three counts:
  blocked items without a helper, items waiting for a reviewer, items waiting for a second worker.
- **D-016.** In local mode the scripted teammates leave room for the human: they wait before taking an item, a review or a pair
  slot, always leave one item to take, and do not submit an item the human shares during its first minute. These are
  rules of the local teammates, not of the core.
- **D-017.** What a player may do with an item (`ItemView.actions`) is computed by the same guard functions the reducer uses
  (`core/machine/rights.ts`); a test proves that an action is listed exactly when the reducer accepts it. The client
  shows item controls from that list and keeps no copy of the rules.
- **D-018.** The Sprint Goal is in the view (`view.goal`: theme, done, total) in every timed phase of a Scrum iteration once it is
  confirmed, counted over the same items as the goal metric: every item of the theme, selected or not. The goal is met
  only when all of them are done with a right answer at the end of the Sprint, and the copy says so where the goal is
  chosen and where items are selected: a team that wants the goal has to select every item of the theme.
- **D-019.** The summary carries the observations of the whole game as ten fixed slots in play order (plan, daily, work, inspect,
  retro, twice), grouped by the prefix of the observation id, so the session sheet can say what happened in each event.
- **D-020.** The outcome of a tracked agreement carries how many times the board went against it; an untracked (free-text) action
  has no count.
- **D-021.** One action asks for another team name: in the lobby (host) and at the summary (facilitator, until the result is
  published), on the same generator and the same counter of attempts.
- **D-022.** The helper's view returns the player's own answers, never another player's, so the chosen answers survive a reconnect.
- **D-023.** The facilitator has a script during the work phase as in every other phase.
- **D-024.** The customers' feedback adds three items (one small, two medium), as `config.feedback` says.
- **D-025.** The page's policy carries no `'unsafe-inline'`: `npm run build` ends with `scripts/csp-hashes.mjs`, which writes into
  the built `web.config` and `.htaccess` the SHA-256 of every inline `<script>` and `<style>` block (the hashes change
  with every build), and the policy sets `script-src-attr 'none'` and `style-src-attr 'none'`. The files in `public/`
  hold `script-src 'self'; style-src 'self'` with no hashes, so a build that skips the step breaks visibly instead of
  opening the policy. A build into another folder (`npx astro build --outDir <dir>`) needs
  `node scripts/csp-hashes.mjs <dir>` after it. `scripts/check-dist.mjs` fails on a missing or extra hash, on
  `'unsafe-inline'` or `'unsafe-eval'`, and the hash step fails on an inline handler, a `style=` attribute or a
  `javascript:` address.
- **D-026.** Each publishing workflow builds in a job without secrets, hands the result over as an artifact, and publishes in a
  second job that holds the secrets: the page job runs no package manager at all; the server job installs only the
  deploy tool, without install scripts, and uploads the bundle built before. The project's dependency tree never runs
  next to the credentials. Artifact actions pinned on 16 November 2026: upload v4 =
  `ea165f8d65b6e75b540449e92b4886f43607fa02`, download v4 = `d3f86a106a0bac45b974a628896c90dbdf5c8093`.
- **D-027.** In Kanban no card shows an estimate, and no screen shows a Sprint Goal, velocity or story points.
- **D-028.** A WIP limit is shown on its column header as current/limit and turns into a labelled "reached" state when the count
  equals the limit. When the limit stops a player, the control stays visible, disabled, with the reason in one line
  next to it, and the "what you should do now" area says what frees a slot.
- **D-029.** A request that arrives is marked on its card for twelve seconds and announced once in a polite status line; focus
  never moves.
- **D-030.** Setting limits in round 2 is optional, as the core allows; with none set, the screen says the round would run like
  round 1.
- **D-031.** The Delivery review shows the four flow metrics with one plain sentence each; every number and the comparison of the
  rounds come from the view.
- **D-032.** In local mode a scripted facilitator pulls three requests and sets the limits to three in In Progress and two in
  Review; scripted teammates respect the limits.
- **D-033.** Copy after the fidelity review of 16 November 2026 (report in `.qa/reviews/`): the Sprint is the container of the
  other events and its card is "Sprint: the work"; a timebox is never called soft (the game lets the clock run and
  records the overrun; in Scrum an event ends within its timebox); the game "checks each finished item's answer" and
  the verdicts read "Right answer" and "Wrong answer (escaped defect)", because the Scrum Guide has no acceptance
  step; the three accountabilities are called so; a Sprint Goal option is an objective, measured in the game by the
  items of its theme; the Definition of Done is defined once in the game's words; items are "selected" in Scrum and
  "pulled" in Kanban; Kanban round 1 runs without WIP control on purpose and the copy says that Kanban asks for it.
- **D-034.** The note that a practice is common but not in a guide is visible on the phase card without opening anything, and
  again where the practice is used: on the planning poker screen, where velocity plans Sprint 2, and on the WIP-limit
  agreement in a Scrum game. A dictionary test forbids the phrases the review removed.
- **D-035.** The observation block names the event its "typical mistake" belongs to.
- **D-036.** The room's secret is 256 bits of the server's randomness, kept only in the room's state. Every random draw of the
  game is a SHA-256 stream of (secret, label, counter) (`core/sha256.ts`, `core/rng.ts`; SHA-256 is written in plain
  synchronous TypeScript because the core may not use an asynchronous API), and an item's puzzle key is derived from
  the secret and the item's label: no 32-bit value links anything a player sees to an answer. The first design used a
  32-bit seed that the public team name gave away (security review of 16 November 2026).
- **D-037.** Team names come from an independent 32-bit `nameSeed`; a public name reveals that value and nothing else.
- **D-038.** How many workers an item needs is shown only once the item is started, so its size stays hidden during estimation.
- **D-039.** WebSocket upgrades are limited to 120 per minute per address (several teams of a class can sit behind one address
  and reload together); room creation stays at 5 per minute. A socket that sends no valid `hello` within 5 seconds is
  closed; unjoined sockets are capped at 8 per room and never take a seat; at the cap the oldest unjoined socket is
  closed and the newcomer accepted, so idle sockets cannot keep a player out. The room code stays five letters because
  it is said aloud: with 50 live rooms, one address needs about seven hours of probing for a single hit, and a hit
  lands in a lobby the host can lock.
- **D-040.** A socket the room has closed stays listed by the platform until the other side finishes closing. The room marks it
  as closing and ignores it everywhere (seats, alarms, sweeps, broadcasts), and never arms an alarm less than one
  second ahead: the first version of the sweep re-armed its alarm in a loop for as long as a client did not read
  (second security review, 16 November 2026). The test harness keeps closed sockets listed for the same reason.
- **D-041.** The host can remove a player in the lobby (`lobby.kick`, control `kick_player`); the removed browser is told so and
  does not reconnect; it is a removal, not a ban. The host can lock the room to newcomers (`lobby.lock`, controls
  `lock_room` and `unlock_room`, refusal `room_locked`); seated players still come back with their tokens. After the
  start nobody joins.
- **D-042.** Close codes: 4000 the seat was taken over by another connection (the page stops and offers "Use this tab"), 4001
  removed by the host, 4002 silent for 90 seconds, 4003 no `hello` in time or evicted as the oldest unjoined socket.
- **D-043.** The client sends `ping` every 30 seconds, answered by the platform without waking the room; the room's alarm drops a
  seat after 90 seconds of silence.
- **D-044.** The room writes its state and re-arms its alarm only when the state changed, in one write; a refused message costs
  no write and is answered only to its sender.
- **D-045.** The public list is cached for 60 seconds; a team that just published may wait a minute or two to see itself.
- **D-046.** Names and notes keep letters and combining marks and lose control, format, private-use and filler characters and
  stacks of more than three combining marks.
- **D-047.** An empty `ALLOWED_ORIGINS` allows no origin; local origins come only from the `dev` script. Platform logs are
  switched off in the configuration.
- **D-048.** Accepted: one person can play every seat and publish a score, because the game has no accounts; the public list is
  for fun and proves nothing about who played, and the copy under the list and under the publish panel says so. The
  reviewer of an item sees the whole puzzle because reviewing needs it.
- **D-049.** The job that publishes the server checks out the repository, installs its deploy tool from the repository's own
  lock file and takes the Worker's configuration from the repository too; from the build job's artifact it takes one
  file, the bundled code, and nothing that the deploy tool reads as configuration.
- **D-050.** The start screen has two zones that cannot be mistaken for each other: playing with a team (create or join a room,
  the primary colour) and the solo tour, which has a colour of its own, carried into the tour's coach panel, and looks
  like a route with numbered stops. The tour is announced as "about 10 minutes" and is long enough to deserve it: the
  visitor really solves, hands over, reviews and takes part in a retrospective (the owner's decision of 16 November
  2026: a two-minute tour said too little and looked like an afterthought).
- **D-051.** At laptop width the two zones of the start screen sit side by side (stacked, the tour zone fell to the edge of the
  first screen and read as an afterthought); below 64rem they are two full-width blocks, the team zone first. The
  tour's colour is a magenta (`--lg-tour` and its companions in `app/styles/tokens.css`), between the review purple and
  the rejected pink and far from the amber of the primary action; every pairing passes AA.
- **D-052.** The guided tour has fourteen steps (fifteen in Kanban, where one shows a WIP limit stopping a start): the idea, the
  board, take an item, solve an item alone, switching, two people on one item (the partner's part is shown as a
  labelled scripted line standing in for the call, copied from the partner's real part in the engine's state), info
  you hold, two reviews (a right and a wrong submission), the daily, the review with both verdicts, and the
  retrospective's notes, votes and action. Step copy is keyed by step id. On a step with a task the first Tab lands on
  the control the task needs, and "Next" takes focus when the task is done. A reader who does every task needs about
  seven to ten minutes; the start screen says "about 10 minutes".
- **D-053.** Micro-learning (the owner's decision of 18 November 2026): every event card names one learning objective in one
  sentence, and the next screen opens with one check question about the event just played (three choices, one
  right, the right answer and a one-line reason shown after the choice). The questions are the player's own
  learning, not the team's score: they are kept in the browser for the session, never sent to the server, never on
  the public list; the summary sheet shows how many the player got right. Every question and answer must be
  supported by the guides of section 11.
- **D-054.** Micro-learning as built: the objective is the first line under the card's title; the check question for an event
  appears on the next card (for the Daily Scrum, as a strip above the board in the second half; for the last
  retrospective, on the summary), with three choices and "Skip" on one row, never moving "Begin"; at 1280×800 it
  sits in the card's right column, at 390 px below the card. Each event has two variants; the variant and the order
  of the choices come from the room code, so the whole team sees the same question and can talk about it on the
  call; the two iterations ask different variants. Answers live only in the browser's memory for the session. The
  summary says "You answered n of m right" (skipped ones excluded) and lists the questions with their answers.
- **D-055.** The pause is a quiet button in the top bar that opens a small chooser (1, 5, 10, 15 minutes; 5 preselected);
  while paused a calm banner shows the time left and "I'm back"; the others see the avatar dimmed with "away until
  HH:MM" in local time.
- **D-056.** The solo tour runs on the engine in the browser: eight prepared situations, each built from a fixed secret through
  the reducer, shown on the real screens under a coach panel. No view is made by hand. The stage is still (no scripted
  teammate acts, no deadline runs), so a visitor who pauses never meets a phase change. A step's task uses the real
  control; when the engine's state shows it done, the panel says so and waits: the tour never moves on by itself.
  "Step n of 8" sits in the heading that takes focus, so it is announced once. The switching wait is the real one
  (eight seconds): the core's configuration is not changed for the tour. The full local game with scripted teammates
  stays reachable only through `?local=1` and is not offered on the start screen.
- **D-057.** In local mode "Skip ahead" plays the whole team, the human seat included, and scripted teammates answer wrongly a
  quarter of the time and miss nearly half of the wrong answers they review, so that both verdicts appear in local play.
- **D-058.** The summary sheet lists the observations of every event of both iterations, on screen and in print.
- **D-059.** The room keeps only the SHA-256 of each seat's token and compares hashes in constant time; the token is sent once,
  when the seat is created, and a reconnect's `welcome` carries none (the page keeps the one it stored). A token is
  192 random bits, so an unsalted hash is enough.
- **D-060.** A seated player proves the seat when the WebSocket is opened and is exempt from every cap of the room. The page
  offers the subprotocols `lgtm.v1` and, when it holds a seat, `seat.<playerId>.<token>` (the only header a browser can
  set on a WebSocket; never the address, which ends up in logs). The room checks the token's hash before any count; a
  match binds the socket to the seat at once, anything else is treated silently as a stranger, and the answer selects
  `lgtm.v1`, never the seat entry. `hello` remains for newcomers. The wire name `lgtm.v1` is an internal identifier
  kept from the game's first name.
- **D-061.** Only live sockets count against the caps that can refuse a person (12 joined, 8 unjoined). Sockets the room has
  closed and the other side has not acknowledged are not counted; a backstop of 128 listed sockets (D-062), for memory only,
  refuses strangers and never a proven seat. A first version capped all listed sockets at 64 and turned 64 stalled
  connections into a way to keep every returning player out for the room's lifetime (fourth security review, 16
  November 2026).
- **D-062.** The backstop is 128 because a stalled socket cost about 0.43 MB of memory on the local runtime and a Durable Object
  has 128 MB in production (fifth and sixth security reviews, 17 and 19 November 2026); seated players are exempt, so
  only newcomers can meet it. The staging test measures the real cost per socket before publication; if it is above
  0.25 MB, the value goes down until 128 sockets fit in 32 MB.
- **D-063.** The per-address limit on upgrades applies before the room is reached, to seated players too: behind a busy shared
  address a returning player may wait until the minute's window moves; the page retries without limit once seated.
- **D-064.** Kanban copy tells apart a round without limits by design (round 1) from a round where the team set none (round 2).
- **D-065.** The feedback at the Sprint Review comes from "stakeholders", the Scrum Guide's word; "customer" is kept for the
  game's own device in Kanban.
- **D-066.** The static page declares `lang="ro"` (the fallback language) and carries the Romanian description; the app sets the
  language of the document when it starts.
- **D-067.** The server decides everything and hides the answers because a public leaderboard makes a browser-side check worthless.
- **D-068.** Correctness is revealed only at the review of the iteration, so that the reviewer's LGTM is a real responsibility and
  an escaped defect can exist.
- **D-069.** One context-switch delay instead of separate rules for multitasking: the same cause makes an unlimited Kanban round
  slow and makes a WIP agreement pay off in Sprint 2.
- **D-070.** The Daily Scrum is a walk of the board toward the Sprint Goal, not three questions; the 2020 Scrum Guide no longer
  prescribes the questions and the walk surfaces blocked and waiting work, which the game can see.
- **D-071.** Suggestions for notes come from rules, not from a language model: no cost per session, no text sent to a third party,
  wording that can be reviewed in advance.
- **D-072.** Voice stays outside the page: it would need the microphone, a relay for some networks and a longer privacy text.
- **D-073.** An escaped defect returns with its value and its estimate: it delivers nothing in the Sprint it escaped from and
  can still be delivered in the next.
- **D-074.** After the Daily Scrum the second half of the Sprint starts at once, without a card of its own: the Daily Scrum's
  card is the bridge.
- **D-075.** The customers' priority shift may lift a value above 8; the 1–8 range holds only when an item is created.
- **D-076.** A tied Sprint Goal vote goes to the first option offered.
- **D-077.** One delay (60 s) decides when a disconnected player's items are released and their role passes on; a returning
  player gets the seat back, not the role or the items.
- **D-078.** A player may take a personal pause and chooses its length, from 1 to 15 minutes, 5 by default (the owner's decision
  of 18 November 2026): while paused, their items and their role stay reserved for that time instead of being released
  after 60 s; the others see that they are away
  and until when; the team's clock keeps running. A room that is empty is deleted after 15 minutes, not 5, so that a
  team that takes a break together does not lose its game.
- **D-079.** The pause is `player.pause { minutes }` (1–15) and `player.resume`, allowed from the first event card to the end
  of the last event, not in the lobby or the summary; every player's view carries `pausedUntil`. A pause ends when
  its time runs out (then the usual 60-second grace starts), when the player comes back with the seat, presses
  "I'm back" or acts. The silence sweep only marks a paused seat disconnected and releases nothing.
- **D-080.** The rooms and the public list are created in the EU jurisdiction of the platform (`DO_JURISDICTION = "eu"` in
  `worker/wrangler.toml`, so a plain deploy is restricted). The restriction fails closed: only the exact value `local` lifts it, so a missing
  or mistyped setting still keeps the data in the EU, and a test pins the value in `wrangler.toml`. The local runtime
  does not implement jurisdictions, so the committed `worker/.dev.vars` sets `local` for `wrangler dev` only; it holds
  no secret and is never deployed.
- **D-081.** The provider documents point-in-time recovery of up to 30 days for this kind of storage and does not say whether
  it survives deletion; the privacy text says so until the provider confirms otherwise in writing.
- **D-082.** The privacy text matches what the code does (third GDPR review, 19 November 2026): the IP address reaches the server
  already when the page loads the public list, not only on create or join; the guided tour sends no game data; the
  language is remembered because the player picked it, not because the game needs it; the public list keeps a result
  while it stays in the monthly or the all-time top; the rights include a portable copy (art. 6(1)(b) brings
  portability in scope) and a copy of the standard contractual clauses can be asked at the contact address. Tests pin
  portability and the clauses sentence.
- **D-083.** Team names are generated so that the public list needs no moderation and holds no personal data.
- **D-084.** Focus after an in-place action: when the focused control disappears, focus moves to the control at the same place in the
  nearest enclosing list that still exists (the next item's button), else to the screen's heading. Notes return focus to
  the note field. Repeated controls carry an accessible name made of the visible label, a colon and the item ("Take: #7
  file-uploader"), so a label stays in its name; the end-to-end driver matches a name with an optional ": ..." tail.
- **D-085.** The observations of the previous event sit on the next event's card in a folded block titled with that event ("What
  happened in Sprint Planning"), after the card's own content, so they are never read as the current card's text; the
  Scrum note that a WIP limit comes from Kanban lives inside that fold and appears only with a WIP observation.
- **D-086.** The real duration and the timebox gloss are visible on every Scrum card under the timebox box; Kanban cards keep the
  fact in the fold because the visible line already says the Guide has no timebox.
- **D-087.** The check question for the Kanban Flow is pinned: round 1 asks the first set, round 2 the WIP-limit set, because the
  limit is only shown in round 2. Each Scrum event carries one duration question; the Review and retrospective sets
  no longer ask how the event is run.
- **D-088.** On the phone the tour's coach is followed by a sticky bar at the bottom (step, one-line task, Back and Next); the
  partner's scripted line sits in the item card next to the puzzle. A note written in the tour is carried into the
  vote scene instead of being replaced by a sample note.
- **D-089.** Stored state carries `StateVersion` (2 since 19 November 2026). On load, a state of another version, or one without
  a numeric version, ends the room exactly as an expired room ends: log `state_outdated`, close every socket with
  1001 `room_closed`, delete the storage and the alarm, drop a pending leaderboard entry. A returning client then
  gets `room_not_found` and clears its seat, so no new copy is needed. A change to the stored shape bumps the version;
  there is no migration, because a room lives a few hours at most.
- **D-090.** A machine exception never reaches the platform: the room handler wraps every `reduce`, logs `machine_error` with
  the action type only, answers `bad_request` and keeps the state; if the deadline step throws, the player's action
  is not applied. After a fault the alarm ignores the machine's deadline, so it backs off to socket silence or the
  room's lifetime instead of retrying in a loop.
- **D-091.** The serialised state of a finished six-player game is about 30 KB in Scrum and 38 KB in Kanban (three seeds each),
  under 30 % of 128 KiB, the stricter per-value storage limit; `core/test/state-size.test.ts` pins it. One room action
  on a full game costs about 1.2 ms (Scrum) and 1.6 ms (Kanban) on average, 10 ms at most
  (`worker/test/benchmark.test.ts`); the JSON clone stays because `structuredClone` measured twice as slow.
- **D-092.** Module layout after the code review of 19 November 2026: `core/types.ts` re-exports `state.ts`, `views.ts`,
  `actions.ts` (actions, messages, the machine contract) and `errors.ts` (error codes, close codes). The action list
  is checked at compile time: `parseAction` is a table keyed by every action type, and `dispatchServer` and
  `dispatchPlayer` end in a `never` case. The room handler keeps load, step, persist, schedule, broadcast and
  admission and delegates to `SeatRegistry` (token hashes, seat proof), `SocketPolicy` (caps, rate limit, sweep) and
  `Outbox` (leaderboard delivery, cleared only if the sent entry is still the queued one). The room-code check
  (`isRoomCode`) is shared by server and client. `npm run test:all` runs the root, worker and output-check tests.
- **D-093.** Seeded random legal play (`core/test/machine-random.test.ts`, both frameworks, 3–6 players) checks the machine's
  invariants: one valid status per item, unique ids, no dangling player, a refused action leaves the state identical,
  the deadline step is idempotent, and views never leak.
- **D-094.** The client's logic is tested under `node --test` with type stripping (`app/game/test/`): the remote
  transport takes an injected environment (socket, timers, random, seat storage) and is driven by a fake socket and
  fake timers; the controller is tested with stubbed globals; the local room plays whole games through `skipEvent`;
  every tour step's action is accepted by the reducer. The page's behaviour does not change. Rendering (`.tsx`, DOM)
  is covered by the browser runs, not by unit tests.
- **D-095.** CI runs `npm run test:all` (root, room server and output-check tests in one step). The whole-game browser
  runs stay a manual release check, run before every review round and before a release: they take about 50 minutes and
  need three real browsers and a local room server.
- **D-096.** After the fourth design review (19 November 2026): on a phone the tour bar is one row ("Step n of N",
  a toggle and Next) with Back and the task behind the toggle; the puzzle's footer stays sticky but lower, and during
  the tour the verdict note is hidden on phones, so the puzzle keeps about two thirds of the viewport and Submit stays
  above the bar. The phone Menu holds Pause and Leave as 44 px bordered buttons, takes focus on open and closes after
  a pause starts; after "I'm back" focus returns to Pause, or to the Menu button on a phone. The logo link is 44×44 on
  a phone. The language toggle is inline in the phone header only in the lobby and while connecting; in a running game
  it lives in the Menu.
- **D-097.** In Kanban, while requests are still arriving and the board is empty, "What you should do now" says how
  many requests are still coming and that the finish appears once they have all arrived; the engine rule (finish only
  after the last arrival) is unchanged. The design kit has a Kanban finish screen (wait line, finish bar, open
  confirm) so the control can be reviewed before a team can reach it in play. From 1000 px up the cycle-time plot and
  the "Items still open" card sit side by side.
- **D-098.** Every fold shows a disclosure marker (▸ closed, ▾ open) in the accent colour, because a fold header
  laid out as flex loses the browser's own triangle and then reads as a dead heading (fifth design review, 19
  November 2026: the "What happened in …" fold on the retrospective).
- **D-099.** `FrameworkRules` (`core/machine/rules.ts`) is the only place the core branches on the framework: the flags
  `wipLimits` and `backlogPull` and the hooks `onIterationStart`, `onWorkBegin`, `onWorkTick` (arrivals), `wipCount`,
  `cycleTime`, `openAge`, `observationCandidates`, `scriptSteps` and `view`. The Scrum and Kanban parts live in
  `scrum-plan.ts`, `scrum-view.ts`, `flow.ts`, `kanban-view.ts` and `candidates.ts`; a third framework means one more
  table entry. The few remaining comparisons are Kanban's own guards in `flow.ts`, the wire validation and the
  Kanban ordering of the public list in the worker, and the single narrowing in the client.
- **D-100.** `PlayerView` is a union of `ScrumPlayerView` and `KanbanPlayerView` on `framework`. A field one framework
  lacks is absent from its view: a Kanban view carries no goal, poker, velocity or customer feedback; a Scrum view
  carries no limits, board numbers, replenishment, flow or comparison. The client asks for the framework in one place:
  `byFramework` (`app/game/framework.ts`) narrows the view once, and `profileOf` gives capability flags and copy keys,
  so screens do not compare the framework themselves. The view's wire shape changed with this (fewer keys per
  framework), which a stored fixture or an outside reader of the view would notice.
- **D-101.** Tests that pin a trap explained by a decision carry its id in their name (for example D-036, D-046,
  D-061, D-062, D-077, D-089, D-091), so a failing test leads to its reason.
- **D-102.** Sprint Planning shows the team's capacity in the selection step of both Sprints, next to the sum of the
  estimates: the number of connected Developers and the Sprint's minutes of work ("Capacity: 4 Developers, 8 minutes of
  work"), computed by the server in the Scrum planning view. There is no points formula, because the Scrum Guide asks
  for the team's upcoming capacity, not a conversion; in Sprint 2 the velocity of Sprint 1 stays beside it (the
  owner's decision 5; requirements audit, 19 November 2026).
- **D-103.** The packages carry the game's name: `two-pizzas`, `two-pizzas-worker`, and the Worker `two-pizzas-rooms`.
  The verdict value `lgtm`, the protocol name `lgtm.v1`, the `lg-` prefixes and the Durable Object classes and bindings
  keep their names (D-001). `sharp` is no longer a dependency: the build uses no image service.
- **D-104.** The phase clock is `role="timer"` with its live region off, so a screen reader is never told the time
  every second; the contract lives in `app/ui/timer-aria.ts` and is pinned by tests. Colour tokens are tested against
  WCAG AA for named pairs (`app/game/test/contrast.test.ts`): 4.5:1 for text, 3:1 for borders and focus rings; the
  focus ring is drawn with an offset on the surrounding surface, never on an accent fill.
- **D-105.** Each whole-game run answers one check question on the first page (Romanian) at the first work card of
  each framework and asserts the verdict, the right answer and a reason from the dictionary (compared with the
  page's non-breaking hyphen read as a plain hyphen).
- **D-106.** The tour's scenes follow the player's own actions (beginner user test, 19 November 2026): the player's
  item is the first order-kind solo item; the two items to verify are always a teammate's, never the player's solo or
  pair item; the wrong one is the item the Review later shows as an escaped defect, worked by a scripted teammate and
  approved by another, and the text says so. The Daily scene starts with the help already promised in step 7. In
  Kanban the spare item at the switch is the right-review item, because the backlog has only three solo items. The
  tour defines in plain words, once and where first used, Sprint Backlog, Developers, Request changes, Increment and
  WIP limit; the terms themselves stay in English. The closing quick question is pinned to what the tour showed (what
  the retrospective plans). On a phone during the tour the puzzle's Submit sits in the page flow, not sticky.
- **D-107.** An observation, a help proposal or a Daily summary line whose count or wait is 0 is never shown; a Daily
  with nothing waiting says so in one line. In the tour's vote scene the player's own note keeps its column and no
  sample note appears twice.
- **D-108.** A create or join that fails without a known reason in the answer (a non-OK status without a body, a
  network failure) means the room server cannot be reached: the start page says so and offers the guided tour, which
  needs no server, with a button. Refusals with a known reason (a full room and the others) keep their own messages.
- **D-109.** A connection attempt that gets no open or no first answer within `config.room.connectTimeoutMs` (10 s,
  twice the server's hello deadline, to allow a cold start) counts as a failed attempt: it feeds the back-off and the
  rule that three failed attempts before any welcome are fatal; after a welcome a stalled reconnect only retries. The
  connecting screen keeps its Leave control, so a page is never stranded (facilitator user test, 19 November 2026). A
  fatal network error keeps the seat, so a rejoin stays possible after a short outage.
- **D-110.** The lobby has one closed fold, "How the session goes", built from `sessionAgenda()` (`core/agenda.ts`),
  which reads the timeboxes in the config so the two never drift: the events in order with the game minutes of each
  iteration, the total (45 game minutes), the note that these are the game's minutes and not real timeboxes, and that
  with talking a session takes about 45–60 minutes.
- **D-111.** The Sprint Goal vote lists under each theme its Product Backlog items (id and name, in backlog order),
  from the items the view already carries, because a Sprint Goal is chosen from the Product Backlog.
- **D-112.** A player's unsent puzzle answer (order, incident action, merge values, review marks) is kept per item in
  the client (`app/game/drafts.ts`) across phase changes, so a half that ends on the clock does not lose it; it is
  restored only if it still fits the item's part, and dropped when the view shows the item submitted, no longer in
  progress or no longer the player's, and on leaving. The server stays the authority (developer user test, 19
  November 2026).
- **D-113.** Every confirm opens with focus on Cancel; Escape cancels and returns focus to the control that opened it.
  Ending the retrospective with no action chosen asks first. The Sprint Goal radio's accessible name is the theme
  only; the theme's item list is its description (`aria-describedby`).
- **D-114.** The Kanban delivery review states both facts: in real work an open item stays open and its age keeps
  growing; the game starts round 2 on a fresh board so the two rounds compare fairly. The age line says that age
  counts all the time since the start, meetings included.
- **D-115.** The task generators never give a pair what the outside piece holds (order: the withheld clue is always an
  adjacent link and the pair's own clues cannot imply it; incident: the held reading changes the first-fit action;
  merge: the rule is hidden from the pair; review: the ignore list names only keys that differ), pinned over 60 seeds
  by `core/test/tasks-dependency.test.ts`.
- **D-116.** The JS budget of the output check is 455 kB (raised from 450 kB on 19 November 2026, at 451 kB after the
  user-test fixes). The growth since 15 November comes from the tour, micro-learning, the per-framework screens and the
  fixes; the budget stays a ceiling, and splitting the bundle is on the list for after version 1.
- **D-117.** Text files are stored with LF line endings (`.gitattributes`: `* text=auto eol=lf`, images and fonts
  binary), because editors and tools on Windows wrote CRLF into some files and made whole files look changed in a
  diff. The commit that adds the rule renormalizes the index once.

## 11. Sources

Checked on 15 November 2026 by fetching the pages; quotes are fragments and must be re-read against the full text before
any copy that leans on them is published.

| Source | State | Reuse |
|---|---|---|
| The Scrum Guide, `https://scrumguides.org/scrum-guide.html` | November 2020 edition; English is the only official text. A community Romanian translation (November 2020) is listed on `https://scrumguides.org/download.html` (its PDF address was not opened). | CC BY-SA: short quotes with attribution and a link. |
| The Kanban Guide, `https://kanbanguides.org/english/` | v2025.5 (May 2025). No Romanian translation. | Creative Commons; the page names two different variants, so check before copying text. |
| The Agile Manifesto, `https://agilemanifesto.org/`, Romanian `https://agilemanifesto.org/iso/ro/manifesto.html` | 2001; twelve principles on a second page. | May be copied freely only whole and with its notice: link to it, do not excerpt. |

These three are the page's outbound links. A companion "expansion pack" to the Scrum Guide exists (2025) but is not on
the Guide's site and is not treated as authority here.

What the Scrum Guide says, and the game must not contradict:
- Timeboxes for a one-month Sprint: Sprint Planning at most eight hours, Sprint Review at most four, Sprint Retrospective
  at most three; the Daily Scrum is "a 15-minute event for the Developers of the Scrum Team". The game's minutes are a
  scale model and the phase card says so.
- Purposes: Sprint Planning "initiates the Sprint by laying out the work to be performed"; the Daily Scrum is "to inspect
  progress toward the Sprint Goal and adapt the Sprint Backlog as necessary"; the Sprint Review is "to inspect the outcome
  of the Sprint and determine future adaptations"; the Sprint Retrospective is "to plan ways to increase quality and
  effectiveness".
- The Daily Scrum belongs to the Developers, who "can select whatever structure and techniques they want"; a Product
  Owner or Scrum Master takes part only as a Developer when working on Sprint Backlog items. The Scrum Master is
  accountable for "ensuring that all Scrum events take place and are positive, productive, and kept within the timebox".
- "The Sprint Goal is the single objective for the Sprint", a commitment by the Developers. The Definition of Done is
  "a formal description of the state of the Increment when it meets the quality measures".
- The Guide prescribes no three questions, no story points, no planning poker, no velocity.

What the Kanban Guide says:
- Members "must explicitly control the number of work items in a workflow from started to finished"; it does not use a
  fixed "WIP limit" number as its wording. Four flow metrics: WIP, Throughput, Work Item Age, Cycle Time.
- It prescribes no meetings; a regular look at the active items is "a common practice".

Recurring criticism from practitioners that the game must not teach as good practice: a daily that turns into a status
report for a manager; events that run long and drift from their purpose; estimation as pressure to agree on a number.
Hence: the Daily Scrum here is a walk toward the Sprint Goal among Developers, every event is timeboxed and its overrun
is shown, and estimation is presented as a conversation whose numbers are the team's own.

No evidence was found for a ranking of "most appreciated" learning resources; if a fourth or fifth link is ever allowed,
the candidates are an independent catalogue of retrospective activities and a non-profit body's article on the pitfalls
of planning poker.
