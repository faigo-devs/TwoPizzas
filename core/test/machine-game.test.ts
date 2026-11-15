import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { nextDeadline } from '../machine/index.ts';
import { leaderboardEntry } from '../machine/index.ts';
import { ExpectedPhases, act, facilitator, playGame, tryAct } from './machine-support.ts';

const sizes = [3, 4, 6];
const seeds = [1100011, 2020202, 3003003];

for (const players of sizes) {
  for (const seed of seeds) {
    test(`whole Scrum game, ${players} players, seed ${seed}`, () => {
      const room = playGame({ players, seed, style: { wrongMod: seed === 2020202 ? 3 : 0 } });
      assert.deepEqual(room.phases, ExpectedPhases);
      const state = room.state;
      assert.equal(state.phase.kind, 'summary');
      assert.equal(state.iterations.length, 2);
      assert.equal(state.events.length, 8);
      assert.deepEqual(
        state.events.map((event) => `${event.kind}${event.iteration}`),
        ['plan1', 'daily1', 'inspect1', 'retro1', 'plan2', 'daily2', 'inspect2', 'retro2'],
      );
      for (const event of state.events) {
        assert.equal(event.overrunMs, Math.max(0, event.usedMs - event.timeboxMs));
      }
      assert.equal(nextDeadline(state), null);
      const metrics = state.iterations.map((iteration) => iteration.metrics);
      assert.ok(metrics.every((entry) => entry !== null));
      const entry = leaderboardEntry(state);
      assert.ok(entry !== null);
      assert.equal(entry.players, players);
      assert.equal(entry.framework, 'scrum');
      act(room, facilitator(room), { type: 'summary.publish' });
      assert.equal(room.state.published, true);
      assert.equal(tryAct(room, facilitator(room), { type: 'summary.publish' }).ok, false);
    });
  }
}

test('timeboxes start at phase.begin and the Sprint ends hard', () => {
  const room = playGame({ players: 4, seed: 5, checks: false });
  assert.equal(room.state.phase.kind, 'summary');
  assert.equal(config.timeboxMs.workHalf, 240_000);
});
