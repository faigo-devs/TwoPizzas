import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import type { ClientAction, ErrorCode } from '../types.ts';
import {
  act,
  begin,
  defaultStyle,
  finishSprint,
  newRoom,
  playGame,
  playPlanning,
  playInspect,
  playWork,
  sprintRunning,
  startedRoom,
  tryAct,
  wait,
  type Room,
} from './machine-support.ts';

const Samples: ClientAction[] = [
  { type: 'lobby.set_name', name: 'Ana' },
  { type: 'lobby.volunteer', volunteer: true },
  { type: 'lobby.new_team_name' },
  { type: 'lobby.start' },
  { type: 'phase.begin' },
  { type: 'phase.advance' },
  { type: 'plan.goal_vote', theme: 'payments' },
  { type: 'plan.goal_confirm' },
  { type: 'plan.poker_vote', card: 5 },
  { type: 'plan.poker_reveal' },
  { type: 'plan.poker_revote' },
  { type: 'plan.poker_record', estimate: null },
  { type: 'plan.estimation_stop' },
  { type: 'plan.pull', itemId: '#1' },
  { type: 'plan.unpull', itemId: '#1' },
  { type: 'plan.set_limits', inProgress: 2, review: 2 },
  { type: 'item.take', itemId: '#1' },
  { type: 'item.leave', itemId: '#1' },
  { type: 'item.open', itemId: '#1', mode: 'work' },
  { type: 'item.close' },
  { type: 'item.submit', itemId: '#1', response: { kind: 'incident', action: 'restart' } },
  { type: 'item.take_review', itemId: '#1' },
  { type: 'item.verdict', itemId: '#1', verdict: 'lgtm' },
  { type: 'help.promise', itemId: '#1' },
  { type: 'help.withdraw', itemId: '#1' },
  { type: 'daily.end' },
  { type: 'inspect.reveal' },
  { type: 'retro.note_add', column: 'try', text: 'something' },
  { type: 'retro.note_edit', noteId: 'n1', text: 'else' },
  { type: 'retro.note_remove', noteId: 'n1' },
  { type: 'retro.reveal' },
  { type: 'retro.vote', noteId: 'n1' },
  { type: 'retro.unvote', noteId: 'n1' },
  { type: 'retro.choose_action', agreement: { type: 'free', text: 'agree' } },
  { type: 'retro.help_start' },
  { type: 'retro.help_answer', questionId: 'wait', choice: 'review' },
  { type: 'retro.help_use', proposalId: 'went_well.value' },
  { type: 'summary.publish' },
];

function copy(room: Room): Room {
  return { ...room, state: JSON.parse(JSON.stringify(room.state)), phases: [...room.phases], checks: false };
}

const Contexts: Record<string, () => Room> = {
  lobby: () => newRoom({ players: 3 }),
  planCard: () => startedRoom(4, 2010101, false),
  planGoal: () => {
    const room = startedRoom(4, 2020202, false);
    begin(room);
    return room;
  },
  planEstimate: () => {
    const room = startedRoom(4, 2030303, false);
    begin(room);
    for (const id of ['p1', 'p2']) act(room, id, { type: 'plan.goal_vote', theme: room.state.iterations[0]?.goalOptions[0] ?? 'payments' });
    act(room, 'p1', { type: 'plan.goal_confirm' });
    act(room, 'p2', { type: 'plan.poker_vote', card: 3 });
    return room;
  },
  planCommit: () => {
    const room = startedRoom(4, 2040404, false);
    begin(room);
    act(room, 'p1', { type: 'plan.goal_vote', theme: room.state.iterations[0]?.goalOptions[0] ?? 'payments' });
    act(room, 'p1', { type: 'plan.goal_confirm' });
    act(room, 'p1', { type: 'plan.estimation_stop' });
    act(room, 'p2', { type: 'plan.pull', itemId: '#1' });
    return room;
  },
  workCard: () => {
    const room = startedRoom(4, 2050505, false);
    playPlanning(room, defaultStyle);
    return room;
  },
  workRunning: () => sprintRunning(4, 2060606, (backlog) => backlog.slice(0, 3).map((own) => own.id), false),
  dailyWalk: () => {
    const room = sprintRunning(4, 2070707, (backlog) => backlog.slice(0, 3).map((own) => own.id), false);
    wait(room, config.timeboxMs.workHalf);
    begin(room);
    return room;
  },
  inspectIncrement: () => {
    const room = sprintRunning(4, 2080808, (backlog) => backlog.slice(0, 3).map((own) => own.id), false);
    finishSprint(room);
    begin(room);
    return room;
  },
  retroNotes: () => {
    const room = startedRoom(4, 2090909, false);
    playPlanning(room, defaultStyle);
    playWork(room, defaultStyle);
    playInspect(room);
    begin(room);
    act(room, 'p2', { type: 'retro.note_add', column: 'try', text: 'something to try' });
    return room;
  },
  summary: () => playGame({ players: 3, seed: 2100101, checks: false }),
};

