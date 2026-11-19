import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { nextDeadline, viewFor } from '../machine/index.ts';
import { parseClientMessage } from '../wire.ts';
import { act, advanceTo, begin, newRoom, planCustom, server, startedRoom, tryAct, wait } from './machine-support.ts';
import type { Room } from './machine-support.ts';

const Minute = 60_000;

function soloSprint(): Room {
  const room = startedRoom(4, 7676767);
  planCustom(room, (backlog) => backlog.filter((item) => item.workersNeeded === 1).slice(0, 2).map((item) => item.id));
  begin(room);
  return room;
}

function pairSprint(): Room {
  const room = startedRoom(4, 7676767);
  planCustom(room, (backlog) => backlog.filter((item) => item.workersNeeded === 2).slice(0, 2).map((item) => item.id));
  begin(room);
  return room;
}

function pauseView(room: Room, viewer: string, target: string): number | null | undefined {
  return viewFor(room.state, viewer, room.now).players.find((own) => own.id === target)?.pausedUntil;
}

test('the pause values are in the config', () => {
  assert.deepEqual(config.pause, { minMinutes: 1, maxMinutes: 15, defaultMinutes: 5 });
});

test('the wire accepts integer minutes from 1 to 15 only', () => {
  const parse = (text: string) => parseClientMessage(text);
  assert.deepEqual(parse('{"t":"do","action":{"type":"player.pause","minutes":5}}'), { t: 'do', action: { type: 'player.pause', minutes: 5 } });
  assert.deepEqual(parse('{"t":"do","action":{"type":"player.pause","minutes":15}}'), { t: 'do', action: { type: 'player.pause', minutes: 15 } });
  assert.deepEqual(parse('{"t":"do","action":{"type":"player.resume"}}'), { t: 'do', action: { type: 'player.resume' } });
  for (const bad of ['0', '16', '2.5', '"5"', '-1', 'null', '1e2']) {
    assert.equal(parse(`{"t":"do","action":{"type":"player.pause","minutes":${bad}}}`), null, bad);
  }
  assert.equal(parse('{"t":"do","action":{"type":"player.pause"}}'), null);
  assert.equal(parse('{"t":"do","action":{"type":"player.pause","minutes":5,"x":1}}'), null);
  assert.equal(parse('{"t":"do","action":{"type":"player.resume","minutes":5}}'), null);
});

test('a pause is refused in the lobby and in the summary, and out-of-range minutes are refused by the reducer', () => {
  const lobby = newRoom({ players: 3 });
  const refused = tryAct(lobby, 'p2', { type: 'player.pause', minutes: 5 });
  assert.equal(refused.ok ? 'ok' : refused.code, 'not_allowed');
  assert.ok(!viewFor(lobby.state, 'p2', lobby.now).controls.includes('pause'));
  const room = soloSprint();
  for (const minutes of [0, 16, 2.5, Number.NaN]) {
    const result = tryAct(room, 'p2', { type: 'player.pause', minutes });
    assert.equal(result.ok ? 'ok' : result.code, 'bad_request');
  }
  assert.equal(room.state.players[1]?.pausedUntil, null);
  room.state.phase = { kind: 'summary' } as typeof room.state.phase;
  const late = tryAct(room, 'p2', { type: 'player.pause', minutes: 5 });
  assert.equal(late.ok ? 'ok' : late.code, 'not_allowed');
});

test('a pause shows to everyone as paused-until, with the pause and resume controls', () => {
  const room = soloSprint();
  assert.ok(viewFor(room.state, 'p2', room.now).controls.includes('pause'));
  assert.equal(pauseView(room, 'p1', 'p2'), null);
  act(room, 'p2', { type: 'player.pause', minutes: config.pause.defaultMinutes });
  const until = room.now + config.pause.defaultMinutes * Minute;
  assert.equal(pauseView(room, 'p1', 'p2'), until);
  assert.equal(pauseView(room, 'p2', 'p2'), until);
  assert.ok(viewFor(room.state, 'p2', room.now).controls.includes('resume'));
  assert.ok(!viewFor(room.state, 'p2', room.now).controls.includes('pause'));
  assert.ok(nextDeadline(room.state) !== null && (nextDeadline(room.state) ?? 0) <= until);
  act(room, 'p2', { type: 'player.resume' });
  assert.equal(pauseView(room, 'p1', 'p2'), null);
});

test('D-077: a paused worker keeps the item past the 60-second grace and loses it only after the pause plus the grace', () => {
  const room = soloSprint();
  const mine = room.state.items.find((item) => item.status === 'todo');
  assert.ok(mine !== undefined);
  act(room, 'p1', { type: 'item.take', itemId: mine.id });
  act(room, 'p1', { type: 'item.open', itemId: mine.id, mode: 'work' });
  wait(room, 10_000);
  act(room, 'p1', { type: 'player.pause', minutes: 5 });
  const until = room.now + 5 * Minute;
  server(room, { type: 'server.disconnected', playerId: 'p1', now: room.now });
  advanceTo(room, room.now + 3 * Minute);
  assert.equal(room.state.items.find((item) => item.id === mine.id)?.status, 'doing');
  assert.equal(room.state.hostId, 'p1');
  assert.equal(room.state.facilitatorId, 'p1');
  advanceTo(room, until + config.room.reconnectGraceMs - 1);
  assert.equal(room.state.items.find((item) => item.id === mine.id)?.status, 'doing');
  assert.equal(room.state.players[0]?.pausedUntil, null);
  advanceTo(room, until + config.room.reconnectGraceMs);
  const released = room.state.items.find((item) => item.id === mine.id);
  assert.equal(released?.status, 'todo');
  assert.deepEqual(released?.workers, []);
  assert.equal(room.state.hostId, 'p2');
  assert.equal(room.state.facilitatorId, 'p2');
});

