import { config } from '../config.ts';
import type {
  BaseView,
  FlowComparison,
  IterationMetrics,
  KanbanInspectView,
  KanbanPlayerView,
  KanbanView,
  ReplenishView,
  RoomState,
} from '../types.ts';
import { arrivalsTotal, pendingArrival, startBlocked, submitBlocked } from './flow.ts';
import { currentIteration, revealedVerdicts } from './util.ts';

function replenishView(s: RoomState): ReplenishView {
  return {
    readyMax: config.kanban.readyMax,
    ready: s.items.filter((item) => item.status === 'todo').length,
    pool: s.items.filter((item) => item.status === 'backlog').length,
    limitMin: config.kanban.wipLimitMin,
    limitMax: config.kanban.wipLimitMax,
    settingLimits: s.phase.kind === 'plan' && s.phase.step === 'limits',
  };
}

function boardView(s: RoomState): KanbanView {
  const state = currentIteration(s);
  const count = (status: string): number => s.items.filter((item) => item.status === status).length;
  return {
    limits: { ...state.wipLimits },
    ready: count('todo'),
    inProgress: count('doing'),
    review: count('review'),
    done: count('done'),
    startBlockedByLimit: startBlocked(s),
    submitBlockedByLimit: submitBlocked(s),
    nextArrivalAt: pendingArrival(s),
    arrivalsLeft: state.arrivalsLeft,
    arrivalsTotal: arrivalsTotal(),
  };
}

function comparisonOf(s: RoomState): FlowComparison | null {
  const first = s.iterations[0]?.metrics ?? null;
  const second = s.iterations[1]?.metrics ?? null;
  if (first === null || second === null) return null;
  const pair = (pick: (own: IterationMetrics) => number | null): { first: number | null; second: number | null } => ({
    first: pick(first),
    second: pick(second),
  });
  return {
    throughput: pair((own) => own.throughput),
    averageCycleMs: pair((own) => own.averageCycleMs),
    wipMax: pair((own) => own.wipMax),
    openCount: pair((own) => own.openAges.length),
    escapedDefects: pair((own) => own.escapedDefects),
    valueDelivered: pair((own) => own.valueDelivered),
    limits: { ...(second.wipLimits ?? { inProgress: null, review: null }) },
  };
}

function inspectView(s: RoomState): KanbanInspectView {
  const state = currentIteration(s);
  const step = s.phase.kind === 'inspect' ? s.phase.step : 'card';
  const flowShown = step === 'flow' || step === 'comparison';
  return {
    verdicts: revealedVerdicts(state),
    verdictsTotal: state.verdicts.length,
    valueDelivered: flowShown ? state.metrics?.valueDelivered ?? null : null,
    flow: flowShown ? JSON.parse(JSON.stringify(state.metrics)) : null,
    comparison: step === 'comparison' ? comparisonOf(s) : null,
  };
}

const KanbanSteps = {
  planFirst: ['card', 'replenish'],
  planSecond: ['card', 'replenish', 'limits'],
  inspectFirst: ['card', 'increment', 'flow'],
  inspectSecond: ['card', 'increment', 'flow', 'comparison'],
} as const;

/**
 * The steps of a Kanban event as the facilitator's script counts them; null for events that follow the shared script.
 */
export function kanbanScriptSteps(kind: string, first: boolean): readonly string[] | null {
  if (kind === 'plan') return first ? KanbanSteps.planFirst : KanbanSteps.planSecond;
  if (kind === 'inspect') return first ? KanbanSteps.inspectFirst : KanbanSteps.inspectSecond;
  return null;
}

/**
 * Builds the Kanban player's view from the parts both frameworks share.
 */
export function kanbanView(s: RoomState, base: BaseView): KanbanPlayerView {
  const started = s.iterations.length > 0;
  const workspace = base.workspace;
  return {
    ...base,
    framework: 'kanban',
    limits: started ? { ...currentIteration(s).wipLimits } : null,
    kanban: started ? boardView(s) : null,
    workspace: workspace !== null && workspace.mode === 'work' ? { ...workspace, submitBlockedByLimit: submitBlocked(s) } : workspace,
    planning: s.phase.kind === 'plan' ? { replenish: replenishView(s) } : null,
    inspect: s.phase.kind === 'inspect' ? inspectView(s) : null,
  };
}
