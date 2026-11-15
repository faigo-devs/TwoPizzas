import { config } from '../config.ts';
import type {
  Card,
  ErrorCode,
  ItemId,
  IterationNumber,
  IterationState,
  Player,
  PlayerId,
  RoomState,
  Signals,
  Timebox,
  WorkItem,
} from '../types.ts';

export type Refusal = ErrorCode | null;

export function findPlayer(s: RoomState, id: PlayerId): Player | undefined {
  return s.players.find((player) => player.id === id);
}

export function findItem(s: RoomState, id: ItemId): WorkItem | undefined {
  return s.items.find((item) => item.id === id);
}

export function connectedPlayers(s: RoomState): Player[] {
  return s.players.filter((player) => player.connected);
}

export function currentIteration(s: RoomState): IterationState {
  const last = s.iterations[s.iterations.length - 1];
  if (last === undefined) throw new Error('no iteration');
  return last;
}

export function iterationAt(s: RoomState, iteration: IterationNumber): IterationState {
  const found = s.iterations[iteration - 1];
  if (found === undefined) throw new Error('no iteration');
  return found;
}

export function at(list: readonly number[], iteration: IterationNumber): number {
  return list[iteration - 1] ?? 0;
}

export function box(durationMs: number, hard: boolean): Timebox {
  return { durationMs, startedAt: null, deadline: null, hard };
}

export function startBox(timebox: Timebox, now: number): void {
  timebox.startedAt = now;
  timebox.deadline = now + timebox.durationMs;
}

export function emptySignals(): Signals {
  return {
    planOverrunMs: 0,
    unestimatedPulled: 0,
    committedEstimate: 0,
    previousVelocity: null,
    dailyOverrunMs: 0,
    blockedUnhelpedAtDaily: 0,
    reviewWaitingAtDaily: 0,
    dailyChanges: 0,
    wipMax: 0,
    maxReviewWaitMs: 0,
    pairWaitMs: 0,
    agreementViolations: 0,
  };
}

/**
 * Trims, collapses whitespace, drops control characters and cuts to a number of characters.
 */
export function sanitize(text: string, max: number): string {
  const collapsed = text.replace(/\s+/gu, ' ').replace(/\p{Cc}/gu, '').trim();
  return Array.from(collapsed).slice(0, max).join('').trim();
}

export function itemNumber(id: ItemId): number {
  return Number(id.slice(1));
}

export function isCard(value: unknown): value is Card {
  return typeof value === 'number' && (config.poker.cards as readonly number[]).includes(value);
}

export function median(cards: Card[]): Card {
  const sorted = [...cards].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 1;
}

export function doingCount(s: RoomState): number {
  return s.items.filter((item) => item.status === 'doing').length;
}

export function isRunning(s: RoomState): boolean {
  return s.phase.kind === 'work' && s.phase.step === 'running';
}

export function isWalk(s: RoomState): boolean {
  return s.phase.kind === 'daily' && s.phase.step === 'walk';
}

export function isBlocked(item: WorkItem): boolean {
  return item.dependency && item.puzzle !== null && item.status === 'doing' && item.changesRequested === 0;
}

export function waitsForPair(item: WorkItem): boolean {
  return item.status === 'doing' && item.workers.length < item.workersNeeded;
}

export function workElapsed(iteration: IterationState, from: number, to: number): number {
  let total = Math.max(0, to - from);
  const span = iteration.dailySpan;
  if (span !== null) {
    const overlap = Math.min(to, span.to ?? to) - Math.max(from, span.from);
    if (overlap > 0) total -= overlap;
  }
  return Math.max(0, total);
}

export function nextConnectedAfter(s: RoomState, id: PlayerId | null): Player | undefined {
  const ordered = [...s.players].sort((a, b) => a.seat - b.seat);
  const start = ordered.findIndex((player) => player.id === id);
  for (let step = 1; step <= ordered.length; step += 1) {
    const candidate = ordered[(start + step + ordered.length) % ordered.length];
    if (candidate !== undefined && candidate.connected && candidate.id !== id) return candidate;
  }
  return undefined;
}

export function sprintItems(s: RoomState, iteration: IterationNumber): WorkItem[] {
  return s.items.filter((item) => item.iteration === iteration && item.status !== 'backlog');
}

export function resetItem(item: WorkItem): void {
  item.status = 'backlog';
  item.workers = [];
  item.dependencyHolder = null;
  item.helpPromisedBy = null;
  item.waitingSince = null;
  item.puzzle = null;
  item.submission = null;
  item.submittedBy = null;
  item.reviewer = null;
  item.reviewedBy = null;
  item.changesRequested = 0;
  item.outcome = null;
  item.times.startedAt = null;
  item.times.submittedAt = null;
  item.times.reviewStartedAt = null;
  item.times.doneAt = null;
}
