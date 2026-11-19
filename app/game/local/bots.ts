import { config } from '../../../core/index.ts';
import { profileOf } from '../framework.ts';
import type {
  Agreement,
  Card,
  ClientAction,
  IterationState,
  PlayerId,
  Puzzle,
  PuzzleResponse,
  RetroColumn,
  RoomState,
  Theme,
  WorkItem,
} from '../../../core/index.ts';
import type { Key } from '../../i18n/index.ts';

export type Pace = 'quick' | 'think' | 'host' | 'begin';

export interface Decision {
  action: ClientAction;
  pace: Pace;
}

const Delays: Record<Pace, [number, number]> = {
  quick: [900, 1800],
  think: [1800, 4200],
  host: [2500, 5000],
  begin: [4500, 7500],
};

const NoteKeys: Record<RetroColumn, readonly Key[]> = {
  went_well: ['bot.note.went_well.1', 'bot.note.went_well.2'],
  slowed_us: ['bot.note.slowed_us.1', 'bot.note.slowed_us.2'],
  try: ['bot.note.try.1', 'bot.note.try.2'],
};

const NoteColumns: readonly RetroColumn[] = ['went_well', 'slowed_us', 'try'];
const RightRate = 0.75;
const CatchRate = 0.55;
const WipLimit = 3;
const PullCount = 4;
const ReplenishCount = 3;
const FreeWip = 5;
const BotLimits = { inProgress: 3, review: 2 };
const EstimatesBeforeStop = 5;
const DailyMinimumMs = 25_000;
const ReviewGraceMs = 16_000;
const PairGraceMs = 9_000;
const HumanLeadMs = 60_000;
const FirstPickMs = 10_000;

export function delayFor(pace: Pace): number {
  const [low, high] = Delays[pace];
  return low + Math.random() * (high - low);
}

export function lastIteration(state: RoomState): IterationState {
  const last = state.iterations[state.iterations.length - 1];
  if (last === undefined) throw new Error('no iteration');
  return last;
}

