import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../../core/index.ts';
import { Harness, toSprint } from './support.ts';

test('D-077: a paused player whose socket falls silent keeps the item and the seat past the 60-second grace', async () => {
  const h = new Harness();
  const players = await toSprint(h);
  const worker = players[1];
  assert.ok(worker !== undefined);
  const mine = h.state().items.find((own) => own.status === 'todo');
  assert.ok(mine !== undefined);
  await h.act(worker, { type: 'item.take', itemId: mine.id });
  await h.act(worker, { type: 'player.pause', minutes: 10 });
  const until = h.state().players[1]?.pausedUntil ?? 0;
  assert.ok(until > h.clock);
  for (let round = 0; round < 6; round += 1) {
    h.advance(config.room.silenceMs);
    for (const own of players) if (own !== worker) own.autoResponseAt = h.clock;
    await h.fireAlarm();
  }
  assert.equal(worker.closed?.code, 4002);
  assert.ok(h.clock < until);
  const state = h.state();
  assert.equal(state.players[1]?.connected, false);
  assert.equal(state.items.find((own) => own.id === mine.id)?.status, 'doing');
  assert.equal(players[0]?.views().at(-1)?.players[1]?.pausedUntil, until);
});

test('a reconnect with the seat ends the pause and tells the others', async () => {
  const h = new Harness();
  const players = await toSprint(h);
  const worker = players[1];
  assert.ok(worker !== undefined);
  const { playerId, token } = worker.welcome();
  await h.act(worker, { type: 'player.pause', minutes: 5 });
  await h.drop(worker);
  const back = await h.connect();
  await h.send(back, { t: 'hello', playerId, token });
  assert.equal(h.state().players[1]?.pausedUntil, null);
  assert.equal(players[0]?.views().at(-1)?.players[1]?.pausedUntil, null);
});
