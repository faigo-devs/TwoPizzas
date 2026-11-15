import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MergeRules, MissionCount, buildMission, createRng, generateCode, hashSeed, isCorrect, parseCode } from '../game/engine.mjs';

const Codes = Array.from({ length: 150 }, (_, index) => {
  const players = 2 + (index % 3);
  return generateCode(players, createRng(hashSeed(`test:${index}`)));
});

const playersOf = (code) => parseCode(code).players;

function permutations(items) {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]),
  );
}

test('a generated code is read back with its number of players', () => {
  for (const code of Codes) {
    assert.match(code, /^[BCDFGHJKLMNPRSTVWXZ]{4}[234]$/);
    assert.deepEqual(parseCode(code), { code, players: Number(code[4]) });
  }
});

test('a typed code is cleaned, and anything else is refused', () => {
  assert.deepEqual(parseCode(' ktrm-3 '), { code: 'KTRM3', players: 3 });
  for (const text of ['', 'KTRM', 'KTRM5', 'KTRM1', 'KARM3', 'KTRMM3', '12345', null, undefined]) {
    assert.equal(parseCode(text), null);
  }
});

test('every device builds the same mission from the same code', () => {
  for (const code of Codes.slice(0, 30)) {
    for (let index = 0; index < MissionCount; index += 1) {
      assert.deepEqual(buildMission(code, index, playersOf(code)), buildMission(code, index, playersOf(code)));
    }
  }
});

test('two codes do not share their missions', () => {
  const [first, second] = ['KTRM2', 'KTRN2'].map((code) => JSON.stringify(buildMission(code, 0, 2)));
  assert.notEqual(first, second);
});

test('every mission has one view per player and accepts its own answer', () => {
  for (const code of Codes) {
    for (let index = 0; index < MissionCount; index += 1) {
      const mission = buildMission(code, index, playersOf(code));
      assert.equal(mission.views.length, playersOf(code));
      assert.equal(isCorrect(mission, mission.answer), true);
    }
  }
});

test('review: the answer is exactly the lines that differ between copies', () => {
  for (const code of Codes) {
    const players = playersOf(code);
    const mission = buildMission(code, 0, players);
    const values = new Map();
    for (const view of mission.views) {
      assert.equal(view.lines.length, 10);
      for (const { key, value } of view.lines) values.set(key, [...(values.get(key) ?? []), value]);
    }
    const differing = [...values].filter(([, seen]) => new Set(seen).size > 1).map(([key]) => key);
    assert.deepEqual(differing.sort(), mission.answer);
    assert.equal(mission.answer.length, players === 2 ? 3 : 4);
    assert.equal(isCorrect(mission, mission.answer.slice(1)), false);
    assert.equal(isCorrect(mission, [...mission.answer].reverse()), true);
  }
});

test('order: the clues of all players together allow exactly one order', () => {
  for (const code of Codes) {
    const players = playersOf(code);
    const mission = buildMission(code, 1, players);
    const clues = mission.views.flatMap((view) => view.clues);
    const fits = permutations(mission.answer).filter((order) =>
      clues.every(({ before, after }) => order.indexOf(before) < order.indexOf(after)),
    );
    assert.deepEqual(fits, [mission.answer]);
    for (const view of mission.views) {
      assert.ok(view.clues.length >= 2);
      assert.deepEqual([...view.items].sort(), [...mission.answer].sort());
      assert.equal(isCorrect(mission, view.items), false);
    }
  }
});

test('order: no player alone holds enough clues', () => {
  for (const code of Codes) {
    const mission = buildMission(code, 1, playersOf(code));
    for (const view of mission.views) {
      const fits = permutations(mission.answer).filter((order) =>
        view.clues.every(({ before, after }) => order.indexOf(before) < order.indexOf(after)),
      );
      assert.ok(fits.length > 1);
    }
  }
});

test('incident: the answer is the action of the first rule that fits the readings', () => {
  for (const code of Codes) {
    const players = playersOf(code);
    const mission = buildMission(code, 2, players);
    const readings = new Map(mission.views.flatMap((view) => view.readings).map(({ name, value }) => [name, value]));
    const rules = mission.views.flatMap((view) => view.rules).sort((a, b) => a.number - b.number);
    assert.equal(readings.size, 5);
    assert.deepEqual(rules.map((rule) => rule.number), [1, 2, 3, 4, 5, 6]);
    const fitting = rules.filter((rule) => rule.conditions.every(({ name, value }) => readings.get(name) === value));
    assert.equal(fitting[0].action, mission.answer);
    assert.ok(fitting[0].number > 1);
    assert.equal(fitting.length, 3);
    assert.equal(new Set(rules.map((rule) => rule.action)).size, 6);
    assert.ok(mission.options.includes(mission.answer));
    assert.equal(isCorrect(mission, fitting[1].action), false);
    assert.equal(isCorrect(mission, null), false);
  }
});

test('merge: single changes go in, a conflict follows the rule one player holds', () => {
  const seenRules = new Set();
  for (const code of Codes) {
    const players = playersOf(code);
    const mission = buildMission(code, 3, players);
    const holders = mission.views.filter((view) => view.rule !== null);
    assert.equal(holders.length, 1);
    assert.ok(MergeRules.includes(holders[0].rule));
    seenRules.add(holders[0].rule);
    const expected = mission.views[0].lines.map(({ base }, line) => {
      const changes = mission.views
        .map((view, seat) => ({ seat, value: view.lines[line].mine }))
        .filter((change) => change.value !== null);
      for (const change of changes) assert.notEqual(change.value, base);
      if (changes.length === 0) return base;
      if (changes.length === 1) return changes[0].value;
      assert.equal(changes.length, 2);
      assert.notEqual(changes[0].value, changes[1].value);
      const values = changes.map((change) => change.value);
      return { max: Math.max(...values), min: Math.min(...values), lowSeat: values[0], highSeat: values[1] }[holders[0].rule];
    });
    assert.deepEqual(expected, mission.answer);
    const conflicts = mission.changes.filter((changes) => changes.length === 2).length;
    assert.equal(conflicts, 2);
    for (const view of mission.views) assert.ok(view.lines.some((line) => line.mine !== null));
    assert.equal(isCorrect(mission, mission.views[0].lines.map((line) => line.base)), false);
  }
  assert.deepEqual([...seenRules].sort(), [...MergeRules].sort());
});
