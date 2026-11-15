import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { nextDeadline, viewFor } from '../machine/index.ts';
import {
  act,
  advanceTo,
  begin,
  facilitator,
  newRoom,
  pid,
  planCustom,
  playInspect,
  playPlanning,
  playRetro,
  playWork,
  defaultStyle,
  server,
  startedRoom,
  tryAct,
  wait,
} from './machine-support.ts';

function code(result: ReturnType<typeof tryAct>): string {
  return result.ok ? 'ok' : result.code;
}

test('the first player to join is the host and the seventh is refused', () => {
  const room = newRoom({ players: 6 });
  assert.equal(room.state.hostId, 'p1');
  const result = server(room, { type: 'server.join', playerId: 'p7', name: null, now: room.now });
  assert.deepEqual(result.ok ? 'ok' : result.code, 'room_full');
  const duplicate = server(room, { type: 'server.join', playerId: 'p2', name: null, now: room.now });
  assert.equal(duplicate.ok ? 'ok' : duplicate.code, 'bad_request');
});

test('names are cleaned, capped and optional; a team name can be re-drawn by the host only', () => {
  const room = newRoom({ players: 3 });
  act(room, 'p2', { type: 'lobby.set_name', name: '  Ana\u0000   Maria  with a very long surname indeed ' });
  const name = room.state.players[1]?.name ?? '';
  assert.ok(name.length <= config.players.nameMax);
  assert.ok(!/\s{2}/u.test(name) && !name.includes('\u0000'));
  act(room, 'p2', { type: 'lobby.set_name', name: '   ' });
  assert.equal(room.state.players[1]?.name, null);
  const before = room.state.teamName;
  assert.equal(code(tryAct(room, 'p2', { type: 'lobby.new_team_name' })), 'not_allowed');
  act(room, 'p1', { type: 'lobby.new_team_name' });
  assert.notEqual(room.state.teamName, before);
  assert.match(room.state.teamName, /^[a-z]+-[a-z]+$/u);
});

test('start needs the host and three connected players', () => {
  const room = newRoom({ players: 3 });
  assert.equal(code(tryAct(room, 'p2', { type: 'lobby.start' })), 'not_allowed');
  server(room, { type: 'server.disconnected', playerId: 'p3', now: room.now });
  assert.equal(code(tryAct(room, 'p1', { type: 'lobby.start' })), 'not_allowed');
  server(room, { type: 'server.connected', playerId: 'p3', now: room.now });
  act(room, 'p1', { type: 'lobby.start' });
  assert.equal(room.state.phase.kind, 'plan');
  assert.equal(code(tryAct(room, 'p1', { type: 'lobby.start' })), 'already_started');
  const late = server(room, { type: 'server.join', playerId: 'p9', name: null, now: room.now });
  assert.equal(late.ok ? 'ok' : late.code, 'already_started');
});

test('a Kanban room sits in the lobby and refuses to start for now', () => {
  const room = newRoom({ framework: 'kanban', players: 3 });
  assert.equal(code(tryAct(room, 'p1', { type: 'lobby.start' })), 'not_allowed');
  assert.deepEqual(viewFor(room.state, 'p1', room.now).controls, []);
  assert.equal(room.state.phase.kind, 'lobby');
});

test('a volunteer facilitates the first iteration and the role passes on in the second', () => {
  const room = newRoom({ players: 4 });
  act(room, 'p3', { type: 'lobby.volunteer', volunteer: true });
  assert.equal(room.state.facilitatorId, 'p3');
  act(room, 'p1', { type: 'lobby.start' });
  assert.equal(room.state.facilitatorId, 'p3');
  playPlanning(room, defaultStyle);
  playWork(room, defaultStyle);
  playInspect(room);
  playRetro(room, defaultStyle);
  assert.equal(room.state.facilitatorId, 'p4');
  assert.equal(room.state.iterations[0]?.facilitatorId, 'p3');
  assert.equal(room.state.iterations[1]?.facilitatorId, 'p4');
  const view = viewFor(room.state, 'p4', room.now);
  assert.equal(view.players.find((player) => player.id === 'p4')?.role, 'facilitator');
});

test('rotation skips a player who is away', () => {
  const room = startedRoom(4, 91919, false);
  playPlanning(room, defaultStyle);
  playWork(room, defaultStyle);
  playInspect(room);
  server(room, { type: 'server.disconnected', playerId: 'p2', now: room.now });
  playRetro(room, defaultStyle);
  assert.equal(room.state.iterations[1]?.facilitatorId, 'p3');
});

