import { sleep } from './session-run.mjs';

const Cards = [1, 2, 3, 5, 8, 13];
const same = (values) => values.every((value) => value === values[0]);

/**
 * The facilitator opens the phase that shows its card; nobody else has the control.
 */
export async function beginPhase(run) {
  const facilitator = run.facilitator();
  run.check(facilitator.view.controls.includes('begin_phase'), 'the facilitator may begin the phase', {
    player: facilitator,
    expected: 'begin_phase control',
    found: facilitator.view.controls.join(','),
  });
  const others = run.players.filter((player) => player !== facilitator);
  run.check(
    others.every((player) => !player.view.controls.includes('begin_phase')),
    'only the facilitator may begin the phase',
    { expected: 'no begin_phase for the others', found: others.map((p) => p.view.controls.join(',')).join(' | ') },
  );
  await facilitator.clickKey('phase.begin');
}

/**
 * Compares the numbers shown in the same boxes on all three pages.
 */
export function assertSameNumbers(run, name) {
  const selectors = new Set(run.players.flatMap((player) => Object.keys(player.dom.numberBoxes)));
  for (const selector of selectors) {
    const lists = run.players.map((player) => (player.dom.numberBoxes[selector] ?? '').match(/\d+/g)?.join(',') ?? '');
    run.check(same(lists), `${name}: numbers in ${selector} are identical on all pages`, {
      expected: lists[0],
      found: lists.join(' | '),
    });
  }
}

export function assertSameJson(run, name, pick) {
  const values = run.players.map((player) => JSON.stringify(pick(player.view)));
  run.check(same(values), name, { expected: values[0], found: values.join(' | ') });
}

async function voteAll(run, values) {
  await Promise.all(run.players.map((player, index) => player.clickKey('poker.vote', { value: values[index] })));
}

/**
 * Sprint Planning: goal votes and confirmation, planning poker on several items, and the selection of the Sprint Backlog.
 */
