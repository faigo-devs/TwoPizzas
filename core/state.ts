/**
 * The shape of the stored state; a room saved under another number is ended, never read.
 */
export const StateVersion = 2;

export type PlayerId = string;
export type ItemId = string;
export type RoomCode = string;
export type NoteId = string;

export type Framework = 'scrum' | 'kanban';
export type IterationNumber = 1 | 2;
export type PuzzleKind = 'review' | 'order' | 'incident' | 'merge';
export type ItemSize = 'S' | 'M' | 'L';
export type Theme = 'payments' | 'accounts' | 'platform';
export type ItemStatus = 'backlog' | 'todo' | 'doing' | 'review' | 'done';
export type PlayerRole = 'facilitator' | 'developer';
export type MergeRule = 'max' | 'min' | 'side_a' | 'side_b';
export type Card = 1 | 2 | 3 | 5 | 8 | 13;
export type WorkerCount = 1 | 2;
export type RetroColumn = 'went_well' | 'slowed_us' | 'try';
export type Verdict = 'lgtm' | 'changes';
export type WorkMode = 'work' | 'review';

export interface ReviewLine {
  key: string;
  value: string;
}

export interface OrderClue {
  before: string;
  after: string;
}

export interface IncidentReading {
  indicator: string;
  level: string;
}

export interface IncidentRule {
  number: number;
  conditions: IncidentReading[];
  action: string;
}

export interface MergeLine {
  key: string;
  base: number;
  changes: (number | null)[];
}

export interface ReviewWorkerPart {
  kind: 'review';
  scope: 'worker';
  copies: ReviewLine[][];
}

export interface ReviewDependencyPart {
  kind: 'review';
  scope: 'dependency';
  ignore: string[];
}

export interface ReviewFullPart {
  kind: 'review';
  scope: 'full';
  copies: ReviewLine[][];
  ignore: string[];
}

export interface OrderWorkerPart {
  kind: 'order';
  scope: 'worker';
  components: string[];
  clues: OrderClue[];
}

export interface OrderDependencyPart {
  kind: 'order';
  scope: 'dependency';
  clues: OrderClue[];
}

export interface OrderFullPart {
  kind: 'order';
  scope: 'full';
  components: string[];
  clues: OrderClue[];
}

export interface IncidentWorkerPart {
  kind: 'incident';
  scope: 'worker';
  options: string[];
  readings: IncidentReading[];
  rules: IncidentRule[];
}

export interface IncidentDependencyPart {
  kind: 'incident';
  scope: 'dependency';
  readings: IncidentReading[];
}

export interface IncidentFullPart {
  kind: 'incident';
  scope: 'full';
  options: string[];
  readings: IncidentReading[];
  rules: IncidentRule[];
}

export interface MergeWorkerPart {
  kind: 'merge';
  scope: 'worker';
  sides: number[];
  lines: MergeLine[];
  rule: MergeRule | null;
}

export interface MergeDependencyPart {
  kind: 'merge';
  scope: 'dependency';
  rule: MergeRule;
}

export interface MergeFullPart {
  kind: 'merge';
  scope: 'full';
  sides: number[];
  lines: MergeLine[];
  rule: MergeRule;
}

export type WorkerPart = ReviewWorkerPart | OrderWorkerPart | IncidentWorkerPart | MergeWorkerPart;
export type DependencyPart = ReviewDependencyPart | OrderDependencyPart | IncidentDependencyPart | MergeDependencyPart;
export type FullPart = ReviewFullPart | OrderFullPart | IncidentFullPart | MergeFullPart;
export type PuzzlePart = WorkerPart | DependencyPart | FullPart;

export interface ReviewResponse {
  kind: 'review';
  keys: string[];
}

export interface OrderResponse {
  kind: 'order';
  order: string[];
}

export interface IncidentResponse {
  kind: 'incident';
  action: string;
}

export interface MergeResponse {
  kind: 'merge';
  values: number[];
}

export type PuzzleResponse = ReviewResponse | OrderResponse | IncidentResponse | MergeResponse;

export interface PuzzleSpec {
  kind: PuzzleKind;
  size: ItemSize;
  seed: string;
  workers: WorkerCount;
  dependency: boolean;
}

interface PuzzleBase {
  size: ItemSize;
  seed: string;
  workers: WorkerCount;
  dependency: boolean;
}

export interface ReviewPuzzle extends PuzzleBase {
  kind: 'review';
  parts: ReviewWorkerPart[];
  dependencyPart: ReviewDependencyPart | null;
  fullPart: ReviewFullPart;
  answer: ReviewResponse;
}

export interface OrderPuzzle extends PuzzleBase {
  kind: 'order';
  parts: OrderWorkerPart[];
  dependencyPart: OrderDependencyPart | null;
  fullPart: OrderFullPart;
  answer: OrderResponse;
}

export interface IncidentPuzzle extends PuzzleBase {
  kind: 'incident';
  parts: IncidentWorkerPart[];
  dependencyPart: IncidentDependencyPart | null;
  fullPart: IncidentFullPart;
  answer: IncidentResponse;
}

