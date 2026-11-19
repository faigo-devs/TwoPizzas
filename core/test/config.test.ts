import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';

function frozen(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return true;
  return Object.isFrozen(value) && Object.values(value).every(frozen);
}

test('the config is deeply frozen', () => {
  assert.equal(frozen(config), true);
  assert.throws(() => {
    (config as unknown as { contextSwitchMs: number }).contextSwitchMs = 1;
  }, TypeError);
});

test('the numbers of the specification are in the config', () => {
  assert.deepEqual(config.timeboxMs.plan, [360_000, 240_000]);
  assert.deepEqual(config.timeboxMs.inspect, [240_000, 180_000]);
  assert.deepEqual(config.timeboxMs.retro, [300_000, 180_000]);
  assert.equal(config.timeboxMs.workHalf, 240_000);
  assert.equal(config.timeboxMs.daily, 120_000);
  assert.equal(config.contextSwitchMs, 8000);
  assert.equal(config.players.min, 3);
  assert.equal(config.players.max, 6);
  assert.equal(config.players.nameMax, 20);
  assert.equal(config.retro.noteMax, 140);
  assert.equal(config.retro.votesPerPlayer, 2);
  assert.deepEqual(config.poker.cards, [1, 2, 3, 5, 8, 13]);
  assert.equal(config.goal.bonus, 5);
  assert.equal(config.review.waitThresholdMs, 60_000);
  assert.equal(config.kanban.arrivalIntervalMs, 45_000);
  assert.equal(config.room.emptyGraceMs, 900_000);
  assert.equal(config.room.lifetimeMs, 7_200_000);
  assert.equal(config.room.codeLetters, 'BCDFGHJKLMNPRSTVWXZ');
});

test('the backlog is ten items and dependencies fit inside their sizes', () => {
  const { composition, dependencies } = config.backlog;
  assert.equal(composition.S + composition.M + composition.L, 10);
  assert.ok(dependencies.S <= composition.S && dependencies.M <= composition.M && dependencies.L === composition.L);
  assert.ok(config.backlog.themes.length === 3);
  assert.ok(new Set(config.backlog.subjects).size === config.backlog.subjects.length);
});
