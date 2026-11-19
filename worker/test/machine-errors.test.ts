import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StateVersion, config } from '../../core/index.ts';
import type { RoomState } from '../../core/index.ts';
import { Harness, toSprint } from './support.ts';
import type { FakeSocket } from './support.ts';

async function corrupted(): Promise<{ h: Harness; players: FakeSocket[]; ids: string[]; before: string }> {
  const h = new Harness();
  const players = await toSprint(h);
  const ids = players.map((player) => player.welcome().playerId);
  const stored = h.storage.data.get('state') as RoomState;
  stored.iterations = [];
  const before = JSON.stringify(stored);
  h.hibernate();
  for (const player of players) player.clear();
  return { h, players, ids, before };
}

test('a machine exception answers the player bad_request, logs machine_error and keeps the stored state', async () => {
  const { h, players, ids, before } = await corrupted();
  const first = players[0] as FakeSocket;
  const stored = h.storage.state() as RoomState;
  h.clock = (stored.phase as { timebox: { deadline: number } }).timebox.deadline + 1000;
  await h.act(first, { type: 'work.end_early' });
  assert.deepEqual(first.errors(), ['bad_request']);
  assert.equal(JSON.stringify(h.storage.state()), before);
  const logged = h.logs.filter((entry) => entry.event === 'machine_error');
  assert.ok(logged.length > 0);
  const text = JSON.stringify(logged);
  for (const id of ids) assert.ok(!text.includes(id));
  assert.equal(first.closed, null);
});

test('an alarm over a corrupt state does not throw, and backs off to the next time that needs no machine', async () => {
  const { h } = await corrupted();
  const stored = h.storage.state() as RoomState;
  h.clock = (stored.phase as { timebox: { deadline: number } }).timebox.deadline + 1000;
  for (let round = 0; round < 4; round += 1) {
    h.pingAll();
    await h.handler.alarm();
    const alarm = h.storage.alarm;
    assert.notEqual(alarm, null);
    assert.ok((alarm ?? 0) >= h.clock + 60_000, 'the alarm must not spin');
    h.clock = alarm ?? h.clock;
  }
  assert.equal(h.logs.filter((entry) => entry.event === 'machine_error').length >= 4, true);
});

test('a corrupt room still ends by its lifetime', async () => {
  const { h, players } = await corrupted();
  const state = h.storage.state() as RoomState;
  h.clock = state.createdAt + config.room.lifetimeMs;
  await h.handler.alarm();
  assert.equal(h.storage.state(), undefined);
  for (const player of players) assert.equal(player.closed?.code, 1001);
});

test('D-089: a state stored under an old version ends the room the way an expired one ends', async () => {
  const h = new Harness();
  const players = await toSprint(h);
  const stored = h.storage.data.get('state') as RoomState;
  stored.version = StateVersion - 1;
  h.hibernate();
  for (const player of players) player.clear();
  await h.act(players[0] as FakeSocket, { type: 'item.close' });
  assert.equal(h.storage.state(), undefined);
  assert.equal(h.storage.alarm, null);
  assert.deepEqual(players[0]?.errors(), []);
  for (const player of players) assert.equal(player.closed?.code, 1001);
  const logged = h.logs.find((entry) => entry.event === 'state_outdated');
  assert.deepEqual(logged?.fields, { stored: StateVersion - 1, current: StateVersion });
  const later = await h.connect();
  assert.equal(later.closed?.code, 1008);
  assert.deepEqual(later.errors(), ['room_not_found']);
});

test('D-089: a state without a numeric version is treated as outdated', async () => {
  const h = new Harness();
  await h.create();
  const stored = h.storage.data.get('state') as unknown as Record<string, unknown>;
  delete stored.version;
  h.hibernate();
  const first = await h.connect();
  assert.notEqual(first.closed, null);
  assert.equal(h.storage.state(), undefined);
  const second = await h.connect();
  assert.deepEqual(second.errors(), ['room_not_found']);
});

test('a state of the current version is kept', async () => {
  const h = new Harness();
  await h.create();
  h.hibernate();
  const socket = await h.join('Ana');
  assert.equal(socket.errors().length, 0);
  assert.equal(h.state().version, StateVersion);
});
