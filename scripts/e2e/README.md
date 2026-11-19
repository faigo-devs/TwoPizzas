# Whole-game browser check

Plays one whole game, Scrum or Kanban, on three real browser pages against the real local room server, and fails loudly when something is wrong.

## The one command

```bash
node scripts/e2e/run.mjs scrum
node scripts/e2e/run.mjs kanban
```

Exit code 0 means every assertion held. Anything else, including a known game defect that was recorded and passed over, gives exit code 1.

Options: `--dist <dir>` reuses a build (the default runs `npm run build`, which also writes the policy hashes), `--page-port 4410`, `--worker-port 8797`, `--inspector-port <port>` (default worker port plus 600), `--think-ms` and `--review-think-ms` (pacing of the simulated players, default 30000 and 12000), `--stop-after join|lobby|plan1|work1|review1|plan2|work2|review2` for development.

Needs the globally installed `playwright-cli`, Node 22.18 or later (the runner loads the app's TypeScript dictionaries directly) and the repository's own `node_modules` (wrangler in `worker/`).

## What it does

1. Builds the page, starts `wrangler dev` in `worker/` (own persisted state in the output folder), starts `serve.mjs` (static files plus a proxy of `/api/room`, HTTP and WebSocket) and waits until both answer.
2. Opens three named sessions `e2e-1`, `e2e-2`, `e2e-3`, each with its own storage: page 1 switches to Romanian, page 2 is 390 px wide.
3. Plays the whole game through the interface: lobby (names, one lock and unlock), planning (Scrum: goal votes, planning poker with a reveal and a re-vote, selection; Kanban: Ready, and the WIP limits in round 2), the work phases on real clocks, the daily, the review (verdicts revealed one by one), the retrospective (one note through the "I don't know what to write" helper, votes, a trackable action), sprint or round 2, and the summary with the publication and the public list.
4. Shuts everything down in every outcome (failure, Ctrl-C) and checks that nothing still listens on its ports.

A whole game runs on the game's real timeboxes, so a run takes about twenty to twenty-five minutes, plus up to three minutes for the public list to show the published team.

## What it asserts

- Every page, after every probe: no console error and no uncaught page error, no failed or 4xx/5xx request (nothing is whitelisted unless `run.mjs` lists it), `scrollWidth <= innerWidth`, no forbidden word (`secret`, `nameSeed`, seed, answer, puzzle keys) in any WebSocket frame received, no item outcome before its verdict is revealed.
- After every screen change: the phase heading has focus.
- No leak: the private part text and the held piece shown on one page never appear on the other two pages while the item is unsolved.
- The page is served with the build's real Content-Security-Policy header (read from the built `.htaccess`, without `upgrade-insecure-requests`, with `connect-src` extended by the local WebSocket origin); any policy violation in the console fails the run.
- The numbers on the review and summary screens are identical on all three pages.
- Scenario events: an item done with a right answer and an LGTM; a wrong answer that got an LGTM and shows as an escaped defect only at the review; a Request changes that comes back and is fixed; a pair item solved from two different parts; an item solved with the piece its holder sees; a promise of help; a reload that keeps the seat; the same seat opened in a second tab (older page shows the open-somewhere-else state, "Use this tab" takes it back); Kanban: the refusal text when a WIP limit is hit.
- Summary: both iterations, per-event observations, the purpose, duration and typical mistake block; another team name once; publish; the publish control disappears; the team appears in the list of its own framework (polled for up to three minutes, the wait is logged).

## How the driver works

Each player is a `playwright-cli` session. The runner talks to it with `run-code` scripts: collectors attached to the page keep the console, page errors, failed requests and every WebSocket frame the page received. The driver reads the player's own latest view from those frames to decide what to do and what to solve, and every action is a real click or fill on the page. Button names come from the app's dictionaries through `createT(lang)` for the language of each page, so a changed text does not break the driver; a renamed key fails with the key's name. Pairs are solved by merging the two workers' parts and the holder's piece, as people on a call would.

## Reading a failure

The log (`run.log` in `.qa/e2e/<framework>-<timestamp>/`) ends with a line like

```
FAIL [P2] screen=work:1:2:running check="no console error" expected=... found=...
```

which names the player, the screen, what was expected and what was found. Next to it the folder holds `failure-<time>-P<n>.png` (all three pages), `failure-<time>-P<n>-console.txt` (the last 50 console lines), `failure-<time>-P<n>-state.json` (the last view and page text), `worker.log`, `page-server.log`, `build.log` and `summary.json` (assertion counts, known failures). A failure marked `known defect` is a game defect that the run records and passes over; it still makes the exit code 1.

`node scripts/e2e/solvers.selftest.mjs` checks the puzzle solvers against the core's generator.
