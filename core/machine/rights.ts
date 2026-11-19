import type { ItemAction, Player, RoomState, WorkItem, WorkMode } from '../types.ts';
import { startBlocked } from './flow.ts';
import { rulesFor } from './rules.ts';
import { isBlocked, isRunning, isWalk, waitsForPair } from './util.ts';

function onBoard(s: RoomState): boolean {
  return isRunning(s) || isWalk(s);
}

/**
 * Whether the player may take the item from Ready or the Sprint Backlog, or in Scrum from the Product Backlog during the Sprint, or join it as its second worker.
 */
export function canTake(s: RoomState, p: Player, item: WorkItem): boolean {
  if (!onBoard(s) || item.workers.includes(p.id)) return false;
  if (item.status === 'backlog') return rulesFor(s).backlogPull && isRunning(s);
  if (item.status === 'todo') return isRunning(s) && !startBlocked(s);
  return item.status === 'doing' && waitsForPair(item);
}

/**
 * Whether the player may give up the item as a worker or as its reviewer.
 */
export function canLeave(s: RoomState, p: Player, item: WorkItem): boolean {
  if (!onBoard(s)) return false;
  const asWorker = item.status === 'doing' && item.workers.includes(p.id);
  const asReviewer = item.status === 'review' && item.reviewer === p.id;
  return asWorker || asReviewer;
}

/**
 * Whether the player may open the item to work on it or to review it.
 */
export function canOpen(s: RoomState, p: Player, item: WorkItem, mode: WorkMode): boolean {
  if (!isRunning(s)) return false;
  if (p.open !== null && p.open.itemId === item.id && p.open.mode === mode) return false;
  if (mode === 'work') return item.status === 'doing' && item.workers.includes(p.id) && item.puzzle !== null;
  return item.status === 'review' && item.reviewer === p.id;
}

/**
 * Whether the player may claim the item waiting in Review.
 */
export function canTakeReview(s: RoomState, p: Player, item: WorkItem): boolean {
  return onBoard(s) && item.status === 'review' && item.reviewer === null && !item.workers.includes(p.id);
}

/**
 * Whether the player may promise the information a blocked item waits for.
 */
export function canPromiseHelp(s: RoomState, p: Player, item: WorkItem): boolean {
  return onBoard(s) && isBlocked(item) && item.helpPromisedBy === null && !item.workers.includes(p.id);
}

/**
 * Whether the player may withdraw their own promise.
 */
export function canWithdrawHelp(s: RoomState, p: Player, item: WorkItem): boolean {
  return onBoard(s) && item.helpPromisedBy === p.id;
}

/**
 * The item actions this player may send on this item right now.
 */
export function itemActions(s: RoomState, p: Player, item: WorkItem): ItemAction[] {
  const out: ItemAction[] = [];
  if (canTake(s, p, item)) out.push('item.take');
  if (canLeave(s, p, item)) out.push('item.leave');
  if (canOpen(s, p, item, 'work')) out.push('item.open.work');
  if (canOpen(s, p, item, 'review')) out.push('item.open.review');
  if (canTakeReview(s, p, item)) out.push('item.take_review');
  if (canPromiseHelp(s, p, item)) out.push('help.promise');
  if (canWithdrawHelp(s, p, item)) out.push('help.withdraw');
  return out;
}
