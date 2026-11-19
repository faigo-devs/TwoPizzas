import { sleep } from './session-run.mjs';
import { tokenName } from './player.mjs';
import { canonical, sameResponse, solve, wrongResponse } from './solvers.mjs';

export function newWorkState({ thinkMs, reviewThinkMs }) {
  return {
    thinkMs,
    reviewThinkMs,
    readySince: new Map(),
    reviewSince: new Map(),
    tags: new Map(),
    changesItem: null,
    lgtmWrongItem: null,
    pairSolved: [],
    dependencySolved: [],
    helpPromised: [],
    reloaded: false,
    duplicated: false,
    limitStage: 0,
    limitHit: false,
    submissions: 0,
    verdicts: [],
    scenarioIteration: 1,
    agreements: [],
  };
}

function itemOf(player, id) {
  return player.view.items.find((own) => own.id === id);
}

function playerOf(run, selfId) {
  return run.players.find((player) => player.selfId === selfId);
}

function isRunning(view) {
  return view.phase.kind === 'work' && view.phase.step === 'running';
}

function labelsFor(player, response) {
  const t = player.t;
  const labels = { mark: {}, moveUp: {}, action: null, mergeInputs: [] };
  if (response.kind === 'review') for (const key of response.keys) labels.mark[key] = t('puzzle.review.mark', { key });
  if (response.kind === 'order') for (const name of response.order) labels.moveUp[name] = t('puzzle.order.moveUp', { label: name });
  if (response.kind === 'incident') labels.action = tokenName(t, 'action', response.action);
  if (response.kind === 'merge') {
    labels.mergeInputs = response.values.map((_, index) => `${t('puzzle.merge.result')}, ${t('puzzle.merge.line')} ${index + 1}`);
  }
  return labels;
}

function readiness(run, item) {
  const parts = [];
  for (const workerId of item.workers) {
    const owner = playerOf(run, workerId);
    const workspace = owner.view.workspace;
    if (workspace === null || workspace.itemId !== item.id || workspace.mode !== 'work' || workspace.part === null) return null;
    parts.push(workspace.part);
  }
  if (parts.length < (item.workersNeeded ?? 1)) return null;
  if (item.blocked && item.helpPromisedBy === null) return null;
  const held = run.players.flatMap((player) => player.view.held.filter((entry) => entry.itemId === item.id).map((entry) => entry.part));
  if (item.blocked && held.length === 0) return null;
  const puzzle = canonical([...parts, ...held]);
  const response = solve(puzzle);
  if (response === null) return null;
  return { puzzle, response, parts, held };
}

function decideSubmission(run, state, player, item, ready) {
  let response = ready.response;
  let tag = 'right';
  const existing = state.tags.get(item.id);
  if (existing === undefined && item.changesRequested === 0 && run.currentIteration === state.scenarioIteration) {
    if (state.changesItem === null) {
      tag = 'changes';
      state.changesItem = item.id;
    } else if (state.lgtmWrongItem === null) {
      tag = 'lgtmWrong';
      state.lgtmWrongItem = item.id;
    }
    if (tag !== 'right') state.tags.set(item.id, tag);
  }
  if (tag !== 'right') response = wrongResponse(ready.response, ready.puzzle);
  if (ready.parts.length > 1 && !state.pairSolved.some((entry) => entry.itemId === item.id)) {
    state.pairSolved.push({ itemId: item.id, partsDiffer: JSON.stringify(ready.parts[0]) !== JSON.stringify(ready.parts[1]), kind: item.kind });
  }
  if (ready.held.length > 0 && !state.dependencySolved.some((entry) => entry.itemId === item.id)) {
    const holder = run.players.find((candidate) => candidate.view.held.some((entry) => entry.itemId === item.id));
    state.dependencySolved.push({ itemId: item.id, holder: holder.label, kind: item.kind });
  }
  return { response, tag };
}

