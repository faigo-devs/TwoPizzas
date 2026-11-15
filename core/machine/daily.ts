import type { Player, RoomState } from '../types.ts';
import { observe } from './observations.ts';
import { recordEvent, resumeWork } from './transitions.ts';
import { currentIteration, isBlocked, isWalk, type Refusal } from './util.ts';

/**
 * Takes a snapshot of the board when the Daily Scrum begins, for the observations that follow.
 */
export function dailyBegin(s: RoomState): void {
  const sig = currentIteration(s).signals;
  sig.blockedUnhelpedAtDaily = s.items.filter((item) => isBlocked(item) && item.helpPromisedBy === null).length;
  sig.reviewWaitingAtDaily = s.items.filter((item) => item.status === 'review' && item.reviewer === null).length;
  sig.dailyChanges = 0;
  if (s.phase.kind === 'daily') s.phase.step = 'walk';
}

/**
 * Any player ends the Daily Scrum; the Sprint clock starts again for the second half.
 */
export function dailyEnd(s: RoomState, _p: Player): Refusal {
  if (!isWalk(s)) return 'not_allowed';
  const record = recordEvent(s);
  currentIteration(s).signals.dailyOverrunMs = record?.overrunMs ?? 0;
  observe(s, 'daily');
  resumeWork(s);
  return null;
}
