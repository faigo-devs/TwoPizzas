import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createT, dictionaries } from '../../../app/i18n/index.ts';
import { Session } from './browser.mjs';

const SandboxSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'sandbox.js'), 'utf8');
const NavigationErrors = /Execution context was destroyed|navigation|Target (page|closed)|frame was detached|Cannot find context/i;
const CspPattern = /Content Security Policy|Refused to (load|apply|connect|execute|create)|violat/i;

/**
 * Normalises text for substring searches that must not depend on layout or spacing.
 */
export function squash(text) {
  return String(text ?? '').replace(/\s+/g, '').toLowerCase();
}

/**
 * Name of a technical token in a language when the dictionaries have one, otherwise the token itself.
 */
export function tokenName(t, group, value) {
  const name = `token.${group}.${value}`;
  return name in dictionaries.en ? t(name) : value;
}

/**
 * Translator that names the missing key when a dictionary no longer has it.
 */
export function strictTranslator(lang) {
  const translate = createT(lang);
  return (key, params) => {
    if (!(key in dictionaries[lang])) throw new Error(`dictionary key "${key}" is missing in "${lang}"; the driver needs it to find a control`);
    return translate(key, params);
  };
}

/**
 * One of the three players: a named browser session with its latest view, page text and the checks every probe runs.
 */
export class Player {
  constructor(run, { number, lang, width, height, name }) {
    this.run = run;
    this.number = number;
    this.label = `P${number}`;
    this.lang = lang;
    this.width = width;
    this.height = height;
    this.name = name;
    this.session = new Session({
      name: `e2e-${number}`,
      directory: join(run.outDirectory, 'cli', `p${number}`),
      scratch: join(run.outDirectory, 'scratch'),
    });
    this.t = strictTranslator(lang);
    this.view = null;
    this.viewCount = 0;
    this.dom = null;
    this.consoleLog = [];
    this.cursor = { console: 0, errors: 0, failures: 0, responses: 0, hits: 0 };
    this.revealedOutcomes = new Set();
    this.lastScreen = null;
    this.firstView = null;
    this.probes = 0;
  }

  setLanguage(lang) {
    this.lang = lang;
    this.t = strictTranslator(lang);
  }

  token(group, value) {
    return tokenName(this.t, group, value);
  }

  get selfId() {
    return this.view === null ? null : this.view.selfId;
  }

  async open(url) {
    await this.session.open(url, { width: this.width, height: this.height });
  }

  async exec(code, args = {}, options = {}) {
    const body = `${SandboxSource}\nconst A = ${JSON.stringify(args)};\n${code}`;
    let lastError = null;
    for (let attempt = 0; attempt < (options.retries ?? 3); attempt += 1) {
      try {
        return await this.session.run(body, options);
      } catch (error) {
        lastError = error;
        if (!NavigationErrors.test(error.message)) throw error;
        await new Promise((resolveWait) => setTimeout(resolveWait, 400));
      }
    }
    throw lastError;
  }

  async click(name, scope = null) {
    await this.exec(`return await clickButton(A.scope === null ? null : page.locator(A.scope), A.name);`, { name, scope });
  }

  async clickKey(key, params = {}, scope = null) {
    await this.click(this.t(key, params), scope);
  }

  async clickPrimary(key, params = {}) {
    await this.exec(`await page.locator('button.lg-btn--primary').filter({ hasText: exactText(A.name) }).click({ timeout: 10000 }); return true;`, { name: this.t(key, params) });
  }

