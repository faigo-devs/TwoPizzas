import { sha256Hex, sha256Text } from './sha256.ts';

export interface Rng {
  next(): number;
  int(bound: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  state(): number;
}

const Scale = 2 ** 48;

/**
 * A one-way key for a label under a secret: SHA-256 of the secret, a separator and the label, in hexadecimal.
 */
export function deriveKey(secret: string, label: string): string {
  return sha256Hex(`${secret}|key|${label}`);
}

/**
 * A generator keyed by a secret and a label; number n is 48 bits of SHA-256 of secret, label and n, and state() is the count of numbers drawn so a stream can continue later.
 */
export function createRng(secret: string, label: string, drawn = 0): Rng {
  let counter = drawn;
  const next = (): number => {
    const block = sha256Text(`${secret}|rng|${label}|${counter}`);
    counter += 1;
    let value = 0;
    for (let index = 0; index < 6; index += 1) value = value * 256 + (block[index] as number);
    return value / Scale;
  };
  const int = (bound: number): number => Math.floor(next() * bound);
  return {
    next,
    int,
    pick: <T>(items: readonly T[]): T => items[int(items.length)] as T,
    shuffle: <T>(items: readonly T[]): T[] => {
      const out = [...items];
      for (let index = out.length - 1; index > 0; index -= 1) {
        const other = int(index + 1);
        const held = out[index] as T;
        out[index] = out[other] as T;
        out[other] = held;
      }
      return out;
    },
    state: () => counter,
  };
}
