import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../../core/index.ts';
import { Harness, toPlanning, toSprint, toSummary } from './support.ts';

test('create makes a lobby room once', async () => {
  const h = new Harness();
  assert.equal(await h.create('kanban'), true);
  assert.equal(await h.create('kanban'), false);
  const state = h.state();
  assert.equal(state.framework, 'kanban');
  assert.equal(state.phase.kind, 'lobby');
  assert.equal(state.players.length, 0);
});

test('an unknown room refuses a socket with room_not_found', async () => {
  const h = new Harness();
  const socket = await h.connect();
  assert.deepEqual(socket.errors(), ['room_not_found']);
  assert.notEqual(socket.closed, null);
});

test('hello seats a new player and answers welcome then view', async () => {
  const h = new Harness();
  await h.create();
  const socket = await h.join('Ana');
  const kinds = socket.messages().map((message) => message.t);
  assert.deepEqual(kinds, ['welcome', 'view']);
  const { playerId, token } = socket.welcome();
  assert.ok(playerId.length > 0 && token.length >= 24);
  assert.equal(socket.views()[0]?.selfId, playerId);
  assert.equal(h.state().hostId, playerId);
  assert.ok(!JSON.stringify(socket.views()[0]).includes(token));
});

test('three players play real actions through to the start of the Sprint', async () => {
  const h = new Harness();
  const players = await toSprint(h);
  const state = h.state();
  assert.equal(state.phase.kind, 'work');
  assert.equal(state.phase.kind === 'work' ? state.phase.step : '', 'running');
  assert.equal(state.items.filter((own) => own.status === 'todo').length, 3);
  for (const player of players) {
    const latest = player.views().at(-1);
    assert.equal(latest?.phase.kind, 'work');
    assert.equal(latest?.selfId, player.welcome().playerId);
  }
});

test('views are never sent to the wrong player and hold no seed or token', async () => {
  const h = new Harness();
  const players = await toSprint(h);
  const seed = String(h.state().seed);
  const tokens = Object.values(h.storage.data.get('tokens') as Record<string, string>);
  for (const player of players) {
    const own = player.welcome().playerId;
    for (const view of player.views()) assert.equal(view.selfId, own);
    const text = player.sent.join('');
    assert.ok(!text.includes(`"seed":${seed}`));
    for (const token of tokens) {
      if (token !== player.welcome().token) assert.ok(!text.includes(token));
    }
  }
});

test('a view is skipped for a player whose view did not change', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join('Ana');
  const second = await h.join('Bob');
  second.clear();
  first.clear();
  await h.act(first, { type: 'lobby.set_name', name: 'Ana' });
  assert.equal(first.views().length, 0);
  assert.equal(second.views().length, 0);
  await h.act(second, { type: 'lobby.volunteer', volunteer: true });
  assert.equal(first.views().length, 1);
  assert.equal(second.views().length, 1);
});

test('a refused action answers an error and nobody else hears of it', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join();
  const second = await h.join();
  first.clear();
  second.clear();
  await h.act(second, { type: 'lobby.start' });
  assert.deepEqual(second.errors(), ['not_allowed']);
  assert.deepEqual(first.errors(), []);
  assert.equal(h.state().phase.kind, 'lobby');
});

test('reconnect with the right token returns the seat and replaces the old socket', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join('Ana');
  await h.join('Bob');
  const { playerId, token } = first.welcome();
  await h.drop(first);
  assert.equal(h.state().players.find((player) => player.id === playerId)?.connected, false);
  const again = await h.connect();
  await h.send(again, { t: 'hello', playerId, token });
  assert.equal(again.welcome().playerId, playerId);
  assert.equal(again.views().at(-1)?.selfId, playerId);
  assert.equal(h.state().players.find((player) => player.id === playerId)?.connected, true);
  assert.equal(h.state().players.length, 2);
});

test('reconnect while the old socket is still open closes the old one without a disconnect', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join('Ana');
  const { playerId, token } = first.welcome();
  const again = await h.connect();
  await h.send(again, { t: 'hello', playerId, token });
  assert.equal(first.closed?.code, 4000);
  await h.handler.onClose(first);
  assert.equal(h.state().players[0]?.connected, true);
});

test('a wrong token is refused and the seat stays away', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join('Ana');
  const { playerId } = first.welcome();
  await h.drop(first);
  const intruder = await h.connect();
  await h.send(intruder, { t: 'hello', playerId, token: 'not-the-token' });
  assert.deepEqual(intruder.errors(), ['not_allowed']);
  assert.notEqual(intruder.closed, null);
  assert.equal(h.state().players[0]?.connected, false);
});

test('an id without a token and a token without an id are refused', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join('Ana');
  const a = await h.connect();
  await h.send(a, { t: 'hello', playerId: first.welcome().playerId });
  assert.deepEqual(a.errors(), ['not_allowed']);
  const b = await h.connect();
  await h.send(b, { t: 'hello', token: 'abc' });
  assert.deepEqual(b.errors(), ['bad_request']);
});

test('the seventh player gets room_full', async () => {
  const h = new Harness();
  await h.create();
  for (let index = 0; index < config.players.max; index += 1) await h.join();
  const extra = await h.join();
  assert.deepEqual(extra.errors(), ['room_full']);
  assert.notEqual(extra.closed, null);
  assert.equal(h.state().players.length, config.players.max);
});

test('joining after the start gets already_started, a returning player still gets in', async () => {
  const h = new Harness();
  const players = await toPlanning(h);
  const late = await h.join('Dan');
  assert.deepEqual(late.errors(), ['already_started']);
  const first = players[0];
  assert.ok(first !== undefined);
  const { playerId, token } = first.welcome();
  await h.drop(first);
  const back = await h.connect();
  await h.send(back, { t: 'hello', playerId, token });
  assert.equal(back.welcome().playerId, playerId);
  assert.equal(back.views().at(-1)?.phase.kind, 'plan');
});

