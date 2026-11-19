import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../../core/index.ts';
import type { LeaderboardResponse } from '../../core/index.ts';
import { BoardCache } from '../src/cache.ts';
import type { EdgeStore, Stamped } from '../src/cache.ts';
import { handleRequest, parseOrigins } from '../src/http.ts';
import type { HttpDeps } from '../src/ports.ts';
import { FakeSocket, Harness, seededRandom } from './support.ts';

const Origin = 'https://game.example';

test('a room gets a 256-bit secret and an independent name seed, and neither reaches a socket', async () => {
  const h = new Harness();
  await h.create();
  const state = h.state();
  assert.match(state.secret, /^[0-9a-f]{64}$/);
  assert.ok(Number.isInteger(state.nameSeed) && state.nameSeed >= 0 && state.nameSeed < 2 ** 32);
  assert.ok(!state.secret.includes(String(state.nameSeed)));
  const socket = await h.join('Ana');
  assert.ok(!socket.sent.join('').includes(state.secret));
  const other = new Harness();
  other.random = seededRandom(999);
  await other.create();
  assert.notEqual(other.state().secret, state.secret);
});

test('a socket without hello is closed after ten seconds and the alarm is set for it', async () => {
  const h = new Harness();
  await h.create();
  const idle = await h.connect();
  assert.equal(h.storage.alarm, h.clock + config.room.helloTimeoutMs);
  h.advance(config.room.helloTimeoutMs - 1);
  await h.handler.alarm();
  assert.equal(idle.closed === null, true);
  await h.fireAlarm();
  assert.equal((idle as { closed: { code: number } | null }).closed?.code, 4003);
});

test('a socket that says hello in time is kept', async () => {
  const h = new Harness();
  await h.create();
  const player = await h.join('Ana');
  h.advance(config.room.helloTimeoutMs + 1);
  await h.handler.alarm();
  assert.equal(player.closed, null);
});

test('idle sockets do not use up seats, and a full cap closes the oldest instead of refusing', async () => {
  const h = new Harness();
  await h.create();
  const idles: FakeSocket[] = [];
  for (let index = 0; index < config.room.unjoinedSocketsMax; index += 1) {
    const idle = await h.connect();
    assert.equal(idle.closed === null, true);
    idles.push(idle);
    h.advance(10);
  }
  const newcomer = await h.connect();
  assert.deepEqual(newcomer.errors(), []);
  assert.equal(newcomer.closed, null);
  assert.equal(idles[0]?.closed?.code, 4003);
  h.advance(config.room.helloTimeoutMs);
  await h.handler.alarm();
  const seated: string[] = [];
  for (let index = 0; index < config.players.max; index += 1) {
    const player = await h.join(`P${index}`);
    seated.push(player.welcome().playerId);
  }
  assert.equal(h.state().players.length, config.players.max);
  const seventh = await h.join('late');
  assert.deepEqual(seventh.errors(), ['room_full']);
});

test('six players with idle sockets around them still all get a seat', async () => {
  const h = new Harness();
  await h.create();
  for (let index = 0; index < 4; index += 1) await h.connect();
  for (let index = 0; index < config.players.max; index += 1) await h.join(`P${index}`);
  assert.equal(h.state().players.length, config.players.max);
});

test('the host removes a player: the seat is gone, the socket gets removed and a close code, the token stops working', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  const bob = await h.join('Bob');
  const cleo = await h.join('Cleo');
  const removed = bob.welcome();
  host.clear();
  cleo.clear();
  await h.act(host, { type: 'lobby.kick', targetId: removed.playerId });
  assert.ok(bob.errors().includes('removed'));
  assert.equal(bob.closed?.code, 4001);
  assert.equal(h.state().players.length, 2);
  assert.ok(!h.state().players.some((own) => own.id === removed.playerId));
  const tokens = h.storage.data.get('tokenHashes') as Record<string, string>;
  assert.ok(!(removed.playerId in tokens));
  assert.equal(host.views().at(-1)?.players.length, 2);
  assert.equal(cleo.views().at(-1)?.players.length, 2);
  const again = await h.connect();
  await h.send(again, { t: 'hello', playerId: removed.playerId, token: removed.token });
  assert.deepEqual(again.errors(), ['not_allowed']);
});

