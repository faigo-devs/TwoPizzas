import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { generatePuzzle, isCorrect } from '../tasks/index.ts';
import type { PuzzleSpec, ReviewLine, ReviewPuzzle } from '../types.ts';
import { specs } from './support.ts';

type Copies = [ReviewLine[], ReviewLine[]];

function differing(first: ReviewLine[], second: ReviewLine[]): string[] {
  const other = new Map(second.map((line) => [line.key, line.value]));
  return first
    .filter((line) => other.get(line.key) !== line.value)
    .map((line) => line.key)
    .sort();
}

function without(keys: string[], ignore: string[]): string[] {
  return keys.filter((key) => !ignore.includes(key));
}

function review(spec: PuzzleSpec): ReviewPuzzle {
  return generatePuzzle(spec) as ReviewPuzzle;
}

test('review: sizes change the amount of keys and differences', () => {
  for (const spec of specs('review')) {
    const puzzle = review(spec);
    const table = config.puzzle.sizes.review[spec.size];
    const [first, second] = puzzle.fullPart.copies as Copies;
    assert.equal(first.length, table.keys);
    assert.equal(second.length, table.keys);
    assert.deepEqual(first.map((line) => line.key).sort(), second.map((line) => line.key).sort());
    assert.equal(differing(first, second).length, table.differing);
  }
});

test('review: the full part decides the answer', () => {
  for (const spec of specs('review')) {
    const puzzle = review(spec);
    const [first, second] = puzzle.fullPart.copies as Copies;
    assert.deepEqual(without(differing(first, second), puzzle.fullPart.ignore), puzzle.answer.keys);
    assert.ok(puzzle.answer.keys.length >= 1);
  }
});

test('review: near misses are refused', () => {
  for (const spec of specs('review', 15)) {
    const puzzle = review(spec);
    const keys = puzzle.answer.keys;
    const [first, second] = puzzle.fullPart.copies as Copies;
    const unchanged = first.map((line) => line.key).find((key) => !differing(first, second).includes(key)) as string;
    assert.equal(isCorrect(puzzle, { kind: 'review', keys: [...keys].reverse() }), true);
    assert.equal(isCorrect(puzzle, { kind: 'review', keys: keys.slice(1) }), false);
    assert.equal(isCorrect(puzzle, { kind: 'review', keys: [] }), false);
    assert.equal(isCorrect(puzzle, { kind: 'review', keys: [...keys, unchanged] }), false);
    assert.equal(isCorrect(puzzle, { kind: 'review', keys: [...keys, keys[0] as string] }), false);
  }
});

test('review: the ignore list holds differing keys, and flagging one is wrong', () => {
  for (const spec of specs('review')) {
    const puzzle = review(spec);
    const [first, second] = puzzle.fullPart.copies as Copies;
    const all = differing(first, second);
    if (!spec.dependency) {
      assert.deepEqual(puzzle.fullPart.ignore, []);
      assert.deepEqual(all, puzzle.answer.keys);
      continue;
    }
    const ignore = puzzle.fullPart.ignore;
    assert.equal(ignore.length, config.puzzle.sizes.review[spec.size].ignored);
    assert.ok(ignore.length >= 1 && ignore.every((key) => all.includes(key)));
    assert.deepEqual((puzzle.dependencyPart as NonNullable<typeof puzzle.dependencyPart>).ignore, ignore);
    assert.equal(isCorrect(puzzle, { kind: 'review', keys: all }), false);
  }
});

test('review: two workers each hold one copy, which alone cannot decide', () => {
  for (const spec of specs('review')) {
    if (spec.workers !== 2) continue;
    const puzzle = review(spec);
    for (const part of puzzle.parts) {
      assert.equal(part.copies.length, 1);
      const own = part.copies[0] as ReviewLine[];
      assert.deepEqual(differing(own, own), []);
      assert.ok(puzzle.answer.keys.length > 0);
    }
    const [one, two] = puzzle.parts.map((part) => part.copies[0] as ReviewLine[]) as Copies;
    const ignore = puzzle.dependencyPart?.ignore ?? [];
    assert.deepEqual(without(differing(one, two), ignore), puzzle.answer.keys);
    assert.equal(differing(one, two).length === puzzle.answer.keys.length, !spec.dependency);
  }
});

test('review: one worker holds both copies and needs the dependency part for the ignore list', () => {
  for (const spec of specs('review')) {
    if (spec.workers !== 1) continue;
    const puzzle = review(spec);
    const part = puzzle.parts[0] as ReviewPuzzle['parts'][number];
    assert.equal(part.copies.length, 2);
    assert.equal(JSON.stringify(part).includes('ignore'), false);
    const [one, two] = part.copies as Copies;
    assert.equal(differing(one, two).length === puzzle.answer.keys.length, !spec.dependency);
  }
});
