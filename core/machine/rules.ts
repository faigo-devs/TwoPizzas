import type { Agreement, AgreementType, Framework, Player, RoomState, StampedClientAction } from '../types.ts';
import { cleanAgreement } from './agreements.ts';
import { generateBacklog } from './backlog.ts';
import { inspectAdvance, inspectBegin, inspectReveal } from './inspect.ts';
import {
  kanbanCleanAgreement,
  kanbanInspectAdvance,
  kanbanPlanAction,
  kanbanPlanAdvance,
  kanbanPlanBegin,
  kanbanSuggestions,
} from './kanban.ts';
import { planAction, planAdvance, planBegin } from './plan.ts';
import { currentIteration, type Refusal } from './util.ts';

/**
 * Everything that differs between the frameworks, behind one seam; the shared machine only calls these.
 */
export interface FrameworkRules {
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
};

const kanban: FrameworkRules = {
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
};

const table: Record<Framework, FrameworkRules> = { scrum, kanban };

export function rulesFor(s: RoomState): FrameworkRules {
  return table[s.framework];
}
