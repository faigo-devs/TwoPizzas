import type {
  PlayerId,
  ItemId,
  RoomCode,
  NoteId,
  IterationNumber,
  PuzzleKind,
  Theme,
  ItemStatus,
  PlayerRole,
  Card,
  WorkerCount,
  RetroColumn,
  WorkMode,
  WorkerPart,
  DependencyPart,
  FullPart,
  PuzzleResponse,
  ItemOutcome,
  Phase,
  EventKind,
  Agreement,
  AgreementType,
  AgreementOutcome,
  ObservationGroup,
  Observation,
  IterationMetrics,
  Score,
  WipLimits,
  HelpQuestion,
  HelpProposal,
  FeedbackState,
  EventRecord,
  VerdictView,
} from './state.ts';

export interface PublicPlayer {
  id: PlayerId;
  seat: number;
  name: string | null;
  connected: boolean;
  pausedUntil: number | null;
  isHost: boolean;
  role: PlayerRole;
  openItemId: ItemId | null;
  workingOn: ItemId[];
}

export type ItemAction =
  | 'item.take'
  | 'item.leave'
  | 'item.open.work'
  | 'item.open.review'
  | 'item.take_review'
  | 'help.promise'
  | 'help.withdraw';

/**
 * An item as a player may see it: never the size, the answer, or another player's part.
 */
export interface ItemView {
  id: ItemId;
  iteration: IterationNumber;
  actions: ItemAction[];
  kind: PuzzleKind;
  value: number;
  theme: Theme;
  subject: string;
  estimate: number | null;
  status: ItemStatus;
  workersNeeded: WorkerCount | null;
  workers: PlayerId[];
  waitingForPair: boolean;
  blocked: boolean;
  helpPromisedBy: PlayerId | null;
  reviewer: PlayerId | null;
  submitted: boolean;
  changesRequested: number;
  arrivedAt: number | null;
  startedAt: number | null;
  submittedAt: number | null;
  outcome: ItemOutcome | null;
}

export interface WorkspaceView {
  itemId: ItemId;
  mode: WorkMode;
  readyAt: number;
  part: WorkerPart | FullPart | null;
  submission: PuzzleResponse | null;
  canSubmit: boolean;
  canVerdict: boolean;
}

/**
 * A Kanban workspace also says whether a full Review column is what stops its submission.
 */
export interface KanbanWorkspaceView extends WorkspaceView {
  submitBlockedByLimit?: boolean;
}

export interface HeldInfo {
  itemId: ItemId;
  part: DependencyPart;
}

export interface ScriptStep {
  event: EventKind | 'work';
  step: string;
  index: number;
  total: number;
}

export type Control =
  | 'start_game'
  | 'kick_player'
  | 'lock_room'
  | 'pause'
  | 'end_work'
  | 'resume'
  | 'unlock_room'
  | 'begin_phase'
  | 'advance'
  | 'end_daily'
  | 'confirm_goal'
  | 'poker_reveal'
  | 'poker_revote'
  | 'poker_record'
  | 'stop_estimation'
  | 'set_limits'
  | 'reveal_verdict'
  | 'reveal_notes'
  | 'choose_action'
  | 'new_team_name'
  | 'publish';

export interface PokerView {
  itemId: ItemId;
  voted: PlayerId[];
  myVote: Card | null;
  revealed: boolean;
  votes: Record<PlayerId, Card> | null;
  median: Card | null;
  revotesLeft: number;
}

/**
 * What a Scrum planning shows: the goal vote, Planning Poker and the commitment so far.
 */
export interface ScrumPlanningView {
  goalOptions: Theme[];
  goal: Theme | null;
  myGoalVote: Theme | null;
  goalVotes: Record<Theme, number>;
  poker: PokerView | null;
  estimatedCount: number;
  totalEstimate: number;
  previousVelocity: number | null;
  estimationStopped: boolean;
}

/**
 * What a Kanban planning shows: the replenishment of Ready and the limit setting.
 */
export interface KanbanPlanningView {
  replenish: ReplenishView;
}

/**
 * What a Kanban replenishment shows: how many requests may enter Ready and the range a limit may take.
 */
export interface ReplenishView {
  readyMax: number;
  ready: number;
  pool: number;
  limitMin: number;
  limitMax: number;
  settingLimits: boolean;
}

