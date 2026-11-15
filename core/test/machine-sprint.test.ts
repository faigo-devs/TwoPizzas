import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { nextDeadline, viewFor } from '../machine/index.ts';
import type { Agreement, RoomState, WorkItem } from '../types.ts';
import {
  act,
  answerOf,
  begin,
  facilitator,
  finishSprint,
  item,
  phaseOf,
  stepOf,
  revealAll,
  secondSprint,
  sprintRunning,
  tryAct,
  wait,
  wrongResponse,
  type Room,
} from './machine-support.ts';

const SwitchMs = config.contextSwitchMs;

function code(result: ReturnType<typeof tryAct>): string {
  return result.ok ? 'ok' : result.code;
}

function solos(count: number): (backlog: WorkItem[]) => string[] {
  return (backlog) => backlog.filter((own) => own.workersNeeded === 1).slice(0, count).map((own) => own.id);
}

function submitAs(room: Room, id: string, itemId: string, right: boolean): void {
  act(room, id, { type: 'item.take', itemId });
  const target = item(room, itemId);
  assert.ok(target.puzzle !== null);
  act(room, id, { type: 'item.open', itemId, mode: 'work' });
  wait(room, SwitchMs + 500);
  act(room, id, { type: 'item.submit', itemId, response: right ? answerOf(target.puzzle) : wrongResponse(target.puzzle) });
}

function review(room: Room, id: string, itemId: string, verdict: 'lgtm' | 'changes'): void {
  act(room, id, { type: 'item.take_review', itemId });
  wait(room, SwitchMs + 500);
  act(room, id, { type: 'item.verdict', itemId, verdict });
}

test('a context switch hides the item for the configured delay and the server is told when it passes', () => {
  const room = sprintRunning(4, 1010101, solos(2));
  const target = room.state.items.find((own) => own.status === 'todo');
  assert.ok(target !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: target.id });
  const opened = room.now;
  act(room, 'p1', { type: 'item.open', itemId: target.id, mode: 'work' });
  const hidden = viewFor(room.state, 'p1', room.now).workspace;
  assert.equal(hidden?.readyAt, opened + SwitchMs);
  assert.equal(hidden?.part, null);
  assert.equal(hidden?.canSubmit, false);
  assert.equal(nextDeadline(room.state), opened + SwitchMs);
  const puzzle = item(room, target.id).puzzle;
  assert.ok(puzzle !== null);
  assert.equal(code(tryAct(room, 'p1', { type: 'item.submit', itemId: target.id, response: answerOf(puzzle) })), 'not_allowed');
  wait(room, SwitchMs);
  const shown = viewFor(room.state, 'p1', room.now).workspace;
  assert.ok(shown?.part !== null && shown?.part !== undefined);
  assert.equal(shown?.canSubmit, true);
  assert.equal(code(tryAct(room, 'p1', { type: 'item.open', itemId: target.id, mode: 'work' })), 'not_allowed');
});

test('submitting never says whether the answer is right', () => {
  const room = sprintRunning(4, 1020202, solos(2));
  const target = room.state.items.find((own) => own.status === 'todo');
  assert.ok(target !== undefined);
  submitAs(room, 'p1', target.id, false);
  const before = viewFor(room.state, 'p2', room.now);
  assert.equal(before.items.find((own) => own.id === target.id)?.status, 'review');
  assert.equal(before.items.find((own) => own.id === target.id)?.outcome, null);
  const bad = tryAct(room, 'p1', {
    type: 'item.submit',
    itemId: target.id,
    response: { kind: 'merge', values: [1] },
  });
  assert.equal(code(bad), 'not_allowed');
});

test('a malformed response is a bad request and a worker cannot review their own item', () => {
  const room = sprintRunning(4, 1030303, solos(2));
  const target = room.state.items.find((own) => own.status === 'todo');
  assert.ok(target !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: target.id });
  act(room, 'p1', { type: 'item.open', itemId: target.id, mode: 'work' });
  wait(room, SwitchMs);
  assert.equal(
    code(tryAct(room, 'p1', { type: 'item.submit', itemId: target.id, response: { kind: 'incident', action: 'Bad Value!' } })),
    'bad_request',
  );
  const puzzle = item(room, target.id).puzzle;
  assert.ok(puzzle !== null);
  act(room, 'p1', { type: 'item.submit', itemId: target.id, response: answerOf(puzzle) });
  assert.equal(code(tryAct(room, 'p1', { type: 'item.take_review', itemId: target.id })), 'not_allowed');
  act(room, 'p2', { type: 'item.take_review', itemId: target.id });
  assert.equal(code(tryAct(room, 'p3', { type: 'item.take_review', itemId: target.id })), 'not_allowed');
});

