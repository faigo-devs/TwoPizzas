import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { viewFor } from '../machine/index.ts';
import { generateTeamName } from '../names.ts';
import type { Framework, Observation, ObservationGroup, WorkItem } from '../types.ts';
import {
  act,
  scrumViewOf,
  answerOf,
  assertItemRights,
  begin,
  defaultStyle,
  facilitator,
  finishSprint,
  item,
  kanbanStyle,
  playGame,
  playInspect,
  playPlanning,
  playWork,
  revealAll,
  secondSprint,
  sprintRunning,
  startedRoom,
  stepOf,
  tryAct,
  wait,
} from './machine-support.ts';

const Events: ObservationGroup[] = ['plan', 'daily', 'work', 'inspect', 'retro'];

function solos(count: number): (backlog: WorkItem[]) => string[] {
  return (backlog) => backlog.filter((own) => own.workersNeeded === 1).slice(0, count).map((own) => own.id);
}

for (const framework of ['scrum', 'kanban'] as Framework[]) {
  test(`${framework}: the summary carries the whole observation history, and only the summary`, () => {
    const room = playGame({ players: 4, seed: 2020202, framework });
    const fac = facilitator(room);
    const view = viewFor(room.state, fac, room.now);
    const history = view.summary?.observationHistory ?? [];
    assert.deepEqual(
      history.map((entry) => `${entry.iteration}.${entry.event}`),
      [1, 2].flatMap((iteration) => Events.map((event) => `${iteration}.${event}`)),
    );
    assert.deepEqual(
      history.flatMap((entry) => entry.observations),
      room.state.observations,
    );
    for (const entry of history) {
      for (const observation of entry.observations) {
        assert.ok(observation.id.startsWith(`${entry.event}.`));
        assert.equal(observation.iteration, entry.iteration);
      }
    }
    assert.ok(history.some((entry) => entry.event === 'retro' && entry.iteration === 1 && entry.observations.length > 0));
    assert.ok(history.some((entry) => entry.event === 'plan' && entry.observations.length > 0));
    assert.ok(history.every((entry) => entry.observations.length <= config.observations.maxPerEvent));
    assert.deepEqual(JSON.parse(JSON.stringify(history)), history);
    const latest: Observation[] = view.observations;
    assert.deepEqual(latest, history[history.length - 1]?.observations);
    assert.ok(latest.length < room.state.observations.length);
  });

  test(`${framework}: the new team name control lives on the summary until publication`, () => {
    const room = playGame({ players: 4, seed: 3003003, framework });
    const fac = facilitator(room);
    const other = room.state.players.find((own) => own.id !== fac)?.id ?? 'p2';
    assert.ok(viewFor(room.state, fac, room.now).controls.includes('new_team_name'));
    assert.ok(!viewFor(room.state, other, room.now).controls.includes('new_team_name'));
    assert.equal(tryAct(room, other, { type: 'lobby.new_team_name' }).ok, false);
    act(room, fac, { type: 'lobby.new_team_name' });
    assert.equal(room.state.teamName, generateTeamName(room.state.nameSeed, 1));
    assert.equal(viewFor(room.state, other, room.now).teamName, room.state.teamName);
    assert.equal(room.state.nameAttempt, 1);
    act(room, fac, { type: 'summary.publish' });
    assert.ok(!viewFor(room.state, fac, room.now).controls.includes('new_team_name'));
    assert.equal(tryAct(room, fac, { type: 'lobby.new_team_name' }).ok, false);
    assert.equal(room.state.teamName, generateTeamName(room.state.nameSeed, 1));
  });
}

test('the new team name control ends with the attempts, and never shows before the summary', () => {
  const room = playGame({ players: 3, seed: 1100011, checks: false });
  const fac = facilitator(room);
  let guard = 0;
  while (viewFor(room.state, fac, room.now).controls.includes('new_team_name')) {
    act(room, fac, { type: 'lobby.new_team_name' });
    guard += 1;
    assert.ok(guard < 100);
  }
  assert.equal(room.state.nameAttempt + 1, config.names.attemptsMax);
  assert.equal(tryAct(room, fac, { type: 'lobby.new_team_name' }).ok, false);
  assert.ok(viewFor(room.state, fac, room.now).controls.includes('publish'));
  const early = startedRoom(4, 99, false);
  for (const player of early.state.players) {
    assert.ok(!viewFor(early.state, player.id, early.now).controls.includes('new_team_name'));
  }
});

