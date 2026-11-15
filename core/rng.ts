export interface Draw<T> {
  value: T;
  state: number;
}

export interface Rng {
  next(): number;
  int(bound: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  state(): number;
}

/**
 * FNV-1a hash of a text, as an unsigned 32-bit number.
 */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Derives a new 32-bit seed from a seed and a salt, so one room seed can feed many independent streams.
 */
export function mixSeed(seed: number, salt: number | string): number {
  return hashSeed(`${seed >>> 0}:${salt}`);
}

/**
 * Advances a generator state by one step; the state is a plain number that can be stored.
 */
export function nextState(state: number): number {
  return (state + 0x6d2b79f5) >>> 0;
}

/**
 * The number in [0, 1) that a generator state stands for.
 */
export function valueOf(state: number): number {
  let mixed = state >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
}

/**
 * Draws a number in [0, 1) and returns it with the next state.
 */
export function draw(state: number): Draw<number> {
  const next = nextState(state);
  return { value: valueOf(next), state: next };
}

/**
 * Draws an integer in [0, bound) and returns it with the next state.
 */
export function drawInt(state: number, bound: number): Draw<number> {
  const result = draw(state);
  return { value: Math.floor(result.value * bound), state: result.state };
}

/**
 * Draws one of the items and returns it with the next state.
 */
export function drawPick<T>(state: number, items: readonly T[]): Draw<T> {
  const result = drawInt(state, items.length);
  return { value: items[result.value] as T, state: result.state };
}

/**
 * Returns a shuffled copy of the items and the next state.
 */
export function drawShuffle<T>(state: number, items: readonly T[]): Draw<T[]> {
  const out = [...items];
  let current = state;
  for (let index = out.length - 1; index > 0; index -= 1) {
    const result = drawInt(current, index + 1);
    current = result.state;
    const other = result.value;
    const held = out[index] as T;
    out[index] = out[other] as T;
    out[other] = held;
  }
  return { value: out, state: current };
}

/**
 * A stateful convenience wrapper over the plain-number functions, for code that draws many values in one call.
 */
export function createRng(seedOrState: number): Rng {
  let current = seedOrState >>> 0;
  const next = (): number => {
    const result = draw(current);
    current = result.state;
    return result.value;
  };
  const int = (bound: number): number => Math.floor(next() * bound);
  return {
    next,
    int,
    pick: <T>(items: readonly T[]): T => items[int(items.length)] as T,
    shuffle: <T>(items: readonly T[]): T[] => {
      const result = drawShuffle(current, items);
      current = result.state;
      return result.value;
    },
    state: () => current,
  };
}
