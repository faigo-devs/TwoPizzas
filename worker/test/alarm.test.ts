import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config, machine } from '../../core/index.ts';
import { cleanupReason, nextAlarm } from '../src/room.ts';
import { Harness, toSprint } from './support.ts';

test('an empty new room wakes at the end of the grace', async () => {
  const h = new Harness();
  await h.create();
  const state = h.state();
  assert.equal(h.storage.alarm, state.createdAt + config.room.emptyGraceMs);
});

test('a room with players in the lobby wakes at its lifetime', async () => {
  const h = new Harness();
  await h.create();
  await h.join();
  const state = h.state();
  assert.equal(h.storage.alarm, state.createdAt + config.room.lifetimeMs);
});

test('during the Sprint the alarm sits at the next deadline of the machine', async () => {
  const h = new Harness();
  await toSprint(h);
  const state = h.state();
  const deadline = machine.nextDeadline(state);
  assert.notEqual(deadline, null);
  assert.equal(h.storage.alarm, deadline);
  assert.ok((h.storage.alarm ?? 0) < state.createdAt + config.room.lifetimeMs);
});

test('the alarm at the hard end moves the game on and tells everyone', async () => {
  const h = new Harness();
  const players = await toSprint(h);
  for (const player of players) player.clear();
  await h.fireAlarm();
  assert.equal(h.state().phase.kind, 'daily');
  for (const player of players) assert.equal(player.views().at(-1)?.phase.kind, 'daily');
});

test('an overdue deadline is processed before the next action', async () => {
  const h = new Harness();
  const players = await toSprint(h);
  const deadline = machine.nextDeadline(h.state()) ?? 0;
  h.clock = deadline + 500;
  const first = players[0];
  assert.ok(first !== undefined);
  await h.act(first, { type: 'item.close' });
  assert.equal(h.state().phase.kind, 'daily');
  assert.notEqual(h.storage.alarm, null);
});

test('the alarm is re-set after every change', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join();
  const before = h.storage.alarm;
  await h.drop(first);
  const after = h.storage.alarm;
  assert.equal(before, h.state().createdAt + config.room.lifetimeMs);
  assert.equal(after, machine.nextDeadline(h.state()));
  assert.equal(after, h.state().now + config.room.reconnectGraceMs);
});

test('everything is deleted when the last player has been gone for the grace', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join();
  const second = await h.join();
  await h.drop(first);
  h.advance(60_000);
  await h.drop(second);
  const gone = h.state().emptySince ?? 0;
  for (let guard = 0; guard < 5 && h.storage.state() !== undefined; guard += 1) await h.fireAlarm();
  assert.equal(h.clock, gone + config.room.emptyGraceMs);
  assert.equal(h.storage.state(), undefined);
  assert.equal(h.storage.data.size, 0);
  assert.equal(h.storage.alarm, null);
  assert.equal(h.storage.deletedAll >= 1, true);
  const late = await h.connect();
  assert.deepEqual(late.errors(), ['room_not_found']);
  assert.equal(await h.create('kanban'), true);
});

test('a player who comes back within the grace keeps the room alive', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join();
  const { playerId, token } = first.welcome();
  await h.drop(first);
  h.advance(30_000);
  const again = await h.connect();
  await h.send(again, { t: 'hello', playerId, token });
  assert.equal(h.state().emptySince, null);
  assert.equal(h.storage.alarm, h.state().createdAt + config.room.lifetimeMs);
  h.advance(config.room.emptyGraceMs);
  await h.handler.alarm();
  assert.notEqual(h.storage.state(), undefined);
});

test('the room is deleted at its lifetime even with players connected, and the sockets close', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join();
  const second = await h.join();
  const created = h.state().createdAt;
  await h.fireAlarm();
  assert.equal(h.clock, created + config.room.lifetimeMs);
  assert.equal(h.storage.state(), undefined);
  assert.equal(first.closed?.code, 1001);
  assert.equal(second.closed?.code, 1001);
  assert.ok(h.logs.some((log) => log.event === 'room_destroyed' && log.fields.reason === 'lifetime'));
});

test('the alarm of a room that no longer exists only clears storage', async () => {
  const h = new Harness();
  await h.handler.alarm();
  assert.equal(h.storage.deletedAll, 1);
});

test('cleanupReason and nextAlarm are pure functions of the state', async () => {
  const h = new Harness();
  await h.create();
  await h.join();
  const state = h.state();
  assert.equal(cleanupReason(state, state.createdAt + 1), null);
  assert.equal(cleanupReason(state, state.createdAt + config.room.lifetimeMs), 'lifetime');
  const empty = { ...state, emptySince: state.createdAt + 10 };
  assert.equal(cleanupReason(empty, empty.emptySince + config.room.emptyGraceMs), 'empty');
  assert.equal(nextAlarm(state, { at: state.createdAt + 5 }), state.createdAt + 5);
});
