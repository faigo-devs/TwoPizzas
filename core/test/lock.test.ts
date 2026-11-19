import assert from 'node:assert/strict';
import { test } from 'node:test';
import { viewFor } from '../machine/index.ts';
import { sanitize } from '../machine/util.ts';
import { parseClientMessage } from '../wire.ts';
import { act, newRoom, server, tryAct } from './machine-support.ts';

test('only the host locks and unlocks the lobby, and a newcomer is refused while it is locked', () => {
  const room = newRoom({ players: 3 });
  assert.equal(tryAct(room, 'p2', { type: 'lobby.lock', locked: true }).ok, false);
  assert.equal(room.state.locked, false);
  assert.ok(viewFor(room.state, 'p1', room.now).controls.includes('lock_room'));
  assert.ok(!viewFor(room.state, 'p2', room.now).controls.includes('lock_room'));
  act(room, 'p1', { type: 'lobby.lock', locked: true });
  assert.equal(viewFor(room.state, 'p2', room.now).locked, true);
  assert.ok(viewFor(room.state, 'p1', room.now).controls.includes('unlock_room'));
  const refused = server(room, { type: 'server.join', playerId: 'p9', name: null, now: room.now });
  assert.equal(refused.ok ? 'ok' : refused.code, 'room_locked');
  assert.equal(server(room, { type: 'server.connected', playerId: 'p2', now: room.now }).ok, true);
  act(room, 'p1', { type: 'lobby.lock', locked: false });
  assert.equal(server(room, { type: 'server.join', playerId: 'p9', name: null, now: room.now }).ok, true);
});

test('the lock is a lobby action only and the wire checks its shape', () => {
  const room = newRoom({ players: 3 });
  act(room, 'p1', { type: 'lobby.start' });
  assert.equal(tryAct(room, 'p1', { type: 'lobby.lock', locked: true }).ok, false);
  assert.deepEqual(parseClientMessage('{"t":"do","action":{"type":"lobby.lock","locked":true}}'), {
    t: 'do',
    action: { type: 'lobby.lock', locked: true },
  });
  for (const text of ['{"t":"do","action":{"type":"lobby.lock"}}', '{"t":"do","action":{"type":"lobby.lock","locked":"yes"}}']) {
    assert.equal(parseClientMessage(text), null);
  }
});

test('removing characters never leaves a double space', () => {
  assert.equal(sanitize('Ana ​ Maria', 40), 'Ana Maria');
  assert.equal(sanitize('a ‮ b', 40), 'a b');
  assert.equal(sanitize(' ​x​ ', 40), 'x');
});
