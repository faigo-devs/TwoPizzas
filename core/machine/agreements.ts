import { config } from '../config.ts';
import type { Agreement, AgreementOutcome, RoomState, WorkItem } from '../types.ts';
import { currentIteration, doingCount, iterationAt, isBlocked, sanitize, workElapsed } from './util.ts';

/**
 * The agreement chosen in the previous iteration, tracked while the current one runs; null in the first iteration.
 */
export function activeAgreement(s: RoomState): Agreement | null {
  if (s.iterations.length < 2) return null;
  return iterationAt(s, 1).retro.action;
}

function violate(s: RoomState): void {
  currentIteration(s).signals.agreementViolations += 1;
}

function isLarge(item: WorkItem): boolean {
  return item.size === 'L';
}

function unstaffedLarge(s: RoomState, started: WorkItem): boolean {
  return s.items.some(
    (item) =>
      item.id !== started.id &&
      isLarge(item) &&
      item.iteration === started.iteration &&
      (item.status === 'doing' ? item.workers.length < item.workersNeeded : item.status === 'todo') &&
      !(isLarge(started) && item.status === 'todo'),
  );
}

/**
 * Called when an item gets its first worker; counts a broken agreement.
 */
export function onItemStarted(s: RoomState, started: WorkItem): void {
  const agreement = activeAgreement(s);
  if (agreement === null) return;
  if (agreement.type === 'wip_limit' && doingCount(s) > agreement.max) violate(s);
  if (agreement.type === 'no_new_while_blocked') {
    const blockedAlone = s.items.some(
      (item) => item.id !== started.id && isBlocked(item) && item.helpPromisedBy === null,
    );
    if (blockedAlone) violate(s);
  }
  if (agreement.type === 'pair_first' && unstaffedLarge(s, started)) violate(s);
}

/**
 * Called with the working time an item waited in Review before a reviewer took it.
 */
export function onReviewWaited(s: RoomState, waitedMs: number): void {
  const iteration = currentIteration(s);
  iteration.signals.maxReviewWaitMs = Math.max(iteration.signals.maxReviewWaitMs, waitedMs);
  const agreement = activeAgreement(s);
  if (agreement !== null && agreement.type === 'review_wait' && waitedMs > agreement.maxMs) violate(s);
}

/**
 * At the end of the Sprint: pair waits and Review waits that never ended are counted.
 */
export function sweepOpenWaits(s: RoomState): void {
  const iteration = currentIteration(s);
  for (const item of s.items) {
    if (item.waitingSince !== null) {
      iteration.signals.pairWaitMs += workElapsed(iteration, item.waitingSince, s.now);
      item.waitingSince = null;
    }
    if (item.status === 'review' && item.reviewer === null && item.times.submittedAt !== null) {
      onReviewWaited(s, workElapsed(iteration, item.times.submittedAt, s.now));
    }
  }
}

/**
 * The result of the tracked agreement for the iteration that just ran.
 */
export function agreementOutcome(s: RoomState): AgreementOutcome | null {
  const agreement = activeAgreement(s);
  if (agreement === null) return null;
  if (agreement.type === 'free') return { agreement, kept: null };
  return { agreement, kept: currentIteration(s).signals.agreementViolations === 0 };
}

/**
 * Checks an agreement a facilitator chose and returns a clean copy, or null when it is not allowed here.
 */
export function cleanAgreement(agreement: Agreement): Agreement | null {
  if (agreement.type === 'wip_limit') {
    const { max } = agreement;
    const valid = Number.isInteger(max) && max >= config.agreements.wipLimitMin && max <= config.agreements.wipLimitMax;
    return valid ? { type: 'wip_limit', max } : null;
  }
  if (agreement.type === 'review_wait') {
    return agreement.maxMs === config.agreements.reviewWaitMs ? { type: 'review_wait', maxMs: agreement.maxMs } : null;
  }
  if (agreement.type === 'no_new_while_blocked') return { type: 'no_new_while_blocked' };
  if (agreement.type === 'pair_first') return { type: 'pair_first' };
  if (agreement.type === 'free') {
    const text = sanitize(agreement.text, config.retro.freeActionMax);
    return text.length > 0 ? { type: 'free', text } : null;
  }
  return null;
}
