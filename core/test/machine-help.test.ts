import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { helpProposals, helpQuestions } from '../machine/help.ts';
import type { Framework, HelpProposal, RetroHelpState, RoomState } from '../types.ts';
import { playGame } from './machine-support.ts';

interface Facts {
  accepted: number;
  value: number;
  escaped: number;
  unfinished: number;
  goalMet: boolean | null;
  wipMax: number;
  reviewWaitMs: number;
  pairWaitMs: number;
  blocked: number;
  planOverrunMs: number;
  dailyOverrunMs: number;
  limit: number | null;
  limitReached: boolean;
  throughputUp: boolean;
}

const Quiet: Facts = {
  accepted: 0,
  value: 0,
  escaped: 0,
  unfinished: 0,
  goalMet: null,
  wipMax: 0,
  reviewWaitMs: 0,
  pairWaitMs: 0,
  blocked: 0,
  planOverrunMs: 0,
  dailyOverrunMs: 0,
  limit: null,
  limitReached: false,
  throughputUp: false,
};

const cache = new Map<Framework, string>();

function finished(framework: Framework): string {
  const known = cache.get(framework);
  if (known !== undefined) return known;
  const text = JSON.stringify(playGame({ players: 4, seed: 4242424, framework, checks: false }).state);
  cache.set(framework, text);
  return text;
}

function stateWith(framework: Framework, patch: Partial<Facts>): RoomState {
  const facts = { ...Quiet, ...patch };
  const state = JSON.parse(finished(framework)) as RoomState;
  const first = state.iterations[0]?.metrics;
  const iteration = state.iterations[1];
  assert.ok(first !== null && first !== undefined && iteration !== undefined && iteration.metrics !== null);
  const metrics = iteration.metrics;
  metrics.accepted = facts.accepted;
  metrics.valueDelivered = facts.value;
  metrics.escapedDefects = facts.escaped;
  metrics.openAges = Array.from({ length: facts.unfinished }, (_, index) => ({ itemId: `#${index + 1}`, ageMs: 1000 }));
  metrics.goalMet = facts.goalMet;
  metrics.throughput = facts.throughputUp ? first.throughput + 1 : first.throughput;
  iteration.goal = framework === 'scrum' && facts.goalMet !== null ? 'payments' : null;
  iteration.wipLimits = { inProgress: facts.limit, review: null };
  const sig = iteration.signals;
  sig.wipMax = facts.wipMax;
  sig.inProgressMax = facts.limitReached && facts.limit !== null ? facts.limit : 0;
  sig.maxReviewWaitMs = facts.reviewWaitMs;
  sig.pairWaitMs = facts.pairWaitMs;
  sig.blockedUnhelpedAtDaily = facts.blocked;
  sig.planOverrunMs = facts.planOverrunMs;
  sig.dailyOverrunMs = facts.dailyOverrunMs;
  return state;
}

function questionIds(framework: Framework, patch: Partial<Facts>): string[] {
  return helpQuestions(stateWith(framework, patch)).map((own) => own.id);
}

function proposalsOf(
  framework: Framework,
  patch: Partial<Facts>,
  answers: Record<string, string> = {},
  used: string[] = [],
): HelpProposal[] {
  const help: RetroHelpState = { answers, used };
  return helpProposals(stateWith(framework, patch), help);
}

function ids(list: HelpProposal[]): string[] {
  return list.map((own) => own.id);
}

const Both: Framework[] = ['scrum', 'kanban'];

test('with nothing to report the questions are the two general ones', () => {
  for (const framework of Both) assert.deepEqual(questionIds(framework, {}), ['general', 'next']);
});

test('the wait question appears for a long review wait, a pair wait or an unhelped blocked item', () => {
  for (const framework of Both) {
    for (const patch of [{ reviewWaitMs: config.review.waitThresholdMs }, { pairWaitMs: 1000 }, { blocked: 1 }]) {
      assert.equal(questionIds(framework, patch)[0], 'wait');
    }
    assert.ok(!questionIds(framework, { reviewWaitMs: config.review.waitThresholdMs - 1 }).includes('wait'));
  }
  const question = helpQuestions(stateWith('scrum', { reviewWaitMs: 61_000, pairWaitMs: 12_000, blocked: 2 }))[0];
  assert.deepEqual(question, {
    id: 'wait',
    choices: ['review', 'pair', 'info', 'none'],
    params: { reviewWaitSec: 61, pairWaitSec: 12, blocked: 2 },
  });
});