test('a paused facilitator keeps the role while gone, and the role passes after the pause plus the grace', () => {
  const room = soloSprint();
  assert.equal(room.state.facilitatorId, 'p1');
  act(room, 'p1', { type: 'player.pause', minutes: 10 });
  const until = room.now + 10 * Minute;
  server(room, { type: 'server.disconnected', playerId: 'p1', now: room.now });
  advanceTo(room, room.now + 9 * Minute);
  assert.equal(room.state.facilitatorId, 'p1');
  advanceTo(room, until + config.room.reconnectGraceMs - 1);
  assert.equal(room.state.facilitatorId, 'p1');
  advanceTo(room, until + config.room.reconnectGraceMs);
  assert.notEqual(room.state.facilitatorId, 'p1');
});

test('a paused worker on a pair item keeps the pair reserved', () => {
  const room = pairSprint();
  const target = room.state.items.find((item) => item.status === 'todo' && item.workersNeeded === 2);
  assert.ok(target !== undefined);
  act(room, 'p2', { type: 'item.take', itemId: target.id });
  act(room, 'p3', { type: 'item.take', itemId: target.id });
  assert.deepEqual(room.state.items.find((item) => item.id === target.id)?.workers, ['p2', 'p3']);
  act(room, 'p3', { type: 'player.pause', minutes: 15 });
  server(room, { type: 'server.disconnected', playerId: 'p3', now: room.now });
  advanceTo(room, room.now + 10 * Minute);
  assert.deepEqual(room.state.items.find((item) => item.id === target.id)?.workers, ['p2', 'p3']);
  assert.equal(room.state.items.find((item) => item.id === target.id)?.status, 'doing');
});

test('a pause that runs out while the player is still gone starts the usual grace from that moment', () => {
  const room = soloSprint();
  const mine = room.state.items.find((item) => item.status === 'todo');
  assert.ok(mine !== undefined);
  act(room, 'p2', { type: 'item.take', itemId: mine.id });
  act(room, 'p2', { type: 'player.pause', minutes: 1 });
  const until = room.now + Minute;
  server(room, { type: 'server.disconnected', playerId: 'p2', now: room.now });
  advanceTo(room, until);
  assert.equal(room.state.players[1]?.pausedUntil, null);
  assert.equal(room.state.players[1]?.disconnectedAt, until);
  assert.equal(nextDeadline(room.state), until + config.room.reconnectGraceMs);
  assert.equal(pauseView(room, 'p1', 'p2'), null);
  advanceTo(room, until + config.room.reconnectGraceMs);
  assert.equal(room.state.items.find((item) => item.id === mine.id)?.status, 'todo');
});

test('a connected player whose pause runs out is simply back, with the others told', () => {
  const room = soloSprint();
  act(room, 'p2', { type: 'player.pause', minutes: 2 });
  advanceTo(room, room.now + 2 * Minute);
  assert.equal(pauseView(room, 'p1', 'p2'), null);
  assert.equal(room.state.players[1]?.connected, true);
});

test('coming back ends the pause: a reconnect, any action, or resume', () => {
  const room = soloSprint();
  act(room, 'p2', { type: 'player.pause', minutes: 5 });
  server(room, { type: 'server.disconnected', playerId: 'p2', now: room.now });
  server(room, { type: 'server.connected', playerId: 'p2', now: room.now });
  assert.equal(room.state.players[1]?.pausedUntil, null);
  act(room, 'p3', { type: 'player.pause', minutes: 5 });
  const free = room.state.items.find((item) => item.status === 'todo');
  assert.ok(free !== undefined);
  act(room, 'p3', { type: 'item.take', itemId: free.id });
  assert.equal(room.state.players[2]?.pausedUntil, null);
  act(room, 'p4', { type: 'player.pause', minutes: 5 });
  act(room, 'p4', { type: 'player.resume' });
  assert.equal(room.state.players[3]?.pausedUntil, null);
});

test('pausing again replaces the time, and a refused action does not end a pause', () => {
  const room = soloSprint();
  act(room, 'p2', { type: 'player.pause', minutes: 5 });
  wait(room, Minute);
  act(room, 'p2', { type: 'player.pause', minutes: 10 });
  assert.equal(room.state.players[1]?.pausedUntil, room.now + 10 * Minute);
  const before = room.state.players[1]?.pausedUntil;
  const refused = tryAct(room, 'p2', { type: 'player.pause', minutes: 99 });
  assert.equal(refused.ok, false);
  assert.equal(room.state.players[1]?.pausedUntil, before);
});