test('a broken tracked agreement reports how many times it was broken', () => {
  const room = secondSprint({ type: 'wip_limit', max: 1 }, solos(2));
  const [first, second] = room.state.items.filter((own) => own.status === 'todo');
  assert.ok(first !== undefined && second !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: first.id });
  act(room, 'p2', { type: 'item.take', itemId: second.id });
  finishSprint(room);
  revealAll(room);
  act(room, facilitator(room), { type: 'phase.advance' });
  begin(room);
  assert.equal(stepOf(room), 'previous');
  const previous = viewFor(room.state, 'p3', room.now).retro?.previous;
  assert.equal(previous?.kept, false);
  assert.equal(previous?.violations, 1);
  assert.equal(room.state.iterations[1]?.signals.agreementViolations, 1);
  assert.equal(room.state.iterations[1]?.metrics?.agreement?.violations, 1);
});

test('kept agreements report zero violations, untracked ones none', () => {
  const kept = secondSprint({ type: 'wip_limit', max: 1 }, solos(2));
  const [one] = kept.state.items.filter((own) => own.status === 'todo');
  assert.ok(one !== undefined);
  act(kept, 'p1', { type: 'item.take', itemId: one.id });
  finishSprint(kept);
  revealAll(kept);
  assert.equal(kept.state.iterations[1]?.metrics?.agreement?.violations, 0);
  const free = secondSprint({ type: 'free', text: 'be kind' }, solos(2));
  finishSprint(free);
  revealAll(free);
  assert.equal(free.state.iterations[1]?.metrics?.agreement?.violations, null);
});

test('a player sees only their own helper answers', () => {
  const room = startedRoom(4, 4242424, false);
  playPlanning(room, defaultStyle);
  playWork(room, defaultStyle);
  playInspect(room);
  begin(room);
  const fac = facilitator(room);
  if (stepOf(room) === 'previous') act(room, fac, { type: 'phase.advance' });
  act(room, 'p1', { type: 'retro.help_start' });
  assert.deepEqual(viewFor(room.state, 'p1', room.now).retro?.help?.answers, {});
  const question = viewFor(room.state, 'p1', room.now).retro?.help?.questions[0];
  assert.ok(question !== undefined);
  const choice = question.choices[0] as string;
  act(room, 'p1', { type: 'retro.help_answer', questionId: question.id, choice });
  assert.deepEqual(viewFor(room.state, 'p1', room.now).retro?.help?.answers, { [question.id]: choice });
  assert.equal(viewFor(room.state, 'p2', room.now).retro?.help, null);
  act(room, 'p2', { type: 'retro.help_start' });
  assert.deepEqual(viewFor(room.state, 'p2', room.now).retro?.help?.answers, {});
  assert.deepEqual(viewFor(room.state, 'p1', room.now).retro?.help?.answers, { [question.id]: choice });
});

test('the customers feedback creates exactly the configured three items, in iteration 2', () => {
  assert.equal(config.feedback.newItems, 3);
  const room = sprintRunning(4, 1060606, solos(1));
  finishSprint(room);
  revealAll(room);
  const fac = facilitator(room);
  const before = room.state.items.length;
  act(room, fac, { type: 'phase.advance' });
  const feedback = scrumViewOf(room.state, fac, room.now).inspect?.feedback;
  assert.equal(feedback?.newItemIds.length, config.feedback.newItems);
  assert.equal(room.state.items.length - before, config.feedback.newItems);
  for (const id of feedback?.newItemIds ?? []) {
    const created = room.state.items.find((own) => own.id === id);
    assert.equal(created?.iteration, 2);
    assert.equal(created?.status, 'backlog');
  }
});

test('every item action listed is accepted and every other is refused, through a whole Scrum game and a whole Kanban game', () => {
  const scrum = playGame({ players: 3, seed: 5050505, rightsEvery: true });
  const kanban = playGame({ players: 3, seed: 6060606, framework: 'kanban', rightsEvery: true, style: { wrongMod: 3 } });
  assert.equal(scrum.state.phase.kind, 'summary');
  assert.equal(kanban.state.phase.kind, 'summary');
});

