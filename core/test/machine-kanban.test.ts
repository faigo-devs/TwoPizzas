import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { latestObservations, observe } from '../machine/observations.ts';
import { leaderboardEntry, nextDeadline } from '../machine/index.ts';
import type { Agreement, ItemSize, PlayerId, RoomState, WipLimits, WorkItem } from '../types.ts';
import {
  act,
  advanceTo,
  answerOf,
  begin,
  facilitator,
  finishSprint,
  item,
  kanbanStyle,
  kanbanViewOf,
  playGame,
  playInspect,
  playIteration,
  playPlanning,
  playRetro,
  playWork,
  revealAll,
  startedRoom,
  stepOf,
  tryAct,
  wait,
  wrongResponse,
  type Room,
  type TeamStyle,
} from './machine-support.ts';

const SwitchMs = config.contextSwitchMs;
const NoLimits: WipLimits = { inProgress: null, review: null };

function code(result: ReturnType<typeof tryAct>): string {
  return result.ok ? 'ok' : result.code;
}

function pool(room: Room): WorkItem[] {
  return room.state.items.filter((own) => own.status === 'backlog');
}

function solos(count: number): (backlog: WorkItem[]) => string[] {
  return (backlog) => backlog.filter((own) => own.workersNeeded === 1).slice(0, count).map((own) => own.id);
}

function sizeCounts(items: WorkItem[]): Record<ItemSize, number> {
  const counts: Record<ItemSize, number> = { S: 0, M: 0, L: 0 };
  for (const own of items) counts[own.size] += 1;
  return counts;
}

function openFlow(room: Room, pick: (backlog: WorkItem[]) => string[], limits: WipLimits = NoLimits): void {
  begin(room);
  for (const id of pick(pool(room))) act(room, 'p1', { type: 'plan.pull', itemId: id });
  act(room, facilitator(room), { type: 'phase.advance' });
  if (stepOf(room) === 'limits') {
    act(room, facilitator(room), { type: 'plan.set_limits', ...limits });
    act(room, facilitator(room), { type: 'phase.advance' });
  }
  begin(room);
}

function firstRound(players: number, seed: number, pick: (backlog: WorkItem[]) => string[]): Room {
  const room = startedRoom(players, seed, true, 'kanban');
  openFlow(room, pick);
  return room;
}

function secondRound(options: {
  seed: number;
  pick: (backlog: WorkItem[]) => string[];
  limits?: WipLimits;
  agreement?: Agreement | null;
  checks?: boolean;
  players?: number;
}): Room {
  const room = startedRoom(options.players ?? 4, options.seed, options.checks ?? false, 'kanban');
  const style: TeamStyle = { ...kanbanStyle, agreement: options.agreement === undefined ? kanbanStyle.agreement : options.agreement };
  playIteration(room, style);
  openFlow(room, options.pick, options.limits ?? NoLimits);
  return room;
}

function flowStart(room: Room): number {
  const phase = room.state.phase;
  assert.ok(phase.kind === 'work' && phase.timebox.startedAt !== null);
  return phase.timebox.startedAt;
}

function arrivals(room: Room): WorkItem[] {
  return room.state.items.filter((own) => own.times.arrivedAt !== null);
}

function work(room: Room, id: PlayerId, itemId: string, right = true): void {
  act(room, id, { type: 'item.open', itemId, mode: 'work' });
  wait(room, SwitchMs);
  const target = item(room, itemId);
  assert.ok(target.puzzle !== null);
  act(room, id, { type: 'item.submit', itemId, response: right ? answerOf(target.puzzle) : wrongResponse(target.puzzle) });
}

function verdict(room: Room, id: PlayerId, itemId: string, value: 'lgtm' | 'changes'): void {
  act(room, id, { type: 'item.take_review', itemId });
  wait(room, SwitchMs);
  act(room, id, { type: 'item.verdict', itemId, verdict: value });
}

function clone(state: RoomState): RoomState {
  return JSON.parse(JSON.stringify(state)) as RoomState;
}