export async function scrumPlanning(run, iteration, { estimateCount, pullCount }) {
  const at = (step) => `plan:${iteration}:0:${step}`;
  await run.waitScreen(at('card'));
  await beginPhase(run);
  await run.waitScreen(at('goal'));
  const facilitator = run.facilitator();
  const options = facilitator.view.planning.goalOptions;
  run.check(options.length >= 1, 'goal options are offered', { expected: 'at least 1', found: String(options.length) });
  const picks = [options[0], options[0], options[1] ?? options[0]];
  await Promise.all(run.players.map((player, index) => player.exec(`return await chooseOption('plan-goal', A.theme);`, { theme: picks[index] })));
  await run.until('three goal votes counted', () => run.players.every((player) => Object.values(player.view.planning.goalVotes).reduce((sum, count) => sum + count, 0) === 3), { timeoutMs: 20_000 });
  assertSameJson(run, 'goal votes are the same on all pages', (view) => view.planning.goalVotes);
  run.check(run.players.every((player, index) => player.view.planning.myGoalVote === picks[index]), 'each page remembers its own goal vote', { expected: picks.join(','), found: run.players.map((p) => p.view.planning.myGoalVote).join(',') });
  run.check(facilitator.view.controls.includes('confirm_goal'), 'the facilitator may confirm the goal', { player: facilitator, expected: 'confirm_goal', found: facilitator.view.controls.join(',') });
  await facilitator.clickKey('goal.confirm');
  await run.waitScreen(at('estimate'));
  run.check(run.players.every((player) => player.view.planning.goal === options[0]), 'the goal with the most votes is confirmed', { expected: options[0], found: run.players.map((p) => p.view.planning.goal).join(',') });

  for (let round = 0; round < estimateCount; round += 1) {
    await run.until('a poker item is open on every page', () => run.players.every((player) => player.screenKey() === at('commit') || (player.view.planning.poker !== null && !player.view.planning.poker.revealed)), { timeoutMs: 20_000 });
    if (run.players[0].screenKey() === at('commit')) break;
    const itemId = run.players[0].view.planning.poker.itemId;
    const pick = (offset) => Cards[(round + offset) % Cards.length];
    if (round === 1) {
      await Promise.all(run.players.slice(0, 2).map((player, index) => player.clickKey('poker.vote', { value: pick(index) })));
      await run.until('two votes are in', () => run.players.every((player) => player.view.planning.poker.voted.length === 2), { timeoutMs: 20_000 });
      run.check(run.players.every((player) => player.view.planning.poker.votes === null), 'poker votes stay hidden before the reveal', { expected: 'votes null on every page', found: JSON.stringify(run.players.map((p) => p.view.planning.poker.votes)) });
      run.check(facilitator.view.controls.includes('poker_reveal'), 'the facilitator may reveal early', { player: facilitator, expected: 'poker_reveal', found: facilitator.view.controls.join(',') });
      await facilitator.clickKey('poker.reveal');
      await run.until('the cards are revealed', () => run.players.every((player) => player.view.planning.poker.revealed), { timeoutMs: 20_000 });
      run.check(run.players.every((player) => Object.keys(player.view.planning.poker.votes).length === 2), 'the revealed votes are shown on every page', { expected: '2 votes', found: JSON.stringify(run.players.map((p) => p.view.planning.poker.votes)) });
      await facilitator.clickKey('poker.revote');
      await run.until('the vote is open again', () => run.players.every((player) => !player.view.planning.poker.revealed && player.view.planning.poker.voted.length === 0), { timeoutMs: 20_000 });
      run.counters.bump('poker revote used');
    }
    await voteAll(run, [pick(0), pick(1), pick(2)]);
    await run.until('all cards are on the table', () => run.players.every((player) => player.view.planning.poker.revealed), { timeoutMs: 20_000 });
    assertSameJson(run, 'revealed poker votes are the same on all pages', (view) => view.planning.poker.votes);
    const median = facilitator.view.planning.poker.median;
    run.check(median !== null, 'a median is offered after the reveal', { player: facilitator, expected: 'a card', found: String(median) });
    await run.players[0].probe();
    await facilitator.clickKey('poker.recordMedian', { value: median });
    await run.until(
      `item ${itemId} is estimated`,
      () => run.players.every((player) => player.view.items.find((item) => item.id === itemId).estimate === median),
      { timeoutMs: 20_000 },
    );
    run.counters.bump('poker items estimated');
  }
  if (run.players[0].screenKey() === at('estimate')) {
    await facilitator.clickKey('poker.stop');
  }
  await run.waitScreen(at('commit'));

  const backlog = facilitator.view.items.filter((item) => item.status === 'backlog').sort((a, b) => Number(a.estimate === null) - Number(b.estimate === null));
  const chosen = backlog.slice(0, pullCount).map((item) => item.id);
  for (const id of chosen) {
    await run.players[run.players.indexOf(facilitator)].exec(`return await clickButton(pullOf(A.id), A.name);`, { id, name: facilitator.t('commit.pull') });
  }
  await run.until('selected items on every page', () => run.players.every((player) => player.view.items.filter((item) => item.status === 'todo').length === chosen.length), { timeoutMs: 30_000 });
  run.check(run.players.every((player) => player.hasText(player.t('commit.pulled', { count: chosen.length }))), 'the Sprint Backlog shows how many items were selected', { expected: facilitator.t('commit.pulled', { count: chosen.length }), found: 'missing' });
  await facilitator.clickKey('commit.start');
  await run.waitScreen(`work:${iteration}:1:card`);
}

/**
 * Kanban Replenishment: players move requests to Ready; in round 2 the facilitator also sets the WIP limits.
 */