function decide(run, state, ctx) {
  const actions = [];
  const claimed = new Set();
  let takes = 0;
  const order = run.players.map((_, index) => (index + ctx.cycle) % run.players.length);
  for (const index of order) {
    const player = run.players[index];
    const view = player.view;
    const workspace = view.workspace;
    const now = Date.now();
    const doing = view.items.filter((item) => item.status === 'doing' && item.workers.includes(view.selfId));
    if (workspace !== null) {
      const item = itemOf(player, workspace.itemId);
      if (item === undefined) continue;
      if (workspace.mode === 'work') {
        if (workspace.part === null) continue;
        if (item.status !== 'doing') {
          actions.push({ player, type: 'close' });
          continue;
        }
        const ready = readiness(run, item);
        if (ready === null) continue;
        if (!state.readySince.has(item.id + item.changesRequested)) state.readySince.set(item.id + item.changesRequested, now);
        if (now - state.readySince.get(item.id + item.changesRequested) < state.thinkMs) continue;
        if (player.selfId !== item.workers[0] || !workspace.canSubmit) continue;
        const { response, tag } = decideSubmission(run, state, player, item, ready);
        actions.push({ player, type: 'submit', item, response, tag });
        continue;
      }
      if (item.status !== 'review' || item.reviewer !== view.selfId) {
        actions.push({ player, type: 'close' });
        continue;
      }
      if (workspace.part === null || !workspace.canVerdict) continue;
      if (!state.reviewSince.has(item.id + item.changesRequested)) state.reviewSince.set(item.id + item.changesRequested, now);
      if (now - state.reviewSince.get(item.id + item.changesRequested) < state.reviewThinkMs) continue;
      const truth = solve(canonical([workspace.part]));
      const correct = sameResponse(workspace.submission, truth);
      const tag = state.tags.get(item.id);
      let verdict = correct ? 'lgtm' : 'changes';
      if (tag === 'lgtmWrong') verdict = 'lgtm';
      if (tag === 'changes' && item.changesRequested === 0) verdict = 'changes';
      actions.push({ player, type: 'verdict', item, verdict, correct, tag });
      continue;
    }
    const reviewing = view.items.find((item) => item.status === 'review' && item.reviewer === view.selfId);
    if (reviewing) {
      actions.push({ player, type: 'open', item: reviewing, mode: 'review' });
      continue;
    }
    const workable = doing.find((item) => !item.waitingForPair);
    if (workable) {
      actions.push({ player, type: 'open', item: workable, mode: 'work' });
      continue;
    }
    const promisable = view.items.find((item) => item.actions.includes('help.promise') && view.held.some((entry) => entry.itemId === item.id));
    if (promisable && !claimed.has(promisable.id)) {
      claimed.add(promisable.id);
      actions.push({ player, type: 'promise', item: promisable });
      continue;
    }
    const waiting = view.items.find((item) => item.actions.includes('item.take_review') && !claimed.has(item.id));
    if (waiting) {
      claimed.add(waiting.id);
      actions.push({ player, type: 'takeReview', item: waiting });
      continue;
    }
    const join = view.items.find((item) => item.status === 'doing' && item.actions.includes('item.take') && !claimed.has(item.id));
    if (join) {
      claimed.add(join.id);
      actions.push({ player, type: 'join', item: join });
      continue;
    }
    const todo = view.items.find((item) => item.status === 'todo' && item.actions.includes('item.take') && !claimed.has(item.id));
    if (todo && takes === 0 && !ctx.holdTakes && doing.length === 0) {
      claimed.add(todo.id);
      takes += 1;
      actions.push({ player, type: 'take', item: todo });
    }
  }
  return actions;
}

async function execute(run, state, action) {
  const { player, item } = action;
  const t = player.t;
  if (action.type === 'take') return player.exec(`return await clickButton(cellOf(A.id), A.name);`, { id: item.id, name: t('item.take') });
  if (action.type === 'join') return player.exec(`return await clickButton(cellOf(A.id), A.name);`, { id: item.id, name: t('item.joinSecond') });
  if (action.type === 'takeReview') return player.exec(`return await clickButton(cellOf(A.id), A.name);`, { id: item.id, name: t('item.review') });
  if (action.type === 'promise') {
    state.helpPromised.push({ itemId: item.id, by: player.label });
    return player.exec(`return await clickButton(cellOf(A.id), A.name);`, { id: item.id, name: t('item.promiseHelp') });
  }
  if (action.type === 'open') return player.exec(`return await clickButton(cellOf(A.id), A.name);`, { id: item.id, name: t('item.open') });
  if (action.type === 'close') return player.click(t('item.close'));
  if (action.type === 'submit') {
    run.log(`${player.label} submits ${item.id} (${item.kind}, ${item.workers.length} workers) as ${action.tag}`);
    state.submissions += 1;
    return player.exec(
      `
      const entered = await enterAnswer(A.response, A.labels);
      if (!entered) throw new Error('the answer could not be entered');
      await clickButton(null, A.submit);
      return true;
    `,
      { response: action.response, labels: labelsFor(player, action.response), submit: t('item.submit') },
    );
  }
  if (action.type === 'verdict') {
    run.log(`${player.label} gives ${action.verdict} on ${item.id} (answer ${action.correct ? 'right' : 'wrong'}, tag ${action.tag ?? 'none'})`);
    state.verdicts.push({ itemId: item.id, verdict: action.verdict, correct: action.correct, tag: action.tag ?? null });
    return player.exec(`return await clickButton(page.locator('.lg-verdict__btns'), A.name);`, {
      name: t(action.verdict === 'lgtm' ? 'puzzle.verdict.lgtm' : 'puzzle.verdict.changes'),
    });
  }
  throw new Error(`unknown action ${action.type}`);
}