test('Replenishment in round 1: the team pulls from the pool up to the Ready maximum, no limits, no goal, no estimates', () => {
  const room = startedRoom(4, 1234501, true, 'kanban');
  assert.equal(room.state.phase.kind, 'plan');
  assert.equal(stepOf(room), 'card');
  const fac = facilitator(room);
  assert.deepEqual(kanbanViewOf(room.state, fac, room.now).script, { event: 'plan', step: 'card', index: 1, total: 2 });
  assert.equal(kanbanViewOf(room.state, 'p2', room.now).script, null);
  begin(room);
  assert.equal(stepOf(room), 'replenish');
  const backlog = pool(room);
  assert.equal(backlog.length, 8);
  assert.deepEqual(sizeCounts(backlog), config.kanban.poolComposition);
  const view = kanbanViewOf(room.state, 'p2', room.now);
  assert.deepEqual(view.planning?.replenish, {
    readyMax: config.kanban.readyMax,
    ready: 0,
    pool: 8,
    limitMin: config.kanban.wipLimitMin,
    limitMax: config.kanban.wipLimitMax,
    settingLimits: false,
  });
  assert.ok(view.planning !== null);
  assert.ok(!('goalOptions' in view.planning) && !('goal' in view.planning) && !('poker' in view.planning));
  assert.deepEqual(kanbanViewOf(room.state, fac, room.now).controls.filter((own) => own !== 'pause' && own !== 'resume'), []);
  assert.equal(code(tryAct(room, fac, { type: 'phase.advance' })), 'not_allowed');
  assert.equal(code(tryAct(room, 'p2', { type: 'plan.goal_vote', theme: 'payments' })), 'not_allowed');
  assert.equal(code(tryAct(room, 'p2', { type: 'plan.poker_vote', card: 3 })), 'not_allowed');
  assert.equal(code(tryAct(room, fac, { type: 'plan.set_limits', inProgress: 2, review: 2 })), 'not_allowed');
  const ids = backlog.map((own) => own.id);
  for (const id of ids.slice(0, config.kanban.readyMax)) act(room, 'p2', { type: 'plan.pull', itemId: id });
  assert.equal(code(tryAct(room, 'p2', { type: 'plan.pull', itemId: ids[config.kanban.readyMax] ?? '' })), 'not_allowed');
  assert.equal(code(tryAct(room, 'p2', { type: 'plan.pull', itemId: ids[0] ?? '' })), 'not_allowed');
  assert.equal(code(tryAct(room, 'p2', { type: 'plan.pull', itemId: '#999' })), 'bad_request');
  act(room, 'p3', { type: 'plan.unpull', itemId: ids[0] ?? '' });
  assert.equal(code(tryAct(room, 'p3', { type: 'plan.unpull', itemId: ids[0] ?? '' })), 'not_allowed');
  act(room, 'p3', { type: 'plan.pull', itemId: ids[config.kanban.readyMax] ?? '' });
  assert.deepEqual(kanbanViewOf(room.state, fac, room.now).controls.filter((own) => own !== 'pause' && own !== 'resume'), ['advance']);
  assert.equal(code(tryAct(room, 'p2', { type: 'phase.advance' })), 'not_allowed');
  act(room, fac, { type: 'phase.advance' });
  assert.equal(room.state.phase.kind, 'work');
  assert.equal(stepOf(room), 'card');
  const after = kanbanViewOf(room.state, 'p2', room.now);
  assert.deepEqual(after.limits, NoLimits);
  assert.equal(after.kanban?.ready, config.kanban.readyMax);
  assert.ok(after.observations.some((own) => own.id === 'plan.onTime'));
});

test('Replenishment in round 2: the facilitator records limits in their own step, inside the configured range', () => {
  const room = startedRoom(4, 1234502, false, 'kanban');
  playIteration(room, kanbanStyle);
  const fac = facilitator(room);
  assert.equal(room.state.iterations.length, 2);
  begin(room);
  for (const own of pool(room).slice(0, 2)) act(room, 'p1', { type: 'plan.pull', itemId: own.id });
  assert.deepEqual(kanbanViewOf(room.state, fac, room.now).script, { event: 'plan', step: 'replenish', index: 2, total: 3 });
  assert.equal(code(tryAct(room, fac, { type: 'plan.set_limits', inProgress: 2, review: 2 })), 'not_allowed');
  act(room, fac, { type: 'phase.advance' });
  assert.equal(stepOf(room), 'limits');
  assert.deepEqual(kanbanViewOf(room.state, fac, room.now).script, { event: 'plan', step: 'limits', index: 3, total: 3 });
  assert.deepEqual(kanbanViewOf(room.state, fac, room.now).controls.filter((own) => own !== 'pause' && own !== 'resume'), ['set_limits', 'advance']);
  assert.equal(kanbanViewOf(room.state, 'p2', room.now).planning?.replenish?.settingLimits, true);
  const other = fac === 'p3' ? 'p4' : 'p3';
  assert.equal(code(tryAct(room, other, { type: 'plan.set_limits', inProgress: 2, review: 2 })), 'not_allowed');
  const { wipLimitMin, wipLimitMax } = config.kanban;
  for (const bad of [wipLimitMin - 1, wipLimitMax + 1, 1.5, -2]) {
    assert.equal(code(tryAct(room, fac, { type: 'plan.set_limits', inProgress: bad, review: null })), 'bad_request');
    assert.equal(code(tryAct(room, fac, { type: 'plan.set_limits', inProgress: null, review: bad })), 'bad_request');
  }
  const spare = pool(room)[0];
  assert.ok(spare !== undefined);
  assert.equal(code(tryAct(room, 'p1', { type: 'plan.pull', itemId: spare.id })), 'not_allowed');
  act(room, fac, { type: 'plan.set_limits', inProgress: 2, review: null });
  assert.deepEqual(room.state.iterations[1]?.wipLimits, { inProgress: 2, review: null });
  assert.deepEqual(kanbanViewOf(room.state, 'p3', room.now).limits, { inProgress: 2, review: null });
  act(room, fac, { type: 'plan.set_limits', inProgress: 2, review: 3 });
  act(room, fac, { type: 'phase.advance' });
  assert.equal(room.state.phase.kind, 'work');
  begin(room);
  assert.deepEqual(kanbanViewOf(room.state, 'p3', room.now).kanban?.limits, { inProgress: 2, review: 3 });
});

