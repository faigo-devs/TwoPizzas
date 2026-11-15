import type {
  AgreementType,
  DailyPhase,
  ErrorCode,
  EventKind,
  Framework,
  InspectPhase,
  ItemStatus,
  ObservationId,
  PlanPhase,
  PuzzleKind,
  RetroColumn,
  RetroPhase,
  WorkPhase,
} from '../../../core/types.ts';

export const observationIds: Record<ObservationId, true> = {
  'plan.overtime': true,
  'plan.onTime': true,
  'plan.unestimatedPulled': true,
  'plan.allEstimated': true,
  'plan.overcommitted': true,
  'plan.fitsVelocity': true,
  'daily.overtime': true,
  'daily.onTime': true,
  'daily.blockedUnhelped': true,
  'daily.blockedHelped': true,
  'daily.reviewWaiting': true,
  'daily.reviewFlowing': true,
  'daily.planUnchanged': true,
  'daily.planAdapted': true,
  'work.wipHigh': true,
  'work.wipLow': true,
  'work.unfinished': true,
  'work.allFinished': true,
  'work.waitingForPair': true,
  'inspect.escapedDefects': true,
  'inspect.noEscapedDefects': true,
  'inspect.goalMet': true,
  'inspect.goalMissed': true,
  'retro.noAction': true,
  'retro.actionChosen': true,
  'retro.actionKept': true,
  'retro.actionBroken': true,
};

export const errorCodes: Record<ErrorCode, true> = {
  room_not_found: true,
  room_full: true,
  already_started: true,
  not_allowed: true,
  bad_request: true,
  rate_limited: true,
};

export const agreementTypes: Record<AgreementType, true> = {
  wip_limit: true,
  review_wait: true,
  no_new_while_blocked: true,
  pair_first: true,
  wip_limits_set: true,
  free: true,
};

export const itemStatuses: Record<ItemStatus, true> = {
  backlog: true,
  todo: true,
  doing: true,
  review: true,
  done: true,
};

export const puzzleKinds: Record<PuzzleKind, true> = {
  review: true,
  order: true,
  incident: true,
  merge: true,
};

export const retroColumns: Record<RetroColumn, true> = {
  went_well: true,
  slowed_us: true,
  try: true,
};

export const eventKinds: Record<EventKind | 'work', true> = {
  plan: true,
  work: true,
  daily: true,
  inspect: true,
  retro: true,
};

type Frameworks = readonly Framework[];
const both: Frameworks = ['scrum', 'kanban'];
const scrum: Frameworks = ['scrum'];
const kanban: Frameworks = ['kanban'];

export const stepFrameworks: {
  plan: Record<PlanPhase['step'], Frameworks>;
  work: Record<WorkPhase['step'], Frameworks>;
  daily: Record<DailyPhase['step'], Frameworks>;
  inspect: Record<InspectPhase['step'], Frameworks>;
  retro: Record<RetroPhase['step'], Frameworks>;
} = {
  plan: { card: both, goal: scrum, estimate: scrum, commit: scrum, replenish: kanban, limits: kanban },
  work: { card: both, running: both },
  daily: { card: both, walk: both },
  inspect: { card: both, increment: scrum, result: scrum, feedback: scrum, flow: kanban, comparison: kanban },
  retro: { card: both, previous: both, notes: both, vote: both, action: both },
};

export const helpChoices: Record<string, readonly string[]> = {
  wait: ['review', 'pair', 'info', 'none'],
  overload: ['yes', 'no'],
  unfinished: ['estimates', 'overload', 'blocked', 'other'],
  defects: ['rushed', 'unclear', 'no_time', 'other'],
  goal: ['scope', 'blocked', 'other'],
  events: ['plan', 'daily', 'none'],
  general: ['good', 'bad'],
  next: ['faster', 'safer', 'calmer'],
};

export const helpProposalIds: readonly string[] = [
  'went_well.value',
  'went_well.goal',
  'went_well.quality',
  'slowed.review',
  'try.review',
  'slowed.pair',
  'try.pair',
  'slowed.info',
  'try.info',
  'slowed.wip',
  'try.wip',
  'slowed.unfinished',
  'try.estimates',
  'slowed.defects',
  'try.review_care',
  'slowed.goal',
  'slowed.plan',
  'slowed.daily',
  'try.focus',
];

export const buttonKeys = [
  'start.create',
  'start.join',
  'start.solo',
  'lobby.newTeamName',
  'lobby.volunteer.scrum',
  'lobby.volunteer.kanban',
  'lobby.withdraw',
  'lobby.start',
  'lobby.copyCode',
  'phase.begin',
  'phase.next',
  'script.markDone',
  'goal.confirm',
  'goal.vote',
  'poker.reveal',
  'poker.revote',
  'poker.record',
  'poker.stop',
  'commit.pull',
  'commit.unpull',
  'commit.start',
  'replenish.pull',
  'replenish.unpull',
  'replenish.start',
  'limits.save',
  'item.take',
  'item.leave',
  'item.open',
  'item.joinSecond',
  'item.review',
  'item.promiseHelp',
  'item.withdrawHelp',
  'item.close',
  'item.submit',
  'puzzle.verdict.lgtm',
  'puzzle.verdict.changes',
  'daily.end.scrum',
  'daily.end.kanban',
  'inspect.reveal',
  'retro.noteAdd',
  'retro.reveal',
  'retro.vote',
  'retro.unvote',
  'retro.action.choose',
  'retro.help.button',
  'retro.help.use',
  'summary.print',
  'summary.publish',
  'summary.again',
  'tour.next',
  'tour.back',
  'tour.exit',
  'tour.finish',
] as const;