test('the overload question starts at as many items as players', () => {
  for (const framework of Both) {
    assert.ok(!questionIds(framework, { wipMax: 3 }).includes('overload'));
    const question = helpQuestions(stateWith(framework, { wipMax: 4 })).find((own) => own.id === 'overload');
    assert.deepEqual(question, { id: 'overload', choices: ['yes', 'no'], params: { wipMax: 4, players: 4 } });
  }
});

test('the unfinished question offers estimates in Scrum and never in Kanban', () => {
  const scrum = helpQuestions(stateWith('scrum', { unfinished: 2 })).find((own) => own.id === 'unfinished');
  const kanban = helpQuestions(stateWith('kanban', { unfinished: 2 })).find((own) => own.id === 'unfinished');
  assert.deepEqual(scrum?.choices, ['estimates', 'overload', 'blocked', 'other']);
  assert.deepEqual(kanban?.choices, ['overload', 'blocked', 'review', 'other']);
  assert.equal(scrum?.params.count, 2);
  for (const framework of Both) assert.ok(!questionIds(framework, {}).includes('unfinished'));
});

test('the defects question needs an escaped defect', () => {
  for (const framework of Both) {
    assert.ok(questionIds(framework, { escaped: 1 }).includes('defects'));
    assert.ok(!questionIds(framework, { escaped: 0 }).includes('defects'));
    const question = helpQuestions(stateWith(framework, { escaped: 3 })).find((own) => own.id === 'defects');
    assert.deepEqual(question, { id: 'defects', choices: ['rushed', 'unclear', 'no_time', 'other'], params: { count: 3 } });
  }
});

test('the goal question belongs to Scrum only', () => {
  assert.ok(questionIds('scrum', { goalMet: false }).includes('goal'));
  assert.ok(!questionIds('scrum', { goalMet: true }).includes('goal'));
  assert.ok(!questionIds('kanban', { goalMet: false }).includes('goal'));
});

test('the events question follows the overruns of planning and the daily', () => {
  for (const framework of Both) {
    assert.ok(questionIds(framework, { planOverrunMs: 5000 }).includes('events'));
    assert.ok(questionIds(framework, { dailyOverrunMs: 5000 }).includes('events'));
    assert.ok(!questionIds(framework, {}).includes('events'));
  }
});

test('the limits question exists in Kanban when a limit was set', () => {
  assert.ok(!questionIds('kanban', {}).includes('limits'));
  const question = helpQuestions(stateWith('kanban', { limit: 3, limitReached: true })).find((own) => own.id === 'limits');
  assert.deepEqual(question, { id: 'limits', choices: ['helped', 'too_tight', 'too_loose'], params: { limit: 3, reached: 1 } });
  assert.ok(!questionIds('scrum', { limit: 3 }).includes('limits'));
});

test('at most the configured number of questions, the most pressing first', () => {
  const all = { reviewWaitMs: 90_000, wipMax: 6, unfinished: 1, escaped: 1, goalMet: false, planOverrunMs: 1000 };
  for (const framework of Both) {
    const list = questionIds(framework, all);
    assert.equal(list.length, config.retro.helpQuestionsMax);
    assert.deepEqual(list.slice(0, 2), ['wait', 'overload']);
  }
});

test('the praise proposals follow accepted work, quality and the goal', () => {
  for (const framework of Both) {
    assert.deepEqual(ids(proposalsOf(framework, {})), []);
    const good = proposalsOf(framework, { accepted: 3, value: 14 });
    assert.deepEqual(ids(good), ['went_well.value', 'went_well.quality']);
    assert.deepEqual(good[0]?.params, { accepted: 3, value: 14 });
    assert.deepEqual(good[1]?.params, { accepted: 3 });
    assert.ok(good.every((own) => own.column === 'went_well'));
    assert.ok(!ids(proposalsOf(framework, { accepted: 3, escaped: 1 })).includes('went_well.quality'));
  }
  assert.ok(ids(proposalsOf('scrum', { goalMet: true })).includes('went_well.goal'));
  assert.ok(!ids(proposalsOf('kanban', { goalMet: true })).includes('went_well.goal'));
});