test('requests arrive on the arrival interval, eight per round, in Ready, stamped with their time', () => {
  const room = firstRound(4, 1234503, solos(2));
  const start = flowStart(room);
  const interval = config.kanban.arrivalIntervalMs;
  assert.equal(nextDeadline(room.state), start + interval);
  assert.equal(kanbanViewOf(room.state, 'p2', room.now).kanban?.nextArrivalAt, start + interval);
  advanceTo(room, start + interval - 1);
  assert.equal(arrivals(room).length, 0);
  advanceTo(room, start + interval);
  const [first] = arrivals(room);
  assert.ok(first !== undefined);
  assert.equal(first.status, 'todo');
  assert.equal(first.times.arrivedAt, start + interval);
  assert.equal(first.times.readyAt, start + interval);
  const seen = kanbanViewOf(room.state, 'p2', room.now);
  assert.equal(seen.items.find((own) => own.id === first.id)?.arrivedAt, start + interval);
  assert.equal(seen.kanban?.arrivalsLeft, 7);
  assert.equal(seen.kanban?.arrivalsTotal, 8);
  assert.equal(seen.kanban?.nextArrivalAt, start + 2 * interval);
  assert.equal(nextDeadline(room.state), start + 2 * interval);
  advanceTo(room, start + 5 * interval);
  assert.deepEqual(arrivals(room).map((own) => own.times.arrivedAt), [1, 2, 3, 4, 5].map((n) => start + n * interval));
  advanceTo(room, start + config.timeboxMs.workHalf);
  assert.equal(room.state.phase.kind, 'daily');
  assert.equal(arrivals(room).length, 5);
  assert.equal(kanbanViewOf(room.state, 'p2', room.now).kanban?.nextArrivalAt, null);
  assert.equal(nextDeadline(room.state), null);
  begin(room);
  wait(room, 70_000);
  assert.equal(arrivals(room).length, 5);
  assert.equal(nextDeadline(room.state), null);
  act(room, 'p2', { type: 'daily.end' });
  const resumed = room.now;
  assert.equal(room.state.iterations[0]?.nextArrivalAt, resumed + 30_000);
  assert.equal(nextDeadline(room.state), resumed + 30_000);
  advanceTo(room, resumed + 30_000);
  assert.equal(arrivals(room)[5]?.times.arrivedAt, resumed + 30_000);
  advanceTo(room, resumed + 30_000 + 2 * interval);
  assert.equal(arrivals(room).length, 8);
  assert.equal(room.state.iterations[0]?.nextArrivalAt, null);
  assert.equal(kanbanViewOf(room.state, 'p2', room.now).kanban?.nextArrivalAt, null);
  assert.equal(nextDeadline(room.state), resumed + config.timeboxMs.workHalf);
  advanceTo(room, resumed + config.timeboxMs.workHalf);
  assert.equal(room.state.phase.kind, 'inspect');
  assert.equal(arrivals(room).length, 8);
  assert.deepEqual(sizeCounts(arrivals(room)), config.kanban.arrivalComposition);
});

test('arrivals are seeded: the same room seed gives the same requests, another seed another ones', () => {
  const finger = (room: Room): string =>
    JSON.stringify(arrivals(room).map((own) => [own.kind, own.size, own.value, own.theme, own.subject, own.workersNeeded]));
  const run = (seed: number): Room => {
    const room = firstRound(3, seed, solos(1));
    advanceTo(room, flowStart(room) + config.timeboxMs.workHalf);
    begin(room);
    act(room, 'p1', { type: 'daily.end' });
    advanceTo(room, room.now + config.timeboxMs.workHalf);
    return room;
  };
  const a = run(404040);
  const b = run(404040);
  const c = run(505050);
  assert.equal(arrivals(a).length, 8);
  assert.equal(finger(a), finger(b));
  assert.notEqual(finger(a), finger(c));
});

test('round 1 has no limits: starting and submitting are never refused for a limit', () => {
  const room = firstRound(4, 1234504, solos(3));
  const todo = room.state.items.filter((own) => own.status === 'todo').map((own) => own.id);
  assert.equal(todo.length, 3);
  ['p1', 'p2', 'p3'].forEach((id, index) => act(room, id, { type: 'item.take', itemId: todo[index] ?? '' }));
  const view = kanbanViewOf(room.state, 'p4', room.now);
  assert.deepEqual(view.kanban?.limits, NoLimits);
  assert.equal(view.kanban?.inProgress, 3);
  assert.equal(view.kanban?.startBlockedByLimit, false);
  assert.equal(view.kanban?.submitBlockedByLimit, false);
});