export async function kanbanReplenishment(run, iteration, { limits }) {
  const at = (step) => `plan:${iteration}:0:${step}`;
  await run.waitScreen(at('card'));
  await beginPhase(run);
  await run.waitScreen(at('replenish'));
  const facilitator = run.facilitator();
  const readyMax = facilitator.view.planning.replenish.readyMax;
  const pool = facilitator.view.items.filter((item) => item.status === 'backlog').map((item) => item.id);
  const chosen = pool.slice(0, readyMax);
  for (let index = 0; index < chosen.length; index += 1) {
    const mover = run.players[1 + (index % 2)];
    await mover.exec(`return await clickButton(pullOf(A.id), A.name);`, { id: chosen[index], name: mover.t('replenish.pull') });
  }
  await run.until('requests in Ready on every page', () => run.players.every((player) => player.view.items.filter((item) => item.status === 'todo').length === chosen.length), { timeoutMs: 30_000 });
  run.check(
    run.players.every((player) => player.hasText(`${chosen.length} / ${readyMax}`)),
    'Ready shows how many places are taken',
    { expected: `${chosen.length} / ${readyMax}`, found: 'missing' },
  );
  const extra = pool.find((id) => !chosen.includes(id));
  if (extra !== undefined) {
    const buttonDisabled = await facilitator.exec(`return await buttonIn(pullOf(A.id), A.name).isDisabled();`, { id: extra, name: facilitator.t('replenish.pull') });
    run.check(buttonDisabled, 'Ready refuses a request beyond its size', { player: facilitator, expected: 'the move button is disabled', found: 'enabled' });
  }
  await facilitator.clickKey(iteration === 2 ? 'replenish.toLimits' : 'replenish.start');
  if (iteration === 2) {
    await run.waitScreen(at('limits'));
    await facilitator.exec(`await page.locator('#limit-doing').selectOption(A.value); await page.locator('#limit-review').selectOption(A.value2); return true;`, {
      value: String(limits.inProgress),
      value2: String(limits.review),
    });
    await facilitator.clickKey('limits.save');
    await run.until('the limits reach every page', () => run.players.every((player) => player.view.limits !== null && player.view.limits.inProgress === limits.inProgress && player.view.limits.review === limits.review), { timeoutMs: 20_000 });
    run.counters.bump('limits set and shown on every page');
    await facilitator.clickKey('replenish.start');
  }
  await run.waitScreen(`work:${iteration}:1:card`);
}

/**
 * The review of the iteration: verdicts revealed one by one, the escaped defect shown only at its reveal, the numbers and the feedback.
 */
export async function reviewEvent(run, state, iteration) {
  const kanban = run.framework === 'kanban';
  const at = (step) => `inspect:${iteration}:0:${step}`;
  const rejected = (player) => player.t('inspect.verdict.rejected');
  await run.waitScreen(at('card'));
  for (const player of run.players) {
    run.check(!player.hasText(rejected(player)), 'no escaped defect is announced before the review', { player, expected: `no "${rejected(player)}"`, found: 'present' });
  }
  await beginPhase(run);
  await run.waitScreen(at('increment'));
  const facilitator = run.facilitator();
  const total = facilitator.view.inspect.verdictsTotal;
  run.log(`review: ${total} verdicts to reveal`);
  for (const player of run.players) {
    run.check(!player.hasText(rejected(player)), 'no escaped defect is announced before the first verdict', { player, expected: `no "${rejected(player)}"`, found: 'present' });
    run.check(player.view.inspect.verdicts.length === 0, 'no verdict is shown before the reveal', { player, expected: '0', found: String(player.view.inspect.verdicts.length) });
  }
  for (let shown = 1; shown <= total; shown += 1) {
    run.check(facilitator.view.controls.includes('reveal_verdict'), 'the facilitator may reveal the next verdict', { player: facilitator, expected: 'reveal_verdict', found: facilitator.view.controls.join(',') });
    await facilitator.clickKey('inspect.reveal');
    await run.until(`verdict ${shown} shown on every page`, () => run.players.every((player) => player.view.inspect.verdicts.length === shown), { timeoutMs: 20_000 });
    run.counters.bump('verdicts revealed one by one');
    for (const player of run.players) {
      const text = player.t('inspect.revealed', { shown, total });
      if (shown < total) run.check(player.hasText(text), 'the reveal counter is shown', { player, expected: text, found: 'missing' });
    }
  }
  assertSameJson(run, 'verdict lists are the same on all pages', (view) => view.inspect.verdicts);
  const verdicts = facilitator.view.inspect.verdicts;
  const defects = verdicts.filter((verdict) => verdict.outcome === 'escaped_defect');
  const accepted = verdicts.filter((verdict) => verdict.outcome === 'accepted');
  run.log(`review verdicts: ${accepted.length} accepted, ${defects.length} escaped defects`);
  if (iteration === state.scenarioIteration) {
    run.check(accepted.length >= 1, 'an item was done with a right answer and an LGTM', { expected: 'at least one accepted item', found: String(accepted.length) });
    const lgtmWrong = verdicts.find((verdict) => verdict.itemId === state.lgtmWrongItem);
    run.check(lgtmWrong !== undefined && lgtmWrong.outcome === 'escaped_defect', 'the wrong answer that got an LGTM is an escaped defect', {
      expected: `${state.lgtmWrongItem} escaped_defect`,
      found: JSON.stringify(lgtmWrong),
    });
    for (const player of run.players) {
      run.check(player.hasText(rejected(player)), 'the escaped defect appears as "Wrong answer (escaped defect)" at the review', { player, expected: rejected(player), found: 'missing' });
    }
    const fixed = verdicts.find((verdict) => verdict.itemId === state.changesItem);
    run.check(fixed !== undefined && fixed.outcome === 'accepted', 'the item that came back with Request changes was fixed and accepted', {
      expected: `${state.changesItem} accepted`,
      found: JSON.stringify(fixed),
    });
  }
  await facilitator.clickPrimary('phase.next');
  await run.waitScreen(at(kanban ? 'flow' : 'result'));
  assertSameNumbers(run, `${run.framework} review ${kanban ? 'flow' : 'result'}`);
  assertSameJson(run, 'iteration metrics are the same on all pages', (view) => view.metrics);
  if (!kanban) {
    assertSameJson(run, 'the result is the same on all pages', (view) => [view.inspect.goalMet, view.inspect.valueDelivered, view.inspect.goalBonus, view.inspect.velocity]);
  } else {
    assertSameJson(run, 'the flow metrics are the same on all pages', (view) => view.inspect.flow);
  }
  await facilitator.clickPrimary('phase.next');
  if (kanban && iteration === 2) {
    await run.waitScreen(at('comparison'));
    assertSameNumbers(run, 'kanban comparison');
    assertSameJson(run, 'the comparison is the same on all pages', (view) => view.inspect.comparison);
    run.check(facilitator.view.inspect.comparison !== null, 'the two rounds are compared', { player: facilitator, expected: 'a comparison', found: 'null' });
    await facilitator.clickPrimary('phase.next');
  } else if (!kanban && iteration === 1) {
    await run.waitScreen(at('feedback'));
    assertSameJson(run, 'the feedback is the same on all pages', (view) => view.inspect.feedback);
    await facilitator.clickPrimary('phase.next');
  }
  await run.waitScreen(`retro:${iteration}:0:card`);
}

