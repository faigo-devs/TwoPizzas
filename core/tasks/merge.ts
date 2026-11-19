import { config } from '../config.ts';
import { createRng } from '../rng.ts';
import type { ItemSize, MergeLine, MergePuzzle, MergeRule, WorkerCount } from '../types.ts';
import { MergeRules, MergeSettings } from './data.ts';

/**
 * Resolves a line changed by both sides under a merge rule.
 */
export function resolveConflict(rule: MergeRule, sideA: number, sideB: number): number {
  if (rule === 'max') return Math.max(sideA, sideB);
  if (rule === 'min') return Math.min(sideA, sideB);
  return rule === 'side_a' ? sideA : sideB;
}

/**
 * Builds a merge puzzle: a base file and two sides' changes, the merge rule decides lines both sides changed.
 */
export function generateMerge(size: ItemSize, seed: string, workers: WorkerCount, dependency: boolean): MergePuzzle {
  const rng = createRng(seed, 'puzzle');
  const table = config.puzzle.sizes.merge[size];
  const settings = rng.shuffle(MergeSettings).slice(0, table.lines);
  const rule = rng.pick(MergeRules);
  const roles = rng.shuffle(
    settings.map((_, line) => {
      if (line < table.conflicts) return 'conflict';
      if (line < table.conflicts + table.singles) return 'side_a';
      if (line < table.conflicts + 2 * table.singles) return 'side_b';
      return 'none';
    }),
  );
  let conflictIndex = 0;
  const lines: MergeLine[] = [];
  const merged: number[] = [];
  settings.forEach(([key, values], line) => {
    const [base, first, second] = rng.shuffle(values) as [number, number, number];
    const role = roles[line];
    if (role === 'conflict') {
      const low = Math.min(first, second);
      const high = Math.max(first, second);
      const sideAFirst = conflictIndex % 2 === 0;
      conflictIndex += 1;
      const sideA = sideAFirst ? low : high;
      const sideB = sideAFirst ? high : low;
      lines.push({ key, base, changes: [sideA, sideB] });
      merged.push(resolveConflict(rule, sideA, sideB));
    } else if (role === 'side_a') {
      lines.push({ key, base, changes: [first, null] });
      merged.push(first);
    } else if (role === 'side_b') {
      lines.push({ key, base, changes: [null, first] });
      merged.push(first);
    } else {
      lines.push({ key, base, changes: [null, null] });
      merged.push(base);
    }
  });
  const ownLines = (side: number): MergeLine[] =>
    lines.map((line) => ({ key: line.key, base: line.base, changes: [line.changes[side] ?? null] }));
  const shownRule = dependency ? null : rule;
  return {
    kind: 'merge',
    size,
    seed,
    workers,
    dependency,
    parts:
      workers === 1
        ? [{ kind: 'merge', scope: 'worker', sides: [0, 1], lines, rule: shownRule }]
        : [0, 1].map((side) => ({
            kind: 'merge' as const,
            scope: 'worker' as const,
            sides: [side],
            lines: ownLines(side),
            rule: shownRule,
          })),
    dependencyPart: dependency ? { kind: 'merge', scope: 'dependency', rule } : null,
    fullPart: { kind: 'merge', scope: 'full', sides: [0, 1], lines, rule },
    answer: { kind: 'merge', values: merged },
  };
}