test('the review wait proposals come from the number or from the answer', () => {
  for (const framework of Both) {
    const fromNumber = proposalsOf(framework, { reviewWaitMs: 70_000 });
    assert.deepEqual(ids(fromNumber), ['slowed.review', 'try.review']);
    assert.deepEqual(fromNumber[0]?.params, { waitSec: 70 });
    assert.deepEqual(fromNumber[1]?.params, { limitSec: 60 });
    assert.deepEqual(ids(proposalsOf(framework, {}, { wait: 'review' })), ['slowed.review', 'try.review']);
    assert.deepEqual(ids(proposalsOf(framework, {}, { wait: 'none' })), []);
  }
});

test('the pair wait proposals are replaced by the answer once one is given', () => {
  for (const framework of Both) {
    assert.deepEqual(ids(proposalsOf(framework, { pairWaitMs: 20_000 })), ['slowed.pair', 'try.pair']);
    assert.deepEqual(ids(proposalsOf(framework, { pairWaitMs: 20_000 }, { wait: 'review' })), ['slowed.review', 'try.review']);
    assert.deepEqual(ids(proposalsOf(framework, {}, { wait: 'pair' })), ['slowed.pair', 'try.pair']);
  }
});

test('the missing information proposals follow blocked items or the answer', () => {
  for (const framework of Both) {
    const list = proposalsOf(framework, { blocked: 2 });
    assert.deepEqual(ids(list), ['slowed.info', 'try.info']);
    assert.deepEqual(list[0]?.params, { count: 2 });
    assert.deepEqual(ids(proposalsOf(framework, {}, { wait: 'info' })), ['slowed.info', 'try.info']);
    assert.deepEqual(ids(proposalsOf(framework, { blocked: 2 }, { wait: 'pair' })), ['slowed.pair', 'try.pair']);
  }
});

test('the overload proposals suggest a WIP number in Scrum and limits in Kanban', () => {
  assert.deepEqual(ids(proposalsOf('scrum', { wipMax: 6 })), ['slowed.wip', 'try.wip']);
  assert.deepEqual(ids(proposalsOf('kanban', { wipMax: 6 })), ['slowed.wip', 'try.limits']);
  for (const framework of Both) {
    const list = proposalsOf(framework, { wipMax: 6 });
    assert.deepEqual(list[0]?.params, { wipMax: 6, players: 4 });
    assert.deepEqual(list[1]?.params, { suggested: 2 });
    assert.equal(list[1]?.column, 'try');
    assert.equal(ids(proposalsOf(framework, {}, { overload: 'yes' })).length, 2);
    assert.deepEqual(ids(proposalsOf(framework, { wipMax: 6 }, { overload: 'no' })), []);
    assert.deepEqual(ids(proposalsOf(framework, { wipMax: 5 })), []);
  }
});

test('the unfinished proposals offer estimates in Scrum and finishing first in Kanban', () => {
  assert.deepEqual(ids(proposalsOf('scrum', { unfinished: 2 })), ['slowed.unfinished', 'try.estimates']);
  assert.deepEqual(ids(proposalsOf('kanban', { unfinished: 2 })), ['slowed.unfinished', 'try.finish_first']);
  for (const framework of Both) {
    assert.equal(proposalsOf(framework, { unfinished: 2 })[0]?.params.count, 2);
    assert.equal(ids(proposalsOf(framework, {}, { unfinished: 'other' })).length, 2);
  }
});

test('the defect proposals follow escaped defects or the answer', () => {
  for (const framework of Both) {
    const list = proposalsOf(framework, { escaped: 2 });
    assert.deepEqual(ids(list), ['slowed.defects', 'try.review_care']);
    assert.deepEqual(list[0]?.params, { count: 2 });
    assert.deepEqual(ids(proposalsOf(framework, {}, { defects: 'rushed' })), ['slowed.defects', 'try.review_care']);
  }
});

test('the goal proposal belongs to Scrum only', () => {
  assert.deepEqual(ids(proposalsOf('scrum', { goalMet: false })), ['slowed.goal']);
  assert.deepEqual(ids(proposalsOf('kanban', { goalMet: false })), []);
});

