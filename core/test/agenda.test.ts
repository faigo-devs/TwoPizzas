import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sessionAgenda } from '../agenda.ts';
import { config } from '../config.ts';

test('the agenda lists the five events in game order with two work halves around the daily', () => {
  const { entries } = sessionAgenda();
  assert.deepEqual(
    entries.map((entry) => entry.event),
    ['plan', 'work', 'daily', 'work', 'inspect', 'retro'],
  );
});

test('the agenda minutes come from the timeboxes of the config', () => {
  const { entries } = sessionAgenda();
  const byEvent = (event: string) => entries.find((entry) => entry.event === event)?.minutes;
  assert.deepEqual(byEvent('plan'), config.timeboxMs.plan.map((ms) => ms / 60_000));
  assert.deepEqual(byEvent('inspect'), config.timeboxMs.inspect.map((ms) => ms / 60_000));
  assert.deepEqual(byEvent('retro'), config.timeboxMs.retro.map((ms) => ms / 60_000));
  assert.deepEqual(byEvent('daily'), [config.timeboxMs.daily / 60_000, config.timeboxMs.daily / 60_000]);
  for (const entry of entries) assert.equal(entry.minutes.length, config.iterations);
});

test('the total is the sum of every box of every iteration', () => {
  const t = config.timeboxMs;
  const sumOf = (list: readonly number[]) => list.reduce((a, b) => a + b, 0);
  const expected = (sumOf(t.plan) + sumOf(t.inspect) + sumOf(t.retro) + config.iterations * (2 * t.workHalf + t.daily)) / 60_000;
  assert.equal(sessionAgenda().totalMinutes, expected);
  assert.equal(sessionAgenda().totalMinutes, 45);
});