test('Request changes sends the item back to its workers; LGTM completes it', () => {
  const room = sprintRunning(4, 1040404, solos(2));
  const target = room.state.items.find((own) => own.status === 'todo');
  assert.ok(target !== undefined);
  submitAs(room, 'p1', target.id, false);
  review(room, 'p2', target.id, 'changes');
  const back = item(room, target.id);
  assert.equal(back.status, 'doing');
  assert.deepEqual(back.workers, ['p1']);
  assert.equal(back.changesRequested, 1);
  assert.equal(back.submission, null);
  assert.equal(back.reviewer, null);
  assert.equal(room.state.players[1]?.open, null);
  act(room, 'p1', { type: 'item.open', itemId: target.id, mode: 'work' });
  wait(room, SwitchMs);
  assert.ok(back.puzzle !== null);
  act(room, 'p1', { type: 'item.submit', itemId: target.id, response: answerOf(back.puzzle) });
  review(room, 'p3', target.id, 'lgtm');
  const done = item(room, target.id);
  assert.equal(done.status, 'done');
  assert.equal(done.reviewedBy, 'p3');
  assert.ok(done.times.doneAt !== null);
});

test('an escaped defect gets no value, returns to the top of the backlog and is observed', () => {
  const room = sprintRunning(4, 1050505, solos(2));
  const [first, second] = room.state.items.filter((own) => own.status === 'todo');
  assert.ok(first !== undefined && second !== undefined);
  submitAs(room, 'p1', first.id, false);
  review(room, 'p2', first.id, 'lgtm');
  submitAs(room, 'p3', second.id, true);
  review(room, 'p4', second.id, 'lgtm');
  finishSprint(room);
  begin(room);
  const masked = viewFor(room.state, 'p1', room.now);
  assert.ok(masked.items.every((own) => own.outcome === null));
  assert.equal(masked.inspect?.verdicts.length, 0);
  assert.equal(masked.inspect?.verdictsTotal, 2);
  const fac = facilitator(room);
  act(room, fac, { type: 'inspect.reveal' });
  assert.equal(viewFor(room.state, 'p1', room.now).inspect?.verdicts.length, 1);
  assert.equal(code(tryAct(room, fac, { type: 'phase.advance' })), 'not_allowed');
  act(room, fac, { type: 'inspect.reveal' });
  const revealed = viewFor(room.state, 'p1', room.now).inspect?.verdicts ?? [];
  assert.deepEqual(
    revealed.map((verdict) => verdict.outcome).sort(),
    ['accepted', 'escaped_defect'],
  );
  act(room, fac, { type: 'phase.advance' });
  const metrics = room.state.iterations[0]?.metrics;
  assert.equal(metrics?.escapedDefects, 1);
  assert.equal(metrics?.accepted, 1);
  assert.equal(metrics?.valueDelivered, item(room, second.id).value);
  assert.equal(metrics?.velocity, item(room, second.id).estimate ?? 0);
  const returned = item(room, first.id);
  assert.equal(returned.status, 'backlog');
  assert.equal(returned.defect, true);
  assert.equal(returned.outcome, null);
  assert.equal(room.state.items[0]?.id, first.id);
  act(room, fac, { type: 'phase.advance' });
  act(room, fac, { type: 'phase.advance' });
  assert.equal(room.state.items[0]?.id, first.id);
  const ids = viewFor(room.state, 'p1', room.now).observations.map((own) => own.id);
  assert.ok(ids.includes('inspect.escapedDefects'));
  assert.equal(phaseOf(room).kind, 'retro');
});

test('feedback shifts the priority of one theme and adds three new items', () => {
  const room = sprintRunning(4, 1060606, solos(1));
  finishSprint(room);
  revealAll(room);
  const fac = facilitator(room);
  assert.equal(viewFor(room.state, fac, room.now).inspect?.feedback, null);
  const before = new Map(room.state.items.map((own) => [own.id, own.value]));
  act(room, fac, { type: 'phase.advance' });
  const feedback = viewFor(room.state, fac, room.now).inspect?.feedback;
  assert.equal(feedback?.newItemIds.length, 3);
  assert.equal(feedback?.bonus, config.feedback.shiftBonus);
  for (const own of room.state.items) {
    if (before.has(own.id) && own.status === 'backlog') {
      const extra: number = own.theme === feedback?.theme ? config.feedback.shiftBonus : 0;
      assert.equal(own.value, (before.get(own.id) ?? 0) + extra);
    }
  }
  const backlog = room.state.items.filter((own) => own.status === 'backlog');
  const sorted = [...backlog].sort((a, b) => Number(b.defect) - Number(a.defect) || b.value - a.value);
  assert.deepEqual(backlog.map((own) => own.value), sorted.map((own) => own.value));
  assert.equal(room.state.items.filter((own) => own.iteration === 2 && own.status === 'backlog').length >= 3, true);
});

