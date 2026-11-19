import { config } from '../config.ts';
import type { ObservationGroup, ObservationId, RoomState, WorkItem } from '../types.ts';
import { currentIteration, iterationAt, sprintItems, workElapsed } from './util.ts';

export interface Candidate {
  id: ObservationId;
  positive: boolean;
  params: Record<string, number | string>;
}

function seconds(ms: number): number {
  return Math.round(ms / 1000);
}

function scrumPlanMiddle(s: RoomState): Candidate[] {
  const sig = currentIteration(s).signals;
  const out: Candidate[] = [];
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
  return out;
}

function planCandidates(s: RoomState, middle: Candidate[]): Candidate[] {
  const sig = currentIteration(s).signals;
  const out: Candidate[] = [];
  const late = sig.planOverrunMs > 0;
  if (late) out.push({ id: 'plan.overtime', positive: false, params: { overrunSec: seconds(sig.planOverrunMs) } });
  out.push(...middle);
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

function kanbanWorkCandidates(s: RoomState): Candidate[] {
  const iteration = currentIteration(s);
  const sig = iteration.signals;
  const out: Candidate[] = [];
  const { inProgress, review } = iteration.wipLimits;
  if (inProgress !== null || review !== null) {
    const params = {
      inProgressLimit: inProgress ?? 0,
      reviewLimit: review ?? 0,
      inProgressMax: sig.inProgressMax,
      reviewMax: sig.reviewMax,
    };
    const reached =
      (inProgress !== null && sig.inProgressMax >= inProgress) ||
      (review !== null && sig.reviewMax >= review);
    out.push(reached ? { id: 'work.limitReached', positive: true, params } : { id: 'work.limitNeverReached', positive: false, params });
  }
  const end = iteration.flowEndedAt ?? s.now;
  const ages = s.items
    .filter((item) => item.iteration === iteration.iteration && (item.status === 'doing' || item.status === 'review'))
    .map((item) => workElapsed(iteration, item.times.startedAt ?? end, end))
    .filter((age) => age >= config.kanban.agedWorkMs);
  if (ages.length > 0) {
    out.push({ id: 'work.agedWork', positive: false, params: { count: ages.length, oldestSec: seconds(Math.max(...ages)) } });
  }
  return out;
}

function workCandidates(s: RoomState, lead: Candidate[], counts: (item: WorkItem) => boolean): Candidate[] {
  const iteration = currentIteration(s);
  const sig = iteration.signals;
  const players = s.players.length;
  const items = sprintItems(s, iteration.iteration);
  const out: Candidate[] = [...lead];
  if (sig.wipMax >= Math.ceil(players * config.observations.wipHighFactor)) {
    out.push({ id: 'work.wipHigh', positive: false, params: { wipMax: sig.wipMax, players } });
  } else if (sig.wipMax > 0 && sig.wipMax <= players) {
    out.push({ id: 'work.wipLow', positive: true, params: { wipMax: sig.wipMax, players } });
  }
  const started = items.filter(counts);
  const unfinished = started.filter((item) => item.status !== 'done').length;
  if (unfinished > 0) out.push({ id: 'work.unfinished', positive: false, params: { count: unfinished } });
  else if (started.length > 0) out.push({ id: 'work.allFinished', positive: true, params: { count: started.length } });
  if (sig.pairWaitMs >= config.observations.pairWaitMs) {
    out.push({ id: 'work.waitingForPair', positive: false, params: { waitSec: seconds(sig.pairWaitMs) } });
  }
  return out;
}

function kanbanInspectCandidates(s: RoomState): Candidate[] {
  const iteration = currentIteration(s);
  const current = iteration.metrics;
  const first = iteration.iteration === 2 ? iterationAt(s, 1).metrics : null;
  const out: Candidate[] = [];
  if (current === null || first === null) return out;
  const params = { first: first.throughput, second: current.throughput };
  if (current.throughput > first.throughput) out.push({ id: 'inspect.throughputUp', positive: true, params });
  else if (current.throughput < first.throughput) out.push({ id: 'inspect.throughputDown', positive: false, params });
  if (current.averageCycleMs !== null && first.averageCycleMs !== null) {
    const cycle = { firstSec: seconds(first.averageCycleMs), secondSec: seconds(current.averageCycleMs) };
    if (current.averageCycleMs < first.averageCycleMs) out.push({ id: 'inspect.cycleTimeFaster', positive: true, params: cycle });
    else if (current.averageCycleMs > first.averageCycleMs) out.push({ id: 'inspect.cycleTimeSlower', positive: false, params: cycle });
  }
  return out;
}

function scrumGoalCandidates(s: RoomState): Candidate[] {
  const iteration = currentIteration(s);
  const metrics = iteration.metrics;
  if (metrics === null) return [];
  if (metrics.goalMet === true) return [{ id: 'inspect.goalMet', positive: true, params: { bonus: metrics.goalBonus } }];
  if (metrics.goalMet === false) return [{ id: 'inspect.goalMissed', positive: false, params: { theme: iteration.goal ?? '' } }];
  return [];
}

function inspectCandidates(s: RoomState, lead: Candidate[], tail: Candidate[]): Candidate[] {
  const metrics = currentIteration(s).metrics;
  const out: Candidate[] = [];
  if (metrics === null) return out;
  out.push(...lead);
  if (metrics.escapedDefects > 0) {
    out.push({ id: 'inspect.escapedDefects', positive: false, params: { count: metrics.escapedDefects } });
  } else if (metrics.accepted > 0) {
    out.push({ id: 'inspect.noEscapedDefects', positive: true, params: { accepted: metrics.accepted } });
  }
  out.push(...tail);
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

export function scrumCandidates(s: RoomState, group: ObservationGroup): Candidate[] {
  if (group === 'plan') return planCandidates(s, scrumPlanMiddle(s));
  if (group === 'daily') return dailyCandidates(s);
  if (group === 'work') return workCandidates(s, [], () => true);
  if (group === 'inspect') return inspectCandidates(s, [], scrumGoalCandidates(s));
  return retroCandidates(s);
}

export function kanbanCandidates(s: RoomState, group: ObservationGroup): Candidate[] {
  if (group === 'plan') return planCandidates(s, []);
  if (group === 'daily') return dailyCandidates(s);
  if (group === 'work') return workCandidates(s, kanbanWorkCandidates(s), (item) => item.times.startedAt !== null);
  if (group === 'inspect') return inspectCandidates(s, kanbanInspectCandidates(s), []);
  return retroCandidates(s);
}
