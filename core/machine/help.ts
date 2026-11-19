import { config } from '../config.ts';
import type { HelpProposal, HelpQuestion, RetroHelpState, RoomState } from '../types.ts';
import { rulesFor } from './rules.ts';
import { currentIteration, iterationAt } from './util.ts';

interface Facts {
  kanban: boolean;
  iteration: number;
  inProgressLimit: number | null;
  limitReached: boolean;
  throughputUp: boolean;
  players: number;
  accepted: number;
  value: number;
  escaped: number;
  unfinished: number;
  goalMet: boolean | null;
  theme: string;
  wipMax: number;
  maxReviewWaitMs: number;
  pairWaitMs: number;
  blockedUnhelped: number;
  planOverrunMs: number;
  dailyOverrunMs: number;
  unestimated: number;
}

function factsOf(s: RoomState): Facts {
  const iteration = currentIteration(s);
  const sig = iteration.signals;
  const metrics = iteration.metrics;
  const limit = iteration.wipLimits.inProgress;
  const first = iteration.iteration === 2 ? iterationAt(s, 1).metrics : null;
  return {
    kanban: rulesFor(s).wipLimits,
    iteration: iteration.iteration,
    inProgressLimit: limit,
    limitReached: limit !== null && sig.inProgressMax >= limit,
    throughputUp: metrics !== null && first !== null && metrics.throughput > first.throughput,
    players: s.players.length,
    accepted: metrics?.accepted ?? 0,
    value: metrics?.valueDelivered ?? 0,
    escaped: metrics?.escapedDefects ?? 0,
    unfinished: metrics?.openAges.length ?? 0,
    goalMet: metrics?.goalMet ?? null,
    theme: iteration.goal ?? '',
    wipMax: sig.wipMax,
    maxReviewWaitMs: sig.maxReviewWaitMs,
    pairWaitMs: sig.pairWaitMs,
    blockedUnhelped: sig.blockedUnhelpedAtDaily,
    planOverrunMs: sig.planOverrunMs,
    dailyOverrunMs: sig.dailyOverrunMs,
    unestimated: sig.unestimatedPulled,
  };
}

function wipIsHigh(facts: Facts): boolean {
  return facts.wipMax >= Math.ceil(facts.players * config.observations.wipHighFactor);
}

function sec(ms: number): number {
  return Math.round(ms / 1000);
}

/**
 * The short questions that apply to this iteration's numbers, at most the configured count, written in advance.
 */
export function helpQuestions(s: RoomState): HelpQuestion[] {
  const facts = factsOf(s);
  const all: HelpQuestion[] = [];
  if (
    facts.maxReviewWaitMs >= config.review.waitThresholdMs ||
    facts.pairWaitMs > 0 ||
    facts.blockedUnhelped > 0
  ) {
    all.push({
      id: 'wait',
      choices: ['review', 'pair', 'info', 'none'],
      params: {
        reviewWaitSec: sec(facts.maxReviewWaitMs),
        pairWaitSec: sec(facts.pairWaitMs),
        blocked: facts.blockedUnhelped,
      },
    });
  }
  if (facts.wipMax >= facts.players) {
    all.push({ id: 'overload', choices: ['yes', 'no'], params: { wipMax: facts.wipMax, players: facts.players } });
  }
  if (facts.unfinished > 0) {
    all.push({
      id: 'unfinished',
      choices: facts.kanban ? ['overload', 'blocked', 'review', 'other'] : ['estimates', 'overload', 'blocked', 'other'],
      params: { count: facts.unfinished },
    });
  }
  if (facts.escaped > 0) {
    all.push({ id: 'defects', choices: ['rushed', 'unclear', 'no_time', 'other'], params: { count: facts.escaped } });
  }
  if (facts.kanban && facts.inProgressLimit !== null) {
    all.push({
      id: 'limits',
      choices: ['helped', 'too_tight', 'too_loose'],
      params: { limit: facts.inProgressLimit, reached: facts.limitReached ? 1 : 0 },
    });
  }
  if (!facts.kanban && facts.goalMet === false) {
    all.push({ id: 'goal', choices: ['scope', 'blocked', 'other'], params: { theme: facts.theme } });
  }
  if (facts.planOverrunMs > 0 || facts.dailyOverrunMs > 0) {
    all.push({
      id: 'events',
      choices: ['plan', 'daily', 'none'],
      params: { planSec: sec(facts.planOverrunMs), dailySec: sec(facts.dailyOverrunMs) },
    });
  }
  all.push({ id: 'general', choices: ['good', 'bad'], params: { accepted: facts.accepted, value: facts.value } });
  all.push({ id: 'next', choices: ['faster', 'safer', 'calmer'], params: {} });
  return all.slice(0, config.retro.helpQuestionsMax);
}

