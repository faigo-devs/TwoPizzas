import { config } from '../config.ts';
import type { IterationNumber, IterationState, RoomState } from '../types.ts';
import { generateBacklog, makeArrival, sizeList } from './backlog.ts';
import { currentIteration } from './util.ts';

function count(s: RoomState, status: 'todo' | 'doing' | 'review' | 'done'): number {
  return s.items.filter((item) => item.status === status).length;
}

/**
 * True when starting a new item is refused because In Progress is at its limit.
 */
export function startBlocked(s: RoomState): boolean {
  if (s.framework !== 'kanban' || s.iterations.length === 0) return false;
  const limit = currentIteration(s).wipLimits.inProgress;
  return limit !== null && count(s, 'doing') >= limit;
}

/**
 * True when submitting an item to Review is refused because Review is at its limit.
 */
export function submitBlocked(s: RoomState): boolean {
  if (s.framework !== 'kanban' || s.iterations.length === 0) return false;
  const limit = currentIteration(s).wipLimits.review;
  return limit !== null && count(s, 'review') >= limit;
}

/**
 * How many requests arrive during one round.
 */
export function arrivalsTotal(): number {
  return sizeList(config.kanban.arrivalComposition).length;
}

/**
 * Opens a Kanban round: round 2 starts from an empty board, and the opening pool is drawn for either round.
 */
export function flowIterationStart(s: RoomState, iteration: IterationNumber): void {
  if (iteration === 2) s.items = s.items.filter((item) => item.iteration >= 2);
  generateBacklog(s, config.kanban.poolComposition, iteration);
}

/**
 * Starts the arrival clock when the first half of the Flow begins.
 */
export function flowBegin(s: RoomState): void {
  const state = currentIteration(s);
  state.arrivalsLeft = arrivalsTotal();
  state.nextArrivalAt = s.now + config.kanban.arrivalIntervalMs;
}

/**
 * Moves the next arrival later by the time the daily stopped the Flow clock.
 */
export function flowResume(s: RoomState, state: IterationState): void {
  const span = state.dailySpan;
  if (state.nextArrivalAt === null || span === null || span.to === null) return;
  state.nextArrivalAt += span.to - span.from;
}

/**
 * Lets every request that is due by the cut-off arrive in Ready, stamped with its own scheduled time.
 */
export function arrivalsDue(s: RoomState, cutoff: number): void {
  const state = currentIteration(s);
  while (state.arrivalsLeft > 0 && state.nextArrivalAt !== null && state.nextArrivalAt <= cutoff) {
    const index = arrivalsTotal() - state.arrivalsLeft;
    s.items.push(makeArrival(s, state.iteration, index, state.nextArrivalAt));
    state.arrivalsLeft -= 1;
    state.nextArrivalAt = state.arrivalsLeft > 0 ? state.nextArrivalAt + config.kanban.arrivalIntervalMs : null;
  }
}

/**
 * The scheduled time of the next arrival while the Flow clock runs, otherwise null.
 */
export function pendingArrival(s: RoomState): number | null {
  if (s.framework !== 'kanban' || s.iterations.length === 0) return null;
  if (s.phase.kind !== 'work' || s.phase.step !== 'running') return null;
  const state = currentIteration(s);
  return state.arrivalsLeft > 0 ? state.nextArrivalAt : null;
}