async function addNote(run, player, column, text) {
  const before = player.view.retro.notes.filter((note) => note.mine).length;
  await player.exec(
    `
    await chooseOption('retro-column', A.column);
    await page.locator('#retro-note').fill(A.text);
    return await clickButton(null, A.add);
  `,
    { column, text, add: player.t('retro.noteAdd') },
  );
  await run.until(`${player.label} note added`, () => player.view.retro.notes.filter((note) => note.mine).length === before + 1, { timeoutMs: 20_000 });
}

async function helperNote(run, player) {
  const t = player.t;
  await player.clickKey('retro.help.button');
  await run.until('the helper opens', () => player.view.retro.help !== null && player.view.retro.help.questions.length > 0, { timeoutMs: 20_000 });
  const questions = player.view.retro.help.questions.length;
  for (let index = 0; index < questions; index += 1) {
    await player.exec(`await page.locator('.lg-ask').nth(A.index).locator('button.lg-pick').first().click({ timeout: 8000 }); return true;`, { index });
  }
  await run.until('the helper proposes notes', () => player.view.retro.help.proposals.length > 0, { timeoutMs: 20_000 });
  await player.exec(`await page.locator('.lg-helper__proposals li button').first().click({ timeout: 8000 }); return true;`);
  await sleep(300);
  const draft = await player.exec(`return await page.locator('#retro-note').inputValue();`);
  run.check(draft.trim().length > 0, 'the helper proposal fills the note field', { player, expected: 'a non-empty draft', found: JSON.stringify(draft) });
  const before = player.view.retro.notes.filter((note) => note.mine).length;
  await player.clickKey('retro.noteAdd');
  await run.until('the helper note is added', () => player.view.retro.notes.filter((note) => note.mine).length === before + 1, { timeoutMs: 20_000 });
  const note = player.view.retro.notes.find((own) => own.mine);
  run.check(note.text.trim().length > 0, 'the "I do not know what to write" helper works end to end', { player, expected: 'a note made from a proposal', found: note.text });
  return t('retro.noteAdd');
}

/**
 * The retrospective: notes (one through the helper), the reveal, two votes each and the facilitator's action.
 */
