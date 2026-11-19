import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeSessionSync } from './lib/browser.mjs';
import { isListening, runToEnd, startProcess, stopAllProcesses, waitForHttp } from './lib/proc.mjs';
import { AssertionFailure, Run } from './lib/session-run.mjs';
import { playGame } from './lib/game.mjs';

const RepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SessionNames = ['e2e-1', 'e2e-2', 'e2e-3'];

function parseArguments(argv) {
  const options = {
    framework: null,
    dist: null,
    pagePort: 4410,
    workerPort: 8797,
    inspectorPort: null,
    thinkMs: 30_000,
    reviewThinkMs: 12_000,
    stopAfter: null,
    reuseServers: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => argv[++index];
    if (argument === '--dist') options.dist = resolve(next());
    else if (argument === '--page-port') options.pagePort = Number(next());
    else if (argument === '--worker-port') options.workerPort = Number(next());
    else if (argument === '--inspector-port') options.inspectorPort = Number(next());
    else if (argument === '--think-ms') options.thinkMs = Number(next());
    else if (argument === '--review-think-ms') options.reviewThinkMs = Number(next());
    else if (argument === '--stop-after') options.stopAfter = next();
    else if (argument === '--reuse-servers') options.reuseServers = true;
    else if (argument === 'scrum' || argument === 'kanban' || argument === 'tour') options.framework = argument;
    else throw new Error(`unknown argument ${argument}`);
  }
  if (options.framework === null) throw new Error('usage: node scripts/e2e/run.mjs <scrum|kanban|tour> [--dist <dir>] [--page-port 4410] [--worker-port 8797]');
  if (options.inspectorPort === null) options.inspectorPort = options.workerPort + 600;
  return options;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function closeSessions(run) {
  await Promise.all(
    SessionNames.map(async (name) => {
      const player = run.players.find((candidate) => candidate.session.name === name);
      if (player) {
        try {
          await player.close();
        } catch {
          closeSessionSync(name);
        }
      }
    }),
  );
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const outDirectory = join(RepoRoot, '.qa', 'e2e', `${options.framework}-${timestamp()}`);
  mkdirSync(outDirectory, { recursive: true });
  const pageUrl = `http://127.0.0.1:${options.pagePort}/`;
  const run = new Run({ framework: options.framework, outDirectory, pageUrl });
  run.options = options;
  run.log(`output ${outDirectory}`);

  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    await closeSessions(run);
    if (!options.reuseServers) stopAllProcesses();
  };
  const onSignal = async (signal) => {
    run.log(`received ${signal}, shutting down`);
    await cleanup();
    process.exit(130);
  };
  process.on('SIGINT', () => void onSignal('SIGINT'));
  process.on('SIGTERM', () => void onSignal('SIGTERM'));
  process.on('exit', () => {
    if (!cleaned) {
      for (const name of SessionNames) closeSessionSync(name);
      if (!options.reuseServers) stopAllProcesses();
    }
  });

  let exitCode = 1;
  try {
    for (const port of options.reuseServers ? [] : [options.pagePort, options.workerPort, options.inspectorPort]) {
      if (await isListening(port)) throw new Error(`port ${port} is already in use; pick another with --page-port or --worker-port`);
    }
    let dist = options.dist;
    if (dist === null) {
      run.log('building the page: npm run build');
      const code = await runToEnd({
        command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
        args: ['run', 'build'],
        cwd: RepoRoot,
        logFile: join(outDirectory, 'build.log'),
        shell: process.platform === 'win32',
      });
      if (code !== 0) throw new Error(`npm run build failed with code ${code}; see build.log`);
      dist = join(RepoRoot, 'dist');
    }
    if (!existsSync(join(dist, 'index.html')) || !existsSync(join(dist, '.htaccess'))) throw new Error(`${dist} has no index.html and .htaccess`);
    run.log(`serving ${dist}`);

    if (!options.reuseServers) {
      startProcess({
        label: 'worker',
        command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
        args: [
          'wrangler',
          'dev',
          '--port',
          String(options.workerPort),
          '--ip',
          '127.0.0.1',
          '--inspector-port',
          String(options.inspectorPort),
          '--persist-to',
          join(outDirectory, 'worker-state'),
          '--var',
          `ALLOWED_ORIGINS:http://127.0.0.1:${options.pagePort}`,
        ],
        cwd: join(RepoRoot, 'worker'),
        env: { WRANGLER_SEND_METRICS: 'false', CI: '1' },
        logFile: join(outDirectory, 'worker.log'),
        shell: process.platform === 'win32',
      });
      startProcess({
        label: 'page',
        command: process.execPath,
        args: [join(RepoRoot, 'scripts', 'e2e', 'serve.mjs'), '--root', dist, '--port', String(options.pagePort), '--upstream-port', String(options.workerPort)],
        cwd: RepoRoot,
        logFile: join(outDirectory, 'page-server.log'),
      });
    }
    const workerUp = await waitForHttp(`http://127.0.0.1:${options.workerPort}/api/room/leaderboard`, 120_000);
    if (!workerUp) throw new Error('the room server did not answer within 120 s; see worker.log');
    const pageUp = await waitForHttp(pageUrl, 20_000);
    if (!pageUp) throw new Error('the page server did not answer');
    run.log('room server and page server answer');

    await playGame(run, options);
    exitCode = run.knownFailures.length === 0 ? 0 : 1;
  } catch (error) {
    if (error instanceof AssertionFailure) {
      run.log(`ASSERTION FAILED: ${error.message}`);
    } else {
      run.log(`ERROR: ${error.stack ?? error.message}`);
    }
    try {
      await run.saveFailureEvidence();
    } catch (evidenceError) {
      run.log(`could not save the evidence: ${evidenceError.message}`);
    }
    exitCode = 1;
  }

  const seconds = Math.round((Date.now() - run.startedAt) / 1000);
  const summary = {
    framework: options.framework,
    exitCode,
    durationSeconds: seconds,
    assertions: Object.fromEntries(run.counters.values),
    assertionTotal: run.counters.total(),
    knownFailures: run.knownFailures,
    failure: run.failure === null ? null : run.failure.message,
  };
  writeFileSync(join(outDirectory, 'summary.json'), JSON.stringify(summary, null, 2));
  run.log(`RESULT ${exitCode === 0 ? 'PASS' : 'FAIL'} in ${Math.floor(seconds / 60)}m${seconds % 60}s, ${summary.assertionTotal} assertions, ${run.knownFailures.length} known failures`);
  for (const [name, count] of run.counters.values) run.log(`  ${count} x ${name}`);
  for (const failure of run.knownFailures) run.log(`  known ${failure.known}: ${failure.name} (${failure.where}, ${failure.screen}) expected ${failure.expected} found ${failure.found}`);

  await cleanup();
  const leftover = [];
  if (!options.reuseServers) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 1500));
    for (const port of [options.pagePort, options.workerPort, options.inspectorPort]) {
      if (await isListening(port)) leftover.push(port);
    }
  }
  if (leftover.length > 0) {
    run.log(`WARNING: ports still listening after shutdown: ${leftover.join(', ')}`);
    exitCode = 1;
  } else {
    run.log('shutdown complete: no listener left on the ports');
  }
  process.exit(exitCode);
}

main();