test('the event overrun proposals follow the numbers or the answer', () => {
  for (const framework of Both) {
    assert.deepEqual(ids(proposalsOf(framework, { planOverrunMs: 4000 })), ['slowed.plan']);
    assert.deepEqual(ids(proposalsOf(framework, { dailyOverrunMs: 4000 })), ['slowed.daily']);
    assert.deepEqual(ids(proposalsOf(framework, {}, { events: 'plan' })), ['slowed.plan']);
    assert.deepEqual(ids(proposalsOf(framework, {}, { events: 'daily' })), ['slowed.daily']);
    assert.deepEqual(ids(proposalsOf(framework, {}, { events: 'none' })), []);
    assert.deepEqual(proposalsOf(framework, { planOverrunMs: 4000 })[0]?.params, { overrunSec: 4 });
  }
});

test('the next-step answers map to try proposals; Kanban answers with limits', () => {
  for (const framework of Both) {
    assert.deepEqual(ids(proposalsOf(framework, {}, { next: 'faster' })), ['try.focus']);
    assert.deepEqual(ids(proposalsOf(framework, {}, { next: 'safer' })), ['try.review_care']);
  }
  assert.deepEqual(ids(proposalsOf('scrum', {}, { next: 'calmer' })), ['try.wip']);
  assert.deepEqual(ids(proposalsOf('kanban', {}, { next: 'calmer' })), ['try.limits']);
  assert.deepEqual(proposalsOf('kanban', {}, { next: 'calmer' })[0]?.params, { suggested: 2 });
});

test('the Kanban limit proposals follow the limit, the flow and the answer to the limits question', () => {
  assert.deepEqual(ids(proposalsOf('kanban', { limit: 3, limitReached: true })), ['went_well.limits']);
  assert.deepEqual(proposalsOf('kanban', { limit: 3, limitReached: true })[0]?.params, { limit: 3 });
  assert.deepEqual(ids(proposalsOf('kanban', { limit: 3 })), []);
  assert.deepEqual(ids(proposalsOf('scrum', { limit: 3, limitReached: true })), []);
  assert.deepEqual(ids(proposalsOf('kanban', { throughputUp: true, accepted: 1 })), ['went_well.value', 'went_well.throughput', 'went_well.quality']);
  assert.deepEqual(ids(proposalsOf('kanban', { limit: 3 }, { limits: 'too_tight' })), ['slowed.limits']);
  assert.deepEqual(ids(proposalsOf('kanban', { limit: 3 }, { limits: 'too_loose' })), ['try.limits']);
  assert.deepEqual(ids(proposalsOf('kanban', { limit: 3 }, { limits: 'helped' })), []);
});

test('used proposals are left out, duplicates collapse and no more than six are offered', () => {
  const all = {
    accepted: 2,
    value: 9,
    reviewWaitMs: 90_000,
    pairWaitMs: 5000,
    blocked: 1,
    wipMax: 6,
    unfinished: 1,
    escaped: 1,
    planOverrunMs: 1000,
    dailyOverrunMs: 1000,
  };
  for (const framework of Both) {
    const full = proposalsOf(framework, all);
    assert.equal(full.length, 6);
    assert.equal(new Set(ids(full)).size, 6);
    const first = full[0]?.id ?? '';
    const next = proposalsOf(framework, all, {}, [first]);
    assert.ok(!ids(next).includes(first));
    assert.equal(next.length, 6);
  }
});

test('nothing offered in a Kanban room mentions goals, estimates or velocity', () => {
  const heavy = { accepted: 2, value: 9, unfinished: 2, wipMax: 6, escaped: 1, goalMet: false, limit: 3, limitReached: true };
  const answers = { unfinished: 'other', next: 'calmer', limits: 'too_loose', overload: 'yes', defects: 'rushed' };
  const forbidden = /goal|estimate|velocity/u;
  const proposals = proposalsOf('kanban', heavy, answers);
  for (const own of proposals) assert.ok(!forbidden.test(own.id), own.id);
  const questions = helpQuestions(stateWith('kanban', heavy));
  for (const own of questions) {
    assert.ok(!forbidden.test(own.id), own.id);
    for (const choice of own.choices) assert.ok(!forbidden.test(choice), choice);
  }
});