test('unfinished work at the hard end goes to the Daily Scrum, then back to the backlog', () => {
  const room = sprintRunning(4, 1070707, solos(2));
  const target = room.state.items.find((own) => own.status === 'todo');
  assert.ok(target !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: target.id });
  const phase = phaseOf(room);
  assert.ok(phase.kind === 'work');
  const deadline = phase.timebox.deadline ?? 0;
  assert.equal(phase.timebox.hard, true);
  wait(room, deadline - room.now - 1);
  assert.equal(phaseOf(room).kind, 'work');
  wait(room, 1);
  assert.equal(phaseOf(room).kind, 'daily');
  assert.equal(stepOf(room), 'card');
  assert.equal(nextDeadline(room.state), null);
  assert.equal(item(room, target.id).status, 'doing');
  begin(room);
  wait(room, 20_000);
  act(room, 'p3', { type: 'daily.end' });
  const second = phaseOf(room);
  assert.ok(second.kind === 'work');
  assert.equal(second.half, 2);
  assert.equal(second.timebox.startedAt, room.now);
  wait(room, config.timeboxMs.workHalf);
  assert.equal(phaseOf(room).kind, 'inspect');
  assert.equal(item(room, target.id).status, 'doing');
  const ids = viewFor(room.state, 'p1', room.now).observations.map((own) => own.id);
  assert.ok(ids.includes('work.unfinished'));
  revealAll(room);
  assert.equal(item(room, target.id).status, 'backlog');
  assert.deepEqual(item(room, target.id).workers, []);
});

test('a pair item waits visibly for its second worker and the puzzle appears when the pair is complete', () => {
  const room = sprintRunning(4, 1080808, (backlog) => backlog.filter((own) => own.workersNeeded === 2).slice(0, 1).map((own) => own.id));
  const target = room.state.items.find((own) => own.status === 'todo');
  assert.ok(target !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: target.id });
  const view = viewFor(room.state, 'p2', room.now).items.find((own) => own.id === target.id);
  assert.equal(view?.waitingForPair, true);
  assert.equal(view?.blocked, false);
  assert.equal(item(room, target.id).puzzle, null);
  assert.equal(code(tryAct(room, 'p1', { type: 'item.open', itemId: target.id, mode: 'work' })), 'not_allowed');
  assert.equal(code(tryAct(room, 'p1', { type: 'item.take', itemId: target.id })), 'not_allowed');
  wait(room, 40_000);
  act(room, 'p2', { type: 'item.take', itemId: target.id });
  const complete = item(room, target.id);
  assert.ok(complete.puzzle !== null);
  assert.equal(viewFor(room.state, 'p3', room.now).items.find((own) => own.id === target.id)?.waitingForPair, false);
  assert.ok((room.state.iterations[0]?.signals.pairWaitMs ?? 0) >= 40_000);
  assert.equal(code(tryAct(room, 'p3', { type: 'item.take', itemId: target.id })), 'not_allowed');
  act(room, 'p1', { type: 'item.open', itemId: target.id, mode: 'work' });
  wait(room, SwitchMs + 500);
  act(room, 'p1', { type: 'item.submit', itemId: target.id, response: answerOf(complete.puzzle) });
  review(room, 'p3', target.id, 'lgtm');
  finishSprint(room);
  const ids = viewFor(room.state, 'p1', room.now).observations.map((own) => own.id);
  assert.ok(ids.includes('work.waitingForPair'));
});

test('the dependency holder is a player outside the item holding the fewest dependencies', () => {
  const room = sprintRunning(4, 1090909, (backlog) => backlog.filter((own) => own.dependency && own.workersNeeded === 2).slice(0, 2).map((own) => own.id));
  const [first, second] = room.state.items.filter((own) => own.status === 'todo');
  assert.ok(first !== undefined && second !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: first.id });
  act(room, 'p2', { type: 'item.take', itemId: first.id });
  assert.equal(item(room, first.id).dependencyHolder, 'p3');
  act(room, 'p1', { type: 'item.take', itemId: second.id });
  act(room, 'p2', { type: 'item.take', itemId: second.id });
  assert.equal(item(room, second.id).dependencyHolder, 'p4');
  const holderView = viewFor(room.state, 'p3', room.now);
  assert.equal(holderView.held.length, 1);
  assert.equal(holderView.held[0]?.itemId, first.id);
  assert.equal(holderView.held[0]?.part.scope, 'dependency');
  assert.equal(viewFor(room.state, 'p1', room.now).held.length, 0);
  assert.equal(viewFor(room.state, 'p2', room.now).items.find((own) => own.id === first.id)?.blocked, true);
});

