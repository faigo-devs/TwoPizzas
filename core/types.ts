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
  seed: number;
  workers: WorkerCount;
  dependency: boolean;
}

interface PuzzleBase {
  size: ItemSize;
  seed: number;
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
  volunteer: boolean;
  open: OpenItem | null;
}

export interface PublicPlayer {
  id: PlayerId;
  seat: number;
  name: string | null;
  connected: boolean;
  isHost: boolean;
  role: PlayerRole;
  openItemId: ItemId | null;
  workingOn: ItemId[];
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
  seed: number;
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

/**
 * An item as a player may see it: never the size, the answer, or another player's part.
 */
export interface ItemView {
  id: ItemId;
  kind: PuzzleKind;
  value: number;
  theme: Theme;
  subject: string;
  estimate: number | null;
  status: ItemStatus;
  workersNeeded: WorkerCount;
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
  submitBlockedByLimit?: boolean;
}

export interface HeldInfo {
  itemId: ItemId;
  part: DependencyPart;
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
  inProgressMax?: number;
  reviewMax?: number;
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
  flowEndedAt?: number | null;
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
  version: 1;
  code: RoomCode;
  framework: Framework;
  seed: number;
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

export interface ScriptStep {
  event: EventKind;
  step: string;
  index: number;
  total: number;
}

export type Control =
  | 'start_game'
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

export interface PlanningView {
  goalOptions: Theme[];
  goal: Theme | null;
  myGoalVote: Theme | null;
  goalVotes: Record<Theme, number>;
  poker: PokerView | null;
  estimatedCount: number;
  totalEstimate: number;
  previousVelocity: number | null;
  estimationStopped: boolean;
  replenish?: ReplenishView | null;
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

export interface VerdictView {
  itemId: ItemId;
  outcome: ItemOutcome;
}

export interface InspectView {
  verdicts: VerdictView[];
  verdictsTotal: number;
  goal: Theme | null;
  goalMet: boolean | null;
  valueDelivered: number | null;
  goalBonus: number | null;
  velocity: number | null;
  feedback: FeedbackState | null;
  flow?: IterationMetrics | null;
  comparison?: FlowComparison | null;
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
  help: { questions: HelpQuestion[]; proposals: HelpProposal[] } | null;
}

export interface SummaryView {
  score: Score;
  metrics: IterationMetrics[];
  recap: EventRecord[];
  published: boolean;
  canPublish: boolean;
}

/**
 * What one player may see, built by viewFor and carrying the server time for the clocks.
 */
export interface PlayerView {
  now: number;
  code: RoomCode;
  framework: Framework;
  iteration: IterationNumber | null;
  selfId: PlayerId;
  teamName: string;
  players: PublicPlayer[];
  hostId: PlayerId | null;
  facilitatorId: PlayerId | null;
  phase: Phase;
  script: ScriptStep | null;
  controls: Control[];
  items: ItemView[];
  limits: WipLimits | null;
  kanban?: KanbanView | null;
  workspace: WorkspaceView | null;
  held: HeldInfo[];
  planning: PlanningView | null;
  inspect: InspectView | null;
  retro: RetroView | null;
  observations: Observation[];
  metrics: IterationMetrics[];
  summary: SummaryView | null;
}

/**
 * Every intent a player can send; the server stamps it with the player and the time before the machine sees it.
 */
export type ClientAction =
  | { type: 'lobby.set_name'; name: string }
  | { type: 'lobby.volunteer'; volunteer: boolean }
  | { type: 'lobby.new_team_name' }
  | { type: 'lobby.start' }
  | { type: 'phase.begin' }
  | { type: 'phase.advance' }
  | { type: 'plan.goal_vote'; theme: Theme }
  | { type: 'plan.goal_confirm' }
  | { type: 'plan.poker_vote'; card: Card }
  | { type: 'plan.poker_reveal' }
  | { type: 'plan.poker_revote' }
  | { type: 'plan.poker_record'; estimate: Card | null }
  | { type: 'plan.estimation_stop' }
  | { type: 'plan.pull'; itemId: ItemId }
  | { type: 'plan.unpull'; itemId: ItemId }
  | { type: 'plan.set_limits'; inProgress: number | null; review: number | null }
  | { type: 'item.take'; itemId: ItemId }
  | { type: 'item.leave'; itemId: ItemId }
  | { type: 'item.open'; itemId: ItemId; mode: WorkMode }
  | { type: 'item.close' }
  | { type: 'item.submit'; itemId: ItemId; response: PuzzleResponse }
  | { type: 'item.take_review'; itemId: ItemId }
  | { type: 'item.verdict'; itemId: ItemId; verdict: Verdict }
  | { type: 'help.promise'; itemId: ItemId }
  | { type: 'help.withdraw'; itemId: ItemId }
  | { type: 'daily.end' }
  | { type: 'inspect.reveal' }
  | { type: 'retro.note_add'; column: RetroColumn; text: string }
  | { type: 'retro.note_edit'; noteId: NoteId; text: string }
  | { type: 'retro.note_remove'; noteId: NoteId }
  | { type: 'retro.reveal' }
  | { type: 'retro.vote'; noteId: NoteId }
  | { type: 'retro.unvote'; noteId: NoteId }
  | { type: 'retro.choose_action'; agreement: Agreement }
  | { type: 'retro.help_start' }
  | { type: 'retro.help_answer'; questionId: string; choice: string }
  | { type: 'retro.help_use'; proposalId: string }
  | { type: 'summary.publish' };

export type ClientActionType = ClientAction['type'];

export interface Stamp {
  playerId: PlayerId;
  now: number;
}

export type StampedClientAction = ClientAction & Stamp;

/**
 * Actions only the server raises; a client may never send a type that starts with server.
 */
export type ServerAction =
  | { type: 'server.join'; playerId: PlayerId; name: string | null; now: number }
  | { type: 'server.deadline'; now: number }
  | { type: 'server.connected'; playerId: PlayerId; now: number }
  | { type: 'server.disconnected'; playerId: PlayerId; now: number };

/**
 * Anything the machine reduces: a stamped client action or a server action.
 */
export type Action = StampedClientAction | ServerAction;

/**
 * The only error codes the protocol sends.
 */
export type ErrorCode =
  | 'room_not_found'
  | 'room_full'
  | 'already_started'
  | 'not_allowed'
  | 'bad_request'
  | 'rate_limited';

/**
 * A message from the browser to the room.
 */
export type ClientMessage =
  | { t: 'hello'; playerId?: string; token?: string; name?: string }
  | { t: 'do'; action: ClientAction };

/**
 * A message from the room to the browser.
 */
export type ServerMessage =
  | { t: 'welcome'; playerId: PlayerId; token: string }
  | { t: 'view'; view: PlayerView }
  | { t: 'error'; code: ErrorCode };

export interface CreateRoomRequest {
  framework: Framework;
}

export interface CreateRoomResponse {
  code: RoomCode;
}

export interface CreateRoomInput {
  code: RoomCode;
  framework: Framework;
  seed: number;
  now: number;
}

export type ReduceResult = { ok: true; state: RoomState } | { ok: false; code: ErrorCode };

/**
 * The state machine API implemented in the next package; every function is pure.
 */
export interface Machine {
  createRoom(input: CreateRoomInput): RoomState;
  reduce(state: RoomState, action: Action): ReduceResult;
  viewFor(state: RoomState, playerId: PlayerId, now: number): PlayerView;
  nextDeadline(state: RoomState): number | null;
}