test('only the host can remove, never oneself, and a refused removal writes nothing', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  const bob = await h.join('Bob');
  const hostId = host.welcome().playerId;
  const putsBefore = h.storage.puts.length;
  host.clear();
  await h.act(bob, { type: 'lobby.kick', targetId: hostId });
  assert.deepEqual(bob.errors().slice(-1), ['not_allowed']);
  await h.act(host, { type: 'lobby.kick', targetId: hostId });
  assert.deepEqual(host.errors(), ['not_allowed']);
  assert.equal(h.storage.puts.length, putsBefore);
  assert.equal(h.state().players.length, 2);
});

test('after the start nobody is removed and nobody new joins', async () => {
  const h = new Harness();
  await h.create();
  const players = [await h.join('Ana'), await h.join('Bob'), await h.join('Cleo')];
  const host = players[0];
  assert.ok(host !== undefined);
  await h.act(host, { type: 'lobby.start' });
  await h.act(host, { type: 'lobby.kick', targetId: players[1]?.welcome().playerId ?? '' });
  assert.deepEqual(host.errors().slice(-1), ['not_allowed']);
  assert.equal(h.state().players.length, 3);
  const late = await h.join('Dan');
  assert.deepEqual(late.errors(), ['already_started']);
  assert.equal(h.state().players.length, 3);
});

test('a refused message writes nothing, moves no alarm and sends nothing to others', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  const bob = await h.join('Bob');
  host.clear();
  const puts = h.storage.puts.length;
  const alarms = h.storage.alarmWrites;
  for (let index = 0; index < 5; index += 1) await h.act(bob, { type: 'lobby.start' });
  assert.equal(h.storage.puts.length, puts);
  assert.equal(h.storage.alarmWrites, alarms);
  assert.equal(host.sent.length, 0);
  assert.equal(bob.errors().filter((code) => code === 'not_allowed').length, 5);
});

test('a no-op message writes nothing and broadcasts nothing', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  const bob = await h.join('Bob');
  await h.act(host, { type: 'lobby.set_name', name: 'Ana' });
  host.clear();
  bob.clear();
  const puts = h.storage.puts.length;
  const alarms = h.storage.alarmWrites;
  h.advance(1000);
  await h.act(host, { type: 'lobby.set_name', name: 'Ana' });
  assert.equal(h.storage.puts.length, puts);
  assert.equal(h.storage.alarmWrites, alarms);
  assert.equal(host.sent.length, 0);
  assert.equal(bob.sent.length, 0);
});

test('a change is one multi-key put holding only what changed', async () => {
  const h = new Harness();
  await h.create();
  assert.deepEqual(h.storage.puts, [['state', 'tokenHashes', 'meta']]);
  const host = await h.join('Ana');
  assert.deepEqual(h.storage.puts.at(-1), ['state', 'tokenHashes']);
  await h.join('Bob');
  const before = h.storage.puts.length;
  await h.act(host, { type: 'lobby.volunteer', volunteer: true });
  assert.equal(h.storage.puts.length, before + 1);
  assert.deepEqual(h.storage.puts.at(-1), ['state']);
});

test('the alarm is written only when its time changes', async () => {
  const h = new Harness();
  await h.create();
  const host = await h.join('Ana');
  await h.join('Bob');
  const before = h.storage.alarmWrites;
  await h.act(host, { type: 'lobby.volunteer', volunteer: true });
  await h.act(host, { type: 'lobby.volunteer', volunteer: false });
  assert.equal(h.storage.alarmWrites, before);
});

test('ping is answered, never counted against the message limit, and writes nothing', async () => {
  const h = new Harness();
  await h.create();
  const player = await h.join('Ana');
  const puts = h.storage.puts.length;
  player.clear();
  for (let index = 0; index < config.room.messagesPerWindow * 5; index += 1) await h.send(player, 'ping');
  assert.equal(player.sent.length, config.room.messagesPerWindow * 5);
  assert.ok(player.sent.every((text) => text === 'pong'));
  assert.equal(h.storage.puts.length, puts);
  player.clear();
  await h.act(player, { type: 'lobby.set_name', name: 'Ana' });
  assert.deepEqual(player.errors(), []);
});

