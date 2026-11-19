import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createRng, deriveKey } from '../rng.ts';
import { sha256Hex, toHex, sha256 } from '../sha256.ts';

test('D-036: the hand-written SHA-256 matches the standard vectors', () => {
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(
    sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  );
  assert.equal(
    sha256Hex('abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu'),
    'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1',
  );
  for (let length = 0; length < 300; length += 1) {
    const bytes = Uint8Array.from({ length }, (_, index) => (index * 31 + length) & 0xff);
    assert.equal(toHex(sha256(bytes)), createHash('sha256').update(bytes).digest('hex'));
  }
});

test('a generator is deterministic and depends on secret and label', () => {
  const draw = (secret: string, label: string): number[] => {
    const rng = createRng(secret, label);
    return Array.from({ length: 8 }, () => rng.next());
  };
  assert.deepEqual(draw('a', 'x'), draw('a', 'x'));
  assert.notDeepEqual(draw('a', 'x'), draw('b', 'x'));
  assert.notDeepEqual(draw('a', 'x'), draw('a', 'y'));
  for (const value of draw('a', 'x')) assert.ok(value >= 0 && value < 1);
});

test('state() lets a stream continue where it stopped', () => {
  const first = createRng('secret', 'machine');
  first.next();
  first.next();
  const resumed = createRng('secret', 'machine', first.state());
  assert.deepEqual([first.next(), first.int(1000)], [resumed.next(), resumed.int(1000)]);
});

test('int, pick and shuffle stay in range and keep every item', () => {
  const rng = createRng('secret', 'range');
  const seen = new Set<number>();
  for (let index = 0; index < 600; index += 1) {
    const value = rng.int(6);
    assert.ok(Number.isInteger(value) && value >= 0 && value < 6);
    seen.add(value);
  }
  assert.equal(seen.size, 6);
  const items = [1, 2, 3, 4, 5, 6, 7];
  assert.deepEqual([...createRng('s', 'l').shuffle(items)].sort(), items);
  assert.ok(items.includes(createRng('s', 'l').pick(items)));
});

test('derived keys are 256-bit hex and differ by label', () => {
  assert.match(deriveKey('secret', 'item:1'), /^[0-9a-f]{64}$/);
  assert.notEqual(deriveKey('secret', 'item:1'), deriveKey('secret', 'item:2'));
  assert.notEqual(deriveKey('secret', 'item:1'), deriveKey('other', 'item:1'));
});
