import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { installCollectorSource } from './collector.mjs';

const CliScript = join('node_modules', '@playwright', 'cli', 'playwright-cli.js');

let cliCommand = null;

/**
 * Finds how to start playwright-cli: its script through Node when the global install is found, otherwise the bare command.
 */
export function locateCli() {
  if (cliCommand !== null) return cliCommand;
  const names = process.platform === 'win32' ? ['playwright-cli.cmd', 'playwright-cli.exe', 'playwright-cli'] : ['playwright-cli'];
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    for (const name of names) {
      if (directory === '' || !existsSync(join(directory, name))) continue;
      const script = join(directory, CliScript);
      if (existsSync(script)) {
        cliCommand = { command: process.execPath, prefix: [script], shell: false };
        return cliCommand;
      }
      const sibling = join(dirname(directory), 'lib', CliScript);
      if (existsSync(sibling)) {
        cliCommand = { command: process.execPath, prefix: [sibling], shell: false };
        return cliCommand;
      }
    }
  }
  cliCommand = { command: 'playwright-cli', prefix: [], shell: true };
  return cliCommand;
}

/**
 * Runs one playwright-cli command and resolves with its exit code and text output.
 */
export function runCli(args, { cwd, timeoutMs = 120_000 } = {}) {
  const { command, prefix, shell } = locateCli();
  return new Promise((resolveRun) => {
    const child = spawn(command, [...prefix, ...args], { cwd, shell, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', (error) => {
      clearTimeout(timer);
      resolveRun({ code: -1, stdout, stderr: `${stderr}${error.message}`, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveRun({ code: code ?? -1, stdout, stderr, timedOut });
    });
  });
}

/**
 * Closes one named session synchronously, for use in exit handlers.
 */
export function closeSessionSync(name) {
  const { command, prefix, shell } = locateCli();
  spawnSync(command, [...prefix, `-s=${name}`, 'close'], { shell, windowsHide: true, timeout: 30_000 });
}

function decodeRaw(stdout) {
  const text = stdout.trim();
  if (text === '') return undefined;
  const lines = text.split(/\r?\n/);
  let candidate = lines[lines.length - 1];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].startsWith('"') || lines[index].startsWith('{') || lines[index].startsWith('[')) {
      candidate = lines.slice(index).join('\n');
      break;
    }
  }
  let value = JSON.parse(candidate);
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * One browser session driven through playwright-cli: runs code against its page and reads what the collectors gathered.
 */
export class Session {
  constructor({ name, directory, scratch }) {
    this.name = name;
    this.directory = resolve(directory);
    this.scratch = resolve(scratch);
    this.counter = 0;
    this.calls = 0;
  }

  async cli(args, options = {}) {
    this.calls += 1;
    return runCli([`-s=${this.name}`, ...args], { cwd: this.directory, ...options });
  }

  async open(url, { width, height } = {}) {
    mkdirSync(this.directory, { recursive: true });
    mkdirSync(this.scratch, { recursive: true });
    const opened = await this.cli(['open', 'about:blank']);
    if (opened.code !== 0) throw new Error(`open ${this.name} failed: ${opened.stdout}${opened.stderr}`);
    await this.run(installCollectorSource);
    if (width) await this.run(`await page.setViewportSize({ width: ${width}, height: ${height} }); return true;`);
    await this.run(`await page.goto(${JSON.stringify(url)}, { waitUntil: 'load' }); return true;`);
  }

  async run(body, { timeoutMs = 120_000 } = {}) {
    this.counter += 1;
    const file = join(this.scratch, `${this.name}-${this.counter}.js`);
    const source = `async page => {\n  const __result = await (async () => {\n${body}\n  })();\n  return JSON.stringify(__result === undefined ? null : __result);\n}\n`;
    writeFileSync(file, source);
    const result = await this.cli(['--raw', 'run-code', `--filename=${file}`], { timeoutMs });
    if (result.timedOut) throw new Error(`run-code timed out in ${this.name}`);
    const combined = `${result.stdout}${result.stderr}`;
    if (result.code !== 0 || /^### Error/m.test(combined)) {
      throw new Error(`run-code failed in ${this.name}: ${combined.slice(0, 1200)}`);
    }
    return decodeRaw(result.stdout);
  }

  async screenshot(file) {
    const result = await this.cli(['screenshot', `--filename=${file}`], { timeoutMs: 60_000 });
    return result.code === 0;
  }

  async close() {
    await this.cli(['close'], { timeoutMs: 60_000 });
  }
}