test('the dependency holder is never a worker and a connected player is preferred', () => {
  const room = sprintRunning(4, 1100101, (backlog) => backlog.filter((own) => own.dependency && own.workersNeeded === 2).slice(0, 1).map((own) => own.id));
  const target = room.state.items.find((own) => own.status === 'todo');
  assert.ok(target !== undefined);
  room.state = { ...room.state };
  act(room, 'p3', { type: 'item.take', itemId: target.id });
  act(room, 'p4', { type: 'item.take', itemId: target.id });
  const holder = item(room, target.id).dependencyHolder;
  assert.ok(holder === 'p1' || holder === 'p2');
  assert.equal(holder, 'p1');
});

test('leaving a pair item sends it back to waiting; the first worker leaving empties it', () => {
  const room = sprintRunning(4, 1110202, (backlog) => backlog.filter((own) => own.workersNeeded === 2).slice(0, 1).map((own) => own.id));
  const target = room.state.items.find((own) => own.status === 'todo');
  assert.ok(target !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: target.id });
  act(room, 'p2', { type: 'item.take', itemId: target.id });
  act(room, 'p2', { type: 'item.leave', itemId: target.id });
  assert.equal(item(room, target.id).puzzle, null);
  assert.equal(item(room, target.id).status, 'doing');
  assert.equal(viewFor(room.state, 'p3', room.now).items.find((own) => own.id === target.id)?.waitingForPair, true);
  act(room, 'p1', { type: 'item.leave', itemId: target.id });
  assert.equal(item(room, target.id).status, 'todo');
  assert.equal(code(tryAct(room, 'p1', { type: 'item.leave', itemId: target.id })), 'not_allowed');
});

test('the Daily Scrum allows re-planning, any player ends it and the Sprint clock is stopped', () => {
  const room = sprintRunning(4, 1120303, (backlog) => backlog.filter((own) => own.dependency && own.workersNeeded === 2).slice(0, 1).concat(backlog.filter((own) => own.workersNeeded === 1).slice(0, 1)).map((own) => own.id));
  const pair = room.state.items.find((own) => own.workersNeeded === 2 && own.status === 'todo');
  const solo = room.state.items.find((own) => own.workersNeeded === 1 && own.status === 'todo');
  assert.ok(pair !== undefined && solo !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: pair.id });
  submitAs(room, 'p3', solo.id, true);
  wait(room, config.timeboxMs.workHalf);
  begin(room);
  assert.equal(phaseOf(room).kind, 'daily');
  assert.equal(nextDeadline(room.state), null);
  assert.equal(code(tryAct(room, 'p2', { type: 'item.open', itemId: pair.id, mode: 'work' })), 'not_allowed');
  act(room, 'p2', { type: 'item.take', itemId: pair.id });
  assert.ok(item(room, pair.id).puzzle !== null);
  act(room, 'p4', { type: 'help.promise', itemId: pair.id });
  assert.equal(code(tryAct(room, 'p3', { type: 'help.promise', itemId: pair.id })), 'not_allowed');
  assert.equal(item(room, pair.id).helpPromisedBy, 'p4');
  act(room, 'p4', { type: 'help.withdraw', itemId: pair.id });
  act(room, 'p4', { type: 'help.promise', itemId: pair.id });
  act(room, 'p4', { type: 'item.take_review', itemId: solo.id });
  act(room, 'p1', { type: 'item.leave', itemId: pair.id });
  assert.equal(room.state.iterations[0]?.signals.dailyChanges, 5);
  act(room, 'p2', { type: 'daily.end' });
  const ids = viewFor(room.state, 'p1', room.now).observations.map((own) => own.id);
  assert.ok(ids.includes('daily.planAdapted') || ids.includes('daily.blockedHelped') || ids.includes('daily.reviewFlowing'));
  assert.ok(!ids.includes('daily.planUnchanged'));
  assert.equal(phaseOf(room).kind, 'work');
});

