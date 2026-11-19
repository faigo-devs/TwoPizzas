import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../../core/index.ts';
import { FakeSocket, Harness } from './support.ts';

function sweepLogs(h: Harness): number {
  return h.logs.filter((log) => log.event === 'sockets_swept').length;
}

test('a timed-out socket that stays listed does not re-arm the alarm in a loop', async () => {
  const h = new Harness();
  await h.create();
  const idle = await h.connect();
  const keeper = await h.join('Ana');
  h.advance(config.room.helloTimeoutMs);
  const writes = h.storage.alarmWrites;
  for (let round = 0; round < 25; round += 1) {
    await h.fireAlarmAlive();
  }
  assert.equal(idle.closed?.code, 4003);
  assert.equal(sweepLogs(h), 1);
  assert.ok(h.storage.alarmWrites - writes < 30);
  assert.ok((h.storage.alarm ?? 0) >= h.clock + 1000);
  assert.equal(keeper.closed, null);
});

test('a silent seat whose socket stays listed after close is swept once and does not loop', async () => {
  const h = new Harness();
  await h.create();
  const quiet = await h.join('Ana');
  const other = await h.join('Bob');
  h.advance(config.room.silenceMs);
  other.autoResponseAt = h.clock;
  await h.fireAlarm();
  assert.equal(quiet.closed?.code, 4002);
  for (let round = 0; round < 25; round += 1) {
    await h.fireAlarmAlive();
  }
  assert.equal(sweepLogs(h), 1);
  assert.equal(h.state().players.length, 1);
});

test('the alarm is never armed less than a second ahead', async () => {
  const h = new Harness();
  await h.create();
  await h.connect();
  h.advance(config.room.helloTimeoutMs + 5000);
  await h.handler.alarm();
  await h.join('Ana');
  assert.ok((h.storage.alarm ?? 0) >= h.clock + 1000);
});

test('a socket that reports not open is ignored for the alarm and the capacity', async () => {
  const h = new Harness();
  await h.create();
  const stale = await h.connect();
  stale.closed = { code: 1006, reason: '' };
  stale.reportsOpenAfterClose = false;
  const before = h.storage.alarm;
  await h.join('Ana');
  assert.notEqual(h.storage.alarm, stale.attachment === null ? 0 : stale.attachment.acceptedAt + config.room.helloTimeoutMs);
  assert.ok(before !== null);
});

test('a closing socket gets no broadcast and its messages are ignored', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join('Ana');
  const second = await h.join('Bob');
  const { playerId, token } = first.welcome();
  const again = await h.connect();
  await h.send(again, { t: 'hello', playerId, token });
  assert.equal(first.closed?.code, 4000);
  first.sent.length = 0;
  await h.act(second, { type: 'lobby.volunteer', volunteer: true });
  assert.equal(first.sent.length, 0);
  const puts = h.storage.puts.length;
  await h.send(first, { t: 'do', action: { type: 'lobby.volunteer', volunteer: false } });
  assert.equal(h.storage.puts.length, puts);
  h.complete(first);
});

test('an attacker holding the idle cap cannot keep a new player or a returning player out', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  const returning = await h.join('Bob');
  const { playerId, token } = returning.welcome();
  const attack: FakeSocket[] = [];
  const refill = async (): Promise<void> => {
    for (let index = 0; index < config.room.unjoinedSocketsMax; index += 1) {
      attack.push(await h.connect());
      h.advance(5);
    }
  };
  await refill();
  const fresh = await h.join('Cleo');
  assert.equal(fresh.errors().includes('room_full'), false);
  assert.equal(h.state().players.length, 3);
  await h.drop(returning);
  await refill();
  const back = await h.connect();
  await h.send(back, { t: 'hello', playerId, token });
  assert.equal(back.errors().length, 0);
  assert.equal(h.state().players.find((own) => own.id === playerId)?.connected, true);
  assert.equal(host.closed, null);
  assert.ok(attack.filter((own) => own.closed !== null).length > 0);
});

test('the host locks the room: a newcomer is refused with room_locked, seats still reconnect, unlocking lets joins through', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  const bob = await h.join('Bob');
  const { playerId, token } = bob.welcome();
  await h.act(bob, { type: 'lobby.lock', locked: true });
  assert.deepEqual(bob.errors().slice(-1), ['not_allowed']);
  assert.equal(h.state().locked, false);
  await h.act(host, { type: 'lobby.lock', locked: true });
  assert.equal(h.state().locked, true);
  assert.equal(bob.views().at(-1)?.locked, true);
  assert.ok(host.views().at(-1)?.controls.includes('unlock_room'));
  const stranger = await h.join('Eve');
  assert.deepEqual(stranger.errors(), ['room_locked']);
  assert.equal(h.state().players.length, 2);
  await h.drop(bob);
  const back = await h.connect();
  await h.send(back, { t: 'hello', playerId, token });
  assert.equal(back.errors().length, 0);
  await h.act(host, { type: 'lobby.lock', locked: false });
  const welcome = await h.join('Eve');
  assert.deepEqual(welcome.errors(), []);
  assert.equal(h.state().players.length, 3);
});

test('a kick is a removal, not a ban, and a locked room refuses the removed player coming back as new', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  const bob = await h.join('Bob');
  await h.act(host, { type: 'lobby.kick', targetId: bob.welcome().playerId });
  const again = await h.join('Bob');
  assert.deepEqual(again.errors(), []);
  await h.act(host, { type: 'lobby.kick', targetId: again.welcome().playerId });
  await h.act(host, { type: 'lobby.lock', locked: true });
  const third = await h.join('Bob');
  assert.deepEqual(third.errors(), ['room_locked']);
});
