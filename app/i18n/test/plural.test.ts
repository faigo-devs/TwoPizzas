import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createT, pickLanguage, pluralCategory, templateParams } from '../index.ts';

test('Romanian plural categories', () => {
  const expected: [number, string][] = [
    [0, 'few'],
    [1, 'one'],
    [2, 'few'],
    [19, 'few'],
    [20, 'other'],
    [21, 'other'],
    [100, 'other'],
    [101, 'other'],
    [102, 'few'],
  ];
  for (const [n, category] of expected) assert.equal(pluralCategory('ro', n), category, String(n));
});

test('English plural categories', () => {
  assert.equal(pluralCategory('en', 1), 'one');
  assert.equal(pluralCategory('en', 0), 'other');
  assert.equal(pluralCategory('en', 2), 'other');
});

test('Romanian minutes take de from twenty', () => {
  const t = createT('ro');
  const sample: [number, string][] = [
    [1, '1 minut'],
    [2, '2 minute'],
    [19, '19 minute'],
    [20, '20 de minute'],
    [21, '21 de minute'],
    [101, '101 de minute'],
  ];
  for (const [count, text] of sample) assert.equal(t('common.minutes', { count }), text);
});

test('English minutes', () => {
  const t = createT('en');
  assert.equal(t('common.minutes', { count: 1 }), '1 minute');
  assert.equal(t('common.minutes', { count: 4 }), '4 minutes');
});

test('named parameters and nested plurals', () => {
  assert.equal(createT('en')('phase.scale', { minutes: 6 }), 'In this game: 6 minutes, a scale model of the real event.');
  assert.equal(createT('ro')('phase.scale', { minutes: 6 }), 'În joc: 6 minute, o machetă a evenimentului real.');
  assert.equal(createT('ro')('privacy.p3', { minutes: 5, hours: 2 }).includes('5 minute'), true);
  assert.equal(createT('ro')('board.requestNote', { seconds: 45 }), 'Cererile continuă să sosească, una la fiecare 45 de secunde.');
  assert.equal(createT('ro')('item.switchingDetail', { seconds: 8 }).includes('8 secunde'), true);
});

test('a missing parameter is left visible', () => {
  assert.equal(createT('en')('common.player'), 'Player {n}');
  assert.deepEqual(templateParams('{a} and {b, plural, one {# x {c}} other {# y}}'), ['a', 'b', 'c']);
});

test('first visit language', () => {
  assert.equal(pickLanguage(['en-GB', 'ro']), 'en');
  assert.equal(pickLanguage(['de-DE', 'ro-RO']), 'ro');
  assert.equal(pickLanguage('en-US'), 'en');
  assert.equal(pickLanguage(['de', 'fr']), 'ro');
  assert.equal(pickLanguage([]), 'ro');
  assert.equal(pickLanguage(undefined), 'ro');
});

test('the Sprint Planning capacity line in both languages', () => {
  assert.equal(createT('en')('commit.capacity', { developers: 4, minutes: 8 }), 'Capacity: 4 Developers, 8 minutes of work');
  assert.equal(createT('ro')('commit.capacity', { developers: 4, minutes: 8 }), 'Capacitate: 4 Developers, 8 minute de lucru');
  assert.equal(createT('ro')('commit.capacity', { developers: 3, minutes: 20 }), 'Capacitate: 3 Developers, 20 de minute de lucru');
  assert.equal(createT('en')('commit.capacity', { developers: 3, minutes: 1 }), 'Capacity: 3 Developers, 1 minute of work');
});
