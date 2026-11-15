import { config } from '../config.ts';
import type { Agreement, AgreementType, Player, RoomState, StampedClientAction } from '../types.ts';
import { cleanAgreement } from './agreements.ts';
import { leaveInspect } from './inspect.ts';
import { observe } from './observations.ts';
import { computeMetrics } from './scoring.ts';
import { enterWorkCard, recordEvent } from './transitions.ts';
import { currentIteration, findItem, type Refusal } from './util.ts';

function planStep(s: RoomState): string | null {
  return s.phase.kind === 'plan' ? s.phase.step : null;
}

function setPlanStep(s: RoomState, step: 'replenish' | 'limits'): void {
  if (s.phase.kind === 'plan') s.phase.step = step;
}

function readyCount(s: RoomState): number {
  return s.items.filter((item) => item.status === 'todo').length;
}

function validLimit(value: number | null): boolean {
  if (value === null) return true;
  return Number.isInteger(value) && value >= config.kanban.wipLimitMin && value <= config.kanban.wipLimitMax;
}

/**
 * A Replenishment opens on its first step: choosing which requests of the pool enter Ready.
 */
export function kanbanPlanBegin(s: RoomState): void {
  setPlanStep(s, 'replenish');
}

/**
 * Handles the Replenishment actions: pulling requests into Ready and, in round 2, recording the WIP limits.
 */
export function kanbanPlanAction(s: RoomState, action: StampedClientAction, p: Player): Refusal {
  if (s.phase.kind !== 'plan') return 'not_allowed';
  const state = currentIteration(s);
  const step = planStep(s);
  switch (action.type) {
    case 'plan.pull': {
      if (step !== 'replenish') return 'not_allowed';
      const item = findItem(s, action.itemId);
      if (item === undefined) return 'bad_request';
      if (item.status !== 'backlog' || readyCount(s) >= config.kanban.readyMax) return 'not_allowed';
      item.status = 'todo';
      item.iteration = state.iteration;
      item.times.readyAt = s.now;
      return null;
    }
    case 'plan.unpull': {
      if (step !== 'replenish') return 'not_allowed';
      const item = findItem(s, action.itemId);
      if (item === undefined) return 'bad_request';
      if (item.status !== 'todo') return 'not_allowed';
      item.status = 'backlog';
      item.times.readyAt = null;
      return null;
    }
    case 'plan.set_limits': {
      if (step !== 'limits' || p.id !== s.facilitatorId) return 'not_allowed';
      if (!validLimit(action.inProgress) || !validLimit(action.review)) return 'bad_request';
      state.wipLimits = { inProgress: action.inProgress, review: action.review };
      return null;
    }
    default:
      return 'not_allowed';
  }
}

function leavePlan(s: RoomState): void {
  const state = currentIteration(s);
  const record = recordEvent(s);
  state.signals.planOverrunMs = record?.overrunMs ?? 0;
  observe(s, 'plan');
  enterWorkCard(s, state.iteration);
}

/**
 * Moves the Replenishment on: from choosing to the limits (round 2 only), then into the Flow's card.
 */
export function kanbanPlanAdvance(s: RoomState, p: Player): Refusal {
  if (s.phase.kind !== 'plan' || p.id !== s.facilitatorId) return 'not_allowed';
  const step = planStep(s);
  if (step === 'replenish') {
    if (readyCount(s) === 0) return 'not_allowed';
    if (s.phase.iteration === 2) setPlanStep(s, 'limits');
    else leavePlan(s);
    return null;
  }
  if (step === 'limits') {
    leavePlan(s);
    return null;
  }
  return 'not_allowed';
}

/**
 * Moves the Delivery review on: verdicts, then the flow metrics, then (round 2) the comparison of the two rounds.
 */
export function kanbanInspectAdvance(s: RoomState, p: Player): Refusal {
  if (s.phase.kind !== 'inspect' || p.id !== s.facilitatorId) return 'not_allowed';
  const state = currentIteration(s);
  const step = s.phase.step;
  if (step === 'increment') {
    if (state.verdictsRevealed < state.verdicts.length) return 'not_allowed';
    state.metrics = computeMetrics(s, state.iteration);
    s.phase.step = 'flow';
    return null;
  }
  if (step === 'flow' && state.iteration === 2) {
    s.phase.step = 'comparison';
    return null;
  }
  if (step === 'flow' || step === 'comparison') {
    leaveInspect(s);
    return null;
  }
  return 'not_allowed';
}

/**
 * Checks an agreement for a Kanban room: the limits agreement is allowed, a plain WIP number is not.
 */
export function kanbanCleanAgreement(agreement: Agreement): Agreement | null {
  if (agreement.type === 'wip_limits_set') return { type: 'wip_limits_set' };
  if (agreement.type === 'wip_limit') return null;
  return cleanAgreement(agreement);
}

/**
 * The agreements to offer in a Kanban retrospective: setting limits first after round 1, then the rest by their signals.
 */
export function kanbanSuggestions(s: RoomState): AgreementType[] {
  const state = currentIteration(s);
  const sig = state.signals;
  const ranked: [AgreementType, number][] = [
    ['review_wait', sig.maxReviewWaitMs / 10_000],
    ['no_new_while_blocked', sig.blockedUnhelpedAtDaily * 3],
    ['pair_first', sig.pairWaitMs / 10_000],
  ];
  const order = ranked.sort((a, b) => b[1] - a[1]).map(([type]) => type);
  const first: AgreementType[] = state.iteration === 1 ? ['wip_limits_set'] : [];
  return [...first, ...order, 'free'];
}
