import { config } from '../config.ts';
import type { GoalView, Player, PlayerView, RoomState, ScrumInspectView, ScrumPlanningView, Theme } from '../types.ts';
import type { BaseView } from '../types.ts';
import { currentIteration, median, revealedVerdicts } from './util.ts';

function planningView(s: RoomState, p: Player): ScrumPlanningView {
  const state = currentIteration(s);
  const goalVotes = Object.fromEntries(config.backlog.themes.map((theme) => [theme, 0])) as Record<Theme, number>;
  for (const theme of Object.values(state.goalVotes)) goalVotes[theme] += 1;
  const poker = state.poker;
  const votes = poker === null ? [] : Object.values(poker.votes);
  const planned = s.items.filter((item) => item.status === 'backlog' || item.status === 'todo');
  return {
    goalOptions: [...state.goalOptions],
    goal: state.goal,
    myGoalVote: state.goalVotes[p.id] ?? null,
    goalVotes,
    poker:
      poker === null
        ? null
        : {
            itemId: poker.itemId,
            voted: Object.keys(poker.votes),
            myVote: poker.votes[p.id] ?? null,
            revealed: poker.revealed,
            votes: poker.revealed ? { ...poker.votes } : null,
            median: poker.revealed && votes.length > 0 ? median(votes) : null,
            revotesLeft: Math.max(0, config.poker.revotesAllowed - poker.revotesUsed),
          },
    estimatedCount: planned.filter((item) => item.estimate !== null).length,
    totalEstimate: s.items
      .filter((item) => item.status === 'todo')
      .reduce((sum, item) => sum + (item.estimate ?? 0), 0),
    previousVelocity: state.signals.previousVelocity,
    estimationStopped: state.estimationStopped,
  };
}

function inspectView(s: RoomState): ScrumInspectView {
  const state = currentIteration(s);
  const step = s.phase.kind === 'inspect' ? s.phase.step : 'card';
  const shown = step === 'result' || step === 'feedback';
  const metrics = state.metrics;
  return {
    verdicts: revealedVerdicts(state),
    verdictsTotal: state.verdicts.length,
    goal: state.goal,
    goalMet: shown ? metrics?.goalMet ?? null : null,
    valueDelivered: shown ? metrics?.valueDelivered ?? null : null,
    goalBonus: shown ? metrics?.goalBonus ?? null : null,
    velocity: shown ? metrics?.velocity ?? null : null,
    feedback: step === 'feedback' && state.feedback !== null ? { ...state.feedback } : null,
  };
}

function goalView(s: RoomState): GoalView | null {
  const phase = s.phase;
  if (phase.kind === 'lobby' || phase.kind === 'summary') return null;
  const theme = currentIteration(s).goal;
  if (theme === null) return null;
  const items = s.items.filter((item) => item.theme === theme);
  return { theme, done: items.filter((item) => item.status === 'done').length, total: items.length };
}

/**
 * Builds the Scrum player's view from the parts both frameworks share.
 */
export function scrumView(s: RoomState, p: Player, base: BaseView): Extract<PlayerView, { framework: 'scrum' }> {
  return {
    ...base,
    framework: 'scrum',
    goal: goalView(s),
    planning: s.phase.kind === 'plan' ? planningView(s, p) : null,
    inspect: s.phase.kind === 'inspect' ? inspectView(s) : null,
  };
}