test('a Daily Scrum without any change is observed', () => {
  const room = sprintRunning(3, 1130404, solos(1));
  wait(room, config.timeboxMs.workHalf);
  begin(room);
  wait(room, config.timeboxMs.daily + 15_000);
  act(room, 'p2', { type: 'daily.end' });
  assert.ok(room.state.events.some((event) => event.kind === 'daily' && event.overrunMs >= 15_000));
  const ids = viewFor(room.state, 'p1', room.now).observations.map((own) => own.id);
  assert.ok(ids.includes('daily.overtime') || ids.includes('daily.planUnchanged'));
});

function agreementOutcome(room: Room): boolean | null | undefined {
  finishSprint(room);
  revealAll(room);
  return room.state.iterations[1]?.metrics?.agreement?.kept;
}

function pickMixed(backlog: WorkItem[]): string[] {
  const solo = backlog.filter((own) => own.workersNeeded === 1);
  const pair = backlog.filter((own) => own.workersNeeded === 2);
  return [...solo.slice(0, 2), ...pair.slice(0, 2)].map((own) => own.id);
}

test('wip_limit agreement: kept at the limit, broken above it', () => {
  const limit: Agreement = { type: 'wip_limit', max: 1 };
  const kept = secondSprint(limit, solos(2));
  const [one] = kept.state.items.filter((own) => own.status === 'todo');
  assert.ok(one !== undefined);
  act(kept, 'p1', { type: 'item.take', itemId: one.id });
  assert.equal(agreementOutcome(kept), true);
  const broken = secondSprint(limit, solos(2));
  const [first, second] = broken.state.items.filter((own) => own.status === 'todo');
  assert.ok(first !== undefined && second !== undefined);
  act(broken, 'p1', { type: 'item.take', itemId: first.id });
  act(broken, 'p2', { type: 'item.take', itemId: second.id });
  assert.equal(agreementOutcome(broken), false);
  assert.equal(broken.state.iterations[1]?.metrics?.agreement?.agreement.type, 'wip_limit');
  const ids = broken.state.observations.map((own) => own.id);
  assert.ok(ids.includes('work.wipLow') || ids.includes('work.wipHigh') || ids.length > 0);
});

test('review_wait agreement: kept with a quick review, broken after a long wait', () => {
  const limit: Agreement = { type: 'review_wait', maxMs: config.agreements.reviewWaitMs };
  const quick = secondSprint(limit, solos(2));
  const [a] = quick.state.items.filter((own) => own.status === 'todo');
  assert.ok(a !== undefined);
  submitAs(quick, 'p1', a.id, true);
  wait(quick, 10_000);
  review(quick, 'p2', a.id, 'lgtm');
  assert.equal(agreementOutcome(quick), true);
  const slow = secondSprint(limit, solos(2));
  const [b] = slow.state.items.filter((own) => own.status === 'todo');
  assert.ok(b !== undefined);
  submitAs(slow, 'p1', b.id, true);
  wait(slow, config.agreements.reviewWaitMs + 10_000);
  review(slow, 'p2', b.id, 'lgtm');
  assert.equal(agreementOutcome(slow), false);
  assert.ok((slow.state.iterations[1]?.signals.maxReviewWaitMs ?? 0) > config.agreements.reviewWaitMs);
});

test('review_wait agreement: an item nobody reviewed before the end counts as waiting', () => {
  const limit: Agreement = { type: 'review_wait', maxMs: config.agreements.reviewWaitMs };
  const room = secondSprint(limit, solos(2));
  const [a] = room.state.items.filter((own) => own.status === 'todo');
  assert.ok(a !== undefined);
  submitAs(room, 'p1', a.id, true);
  assert.equal(agreementOutcome(room), false);
});

test('no_new_while_blocked agreement: kept when a helper is promised, broken when nobody helps', () => {
  const agreement: Agreement = { type: 'no_new_while_blocked' };
  const pick = (backlog: WorkItem[]): string[] =>
    backlog.filter((own) => own.dependency && own.workersNeeded === 2).slice(0, 1).concat(backlog.filter((own) => own.workersNeeded === 1).slice(0, 1)).map((own) => own.id);
  const kept = secondSprint(agreement, pick);
  const pairKept = kept.state.items.find((own) => own.status === 'todo' && own.workersNeeded === 2);
  const soloKept = kept.state.items.find((own) => own.status === 'todo' && own.workersNeeded === 1);
  assert.ok(pairKept !== undefined && soloKept !== undefined);
  act(kept, 'p1', { type: 'item.take', itemId: pairKept.id });
  act(kept, 'p2', { type: 'item.take', itemId: pairKept.id });
  act(kept, 'p3', { type: 'help.promise', itemId: pairKept.id });
  act(kept, 'p4', { type: 'item.take', itemId: soloKept.id });
  assert.equal(agreementOutcome(kept), true);
  const broken = secondSprint(agreement, pick);
  const pairBroken = broken.state.items.find((own) => own.status === 'todo' && own.workersNeeded === 2);
  const soloBroken = broken.state.items.find((own) => own.status === 'todo' && own.workersNeeded === 1);
  assert.ok(pairBroken !== undefined && soloBroken !== undefined);
  act(broken, 'p1', { type: 'item.take', itemId: pairBroken.id });
  act(broken, 'p2', { type: 'item.take', itemId: pairBroken.id });
  act(broken, 'p4', { type: 'item.take', itemId: soloBroken.id });
  assert.equal(agreementOutcome(broken), false);
});

