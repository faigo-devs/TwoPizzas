import type { Machine } from '../types.ts';
import { nextDeadline } from './connection.ts';
import { createRoom, reduce } from './reduce.ts';
import { viewFor } from './views.ts';

export { createRoom, nextDeadline, reduce, viewFor };
export { computeScore, leaderboardEntry } from './scoring.ts';

export const machine: Machine = { createRoom, reduce, viewFor, nextDeadline };
