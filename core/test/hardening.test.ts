import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRoom, viewFor } from '../machine/index.ts';
import { sanitize } from '../machine/util.ts';
import { generateTeamName } from '../names.ts';
import { parseClientMessage } from '../wire.ts';
import { act, newRoom, server, startedRoom, tryAct } from './machine-support.ts';
import { testSecret } from './support.ts';

function code(result: ReturnType<typeof tryAct>): string {
  return result.ok ? 'ok' : result.code;
}

function itemKeys(room: ReturnType<typeof newRoom>): unknown[] {
  return room.state.items.map((own) => [own.kind, own.size, own.value, own.subject, own.seed]);
}

test('two secrets with one name seed give the same team names but different items and answers', () => {
  const a = createRoom({ code: 'BCDFG', framework: 'scrum', secret: testSecret('a'), nameSeed: 4242, now: 1000 });
  const b = createRoom({ code: 'BCDFG', framework: 'scrum', secret: testSecret('b'), nameSeed: 4242, now: 1000 });
  assert.equal(a.teamName, b.teamName);
  assert.equal(a.teamName, generateTeamName(4242, 0));
  const first = newRoom({ seed: 1, nameSeed: 3_000_000_001, players: 3 });
  const second = newRoom({ seed: 2, nameSeed: 3_000_000_001, players: 3 });
  assert.equal(first.state.teamName, second.state.teamName);
  act(first, 'p1', { type: 'lobby.start' });
  act(second, 'p1', { type: 'lobby.start' });
  assert.notDeepEqual(itemKeys(first), itemKeys(second));
});

test('the same secret always gives the same game', () => {
  const run = (): unknown[] => {
    const room = newRoom({ seed: 77, players: 3 });
    act(room, 'p1', { type: 'lobby.start' });
    return itemKeys(room);
  };
  assert.deepEqual(run(), run());
});

test('no view of a started room holds the secret, the name seed or an item key, and the name seed does not reproduce the game', () => {
  const room = startedRoom(4, 31337, true);
  const joined = room.state.players.map((own) => JSON.stringify(viewFor(room.state, own.id, room.now))).join('\n');
  assert.ok(!joined.includes(room.state.secret));
  assert.ok(!joined.includes(String(room.state.nameSeed)));
  for (const own of room.state.items) assert.ok(!joined.includes(own.seed));
  const replica = newRoom({ seed: 424242, nameSeed: room.state.nameSeed, players: 4 });
  assert.equal(replica.state.teamName, room.state.teamName);
  act(replica, 'p1', { type: 'lobby.start' });
  const mine = new Set(room.state.items.map((own) => own.seed));
  assert.ok(replica.state.items.every((own) => !mine.has(own.seed)));
});

test('an item shows no workers needed before it is started and the number afterwards', () => {
  const room = startedRoom(4, 515151, true);
  assert.ok(room.state.items.length > 0);
  for (const player of room.state.players) {
    for (const own of viewFor(room.state, player.id, room.now).items) {
      if (own.status === 'backlog' || own.status === 'todo') {
        assert.equal(own.workersNeeded, null);
        assert.equal(own.blocked, false);
        assert.equal(own.waitingForPair, false);
      }
    }
  }
  const target = room.state.items[0];
  assert.ok(target !== undefined);
  target.status = 'doing';
  const seen = viewFor(room.state, room.state.players[0]?.id ?? 'p1', room.now).items.find((own) => own.id === target.id);
  assert.equal(seen?.workersNeeded, target.workersNeeded);
});

test('the host removes a player in the lobby; nobody else can, not oneself, not an unknown id', () => {
  const room = newRoom({ players: 4 });
  assert.equal(code(tryAct(room, 'p2', { type: 'lobby.kick', targetId: 'p3' })), 'not_allowed');
  assert.equal(code(tryAct(room, 'p1', { type: 'lobby.kick', targetId: 'p1' })), 'not_allowed');
  assert.equal(code(tryAct(room, 'p1', { type: 'lobby.kick', targetId: 'nobody' })), 'not_allowed');
  assert.equal(room.state.players.length, 4);
  act(room, 'p1', { type: 'lobby.kick', targetId: 'p3' });
  assert.deepEqual(
    room.state.players.map((own) => own.id),
    ['p1', 'p2', 'p4'],
  );
  assert.equal(room.state.hostId, 'p1');
  assert.ok(viewFor(room.state, 'p1', room.now).controls.includes('kick_player'));
  assert.ok(!viewFor(room.state, 'p2', room.now).controls.includes('kick_player'));
});

test('a removed seat can be filled again and the facilitator role follows the remaining players', () => {
  const room = newRoom({ players: 3 });
  act(room, 'p2', { type: 'lobby.volunteer', volunteer: true });
  assert.equal(room.state.facilitatorId, 'p2');
  act(room, 'p1', { type: 'lobby.kick', targetId: 'p2' });
  assert.equal(room.state.facilitatorId, 'p1');
  const joined = server(room, { type: 'server.join', playerId: 'p9', name: null, now: room.now });
  assert.equal(joined.ok, true);
});

test('nobody is removed once the game has started', () => {
  const room = newRoom({ players: 3 });
  act(room, 'p1', { type: 'lobby.start' });
  assert.equal(code(tryAct(room, 'p1', { type: 'lobby.kick', targetId: 'p2' })), 'not_allowed');
  assert.equal(room.state.players.length, 3);
});

test('the wire accepts a well-formed kick only', () => {
  assert.deepEqual(parseClientMessage('{"t":"do","action":{"type":"lobby.kick","targetId":"abc_1-2"}}'), {
    t: 'do',
    action: { type: 'lobby.kick', targetId: 'abc_1-2' },
  });
  for (const text of [
    '{"t":"do","action":{"type":"lobby.kick"}}',
    '{"t":"do","action":{"type":"lobby.kick","targetId":"a b"}}',
    '{"t":"do","action":{"type":"lobby.kick","targetId":"a","extra":1}}',
    '{"t":"do","action":{"type":"lobby.kick","targetId":5}}',
  ]) {
    assert.equal(parseClientMessage(text), null);
  }
});

test('oversized text is refused by length before it is encoded', () => {
  assert.equal(parseClientMessage('x'.repeat(30 * 1024 * 1024)), null);
});

test('D-046: names and notes lose control, bidirectional, zero-width and other invisible characters but keep real letters', () => {
  assert.equal(sanitize('Ștefan Țurcanu', 40), 'Ștefan Țurcanu');
  assert.equal(sanitize('Ioana-Mădălina Pătrașcu', 40), 'Ioana-Mădălina Pătrașcu');
  assert.equal(sanitize('Ştefan', 40), 'Ştefan');
  assert.equal(sanitize('A‮evil‬', 40), 'Aevil');
  assert.equal(sanitize('A​d‌m‍i⁠n﻿', 40), 'Admin');
  assert.equal(sanitize('a⁦b⁩', 40), 'ab');
  assert.equal(sanitize('x\u0007y\u007Fz', 40), 'xyz');
  assert.equal(sanitize('aㅤb⠀cᅟd', 40), 'abcd');
  assert.equal(sanitize('a\uDBFFb', 40), 'ab');
  assert.equal(sanitize('á̂̃̄̅̆b', 40), 'á̂̃b');
  assert.equal(sanitize('‮​', 40), '');
});