test('item actions cover take, join, open, review, leave and help on a running Sprint', () => {
  const room = sprintRunning(4, 1060606, (backlog) => {
    const solo = backlog.filter((own) => own.workersNeeded === 1).slice(0, 2);
    const pair = backlog.filter((own) => own.workersNeeded === 2).slice(0, 2);
    return [...solo, ...pair].map((own) => own.id);
  });
  const seen = new Set<string>();
  const check = (): void => {
    for (const player of room.state.players) {
      const view = viewFor(room.state, player.id, room.now);
      assertItemRights(room, view);
      for (const own of view.items) for (const name of own.actions) seen.add(name);
    }
  };
  check();
  const todo = room.state.items.filter((own) => own.status === 'todo');
  const solo = todo.find((own) => own.workersNeeded === 1);
  const pair = todo.find((own) => own.workersNeeded === 2);
  assert.ok(solo !== undefined && pair !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: solo.id });
  check();
  act(room, 'p2', { type: 'item.take', itemId: pair.id });
  check();
  act(room, 'p3', { type: 'item.take', itemId: pair.id });
  check();
  for (const own of room.state.items.filter((entry) => entry.status === 'doing' && entry.dependency && entry.puzzle !== null)) {
    const helper = room.state.players.find((player) => !own.workers.includes(player.id));
    if (helper === undefined) continue;
    act(room, helper.id, { type: 'help.promise', itemId: own.id });
    check();
    act(room, helper.id, { type: 'help.withdraw', itemId: own.id });
    check();
  }
  act(room, 'p1', { type: 'item.open', itemId: solo.id, mode: 'work' });
  wait(room, config.contextSwitchMs);
  check();
  const puzzle = item(room, solo.id).puzzle;
  assert.ok(puzzle !== null);
  act(room, 'p1', { type: 'item.submit', itemId: solo.id, response: answerOf(puzzle) });
  check();
  act(room, 'p4', { type: 'item.take_review', itemId: solo.id });
  check();
  act(room, 'p4', { type: 'item.close' });
  check();
  act(room, 'p4', { type: 'item.leave', itemId: solo.id });
  check();
  for (const name of ['item.take', 'item.leave', 'item.open.work', 'item.open.review', 'item.take_review']) {
    assert.ok(seen.has(name), name);
  }
});

test('the facilitator script also covers the running Sprint, and only for the facilitator', () => {
  for (const framework of ['scrum', 'kanban'] as Framework[]) {
    const room = startedRoom(4, 123, false, framework);
    playPlanning(room, framework === 'kanban' ? kanbanStyle : defaultStyle);
    const fac = facilitator(room);
    assert.deepEqual(viewFor(room.state, fac, room.now).script, { event: 'work', step: 'card', index: 1, total: 2 });
    begin(room);
    assert.deepEqual(viewFor(room.state, fac, room.now).script, { event: 'work', step: 'running', index: 2, total: 2 });
    assert.equal(viewFor(room.state, 'p2', room.now).script, null);
  }
});

test('the Sprint Goal and the iteration of each item are in the view from confirmation to the end', () => {
  const room = playGame({ players: 4, seed: 1100011 });
  const view = scrumViewOf(room.state, 'p1', room.now);
  assert.equal(view.goal, null);
  assert.ok(view.items.every((own) => own.iteration === 1 || own.iteration === 2));
  const fresh = startedRoom(4, 777, false);
  assert.equal(scrumViewOf(fresh.state, 'p1', fresh.now).goal, null);
  playPlanning(fresh, defaultStyle);
  const goal = scrumViewOf(fresh.state, 'p2', fresh.now).goal;
  assert.equal(goal?.theme, fresh.state.iterations[0]?.goal);
  assert.equal(goal?.done, 0);
  assert.equal(goal?.total, fresh.state.items.filter((own) => own.theme === goal?.theme).length);
  playWork(fresh, defaultStyle);
  assert.equal(scrumViewOf(fresh.state, 'p3', fresh.now).goal?.theme, goal?.theme);
  const kanban = startedRoom(4, 777, false, 'kanban');
  playPlanning(kanban, kanbanStyle);
  assert.ok(!('goal' in viewFor(kanban.state, 'p1', kanban.now)));
});