test('the card of every phase must be begun by the facilitator, and its timebox starts then', () => {
  const room = startedRoom(3, 5050505);
  const fac = facilitator(room);
  const other = room.state.players.find((player) => player.id !== fac)?.id ?? 'p2';
  assert.equal(code(tryAct(room, other, { type: 'phase.begin' })), 'not_allowed');
  const phase = room.state.phase;
  assert.ok(phase.kind === 'plan');
  assert.equal(phase.timebox.startedAt, null);
  assert.equal(phase.step, 'card');
  wait(room, 5000);
  act(room, fac, { type: 'phase.begin' });
  assert.ok(room.state.phase.kind === 'plan');
  assert.equal(room.state.phase.timebox.startedAt, room.now);
  assert.equal(room.state.phase.timebox.deadline, room.now + config.timeboxMs.plan[0]);
  assert.equal(room.state.phase.timebox.hard, false);
  assert.equal(code(tryAct(room, fac, { type: 'phase.begin' })), 'not_allowed');
});

test('goal votes pick the Sprint Goal and the facilitator confirms it', () => {
  const room = startedRoom(4, 6060606);
  begin(room);
  const options = room.state.iterations[0]?.goalOptions ?? [];
  assert.equal(options.length, 2);
  assert.equal(code(tryAct(room, 'p1', { type: 'plan.goal_confirm' })), 'not_allowed');
  act(room, 'p2', { type: 'plan.goal_vote', theme: options[1] ?? 'payments' });
  act(room, 'p3', { type: 'plan.goal_vote', theme: options[1] ?? 'payments' });
  act(room, 'p4', { type: 'plan.goal_vote', theme: options[0] ?? 'payments' });
  const view = viewFor(room.state, 'p2', room.now);
  assert.equal(view.planning?.myGoalVote, options[1]);
  assert.equal(view.planning?.goalVotes[options[1] ?? 'payments'], 2);
  assert.equal(code(tryAct(room, 'p2', { type: 'plan.goal_confirm' })), 'not_allowed');
  act(room, 'p1', { type: 'plan.goal_confirm' });
  assert.equal(room.state.iterations[0]?.goal, options[1]);
  assert.equal(room.state.phase.kind === 'plan' ? room.state.phase.step : '', 'estimate');
});

test('planning poker hides votes until all have voted or the facilitator reveals, allows one re-vote', () => {
  const room = startedRoom(4, 7070707);
  begin(room);
  for (const id of ['p1', 'p2', 'p3', 'p4']) act(room, id, { type: 'plan.goal_vote', theme: room.state.iterations[0]?.goalOptions[0] ?? 'payments' });
  act(room, 'p1', { type: 'plan.goal_confirm' });
  const first = room.state.iterations[0]?.poker?.itemId ?? '';
  assert.equal(first, room.state.items[0]?.id);
  act(room, 'p2', { type: 'plan.poker_vote', card: 13 });
  act(room, 'p3', { type: 'plan.poker_vote', card: 1 });
  const hidden = viewFor(room.state, 'p4', room.now).planning?.poker;
  assert.deepEqual(hidden?.voted.sort(), ['p2', 'p3']);
  assert.equal(hidden?.votes, null);
  assert.equal(hidden?.myVote, null);
  assert.equal(code(tryAct(room, 'p2', { type: 'plan.poker_reveal' })), 'not_allowed');
  act(room, 'p4', { type: 'plan.poker_vote', card: 5 });
  assert.equal(viewFor(room.state, 'p4', room.now).planning?.poker?.revealed, false);
  act(room, 'p1', { type: 'plan.poker_vote', card: 3 });
  const shown = viewFor(room.state, 'p4', room.now).planning?.poker;
  assert.equal(shown?.revealed, true);
  assert.equal(shown?.votes?.p2, 13);
  assert.equal(shown?.median, 5);
  assert.equal(code(tryAct(room, 'p2', { type: 'plan.poker_vote', card: 2 })), 'not_allowed');
  act(room, 'p1', { type: 'plan.poker_revote' });
  assert.equal(code(tryAct(room, 'p1', { type: 'plan.poker_revote' })), 'not_allowed');
  assert.equal(room.state.iterations[0]?.poker?.revealed, false);
  act(room, 'p2', { type: 'plan.poker_vote', card: 3 });
  act(room, 'p1', { type: 'plan.poker_reveal' });
  assert.equal(viewFor(room.state, 'p3', room.now).planning?.poker?.revealed, true);
  assert.equal(viewFor(room.state, 'p3', room.now).planning?.poker?.revotesLeft, 0);
  assert.equal(code(tryAct(room, 'p1', { type: 'plan.poker_record', estimate: 2 })), 'ok');
  assert.equal(room.state.items[0]?.estimate, 2);
  assert.notEqual(room.state.iterations[0]?.poker?.itemId, first);
});

