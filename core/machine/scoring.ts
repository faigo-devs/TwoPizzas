import { config } from '../config.ts';
import type { IterationMetrics, IterationNumber, LeaderboardEntry, RoomState, Score } from '../types.ts';
import { agreementOutcome } from './agreements.ts';
import { iterationAt, workElapsed } from './util.ts';

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/**
 * Computes the numbers of an iteration from its verdicts and the board; call it before unfinished items go back.
 */
export function computeMetrics(s: RoomState, iteration: IterationNumber): IterationMetrics {
  const state = iterationAt(s, iteration);
  const verdictItems = state.verdicts.flatMap((verdict) => {
    const item = s.items.find((own) => own.id === verdict.itemId);
    return item === undefined ? [] : [{ item, outcome: verdict.outcome }];
  });
  const accepted = verdictItems.filter((entry) => entry.outcome === 'accepted');
  const escaped = verdictItems.filter((entry) => entry.outcome === 'escaped_defect');
  const goalTheme = state.goal;
  const goalMet =
    goalTheme === null
      ? null
      : s.items.some((item) => item.theme === goalTheme) &&
        s.items
          .filter((item) => item.theme === goalTheme)
          .every((item) => item.status === 'done' && item.outcome === 'accepted');
  const valueDelivered = accepted.reduce((sum, entry) => sum + entry.item.value, 0);
  const kanban = s.framework === 'kanban';
  const endAt = state.flowEndedAt ?? s.now;
  const cycleTimesMs = verdictItems.flatMap((entry) => {
    const { startedAt, doneAt } = entry.item.times;
    if (startedAt === null || doneAt === null) return [];
    return [kanban ? workElapsed(state, startedAt, doneAt) : doneAt - startedAt];
  });
  const open = s.items.filter(
    (item) => item.iteration === iteration && (item.status === 'doing' || item.status === 'review'),
  );
  const openAges = open.map((item) => {
    const startedAt = item.times.startedAt;
    const ageMs = kanban
      ? startedAt === null
        ? 0
        : workElapsed(state, startedAt, endAt)
      : s.now - (startedAt ?? s.now);
    return { itemId: item.id, ageMs };
  });
  return {
    iteration,
    accepted: accepted.length,
    escapedDefects: escaped.length,
    valueDelivered,
    goalBonus: goalMet === true ? config.goal.bonus : 0,
    goalMet,
    velocity: accepted.reduce((sum, entry) => sum + (entry.item.estimate ?? 0), 0),
    throughput: verdictItems.length,
    cycleTimesMs,
    averageCycleMs: average(cycleTimesMs),
    wipMax: state.signals.wipMax,
    openAges,
    agreement: agreementOutcome(s),
    ...(kanban ? { wipLimits: { ...state.wipLimits } } : {}),
  };
}

/**
 * The score of the whole game from the metrics computed so far.
 */
export function computeScore(s: RoomState): Score {
  const metrics = s.iterations.flatMap((iteration) => (iteration.metrics === null ? [] : [iteration.metrics]));
  const value = metrics.reduce((sum, own) => sum + own.valueDelivered, 0);
  const goalBonus = metrics.reduce((sum, own) => sum + own.goalBonus, 0);
  return {
    total: value + goalBonus,
    value,
    goalBonus,
    escapedDefects: metrics.reduce((sum, own) => sum + own.escapedDefects, 0),
    averageCycleMs: average(metrics.flatMap((own) => own.cycleTimesMs)),
  };
}

/**
 * The row the server publishes to the leaderboard, or null before the summary.
 */
export function leaderboardEntry(s: RoomState): LeaderboardEntry | null {
  if (s.phase.kind !== 'summary') return null;
  const score = computeScore(s);
  return {
    framework: s.framework,
    teamName: s.teamName,
    players: s.players.length,
    score: score.total,
    escapedDefects: score.escapedDefects,
    averageCycleMs: score.averageCycleMs,
    date: new Date(s.now).toISOString().slice(0, 10),
  };
}
