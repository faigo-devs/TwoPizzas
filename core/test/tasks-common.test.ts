import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { generatePuzzle, isCorrect, parseResponse } from '../tasks/index.ts';
import type { PuzzleKind } from '../types.ts';
import { Kinds, specs, strings } from './support.ts';

const Token = /^[a-z0-9][a-z0-9_.-]*$/;

test('the same spec gives the same puzzle, another seed another puzzle', () => {
  for (const kind of Kinds) {
    for (const spec of specs(kind, 10)) {
      assert.deepEqual(generatePuzzle(spec), generatePuzzle(spec));
      assert.notDeepEqual(generatePuzzle(spec), generatePuzzle({ ...spec, seed: `${spec.seed}x` }));
    }
  }
});

test('a puzzle has one part per worker and a dependency part only on request', () => {
  for (const kind of Kinds) {
    for (const spec of specs(kind)) {
      const puzzle = generatePuzzle(spec);
      assert.equal(puzzle.kind, kind);
      assert.equal(puzzle.parts.length, spec.workers);
      assert.equal(puzzle.dependencyPart === null, !spec.dependency);
      assert.equal(puzzle.fullPart.scope, 'full');
      for (const part of puzzle.parts) assert.equal(part.scope, 'worker');
      if (puzzle.dependencyPart) assert.equal(puzzle.dependencyPart.scope, 'dependency');
    }
  }
});

test('the answer is accepted and a response of another kind is refused', () => {
  for (const kind of Kinds) {
    const other = Kinds.find((candidate) => candidate !== kind) as PuzzleKind;
    for (const spec of specs(kind, 10)) {
      const puzzle = generatePuzzle(spec);
      assert.equal(isCorrect(puzzle, puzzle.answer), true);
      const foreign = generatePuzzle({ ...spec, kind: other }).answer;
      assert.equal(isCorrect(puzzle, foreign), false);
    }
  }
});

test('parts never carry the answer field and every generated token is English technical text', () => {
  for (const kind of Kinds) {
    for (const spec of specs(kind)) {
      const puzzle = generatePuzzle(spec);
      const visible = [...puzzle.parts, puzzle.dependencyPart, puzzle.fullPart];
      for (const part of visible) {
        assert.equal(JSON.stringify(part).includes('"answer"'), false);
        for (const text of strings(part)) assert.match(text, Token);
      }
      for (const text of strings(puzzle.answer)) assert.match(text, Token);
    }
  }
});

test('puzzles are plain JSON data', () => {
  for (const kind of Kinds) {
    for (const spec of specs(kind, 5)) {
      const puzzle = generatePuzzle(spec);
      assert.deepEqual(JSON.parse(JSON.stringify(puzzle)), puzzle);
    }
  }
});

test('the answer travels through the wire parser unchanged', () => {
  for (const kind of Kinds) {
    for (const spec of specs(kind, 10)) {
      const puzzle = generatePuzzle(spec);
      const parsed = parseResponse(kind, JSON.parse(JSON.stringify(puzzle.answer)));
      assert.notEqual(parsed, null);
      assert.equal(isCorrect(puzzle, parsed as NonNullable<typeof parsed>), true);
    }
  }
});

test('malformed responses are rejected', () => {
  const longToken = 'a'.repeat(config.puzzle.limits.tokenLengthMax + 1);
  const longList = Array.from({ length: config.puzzle.limits.listLengthMax + 1 }, (_, index) => `k${index}`);
  const cases: [PuzzleKind, unknown][] = [
    ['review', null],
    ['review', 'text'],
    ['review', []],
    ['review', {}],
    ['review', { kind: 'order', keys: [] }],
    ['review', { kind: 'review' }],
    ['review', { kind: 'review', keys: 'a' }],
    ['review', { kind: 'review', keys: [1] }],
    ['review', { kind: 'review', keys: ['A'] }],
    ['review', { kind: 'review', keys: ['a b'] }],
    ['review', { kind: 'review', keys: [''] }],
    ['review', { kind: 'review', keys: [longToken] }],
    ['review', { kind: 'review', keys: longList }],
    ['review', { kind: 'review', keys: ['a', 'a'] }],
    ['review', { kind: 'review', keys: ['a'], extra: 1 }],
    ['order', { kind: 'order', order: 'a' }],
    ['order', { kind: 'order', order: ['a', 'a'] }],
    ['order', { kind: 'order', order: [null] }],
    ['order', { kind: 'order', order: longList }],
    ['incident', { kind: 'incident', action: 5 }],
    ['incident', { kind: 'incident', action: longToken }],
    ['incident', { kind: 'incident', action: 'Restart' }],
    ['incident', { kind: 'incident', action: 'a', other: 'b' }],
    ['incident', { kind: 'incident' }],
    ['merge', { kind: 'merge', values: 'a' }],
    ['merge', { kind: 'merge', values: ['1'] }],
    ['merge', { kind: 'merge', values: [1.5] }],
    ['merge', { kind: 'merge', values: [-1] }],
    ['merge', { kind: 'merge', values: [Number.NaN] }],
    ['merge', { kind: 'merge', values: [Infinity] }],
    ['merge', { kind: 'merge', values: [config.puzzle.limits.mergeValueMax + 1] }],
    ['merge', { kind: 'merge', values: Array.from({ length: 33 }, () => 1) }],
    ['merge', { kind: 'merge', values: [1], key: 1 }],
    ['merge', JSON.parse('{"kind":"merge","values":[1],"__proto__":{"x":1}}')],
  ];
  for (const [kind, raw] of cases) assert.equal(parseResponse(kind, raw), null, JSON.stringify(raw));
});

test('well-formed responses give a clean copy', () => {
  const raw = { kind: 'review', keys: ['port', 'retries'] };
  const parsed = parseResponse('review', raw);
  assert.deepEqual(parsed, raw);
  assert.notEqual(parsed, raw);
  assert.deepEqual(parseResponse('review', { kind: 'review', keys: [] }), { kind: 'review', keys: [] });
  assert.deepEqual(parseResponse('merge', { kind: 'merge', values: [0, 8080] }), { kind: 'merge', values: [0, 8080] });
});
