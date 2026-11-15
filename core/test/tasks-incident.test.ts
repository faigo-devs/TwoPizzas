import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { Actions, generatePuzzle, isCorrect } from '../tasks/index.ts';
import type { IncidentPuzzle, IncidentReading, IncidentRule, PuzzleSpec } from '../types.ts';
import { specs } from './support.ts';

function incident(spec: PuzzleSpec): IncidentPuzzle {
  return generatePuzzle(spec) as IncidentPuzzle;
}

function levels(readings: IncidentReading[]): Map<string, string> {
  return new Map(readings.map((reading) => [reading.indicator, reading.level]));
}

function fitting(readings: IncidentReading[], rules: IncidentRule[]): IncidentRule[] {
  const known = levels(readings);
  return [...rules]
    .sort((a, b) => a.number - b.number)
    .filter((rule) => rule.conditions.every((condition) => known.get(condition.indicator) === condition.level));
}

function decide(readings: IncidentReading[], rules: IncidentRule[], ruleCount: number): string | null {
  const known = levels(readings);
  for (let number = 1; number <= ruleCount; number += 1) {
    const rule = rules.find((candidate) => candidate.number === number);
    if (!rule) return null;
    let uncertain = false;
    let fails = false;
    for (const condition of rule.conditions) {
      const level = known.get(condition.indicator);
      if (level === undefined) uncertain = true;
      else if (level !== condition.level) fails = true;
    }
    if (fails) continue;
    return uncertain ? null : rule.action;
  }
  return null;
}

function mergeRules(rules: IncidentRule[][]): IncidentRule[] {
  const seen = new Map<number, IncidentRule>();
  for (const rule of rules.flat()) seen.set(rule.number, rule);
  return [...seen.values()];
}

test('incident: the full part decides, the first fitting rule wins and a later one fits too', () => {
  for (const spec of specs('incident')) {
    const puzzle = incident(spec);
    const table = config.puzzle.sizes.incident[spec.size];
    const { readings, rules, options } = puzzle.fullPart;
    assert.equal(readings.length, table.indicators);
    assert.equal(rules.length, table.rules + 1);
    assert.deepEqual(rules.map((rule) => rule.number), Array.from({ length: table.rules + 1 }, (_, index) => index + 1));
    const fits = fitting(readings, rules);
    assert.equal(fits[0]?.action, puzzle.answer.action);
    assert.ok((fits[0] as IncidentRule).number > 1);
    assert.ok(fits.length >= 3);
    assert.equal(isCorrect(puzzle, { kind: 'incident', action: (fits[1] as IncidentRule).action }), false);
    assert.equal(new Set(rules.map((rule) => rule.action)).size, rules.length);
    assert.ok(options.includes(puzzle.answer.action));
    assert.equal(new Set(options).size, options.length);
    assert.ok(options.every((action) => Actions.includes(action)));
    assert.equal(decide(readings, rules, table.rules + 1), puzzle.answer.action);
  }
});

test('incident: every wrong option is refused', () => {
  for (const spec of specs('incident', 10)) {
    const puzzle = incident(spec);
    for (const action of puzzle.fullPart.options) {
      assert.equal(isCorrect(puzzle, { kind: 'incident', action }), action === puzzle.answer.action);
    }
    assert.equal(isCorrect(puzzle, { kind: 'incident', action: 'unknown_action' }), false);
  }
});

test('incident: parts together hold exactly the full readings and rules', () => {
  for (const spec of specs('incident')) {
    const puzzle = incident(spec);
    const readings = [...puzzle.parts.flatMap((part) => part.readings), ...(puzzle.dependencyPart?.readings ?? [])];
    const sortKey = (reading: IncidentReading) => reading.indicator;
    assert.deepEqual(
      [...readings].sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
      [...puzzle.fullPart.readings].sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    );
    const rules = mergeRules(puzzle.parts.map((part) => part.rules));
    assert.deepEqual(rules.sort((a, b) => a.number - b.number), puzzle.fullPart.rules);
    for (const part of puzzle.parts) assert.deepEqual(part.options, puzzle.fullPart.options);
  }
});

test('incident: no worker alone can decide, the workers together only without a dependency', () => {
  for (const spec of specs('incident')) {
    const puzzle = incident(spec);
    const count = config.puzzle.sizes.incident[spec.size].rules + 1;
    for (const part of puzzle.parts) {
      const alone = decide(part.readings, part.rules, count);
      if (spec.workers === 2 || spec.dependency) assert.equal(alone, null);
      else assert.equal(alone, puzzle.answer.action);
    }
    const readings = puzzle.parts.flatMap((part) => part.readings);
    const rules = mergeRules(puzzle.parts.map((part) => part.rules));
    const workersOnly = decide(readings, rules, count);
    assert.equal(workersOnly, spec.dependency ? null : puzzle.answer.action);
    if (spec.dependency) {
      const held = (puzzle.dependencyPart as NonNullable<typeof puzzle.dependencyPart>).readings;
      assert.equal(held.length, 1);
      assert.equal(decide([...readings, ...held], rules, count), puzzle.answer.action);
    }
  }
});

test('incident: the dependency reading decides, the other level gives another answer', () => {
  for (const spec of specs('incident')) {
    if (!spec.dependency) continue;
    const puzzle = incident(spec);
    const held = (puzzle.dependencyPart as NonNullable<typeof puzzle.dependencyPart>).readings[0] as IncidentReading;
    const indicator = puzzle.fullPart.rules
      .flatMap((rule) => rule.conditions)
      .filter((condition) => condition.indicator === held.indicator)
      .map((condition) => condition.level);
    const other = [...new Set(indicator)].find((level) => level !== held.level);
    const flipped = puzzle.fullPart.readings.map((reading) =>
      reading.indicator === held.indicator ? { ...reading, level: other ?? `not_${held.level}` } : reading,
    );
    const alternative = fitting(flipped, puzzle.fullPart.rules)[0] as IncidentRule;
    assert.notEqual(alternative.action, puzzle.answer.action);
    const winning = puzzle.fullPart.rules.find((rule) => rule.action === puzzle.answer.action) as IncidentRule;
    assert.ok(winning.conditions.some((condition) => condition.indicator === held.indicator));
  }
});
