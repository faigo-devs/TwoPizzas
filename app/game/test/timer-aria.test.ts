import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { timerAria } from '../../ui/timer-aria.ts';

const timerSource = readFileSync(new URL('../../ui/Timer.tsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('the phase clock is a timer with its live region off, so it is not announced every second', () => {
  assert.equal(timerAria.role, 'timer');
  assert.equal(timerAria['aria-live'], 'off');
});

test('the Timer component takes its role from that contract and adds no live region of its own', () => {
  assert.ok(timerSource.includes('{...timerAria}'));
  assert.equal(/aria-live\s*=/.test(timerSource), false);
  assert.equal(/role\s*=\s*"(status|alert|log)"/.test(timerSource), false);
});

test('the countdown digits are rendered only by the Timer, never inside a live region of the shell', () => {
  const uses = appSource.match(/formatClock\(/g) ?? [];
  assert.equal(uses.length, 1);
  assert.ok(appSource.indexOf('formatClock(') < appSource.indexOf('function Notices'));
});