test('round 2 enforces both limits; a refusal changes nothing and the view explains it', () => {
  const room = secondRound({ seed: 1234505, pick: solos(3), limits: { inProgress: 1, review: 1 }, checks: true });
  const [s1, s2, s3] = room.state.items.filter((own) => own.status === 'todo').map((own) => own.id);
  assert.ok(s1 !== undefined && s2 !== undefined && s3 !== undefined);
  assert.deepEqual(kanbanViewOf(room.state, 'p2', room.now).kanban?.limits, { inProgress: 1, review: 1 });
  assert.equal(kanbanViewOf(room.state, 'p2', room.now).kanban?.startBlockedByLimit, false);
  act(room, 'p1', { type: 'item.take', itemId: s1 });
  const blocked = kanbanViewOf(room.state, 'p2', room.now).kanban;
  assert.equal(blocked?.inProgress, 1);
  assert.equal(blocked?.startBlockedByLimit, true);
  assert.equal(code(tryAct(room, 'p2', { type: 'item.take', itemId: s2 })), 'not_allowed');
  assert.equal(item(room, s2).status, 'todo');
  work(room, 'p1', s1);
  const full = kanbanViewOf(room.state, 'p2', room.now).kanban;
  assert.equal(full?.review, 1);
  assert.equal(full?.submitBlockedByLimit, true);
  assert.equal(full?.startBlockedByLimit, false);
  act(room, 'p2', { type: 'item.take', itemId: s2 });
  act(room, 'p2', { type: 'item.open', itemId: s2, mode: 'work' });
  wait(room, SwitchMs + 500);
  const workspace = kanbanViewOf(room.state, 'p2', room.now).workspace;
  assert.equal(workspace?.canSubmit, false);
  assert.equal(workspace?.submitBlockedByLimit, true);
  const puzzle = item(room, s2).puzzle;
  assert.ok(puzzle !== null);
  assert.equal(code(tryAct(room, 'p2', { type: 'item.submit', itemId: s2, response: answerOf(puzzle) })), 'not_allowed');
  assert.equal(item(room, s2).status, 'doing');
  verdict(room, 'p3', s1, 'lgtm');
  const open = kanbanViewOf(room.state, 'p2', room.now).workspace;
  assert.equal(open?.canSubmit, true);
  assert.equal(open?.submitBlockedByLimit, false);
  act(room, 'p2', { type: 'item.submit', itemId: s2, response: answerOf(puzzle) });
  assert.equal(item(room, s2).status, 'review');
});

test('Request changes puts an item back In Progress above the limit; it is not a start and new starts stay refused', () => {
  const room = secondRound({ seed: 1234505, pick: solos(3), limits: { inProgress: 1, review: 1 }, checks: true });
  const [s1, s2, s3] = room.state.items.filter((own) => own.status === 'todo').map((own) => own.id);
  assert.ok(s1 !== undefined && s2 !== undefined && s3 !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: s1 });
  work(room, 'p1', s1);
  act(room, 'p2', { type: 'item.take', itemId: s2 });
  assert.equal(kanbanViewOf(room.state, 'p3', room.now).kanban?.inProgress, 1);
  verdict(room, 'p3', s1, 'changes');
  assert.equal(item(room, s1).status, 'doing');
  assert.equal(item(room, s1).changesRequested, 1);
  const over = kanbanViewOf(room.state, 'p3', room.now).kanban;
  assert.equal(over?.inProgress, 2);
  assert.equal(over?.limits.inProgress, 1);
  assert.equal(over?.startBlockedByLimit, true);
  assert.equal(code(tryAct(room, 'p3', { type: 'item.take', itemId: s3 })), 'not_allowed');
  assert.equal(item(room, s3).status, 'todo');
  assert.equal(code(tryAct(room, 'p1', { type: 'item.open', itemId: s1, mode: 'work' })), 'ok');
});

test('a null limit leaves its column open and a pair joining a waiting item is never a start', () => {
  const room = secondRound({
    seed: 1234506,
    pick: (backlog) => backlog.filter((own) => own.workersNeeded === 2).slice(0, 2).map((own) => own.id),
    limits: { inProgress: 1, review: null },
  });
  const [first, second] = room.state.items.filter((own) => own.status === 'todo');
  assert.ok(first !== undefined && second !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: first.id });
  assert.equal(code(tryAct(room, 'p3', { type: 'item.take', itemId: second.id })), 'not_allowed');
  act(room, 'p2', { type: 'item.take', itemId: first.id });
  assert.equal(kanbanViewOf(room.state, 'p3', room.now).kanban?.limits.review, null);
  assert.equal(kanbanViewOf(room.state, 'p3', room.now).kanban?.submitBlockedByLimit, false);
});