const SixCodes: ErrorCode[] = ['room_not_found', 'room_full', 'already_started', 'not_allowed', 'bad_request', 'rate_limited'];

test('every action type in every phase either succeeds or is refused with a protocol code, never touching the state when refused', () => {
  const contexts = Contexts;
  const seen = new Set<string>();
  for (const [name, build] of Object.entries(contexts)) {
    const base = build();
    for (const sample of Samples) {
      seen.add(sample.type);
      for (const who of [base.state.facilitatorId ?? 'p1', 'p9', base.state.players.find((own) => own.id !== base.state.facilitatorId)?.id ?? 'p2']) {
        const room = copy(base);
        const result = tryAct(room, who, sample);
        if (!result.ok) assert.ok(SixCodes.includes(result.code), `${name}/${sample.type}`);
      }
    }
  }
  assert.equal(seen.size, 38);
});

interface Row {
  context: string;
  who: string;
  action: ClientAction;
  code: ErrorCode;
}

const Table: Row[] = [];

for (const sample of Samples) {
  const itemLike = sample.type.startsWith('item.') || sample.type.startsWith('help.');
  const code: ErrorCode = sample.type === 'lobby.start' ? 'already_started' : 'not_allowed';
  Table.push({ context: itemLike ? 'planCard' : 'workRunning', who: 'p2', action: sample, code });
}