/**
 * The Kanban board in numbers: limits, column counts, what a limit blocks right now and the arrival clock.
 */
export interface KanbanView {
  limits: WipLimits;
  ready: number;
  inProgress: number;
  review: number;
  done: number;
  startBlockedByLimit: boolean;
  submitBlockedByLimit: boolean;
  nextArrivalAt: number | null;
  arrivalsLeft: number;
  arrivalsTotal: number;
}

export interface ComparedValue {
  first: number | null;
  second: number | null;
}

/**
 * The two Kanban rounds side by side, as the numbers the comparison chart draws.
 */
export interface FlowComparison {
  throughput: ComparedValue;
  averageCycleMs: ComparedValue;
  wipMax: ComparedValue;
  openCount: ComparedValue;
  escapedDefects: ComparedValue;
  valueDelivered: ComparedValue;
  limits: WipLimits;
}


/**
 * What both frameworks show while the verdicts are revealed.
 */
export interface InspectBaseView {
  verdicts: VerdictView[];
  verdictsTotal: number;
  valueDelivered: number | null;
}

/**
 * The Sprint Review: the goal, its result, the velocity and the stakeholder feedback.
 */
export interface ScrumInspectView extends InspectBaseView {
  goal: Theme | null;
  goalMet: boolean | null;
  goalBonus: number | null;
  velocity: number | null;
  feedback: FeedbackState | null;
}

/**
 * The Kanban delivery review: the round's flow numbers and, after the second round, the comparison.
 */
export interface KanbanInspectView extends InspectBaseView {
  flow: IterationMetrics | null;
  comparison: FlowComparison | null;
}

export interface RetroNoteView {
  id: NoteId;
  authorId: PlayerId | null;
  column: RetroColumn;
  text: string;
  mine: boolean;
  votes: number | null;
}

export interface RetroView {
  notes: RetroNoteView[];
  hiddenCounts: Record<RetroColumn, number>;
  revealed: boolean;
  votesLeft: number;
  myVotes: NoteId[];
  action: Agreement | null;
  previous: AgreementOutcome | null;
  suggestedAgreements: AgreementType[];
  help: { questions: HelpQuestion[]; proposals: HelpProposal[]; answers: Record<string, string> } | null;
}

export interface ObservationEntry {
  iteration: IterationNumber;
  event: ObservationGroup;
  observations: Observation[];
}

export interface SummaryView {
  score: Score;
  observationHistory: ObservationEntry[];
  metrics: IterationMetrics[];
  recap: EventRecord[];
  published: boolean;
  canPublish: boolean;
}

/**
 * The confirmed Sprint Goal with the progress of its theme: items done out of all items of that theme.
 */
export interface GoalView {
  theme: Theme;
  done: number;
  total: number;
}

/**
 * Everything both frameworks show one player.
 */
export interface BaseView {
  now: number;
  code: RoomCode;
  iteration: IterationNumber | null;
  selfId: PlayerId;
  teamName: string;
  players: PublicPlayer[];
  hostId: PlayerId | null;
  locked: boolean;
  facilitatorId: PlayerId | null;
  phase: Phase;
  script: ScriptStep | null;
  controls: Control[];
  items: ItemView[];
  workspace: WorkspaceView | null;
  held: HeldInfo[];
  retro: RetroView | null;
  observations: Observation[];
  metrics: IterationMetrics[];
  summary: SummaryView | null;
}

/**
 * What one Scrum player may see: the Sprint Goal and its progress, planning with poker, the Sprint Review.
 */
export interface ScrumPlayerView extends BaseView {
  framework: 'scrum';
  goal: GoalView | null;
  planning: ScrumPlanningView | null;
  inspect: ScrumInspectView | null;
}

/**
 * What one Kanban player may see: the limits, the board in numbers, replenishment and the delivery review.
 */
export interface KanbanPlayerView extends BaseView {
  framework: 'kanban';
  limits: WipLimits | null;
  kanban: KanbanView | null;
  workspace: KanbanWorkspaceView | null;
  planning: KanbanPlanningView | null;
  inspect: KanbanInspectView | null;
}

/**
 * What one player may see, built by viewFor through the rules of the room's framework and carrying the server time for the clocks.
 */
export type PlayerView = ScrumPlayerView | KanbanPlayerView;
