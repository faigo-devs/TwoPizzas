import { config } from '../config.ts';
import { generatePuzzle, parseResponse } from '../tasks/index.ts';
import type { Player, PlayerId, RoomState, StampedClientAction, WorkItem } from '../types.ts';
import { onItemStarted, onReviewWaited } from './agreements.ts';
import {
  currentIteration,
  doingCount,
  findItem,
  isBlocked,
  isRunning,
  isWalk,
  resetItem,
  type Refusal,
  waitsForPair,
  workElapsed,
} from './util.ts';

function holdCount(s: RoomState, id: PlayerId): number {
  return s.items.filter((item) => item.status === 'doing' && item.dependencyHolder === id).length;
}

function chooseHolder(s: RoomState, item: WorkItem): PlayerId | null {
  const outside = s.players.filter((player) => !item.workers.includes(player.id));
  const present = outside.filter((player) => player.connected);
  const pool = present.length > 0 ? present : outside;
  const ranked = [...pool].sort((a, b) => holdCount(s, a.id) - holdCount(s, b.id) || a.seat - b.seat);
  return ranked[0]?.id ?? null;
}

function buildPuzzle(s: RoomState, item: WorkItem): void {
  item.puzzle = generatePuzzle({
    kind: item.kind,
    size: item.size,
    seed: item.seed,
    workers: item.workersNeeded,
    dependency: item.dependency,
  });
  item.dependencyHolder = item.dependency ? chooseHolder(s, item) : null;
}

function completePair(s: RoomState, item: WorkItem): void {
  if (item.waitingSince !== null) {
    const state = currentIteration(s);
    state.signals.pairWaitMs += workElapsed(state, item.waitingSince, s.now);
    item.waitingSince = null;
  }
  buildPuzzle(s, item);
}

function closeFor(s: RoomState, item: WorkItem, mode?: 'work' | 'review'): void {
  for (const player of s.players) {
    if (player.open !== null && player.open.itemId === item.id && (mode === undefined || player.open.mode === mode)) {
      player.open = null;
    }
  }
}

function countDailyChange(s: RoomState): void {
  if (s.phase.kind === 'daily') currentIteration(s).signals.dailyChanges += 1;
}

/**
 * Takes a worker off an item, or a reviewer claim; also used when a disconnected player's items are released.
 */
export function releaseFrom(s: RoomState, item: WorkItem, id: PlayerId): void {
  if (item.status === 'review' && item.reviewer === id) {
    item.reviewer = null;
    item.times.reviewStartedAt = null;
    return;
  }
  if (item.status !== 'doing' || !item.workers.includes(id)) return;
  item.workers = item.workers.filter((worker) => worker !== id);
  if (item.workers.length === 0) {
    resetItem(item);
    item.status = 'todo';
    return;
  }
  item.puzzle = null;
  item.dependencyHolder = null;
  item.helpPromisedBy = null;
  item.waitingSince = s.now;
}

/**
 * Releases everything one player holds on the board: worked items, review claims, help promises, the open item.
 */
export function releaseAll(s: RoomState, id: PlayerId): void {
  for (const item of s.items) {
    if (item.helpPromisedBy === id) item.helpPromisedBy = null;
    if (item.workers.includes(id) || item.reviewer === id) releaseFrom(s, item, id);
  }
  const player = s.players.find((own) => own.id === id);
  if (player !== undefined) player.open = null;
  for (const item of s.items) {
    if (item.status === 'doing' && item.puzzle !== null && item.dependency && item.dependencyHolder === id) {
      item.dependencyHolder = chooseHolder(s, item);
    }
  }
}

function openFor(p: Player, item: WorkItem, mode: 'work' | 'review', now: number): void {
  p.open = { itemId: item.id, mode, readyAt: now + config.contextSwitchMs };
}

/**
 * Handles the board actions of the Sprint and the re-planning actions of the Daily Scrum.
 */