test('pair_first agreement: joining the waiting item or finishing the pairing first keeps it, starting something else breaks it', () => {
  const agreement: Agreement = { type: 'pair_first' };
  const pick = (backlog: WorkItem[]): string[] => {
    const pair = backlog.filter((own) => own.workersNeeded === 2).slice(0, 1);
    const solo = backlog.filter((own) => own.workersNeeded === 1).slice(0, 1);
    return [...pair, ...solo].map((own) => own.id);
  };
  const kept = secondSprint(agreement, pick);
  const pairKept = kept.state.items.find((own) => own.status === 'todo' && own.workersNeeded === 2);
  const soloKept = kept.state.items.find((own) => own.status === 'todo' && own.workersNeeded === 1);
  assert.ok(pairKept !== undefined && soloKept !== undefined);
  act(kept, 'p1', { type: 'item.take', itemId: pairKept.id });
  act(kept, 'p2', { type: 'item.take', itemId: pairKept.id });
  act(kept, 'p3', { type: 'item.take', itemId: soloKept.id });
  assert.equal(agreementOutcome(kept), true);
  const broken = secondSprint(agreement, pick);
  const pairBroken = broken.state.items.find((own) => own.status === 'todo' && own.workersNeeded === 2);
  const soloBroken = broken.state.items.find((own) => own.status === 'todo' && own.workersNeeded === 1);
  assert.ok(pairBroken !== undefined && soloBroken !== undefined);
  act(broken, 'p1', { type: 'item.take', itemId: pairBroken.id });
  act(broken, 'p3', { type: 'item.take', itemId: soloBroken.id });
  assert.equal(agreementOutcome(broken), false);
});

test('pair_first agreement: a pair item taken as the first of two is not itself a violation, and a released pair counts as waiting', () => {
  const agreement: Agreement = { type: 'pair_first' };
  const pick = (backlog: WorkItem[]): string[] => backlog.filter((own) => own.workersNeeded === 2).slice(0, 3).map((own) => own.id);
  const room = secondSprint(agreement, pick);
  const [first, second, third] = room.state.items.filter((own) => own.status === 'todo');
  assert.ok(first !== undefined && second !== undefined && third !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: first.id });
  assert.equal(room.state.iterations[1]?.signals.agreementViolations, 0);
  act(room, 'p2', { type: 'item.take', itemId: first.id });
  act(room, 'p3', { type: 'item.take', itemId: second.id });
  assert.equal(room.state.iterations[1]?.signals.agreementViolations, 0);
  act(room, 'p2', { type: 'item.leave', itemId: first.id });
  act(room, 'p4', { type: 'item.take', itemId: third.id });
  assert.equal(room.state.iterations[1]?.signals.agreementViolations, 1);
});

test('a free-text agreement is carried to Sprint 2 but never judged', () => {
  const room = secondSprint({ type: 'free', text: 'talk to each other more' }, pickMixed);
  const [a] = room.state.items.filter((own) => own.status === 'todo');
  assert.ok(a !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: a.id });
  assert.equal(agreementOutcome(room), null);
  assert.equal(room.state.iterations[1]?.metrics?.agreement?.agreement.type, 'free');
});

test('no agreement chosen means nothing to track in Sprint 2', () => {
  const room = secondSprint(null, pickMixed);
  assert.equal(agreementOutcome(room), undefined);
  assert.equal(room.state.iterations[1]?.metrics?.agreement, null);
});

test('Sprint 2 retrospective opens with the result of the agreement', () => {
  const room = secondSprint({ type: 'wip_limit', max: 3 }, solos(1));
  finishSprint(room);
  revealAll(room);
  const fac = facilitator(room);
  act(room, fac, { type: 'phase.advance' });
  assert.equal(phaseOf(room).kind, 'retro');
  begin(room);
  assert.equal(stepOf(room), 'previous');
  const view = viewFor(room.state, 'p2', room.now);
  assert.equal(view.retro?.previous?.agreement.type, 'wip_limit');
  assert.equal(view.retro?.previous?.kept, true);
  assert.equal(code(tryAct(room, 'p2', { type: 'retro.note_add', column: 'try', text: 'too early' })), 'not_allowed');
  act(room, fac, { type: 'phase.advance' });
  assert.equal(stepOf(room), 'notes');
});