test('round 2 starts from an empty board with a comparable pool; round 1 leftovers stay in round 1 numbers', () => {
  const room = firstRound(4, 1234507, solos(2));
  const [a, b] = room.state.items.filter((own) => own.status === 'todo').map((own) => own.id);
  assert.ok(a !== undefined && b !== undefined);
  const firstPool = room.state.items.filter((own) => own.status === 'backlog' || own.status === 'todo');
  const firstSizes = sizeCounts(firstPool);
  act(room, 'p1', { type: 'item.take', itemId: a });
  act(room, 'p2', { type: 'item.take', itemId: b });
  work(room, 'p2', b);
  verdict(room, 'p3', b, 'lgtm');
  const oldIds = new Set(room.state.items.map((own) => own.id));
  const oldSeeds = new Set(room.state.items.map((own) => own.seed));
  const firstFacilitator = facilitator(room);
  finishSprint(room);
  playInspect(room);
  const metrics = room.state.iterations[0]?.metrics;
  assert.ok(metrics !== null && metrics !== undefined);
  assert.equal(metrics.throughput, 1);
  assert.ok(metrics.openAges.some((point) => point.itemId === a));
  playRetro(room, kanbanStyle);
  assert.equal(room.state.phase.kind, 'plan');
  assert.equal(room.state.iterations.length, 2);
  assert.notEqual(facilitator(room), firstFacilitator);
  const items = room.state.items;
  assert.equal(items.length, 8);
  assert.ok(items.every((own) => own.status === 'backlog' && own.iteration === 2));
  assert.ok(items.every((own) => !oldIds.has(own.id) && !oldSeeds.has(own.seed)));
  assert.deepEqual(sizeCounts(items), firstSizes);
  assert.deepEqual(room.state.iterations[1]?.wipLimits, NoLimits);
  const view = kanbanViewOf(room.state, facilitator(room), room.now);
  assert.deepEqual(
    [view.kanban?.ready, view.kanban?.inProgress, view.kanban?.review, view.kanban?.done],
    [0, 0, 0, 0],
  );
  assert.equal(view.kanban?.arrivalsLeft, 0);
  assert.deepEqual(view.items.filter((own) => own.status !== 'backlog'), []);
});

test('flow metrics on a hand-built round: cycle time without the daily, throughput, highest WIP, work item age', () => {
  const room = firstRound(4, 1234508, solos(3));
  const start = flowStart(room);
  const [a, b, c] = room.state.items.filter((own) => own.status === 'todo');
  assert.ok(a !== undefined && b !== undefined && c !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: a.id });
  act(room, 'p2', { type: 'item.take', itemId: b.id });
  act(room, 'p3', { type: 'item.take', itemId: c.id });
  assert.equal(room.state.iterations[0]?.signals.wipMax, 3);
  act(room, 'p1', { type: 'item.open', itemId: a.id, mode: 'work' });
  advanceTo(room, start + SwitchMs);
  const aPuzzle = item(room, a.id).puzzle;
  assert.ok(aPuzzle !== null);
  act(room, 'p1', { type: 'item.submit', itemId: a.id, response: answerOf(aPuzzle) });
  act(room, 'p4', { type: 'item.take_review', itemId: a.id });
  advanceTo(room, start + 2 * SwitchMs);
  act(room, 'p4', { type: 'item.verdict', itemId: a.id, verdict: 'lgtm' });
  assert.equal(item(room, a.id).times.doneAt, start + 2 * SwitchMs);
  advanceTo(room, start + 20_000);
  act(room, 'p2', { type: 'item.open', itemId: b.id, mode: 'work' });
  advanceTo(room, start + 20_000 + SwitchMs);
  const bPuzzle = item(room, b.id).puzzle;
  assert.ok(bPuzzle !== null);
  act(room, 'p2', { type: 'item.submit', itemId: b.id, response: wrongResponse(bPuzzle) });
  act(room, 'p4', { type: 'item.take_review', itemId: b.id });
  advanceTo(room, start + 20_000 + 2 * SwitchMs);
  act(room, 'p4', { type: 'item.verdict', itemId: b.id, verdict: 'lgtm' });
  advanceTo(room, start + 5 * config.kanban.arrivalIntervalMs);
  const x = arrivals(room).find((own) => own.workersNeeded === 1);
  assert.ok(x !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: x.id });
  advanceTo(room, start + config.timeboxMs.workHalf);
  assert.equal(room.state.phase.kind, 'daily');
  begin(room);
  wait(room, 30_000);
  act(room, 'p3', { type: 'daily.end' });
  const resumed = room.now;
  const dailyMs = resumed - (start + config.timeboxMs.workHalf);
  assert.ok(dailyMs >= 31_000);
  act(room, 'p1', { type: 'item.open', itemId: x.id, mode: 'work' });
  advanceTo(room, resumed + SwitchMs);
  const xPuzzle = item(room, x.id).puzzle;
  assert.ok(xPuzzle !== null);
  act(room, 'p1', { type: 'item.submit', itemId: x.id, response: answerOf(xPuzzle) });
  act(room, 'p2', { type: 'item.take_review', itemId: x.id });
  advanceTo(room, resumed + 2 * SwitchMs);
  act(room, 'p2', { type: 'item.verdict', itemId: x.id, verdict: 'lgtm' });
  advanceTo(room, resumed + config.timeboxMs.workHalf);
  assert.equal(room.state.phase.kind, 'inspect');
  revealAll(room);
  const metrics = room.state.iterations[0]?.metrics;
  assert.ok(metrics !== null && metrics !== undefined);
  const xCycle = config.timeboxMs.workHalf - 5 * config.kanban.arrivalIntervalMs + 2 * SwitchMs;
  assert.deepEqual(metrics.cycleTimesMs, [2 * SwitchMs, 20_000 + 2 * SwitchMs, xCycle]);
  assert.equal(metrics.averageCycleMs, Math.round((2 * SwitchMs + 20_000 + 2 * SwitchMs + xCycle) / 3));
  assert.equal(metrics.throughput, 3);
  assert.equal(metrics.accepted, 2);
  assert.equal(metrics.escapedDefects, 1);
  assert.equal(metrics.valueDelivered, item(room, a.id).value + item(room, x.id).value);
  assert.equal(metrics.wipMax, 3);
  assert.equal(metrics.openAges.length, 1);
  assert.equal(metrics.openAges[0]?.itemId, c.id);
  assert.equal(metrics.openAges[0]?.ageMs, 2 * config.timeboxMs.workHalf);
  assert.deepEqual(metrics.wipLimits, NoLimits);
  const view = kanbanViewOf(room.state, 'p2', room.now);
  assert.equal(view.inspect?.flow?.throughput, 3);
  assert.equal(stepOf(room), 'flow');
  assert.equal(view.inspect?.comparison, null);
});

