import type {
  Agreement,
  AgreementType,
  BaseView,
  Framework,
  IterationNumber,
  IterationState,
  ObservationGroup,
  Player,
  PlayerView,
  RoomState,
  StampedClientAction,
} from '../types.ts';
import { cleanAgreement } from './agreements.ts';
import { generateBacklog } from './backlog.ts';
import { kanbanCandidates, scrumCandidates, type Candidate } from './candidates.ts';
import { flowCycleTime, flowIterationStart, flowOpenAge, flowWorkBegin, flowWorkTick } from './flow.ts';
import { inspectAdvance, inspectBegin, inspectReveal } from './inspect.ts';
import {
  kanbanCleanAgreement,
  kanbanInspectAdvance,
  kanbanPlanAction,
  kanbanPlanAdvance,
  kanbanPlanBegin,
  kanbanSuggestions,
} from './kanban.ts';
import { kanbanScriptSteps, kanbanView } from './kanban-view.ts';
import { planAction, planAdvance, planBegin, scrumIterationStart } from './scrum-plan.ts';
import { scrumView } from './scrum-view.ts';
import { currentIteration, type Refusal } from './util.ts';

/**
 * Everything that differs between the frameworks, behind one seam; the shared machine only calls these.
 */
export interface FrameworkRules {
  readonly wipLimits: boolean;
  readonly backlogPull: boolean;
  canStart(s: RoomState): boolean;
  start(s: RoomState): Refusal;
  planBegin(s: RoomState): void;
  planAction(s: RoomState, action: StampedClientAction, p: Player): Refusal;
  planAdvance(s: RoomState, p: Player): Refusal;
  inspectBegin(s: RoomState): void;
  inspectReveal(s: RoomState, p: Player): Refusal;
  inspectAdvance(s: RoomState, p: Player): Refusal;
  cleanAgreement(agreement: Agreement): Agreement | null;
  suggestedAgreements(s: RoomState): AgreementType[];
  onIterationStart(s: RoomState, state: IterationState, iteration: IterationNumber): void;
  onWorkBegin(s: RoomState, half: 1 | 2): void;
  onWorkTick(s: RoomState, cutoff: number): void;
  wipCount(doing: number, reviewing: number): number;
  cycleTime(state: IterationState, from: number, to: number): number;
  openAge(s: RoomState, state: IterationState, startedAt: number | null): number;
  observationCandidates(s: RoomState, group: ObservationGroup): Candidate[];
  scriptSteps(kind: string, first: boolean): readonly string[] | null;
  view(s: RoomState, p: Player, base: BaseView): PlayerView;
}

function scrumSuggestions(s: RoomState): AgreementType[] {
  const sig = currentIteration(s).signals;
  const ranked: [AgreementType, number][] = [
    ['wip_limit', sig.wipMax],
    ['review_wait', sig.maxReviewWaitMs / 10_000],
    ['no_new_while_blocked', sig.blockedUnhelpedAtDaily * 3],
    ['pair_first', sig.pairWaitMs / 10_000],
  ];
  const order = ranked.sort((a, b) => b[1] - a[1]).map(([type]) => type);
  return [...order, 'free'];
}

const scrum: FrameworkRules = {
  wipLimits: false,
  backlogPull: true,
  canStart: () => true,
  start: (s) => {
    generateBacklog(s);
    return null;
  },
  planBegin,
  planAction,
  planAdvance,
  inspectBegin,
  inspectReveal,
  inspectAdvance,
  cleanAgreement,
  suggestedAgreements: scrumSuggestions,
  onIterationStart: scrumIterationStart,
  onWorkBegin: () => undefined,
  onWorkTick: () => undefined,
  wipCount: (doing) => doing,
  cycleTime: (_state, from, to) => to - from,
  openAge: (s, _state, startedAt) => s.now - (startedAt ?? s.now),
  observationCandidates: scrumCandidates,
  scriptSteps: () => null,
  view: scrumView,
};

const kanban: FrameworkRules = {
  wipLimits: true,
  backlogPull: false,
  canStart: () => true,
  start: () => null,
  planBegin: kanbanPlanBegin,
  planAction: kanbanPlanAction,
  planAdvance: kanbanPlanAdvance,
  inspectBegin,
  inspectReveal,
  inspectAdvance: kanbanInspectAdvance,
  cleanAgreement: kanbanCleanAgreement,
  suggestedAgreements: kanbanSuggestions,
  onIterationStart: (s, _state, iteration) => flowIterationStart(s, iteration),
  onWorkBegin: flowWorkBegin,
  onWorkTick: flowWorkTick,
  wipCount: (doing, reviewing) => doing + reviewing,
  cycleTime: flowCycleTime,
  openAge: flowOpenAge,
  observationCandidates: kanbanCandidates,
  scriptSteps: kanbanScriptSteps,
  view: (s, _p, base) => kanbanView(s, base),
};

const table: Record<Framework, FrameworkRules> = { scrum, kanban };

export function rulesFor(s: RoomState): FrameworkRules {
  return table[s.framework];
}
