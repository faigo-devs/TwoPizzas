import { assertSameJson, assertSameNumbers } from './events.mjs';
import { dictionaries } from '../../../app/i18n/index.ts';
import { sleep } from './session-run.mjs';

const ScrumEvents = ['work', 'plan', 'daily', 'inspect', 'retro'];
const KanbanEvents = ['plan', 'daily', 'inspect', 'retro'];

/**
 * The session sheet, the new team name, the publication and the appearance of the team on the start screen's list.
 */
export async function summaryEvent(run, state, { leaderboardDeadlineMs = 180_000 }) {
  await run.waitScreen('summary');
  const framework = run.framework;
  for (const player of run.players) {
    const sheet = (player.dom.sheetText ?? '').toLowerCase();
    const has = (text) => sheet.includes(String(text).toLowerCase());
    run.check(player.dom.sheetText !== null, 'the session sheet is shown', { player, expected: 'a .lg-sheet', found: 'none' });
    for (const iteration of [1, 2]) {
      const label = player.t(`iteration.${framework}`, { n: iteration });
      run.check(has(label), `the session sheet shows ${framework} iteration ${iteration}`, { player, expected: label, found: 'missing' });
    }
    const events = framework === 'scrum' ? ScrumEvents : KanbanEvents;
    for (const event of events) {
      const base = `phase.${framework}.${event}`;
      for (const key of [`${base}.purpose`, `${base}.real`].filter((name) => name in dictionaries.en)) {
        run.check(has(player.t(key)), 'the session sheet has the purpose and duration of each event', { player, expected: key, found: 'missing' });
      }
    }
    for (const key of ['summary.purpose', 'summary.duration', 'observation.typicalMistake']) {
      run.check(has(player.t(key)), 'the session sheet has the purpose, duration and typical mistake block', { player, expected: key, found: 'missing' });
    }
    const history = player.view.summary.observationHistory.flatMap((entry) => entry.observations);
    run.check(history.length > 0, 'the session sheet has per-event observations', { player, expected: 'at least one observation', found: '0' });
    for (const observation of history) {
      const title = player.t(`observation.${observation.id}.title`);
      run.check(has(title), 'each observation of the history is on the sheet', { player, expected: title, found: 'missing' });
    }
    run.check(
      player.view.summary.observationHistory.some((entry) => entry.iteration === 1) && player.view.summary.observationHistory.some((entry) => entry.iteration === 2),
      'observations exist for both iterations',
      { player, expected: 'iterations 1 and 2', found: JSON.stringify(player.view.summary.observationHistory.map((entry) => `${entry.iteration}:${entry.event}`)) },
    );
  }
  assertSameNumbers(run, 'summary');
  assertSameJson(run, 'the summary score is the same on all pages', (view) => view.summary.score);
  assertSameJson(run, 'the summary metrics are the same on all pages', (view) => view.summary.metrics);
  run.check(run.players[0].view.summary.metrics.length === 2, 'the summary has both iterations', { expected: '2', found: String(run.players[0].view.summary.metrics.length) });

  const facilitator = run.facilitator();
  const others = run.players.filter((player) => player !== facilitator);
  run.check(facilitator.view.controls.includes('publish') && others.every((player) => !player.view.controls.includes('publish')), 'only the facilitator may publish', {
    expected: 'publish only for the facilitator',
    found: run.players.map((player) => player.view.controls.join(',')).join(' | '),
  });
  const firstName = facilitator.view.teamName;
  await facilitator.clickKey('summary.anotherName');
  await run.until('a new team name on every page', () => run.players.every((player) => player.view.teamName !== firstName), { timeoutMs: 20_000 });
  const teamName = facilitator.view.teamName;
  run.check(run.players.every((player) => player.view.teamName === teamName), 'the new team name is the same on all pages', { expected: teamName, found: run.players.map((p) => p.view.teamName).join(',') });
  run.log(`team name changed from "${firstName}" to "${teamName}"`);
  await facilitator.clickKey('summary.publish');
  await run.until('published on every page', () => run.players.every((player) => player.view.summary.published), { timeoutMs: 30_000 });
  const publishCount = await facilitator.exec(`return await page.getByRole('button', { name: A.name, exact: true }).count();`, { name: facilitator.t('summary.publish') });
  run.check(publishCount === 0, 'the publish control disappears after publishing', { player: facilitator, expected: '0 publish buttons', found: String(publishCount) });
  run.check(!facilitator.view.controls.includes('publish'), 'the publish control is gone from the facilitator\'s controls', { player: facilitator, expected: 'no publish', found: facilitator.view.controls.join(',') });
  run.check(facilitator.hasText(facilitator.t('summary.published')), 'the published confirmation is shown', { player: facilitator, expected: facilitator.t('summary.published'), found: 'missing' });

  await facilitator.clickKey('summary.again');
  await run.until('the facilitator is back on the start screen', () => facilitator.hasText(facilitator.t('start.create')), { timeoutMs: 20_000, players: [facilitator] });
  const startedAt = Date.now();
  let found = false;
  let attempts = 0;
  while (!found && Date.now() - startedAt < leaderboardDeadlineMs) {
    attempts += 1;
    await facilitator.exec(`page.__e2e.tolerateAbortUntil = Date.now() + 6000; await page.goto(A.url, { waitUntil: 'load' }); return true;`, { url: run.pageUrl });
    if (framework === 'kanban') await facilitator.exec(`return await chooseValue('kanban');`);
    await sleep(1500);
    await facilitator.probe();
    found = facilitator.hasText(teamName);
    if (!found) await sleep(12_000);
  }
  const waited = Math.round((Date.now() - startedAt) / 1000);
  run.log(`the published team "${teamName}" ${found ? 'appeared' : 'did not appear'} on the start screen's list after ${waited}s (${attempts} loads)`);
  run.check(found, `the published team appears in the ${framework} list within the deadline`, { player: facilitator, expected: `"${teamName}" on the start screen`, found: `not seen after ${waited}s` });
  const board = await facilitator.exec(`return await page.locator('body').innerText();`);
  run.check(board.includes(teamName) && board.toLowerCase().includes(facilitator.t(`leaderboard.month.${framework}`).toLowerCase()), 'the team is under the list of its own framework', { player: facilitator, expected: facilitator.t(`leaderboard.month.${framework}`), found: board.slice(0, 160) });
  const other = framework === 'scrum' ? 'kanban' : 'scrum';
  await facilitator.exec(`return await chooseValue(A.value);`, { value: other });
  await sleep(500);
  const otherBoard = await facilitator.exec(`return await page.locator('body').innerText();`);
  run.check(!otherBoard.includes(teamName), 'the team is not in the other framework\'s list', { player: facilitator, expected: 'absent', found: 'present' });
  state.leaderboardWaitSeconds = waited;
}
