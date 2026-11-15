import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { MergeRules, generatePuzzle, isCorrect } from '../tasks/index.ts';
import type { MergeLine, MergePuzzle, MergeRule, PuzzleSpec } from '../types.ts';
import { specs } from './support.ts';

function merge(spec: PuzzleSpec): MergePuzzle {
  return generatePuzzle(spec) as MergePuzzle;
}

function solve(lines: MergeLine[], rule: MergeRule): number[] {
  return lines.map((line) => {
    const [sideA, sideB] = line.changes;
    if (sideA == null && sideB == null) return line.base;
    if (sideA == null) return sideB as number;
    if (sideB == null) return sideA;
    if (rule === 'max') return Math.max(sideA, sideB);
    if (rule === 'min') return Math.min(sideA, sideB);
    return rule === 'side_a' ? sideA : sideB;
  });
}

test('merge: the full part and the rule decide the answer', () => {
  for (const spec of specs('merge')) {
    const puzzle = merge(spec);
    const table = config.puzzle.sizes.merge[spec.size];
    const { lines, rule } = puzzle.fullPart;
    assert.equal(lines.length, table.lines);
    assert.equal(new Set(lines.map((line) => line.key)).size, lines.length);
    assert.deepEqual(solve(lines, rule), puzzle.answer.values);
    const conflicts = lines.filter((line) => line.changes[0] != null && line.changes[1] != null);
    const onlyA = lines.filter((line) => line.changes[0] != null && line.changes[1] == null);
    const onlyB = lines.filter((line) => line.changes[0] == null && line.changes[1] != null);
    assert.equal(conflicts.length, table.conflicts);
    assert.equal(onlyA.length, table.singles);
    assert.equal(onlyB.length, table.singles);
    for (const line of lines) {
      for (const change of line.changes) assert.notEqual(change, line.base);
    }
    for (const line of conflicts) assert.notEqual(line.changes[0], line.changes[1]);
  }
});

test('merge: the four rules give four different answers, so the rule is necessary', () => {
  for (const spec of specs('merge')) {
    const puzzle = merge(spec);
    const answers = MergeRules.map((rule) => JSON.stringify(solve(puzzle.fullPart.lines, rule)));
    assert.equal(new Set(answers).size, MergeRules.length);
    assert.equal(answers.filter((answer) => answer === JSON.stringify(puzzle.answer.values)).length, 1);
  }
});

test('merge: near misses are refused', () => {
  for (const spec of specs('merge', 15)) {
    const puzzle = merge(spec);
    const values = puzzle.answer.values;
    assert.equal(isCorrect(puzzle, { kind: 'merge', values: [...values] }), true);
    assert.equal(isCorrect(puzzle, { kind: 'merge', values: values.slice(1) }), false);
    assert.equal(isCorrect(puzzle, { kind: 'merge', values: [...values, 1] }), false);
    assert.equal(isCorrect(puzzle, { kind: 'merge', values: puzzle.fullPart.lines.map((line) => line.base) }), false);
    values.forEach((_, index) => {
      const wrong = values.map((value, position) => (position === index ? value + 1 : value));
      assert.equal(isCorrect(puzzle, { kind: 'merge', values: wrong }), false);
    });
    for (const rule of MergeRules) {
      if (rule !== puzzle.fullPart.rule) {
        assert.equal(isCorrect(puzzle, { kind: 'merge', values: solve(puzzle.fullPart.lines, rule) }), false);
      }
    }
  }
});

test('merge: the rule is held by the dependency part, or by the workers without one', () => {
  for (const spec of specs('merge')) {
    const puzzle = merge(spec);
    for (const part of puzzle.parts) {
      assert.equal(part.rule, spec.dependency ? null : puzzle.fullPart.rule);
      assert.equal(JSON.stringify(part).includes('"rule":null'), spec.dependency);
    }
    assert.equal(puzzle.dependencyPart?.rule ?? null, spec.dependency ? puzzle.fullPart.rule : null);
  }
});

test('merge: two workers each hold one side, which alone cannot decide', () => {
  for (const spec of specs('merge')) {
    const puzzle = merge(spec);
    if (spec.workers === 1) {
      const part = puzzle.parts[0] as MergePuzzle['parts'][number];
      assert.deepEqual(part.sides, [0, 1]);
      assert.deepEqual(part.lines, puzzle.fullPart.lines);
      continue;
    }
    puzzle.parts.forEach((part, side) => {
      assert.deepEqual(part.sides, [side]);
      assert.equal(part.lines.length, puzzle.fullPart.lines.length);
      const guess = part.lines.map((line) => (line.changes[0] as number | null) ?? line.base);
      assert.notDeepEqual(guess, puzzle.answer.values);
      const unseen = puzzle.fullPart.lines.filter((line) => line.changes[1 - side] != null && line.changes[side] == null);
      assert.ok(unseen.length >= 1);
    });
    const [one, two] = puzzle.parts as [MergePuzzle['parts'][number], MergePuzzle['parts'][number]];
    const together = one.lines.map((line, index) => ({
      key: line.key,
      base: line.base,
      changes: [line.changes[0] ?? null, (two.lines[index] as MergeLine).changes[0] ?? null],
    }));
    assert.deepEqual(together, puzzle.fullPart.lines);
    assert.deepEqual(solve(together, puzzle.fullPart.rule), puzzle.answer.values);
  }
});
