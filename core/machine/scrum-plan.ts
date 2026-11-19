import { config } from '../config.ts';
import { createRng } from '../rng.ts';
import type { Card, IterationNumber, IterationState, ItemId, Player, RoomState, StampedClientAction, Theme } from '../types.ts';
import { observe } from './observations.ts';
import { enterWorkCard, recordEvent } from './transitions.ts';
import {
  connectedPlayers,
  currentIteration,
  findItem,
  isCard,
  median,
  type Refusal,
} from './util.ts';

function planStep(s: RoomState): string | null {
  return s.phase.kind === 'plan' ? s.phase.step : null;
}

function setStep(s: RoomState, step: 'goal' | 'estimate' | 'commit'): void {
  if (s.phase.kind === 'plan') s.phase.step = step;
}

/**
 * Prepares the poker for the next unestimated backlog item, the Sprint Goal's theme first, or moves on to the commitment when none is left.
 */
export function initPoker(s: RoomState): void {
  const state = currentIteration(s);
  const open = s.items.filter((item) => item.status === 'backlog' && item.estimate === null);
  const goal = state.goal;
  const next = (goal === null ? undefined : open.find((item) => item.theme === goal)) ?? open[0];
  if (next === undefined) {
    state.poker = null;
    setStep(s, 'commit');
    return;
  }
  state.poker = { itemId: next.id, votes: {}, revealed: false, revotesUsed: 0 };
  setStep(s, 'estimate');
}

/**
 * The step a planning opens on when the facilitator begins it.
 */
export function planBegin(s: RoomState): void {
  const state = currentIteration(s);
  if (state.goalOptions.length > 0) {
    setStep(s, 'goal');
    return;
  }
  initPoker(s);
}

export function goalWinner(s: RoomState): Theme | null {
  const state = currentIteration(s);
  const counts = new Map<Theme, number>();
  for (const theme of Object.values(state.goalVotes)) counts.set(theme, (counts.get(theme) ?? 0) + 1);
  let best: Theme | null = null;
  let bestCount = 0;
  for (const option of state.goalOptions) {
    const count = counts.get(option) ?? 0;
    if (count > bestCount) {
      best = option;
      bestCount = count;
    }
  }
  return best;
}

export function allVoted(s: RoomState): boolean {
  const poker = currentIteration(s).poker;
  if (poker === null) return false;
  const present = connectedPlayers(s);
  return present.length > 0 && present.every((player) => poker.votes[player.id] !== undefined);
}

export function settlePoker(s: RoomState): void {
  const poker = s.phase.kind === 'plan' && s.phase.step === 'estimate' ? currentIteration(s).poker : null;
  if (poker !== null && !poker.revealed && allVoted(s)) poker.revealed = true;
}

function onlyFacilitator(s: RoomState, p: Player): boolean {
  return p.id === s.facilitatorId;
}

function recordEstimate(s: RoomState, itemId: ItemId, estimate: Card): void {
  const item = findItem(s, itemId);
  if (item !== undefined) item.estimate = estimate;
  initPoker(s);
}

/**
 * Handles the planning actions of a Scrum room; returns the refusal or null.
 */