function roll(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

function pick<T>(list: readonly T[], seed: string): T {
  return list[Math.floor(roll(seed) * list.length)] as T;
}

export function wrongResponse(puzzle: Puzzle): PuzzleResponse {
  if (puzzle.kind === 'review') return { kind: 'review', keys: [] };
  if (puzzle.kind === 'order') return { kind: 'order', order: [...puzzle.answer.order].reverse() };
  if (puzzle.kind === 'incident') return { kind: 'incident', action: 'nothing' };
  return { kind: 'merge', values: puzzle.answer.values.map((value) => value + 1) };
}

export function rightResponse(puzzle: Puzzle): PuzzleResponse {
  return JSON.parse(JSON.stringify(puzzle.answer)) as PuzzleResponse;
}

function isRight(item: WorkItem): boolean {
  return item.puzzle !== null && item.submission !== null && JSON.stringify(item.puzzle.answer) === JSON.stringify(item.submission);
}

function cardFor(item: WorkItem | undefined, seed: string): Card {
  const cards = config.poker.cards;
  const ranges = { S: [0, 2], M: [2, 4], L: [4, 5] } as const;
  const [low, high] = ranges[item?.size ?? 'M'];
  const spread = low + Math.floor(roll(seed) * (high - low + 1));
  const index = Math.min(cards.length - 1, spread + (roll(`${seed}:up`) < 0.2 ? 1 : 0));
  return cards[index] as Card;
}

function goalWinner(state: RoomState): Theme | null {
  const it = lastIteration(state);
  const counts = new Map<Theme, number>();
  for (const theme of Object.values(it.goalVotes)) counts.set(theme, (counts.get(theme) ?? 0) + 1);
  let best: Theme | null = null;
  let top = 0;
  for (const option of it.goalOptions) {
    const count = counts.get(option) ?? 0;
    if (count > top) {
      best = option;
      top = count;
    }
  }
  return best;
}

function decidePlan(state: RoomState, id: PlayerId, fac: boolean, step: string): Decision | null {
  const it = lastIteration(state);
  const present = state.players.filter((player) => player.connected);
  if (step === 'goal') {
    if (it.goalVotes[id] === undefined) {
      return { action: { type: 'plan.goal_vote', theme: pick(it.goalOptions, id) }, pace: 'think' };
    }
    const allVoted = present.every((player) => it.goalVotes[player.id] !== undefined);
    if (fac && allVoted && goalWinner(state) !== null) return { action: { type: 'plan.goal_confirm' }, pace: 'host' };
    return null;
  }
  if (step === 'estimate') {
    const poker = it.poker;
    if (poker === null) return null;
    if (!poker.revealed) {
      if (poker.votes[id] !== undefined) return null;
      const item = state.items.find((own) => own.id === poker.itemId);
      return { action: { type: 'plan.poker_vote', card: cardFor(item, `${id}:${poker.itemId}:${poker.revotesUsed}`) }, pace: 'think' };
    }
    if (!fac) return null;
    const estimated = state.items.filter((own) => own.estimate !== null).length;
    if (estimated >= EstimatesBeforeStop) return { action: { type: 'plan.estimation_stop' }, pace: 'host' };
    const votes = Object.values(poker.votes);
    const spread = votes.length === 0 ? 0 : Math.max(...votes) / Math.min(...votes);
    if (poker.revotesUsed < config.poker.revotesAllowed && spread >= 4 && roll(`${poker.itemId}:revote`) < 0.5) return { action: { type: 'plan.poker_revote' }, pace: 'host' };
    return { action: { type: 'plan.poker_record', estimate: null }, pace: 'host' };
  }
  if (step === 'replenish') {
    if (!fac) return null;
    const ready = state.items.filter((own) => own.status === 'todo');
    const pool = state.items.filter((own) => own.status === 'backlog');
    if (ready.length >= ReplenishCount || pool.length === 0) {
      return ready.length > 0 ? { action: { type: 'phase.advance' }, pace: 'begin' } : null;
    }
    const next = pool[0];
    return next === undefined ? null : { action: { type: 'plan.pull', itemId: next.id }, pace: 'host' };
  }
  if (step === 'limits') {
    if (!fac) return null;
    if (it.wipLimits.inProgress === null && it.wipLimits.review === null) {
      return { action: { type: 'plan.set_limits', inProgress: BotLimits.inProgress, review: BotLimits.review }, pace: 'host' };
    }
    return { action: { type: 'phase.advance' }, pace: 'begin' };
  }
  if (step === 'commit') {
    if (!fac) return null;
    const pulled = state.items.filter((own) => own.status === 'todo');
    const backlog = state.items.filter((own) => own.status === 'backlog');
    if (pulled.length >= PullCount || (backlog.length === 0 && pulled.length > 0)) {
      return { action: { type: 'phase.advance' }, pace: 'begin' };
    }
    const next = backlog.find((own) => own.estimate !== null) ?? backlog[0];
    return next === undefined ? null : { action: { type: 'plan.pull', itemId: next.id }, pace: 'host' };
  }
  return null;
}

function reviewFull(state: RoomState): boolean {
  if (!profileOf(state.framework).limits) return false;
  const limit = lastIteration(state).wipLimits.review;
  return limit !== null && state.items.filter((own) => own.status === 'review').length >= limit;
}

function startCap(state: RoomState): number {
  if (!profileOf(state.framework).limits) return WipLimit;
  return lastIteration(state).wipLimits.inProgress ?? FreeWip;
}

function decideWork(state: RoomState, id: PlayerId, now: number): Decision | null {
  const player = state.players.find((own) => own.id === id);
  if (player === undefined) return null;
  const open = player.open;
  if (open !== null) {
    const target = state.items.find((own) => own.id === open.itemId);
    if (target === undefined) return { action: { type: 'item.close' }, pace: 'quick' };
    if (now < open.readyAt) return null;
    if (open.mode === 'review' && target.status === 'review' && target.reviewer === id) {
      const verdict = isRight(target) || roll(`${target.seed}:${id}:catch`) > CatchRate ? 'lgtm' : 'changes';
      return { action: { type: 'item.verdict', itemId: target.id, verdict }, pace: 'think' };
    }
    if (open.mode === 'work' && target.status === 'doing' && target.puzzle !== null && target.workers.includes(id)) {
      if (reviewFull(state)) return { action: { type: 'item.close' }, pace: 'think' };
      const humanOn = state.hostId !== null && state.hostId !== id && target.workers.includes(state.hostId);
      if (humanOn && now - (target.times.startedAt ?? now) < HumanLeadMs) return null;
      const response = roll(`${target.seed}:answer`) < RightRate || target.changesRequested > 0 ? rightResponse(target.puzzle) : wrongResponse(target.puzzle);
      return { action: { type: 'item.submit', itemId: target.id, response }, pace: 'think' };
    }
    return { action: { type: 'item.close' }, pace: 'quick' };
  }
  const human = state.hostId;
  const reviewable = state.items.find(
    (own) =>
      own.status === 'review' &&
      own.reviewer === null &&
      !own.workers.includes(id) &&
      (human === null || own.workers.includes(human) || now - (own.times.submittedAt ?? now) >= ReviewGraceMs),
  );
  if (reviewable !== undefined) return { action: { type: 'item.take_review', itemId: reviewable.id }, pace: 'quick' };
  const claimed = state.items.find((own) => own.status === 'review' && own.reviewer === id);
  if (claimed !== undefined) return { action: { type: 'item.open', itemId: claimed.id, mode: 'review' }, pace: 'quick' };
  const mine = state.items.find((own) => own.status === 'doing' && own.workers.includes(id) && own.puzzle !== null);
  if (mine !== undefined && reviewFull(state)) return null;
  if (mine !== undefined) return { action: { type: 'item.open', itemId: mine.id, mode: 'work' }, pace: 'quick' };
  const waiting = state.items.find(
    (own) =>
      own.status === 'doing' &&
      own.workers.length < own.workersNeeded &&
      !own.workers.includes(id) &&
      now - (own.waitingSince ?? now) >= PairGraceMs,
  );
  if (waiting !== undefined) return { action: { type: 'item.take', itemId: waiting.id }, pace: 'quick' };
  const doing = state.items.filter((own) => own.status === 'doing').length;
  const todos = state.items.filter((own) => own.status === 'todo');
  const todo = todos[0];
  const phase = state.phase;
  const since = phase.kind === 'work' ? now - (phase.timebox.startedAt ?? now) : FirstPickMs;
  if (todo !== undefined && todos.length > 1 && doing < startCap(state) && since >= FirstPickMs) return { action: { type: 'item.take', itemId: todo.id }, pace: 'quick' };
  return null;
}

function decideDaily(state: RoomState, id: PlayerId, now: number): Decision | null {
  const blocked = state.items.find(
    (own) => own.status === 'doing' && own.dependency && own.puzzle !== null && own.helpPromisedBy === null && !own.workers.includes(id),
  );
  if (blocked !== undefined) return { action: { type: 'help.promise', itemId: blocked.id }, pace: 'think' };
  const phase = state.phase;
  const started = phase.kind === 'daily' ? (phase.timebox.startedAt ?? now) : now;
  if (now - started >= DailyMinimumMs + (id.charCodeAt(id.length - 1) % 3) * 6000) return { action: { type: 'daily.end' }, pace: 'host' };
  return null;
}

function decideInspect(state: RoomState, fac: boolean, step: string): Decision | null {
  if (!fac) return null;
  const it = lastIteration(state);
  if (step === 'increment' && it.verdictsRevealed < it.verdicts.length) return { action: { type: 'inspect.reveal' }, pace: 'host' };
  return { action: { type: 'phase.advance' }, pace: 'begin' };
}

function agreementFor(type: string): Agreement {
  if (type === 'wip_limit') return { type: 'wip_limit', max: 2 };
  if (type === 'review_wait') return { type: 'review_wait', maxMs: config.agreements.reviewWaitMs };
  if (type === 'no_new_while_blocked') return { type: 'no_new_while_blocked' };
  if (type === 'pair_first') return { type: 'pair_first' };
  if (type === 'wip_limits_set') return { type: 'wip_limits_set' };
  return { type: 'wip_limit', max: 2 };
}

function decideRetro(
  state: RoomState,
  id: PlayerId,
  fac: boolean,
  step: string,
  suggested: () => readonly string[],
  note: (key: Key) => string,
): Decision | null {
  const it = lastIteration(state);
  const retro = it.retro;
  if (step === 'previous') return fac ? { action: { type: 'phase.advance' }, pace: 'begin' } : null;
  if (step === 'notes') {
    const mine = retro.notes.filter((own) => own.authorId === id).length;
    if (mine < 2) {
      const column = NoteColumns[mine + (id.charCodeAt(id.length - 1) % 2)] ?? 'try';
      return { action: { type: 'retro.note_add', column, text: note(pick(NoteKeys[column], `${id}:${mine}`)) }, pace: 'think' };
    }
    const bots = state.players.filter((player) => player.connected && player.id !== state.hostId);
    const done = bots.every((player) => retro.notes.filter((own) => own.authorId === player.id).length >= 2);
    return fac && done ? { action: { type: 'retro.reveal' }, pace: 'begin' } : null;
  }
  if (step === 'vote') {
    const votes = retro.votes[id] ?? [];
    if (votes.length < config.retro.votesPerPlayer) {
      const open = retro.notes.filter((own) => !votes.includes(own.id));
      const choice = open.length === 0 ? undefined : pick(open, `${id}:${votes.length}`);
      if (choice !== undefined) return { action: { type: 'retro.vote', noteId: choice.id }, pace: 'think' };
    }
    return fac ? { action: { type: 'phase.advance' }, pace: 'begin' } : null;
  }
  if (step === 'action') {
    if (!fac) return null;
    if (retro.action === null) {
      const type = suggested().find((own) => own !== 'free') ?? 'wip_limit';
      return { action: { type: 'retro.choose_action', agreement: agreementFor(type) }, pace: 'host' };
    }
    return { action: { type: 'phase.advance' }, pace: 'begin' };
  }
  return null;
}

/**
 * What one scripted teammate would do now, or null when it has nothing to do; the pace says how long it takes them.
 */
export function decide(
  state: RoomState,
  id: PlayerId,
  now: number,
  suggested: () => readonly string[],
  note: (key: Key) => string,
): Decision | null {
  const phase = state.phase;
  if (phase.kind === 'lobby' || phase.kind === 'summary') return null;
  const player = state.players.find((own) => own.id === id);
  if (player === undefined || !player.connected) return null;
  const fac = state.facilitatorId === id;
  if (phase.step === 'card') return fac ? { action: { type: 'phase.begin' }, pace: 'begin' } : null;
  if (phase.kind === 'plan') return decidePlan(state, id, fac, phase.step);
  if (phase.kind === 'work') return decideWork(state, id, now);
  if (phase.kind === 'daily') return decideDaily(state, id, now);
  if (phase.kind === 'inspect') return decideInspect(state, fac, phase.step);
  return decideRetro(state, id, fac, phase.step, suggested, note);
}
