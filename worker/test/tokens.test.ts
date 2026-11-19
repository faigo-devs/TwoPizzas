import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config, machine } from '../../core/index.ts';
import { sha256Hex } from '../../core/sha256.ts';
import { Harness, toSprint } from './support.ts';

test('the stored state holds only token hashes, never a token', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join('Ana');
  const second = await h.join('Bob');
  const tokens = [first.welcome().token, second.welcome().token];
  const dump = JSON.stringify([...h.storage.data.entries()]);
  for (const token of tokens) {
    assert.ok(token.length >= 32);
    assert.ok(!dump.includes(token));
    assert.ok(dump.includes(sha256Hex(token)));
  }
  assert.equal(h.storage.data.has('tokens'), false);
});

test('a returning seat is welcomed without the token being sent again, a wrong token is refused', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join('Ana');
  const { playerId, token } = first.welcome();
  const back = await h.connect();
  await h.send(back, { t: 'hello', playerId, token });
  const welcome = back.messages().find((message) => message.t === 'welcome');
  assert.ok(welcome !== undefined && welcome.t === 'welcome');
  assert.equal(welcome.playerId, playerId);
  assert.equal(welcome.token, undefined);
  assert.ok(!back.sent.join('').includes(token));
  const wrong = await h.connect();
  await h.send(wrong, { t: 'hello', playerId, token: `${token}x` });
  assert.deepEqual(wrong.errors(), ['not_allowed']);
  const empty = await h.connect();
  await h.send(empty, { t: 'hello', playerId, token: sha256Hex(token) });
  assert.deepEqual(empty.errors(), ['not_allowed']);
});

test('a kicked seat has no token hash left and the old token is useless', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  const bob = await h.join('Bob');
  const { playerId, token } = bob.welcome();
  await h.act(host, { type: 'lobby.kick', targetId: playerId });
  const hashes = h.storage.data.get('tokenHashes') as Record<string, string>;
  assert.ok(!(playerId in hashes));
  const again = await h.connect();
  await h.send(again, { t: 'hello', playerId, token });
  assert.deepEqual(again.errors(), ['not_allowed']);
});

test('a message on a closing socket returns before the rate limiter and any write', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join('Ana');
  const second = await h.join('Bob');
  const { playerId, token } = first.welcome();
  const again = await h.connect();
  await h.send(again, { t: 'hello', playerId, token });
  assert.equal(first.closed?.code, 4000);
  const before = first.attachment;
  const puts = h.storage.puts.length;
  second.clear();
  for (let index = 0; index < config.room.messagesPerWindow * 3; index += 1) {
    await h.send(first, { t: 'do', action: { type: 'lobby.volunteer', volunteer: true } });
  }
  assert.deepEqual(first.attachment, before);
  assert.equal(h.storage.puts.length, puts);
  assert.equal(second.sent.length, 0);
});

test('the one-second alarm floor leaves a farther alarm exact and never skips a deadline', async () => {
  const h = new Harness();
  const players = await toSprint(h);
  const deadline = machine.nextDeadline(h.state()) ?? 0;
  h.clock = deadline - 300;
  h.pingAll();
  await h.handler.alarm();
  assert.equal(h.storage.alarm, h.clock + 1000);
  h.clock = deadline + 10;
  h.pingAll();
  await h.act(players[0] ?? (await h.join()), { type: 'item.close' });
  assert.equal(h.state().phase.kind, 'daily');
  const farther = new Harness();
  await farther.create();
  await farther.join('Ana');
  assert.equal(farther.storage.alarm, farther.clock + config.room.silenceMs);
});
