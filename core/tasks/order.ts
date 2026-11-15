import { config } from '../config.ts';
import { createRng } from '../rng.ts';
import type { ItemSize, OrderClue, OrderPuzzle, WorkerCount } from '../types.ts';
import { Components } from './data.ts';

/**
 * Builds an order puzzle: "X starts after Y" clues that allow exactly one start order, the dependency holding one chain link.
 */
export function generateOrder(size: ItemSize, seed: number, workers: WorkerCount, dependency: boolean): OrderPuzzle {
  const rng = createRng(seed);
  const table = config.puzzle.sizes.order[size];
  const count = table.components;
  const order = rng.shuffle(Components).slice(0, count);
  const chain: OrderClue[] = [];
  const spare: OrderClue[] = [];
  for (let later = 1; later < count; later += 1) {
    for (let earlier = 0; earlier < later; earlier += 1) {
      const clue = { before: order[earlier] as string, after: order[later] as string };
      (later - earlier === 1 ? chain : spare).push(clue);
    }
  }
  const shuffledChain = rng.shuffle(chain);
  const withheld = dependency ? (shuffledChain.shift() as OrderClue) : null;
  const extras = rng.shuffle(spare).slice(0, table.spare);
  const deal: OrderClue[][] = Array.from({ length: workers }, () => []);
  [...shuffledChain, ...extras].forEach((clue, index) => (deal[index % workers] as OrderClue[]).push(clue));
  const start = [...order].sort();
  if (start.every((name, index) => name === order[index])) start.reverse();
  const all = rng.shuffle([...chain, ...extras]);
  return {
    kind: 'order',
    size,
    seed,
    workers,
    dependency,
    parts: deal.map((clues) => ({
      kind: 'order' as const,
      scope: 'worker' as const,
      components: start,
      clues: rng.shuffle(clues),
    })),
    dependencyPart: withheld ? { kind: 'order', scope: 'dependency', clues: [withheld] } : null,
    fullPart: { kind: 'order', scope: 'full', components: start, clues: all },
    answer: { kind: 'order', order },
  };
}
