import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Player, squash } from './player.mjs';

/**
 * Thrown when an assertion fails; the runner catches it, saves the evidence and stops.
 */
export class AssertionFailure extends Error {}

/**
 * Counts how many times each kind of assertion held.
 */
export class Counters {
  constructor() {
    this.values = new Map();
  }

  bump(name, amount = 1) {
    this.values.set(name, (this.values.get(name) ?? 0) + amount);
  }

  total() {
    let sum = 0;
    for (const value of this.values.values()) sum += value;
    return sum;
  }
}

const sleep = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

/**
 * The state of one game run: the three players, the log, the assertions and the cross-page checks.
 */
export class Run {
  constructor({ framework, outDirectory, pageUrl, expected = [] }) {
    this.framework = framework;
    this.outDirectory = outDirectory;
    this.pageUrl = pageUrl;
    this.startedAt = Date.now();
    this.logFile = join(outDirectory, 'run.log');
    mkdirSync(outDirectory, { recursive: true });
    writeFileSync(this.logFile, '');
    this.counters = new Counters();
    this.knownFailures = [];
    this.expectedList = expected;
    this.players = [];
    this.fragments = new Map();
    this.focusPending = new Map();
    this.stepLog = [];
    this.failure = null;
    this.verbose = false;
  }

  elapsed() {
    const seconds = Math.round((Date.now() - this.startedAt) / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  log(message) {
    const line = `[${this.elapsed()}] ${message}`;
    appendFileSync(this.logFile, `${line}\n`);
    process.stdout.write(`${line}\n`);
  }

  isExpected(event) {
    return this.expectedList.some((entry) => entry.matches(event));
  }

  addPlayer(player) {
    this.players.push(player);
    return player;
  }

  fail({ player = null, name, expected, found, known = null, screen = null }) {
    const where = player === null ? 'all' : player.label;
    const at = screen ?? (player === null ? 'n/a' : player.screenKey());
    const line = `FAIL${known ? ` (known defect ${known})` : ''} [${where}] screen=${at} check="${name}" expected=${expected} found=${found}`;
    this.log(line);
    if (known) {
      this.knownFailures.push({ known, name, where, screen: at, expected, found, at: this.elapsed() });
      this.counters.bump(`known failure ${known}`);
      return;
    }
    const error = new AssertionFailure(line);
    if (this.failure === null) this.failure = error;
    throw error;
  }

  check(condition, name, { player = null, expected = 'true', found = 'false', known = null, quiet = true } = {}) {
    if (condition) {
      this.counters.bump(name);
      if (!quiet || this.verbose) this.log(`ok ${name}`);
      return true;
    }
    this.fail({ player, name, expected, found, known });
    return false;
  }

  note(message) {
    this.log(`note ${message}`);
  }

  async probeAll(players = this.players) {
    await Promise.all(players.map((player) => player.probe()));
    this.crossChecks();
    this.trackScreens();
  }

  trackScreens() {
    for (const player of this.players) {
      const key = player.screenKey();
      if (key !== player.lastScreen) {
        if (player.lastScreen !== null) this.focusPending.set(player.number, { key, since: Date.now() });
        player.lastScreen = key;
      }
    }
  }

  crossChecks() {
    const views = this.players.map((player) => player.view);
    if (views.some((view) => view === null)) return;
    this.updateFragments();
    this.scanFragments();
  }

  statusOf(player, itemId) {
    const item = player.view.items.find((own) => own.id === itemId);
    return item === undefined ? null : item.status;
  }

  updateFragments() {
    for (const player of this.players) {
      const dom = player.dom;
      const workspace = player.view.workspace;
      if (dom === null) continue;
      if (workspace !== null && workspace.mode === 'work' && workspace.part !== null) {
        for (const text of dom.partTexts) this.addFragment(player, workspace.itemId, text, 'part');
      }
      for (const held of dom.heldBodies) this.addFragment(player, held.itemId, held.text, 'held');
    }
  }

  addFragment(owner, itemId, text, kind) {
    const squashed = squash(text);
    if (squashed.length < 12) return;
    const key = `${owner.number}|${itemId}|${squashed}`;
    if (!this.fragments.has(key)) {
      this.fragments.set(key, { owner: owner.number, itemId, text: squashed, kind, firstSeen: Date.now() });
      this.counters.bump(`private ${kind} captured`);
    }
  }

  scanFragments() {
    for (const [key, fragment] of this.fragments) {
      const owner = this.players.find((player) => player.number === fragment.owner);
      if (this.players.some((player) => this.statusOf(player, fragment.itemId) !== 'doing')) {
        this.fragments.delete(key);
        continue;
      }
      for (const other of this.players) {
        if (other === owner || other.dom === null) continue;
        this.counters.bump('leak scans');
        if (squash(other.dom.text).includes(fragment.text)) {
          this.fail({
            player: other,
            name: `no leak of a private ${fragment.kind}`,
            expected: `${other.label} never shows the ${fragment.kind} that only ${owner.label} holds for ${fragment.itemId}`,
            found: `text of ${owner.label}: ${fragment.text.slice(0, 90)}`,
          });
        }
      }
    }
  }

  async until(description, predicate, { timeoutMs = 60_000, intervalMs = 400, players = this.players } = {}) {
    const deadline = Date.now() + timeoutMs;
    let last = 'never evaluated';
    for (;;) {
      await this.probeAll(players);
      const outcome = predicate();
      if (outcome === true) return;
      if (typeof outcome === 'string') last = outcome;
      if (Date.now() > deadline) {
        this.fail({ name: `wait: ${description}`, expected: description, found: `timed out after ${Math.round(timeoutMs / 1000)}s; ${last}` });
      }
      await sleep(intervalMs);
    }
  }

  async waitScreen(key, { timeoutMs = 60_000, who = this.players } = {}) {
    await this.until(
      `screen ${key} on ${who.map((p) => p.label).join(',')}`,
      () => (who.every((player) => player.screenKey() === key) ? true : who.map((player) => `${player.label}=${player.screenKey()}`).join(' ')),
      { timeoutMs, players: this.players },
    );
    this.log(`screen ${key}`);
    this.counters.bump('screens reached');
    await this.focusCheck();
  }

  async focusCheck() {
    const pending = [...this.focusPending.entries()];
    if (pending.length === 0) return;
    const wait = Math.max(0, 450 - (Date.now() - Math.min(...pending.map(([, entry]) => entry.since))));
    if (wait > 0) await sleep(wait);
    await this.probeAll();
    for (const [number, entry] of pending) {
      const player = this.players.find((candidate) => candidate.number === number);
      this.focusPending.delete(number);
      if (player.screenKey() !== entry.key) continue;
      const active = player.dom.active;
      const onHeading = active !== null && /^H[1-3]$/.test(active.tag) && (active.id === 'lg-phase-title' || active.id === 'lg-hero-title' || active.lg);
      this.check(onHeading, 'phase heading has focus after a screen change', {
        player,
        expected: `focus on the phase heading of ${entry.key}`,
        found: active === null ? 'no active element' : `${active.tag}#${active.id} "${active.text}"`,
      });
    }
  }

  facilitator() {
    const id = this.players[0].view.facilitatorId;
    return this.players.find((player) => player.selfId === id);
  }

  host() {
    const id = this.players[0].view.hostId;
    return this.players.find((player) => player.selfId === id);
  }

  async saveFailureEvidence() {
    const stamp = this.elapsed().replace(':', 'm');
    await Promise.all(
      this.players.map(async (player) => {
        try {
          await player.screenshot(join(this.outDirectory, `failure-${stamp}-${player.label}.png`));
        } catch (error) {
          this.log(`screenshot of ${player.label} failed: ${error.message.slice(0, 120)}`);
        }
        const tail = player.consoleLog.slice(-50).map((entry) => `${new Date(entry.at).toISOString()} ${entry.type} ${entry.text}`);
        writeFileSync(join(this.outDirectory, `failure-${stamp}-${player.label}-console.txt`), `${tail.join('\n')}\n`);
        writeFileSync(
          join(this.outDirectory, `failure-${stamp}-${player.label}-state.json`),
          JSON.stringify({ screen: player.screenKey(), view: player.view, text: player.dom === null ? null : player.dom.text }, null, 1),
        );
      }),
    );
  }

  createPlayer(options) {
    return this.addPlayer(new Player(this, options));
  }
}

export { sleep };
