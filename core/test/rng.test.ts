import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createRng,
  draw,
  drawInt,
  drawPick,
  drawShuffle,
  hashSeed,
  mixSeed,
} from '../rng.ts';

test('the generator matches the earlier game for the same seed', () => {
  assert.equal(hashSeed('KTRM2:0'), 1049486709);
  const rng = createRng(hashSeed('KTRM2:0'));
  assert.equal(rng.next(), 0.3243221719749272);
  assert.equal(rng.next(), 0.7157772472128272);
  assert.equal(rng.next(), 0.20789474295452237);
});

test('plain-number state gives the same stream as the wrapper', () => {
  const rng = createRng(12345);
  let state = 12345;
  for (let index = 0; index < 50; index += 1) {
    const step = draw(state);
    state = step.state;
    assert.equal(step.value, rng.next());
    assert.equal(state, rng.state());
  }
});

test('state survives a JSON round trip', () => {
  const first = drawInt(99, 1000);
  const restored = JSON.parse(JSON.stringify({ state: first.state })) as { state: number };
  assert.deepEqual(drawInt(restored.state, 1000), drawInt(first.state, 1000));
});

test('values stay in range and bounds are respected', () => {
  let state = 7;
  for (let index = 0; index < 2000; index += 1) {
    const step = drawInt(state, 6);
    state = step.state;
    assert.ok(Number.isInteger(step.value) && step.value >= 0 && step.value < 6);
    const unit = draw(state);
    state = unit.state;
    assert.ok(unit.value >= 0 && unit.value < 1);
  }
});

test('pick and shuffle are deterministic and keep the items', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(drawShuffle(5, items), drawShuffle(5, items));
  assert.deepEqual([...drawShuffle(5, items).value].sort(), items);
  assert.ok(items.includes(drawPick(5, items).value));
  assert.deepEqual(items, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(createRng(3).shuffle(items), createRng(3).shuffle(items));
});

test('mixSeed gives unsigned numbers that depend on seed and salt', () => {
  const values = new Set([mixSeed(1, 'a'), mixSeed(1, 'b'), mixSeed(2, 'a'), mixSeed(1, 1)]);
  assert.equal(values.size, 4);
  for (const value of values) assert.ok(Number.isInteger(value) && value >= 0 && value < 2 ** 32);
});