test('highest WIP counts In Progress and Review together; an unfinished item in Review still has an age', () => {
  const room = firstRound(4, 1234509, solos(3));
  const todo = room.state.items.filter((own) => own.status === 'todo').map((own) => own.id);
  ['p1', 'p2', 'p3'].forEach((id, index) => act(room, id, { type: 'item.take', itemId: todo[index] ?? '' }));
  work(room, 'p1', todo[0] ?? '');
  assert.equal(room.state.iterations[0]?.signals.wipMax, 3);
  const arrivalsAt = flowStart(room) + config.kanban.arrivalIntervalMs;
  advanceTo(room, arrivalsAt);
  const arrived = arrivals(room)[0];
  assert.ok(arrived !== undefined);
  act(room, 'p4', { type: 'item.take', itemId: arrived.id });
  assert.equal(room.state.iterations[0]?.signals.wipMax, 4);
  finishSprint(room);
  revealAll(room);
  const metrics = room.state.iterations[0]?.metrics;
  assert.ok(metrics !== null && metrics !== undefined);
  assert.ok(metrics.openAges.some((point) => point.itemId === todo[0]));
  assert.equal(metrics.throughput, 0);
  assert.equal(metrics.averageCycleMs, null);
});

test('the comparison appears only in round 2 and sets the two rounds side by side', () => {
  const room = startedRoom(4, 1234510, false, 'kanban');
  playIteration(room, kanbanStyle);
  playPlanning(room, { ...kanbanStyle, limits: { inProgress: 2, review: 3 } });
  playWork(room, kanbanStyle);
  begin(room);
  const fac = facilitator(room);
  assert.deepEqual(kanbanViewOf(room.state, fac, room.now).script, { event: 'inspect', step: 'increment', index: 2, total: 4 });
  while (stepOf(room) === 'increment') {
    const iteration = room.state.iterations[1];
    assert.ok(iteration !== undefined);
    if (iteration.verdictsRevealed < iteration.verdicts.length) act(room, fac, { type: 'inspect.reveal' });
    else act(room, fac, { type: 'phase.advance' });
  }
  assert.equal(stepOf(room), 'flow');
  const first = room.state.iterations[0]?.metrics;
  const second = room.state.iterations[1]?.metrics;
  assert.ok(first !== null && first !== undefined && second !== null && second !== undefined);
  let view = kanbanViewOf(room.state, 'p2', room.now);
  assert.deepEqual(view.inspect?.flow, second);
  assert.equal(view.inspect?.comparison, null);
  assert.equal(view.inspect?.valueDelivered, second.valueDelivered);
  assert.ok(view.inspect !== null && !('feedback' in view.inspect) && !('goal' in view.inspect));
  act(room, fac, { type: 'phase.advance' });
  assert.equal(stepOf(room), 'comparison');
  view = kanbanViewOf(room.state, 'p2', room.now);
  assert.deepEqual(view.inspect?.comparison, {
    throughput: { first: first.throughput, second: second.throughput },
    averageCycleMs: { first: first.averageCycleMs, second: second.averageCycleMs },
    wipMax: { first: first.wipMax, second: second.wipMax },
    openCount: { first: first.openAges.length, second: second.openAges.length },
    escapedDefects: { first: first.escapedDefects, second: second.escapedDefects },
    valueDelivered: { first: first.valueDelivered, second: second.valueDelivered },
    limits: { inProgress: 2, review: 3 },
  });
  assert.deepEqual(view.metrics.map((own) => own.iteration), [1, 2]);
  act(room, fac, { type: 'phase.advance' });
  assert.equal(room.state.phase.kind, 'retro');
});

test('round 1 goes from the flow metrics straight to the retrospective, with no customer feedback', () => {
  const room = startedRoom(4, 1234511, false, 'kanban');
  playPlanning(room, kanbanStyle);
  playWork(room, kanbanStyle);
  begin(room);
  const fac = facilitator(room);
  while (stepOf(room) === 'increment') {
    const iteration = room.state.iterations[0];
    assert.ok(iteration !== undefined);
    if (iteration.verdictsRevealed < iteration.verdicts.length) act(room, fac, { type: 'inspect.reveal' });
    else act(room, fac, { type: 'phase.advance' });
  }
  assert.equal(stepOf(room), 'flow');
  assert.deepEqual(kanbanViewOf(room.state, fac, room.now).script, { event: 'inspect', step: 'flow', index: 3, total: 3 });
  assert.equal(room.state.iterations[0]?.feedback, null);
  act(room, fac, { type: 'phase.advance' });
  assert.equal(room.state.phase.kind, 'retro');
  assert.equal(room.state.items.every((own) => own.iteration === 1), true);
});

