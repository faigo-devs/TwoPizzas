# Two Pizzas: specification

The contract for everyone who builds or changes the game. The owner's fourteen decisions (15 November 2026) are in
`docs/handover.md`; this file turns them into rules. When a rule here and the code disagree, fix one of them in
the same change. Reasoning that would otherwise sit in a code comment lives here (section 10).

## 1. What it is

A free browser game at the root of www.faigo.ro in which 3–6 beginners learn Scrum or Kanban by doing real cooperative
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

The game replaces the firm's site at the root of www.faigo.ro; that site lives in its own repository and is not touched
from here. Both repositories can upload to the same web root, so only one of the two deploy workflows may be enabled at
a time (`docs/handover.md`).

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
  request arrivals, clean-up). The room and everything in it are deleted when the last player has been gone for 5
  minutes or 2 hours after creation, whichever comes first.
- `Leaderboard`: one object, SQLite storage; keeps only rows that can still appear in a list.
- Logs: event names, codes and counts only. Never a name, a note, a room code or an address.
- Routes on both site hostnames (`/api/room*`), `workers_dev = false`, deployed by its own workflow
  (`publish-server.yml`) when `worker/**` or `core/**` change and publication is enabled (section 10). Tests with `node --test` against stubbed bindings, like the other two
  Workers.
- The page's `Content-Security-Policy` allows the site itself plus `wss://www.faigo.ro` and `wss://faigo.ro` in
  `connect-src`; nothing else.

## 6. Client

- Preact, one island; state = connection status + the last view + local interface state. Rendering is a function of the
  view; nothing about the game is decided in the browser.
- **Local mode**: the same interface driven by the core running in the browser, with scripted teammates. It powers the
  two-minute **solo tour** for a visitor who arrives alone and lets the interface be developed without the server.
- Screens: start (create or join, solo tour, leaderboard), lobby, phase card, planning (goal, poker, commitment), board
  with the item workspace and "info you hold", daily, review, retrospective, comparison of the two iterations, summary.
- Every action is reachable by keyboard and by a button; dragging is never the only way. Focus moves to the new screen's
  heading. Timers are not announced every second. Contrast AA in both themes. Usable from 360 px; laid out for a laptop.
- Below the game: the firm's identity (`app/i18n/identity.ts`: name, seat, CIF, Nr. Reg. Com., the same in both
  languages), a short privacy text, and exactly three outbound links to the primary sources of section 11 (opened in a
  new tab, `rel="noopener noreferrer"`). No other link.

## 7. Language and copy

- Two dictionaries with the same keys, `app/i18n/ro.ts` and `app/i18n/en.ts`; a missing key is a build error.
  Each player chooses (toggle); first visit: the browser's language, otherwise Romanian. Free text stays as typed.
  The language and the theme are remembered in the browser's `localStorage`; the seat (player id and token) in
  `sessionStorage`. The privacy text says both.
- **Technical terms stay in English in both languages**: Sprint, Sprint Planning, Daily Scrum, Sprint Review, Sprint
  Retrospective, Sprint Goal, Product Backlog, Sprint Backlog, Product Owner, Scrum Master, Developers, Increment,
  Definition of Done, story points, planning poker, velocity, WIP, WIP limit, cycle time, throughput, work item age,
  code review, deploy, merge, incident, blocked, LGTM, Request changes. The official event names are used; the everyday name appears once
  ("Sprint Review, often called the demo").
- Romanian: formal plural ("dumneavoastră"), natural, short, no figurative phrasing, "email" without a hyphen, a
  hyphenated word never breaks at its hyphen. English: plain, direct, no marketing tone.
- No names of platforms, vendors or tools in the copy. Nothing claimed about Scrum or Kanban that the primary guides do
  not support (section 11). Where the game uses a common practice that the guides do not prescribe (planning poker,
  story points, velocity, a WIP limit as a number, the Kanban meetings), the copy says so in a few words.

## 8. Look

A new look of its own, the look of a tool developers use, dark by default with a light theme: a review board. Slate
surfaces, IBM Plex Sans for text and IBM Plex Mono for ids, labels and anything code, status colours with one meaning
each (to do, in progress, blocked, in review, done), cards that read like work items, a stamp when an item gets its
LGTM. Playful in its moments (cards turning at the reveal, the stamp), calm otherwise; every animation respects reduced
motion. It imitates no existing product. FAIGO appears only in the footer.

## 9. Quality

