import { config } from '../config.ts';
import type { IterationNumber, Observation, ObservationId, RoomState } from '../types.ts';
import { currentIteration, sprintItems } from './util.ts';

export type ObservationGroup = 'plan' | 'daily' | 'work' | 'inspect' | 'retro';

interface Candidate {
  id: ObservationId;
  positive: boolean;
  params: Record<string, number | string>;
}

function seconds(ms: number): number {
  return Math.round(ms / 1000);
}

function planCandidates(s: RoomState): Candidate[] {
  const iteration = currentIteration(s);
  const sig = iteration.signals;
  const out: Candidate[] = [];
  const late = sig.planOverrunMs > 0;
  if (late) out.push({ id: 'plan.overtime', positive: false, params: { overrunSec: seconds(sig.planOverrunMs) } });
  const pulled = s.items.filter((item) => item.status === 'todo').length;
  if (sig.unestimatedPulled > 0) {
    out.push({ id: 'plan.unestimatedPulled', positive: false, params: { count: sig.unestimatedPulled } });
  } else if (pulled > 0) {
    out.push({ id: 'plan.allEstimated', positive: true, params: { count: pulled } });
  }
  if (sig.previousVelocity !== null) {
    const params = { committed: sig.committedEstimate, velocity: sig.previousVelocity };
    out.push(
      sig.committedEstimate > sig.previousVelocity
        ? { id: 'plan.overcommitted', positive: false, params }
        : { id: 'plan.fitsVelocity', positive: true, params },
    );
  }
  if (!late) out.push({ id: 'plan.onTime', positive: true, params: {} });
  return out;
}

function dailyCandidates(s: RoomState): Candidate[] {
  const sig = currentIteration(s).signals;
  const out: Candidate[] = [];
  const late = sig.dailyOverrunMs > 0;
  if (late) out.push({ id: 'daily.overtime', positive: false, params: { overrunSec: seconds(sig.dailyOverrunMs) } });
  const blocked = s.items.filter((item) => item.dependency && item.puzzle !== null && item.status === 'doing');
  const unhelped = blocked.filter((item) => item.helpPromisedBy === null && item.changesRequested === 0).length;
  if (unhelped > 0) out.push({ id: 'daily.blockedUnhelped', positive: false, params: { count: unhelped } });
  else if (sig.blockedUnhelpedAtDaily > 0) {
    out.push({ id: 'daily.blockedHelped', positive: true, params: { count: sig.blockedUnhelpedAtDaily } });
  }
  const waiting = s.items.filter((item) => item.status === 'review' && item.reviewer === null).length;
  if (waiting > 0) out.push({ id: 'daily.reviewWaiting', positive: false, params: { count: waiting } });
  else if (sig.reviewWaitingAtDaily > 0) {
    out.push({ id: 'daily.reviewFlowing', positive: true, params: { count: sig.reviewWaitingAtDaily } });
  }
  out.push(
    sig.dailyChanges === 0
      ? { id: 'daily.planUnchanged', positive: false, params: {} }
      : { id: 'daily.planAdapted', positive: true, params: { changes: sig.dailyChanges } },
  );
  if (!late) out.push({ id: 'daily.onTime', positive: true, params: {} });
  return out;
}

function workCandidates(s: RoomState): Candidate[] {
  const iteration = currentIteration(s);
  const sig = iteration.signals;
  const players = s.players.length;
  const items = sprintItems(s, iteration.iteration);
  const out: Candidate[] = [];
  if (sig.wipMax >= Math.ceil(players * config.observations.wipHighFactor)) {
    out.push({ id: 'work.wipHigh', positive: false, params: { wipMax: sig.wipMax, players } });
  } else if (sig.wipMax > 0 && sig.wipMax <= players) {
    out.push({ id: 'work.wipLow', positive: true, params: { wipMax: sig.wipMax, players } });
  }
  const unfinished = items.filter((item) => item.status !== 'done').length;
  if (unfinished > 0) out.push({ id: 'work.unfinished', positive: false, params: { count: unfinished } });
  else if (items.length > 0) out.push({ id: 'work.allFinished', positive: true, params: { count: items.length } });
  if (sig.pairWaitMs >= config.observations.pairWaitMs) {
    out.push({ id: 'work.waitingForPair', positive: false, params: { waitSec: seconds(sig.pairWaitMs) } });
  }
  return out;
}

function inspectCandidates(s: RoomState): Candidate[] {
  const iteration = currentIteration(s);
  const metrics = iteration.metrics;
  const out: Candidate[] = [];
  if (metrics === null) return out;
  if (metrics.escapedDefects > 0) {
    out.push({ id: 'inspect.escapedDefects', positive: false, params: { count: metrics.escapedDefects } });
  } else if (metrics.accepted > 0) {
    out.push({ id: 'inspect.noEscapedDefects', positive: true, params: { accepted: metrics.accepted } });
  }
  if (metrics.goalMet === true) {
    out.push({ id: 'inspect.goalMet', positive: true, params: { bonus: metrics.goalBonus } });
  } else if (metrics.goalMet === false) {
    out.push({ id: 'inspect.goalMissed', positive: false, params: { theme: iteration.goal ?? '' } });
  }
  return out;
}

function retroCandidates(s: RoomState): Candidate[] {
  const iteration = currentIteration(s);
  const out: Candidate[] = [];
  const previous = iteration.iteration === 2 ? iteration.metrics?.agreement ?? null : null;
  if (previous !== null && previous.kept !== null) {
    out.push(
      previous.kept
        ? { id: 'retro.actionKept', positive: true, params: { type: previous.agreement.type } }
        : {
            id: 'retro.actionBroken',
            positive: false,
            params: { type: previous.agreement.type, violations: iteration.signals.agreementViolations },
          },
    );
  }
  out.push(
    iteration.retro.action === null
      ? { id: 'retro.noAction', positive: false, params: {} }
      : { id: 'retro.actionChosen', positive: true, params: { type: iteration.retro.action.type } },
  );
  return out;
}

function candidatesFor(s: RoomState, group: ObservationGroup): Candidate[] {
  if (group === 'plan') return planCandidates(s);
  if (group === 'daily') return dailyCandidates(s);
  if (group === 'work') return workCandidates(s);
  if (group === 'inspect') return inspectCandidates(s);
  return retroCandidates(s);
}

function choose(candidates: Candidate[]): Candidate[] {
  const limit = config.observations.maxPerEvent;
  const positive = candidates.filter((candidate) => candidate.positive);
  const watch = candidates.filter((candidate) => !candidate.positive);
  const chosen: Candidate[] = [];
  const first = positive[0];
  const second = watch[0];
  if (first !== undefined) chosen.push(first);
  if (second !== undefined) chosen.push(second);
  for (const candidate of candidates) {
    if (chosen.length >= limit) break;
    if (!chosen.includes(candidate)) chosen.push(candidate);
  }
  return candidates.filter((candidate) => chosen.includes(candidate)).slice(0, limit);
}

/**
 * Computes the observations of the phase that just ended and makes them the current group.
 */
export function observe(s: RoomState, group: ObservationGroup): void {
  const iteration: IterationNumber = currentIteration(s).iteration;
  const picked: Observation[] = choose(candidatesFor(s, group)).map((candidate) => ({
    id: candidate.id,
    iteration,
    positive: candidate.positive,
    params: candidate.params,
  }));
  s.observationsFrom = s.observations.length;
  s.observations.push(...picked);
}

export function latestObservations(s: RoomState): Observation[] {
  return s.observations.slice(s.observationsFrom);
}
