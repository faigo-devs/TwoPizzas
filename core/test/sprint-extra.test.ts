import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { viewFor } from '../machine/index.ts';
import { parseClientMessage } from '../wire.ts';
import { act, begin, facilitator, planCustom, startedRoom, tryAct } from './machine-support.ts';
import type { Room } from './machine-support.ts';

function runningScrum(pullCount: number): Room {
  const room = startedRoom(4, 515151, true);
  planCustom(room, (backlog) => backlog.slice(0, pullCount).map((own) => own.id));
  begin(room);
  return room;
}

function finishAll(room: Room): void {
  for (const own of room.state.items) {
    if (own.status === 'todo' || own.status === 'doing' || own.status === 'review') {
      own.status = 'done';
      own.workers = [];
      own.reviewer = null;
    }
  }
}

test('after the goal is confirmed, poker estimates the goal theme first and keeps backlog order within each group', () => {
  const room = startedRoom(4, 424242, false);
  begin(room);
  const iteration = room.state.iterations[0];
  assert.ok(iteration !== undefined);
  const theme = iteration.goalOptions[1] ?? iteration.goalOptions[0] ?? 'payments';
  for (const player of room.state.players) act(room, player.id, { type: 'plan.goal_vote', theme });
  act(room, facilitator(room), { type: 'plan.goal_confirm' });
  const goalItems = room.state.items.filter((own) => own.status === 'backlog' && own.theme === theme).map((own) => own.id);
  const others = room.state.items.filter((own) => own.status === 'backlog' && own.theme !== theme).map((own) => own.id);
  assert.ok(goalItems.length > 0 && others.length > 0);
  const seen: string[] = [];
  while (room.state.phase.kind === 'plan' && room.state.phase.step === 'estimate') {
    const poker = room.state.iterations[0]?.poker;
    assert.ok(poker !== null && poker !== undefined);
    seen.push(poker.itemId);
    for (const player of room.state.players) act(room, player.id, { type: 'plan.poker_vote', card: 3 });
    act(room, facilitator(room), { type: 'plan.poker_record', estimate: null });
  }
  assert.deepEqual(seen, [...goalItems, ...others]);
});

test('without a goal the poker order is the backlog order as before', () => {
  const room = startedRoom(4, 424242, false);
  begin(room);
  const first = room.state.items.find((own) => own.status === 'backlog');
  assert.ok(first !== undefined);
  for (const player of room.state.players) {
    act(room, player.id, { type: 'plan.goal_vote', theme: room.state.iterations[0]?.goalOptions[0] ?? 'payments' });
  }
  act(room, facilitator(room), { type: 'plan.goal_confirm' });
  assert.ok(room.state.iterations[0]?.poker !== null);
});

test('in Scrum a Developer may take an item from the Product Backlog during the Sprint and it joins the Sprint Backlog', () => {
  const room = runningScrum(2);
  const extra = room.state.items.find((own) => own.status === 'backlog' && own.workersNeeded === 1) ?? room.state.items.find((own) => own.status === 'backlog');
  assert.ok(extra !== undefined);
  const view = viewFor(room.state, 'p2', room.now).items.find((own) => own.id === extra.id);
  assert.ok(view?.actions.includes('item.take'));
  act(room, 'p2', { type: 'item.take', itemId: extra.id });
  const taken = room.state.items.find((own) => own.id === extra.id);
  assert.equal(taken?.status, 'doing');
  assert.equal(taken?.iteration, room.state.iterations[0]?.iteration);
  assert.deepEqual(taken?.workers, ['p2']);
  assert.equal(room.state.iterations[0]?.goal, room.state.iterations[0]?.goal);
});

