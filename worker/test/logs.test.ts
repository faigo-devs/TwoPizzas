import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Harness, toSprint } from './support.ts';

test('logs hold event names, codes and counts, never names, notes, codes or addresses', async () => {
  const h = new Harness();
  const players = await toSprint(h);
  const host = players[0];
  assert.ok(host !== undefined);
  await h.send(host, JSON.stringify({ t: 'do', action: { type: 'retro.note_add', column: 'try', text: 'SECRETNOTE' } }));
  await h.send(host, { t: 'hello', playerId: 'x', token: 'WRONGTOKEN' });
  const stranger = await h.join('Zed Zebra');
  assert.ok(stranger.errors().length > 0);
  await h.send(host, 'garbage-SECRETNOTE');
  const late = await h.connect();
  await h.send(late, { t: 'hello', playerId: players[1]?.welcome().playerId, token: 'WRONGTOKEN' });
  await h.drop(host);
  await h.fireAlarm();

  const text = h.logText();
  for (const forbidden of ['Ana', 'Bob', 'Cleo', 'Zed', 'Zebra', 'SECRETNOTE', 'WRONGTOKEN', 'BCDFG', 'token']) {
    assert.ok(!text.includes(forbidden), `log mentions ${forbidden}`);
  }
  for (const player of players) {
    assert.ok(!text.includes(player.welcome().playerId));
    assert.ok(!text.includes(player.welcome().token));
  }
  for (const log of h.logs) {
    for (const value of Object.values(log.fields)) {
      assert.ok(typeof value === 'number' || typeof value === 'boolean' || /^[a-z_]+$/.test(value), `odd log value ${value}`);
    }
  }
  assert.ok(h.logs.length > 3);
});
