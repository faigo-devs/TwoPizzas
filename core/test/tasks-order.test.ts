import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { generatePuzzle, isCorrect } from '../tasks/index.ts';
import type { OrderClue, OrderPuzzle, PuzzleSpec } from '../types.ts';
import { permutations, specs } from './support.ts';

function fits(components: string[], clues: OrderClue[]): string[][] {
  return permutations([...components].sort()).filter((order) =>
    clues.every(({ before, after }) => order.indexOf(before) < order.indexOf(after)),
  );
}

function order(spec: PuzzleSpec): OrderPuzzle {
  return generatePuzzle(spec) as OrderPuzzle;
}

function key(clue: OrderClue): string {
  return `${clue.before}>${clue.after}`;
}

test('order: the full part allows exactly the answer', () => {
  for (const spec of specs('order')) {
    const puzzle = order(spec);
    const table = config.puzzle.sizes.order[spec.size];
    assert.equal(puzzle.answer.order.length, table.components);
    assert.deepEqual([...puzzle.fullPart.components].sort(), [...puzzle.answer.order].sort());
    assert.equal(puzzle.fullPart.clues.length, table.components - 1 + table.spare);
    assert.deepEqual(fits(puzzle.fullPart.components, puzzle.fullPart.clues), [puzzle.answer.order]);
  }
});

test('order: the listed start order is not the answer, and near misses are refused', () => {
  for (const spec of specs('order', 15)) {
    const puzzle = order(spec);
    assert.equal(isCorrect(puzzle, { kind: 'order', order: puzzle.fullPart.components }), false);
    const swapped = [...puzzle.answer.order];
    [swapped[0], swapped[1]] = [swapped[1] as string, swapped[0] as string];
    assert.equal(isCorrect(puzzle, { kind: 'order', order: swapped }), false);
    assert.equal(isCorrect(puzzle, { kind: 'order', order: puzzle.answer.order.slice(1) }), false);
    assert.equal(isCorrect(puzzle, { kind: 'order', order: [...puzzle.answer.order].reverse() }), false);
  }
});

test('order: parts together hold exactly the full clues', () => {
  for (const spec of specs('order')) {
    const puzzle = order(spec);
    const held = [...puzzle.parts.flatMap((part) => part.clues), ...(puzzle.dependencyPart?.clues ?? [])];
    assert.deepEqual(held.map(key).sort(), puzzle.fullPart.clues.map(key).sort());
    for (const part of puzzle.parts) {
      assert.deepEqual([...part.components].sort(), [...puzzle.answer.order].sort());
      assert.ok(part.clues.length >= 1);
    }
  }
});

test('order: no part alone is enough, the workers together only when there is no dependency', () => {
  for (const spec of specs('order')) {
    const puzzle = order(spec);
    for (const part of puzzle.parts) {
      const alone = fits(part.components, part.clues);
      if (spec.workers === 2 || spec.dependency) assert.ok(alone.length > 1);
      else assert.equal(alone.length, 1);
    }
    const together = puzzle.parts.flatMap((part) => part.clues);
    const workersOnly = fits(puzzle.fullPart.components, together);
    assert.equal(workersOnly.length === 1, !spec.dependency);
    if (spec.dependency) {
      const dependency = puzzle.dependencyPart as NonNullable<typeof puzzle.dependencyPart>;
      assert.equal(dependency.clues.length, 1);
      assert.deepEqual(fits(puzzle.fullPart.components, [...together, ...dependency.clues]), [puzzle.answer.order]);
    }
  }
});