/**
 * The editable notes that apply to the numbers and to the answers given so far; used ones are left out.
 */
export function helpProposals(s: RoomState, state: RetroHelpState): HelpProposal[] {
  const facts = factsOf(s);
  const answers = state.answers;
  const out: HelpProposal[] = [];
  const add = (id: string, column: HelpProposal['column'], params: HelpProposal['params'] = {}): void => {
    out.push({ id, column, params });
  };
  if (facts.accepted > 0) add('went_well.value', 'went_well', { accepted: facts.accepted, value: facts.value });
  if (facts.kanban && facts.inProgressLimit !== null && facts.limitReached) {
    add('went_well.limits', 'went_well', { limit: facts.inProgressLimit });
  }
  if (facts.kanban && facts.throughputUp) add('went_well.throughput', 'went_well', { accepted: facts.accepted });
  if (!facts.kanban && facts.goalMet === true) add('went_well.goal', 'went_well', { theme: facts.theme });
  if (facts.escaped === 0 && facts.accepted > 0) add('went_well.quality', 'went_well', { accepted: facts.accepted });
  if (answers.wait === 'review' || facts.maxReviewWaitMs >= config.review.waitThresholdMs) {
    if (facts.maxReviewWaitMs > 0) add('slowed.review', 'slowed_us', { waitSec: sec(facts.maxReviewWaitMs) });
    add('try.review', 'try', { limitSec: sec(config.agreements.reviewWaitMs) });
  }
  if (answers.wait === 'pair' || (answers.wait === undefined && facts.pairWaitMs > 0)) {
    if (facts.pairWaitMs > 0) add('slowed.pair', 'slowed_us', { waitSec: sec(facts.pairWaitMs) });
    add('try.pair', 'try');
  }
  if (answers.wait === 'info' || (answers.wait === undefined && facts.blockedUnhelped > 0)) {
    if (facts.blockedUnhelped > 0) add('slowed.info', 'slowed_us', { count: facts.blockedUnhelped });
    add('try.info', 'try');
  }
  if (answers.overload === 'yes' || (answers.overload === undefined && wipIsHigh(facts))) {
    add('slowed.wip', 'slowed_us', { wipMax: facts.wipMax, players: facts.players });
    const suggested = Math.max(config.agreements.wipLimitMin, Math.ceil(facts.players / 2));
    add(facts.kanban ? 'try.limits' : 'try.wip', 'try', { suggested });
  }
  if (facts.unfinished > 0 || answers.unfinished !== undefined) {
    if (facts.unfinished > 0) add('slowed.unfinished', 'slowed_us', { count: facts.unfinished });
    add(facts.kanban ? 'try.finish_first' : 'try.estimates', 'try');
  }
  if (facts.escaped > 0 || answers.defects !== undefined) {
    if (facts.escaped > 0) add('slowed.defects', 'slowed_us', { count: facts.escaped });
    add('try.review_care', 'try');
  }
  if (answers.limits === 'too_tight') add('slowed.limits', 'slowed_us', { limit: facts.inProgressLimit ?? 0 });
  if (answers.limits === 'too_loose') add('try.limits', 'try', { suggested: Math.max(config.agreements.wipLimitMin, Math.ceil(facts.players / 2)) });
  if (!facts.kanban && facts.goalMet === false) add('slowed.goal', 'slowed_us', { theme: facts.theme });
  if (answers.events === 'plan' || facts.planOverrunMs > 0) add('slowed.plan', 'slowed_us', { overrunSec: sec(facts.planOverrunMs) });
  if (answers.events === 'daily' || facts.dailyOverrunMs > 0) add('slowed.daily', 'slowed_us', { overrunSec: sec(facts.dailyOverrunMs) });
  if (answers.next === 'faster') add('try.focus', 'try');
  if (answers.next === 'safer') add('try.review_care', 'try');
  if (answers.next === 'calmer') {
    add(facts.kanban ? 'try.limits' : 'try.wip', 'try', facts.kanban ? { suggested: Math.max(config.agreements.wipLimitMin, Math.ceil(facts.players / 2)) } : {});
  }
  const seen = new Set<string>();
  return out
    .filter((proposal) => {
      if (seen.has(proposal.id) || state.used.includes(proposal.id)) return false;
      seen.add(proposal.id);
      return true;
    })
    .slice(0, 6);
}