- TypeScript strict. Core and Worker tests run with `node --experimental-strip-types --test` (so: no enums, no
  namespaces, no parameter properties; relative imports carry `.ts`; `import type` for types).
- No prose comments in code, in any syntax. API doc comments on exported symbols, one or two sentences, multi-line
  layout. What needs explaining goes into section 10.
- No names of people, no email addresses, no mentions in code, documents or commits.
- Before anything is shown as finished: tests, a clean build of both variants, the output check, and a browser run of a
  whole game on three pages. Before publication: a pilot session with real beginners, then the independent reviewers at
  9/10 each (design, Romanian copy, English copy, fidelity to the guides, usability, security of the room server).

## 10. Decisions and reasons

- The game is named **Two Pizzas** (a team small enough to be fed by two pizzas: the game's 3–6 players); the start
  screen says so once, in the line under the name. It was first called LGTM; the owner dropped that name on 15 November
  2026 because the abbreviation carries other meanings among developers. LGTM stays only as the review verdict and its
  stamp. The `lg-` prefix of the CSS classes and of the browser storage keys is kept: it is an arbitrary prefix and
  renaming it would change every component for no gain. The internal names `lgtm` (root package) and `lgtm-rooms`
  (Worker) are renamed with the repository.
- Publication is off by default: every publishing job runs only when the repository variable `PUBLISH_ENABLED` is
  `true`, in the `production` environment, with a concurrency group that never cancels a running publish. Host,
  account, directory and site address come only from secrets and variables (`FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`,
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; `FTP_REMOTE_DIR`, `SITE_URL`, `SITE_HOSTS`).
- The Worker's routes and its allowed origins are both derived from `SITE_HOSTS` at publish time (`--route
  <host>/api/room*`, `ALLOWED_ORIGINS` as `https://<host>`), so they cannot disagree and `wrangler.toml` names no host.
- Workflows pin every action by full commit SHA because publishing uses long-lived credentials. Resolved on 15
  November 2026: the upload action at tag v4.3.5 = `8e83cea8672e3fbcbb9fdafff34debf6ae4c5f65`; checkout v4 =
  `11d5960a326750d5838078e36cf38b85af677262`; setup-node v4 = `49933ea5288caeca8642d1e84afbd3f7d6820020`.
- The page publish builds without a package cache, runs tests, typecheck, build and `scripts/check-dist.mjs`, uploads,
  then fails only if the served home page is not byte-identical to the build; a wrong 404, a served sync-state file, a
  missing policy header or injected code are warnings. The live server is only ever asked for
  `GET /api/room/leaderboard`: a smoke test never creates a room.
- `scripts/check-dist.mjs` reads the site origin from `astro.config.mjs` and the three source addresses from
  `app/i18n/sources.ts`, allows nothing else but XML namespace identifiers, requires identical policies in `web.config`
  and `.htaccess`, and holds a size budget (JS 450 kB, CSS 150 kB, fonts 300 kB; 260, 61 and 206 kB on 15 November).
- The static page declares `lang="ro"` (the fallback language) and carries the Romanian description; the app sets the
  language of the document when it starts.
- The server decides everything and hides the answers because a public leaderboard makes a browser-side check worthless.
- Correctness is revealed only at the review of the iteration, so that the reviewer's LGTM is a real responsibility and
  an escaped defect can exist.
- One context-switch delay instead of separate rules for multitasking: the same cause makes an unlimited Kanban round
  slow and makes a WIP agreement pay off in Sprint 2.
- The Daily Scrum is a walk of the board toward the Sprint Goal, not three questions; the 2020 Scrum Guide no longer
  prescribes the questions and the walk surfaces blocked and waiting work, which the game can see.
- Suggestions for notes come from rules, not from a language model: no cost per session, no text sent to a third party,
  wording that can be reviewed in advance.
- Voice stays outside the page: it would need the microphone, a relay for some networks and a longer privacy text.
- An escaped defect returns with its value and its estimate: it delivers nothing in the Sprint it escaped from and
  can still be delivered in the next.
- After the Daily Scrum the second half of the Sprint starts at once, without a card of its own: the Daily Scrum's
  card is the bridge.
- The customers' priority shift may lift a value above 8; the 1–8 range holds only when an item is created.
- A tied Sprint Goal vote goes to the first option offered.
- One delay (60 s) decides when a disconnected player's items are released and their role passes on; a returning
  player gets the seat back, not the role or the items.
- Team names are generated so that the public list needs no moderation and holds no personal data.

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