Table.push(
  { context: 'planCard', who: 'p2', action: { type: 'phase.begin' }, code: 'not_allowed' },
  { context: 'planGoal', who: 'p2', action: { type: 'plan.goal_confirm' }, code: 'not_allowed' },
  { context: 'planGoal', who: 'p1', action: { type: 'plan.goal_confirm' }, code: 'not_allowed' },
  { context: 'planEstimate', who: 'p2', action: { type: 'plan.poker_reveal' }, code: 'not_allowed' },
  { context: 'planEstimate', who: 'p2', action: { type: 'plan.estimation_stop' }, code: 'not_allowed' },
  { context: 'planEstimate', who: 'p1', action: { type: 'plan.poker_record', estimate: 5 }, code: 'not_allowed' },
  { context: 'planEstimate', who: 'p2', action: { type: 'plan.pull', itemId: '#1' }, code: 'not_allowed' },
  { context: 'planCommit', who: 'p2', action: { type: 'phase.advance' }, code: 'not_allowed' },
  { context: 'planCommit', who: 'p2', action: { type: 'plan.pull', itemId: '#99' }, code: 'bad_request' },
  { context: 'planCommit', who: 'p2', action: { type: 'plan.pull', itemId: '#1' }, code: 'not_allowed' },
  { context: 'planCommit', who: 'p1', action: { type: 'plan.set_limits', inProgress: 2, review: 2 }, code: 'not_allowed' },
  { context: 'workRunning', who: 'p2', action: { type: 'item.take', itemId: '#99' }, code: 'bad_request' },
  { context: 'workRunning', who: 'p2', action: { type: 'work.end_early' }, code: 'not_allowed' },
  { context: 'workRunning', who: 'p2', action: { type: 'item.close' }, code: 'not_allowed' },
  { context: 'workRunning', who: 'p2', action: { type: 'item.leave', itemId: '#1' }, code: 'not_allowed' },
  { context: 'workRunning', who: 'p2', action: { type: 'item.verdict', itemId: '#1', verdict: 'lgtm' }, code: 'not_allowed' },
  { context: 'workRunning', who: 'p2', action: { type: 'help.promise', itemId: '#1' }, code: 'not_allowed' },
  { context: 'workRunning', who: 'p1', action: { type: 'phase.advance' }, code: 'not_allowed' },
  { context: 'workRunning', who: 'p1', action: { type: 'phase.begin' }, code: 'not_allowed' },
  { context: 'workRunning', who: 'p1', action: { type: 'daily.end' }, code: 'not_allowed' },
  { context: 'workRunning', who: 'p1', action: { type: 'lobby.set_name', name: 'x' }, code: 'not_allowed' },
  { context: 'dailyWalk', who: 'p2', action: { type: 'item.take', itemId: '#1' }, code: 'not_allowed' },
  { context: 'dailyWalk', who: 'p2', action: { type: 'item.open', itemId: '#1', mode: 'work' }, code: 'not_allowed' },
  { context: 'dailyWalk', who: 'p2', action: { type: 'item.close' }, code: 'not_allowed' },
  { context: 'dailyWalk', who: 'p2', action: { type: 'item.submit', itemId: '#1', response: { kind: 'incident', action: 'x' } }, code: 'not_allowed' },
  { context: 'dailyWalk', who: 'p2', action: { type: 'item.verdict', itemId: '#1', verdict: 'lgtm' }, code: 'not_allowed' },
  { context: 'dailyWalk', who: 'p1', action: { type: 'phase.advance' }, code: 'not_allowed' },
  { context: 'inspectIncrement', who: 'p2', action: { type: 'inspect.reveal' }, code: 'not_allowed' },
  { context: 'inspectIncrement', who: 'p2', action: { type: 'phase.advance' }, code: 'not_allowed' },
  { context: 'inspectIncrement', who: 'p2', action: { type: 'item.take', itemId: '#1' }, code: 'not_allowed' },
  { context: 'retroNotes', who: 'p2', action: { type: 'retro.reveal' }, code: 'not_allowed' },
  { context: 'retroNotes', who: 'p3', action: { type: 'retro.note_edit', noteId: 'n1', text: 'mine' }, code: 'not_allowed' },
  { context: 'retroNotes', who: 'p2', action: { type: 'retro.note_edit', noteId: 'n9', text: 'none' }, code: 'bad_request' },
  { context: 'retroNotes', who: 'p2', action: { type: 'retro.vote', noteId: 'n1' }, code: 'not_allowed' },
  { context: 'retroNotes', who: 'p1', action: { type: 'retro.choose_action', agreement: { type: 'free', text: 'x' } }, code: 'not_allowed' },
  { context: 'retroNotes', who: 'p1', action: { type: 'phase.advance' }, code: 'not_allowed' },
  { context: 'retroNotes', who: 'p2', action: { type: 'retro.help_answer', questionId: 'wait', choice: 'review' }, code: 'not_allowed' },
  { context: 'summary', who: 'p2', action: { type: 'summary.publish' }, code: 'not_allowed' },
  { context: 'summary', who: 'p1', action: { type: 'phase.advance' }, code: 'not_allowed' },
  { context: 'lobby', who: 'p2', action: { type: 'lobby.start' }, code: 'not_allowed' },
  { context: 'lobby', who: 'p1', action: { type: 'phase.begin' }, code: 'not_allowed' },
  { context: 'lobby', who: 'p9', action: { type: 'lobby.set_name', name: 'ghost' }, code: 'not_allowed' },
);

test('table of refusals by phase, step, role and state', () => {
  const contexts = Contexts;
  const cache = new Map<string, Room>();
  for (const row of Table) {
    const base = cache.get(row.context) ?? contexts[row.context]?.();
    assert.ok(base !== undefined, row.context);
    cache.set(row.context, base);
    const room = copy(base);
    const facilitatorId = room.state.facilitatorId;
    const who = row.who === 'p1' ? facilitatorId ?? 'p1' : row.who === 'p2' ? room.state.players.find((own) => own.id !== facilitatorId)?.id ?? 'p2' : row.who;
    const result = tryAct(room, who, row.action);
    assert.equal(result.ok ? 'ok' : result.code, row.code, `${row.context} / ${row.who} / ${row.action.type}`);
  }
  assert.ok(Table.length >= 80);
});