test('the default estimate is the median and estimation can be stopped', () => {
  const room = startedRoom(4, 7171717);
  begin(room);
  for (const id of ['p1', 'p2', 'p3', 'p4']) act(room, id, { type: 'plan.goal_vote', theme: room.state.iterations[0]?.goalOptions[0] ?? 'payments' });
  act(room, 'p1', { type: 'plan.goal_confirm' });
  [1, 3, 8, 13].forEach((card, index) => act(room, pid(index), { type: 'plan.poker_vote', card: card as 1 }));
  act(room, 'p1', { type: 'plan.poker_record', estimate: null });
  assert.equal(room.state.items[0]?.estimate, 8);
  act(room, 'p1', { type: 'plan.poker_vote', card: 2 });
  assert.equal(code(tryAct(room, 'p1', { type: 'plan.poker_record', estimate: null })), 'not_allowed');
  act(room, 'p1', { type: 'plan.poker_reveal' });
  assert.equal(code(tryAct(room, 'p1', { type: 'plan.poker_record', estimate: 4 as 1 })), 'bad_request');
  act(room, 'p1', { type: 'plan.estimation_stop' });
  assert.equal(room.state.phase.kind === 'plan' ? room.state.phase.step : '', 'commit');
  assert.equal(room.state.iterations[0]?.estimationStopped, true);
});

test('commitment shows the sum of estimates and Sprint 2 shows the velocity of Sprint 1', () => {
  const room = startedRoom(4, 7272727);
  playPlanning(room, defaultStyle);
  const committed = room.state.items.filter((item) => item.status === 'todo');
  const total = committed.reduce((sum, item) => sum + (item.estimate ?? 0), 0);
  assert.ok(total > 0);
  assert.equal(room.state.iterations[0]?.signals.committedEstimate, total);
  playWork(room, defaultStyle);
  playInspect(room);
  playRetro(room, defaultStyle);
  const velocity = room.state.iterations[0]?.metrics?.velocity ?? -1;
  assert.ok(velocity > 0);
  begin(room);
  assert.equal(viewFor(room.state, 'p1', room.now).planning?.previousVelocity, velocity);
  assert.equal(viewFor(room.state, 'p1', room.now).iteration, 2);
});

test('items can be pulled and unpulled only during the commitment', () => {
  const room = startedRoom(3, 7373737);
  begin(room);
  assert.equal(code(tryAct(room, 'p1', { type: 'plan.pull', itemId: '#1' })), 'not_allowed');
  act(room, 'p1', { type: 'plan.goal_vote', theme: room.state.iterations[0]?.goalOptions[0] ?? 'payments' });
  act(room, 'p1', { type: 'plan.goal_confirm' });
  act(room, 'p1', { type: 'plan.estimation_stop' });
  assert.equal(code(tryAct(room, 'p2', { type: 'plan.pull', itemId: '#99' })), 'bad_request');
  act(room, 'p2', { type: 'plan.pull', itemId: '#1' });
  assert.equal(room.state.items.find((item) => item.id === '#1')?.status, 'todo');
  assert.equal(code(tryAct(room, 'p2', { type: 'plan.pull', itemId: '#1' })), 'not_allowed');
  act(room, 'p3', { type: 'plan.unpull', itemId: '#1' });
  assert.equal(code(tryAct(room, 'p1', { type: 'phase.advance' })), 'not_allowed');
  act(room, 'p3', { type: 'plan.pull', itemId: '#2' });
  act(room, 'p1', { type: 'phase.advance' });
  assert.equal(room.state.phase.kind, 'work');
});

test('a soft timebox may be overrun and the overrun is recorded and observed', () => {
  const room = startedRoom(4, 7474747);
  playPlanning(room, { ...defaultStyle, slowPlanMs: config.timeboxMs.plan[0] + 90_000 });
  const record = room.state.events[0];
  assert.equal(record?.kind, 'plan');
  assert.ok((record?.overrunMs ?? 0) >= 90_000);
  const ids = viewFor(room.state, 'p1', room.now).observations.map((own) => own.id);
  assert.ok(ids.includes('plan.overtime'));
  assert.ok(ids.length <= 2);
  assert.equal(room.state.phase.kind, 'work');
});

test('observations keep a positive and a watch-out one when both exist, at most two', () => {
  const room = startedRoom(4, 7575757);
  playPlanning(room, defaultStyle);
  const view = viewFor(room.state, 'p1', room.now);
  assert.ok(view.observations.length <= 2);
  assert.ok(view.observations.some((own) => own.positive));
});

