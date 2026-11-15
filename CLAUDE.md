# CLAUDE.md

Guidance for anyone (human or agent) working in this repository.

## What this is

**Two Pizzas**: a free browser game in which 3–6 beginners learn Scrum or Kanban by playing two short iterations of real
cooperative work, with the events around it. It will replace the firm's site at the root of www.faigo.ro (FAIGO SRL,
Oradea). Romanian and English. One static page on the host, a real-time room server in Cloudflare.

## Read before working

| File | Holds |
|---|---|
| `docs/spec.md` | the contract: rules of the game, protocol, parts, language, look, quality, reasons, sources |
| `docs/handover.md` | the owner's decisions (Romanian), current state, what is next, what only the owner can do |

## Layout

- `core/`: pure TypeScript shared by server and browser (tasks, state machine, views, scoring). Tests in `core/test/`.
- `worker/`: Cloudflare Worker with the `Room` and `Leaderboard` Durable Objects; its own `package.json`.
- `app/`: the client (Astro `srcDir`): `pages/`, `ui/` (presentational Preact components), `game/` (screens,
  connection), `i18n/`, `styles/`, `assets/`. `public/` holds the host's `web.config` and `.htaccess`.
- `reference/piesa-lipsa/`: the earlier no-server game, read-only source for porting; deleted when the port is done.
- `scripts/`: output checks and browser checks. `.qa/` (ignored) holds screenshots and run logs.

## Commands

```bash
npm install
npm run dev         # client; proxies /api/room to a local `wrangler dev` on 127.0.0.1:8787
npm run build       # static page into dist/
npm test            # core tests (node --test, type stripping)
npm run typecheck
```

## Rules that hold everywhere

- **No prose comments in code**, in any syntax (`//`, `#`, `/* */`, `<!-- -->`, section markers, commented-out code).
  API doc comments on exported symbols stay, one or two sentences, always in multi-line layout (opening and closing on
  their own lines). Whatever needs explaining goes to `docs/spec.md`, section 10, before it is removed from a file.
- No names of people, no email addresses, no mentions, in code, documents, commits or copy. Colleagues by role only.
- TypeScript strict. Code that the tests load must survive type stripping: no enums, no namespaces, no parameter
  properties; relative imports carry `.ts`; `import type` for types.
- The core is pure: no clock, no randomness of its own, no DOM, no network. The server is the only authority; a browser
  never receives an answer or another player's private information.
- Copy: two dictionaries with identical keys; technical terms stay in English in both languages; Romanian in the formal
  plural; no vendor, platform or tool names; nothing about Scrum or Kanban that `docs/spec.md` section 11 does not
  support.
- No new dependency without the orchestrator's agreement. No analytics, no third-party origin, no cookie.
- The repository is public. No host name, account, provider name, address or secret in code, documents, workflows or
  commit messages: such values come only from secrets and variables. The seed of a room never leaves the server.
- Never add `Strict-Transport-Security` to `public/web.config`: the host already sends it and a second entry makes the
  host answer 500 on every page.
- Nothing is published before a pilot session with real beginners and the independent reviewers at 9/10 each.

## Working rules

- Work only inside this repository. The firm's site lives in another repository and is not touched from here.
- At most two agents at once, each with a narrow task and its own files; deterministic checks (tests, build, browser
  run) are run directly, not by an agent.
- Commits: `git -c user.name=faigo -c user.email=faigo@localhost commit`; plain English subject, no trailer with an
  address.
- Browser checks use the global `playwright-cli`; their output goes to `.qa/`.
