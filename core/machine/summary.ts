import type { Player, RoomState } from '../types.ts';
import type { Refusal } from './util.ts';

/**
 * The facilitator marks the result as published, once per room; the server then sends the entry to the leaderboard.
 */
export function summaryPublish(s: RoomState, p: Player): Refusal {
  if (s.phase.kind !== 'summary' || p.id !== s.facilitatorId || s.published) return 'not_allowed';
  s.published = true;
  return null;
}
