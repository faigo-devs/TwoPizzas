import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config, offeredProtocols, parseProtocols } from '../../core/index.ts';
import { FakeSocket, Harness } from './support.ts';

async function zombies(h: Harness, count: number): Promise<void> {
  let made = 0;
  while (made < count) {
    for (let index = 0; index < config.room.unjoinedSocketsMax && made < count; index += 1) {
      await h.connect();
      made += 1;
    }
    h.advance(config.room.helloTimeoutMs);
    h.pingAll();
    await h.handler.alarm();
  }
}

function listed(h: Harness): number {
  return h.sockets.filter((own) => !own.finished).length;
}

test('the offered protocols are the fixed name and, with a seat, one entry in token characters', () => {
  assert.deepEqual(offeredProtocols(null), ['lgtm.v1']);
  const offered = offeredProtocols({ playerId: 'aB3_-xyz', token: 'T0ken_-9' });
  assert.deepEqual(offered, ['lgtm.v1', 'seat.aB3_-xyz.T0ken_-9']);
  for (const name of offered) assert.match(name, /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/);
  assert.deepEqual(parseProtocols(offered.join(', ')), { game: true, seat: { playerId: 'aB3_-xyz', token: 'T0ken_-9' } });
  assert.deepEqual(parseProtocols(null), { game: false, seat: null });
  assert.deepEqual(parseProtocols('lgtm.v1'), { game: true, seat: null });
  assert.equal(parseProtocols('seat.a.b, other').game, false);
  assert.equal(parseProtocols('seat.a b.c').seat, null);
});

test('a seat proven at the upgrade is bound and welcomed at once, with only the fixed protocol selected', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join('Ana');
  const { playerId, token } = first.welcome();
  await h.join('Bob');
  const header = offeredProtocols({ playerId, token }).join(', ');
  const { socket, protocol } = await h.connectAs(header);
  assert.ok(socket !== null);
  assert.equal(protocol, 'lgtm.v1');
  assert.ok(!(protocol ?? '').includes(token));
  const welcome = socket.messages().find((message) => message.t === 'welcome');
  assert.ok(welcome !== undefined && welcome.t === 'welcome');
  assert.equal(welcome.playerId, playerId);
  assert.equal(welcome.token, undefined);
  assert.equal(first.closed?.code, 4000);
  assert.equal(socket.attachment?.playerId, playerId);
  await h.send(socket, { t: 'hello', playerId, token });
  assert.deepEqual(socket.errors(), []);
  assert.equal(socket.messages().filter((message) => message.t === 'welcome').length, 1);
});

test('D-061: a room whose list is full of closing sockets still takes a returning seat at once, and a stranger only below the backstop', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  const { playerId, token } = host.welcome();
  const count = config.room.socketsBackstopMax - 20;
  await zombies(h, count);
  const closing = h.sockets.filter((own) => own.closed !== null && !own.finished).length;
  assert.ok(closing >= Math.floor(count * 0.75));
  await h.drop(host);
  const header = offeredProtocols({ playerId, token }).join(', ');
  const back = await h.connectAs(header);
  assert.ok(back.socket !== null);
  assert.deepEqual(back.socket.errors(), []);
  assert.equal(h.state().players.find((own) => own.id === playerId)?.connected, true);
  const stranger = await h.connectAs(offeredProtocols(null).join(', '));
  assert.ok(stranger.socket !== null);
  assert.equal(stranger.refused, null);
});

test('D-062: at the backstop of 128 a stranger is refused before a socket exists and a seat is still admitted', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  const { playerId, token } = host.welcome();
  for (let index = 0; index < config.room.socketsBackstopMax; index += 1) {
    const socket = new FakeSocket();
    socket.attachment = { conn: `c${index}`, playerId: null, windowStart: 0, count: 0, acceptedAt: 0, heardAt: 0, closing: true };
    socket.closed = { code: 4003, reason: 'x' };
    h.sockets.push(socket);
  }
  const before = listed(h);
  const refused = await h.connectAs('lgtm.v1');
  assert.equal(refused.socket, null);
  assert.deepEqual(refused.refused, { status: 503, code: 'rate_limited' });
  assert.equal(listed(h), before);
  const wrong = await h.connectAs(`lgtm.v1, seat.${playerId}.${token}x`);
  assert.equal(wrong.socket, null);
  assert.equal(wrong.refused?.status, 503);
  const seat = await h.connectAs(`lgtm.v1, seat.${playerId}.${token}`);
  assert.ok(seat.socket !== null);
  assert.deepEqual(seat.socket.errors(), []);
  assert.ok(h.logs.some((log) => log.event === 'upgrade_refused'));
});

test('a wrong or unknown seat entry gets no exemption and no different answer, and hello with it is refused as before', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  const { playerId, token } = host.welcome();
  const wrongToken = await h.connectAs(`lgtm.v1, seat.${playerId}.${token}x`);
  const unknownId = await h.connectAs(`lgtm.v1, seat.nobody_here.${token}`);
  for (const attempt of [wrongToken, unknownId]) {
    assert.ok(attempt.socket !== null);
    assert.equal(attempt.protocol, 'lgtm.v1');
    assert.deepEqual(attempt.socket.messages(), []);
    assert.equal(attempt.socket.attachment?.playerId, null);
  }
  assert.equal(host.closed, null);
  await h.send(wrongToken.socket as FakeSocket, { t: 'hello', playerId, token: `${token}x` });
  await h.send(unknownId.socket as FakeSocket, { t: 'hello', playerId: 'nobody_here', token });
  assert.deepEqual((wrongToken.socket as FakeSocket).errors(), ['not_allowed']);
  assert.deepEqual((unknownId.socket as FakeSocket).errors(), ['not_allowed']);
});

test('a protocol list without the game name is refused, no list at all is a plain stranger, and nothing is logged from the header', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  const { playerId, token } = host.welcome();
  const foreign = await h.connectAs('chat, superchat');
  assert.deepEqual(foreign.refused, { status: 400, code: 'bad_request' });
  const bare = await h.connectAs(null);
  assert.ok(bare.socket !== null);
  assert.equal(bare.protocol, null);
  await h.connectAs(`lgtm.v1, seat.${playerId}.${token}`);
  await h.connectAs(`lgtm.v1, seat.${playerId}.${token}x`);
  const text = h.logText();
  assert.ok(!text.includes(token));
  assert.ok(!text.includes(playerId));
  assert.ok(!text.includes('seat.'));
});

test('a seat bound at the upgrade does not count against the joined cap and can come back while every other seat is full', async () => {
  const h = new Harness();
  await h.create();
  const players: FakeSocket[] = [];
  for (let index = 0; index < config.players.max; index += 1) players.push(await h.join(`P${index}`));
  const first = players[0] as FakeSocket;
  const { playerId, token } = first.welcome();
  for (let index = 0; index < config.players.max; index += 1) {
    const { socket } = await h.connectAs(offeredProtocols({ playerId, token }).join(', '));
    assert.ok(socket !== null);
    assert.deepEqual(socket.errors(), []);
  }
});