export interface MergePuzzle extends PuzzleBase {
  kind: 'merge';
  parts: MergeWorkerPart[];
  dependencyPart: MergeDependencyPart | null;
  fullPart: MergeFullPart;
  answer: MergeResponse;
}

/**
 * A generated puzzle: one part per worker, the dependency part or null, the full part and the answer.
 */
export type Puzzle = ReviewPuzzle | OrderPuzzle | IncidentPuzzle | MergePuzzle;

export interface OpenItem {
  itemId: ItemId;
  mode: WorkMode;
  readyAt: number;
}

export interface Player {
  id: PlayerId;
  seat: number;
  name: string | null;
  connected: boolean;
  disconnectedAt: number | null;
  pausedUntil: number | null;
  volunteer: boolean;
  open: OpenItem | null;
}

export interface ItemTimes {
  createdAt: number;
  arrivedAt: number | null;
  readyAt: number | null;
  startedAt: number | null;
  submittedAt: number | null;
  reviewStartedAt: number | null;
  doneAt: number | null;
}

export type ItemOutcome = 'accepted' | 'escaped_defect';

/**
 * The server-side item with its size, seed, answer-bearing puzzle and the timestamps the metrics come from.
 */
export interface WorkItem {
  id: ItemId;
  iteration: IterationNumber;
  kind: PuzzleKind;
  size: ItemSize;
  value: number;
  theme: Theme;
  subject: string;
  seed: string;
  estimate: number | null;
  status: ItemStatus;
  workersNeeded: WorkerCount;
  workers: PlayerId[];
  dependency: boolean;
  dependencyHolder: PlayerId | null;
  helpPromisedBy: PlayerId | null;
  waitingSince: number | null;
  defect: boolean;
  puzzle: Puzzle | null;
  submission: PuzzleResponse | null;
  submittedBy: PlayerId | null;
  reviewer: PlayerId | null;
  reviewedBy: PlayerId | null;
  changesRequested: number;
  outcome: ItemOutcome | null;
  times: ItemTimes;
}

export interface Timebox {
  durationMs: number;
  startedAt: number | null;
  deadline: number | null;
  hard: boolean;
}

export interface LobbyPhase {
  kind: 'lobby';
}

export interface PlanPhase {
  kind: 'plan';
  iteration: IterationNumber;
  timebox: Timebox;
  step: 'card' | 'goal' | 'estimate' | 'commit' | 'replenish' | 'limits';
}

export interface WorkPhase {
  kind: 'work';
  iteration: IterationNumber;
  half: 1 | 2;
  timebox: Timebox;
  step: 'card' | 'running';
}

export interface DailyPhase {
  kind: 'daily';
  iteration: IterationNumber;
  timebox: Timebox;
  step: 'card' | 'walk';
}

export interface InspectPhase {
  kind: 'inspect';
  iteration: IterationNumber;
  timebox: Timebox;
  step: 'card' | 'increment' | 'result' | 'feedback' | 'flow' | 'comparison';
}

export interface RetroPhase {
  kind: 'retro';
  iteration: IterationNumber;
  timebox: Timebox;
  step: 'card' | 'previous' | 'notes' | 'vote' | 'action';
}

export interface SummaryPhase {
  kind: 'summary';
}

/**
 * The phase of the room; a timed phase opens on its card and its timebox begins when the facilitator begins it.
 */
export type Phase = LobbyPhase | PlanPhase | WorkPhase | DailyPhase | InspectPhase | RetroPhase | SummaryPhase;
export type PhaseKind = Phase['kind'];
export type TimedPhase = Exclude<Phase, LobbyPhase | SummaryPhase>;
export type EventKind = Exclude<PhaseKind, 'lobby' | 'summary' | 'work'>;

/**
 * A working agreement chosen in the retrospective; every type but free is tracked by the game.
 */
export type Agreement =
  | { type: 'wip_limit'; max: number }
  | { type: 'review_wait'; maxMs: number }
  | { type: 'no_new_while_blocked' }
  | { type: 'pair_first' }
  | { type: 'wip_limits_set' }
  | { type: 'free'; text: string };

export type AgreementType = Agreement['type'];

export interface AgreementOutcome {
  agreement: Agreement;
  kept: boolean | null;
  violations: number | null;
}

/**
 * Ids of the observations computed from the board; the client holds the wording.
 */
export type ObservationId =
  | 'plan.overtime'
  | 'plan.onTime'
  | 'plan.unestimatedPulled'
  | 'plan.allEstimated'
  | 'plan.overcommitted'
  | 'plan.fitsVelocity'
  | 'daily.overtime'
  | 'daily.onTime'
  | 'daily.blockedUnhelped'
  | 'daily.blockedHelped'
  | 'daily.reviewWaiting'
  | 'daily.reviewFlowing'
  | 'daily.planUnchanged'
  | 'daily.planAdapted'
  | 'work.wipHigh'
  | 'work.wipLow'
  | 'work.unfinished'
  | 'work.allFinished'
  | 'work.waitingForPair'
  | 'inspect.escapedDefects'
  | 'inspect.noEscapedDefects'
  | 'inspect.goalMet'
  | 'inspect.goalMissed'
  | 'retro.noAction'
  | 'retro.actionChosen'
  | 'retro.actionKept'
  | 'retro.actionBroken'
  | 'work.limitReached'
  | 'work.limitNeverReached'
  | 'work.agedWork'
  | 'inspect.throughputUp'
  | 'inspect.throughputDown'
  | 'inspect.cycleTimeFaster'
  | 'inspect.cycleTimeSlower';