test('a Product Backlog item cannot be taken in the Kanban round, in planning, or in the Daily', () => {
  const kanban = startedRoom(4, 515151, false, 'kanban');
  begin(kanban);
  const pool = kanban.state.items.find((own) => own.status === 'backlog');
  assert.ok(pool !== undefined);
  assert.equal(tryAct(kanban, 'p2', { type: 'item.take', itemId: pool.id }).ok, false);
  const scrum = startedRoom(4, 515151, false);
  begin(scrum);
  const item = scrum.state.items.find((own) => own.status === 'backlog');
  assert.ok(item !== undefined);
  assert.equal(tryAct(scrum, 'p2', { type: 'item.take', itemId: item.id }).ok, false);
});

test('the facilitator may end the half early only when nothing is left To do, In progress or In review', () => {
  const room = runningScrum(2);
  const fac = facilitator(room);
  assert.ok(!viewFor(room.state, fac, room.now).controls.includes('end_work'));
  assert.equal(tryAct(room, fac, { type: 'work.end_early' }).ok, false);
  finishAll(room);
  assert.ok(viewFor(room.state, fac, room.now).controls.includes('end_work'));
  const other = room.state.players.find((own) => own.id !== fac)?.id ?? 'p2';
  assert.ok(!viewFor(room.state, other, room.now).controls.includes('end_work'));
  assert.equal(tryAct(room, other, { type: 'work.end_early' }).ok, false);
  const before = room.now;
  act(room, fac, { type: 'work.end_early' });
  assert.equal(room.state.phase.kind, 'daily');
  assert.ok(room.now >= before);
});

test('ending the second half early goes to the inspect and records the flow end at that moment', () => {
  const room = runningScrum(2);
  const fac = facilitator(room);
  finishAll(room);
  act(room, fac, { type: 'work.end_early' });
  begin(room);
  act(room, fac, { type: 'daily.end' });
  assert.equal(room.state.phase.kind, 'work');
  if (room.state.phase.kind === 'work' && room.state.phase.step === 'card') begin(room);
  finishAll(room);
  const now = room.state.now;
  act(room, fac, { type: 'work.end_early' });
  assert.equal(room.state.phase.kind, 'inspect');
  assert.equal(room.state.iterations[0]?.flowEndedAt, now);
});

test('in Kanban the early end waits until every request of the round has arrived', () => {
  const room = startedRoom(4, 515151, false, 'kanban');
  begin(room);
  for (const own of room.state.items.filter((item) => item.status === 'backlog').slice(0, 2)) {
    act(room, 'p1', { type: 'plan.pull', itemId: own.id });
  }
  act(room, facilitator(room), { type: 'phase.advance' });
  if (room.state.phase.kind === 'plan' && room.state.phase.step === 'limits') {
    act(room, facilitator(room), { type: 'plan.set_limits', inProgress: null, review: null });
    act(room, facilitator(room), { type: 'phase.advance' });
  }
  begin(room);
  assert.equal(room.state.phase.kind, 'work');
  finishAll(room);
  const fac = facilitator(room);
  const left = room.state.iterations[room.state.iterations.length - 1]?.arrivalsLeft ?? 0;
  assert.ok(left > 0);
  assert.ok(!viewFor(room.state, fac, room.now).controls.includes('end_work'));
  assert.equal(tryAct(room, fac, { type: 'work.end_early' }).ok, false);
  const iteration = room.state.iterations[room.state.iterations.length - 1];
  assert.ok(iteration !== undefined);
  iteration.arrivalsLeft = 0;
  assert.ok(viewFor(room.state, fac, room.now).controls.includes('end_work'));
  act(room, fac, { type: 'work.end_early' });
  assert.notEqual(room.state.phase.kind, 'work');
});

test('the wire accepts the bare early-end action only, and the view carries the round', () => {
  assert.deepEqual(parseClientMessage('{"t":"do","action":{"type":"work.end_early"}}'), { t: 'do', action: { type: 'work.end_early' } });
  assert.equal(parseClientMessage('{"t":"do","action":{"type":"work.end_early","x":1}}'), null);
  const room = runningScrum(1);
  assert.equal(viewFor(room.state, 'p1', room.now).iteration, 1);
  assert.ok(config.iterations >= 2);
});