  async probe() {
    this.probes += 1;
    const result = await this.exec(
      `
      const sink = page.__e2e;
      const dom = await snapshotDom();
      const seat = await page.evaluate(() => { try { return sessionStorage.getItem('lg-seat'); } catch (error) { return null; } });
      if (seat) { try { sink.seatToken = JSON.parse(seat).token || sink.seatToken; } catch (error) { sink.seatToken = sink.seatToken; } }
      return {
        dom,
        view: sink.viewCount !== A.viewCount ? sink.view : undefined,
        viewCount: sink.viewCount,
        welcome: sink.welcome,
        frames: sink.frames,
        console: sink.console.slice(A.cursor.console),
        pageErrors: sink.pageErrors.slice(A.cursor.errors),
        failures: sink.requestFailures.slice(A.cursor.failures),
        responses: sink.badResponses.slice(A.cursor.responses),
        hits: sink.forbiddenHits.slice(A.cursor.hits),
        lengths: { console: sink.console.length, errors: sink.pageErrors.length, failures: sink.requestFailures.length, responses: sink.badResponses.length, hits: sink.forbiddenHits.length },
        tolerateAbortUntil: sink.tolerateAbortUntil,
        sockets: sink.sockets.map((socket) => ({ url: socket.url, closedAt: socket.closedAt })),
        now: Date.now(),
      };
    `,
      { viewCount: this.viewCount, cursor: this.cursor },
    );
    this.cursor = result.lengths;
    this.dom = result.dom;
    this.frames = result.frames;
    this.welcome = result.welcome;
    this.sockets = result.sockets;
    if (result.view !== undefined) {
      this.view = result.view;
      if (this.firstView === null) this.firstView = result.view;
    }
    this.viewCount = result.viewCount;
    this.ingest(result);
    return result;
  }

  ingest(result) {
    for (const entry of result.console) this.consoleLog.push(entry);
    for (const entry of result.console) {
      const text = `${entry.type}: ${entry.text}`;
      const error = entry.type === 'error' || entry.type === 'socketerror' || CspPattern.test(entry.text);
      if (error && !this.run.isExpected({ kind: 'console', entry })) {
        this.run.fail({ player: this, name: 'no console error', expected: 'no console error', found: text });
      }
    }
    for (const entry of result.pageErrors) {
      this.run.fail({ player: this, name: 'no uncaught page error', expected: 'no uncaught page error', found: entry.text });
    }
    for (const entry of result.failures) {
      const tolerated = entry.failure === 'net::ERR_ABORTED' && entry.at <= result.tolerateAbortUntil;
      if (!tolerated && !this.run.isExpected({ kind: 'request', entry })) {
        this.run.fail({ player: this, name: 'no failed request', expected: 'every request succeeds', found: `${entry.method} ${entry.url} ${entry.failure}` });
      }
    }
    for (const entry of result.responses) {
      if (!this.run.isExpected({ kind: 'response', entry })) {
        this.run.fail({ player: this, name: 'no error response', expected: 'every response below 400', found: `${entry.status} ${entry.url}` });
      }
    }
    for (const hit of result.hits) {
      this.run.fail({ player: this, name: 'no forbidden word in a frame', expected: 'no secret, seed or answer key in any frame', found: `"${hit.word}" in ${hit.excerpt}` });
    }
    this.run.counters.bump('scroll width checks');
    if (result.dom.scrollWidth > result.dom.innerWidth) {
      this.run.fail({
        player: this,
        name: 'no horizontal overflow',
        expected: `scrollWidth <= innerWidth (${result.dom.innerWidth})`,
        found: `scrollWidth ${result.dom.scrollWidth}`,
      });
    }
    this.checkOutcomes();
  }

  checkOutcomes() {
    const view = this.view;
    if (view === null) return;
    if (view.inspect !== null && view.inspect !== undefined) {
      for (const verdict of view.inspect.verdicts) this.revealedOutcomes.add(verdict.itemId);
    }
    for (const item of view.items) {
      if (item.outcome !== null && !this.revealedOutcomes.has(item.id)) {
        this.run.fail({
          player: this,
          name: 'no outcome before the review reveals it',
          expected: `outcome of ${item.id} hidden until its verdict is shown`,
          found: `outcome ${item.outcome}`,
        });
      }
    }
    this.run.counters.bump('outcome-hidden checks');
  }

  screenKey() {
    const phase = this.view === null ? null : this.view.phase;
    if (phase === null) return 'none';
    if (phase.kind === 'lobby' || phase.kind === 'summary') return phase.kind;
    return `${phase.kind}:${phase.iteration}:${phase.kind === 'work' ? phase.half : 0}:${phase.step}`;
  }

  hasText(text) {
    return this.dom !== null && this.dom.text.includes(text);
  }

  async screenshot(file) {
    return this.session.screenshot(file);
  }

  async close() {
    await this.session.close();
  }
}
