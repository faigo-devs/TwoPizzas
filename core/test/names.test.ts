import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Adjectives, Animals, generateTeamName } from '../names.ts';

test('both lists are long, unique, lower case ASCII words', () => {
  for (const list of [Adjectives, Animals]) {
    assert.ok(list.length >= 40);
    assert.equal(new Set(list).size, list.length);
    for (const word of list) assert.match(word, /^[a-z]+$/);
  }
});

test('names are adjective-animal in kebab-case and deterministic', () => {
  for (let index = 0; index < 200; index += 1) {
    const seed = index * 7919 + 13;
    for (const attempt of [0, 1, 2]) {
      const name = generateTeamName(seed, attempt);
      assert.match(name, /^[a-z]+-[a-z]+$/);
      const [adjective, animal] = name.split('-') as [string, string];
      assert.ok(Adjectives.includes(adjective));
      assert.ok(Animals.includes(animal));
      assert.equal(generateTeamName(seed, attempt), name);
    }
  }
});

test('another attempt or seed gives variety', () => {
  const byAttempt = new Set(Array.from({ length: 20 }, (_, attempt) => generateTeamName(42, attempt)));
  assert.ok(byAttempt.size >= 15);
  const bySeed = new Set(Array.from({ length: 50 }, (_, index) => generateTeamName(index * 104729 + 5, 0)));
  assert.ok(bySeed.size >= 40);
});
