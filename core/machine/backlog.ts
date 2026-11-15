import { config } from '../config.ts';
import { createRng, mixSeed } from '../rng.ts';
import type { Rng } from '../rng.ts';
import type { ItemSize, IterationNumber, PuzzleKind, RoomState, Theme, WorkItem } from '../types.ts';
import { itemNumber } from './util.ts';

const Kinds: PuzzleKind[] = ['review', 'order', 'incident', 'merge'];
const SizeRank: Record<ItemSize, number> = { S: 0, M: 1, L: 2 };

interface Draft {
  size: ItemSize;
  kind: PuzzleKind;
  theme: Theme;
  value: number;
  dependency: boolean;
}

function sizeList(composition: Record<ItemSize, number>): ItemSize[] {
  const out: ItemSize[] = [];
  for (const size of ['S', 'M', 'L'] as const) {
    for (let count = 0; count < composition[size]; count += 1) out.push(size);
  }
  return out;
}

function isMonotone(sizes: ItemSize[]): boolean {
  const ranks = sizes.map((size) => SizeRank[size]);
  const rising = ranks.every((rank, index) => index === 0 || rank >= (ranks[index - 1] ?? 0));
  const falling = ranks.every((rank, index) => index === 0 || rank <= (ranks[index - 1] ?? 0));
  return rising || falling;
}

function pickSubjects(s: RoomState, rng: Rng, count: number): string[] {
  const used = new Set(s.items.map((item) => item.subject));
  const free = rng.shuffle(config.backlog.subjects.filter((subject) => !used.has(subject)));
  const fallback = rng.shuffle([...config.backlog.subjects]);
  return Array.from({ length: count }, (_, index) => free[index] ?? fallback[index % fallback.length] ?? 'item');
}

function dependencyFlags(sizes: ItemSize[], rng: Rng): boolean[] {
  const flags = sizes.map(() => false);
  for (const size of ['S', 'M', 'L'] as const) {
    const positions = sizes.flatMap((own, index) => (own === size ? [index] : []));
    const chosen = rng.shuffle(positions).slice(0, config.backlog.dependencies[size]);
    for (const position of chosen) flags[position] = true;
  }
  return flags;
}

function buildItem(s: RoomState, draft: Draft, iteration: IterationNumber, subject: string): WorkItem {
  const number = s.nextItemNumber;
  s.nextItemNumber += 1;
  return {
    id: `#${number}`,
    iteration,
    kind: draft.kind,
    size: draft.size,
    value: draft.value,
    theme: draft.theme,
    subject,
    seed: mixSeed(s.seed, `item:${number}`),
    estimate: null,
    status: 'backlog',
    workersNeeded: config.backlog.workersNeeded[draft.size],
    workers: [],
    dependency: draft.dependency,
    dependencyHolder: null,
    helpPromisedBy: null,
    waitingSince: null,
    defect: false,
    puzzle: null,
    submission: null,
    submittedBy: null,
    reviewer: null,
    reviewedBy: null,
    changesRequested: 0,
    outcome: null,
    times: {
      createdAt: s.now,
      arrivedAt: null,
      readyAt: null,
      startedAt: null,
      submittedAt: null,
      reviewStartedAt: null,
      doneAt: null,
    },
  };
}

/**
 * Builds the ten items of the first backlog, ordered by value; priority order is never size order.
 */
export function generateBacklog(s: RoomState): void {
  const rng = createRng(s.rng);
  const sizes = sizeList(config.backlog.composition);
  const themes = rng.shuffle([...config.backlog.themes, ...config.backlog.themes, ...config.backlog.themes, rng.pick(config.backlog.themes)]);
  const kinds = rng.shuffle([...Kinds, ...Kinds, ...rng.shuffle(Kinds).slice(0, Math.max(0, sizes.length - 2 * Kinds.length))]);
  const flags = dependencyFlags(sizes, rng);
  let values: number[] = [];
  let order: number[] = [];
  for (let attempt = 0; attempt < 100; attempt += 1) {
    values = sizes.map(() => config.backlog.valueMin + rng.int(config.backlog.valueMax - config.backlog.valueMin + 1));
    order = sizes.map((_, index) => index).sort((a, b) => (values[b] ?? 0) - (values[a] ?? 0) || a - b);
    if (!isMonotone(order.map((index) => sizes[index] as ItemSize)) && new Set(values).size >= 5) break;
  }
  const subjects = pickSubjects(s, rng, sizes.length);
  const items = order.map((index, rank) =>
    buildItem(
      s,
      {
        size: sizes[index] as ItemSize,
        kind: kinds[index % kinds.length] as PuzzleKind,
        theme: themes[index % themes.length] as Theme,
        value: values[index] as number,
        dependency: flags[index] as boolean,
      },
      1,
      subjects[rank] as string,
    ),
  );
  s.items.push(...items);
  s.rng = rng.state();
}

/**
 * Adds the customers' new items for the next iteration and returns them.
 */
export function generateFeedbackItems(s: RoomState, iteration: IterationNumber): WorkItem[] {
  const rng = createRng(s.rng);
  const sizes = sizeList(config.feedback.composition);
  const subjects = pickSubjects(s, rng, sizes.length);
  const items = sizes.map((size, index) =>
    buildItem(
      s,
      {
        size,
        kind: rng.pick(Kinds),
        theme: rng.pick(config.backlog.themes),
        value: config.backlog.valueMin + rng.int(config.backlog.valueMax - config.backlog.valueMin + 1),
        dependency: size === 'L' ? true : size === 'M' ? rng.next() < 0.5 : false,
      },
      iteration,
      subjects[index] as string,
    ),
  );
  s.items.push(...items);
  s.rng = rng.state();
  return items;
}

/**
 * Orders the backlog: escaped defects first, then by value, then by id; other items keep their place after it.
 */
export function reorderBacklog(s: RoomState): void {
  const backlog = s.items.filter((item) => item.status === 'backlog');
  backlog.sort(
    (a, b) => Number(b.defect) - Number(a.defect) || b.value - a.value || itemNumber(a.id) - itemNumber(b.id),
  );
  s.items = [...backlog, ...s.items.filter((item) => item.status !== 'backlog')];
}
