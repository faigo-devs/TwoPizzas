import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import net from 'node:net';
import http from 'node:http';

const children = new Set();

/**
 * Starts a background process whose output goes to a file, and remembers it so that it can be stopped later.
 */
export function startProcess({ label, command, args, cwd, env, logFile, shell = false }) {
  const out = createWriteStream(logFile, { flags: 'a' });
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    shell,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(out);
  child.stderr.pipe(out);
  const record = { label, child, exited: false };
  child.on('exit', () => {
    record.exited = true;
  });
  children.add(record);
  return record;
}

function killTree(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        return;
      }
    }
  }
}

/**
 * Stops every process started through startProcess, with all of its descendants.
 */
export function stopAllProcesses() {
  for (const record of children) {
    if (record.child.pid !== undefined) killTree(record.child.pid);
  }
  children.clear();
}

/**
 * Runs a foreground command to the end, streaming nothing, and resolves with its exit code.
 */
export function runToEnd({ command, args, cwd, logFile, shell = false }) {
  return new Promise((resolveRun) => {
    const out = createWriteStream(logFile, { flags: 'a' });
    const child = spawn(command, args, { cwd, shell, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(out);
    child.stderr.pipe(out);
    child.on('error', () => resolveRun(-1));
    child.on('close', (code) => resolveRun(code ?? -1));
  });
}

function probeHttp(url) {
  return new Promise((resolveProbe) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolveProbe(response.statusCode ?? 0);
    });
    request.on('error', () => resolveProbe(0));
    request.setTimeout(3000, () => {
      request.destroy();
      resolveProbe(0);
    });
  });
}

/**
 * Polls a URL until it answers with a 2xx status or the deadline passes.
 */
export async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await probeHttp(url);
    if (status >= 200 && status < 300) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  return false;
}

/**
 * Whether something accepts connections on a local port.
 */
export function isListening(port) {
  return new Promise((resolveListening) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolveListening(true);
    });
    socket.once('error', () => resolveListening(false));
    socket.setTimeout(1500, () => {
      socket.destroy();
      resolveListening(false);
    });
  });
}