export function workAction(s: RoomState, action: StampedClientAction, p: Player): Refusal {
  const running = isRunning(s);
  const walking = isWalk(s);
  if (!running && !walking) return 'not_allowed';
  switch (action.type) {
    case 'item.take': {
      const item = findItem(s, action.itemId);
      if (item === undefined) return 'bad_request';
      if (item.workers.includes(p.id)) return 'not_allowed';
      if (item.status === 'todo') {
        if (!running) return 'not_allowed';
        item.status = 'doing';
        item.workers = [p.id];
        item.times.startedAt = s.now;
        if (item.workersNeeded === 1) buildPuzzle(s, item);
        else item.waitingSince = s.now;
        onItemStarted(s, item);
        return null;
      }
      if (item.status === 'doing' && waitsForPair(item)) {
        item.workers.push(p.id);
        if (item.workers.length === item.workersNeeded) completePair(s, item);
        countDailyChange(s);
        return null;
      }
      return 'not_allowed';
    }
    case 'item.leave': {
      const item = findItem(s, action.itemId);
      if (item === undefined) return 'bad_request';
      const asWorker = item.status === 'doing' && item.workers.includes(p.id);
      const asReviewer = item.status === 'review' && item.reviewer === p.id;
      if (!asWorker && !asReviewer) return 'not_allowed';
      releaseFrom(s, item, p.id);
      if (p.open !== null && p.open.itemId === item.id) p.open = null;
      countDailyChange(s);
      return null;
    }
    case 'item.open': {
      if (!running) return 'not_allowed';
      const item = findItem(s, action.itemId);
      if (item === undefined) return 'bad_request';
      if (p.open !== null && p.open.itemId === item.id && p.open.mode === action.mode) return 'not_allowed';
      if (action.mode === 'work') {
        if (item.status !== 'doing' || !item.workers.includes(p.id) || item.puzzle === null) return 'not_allowed';
      } else if (item.status !== 'review' || item.reviewer !== p.id) return 'not_allowed';
      openFor(p, item, action.mode, s.now);
      return null;
    }
    case 'item.close': {
      if (!running || p.open === null) return 'not_allowed';
      p.open = null;
      return null;
    }
    case 'item.submit': {
      if (!running) return 'not_allowed';
      const item = findItem(s, action.itemId);
      if (item === undefined) return 'bad_request';
      const open = p.open;
      if (item.status !== 'doing' || !item.workers.includes(p.id) || item.puzzle === null) return 'not_allowed';
      if (open === null || open.itemId !== item.id || open.mode !== 'work' || s.now < open.readyAt) return 'not_allowed';
      const response = parseResponse(item.kind, action.response);
      if (response === null) return 'bad_request';
      item.submission = response;
      item.submittedBy = p.id;
      item.status = 'review';
      item.times.submittedAt = s.now;
      item.reviewer = null;
      closeFor(s, item, 'work');
      return null;
    }
    case 'item.take_review': {
      const item = findItem(s, action.itemId);
      if (item === undefined) return 'bad_request';
      if (item.status !== 'review' || item.reviewer !== null || item.workers.includes(p.id)) return 'not_allowed';
      const state = currentIteration(s);
      if (item.times.submittedAt !== null) onReviewWaited(s, workElapsed(state, item.times.submittedAt, s.now));
      item.reviewer = p.id;
      item.times.reviewStartedAt = s.now;
      if (running) openFor(p, item, 'review', s.now);
      else countDailyChange(s);
      return null;
    }
    case 'item.verdict': {
      if (!running) return 'not_allowed';
      const item = findItem(s, action.itemId);
      if (item === undefined) return 'bad_request';
      const open = p.open;
      if (item.status !== 'review' || item.reviewer !== p.id) return 'not_allowed';
      if (open === null || open.itemId !== item.id || open.mode !== 'review' || s.now < open.readyAt) return 'not_allowed';
      item.reviewedBy = p.id;
      item.reviewer = null;
      if (action.verdict === 'lgtm') {
        item.status = 'done';
        item.times.doneAt = s.now;
      } else {
        item.status = 'doing';
        item.submission = null;
        item.submittedBy = null;
        item.times.submittedAt = null;
        item.changesRequested += 1;
      }
      closeFor(s, item, 'review');
      return null;
    }
    case 'help.promise': {
      const item = findItem(s, action.itemId);
      if (item === undefined) return 'bad_request';
      if (!isBlocked(item) || item.helpPromisedBy !== null || item.workers.includes(p.id)) return 'not_allowed';
      item.helpPromisedBy = p.id;
      countDailyChange(s);
      return null;
    }
    case 'help.withdraw': {
      const item = findItem(s, action.itemId);
      if (item === undefined) return 'bad_request';
      if (item.helpPromisedBy !== p.id) return 'not_allowed';
      item.helpPromisedBy = null;
      return null;
    }
    default:
      return 'not_allowed';
  }
}

/**
 * Tracks the highest number of items In Progress during the Sprint.
 */
export function trackWip(s: RoomState): void {
  if (s.phase.kind !== 'work' || s.iterations.length === 0) return;
  const state = currentIteration(s);
  state.signals.wipMax = Math.max(state.signals.wipMax, doingCount(s));
}
