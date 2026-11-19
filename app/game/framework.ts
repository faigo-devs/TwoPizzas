import type {
  EventKind,
  Framework,
  GoalView,
  IterationMetrics,
  KanbanPlayerView,
  KanbanView,
  PlayerView,
  ScrumPlayerView,
} from '../../core/index.ts';
import type { Key } from '../i18n/index.ts';

/**
 * What differs between the frameworks on the screens: capability flags and copy keys, so a screen never asks which framework it is.
 */
export interface Profile {
  readonly estimates: boolean;
  readonly goals: boolean;
  readonly velocity: boolean;
  readonly limits: boolean;
  readonly arrivals: boolean;
  readonly backlogPull: boolean;
  readonly wipNote: boolean;
  readonly realInline: boolean;
  readonly pinnedWorkQuestion: boolean;
  readonly roles: readonly { who: Key; what: string }[];
  readonly recapEvents: readonly (EventKind | 'work')[];
  readonly sizeMetric: { numbers: Key; compared: Key; pick: (metrics: IterationMetrics) => number };
  readonly softEnd: Key;
  readonly scoreNote: Key;
  readonly learnedTitle: Key;
  readonly learned: Key;
  readonly incrementTitle: Key;
  readonly rejectedText: Key;
  readonly dailyAsk: Key;
  readonly tourTitleSuffixSteps: readonly string[];
  readonly tourSuffix: string;
}

const scrum: Profile = {
  estimates: true,
  goals: true,
  velocity: true,
  limits: false,
  arrivals: false,
  backlogPull: true,
  wipNote: true,
  realInline: true,
  pinnedWorkQuestion: false,
  roles: [
    { who: 'role.productOwner', what: 'role.productOwner' },
    { who: 'role.developers', what: 'role.developers' },
    { who: 'role.scrumMaster', what: 'role.scrumMaster' },
  ],
  recapEvents: ['work', 'plan', 'daily', 'inspect', 'retro'],
  sizeMetric: { numbers: 'summary.velocity', compared: 'summary.velocity', pick: (metrics) => metrics.velocity },
  softEnd: 'phase.ends.soft',
  scoreNote: 'summary.scoreNote',
  learnedTitle: 'summary.learnedTitle',
  learned: 'summary.learned',
  incrementTitle: 'inspect.increment',
  rejectedText: 'inspect.verdict.rejectedText',
  dailyAsk: 'daily.ask.goal',
  tourTitleSuffixSteps: [],
  tourSuffix: '',
};

const kanban: Profile = {
  estimates: false,
  goals: false,
  velocity: false,
  limits: true,
  arrivals: true,
  backlogPull: false,
  wipNote: false,
  realInline: false,
  pinnedWorkQuestion: true,
  roles: [
    { who: 'role.customer', what: 'role.customer' },
    { who: 'role.team', what: 'role.team' },
    { who: 'role.facilitator.kanban', what: 'role.facilitator' },
  ],
  recapEvents: ['plan', 'daily', 'inspect', 'retro'],
  sizeMetric: { numbers: 'kanban.metric.throughput', compared: 'summary.throughput', pick: (metrics) => metrics.throughput },
  softEnd: 'phase.ends.soft.kanban',
  scoreNote: 'summary.scoreNote.kanban',
  learnedTitle: 'summary.learnedTitle.kanban',
  learned: 'summary.learned.kanban',
  incrementTitle: 'delivery.verdicts',
  rejectedText: 'inspect.verdict.rejectedTextKanban',
  dailyAsk: 'daily.ask.ready',
  tourTitleSuffixSteps: ['review'],
  tourSuffix: '.kanban',
};

const profiles: Record<Framework, Profile> = { scrum, kanban };

/**
 * The profile of a framework.
 */
export function profileOf(framework: Framework): Profile {
  return profiles[framework];
}

/**
 * Chooses what to build for the view's framework; each case receives the view narrowed to its variant.
 */
export function byFramework<R>(
  view: PlayerView,
  cases: { scrum: (own: ScrumPlayerView) => R; kanban: (own: KanbanPlayerView) => R },
): R {
  return view.framework === 'scrum' ? cases.scrum(view) : cases.kanban(view);
}

/**
 * The Kanban board in numbers, or null when the view is not a Kanban view or the game has not started.
 */
export function boardOf(view: PlayerView): KanbanView | null {
  return byFramework(view, { scrum: () => null, kanban: (own) => own.kanban });
}

/**
 * The confirmed Sprint Goal with its progress, or null when there is none to show.
 */
export function goalOf(view: PlayerView): GoalView | null {
  return byFramework(view, { scrum: (own) => own.goal, kanban: () => null });
}

/**
 * The theme of the Sprint Goal as far as the team has voted or confirmed it, or null.
 */
export function goalThemeOf(view: PlayerView): string | null {
  return byFramework(view, { scrum: (own) => own.goal?.theme ?? own.planning?.goal ?? null, kanban: () => null });
}

/**
 * Whether a full Review column is what stops the open item from being submitted.
 */
export function submitLimited(view: PlayerView): boolean {
  return byFramework(view, { scrum: () => false, kanban: (own) => own.workspace?.submitBlockedByLimit === true });
}