test('score is the accepted value over both rounds; the entry carries defects and average cycle time', () => {
  const room = playGame({ players: 4, seed: 6060606, framework: 'kanban', style: { careful: false, wrongMod: 3 } });
  const [first, second] = room.state.iterations.map((own) => own.metrics);
  assert.ok(first !== null && first !== undefined && second !== null && second !== undefined);
  const view = kanbanViewOf(room.state, facilitator(room), room.now);
  const score = view.summary?.score;
  assert.ok(score !== undefined);
  assert.equal(score.value, first.valueDelivered + second.valueDelivered);
  assert.equal(score.total, score.value);
  assert.equal(score.goalBonus, 0);
  assert.equal(score.escapedDefects, first.escapedDefects + second.escapedDefects);
  assert.ok(score.escapedDefects > 0);
  const times = [...first.cycleTimesMs, ...second.cycleTimesMs];
  const average = Math.round(times.reduce((sum, value) => sum + value, 0) / times.length);
  assert.equal(score.averageCycleMs, average);
  const entry = leaderboardEntry(room.state);
  assert.ok(entry !== null);
  assert.equal(entry.framework, 'kanban');
  assert.equal(entry.score, score.total);
  assert.equal(entry.escapedDefects, score.escapedDefects);
  assert.equal(entry.averageCycleMs, average);
  assert.equal(entry.players, 4);
  assert.equal(entry.teamName, room.state.teamName);
});

test('the limits agreement: suggested first after round 1, kept when limits were set, broken when not', () => {
  const kept = secondRound({ seed: 777001, pick: solos(2), limits: { inProgress: 2, review: null } });
  const view = kanbanViewOf(kept.state, 'p1', kept.now);
  assert.equal(view.items.length, 8);
  finishSprint(kept);
  revealAll(kept);
  assert.equal(kept.state.iterations[1]?.metrics?.agreement?.kept, true);
  assert.equal(kept.state.iterations[1]?.metrics?.agreement?.agreement.type, 'wip_limits_set');
  const broken = secondRound({ seed: 777001, pick: solos(2), limits: NoLimits });
  finishSprint(broken);
  revealAll(broken);
  assert.equal(broken.state.iterations[1]?.metrics?.agreement?.kept, false);
  const free = secondRound({ seed: 777001, pick: solos(2), agreement: { type: 'free', text: 'talk' } });
  finishSprint(free);
  revealAll(free);
  assert.equal(free.state.iterations[1]?.metrics?.agreement?.kept, null);
});

test('the Kanban retrospective: wip_limits_set first after round 1, a plain WIP number refused, round 2 opens with the result', () => {
  const room = startedRoom(4, 777002, false, 'kanban');
  playPlanning(room, kanbanStyle);
  playWork(room, kanbanStyle);
  playInspect(room);
  begin(room);
  const fac = facilitator(room);
  act(room, fac, { type: 'retro.reveal' });
  act(room, fac, { type: 'phase.advance' });
  const suggested = kanbanViewOf(room.state, fac, room.now).retro?.suggestedAgreements ?? [];
  assert.equal(suggested[0], 'wip_limits_set');
  assert.equal(suggested.at(-1), 'free');
  assert.ok(!suggested.includes('wip_limit'));
  assert.equal(code(tryAct(room, fac, { type: 'retro.choose_action', agreement: { type: 'wip_limit', max: 2 } })), 'bad_request');
  act(room, fac, { type: 'retro.choose_action', agreement: { type: 'wip_limits_set' } });
  assert.deepEqual(room.state.iterations[0]?.retro.action, { type: 'wip_limits_set' });
  act(room, fac, { type: 'retro.choose_action', agreement: { type: 'pair_first' } });
  act(room, fac, { type: 'retro.choose_action', agreement: { type: 'wip_limits_set' } });
  act(room, fac, { type: 'phase.advance' });
  playPlanning(room, { ...kanbanStyle, limits: { inProgress: 3, review: null } });
  playWork(room, kanbanStyle);
  playInspect(room);
  begin(room);
  assert.equal(stepOf(room), 'previous');
  const previous = kanbanViewOf(room.state, 'p2', room.now).retro?.previous;
  assert.deepEqual(previous, { agreement: { type: 'wip_limits_set' }, kept: true, violations: null });
  const second = kanbanViewOf(room.state, facilitator(room), room.now).retro?.suggestedAgreements ?? [];
  assert.ok(!second.includes('wip_limits_set'));
  act(room, facilitator(room), { type: 'phase.advance' });
  assert.ok(kanbanViewOf(room.state, 'p2', room.now).observations.every((own) => own.id !== 'retro.actionBroken'));
});

