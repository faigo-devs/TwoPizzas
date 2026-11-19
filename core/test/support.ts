import { sha256Hex } from '../sha256.ts';
import type { ItemSize, PuzzleKind, PuzzleSpec, WorkerCount } from '../types.ts';

export const Kinds: PuzzleKind[] = ['review', 'order', 'incident', 'merge'];
export const Sizes: ItemSize[] = ['S', 'M', 'L'];
export const WorkerCounts: WorkerCount[] = [1, 2];
export const SeedCount = 40;

export function testSecret(label: string | number): string {
  return sha256Hex(`test-secret:${label}`);
}

export function specs(kind: PuzzleKind, seedCount: number = SeedCount): PuzzleSpec[] {
  const out: PuzzleSpec[] = [];
  for (let index = 0; index < seedCount; index += 1) {
    const seed = testSecret(`test:${kind}:${index}`);
    for (const size of Sizes) {
      for (const workers of WorkerCounts) {
        for (const dependency of [false, true]) out.push({ kind, size, seed, workers, dependency });
      }
    }
  }
  return out;
}

export function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]),
  );
}

export function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const item of value) strings(item, out);
  else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      out.push(key);
      strings(item, out);
    }
  }
  return out;
}