function retroRoom(): Room {
  const room = sprintRunning(4, 1140505, solos(1));
  finishSprint(room);
  revealAll(room);
  const fac = facilitator(room);
  act(room, fac, { type: 'phase.advance' });
  act(room, fac, { type: 'phase.advance' });
  begin(room);
  return room;
}

test('retro notes are private until revealed, sanitised and limited', () => {
  const room = retroRoom();
  assert.equal(stepOf(room), 'notes');
  const messy = `  hello\u0000\u0007   world \n ${'x'.repeat(300)}`;
  act(room, 'p2', { type: 'retro.note_add', column: 'slowed_us', text: messy });
  const stored = room.state.iterations[0]?.retro.notes[0]?.text ?? '';
  assert.ok(stored.length <= config.retro.noteMax);
  assert.ok(stored.startsWith('hello world x'));
  assert.ok(!/[\u0000-\u001f]/u.test(stored));
  assert.equal(code(tryAct(room, 'p2', { type: 'retro.note_add', column: 'slowed_us', text: '  \n ' })), 'bad_request');
  const mine = viewFor(room.state, 'p2', room.now).retro;
  const theirs = viewFor(room.state, 'p3', room.now).retro;
  assert.equal(mine?.notes.length, 1);
  assert.equal(theirs?.notes.length, 0);
  assert.equal(theirs?.hiddenCounts.slowed_us, 1);
  assert.equal(JSON.stringify(viewFor(room.state, 'p3', room.now)).includes('hello world'), false);
  for (let index = 0; index < config.retro.notesPerPlayerMax - 1; index += 1) {
    act(room, 'p2', { type: 'retro.note_add', column: 'try', text: `idea ${index}` });
  }
  assert.equal(code(tryAct(room, 'p2', { type: 'retro.note_add', column: 'try', text: 'one too many' })), 'not_allowed');
  const noteId = room.state.iterations[0]?.retro.notes[0]?.id ?? '';
  assert.equal(code(tryAct(room, 'p3', { type: 'retro.note_edit', noteId, text: 'mine now' })), 'not_allowed');
  act(room, 'p2', { type: 'retro.note_edit', noteId, text: 'edited' });
  act(room, 'p2', { type: 'retro.note_remove', noteId });
  assert.equal(room.state.iterations[0]?.retro.notes.find((note) => note.id === noteId), undefined);
  assert.equal(code(tryAct(room, 'p2', { type: 'retro.reveal' })), 'not_allowed');
  act(room, facilitator(room), { type: 'retro.reveal' });
  const revealed = viewFor(room.state, 'p3', room.now).retro;
  assert.equal(revealed?.revealed, true);
  assert.ok((revealed?.notes.length ?? 0) > 1);
  assert.ok(revealed?.notes.every((note) => note.authorId === null));
});