test('pair_first in Kanban: starting another item while one waits for its second worker breaks it', () => {
  const pick = (backlog: WorkItem[]): string[] => [
    ...backlog.filter((own) => own.workersNeeded === 2).slice(0, 1),
    ...backlog.filter((own) => own.workersNeeded === 1).slice(0, 1),
  ].map((own) => own.id);
  const run = (join: boolean): boolean | null | undefined => {
    const room = secondRound({ seed: 777003, pick, agreement: { type: 'pair_first' } });
    const pair = room.state.items.find((own) => own.status === 'todo' && own.workersNeeded === 2);
    const solo = room.state.items.find((own) => own.status === 'todo' && own.workersNeeded === 1);
    assert.ok(pair !== undefined && solo !== undefined);
    act(room, 'p1', { type: 'item.take', itemId: pair.id });
    if (join) act(room, 'p2', { type: 'item.take', itemId: pair.id });
    act(room, 'p3', { type: 'item.take', itemId: solo.id });
    finishSprint(room);
    revealAll(room);
    return room.state.iterations[1]?.metrics?.agreement?.kept;
  };
  assert.equal(run(true), true);
  assert.equal(run(false), false);
});

function finishedGame(): RoomState {
  return clone(playGame({ players: 4, seed: 9090909, framework: 'kanban', checks: false }).state);
}

function lastWork(state: RoomState): string[] {
  observe(state, 'work');
  return latestObservations(state).map((own) => own.id);
}

test('Kanban work observations: limits reached or never reached, aged work, none without limits', () => {
  const reached = finishedGame();
  const second = reached.iterations[1];
  assert.ok(second !== undefined);
  second.wipLimits = { inProgress: 3, review: null };
  second.signals.inProgressMax = 3;
  assert.ok(lastWork(reached).includes('work.limitReached'));
  const loose = finishedGame();
  const looseIteration = loose.iterations[1];
  assert.ok(looseIteration !== undefined);
  looseIteration.wipLimits = { inProgress: 3, review: 3 };
  looseIteration.signals.inProgressMax = 2;
  looseIteration.signals.reviewMax = 1;
  const ids = lastWork(loose);
  assert.ok(ids.includes('work.limitNeverReached'));
  assert.ok(!ids.includes('work.limitReached'));
  const none = finishedGame();
  const noneIteration = none.iterations[1];
  assert.ok(noneIteration !== undefined);
  noneIteration.wipLimits = NoLimits;
  const noneIds = lastWork(none);
  assert.ok(!noneIds.includes('work.limitReached') && !noneIds.includes('work.limitNeverReached'));
  const aged = finishedGame();
  const agedIteration = aged.iterations[1];
  const target = aged.items.find((own) => own.iteration === agedIteration?.iteration);
  assert.ok(agedIteration !== undefined && target !== undefined);
  agedIteration.wipLimits = NoLimits;
  target.status = 'doing';
  target.times.startedAt = (agedIteration.flowEndedAt ?? 0) - config.kanban.agedWorkMs - 10_000;
  observe(aged, 'work');
  const found = latestObservations(aged).find((own) => own.id === 'work.agedWork');
  assert.equal(found?.positive, false);
  assert.equal(found?.params.count, 1);
  assert.equal(found?.params.oldestSec, (config.kanban.agedWorkMs + 10_000) / 1000);
});

test('Kanban inspect observations compare the rounds: throughput and cycle time', () => {
  const run = (throughputDelta: number, cycleDelta: number): string[] => {
    const state = finishedGame();
    const [first, second] = state.iterations.map((own) => own.metrics);
    assert.ok(first !== null && first !== undefined && second !== null && second !== undefined);
    second.accepted = 0;
    second.escapedDefects = 0;
    first.throughput = second.throughput + throughputDelta;
    first.averageCycleMs = (second.averageCycleMs ?? 20_000) + cycleDelta;
    observe(state, 'inspect');
    return latestObservations(state).map((own) => own.id);
  };
  const better = run(-1, 5000);
  assert.deepEqual(better, ['inspect.throughputUp', 'inspect.cycleTimeFaster']);
  const worse = run(2, -5000);
  assert.deepEqual(worse, ['inspect.throughputDown', 'inspect.cycleTimeSlower']);
  assert.deepEqual(run(0, 0), []);
});

test('Scrum-only observations are never raised in Kanban and the reverse, checked on the raw candidates of both', () => {
  const kanban = finishedGame();
  for (const group of ['plan', 'daily', 'work', 'inspect', 'retro'] as const) {
    observe(kanban, group);
    for (const own of latestObservations(kanban)) {
      assert.ok(!/^plan\.(unestimatedPulled|allEstimated|overcommitted|fitsVelocity)$|^inspect\.goal/u.test(own.id), own.id);
    }
  }
  const scrum = clone(playGame({ players: 4, seed: 9090909, checks: false }).state);
  for (const group of ['plan', 'daily', 'work', 'inspect', 'retro'] as const) {
    observe(scrum, group);
    for (const own of latestObservations(scrum)) {
      assert.ok(!/^work\.(limit|aged)|^inspect\.(throughput|cycleTime)/u.test(own.id), own.id);
    }
  }
});