test('messages over the per-socket limit are dropped with rate_limited and the socket stays open', async () => {
  const h = new Harness();
  await h.create();
  const player = await h.join('Ana');
  player.clear();
  for (let index = 0; index < config.room.messagesPerWindow + 5; index += 1) {
    await h.act(player, { type: 'lobby.volunteer', volunteer: index % 2 === 0 });
  }
  assert.ok(player.errors().filter((code) => code === 'rate_limited').length >= 5);
  assert.equal(player.closed, null);
});

test('a seat whose socket has been silent for ninety seconds is marked away and the socket is closed', async () => {
  const h = new Harness();
  await h.create();
  const quiet = await h.join('Ana');
  const alive = await h.join('Bob');
  const quietId = quiet.welcome().playerId;
  h.advance(config.room.silenceMs - 1000);
  alive.autoResponseAt = h.clock;
  h.advance(1000);
  await h.fireAlarm();
  assert.equal(quiet.closed?.code, 4002);
  assert.equal(alive.closed, null);
  const seat = h.state().players.find((own) => own.id === quietId);
  assert.equal(seat?.connected, false);
  assert.equal(alive.views().at(-1)?.players.find((own) => own.id === quietId)?.connected, false);
});

test('a seat that keeps answering the automatic ping stays connected across alarms', async () => {
  const h = new Harness();
  await h.create();
  const player = await h.join('Ana');
  await h.join('Bob');
  for (let round = 0; round < 6; round += 1) {
    h.advance(config.room.pingIntervalMs);
    h.pingAll();
  }
  await h.fireAlarmAlive();
  assert.equal(player.closed, null);
  assert.equal(h.state().players.every((own) => own.connected), true);
});

test('a silent replaced socket does not mark the returning player away', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join('Ana');
  const { playerId, token } = first.welcome();
  const second = await h.connect();
  await h.send(second, { t: 'hello', playerId, token });
  assert.equal(first.closed?.code, 4000);
  h.advance(config.room.silenceMs + 1);
  second.autoResponseAt = h.clock;
  await h.fireAlarm();
  assert.equal(h.state().players[0]?.connected, true);
});

function board(label: string): LeaderboardResponse {
  return { month: { scrum: [], kanban: [] }, allTime: { scrum: [{ framework: 'scrum', teamName: label, players: 3, score: 1, escapedDefects: 0, averageCycleMs: null, date: '2026-11-15' }], kanban: [] } };
}

test('the leaderboard is loaded once a minute, concurrent misses share one load, and a failure is not cached', async () => {
  let clock = 1000;
  let loads = 0;
  const cache = new BoardCache(60_000, () => clock);
  const load = async (): Promise<LeaderboardResponse> => {
    loads += 1;
    return board(`n${loads}`);
  };
  const [one, two] = await Promise.all([cache.get(load), cache.get(load)]);
  assert.equal(loads, 1);
  assert.deepEqual(one, two);
  clock += 59_999;
  await cache.get(load);
  assert.equal(loads, 1);
  clock += 2;
  const next = await cache.get(load);
  assert.equal(loads, 2);
  assert.equal(next.allTime.scrum[0]?.teamName, 'n2');
  clock += 120_000;
  await assert.rejects(cache.get(async () => Promise.reject(new Error('down'))));
  assert.equal((await cache.get(load)).allTime.scrum[0]?.teamName, 'n3');
});

test('a fresh entry in the edge store is used, a stale or broken store is ignored, a load is written back', async () => {
  let clock = 100_000;
  const written: Stamped[] = [];
  let stored: Stamped | null = { at: 90_000, body: board('edge') };
  const store: EdgeStore = {
    async read() {
      return stored;
    },
    async write(value) {
      written.push(value);
    },
  };
  let loads = 0;
  const load = async (): Promise<LeaderboardResponse> => {
    loads += 1;
    return board('own');
  };
  const first = new BoardCache(60_000, () => clock);
  assert.equal((await first.get(load, store)).allTime.scrum[0]?.teamName, 'edge');
  assert.equal(loads, 0);
  stored = { at: 1000, body: board('old') };
  const second = new BoardCache(60_000, () => clock);
  assert.equal((await second.get(load, store)).allTime.scrum[0]?.teamName, 'own');
  assert.equal(written.length, 1);
  const broken: EdgeStore = {
    async read() {
      throw new Error('no cache');
    },
    async write() {
      throw new Error('no cache');
    },
  };
  clock += 1;
  const third = new BoardCache(60_000, () => clock);
  assert.equal((await third.get(load, broken)).allTime.scrum[0]?.teamName, 'own');
});

