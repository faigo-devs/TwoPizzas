import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { leaderboardEntry, nextDeadline, viewFor } from '../machine/index.ts';
import { ExpectedPhases, act, facilitator, playGame, tryAct } from './machine-support.ts';

const sizes = [3, 4, 6];
const seeds = [1100011, 2020202, 3003003];
const ScrumOnly = [
  'plan.unestimatedPulled',
  'plan.allEstimated',
  'plan.overcommitted',
  'plan.fitsVelocity',
  'inspect.goalMet',
  'inspect.goalMissed',
];
const KanbanOnly = [
  'work.limitReached',
  'work.limitNeverReached',
  'work.agedWork',
  'inspect.throughputUp',
  'inspect.throughputDown',
  'inspect.cycleTimeFaster',
  'inspect.cycleTimeSlower',
];

for (const players of sizes) {
  for (const seed of seeds) {
    test(`whole Kanban game, ${players} players, seed ${seed}`, () => {
      const room = playGame({
        players,
        seed,
        framework: 'kanban',
        style: { wrongMod: seed === 2020202 ? 3 : 0 },
      });
      assert.deepEqual(room.phases, ExpectedPhases);
      const state = room.state;
      assert.equal(state.phase.kind, 'summary');
      assert.equal(state.iterations.length, 2);
      assert.deepEqual(
        state.events.map((event) => `${event.kind}${event.iteration}`),
        ['plan1', 'daily1', 'inspect1', 'retro1', 'plan2', 'daily2', 'inspect2', 'retro2'],
      );
      for (const event of state.events) assert.equal(event.overrunMs, Math.max(0, event.usedMs - event.timeboxMs));
      assert.equal(nextDeadline(state), null);
      for (const iteration of state.iterations) {
        assert.ok(iteration.metrics !== null);
        assert.equal(iteration.arrivalsLeft, 0);
        assert.equal(iteration.metrics.velocity, 0);
        assert.equal(iteration.goal, null);
        assert.ok(iteration.metrics.wipLimits !== undefined);
      }
      assert.deepEqual(state.iterations[0]?.metrics?.wipLimits, { inProgress: null, review: null });
      assert.deepEqual(state.iterations[1]?.metrics?.wipLimits, { inProgress: 3, review: 3 });
      const ids = state.observations.map((own) => own.id as string);
      for (const id of ids) assert.ok(!ScrumOnly.includes(id), `${id} raised in Kanban`);
      assert.ok(state.items.every((own) => own.iteration === 2));
      const entry = leaderboardEntry(state);
      assert.ok(entry !== null);
      assert.equal(entry.framework, 'kanban');
      assert.equal(entry.players, players);
      assert.equal(entry.averageCycleMs !== null, state.iterations.some((own) => (own.metrics?.cycleTimesMs.length ?? 0) > 0));
      const view = viewFor(state, facilitator(room), room.now);
      assert.equal(view.summary?.score.goalBonus, 0);
      act(room, facilitator(room), { type: 'summary.publish' });
      assert.equal(tryAct(room, facilitator(room), { type: 'summary.publish' }).ok, false);
    });
  }
}

test('a Scrum game never raises a Kanban-only observation', () => {
  const room = playGame({ players: 4, seed: 8080808 });
  for (const own of room.state.observations) assert.ok(!KanbanOnly.includes(own.id), `${own.id} raised in Scrum`);
  assert.equal(viewFor(room.state, 'p1', room.now).kanban, null);
  assert.equal(viewFor(room.state, 'p1', room.now).limits, null);
});

test('the Kanban config keeps the pool and the arrivals inside what a round can hold', () => {
  const { poolComposition, arrivalComposition, readyMax } = config.kanban;
  assert.ok(readyMax <= poolComposition.S + poolComposition.M + poolComposition.L);
  assert.equal(arrivalComposition.S + arrivalComposition.M + arrivalComposition.L, 8);
});
