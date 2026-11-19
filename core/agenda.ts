import { config } from './config.ts';

export type AgendaEvent = 'plan' | 'work' | 'daily' | 'inspect' | 'retro';

/**
 * One event of the session with its game minutes in each iteration.
 */
export interface AgendaEntry {
  event: AgendaEvent;
  half: 1 | 2 | null;
  minutes: number[];
}

/**
 * The events of one iteration in order, with the game minutes of each iteration and the total of the session.
 */
export interface SessionAgenda {
  entries: AgendaEntry[];
  totalMinutes: number;
}

function perIteration(box: number | readonly number[]): number[] {
  const list = typeof box === 'number' ? Array.from({ length: config.iterations }, () => box) : [...box];
  return list.map((ms) => ms / 60_000);
}

/**
 * Builds the agenda from the timeboxes in the config, so the lobby and the machine never disagree.
 */
export function sessionAgenda(): SessionAgenda {
  const boxes = config.timeboxMs;
  const entries: AgendaEntry[] = [
    { event: 'plan', half: null, minutes: perIteration(boxes.plan) },
    { event: 'work', half: 1, minutes: perIteration(boxes.workHalf) },
    { event: 'daily', half: null, minutes: perIteration(boxes.daily) },
    { event: 'work', half: 2, minutes: perIteration(boxes.workHalf) },
    { event: 'inspect', half: null, minutes: perIteration(boxes.inspect) },
    { event: 'retro', half: null, minutes: perIteration(boxes.retro) },
  ];
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes.reduce((a, b) => a + b, 0), 0);
  return { entries, totalMinutes };
}
