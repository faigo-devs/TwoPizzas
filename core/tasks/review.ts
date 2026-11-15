import { config } from '../config.ts';
import { createRng } from '../rng.ts';
import type { ItemSize, ReviewLine, ReviewPuzzle, WorkerCount } from '../types.ts';
import { ReviewSettings } from './data.ts';

/**
 * Builds a review puzzle: two copies of one file, the answer is the set of differing keys outside the ignore list.
 */
export function generateReview(size: ItemSize, seed: number, workers: WorkerCount, dependency: boolean): ReviewPuzzle {
  const rng = createRng(seed);
  const table = config.puzzle.sizes.review[size];
  const settings = rng.shuffle(ReviewSettings).slice(0, table.keys);
  const keys = settings.map(([key]) => key);
  const differing = new Set(rng.shuffle(keys).slice(0, table.differing));
  const ignore = dependency ? rng.shuffle([...differing]).slice(0, table.ignored).sort() : [];
  const copyA: ReviewLine[] = [];
  const copyB: ReviewLine[] = [];
  for (const [key, values] of settings) {
    const [base, other] = rng.shuffle(values) as [string, string];
    copyA.push({ key, value: base });
    copyB.push({ key, value: differing.has(key) ? other : base });
  }
  const copies = [rng.shuffle(copyA), rng.shuffle(copyB)];
  const answerKeys = [...differing].filter((key) => !ignore.includes(key)).sort();
  const parts =
    workers === 1
      ? [{ kind: 'review' as const, scope: 'worker' as const, copies }]
      : copies.map((copy) => ({ kind: 'review' as const, scope: 'worker' as const, copies: [copy] }));
  return {
    kind: 'review',
    size,
    seed,
    workers,
    dependency,
    parts,
    dependencyPart: dependency ? { kind: 'review', scope: 'dependency', ignore } : null,
    fullPart: { kind: 'review', scope: 'full', copies, ignore },
    answer: { kind: 'review', keys: answerKeys },
  };
}