async function reloadSeat(run, player) {
  const before = { selfId: player.selfId, item: player.view.workspace === null ? null : player.view.workspace.itemId, screen: player.screenKey(), count: player.viewCount };
  run.log(`${player.label} reloads its page (open item ${before.item ?? 'none'})`);
  await player.exec(`page.__e2e.tolerateAbortUntil = Date.now() + 6000; await page.reload({ waitUntil: 'load' }); return true;`);
  await run.until(`${player.label} resumed after the reload`, () => player.viewCount > before.count && player.view !== null, { timeoutMs: 40_000 });
  run.check(player.selfId === before.selfId, 'a reload keeps the same seat', { player, expected: before.selfId, found: String(player.selfId) });
  run.check(player.welcome !== null && player.welcome.playerId === before.selfId, 'the server welcomes the same player after a reload', {
    player,
    expected: before.selfId,
    found: JSON.stringify(player.welcome),
  });
  run.check(player.screenKey() === before.screen, 'a reload resumes on the same screen', { player, expected: before.screen, found: player.screenKey() });
  if (before.item !== null) {
    const now = player.view.workspace;
    run.check(now !== null && now.itemId === before.item, 'a reload keeps the open item', {
      player,
      expected: before.item,
      found: now === null ? 'no open item' : now.itemId,
    });
  }
}

async function duplicateSeat(run, player) {
  const before = { selfId: player.selfId, count: player.viewCount };
  run.log(`${player.label} gets its seat opened in a second tab`);
  await player.exec(`
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 15000 }),
      page.evaluate(() => { window.open(location.href, '_blank'); }),
    ]);
    page.__e2eAttach(popup);
    await popup.waitForLoadState('load');
    page.__popup = popup;
    return true;
  `);
  await run.until(
    `${player.label} shows the open-somewhere-else state`,
    () => player.hasText(player.t('shell.elsewhereTitle')),
    { timeoutMs: 30_000 },
  );
  run.check(true, 'the older page shows the open-somewhere-else state', { player });
  await player.clickKey('shell.elsewhereTake');
  await run.until(
    `${player.label} took the seat back`,
    () => !player.hasText(player.t('shell.elsewhereTitle')) && player.viewCount > before.count,
    { timeoutMs: 30_000 },
  );
  run.check(player.selfId === before.selfId, 'Use this tab takes the same seat back', { player, expected: before.selfId, found: String(player.selfId) });
  const popupText = await player.exec(`
    await page.__popup.waitForFunction((title) => document.body.innerText.includes(title), A.title, { timeout: 20000 });
    const text = await page.__popup.evaluate(() => document.body.innerText);
    await page.__popup.close();
    page.__popup = null;
    return text;
  `, { title: player.t('shell.elsewhereTitle') });
  run.check(popupText.includes(player.t('shell.elsewhereTitle')), 'the second tab is the one shown as elsewhere afterwards', { player, expected: 'the elsewhere title in the second tab', found: popupText.slice(0, 120) });
  await run.probeAll();
}

async function limitCheck(run) {
  const view = run.players[2].view;
  const limit = view.kanban.limits.inProgress;
  for (const player of run.players) {
    const text = player.t('work.startLimit', { limit });
    run.check(player.hasText(text), 'the refusal text of the In Progress limit is shown', { player, expected: text, found: player.dom.text.slice(0, 160) });
    const disabled = await player.exec(
      `return await page.locator('.lg-cell button:disabled').filter({ hasText: exactText(A.take) }).count();`,
      { take: player.t('item.take') },
    );
    run.check(disabled >= 1, 'the Take button is disabled while the limit holds', { player, expected: 'at least one disabled Take', found: String(disabled) });
    const column = player.t('board.limitReached.doing', { limit });
    run.check(player.hasText(column), 'the board says the In Progress limit is reached', { player, expected: column, found: 'missing' });
  }
}

