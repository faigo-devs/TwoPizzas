import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Indicators, MergeRules } from '../tasks/data.ts';
import { generatePuzzle, resolveConflict } from '../tasks/index.ts';
import type { IncidentPuzzle, IncidentReading, IncidentRule, MergePuzzle, OrderPuzzle, ReviewPuzzle } from '../types.ts';
import { permutations, specs } from './support.ts';

const Seeds = 60;

function depSpecs(kind: 'order' | 'incident' | 'merge' | 'review') {
  return specs(kind, Seeds).filter((spec) => spec.dependency);
}

test('an order outside clue is never repeated in the pair and the pair alone cannot fix the order', () => {
  for (const spec of depSpecs('order')) {
    const puzzle = generatePuzzle(spec) as OrderPuzzle;
    const held = puzzle.dependencyPart?.clues ?? [];
    assert.equal(held.length, 1);
    const known = puzzle.parts.flatMap((part) => part.clues);
    for (const clue of held) {
      assert.ok(!known.some((own) => own.before === clue.before && own.after === clue.after), 'literal repeat');
    }
    const components = puzzle.parts[0]?.components ?? [];
    const fits = (order: string[], clues: { before: string; after: string }[]) =>
      clues.every((clue) => order.indexOf(clue.before) < order.indexOf(clue.after));
    const solutions = permutations(components).filter((order) => fits(order, known));
    assert.ok(solutions.length > 1, `the pair alone fixes the order, ${spec.seed} ${spec.size}`);
    assert.ok(solutions.some((order) => !fits(order, held)), 'the outside clue rules nothing out');
  }
});

function firstFit(rules: IncidentRule[], readings: IncidentReading[]): string | undefined {
  const levelOf = (indicator: string) => readings.find((reading) => reading.indicator === indicator)?.level;
  return rules.find((rule) => rule.conditions.every((condition) => levelOf(condition.indicator) === condition.level))?.action;
}

test('an incident outside reading is never among the pair readings and changes the action', () => {
  for (const spec of depSpecs('incident')) {
    const puzzle = generatePuzzle(spec) as IncidentPuzzle;
    const held = puzzle.dependencyPart?.readings ?? [];
    assert.equal(held.length, 1);
    const own = puzzle.parts.flatMap((part) => part.readings);
    assert.ok(!own.some((reading) => reading.indicator === held[0]?.indicator));
    const rules = puzzle.fullPart.rules;
    const indicator = held[0]?.indicator ?? '';
    const other = Indicators.find(([name]) => name === indicator)?.[1].find((level) => level !== held[0]?.level);
    assert.ok(other !== undefined, 'only one level appears in the rules');
    const flipped = firstFit(rules, [...own, { indicator, level: other }]);
    assert.notEqual(flipped, puzzle.answer.action, 'the answer does not depend on the outside reading');
  }
});

test('an outside merge rule is hidden from the pair and changes the merged file', () => {
  for (const spec of depSpecs('merge')) {
    const puzzle = generatePuzzle(spec) as MergePuzzle;
    assert.ok(puzzle.dependencyPart !== null);
    for (const part of puzzle.parts) assert.equal(part.rule, null);
    const merged = (rule: (typeof MergeRules)[number]) =>
      puzzle.fullPart.lines.map((line) => {
        const [a, b] = line.changes;
        if (a !== null && a !== undefined && b !== null && b !== undefined) return resolveConflict(rule, a, b);
        return a ?? b ?? line.base;
      });
    const answers = new Set(MergeRules.map((rule) => JSON.stringify(merged(rule))));
    assert.ok(answers.size > 1, 'every rule gives the same file');
  }
});

test('a review outside ignore list is never empty and names only keys that really differ', () => {
  for (const spec of depSpecs('review')) {
    const puzzle = generatePuzzle(spec) as ReviewPuzzle;
    const ignore = puzzle.dependencyPart?.ignore ?? [];
    assert.ok(ignore.length > 0);
    for (const part of puzzle.parts) {
      assert.ok(part.kind === 'review');
    }
    const [a, b] = puzzle.fullPart.copies;
    for (const key of ignore) {
      const left = a?.find((line) => line.key === key)?.value;
      const right = b?.find((line) => line.key === key)?.value;
      assert.notEqual(left, right);
    }
  }
});