export type ObservationGroup = 'plan' | 'work' | 'daily' | 'inspect' | 'retro';

export interface Observation {
  id: ObservationId;
  iteration: IterationNumber;
  positive: boolean;
  params: Record<string, number | string>;
}

export interface FlowPoint {
  itemId: ItemId;
  ageMs: number;
}

export interface IterationMetrics {
  iteration: IterationNumber;
  accepted: number;
  escapedDefects: number;
  valueDelivered: number;
  goalBonus: number;
  goalMet: boolean | null;
  velocity: number;
  throughput: number;
  cycleTimesMs: number[];
  averageCycleMs: number | null;
  wipMax: number;
  openAges: FlowPoint[];
  agreement: AgreementOutcome | null;
  wipLimits?: WipLimits;
}

export interface Score {
  total: number;
  value: number;
  goalBonus: number;
  escapedDefects: number;
  averageCycleMs: number | null;
}

export interface LeaderboardEntry {
  framework: Framework;
  teamName: string;
  players: number;
  score: number;
  escapedDefects: number;
  averageCycleMs: number | null;
  date: string;
}

export interface LeaderboardLists {
  scrum: LeaderboardEntry[];
  kanban: LeaderboardEntry[];
}

export interface LeaderboardResponse {
  month: LeaderboardLists;
  allTime: LeaderboardLists;
}

export interface PokerState {
  itemId: ItemId;
  votes: Record<PlayerId, Card>;
  revealed: boolean;
  revotesUsed: number;
}

export interface WipLimits {
  inProgress: number | null;
  review: number | null;
}

export interface RetroNote {
  id: NoteId;
  authorId: PlayerId;
  column: RetroColumn;
  text: string;
}

export interface HelpQuestion {
  id: string;
  choices: string[];
  params: Record<string, number | string>;
}

export interface HelpProposal {
  id: string;
  column: RetroColumn;
  params: Record<string, number | string>;
}

export interface RetroHelpState {
  answers: Record<string, string>;
  used: string[];
}

export interface RetroState {
  notes: RetroNote[];
  nextNoteNumber: number;
  revealed: boolean;
  votes: Record<PlayerId, NoteId[]>;
  action: Agreement | null;
  help: Record<PlayerId, RetroHelpState>;
}

export interface FeedbackState {
  theme: Theme;
  bonus: number;
  newItemIds: ItemId[];
}

export interface Signals {
  planOverrunMs: number;
  unestimatedPulled: number;
  committedEstimate: number;
  previousVelocity: number | null;
  dailyOverrunMs: number;
  blockedUnhelpedAtDaily: number;
  reviewWaitingAtDaily: number;
  dailyChanges: number;
  wipMax: number;
  maxReviewWaitMs: number;
  pairWaitMs: number;
  agreementViolations: number;
  inProgressMax: number;
  reviewMax: number;
}

export interface DailySpan {
  from: number;
  to: number | null;
}

export interface IterationState {
  iteration: IterationNumber;
  facilitatorId: PlayerId | null;
  goalOptions: Theme[];
  goalVotes: Record<PlayerId, Theme>;
  goal: Theme | null;
  poker: PokerState | null;
  estimationStopped: boolean;
  wipLimits: WipLimits;
  nextArrivalAt: number | null;
  arrivalsLeft: number;
  flowEndedAt: number | null;
  verdicts: VerdictView[];
  verdictsRevealed: number;
  dailySpan: DailySpan | null;
  feedback: FeedbackState | null;
  retro: RetroState;
  signals: Signals;
  metrics: IterationMetrics | null;
}

export interface EventRecord {
  kind: EventKind;
  iteration: IterationNumber;
  timeboxMs: number;
  usedMs: number;
  overrunMs: number;
}

/**
 * The whole authoritative state of a room; plain JSON data, stored by the server between messages.
 */
export interface RoomState {
  version: number;
  code: RoomCode;
  framework: Framework;
  secret: string;
  nameSeed: number;
  locked: boolean;
  rng: number;
  createdAt: number;
  now: number;
  emptySince: number | null;
  players: Player[];
  hostId: PlayerId | null;
  facilitatorId: PlayerId | null;
  teamName: string;
  nameAttempt: number;
  phase: Phase;
  items: WorkItem[];
  nextItemNumber: number;
  iterations: IterationState[];
  events: EventRecord[];
  observations: Observation[];
  observationsFrom: number;
  published: boolean;
}

export interface VerdictView {
  itemId: ItemId;
  outcome: ItemOutcome;
}
