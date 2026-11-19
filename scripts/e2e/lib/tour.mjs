import { sleep } from './session-run.mjs';

const Totals = { scrum: 14, kanban: 15 };

async function tourOf(run, player, framework) {
  const t = player.t;
  if (framework === 'kanban') await player.exec(`return await chooseValue('kanban');`);
  await player.clickKey('start.solo');
  const total = Totals[framework];
  for (let step = 1; step <= total; step += 1) {
    const label = t('tour.step', { n: step, total });
    await run.until(`tour ${framework} shows ${label}`, () => player.dom.text.toLowerCase().includes(label.toLowerCase()), { timeoutMs: 20_000, players: [player] });
    await sleep(500);
    await player.probe();
    const active = player.dom.active;
    run.check(active !== null && active.id === 'lg-coach-title', `tour ${framework}: the coach heading has focus on each step`, {
      player,
      expected: 'focus on the coach heading',
      found: active === null ? 'none' : `${active.tag}#${active.id}`,
    });
    run.counters.bump(`tour ${framework} steps shown`);
    await player.clickKey(step === total ? 'tour.finish' : 'tour.next', {}, '.lg-coach__moves');
  }
  await run.until(`tour ${framework} closing panel`, () => player.dom.text.toLowerCase().includes(t('tour.end.title').toLowerCase()), { timeoutMs: 20_000, players: [player] });
  run.check(true, `tour ${framework}: the closing panel follows the last step`, { player });
  await player.clickKey('summary.again');
  await run.until(`tour ${framework} back on the start screen`, () => player.hasText(t('start.create')), { timeoutMs: 20_000, players: [player] });
  run.check(true, `tour ${framework}: the closing panel returns to the start screen`, { player });
}

/**
 * Walks the guided tour of both frameworks with Next from the first stop to the closing panel, one page, no room.
 */
export async function playTour(run) {
  const player = run.createPlayer({ number: 1, lang: 'en', width: 1280, height: 900, name: 'tour' });
  await player.open(run.pageUrl);
  await run.until('the start screen is drawn', () => player.hasText(player.t('start.solo')), { timeoutMs: 20_000, players: [player] });
  await tourOf(run, player, 'scrum');
  await tourOf(run, player, 'kanban');
}