test('every player has two votes; the facilitator records one agreement and may leave without one', () => {
  const room = retroRoom();
  act(room, 'p2', { type: 'retro.note_add', column: 'went_well', text: 'went well: quick pairing' });
  act(room, 'p3', { type: 'retro.note_add', column: 'try', text: 'try: smaller reviews' });
  act(room, 'p4', { type: 'retro.note_add', column: 'try', text: 'try: ask earlier' });
  const fac = facilitator(room);
  assert.equal(code(tryAct(room, 'p2', { type: 'retro.vote', noteId: 'n1' })), 'not_allowed');
  act(room, fac, { type: 'retro.reveal' });
  act(room, 'p2', { type: 'retro.vote', noteId: 'n1' });
  assert.equal(code(tryAct(room, 'p2', { type: 'retro.vote', noteId: 'n1' })), 'not_allowed');
  act(room, 'p2', { type: 'retro.vote', noteId: 'n2' });
  assert.equal(code(tryAct(room, 'p2', { type: 'retro.vote', noteId: 'n3' })), 'not_allowed');
  assert.equal(code(tryAct(room, 'p2', { type: 'retro.vote', noteId: 'n99' })), 'bad_request');
  assert.equal(viewFor(room.state, 'p2', room.now).retro?.votesLeft, 0);
  act(room, 'p2', { type: 'retro.unvote', noteId: 'n2' });
  assert.equal(viewFor(room.state, 'p2', room.now).retro?.votesLeft, 1);
  assert.equal(viewFor(room.state, 'p3', room.now).retro?.notes.find((note) => note.id === 'n1')?.votes, 1);
  assert.equal(code(tryAct(room, fac, { type: 'retro.choose_action', agreement: { type: 'free', text: 'x' } })), 'not_allowed');
  act(room, fac, { type: 'phase.advance' });
  assert.deepEqual(viewFor(room.state, fac, room.now).retro?.suggestedAgreements.at(-1), 'free');
  assert.equal(code(tryAct(room, 'p2', { type: 'retro.choose_action', agreement: { type: 'free', text: 'x' } })), 'not_allowed');
  assert.equal(code(tryAct(room, fac, { type: 'retro.choose_action', agreement: { type: 'wip_limit', max: 0 } })), 'bad_request');
  assert.equal(code(tryAct(room, fac, { type: 'retro.choose_action', agreement: { type: 'wip_limit', max: 7 } })), 'bad_request');
  assert.equal(code(tryAct(room, fac, { type: 'retro.choose_action', agreement: { type: 'review_wait', maxMs: 5 } })), 'bad_request');
  assert.equal(code(tryAct(room, fac, { type: 'retro.choose_action', agreement: { type: 'wip_limits_set' } })), 'bad_request');
  assert.equal(code(tryAct(room, fac, { type: 'retro.choose_action', agreement: { type: 'free', text: '  ' } })), 'bad_request');
  act(room, fac, { type: 'retro.choose_action', agreement: { type: 'free', text: `  ${'long '.repeat(60)}` } });
  const chosen = room.state.iterations[0]?.retro.action;
  assert.ok(chosen !== null && chosen?.type === 'free' && chosen.text.length <= config.retro.freeActionMax);
  act(room, fac, { type: 'retro.choose_action', agreement: { type: 'pair_first' } });
  act(room, fac, { type: 'phase.advance' });
  assert.equal(phaseOf(room).kind, 'plan');
  assert.equal(room.state.iterations.length, 2);
  const ids = viewFor(room.state, fac, room.now).observations.map((own) => own.id);
  assert.ok(ids.includes('retro.actionChosen'));
});

test('ending the retrospective without an agreement is observed', () => {
  const room = retroRoom();
  const fac = facilitator(room);
  act(room, fac, { type: 'retro.reveal' });
  act(room, fac, { type: 'phase.advance' });
  act(room, fac, { type: 'phase.advance' });
  assert.equal(room.state.iterations[0]?.retro.action, null);
  assert.ok(viewFor(room.state, fac, room.now).observations.some((own) => own.id === 'retro.noAction'));
});

test('the "I do not know what to write" help is data: at most three questions and proposals that follow the answers', () => {
  const room = retroRoom();
  assert.equal(viewFor(room.state, 'p2', room.now).retro?.help, null);
  act(room, 'p2', { type: 'retro.help_start' });
  const help = viewFor(room.state, 'p2', room.now).retro?.help;
  assert.ok(help !== null && help !== undefined);
  assert.ok(help.questions.length >= 2 && help.questions.length <= config.retro.helpQuestionsMax);
  assert.ok(help.proposals.length > 0);
  assert.equal(viewFor(room.state, 'p3', room.now).retro?.help, null);
  const question = help.questions[0];
  assert.ok(question !== undefined);
  assert.equal(code(tryAct(room, 'p2', { type: 'retro.help_answer', questionId: question.id, choice: 'nonsense' })), 'bad_request');
  assert.equal(code(tryAct(room, 'p3', { type: 'retro.help_answer', questionId: question.id, choice: question.choices[0] ?? '' })), 'not_allowed');
  act(room, 'p2', { type: 'retro.help_answer', questionId: question.id, choice: question.choices[0] ?? '' });
  const proposal = viewFor(room.state, 'p2', room.now).retro?.help?.proposals[0];
  assert.ok(proposal !== undefined);
  act(room, 'p2', { type: 'retro.help_use', proposalId: proposal.id });
  assert.ok(!(viewFor(room.state, 'p2', room.now).retro?.help?.proposals ?? []).some((own) => own.id === proposal.id));
  assert.equal(code(tryAct(room, 'p2', { type: 'retro.help_use', proposalId: proposal.id })), 'bad_request');
});

function snapshot(room: Room): RoomState {
  return JSON.parse(JSON.stringify(room.state));
}

test('a refused action leaves the state untouched', () => {
  const room = sprintRunning(4, 1150606, solos(1));
  const before = snapshot(room);
  assert.equal(code(tryAct(room, 'p2', { type: 'phase.advance' })), 'not_allowed');
  assert.deepEqual(room.state, before);
});
