import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StateVersion } from '../state.ts';
import { createRoom, reduce } from '../machine/index.ts';
import { clientActionTypes } from '../wire.ts';
import { Samples } from './action-samples.ts';
import { newRoom, pid } from './machine-support.ts';

test('D-089: a new room carries the current state version', () => {
  assert.equal(newRoom().state.version, StateVersion);
  assert.equal(createRoom({ code: 'BCDFG', framework: 'kanban', secret: 'a', nameSeed: 1, now: 0 }).version, StateVersion);
});

test('every client action type is dispatched without throwing', () => {
  const room = newRoom({ players: 3 });
  for (const type of clientActionTypes) {
    const outcome = reduce(room.state, { ...Samples[type], playerId: pid(0), now: room.now });
    assert.equal(typeof outcome.ok, 'boolean', type);
  }
});

test('an action of an unknown type is refused as a bad request and leaves the state alone', () => {
  const room = newRoom({ players: 3 });
  const before = JSON.stringify(room.state);
  const outcome = reduce(room.state, { type: 'nope', playerId: pid(0), now: room.now } as never);
  assert.deepEqual(outcome, { ok: false, code: 'bad_request' });
  assert.equal(JSON.stringify(room.state), before);
});