export async function retroEvent(run, state, iteration, { agreementChoice }) {
  const at = (step) => `retro:${iteration}:0:${step}`;
  await run.waitScreen(at('card'));
  await beginPhase(run);
  const facilitator = run.facilitator();
  if (iteration === 2) {
    await run.waitScreen(at('previous'));
    const previous = facilitator.view.retro.previous;
    run.check(previous !== null && previous.kept !== null && previous.kept !== undefined, 'the previous action is checked and reported', {
      player: facilitator,
      expected: 'a tracked agreement with kept or broken',
      found: JSON.stringify(previous),
    });
    assertSameJson(run, 'the previous action result is the same on all pages', (view) => view.retro.previous);
    for (const player of run.players) {
      const text = player.view.retro.previous.kept ? player.t('retro.previous.kept') : player.t('retro.previous.broken', { count: player.view.retro.previous.violations ?? 0 });
      run.check(player.hasText(text), 'the previous action result is shown', { player, expected: text, found: 'missing' });
    }
    await facilitator.clickPrimary('phase.next');
  }
  await run.waitScreen(at('notes'));
  const [first, second, third] = run.players;
  const texts = [`went well in iteration ${iteration} by ${first.label}`, `slowed us in iteration ${iteration} by ${second.label}`];
  await Promise.all([addNote(run, first, 'went_well', texts[0]), addNote(run, second, 'slowed_us', texts[1])]);
  await helperNote(run, third);
  await run.until('every player has a note', () => run.players.every((player) => player.view.retro.notes.filter((note) => note.mine).length === 1), { timeoutMs: 20_000 });
  for (const player of run.players) {
    run.check(player.view.retro.notes.every((note) => note.mine), 'others\' notes stay hidden before the reveal', { player, expected: 'only own notes', found: JSON.stringify(player.view.retro.notes.map((note) => note.mine)) });
    run.check(Object.values(player.view.retro.hiddenCounts).reduce((sum, count) => sum + count, 0) === 2, 'hidden notes are only counted', { player, expected: '2 hidden', found: JSON.stringify(player.view.retro.hiddenCounts) });
  }
  await facilitator.clickKey('retro.reveal');
  await run.waitScreen(at('vote'));
  run.check(run.players.every((player) => player.view.retro.notes.length === 3), 'all notes are shown after the reveal', { expected: '3 notes on every page', found: run.players.map((p) => p.view.retro.notes.length).join(',') });
  const ids = run.players[0].view.retro.notes.map((note) => note.id);
  const noteTexts = new Map(run.players[0].view.retro.notes.map((note) => [note.id, note.text]));
  await Promise.all(
    run.players.map(async (player, index) => {
      for (const id of [ids[index % 3], ids[(index + 1) % 3]]) {
        await player.exec(`return await clickButton(page.locator('li.lg-note').filter({ hasText: A.text }), A.name);`, { text: noteTexts.get(id), name: player.t('retro.vote') });
      }
    }),
  );
  await run.until('everyone has voted twice', () => run.players.every((player) => player.view.retro.votesLeft === 0 && player.view.retro.myVotes.length === 2), { timeoutMs: 30_000 });
  run.counters.bump('retro votes cast', 6);
  await run.probeAll();
  const totals = ids.map((id) => run.players[0].view.retro.notes.find((note) => note.id === id).votes);
  run.check(totals.reduce((sum, count) => sum + count, 0) === 6, 'six votes are counted on the notes', { expected: '6', found: JSON.stringify(totals) });
  assertSameJson(run, 'vote counts are the same on all pages', (view) => view.retro.notes.map((note) => [note.id, note.votes]));
  await facilitator.clickPrimary('phase.next');
  await run.waitScreen(at('action'));
  const suggestions = facilitator.view.retro.suggestedAgreements;
  const choice = agreementChoice(suggestions);
  run.log(`retro action: ${choice} out of ${suggestions.join(',')}`);
  run.check(suggestions.includes(choice), 'the chosen agreement is among the suggestions', { player: facilitator, expected: choice, found: suggestions.join(',') });
  await facilitator.exec(`return await chooseOption('retro-action', A.type);`, { type: choice });
  await facilitator.clickKey('retro.action.choose');
  await run.until('the action is chosen on every page', () => run.players.every((player) => player.view.retro.action !== null && player.view.retro.action.type === choice), { timeoutMs: 20_000 });
  run.counters.bump('retro action chosen and shown');
  state.agreements.push(choice);
  await facilitator.clickPrimary('retro.end');
  await run.waitScreen(iteration === 1 ? 'plan:2:0:card' : 'summary');
}