test('a disconnected player keeps their seat, items are released after the delay, roles pass on', () => {
  const room = startedRoom(4, 7676767);
  planCustom(room, (backlog) => backlog.filter((item) => item.workersNeeded === 1).slice(0, 2).map((item) => item.id));
  begin(room);
  const mine = room.state.items.find((item) => item.status === 'todo');
  assert.ok(mine !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: mine.id });
  act(room, 'p1', { type: 'item.open', itemId: mine.id, mode: 'work' });
  wait(room, 10_000);
  const away = room.now;
  server(room, { type: 'server.disconnected', playerId: 'p1', now: away });
  assert.equal(nextDeadline(room.state), away + config.room.reconnectGraceMs);
  advanceTo(room, away + config.room.reconnectGraceMs - 1);
  assert.equal(room.state.items.find((item) => item.id === mine.id)?.status, 'doing');
  advanceTo(room, away + config.room.reconnectGraceMs);
  const released = room.state.items.find((item) => item.id === mine.id);
  assert.equal(released?.status, 'todo');
  assert.deepEqual(released?.workers, []);
  assert.equal(room.state.players[0]?.open, null);
  assert.equal(room.state.hostId, 'p2');
  assert.equal(room.state.facilitatorId, 'p2');
  assert.equal(room.state.iterations[0]?.facilitatorId, 'p2');
  server(room, { type: 'server.connected', playerId: 'p1', now: room.now });
  assert.equal(room.state.players[0]?.connected, true);
  assert.equal(room.state.players[0]?.seat, 1);
  const view = viewFor(room.state, 'p1', room.now);
  assert.equal(view.selfId, 'p1');
  assert.equal(view.players.find((player) => player.id === 'p2')?.isHost, true);
});

test('in the lobby an absent player gives up the seat and the host passes on', () => {
  const room = newRoom({ players: 3 });
  server(room, { type: 'server.disconnected', playerId: 'p1', now: room.now });
  advanceTo(room, room.now + config.room.reconnectGraceMs);
  assert.equal(room.state.players.length, 2);
  assert.equal(room.state.hostId, 'p2');
  const joined = server(room, { type: 'server.join', playerId: 'p8', name: null, now: room.now });
  assert.ok(joined.ok);
  assert.equal(room.state.players.length, 3);
});

test('the room records when nobody is connected', () => {
  const room = newRoom({ players: 3 });
  assert.equal(room.state.emptySince, null);
  for (const id of ['p1', 'p2', 'p3']) server(room, { type: 'server.disconnected', playerId: id, now: room.now });
  assert.equal(room.state.emptySince, room.now);
  server(room, { type: 'server.connected', playerId: 'p2', now: room.now + 5 });
  assert.equal(room.state.emptySince, null);
});

test('the configuration is coherent with the rules of the machine', () => {
  const composition = config.feedback.composition;
  assert.equal(composition.S + composition.M + composition.L, config.feedback.newItems);
});

test('controls tell each player what they may do right now', () => {
  const room = newRoom({ players: 3 });
  assert.deepEqual(viewFor(room.state, 'p1', room.now).controls, ['start_game']);
  assert.deepEqual(viewFor(room.state, 'p2', room.now).controls, []);
  act(room, 'p1', { type: 'lobby.start' });
  assert.deepEqual(viewFor(room.state, 'p1', room.now).controls, ['begin_phase']);
  assert.deepEqual(viewFor(room.state, 'p2', room.now).controls, []);
  begin(room);
  assert.deepEqual(viewFor(room.state, 'p1', room.now).controls, []);
  act(room, 'p2', { type: 'plan.goal_vote', theme: room.state.iterations[0]?.goalOptions[0] ?? 'payments' });
  assert.deepEqual(viewFor(room.state, 'p1', room.now).controls, ['confirm_goal']);
  act(room, 'p1', { type: 'plan.goal_confirm' });
  assert.deepEqual(viewFor(room.state, 'p1', room.now).controls, ['stop_estimation']);
  act(room, 'p2', { type: 'plan.poker_vote', card: 3 });
  assert.deepEqual(viewFor(room.state, 'p1', room.now).controls, ['poker_reveal', 'stop_estimation']);
  act(room, 'p1', { type: 'plan.poker_reveal' });
  assert.deepEqual(viewFor(room.state, 'p1', room.now).controls, ['poker_revote', 'poker_record', 'stop_estimation']);
  act(room, 'p1', { type: 'plan.estimation_stop' });
  assert.deepEqual(viewFor(room.state, 'p1', room.now).controls, []);
  act(room, 'p2', { type: 'plan.pull', itemId: '#1' });
  assert.deepEqual(viewFor(room.state, 'p1', room.now).controls, ['advance']);
  assert.deepEqual(viewFor(room.state, 'p1', room.now).script, { event: 'plan', step: 'commit', index: 4, total: 4 });
  assert.equal(viewFor(room.state, 'p2', room.now).script, null);
});