/**
 * Plays one running work half: everyone takes, solves, submits and reviews until the hard end moves the screen on.
 */
export async function playWorkHalf(run, state, { iteration, half }) {
  const startedAt = Date.now();
  const kanban = run.framework === 'kanban';
  let cycle = 0;
  run.currentIteration = iteration;
  run.log(`work half ${half} of iteration ${iteration} is running`);
  for (;;) {
    await run.probeAll();
    if (run.players.every((player) => !isRunning(player.view))) break;
    if (!run.players.every((player) => isRunning(player.view))) {
      await sleep(300);
      continue;
    }
    const elapsed = Date.now() - startedAt;
    if (!state.reloaded && half === 1 && iteration === 1 && (elapsed > 70_000 && run.players[2].view.workspace !== null && run.players[2].view.workspace.part !== null || elapsed > 150_000)) {
      state.reloaded = true;
      await reloadSeat(run, run.players[2]);
      continue;
    }
    if (!state.duplicated && half === 2 && iteration === 1 && elapsed > 45_000 && run.players[1].view.workspace === null) {
      state.duplicated = true;
      await duplicateSeat(run, run.players[1]);
      continue;
    }
    if (kanban && iteration === 1 && cycle === 0) {
      for (const player of run.players) {
        const text = player.t('board.noLimits');
        run.check(player.hasText(text), 'round 1 shows that no limits are set', { player, expected: text, found: player.dom.text.slice(0, 120) });
      }
    }
    let holdTakes = false;
    let forced = [];
    if (kanban && iteration === 2 && state.limitStage === 0) {
      const todos = run.players[0].view.items.filter((item) => item.status === 'todo');
      if (todos.length >= 3) {
        forced = [
          { player: run.players[0], type: 'take', item: todos[0] },
          { player: run.players[1], type: 'take', item: todos[1] },
        ];
        state.limitStage = 1;
      }
    } else if (kanban && iteration === 2 && state.limitStage === 1) {
      if (run.players[0].view.kanban.startBlockedByLimit) {
        await limitCheck(run);
        state.limitStage = 2;
        state.limitHit = true;
      } else if (run.players[0].view.kanban.inProgress < 2) {
        holdTakes = true;
      } else {
        state.limitStage = 2;
      }
    }
    const actions = forced.length > 0 ? forced : decide(run, state, { cycle, holdTakes });
    cycle += 1;
    if (actions.length === 0) {
      await sleep(500);
      continue;
    }
    const outcomes = await Promise.allSettled(actions.map((action) => execute(run, state, action)));
    const failed = outcomes.find((outcome) => outcome.status === 'rejected');
    if (failed !== undefined) {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        await run.probeAll();
        if (run.players.every((player) => !isRunning(player.view))) break;
        await sleep(700);
      }
      if (run.players.some((player) => isRunning(player.view))) throw failed.reason;
      run.log(`an action was cut off by the hard end of the half: ${String(failed.reason.message).split('\n')[0].slice(0, 100)}`);
    }
  }
  run.log(`work half ${half} of iteration ${iteration} ended after ${Math.round((Date.now() - startedAt) / 1000)}s with ${state.submissions} submissions so far`);
}

/**
 * The daily: the team looks at the board, the holder of a missing piece promises help, and anyone ends the event.
 */
export async function playDaily(run, state, { iteration }) {
  await run.waitScreen(`daily:${iteration}:0:walk`);
  run.currentIteration = iteration;
  await run.probeAll();
  for (const player of run.players) {
    const held = player.view.held;
    for (const entry of held) {
      run.check(player.dom.heldBodies.some((own) => own.itemId === entry.itemId), 'the holder sees the held piece on the daily', { player, expected: entry.itemId, found: JSON.stringify(player.dom.heldBodies.map((own) => own.itemId)) });
    }
  }
  const actions = decide(run, state, { cycle: 0, holdTakes: true }).filter((action) => action.type === 'promise' || action.type === 'takeReview' || action.type === 'join');
  if (actions.length > 0) {
    await Promise.all(actions.map((action) => execute(run, state, action)));
    await run.probeAll();
  }
  const ender = run.players.find((player) => player.view.controls.includes('end_daily'));
  run.check(ender !== undefined, 'anyone may end the daily', { expected: 'an end_daily control', found: 'none' });
  await ender.clickKey(`daily.end.${run.framework}`);
}