export function planAction(s: RoomState, action: StampedClientAction, p: Player): Refusal {
  if (s.phase.kind !== 'plan') return 'not_allowed';
  const state = currentIteration(s);
  const step = planStep(s);
  switch (action.type) {
    case 'plan.goal_vote': {
      if (step !== 'goal') return 'not_allowed';
      if (!state.goalOptions.includes(action.theme)) return 'bad_request';
      state.goalVotes[p.id] = action.theme;
      return null;
    }
    case 'plan.goal_confirm': {
      if (step !== 'goal' || !onlyFacilitator(s, p)) return 'not_allowed';
      const winner = goalWinner(s);
      if (winner === null) return 'not_allowed';
      state.goal = winner;
      initPoker(s);
      return null;
    }
    case 'plan.poker_vote': {
      const poker = state.poker;
      if (step !== 'estimate' || poker === null || poker.revealed) return 'not_allowed';
      if (!isCard(action.card)) return 'bad_request';
      poker.votes[p.id] = action.card;
      settlePoker(s);
      return null;
    }
    case 'plan.poker_reveal': {
      const poker = state.poker;
      if (step !== 'estimate' || poker === null || !onlyFacilitator(s, p)) return 'not_allowed';
      if (poker.revealed || Object.keys(poker.votes).length === 0) return 'not_allowed';
      poker.revealed = true;
      return null;
    }
    case 'plan.poker_revote': {
      const poker = state.poker;
      if (step !== 'estimate' || poker === null || !onlyFacilitator(s, p)) return 'not_allowed';
      if (!poker.revealed || poker.revotesUsed >= config.poker.revotesAllowed) return 'not_allowed';
      poker.votes = {};
      poker.revealed = false;
      poker.revotesUsed += 1;
      return null;
    }
    case 'plan.poker_record': {
      const poker = state.poker;
      if (step !== 'estimate' || poker === null || !onlyFacilitator(s, p) || !poker.revealed) return 'not_allowed';
      if (action.estimate !== null && !isCard(action.estimate)) return 'bad_request';
      const votes = Object.values(poker.votes);
      if (votes.length === 0) return 'not_allowed';
      recordEstimate(s, poker.itemId, action.estimate ?? median(votes));
      return null;
    }
    case 'plan.estimation_stop': {
      if (step !== 'estimate' || !onlyFacilitator(s, p)) return 'not_allowed';
      state.estimationStopped = true;
      state.poker = null;
      setStep(s, 'commit');
      return null;
    }
    case 'plan.pull': {
      if (step !== 'commit') return 'not_allowed';
      const item = findItem(s, action.itemId);
      if (item === undefined) return 'bad_request';
      if (item.status !== 'backlog') return 'not_allowed';
      item.status = 'todo';
      item.iteration = state.iteration;
      return null;
    }
    case 'plan.unpull': {
      if (step !== 'commit') return 'not_allowed';
      const item = findItem(s, action.itemId);
      if (item === undefined) return 'bad_request';
      if (item.status !== 'todo') return 'not_allowed';
      item.status = 'backlog';
      return null;
    }
    default:
      return 'not_allowed';
  }
}

/**
 * Ends the Sprint Planning from the commitment and opens the Sprint's card.
 */
export function planAdvance(s: RoomState, p: Player): Refusal {
  if (s.phase.kind !== 'plan' || s.phase.step !== 'commit') return 'not_allowed';
  if (!onlyFacilitator(s, p)) return 'not_allowed';
  const committed = s.items.filter((item) => item.status === 'todo');
  if (committed.length === 0) return 'not_allowed';
  const state = currentIteration(s);
  state.signals.unestimatedPulled = committed.filter((item) => item.estimate === null).length;
  state.signals.committedEstimate = committed.reduce((sum, item) => sum + (item.estimate ?? 0), 0);
  const record = recordEvent(s);
  state.signals.planOverrunMs = record?.overrunMs ?? 0;
  observe(s, 'plan');
  enterWorkCard(s, state.iteration);
  return null;
}

function chooseGoalOptions(s: RoomState): Theme[] {
  const open = config.backlog.themes.filter((theme) =>
    s.items.some((item) => item.theme === theme && !(item.status === 'done' && item.outcome === 'accepted')),
  );
  const rng = createRng(s.secret, 'machine', s.rng);
  const options = rng.shuffle(open).slice(0, config.goal.options);
  s.rng = rng.state();
  return options;
}

/**
 * Opens a Sprint: the second one remembers the first one's velocity, and every Sprint draws its goal options.
 */
export function scrumIterationStart(s: RoomState, state: IterationState, iteration: IterationNumber): void {
  if (iteration === 2) state.signals.previousVelocity = s.iterations[0]?.metrics?.velocity ?? null;
  state.goalOptions = chooseGoalOptions(s);
}