test('malformed, oversized and server-typed messages are refused', async () => {
  const h = new Harness();
  await h.create();
  const socket = await h.join();
  socket.clear();
  await h.send(socket, 'not json');
  await h.send(socket, JSON.stringify({ t: 'do', action: { type: 'server.deadline', now: 1 } }));
  await h.send(socket, JSON.stringify({ t: 'hello', name: 'x'.repeat(5000) }));
  await h.send(socket, JSON.stringify({ t: 'do', action: { type: 'lobby.set_name', name: 'a', extra: 1 } }));
  await h.handler.onMessage(socket, new ArrayBuffer(4));
  assert.deepEqual(socket.errors(), ['bad_request', 'bad_request', 'bad_request', 'bad_request', 'bad_request']);
  assert.equal(h.state().phase.kind, 'lobby');
});

test('hello twice on one socket and a do before hello are refused', async () => {
  const h = new Harness();
  await h.create();
  const socket = await h.join();
  socket.clear();
  await h.send(socket, { t: 'hello' });
  assert.deepEqual(socket.errors(), ['bad_request']);
  const stranger = await h.connect();
  await h.act(stranger, { type: 'lobby.start' });
  assert.deepEqual(stranger.errors(), ['not_allowed']);
});

test('twenty messages per five seconds per connection, then rate_limited, then the window resets', async () => {
  const h = new Harness();
  await h.create();
  const socket = await h.join();
  socket.clear();
  const limit = config.room.messagesPerWindow;
  for (let index = 0; index < limit - 1; index += 1) {
    await h.act(socket, { type: 'lobby.set_name', name: `n${index}` });
  }
  assert.deepEqual(socket.errors(), []);
  await h.act(socket, { type: 'lobby.set_name', name: 'over' });
  assert.deepEqual(socket.errors(), ['rate_limited']);
  assert.notEqual(h.state().players[0]?.name, 'over');
  h.advance(config.room.messageWindowMs);
  socket.clear();
  await h.act(socket, { type: 'lobby.set_name', name: 'again' });
  assert.deepEqual(socket.errors(), []);
  assert.equal(h.state().players[0]?.name, 'again');
});

test('the limit survives hibernation because it lives in the socket attachment', async () => {
  const h = new Harness();
  await h.create();
  const socket = await h.join();
  for (let index = 0; index < config.room.messagesPerWindow - 2; index += 1) {
    await h.act(socket, { type: 'lobby.set_name', name: 'a' });
  }
  h.hibernate();
  socket.clear();
  await h.act(socket, { type: 'lobby.set_name', name: 'b' });
  await h.act(socket, { type: 'lobby.set_name', name: 'c' });
  assert.deepEqual(socket.errors(), ['rate_limited']);
});

test('a state written before hibernation is read back by a fresh handler', async () => {
  const h = new Harness();
  const players = await toPlanning(h);
  h.hibernate();
  const host = players[0];
  assert.ok(host !== undefined);
  host.clear();
  await h.act(host, { type: 'plan.goal_vote', theme: 'payments' });
  assert.equal(host.errors().length, 0);
  assert.equal(h.state().players.length, 3);
});

test('a wake-up marks players without a live socket as disconnected', async () => {
  const h = new Harness();
  await h.create();
  const first = await h.join();
  await h.join();
  first.closed = { code: 1006, reason: '' };
  h.hibernate();
  const third = await h.connect();
  assert.notEqual(third, undefined);
  await h.handler.alarm();
  const players = h.state().players;
  assert.equal(players[0]?.connected, false);
  assert.equal(players[1]?.connected, true);
});

test('publishing the result sends one entry to the leaderboard, once', async () => {
  const h = new Harness();
  const sockets = await toSummary(h);
  const state = h.state();
  const facilitator = sockets.get(state.facilitatorId ?? '');
  assert.ok(facilitator !== undefined);
  await h.act(facilitator, { type: 'summary.publish' });
  await h.act(facilitator, { type: 'summary.publish' });
  assert.equal(h.leaderboard.submissions.length, 1);
  const submitted = h.leaderboard.submissions[0];
  assert.equal(submitted?.entry.framework, 'scrum');
  assert.equal(submitted?.entry.players, 3);
  assert.ok(!JSON.stringify(submitted).includes(state.code));
  assert.deepEqual(facilitator.errors(), ['not_allowed']);
  const view = facilitator.views().at(-1);
  assert.equal(view?.summary?.published, true);
});

test('only the facilitator can publish', async () => {
  const h = new Harness();
  const sockets = await toSummary(h);
  const other = [...sockets.entries()].find(([id]) => id !== h.state().facilitatorId)?.[1];
  assert.ok(other !== undefined);
  await h.act(other, { type: 'summary.publish' });
  assert.deepEqual(other.errors(), ['not_allowed']);
  assert.equal(h.leaderboard.submissions.length, 0);
});

test('a failed publish is retried by the alarm and then cleared', async () => {
  const h = new Harness();
  const sockets = await toSummary(h);
  const facilitator = sockets.get(h.state().facilitatorId ?? '');
  assert.ok(facilitator !== undefined);
  h.leaderboard.failing = true;
  await h.act(facilitator, { type: 'summary.publish' });
  assert.equal(h.leaderboard.submissions.length, 0);
  assert.ok(h.logs.some((log) => log.event === 'publish' && log.fields.ok === false));
  h.leaderboard.failing = false;
  await h.fireAlarm();
  assert.equal(h.leaderboard.submissions.length, 1);
  const meta = h.storage.data.get('meta') as { outbox: unknown };
  assert.equal(meta.outbox, null);
});
