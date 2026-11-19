import { config } from '../config.ts';
import { generateTeamName } from '../names.ts';
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

/**
 * Whether another generated team name is still available.
 */
export function canRenameTeam(s: RoomState): boolean {
  return s.nameAttempt + 1 < config.names.attemptsMax;
}

/**
 * The facilitator asks for another generated team name until the result is published.
 */
export function summaryNewTeamName(s: RoomState, p: Player): Refusal {
  if (s.phase.kind !== 'summary' || p.id !== s.facilitatorId || s.published || !canRenameTeam(s)) return 'not_allowed';
  s.nameAttempt += 1;
  s.teamName = generateTeamName(s.nameSeed, s.nameAttempt);
  return null;
}