function deps(socketLimit = 60): { deps: HttpDeps; forwarded: string[]; socketKeys: string[] } {
  const forwarded: string[] = [];
  const socketKeys: string[] = [];
  let used = 0;
  const value: HttpDeps = {
    allowedOrigins: parseOrigins(Origin),
    limiter: { limit: async () => ({ success: true }) },
    socketLimiter: {
      async limit({ key }) {
        socketKeys.push(key);
        used += 1;
        return { success: used <= socketLimit };
      },
    },
    rooms: {
      create: async () => true,
      connect: async (code) => {
        forwarded.push(code);
        return new Response('forwarded');
      },
    },
    board: { top: async () => board('x') },
    random: seededRandom(3),
    log: () => undefined,
  };
  return { deps: value, forwarded, socketKeys };
}

function upgrade(code: string, address = '203.0.113.9'): Request {
  return new Request(`https://api.example/api/room/${code}/ws`, {
    headers: { upgrade: 'websocket', origin: Origin, 'cf-connecting-ip': address },
  });
}

test('WebSocket upgrades are rate-limited per address after the code check, and a malformed code costs nothing', async () => {
  const setup = deps(3);
  for (let index = 0; index < 3; index += 1) assert.equal((await handleRequest(upgrade('BCDFG'), setup.deps)).status, 200);
  const limited = await handleRequest(upgrade('BCDFG'), setup.deps);
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), { code: 'rate_limited' });
  assert.equal(setup.forwarded.length, 3);
  const before = setup.socketKeys.length;
  assert.equal((await handleRequest(upgrade('AAAAA'), setup.deps)).status, 404);
  assert.equal(setup.socketKeys.length, before);
  assert.ok(setup.socketKeys.every((key) => key === '203.0.113.9'));
});

test('an upgrade from a refused origin is not counted and not forwarded', async () => {
  const setup = deps();
  const request = new Request('https://api.example/api/room/BCDFG/ws', {
    headers: { upgrade: 'websocket', origin: 'https://other.example' },
  });
  assert.equal((await handleRequest(request, setup.deps)).status, 403);
  assert.equal(setup.socketKeys.length, 0);
});

test('a room creation with a declared or streamed body over the limit is refused before it is read in full', async () => {
  const setup = deps();
  const declared = new Request('https://api.example/api/room', {
    method: 'POST',
    headers: { origin: Origin, 'content-length': '5000', 'content-type': 'application/json' },
    body: JSON.stringify({ framework: 'scrum' }),
  });
  assert.equal((await handleRequest(declared, setup.deps)).status, 400);
  const big = JSON.stringify({ framework: 'scrum', pad: 'x'.repeat(5000) });
  const streamed = new Request('https://api.example/api/room', {
    method: 'POST',
    headers: { origin: Origin },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(big));
        controller.close();
      },
    }),
    duplex: 'half',
  } as RequestInit);
  assert.equal((await handleRequest(streamed, setup.deps)).status, 400);
  const fine = new Request('https://api.example/api/room', {
    method: 'POST',
    headers: { origin: Origin },
    body: JSON.stringify({ framework: 'scrum' }),
  });
  assert.equal((await handleRequest(fine, setup.deps)).status, 200);
});

test('an empty list of allowed origins lets no browser origin through', async () => {
  const setup = deps();
  setup.deps.allowedOrigins = parseOrigins('');
  assert.deepEqual(setup.deps.allowedOrigins, []);
  const create = new Request('https://api.example/api/room', {
    method: 'POST',
    headers: { origin: 'http://localhost:4321' },
    body: JSON.stringify({ framework: 'scrum' }),
  });
  assert.equal((await handleRequest(create, setup.deps)).status, 403);
  const socket = new Request('https://api.example/api/room/BCDFG/ws', {
    headers: { upgrade: 'websocket', origin: 'http://localhost:4321' },
  });
  assert.equal((await handleRequest(socket, setup.deps)).status, 403);
});
