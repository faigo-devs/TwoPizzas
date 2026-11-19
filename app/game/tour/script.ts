import { config, machine } from '../../../core/index.ts';
import { profileOf } from '../framework.ts';
import type { Action, ClientAction, Framework, OrderClue, PlayerId, RetroColumn, RoomState, WorkItem } from '../../../core/index.ts';
import type { Key } from '../../i18n/index.ts';
import { decide, rightResponse, wrongResponse } from '../local/bots.ts';
import { skipEvent, type LocalClock } from '../local/room.ts';

export const TourYou: PlayerId = 'you';

const Mates: readonly PlayerId[] = ['mate-1', 'mate-2', 'mate-3'];
const Secrets: Record<Framework, string> = {
  scrum: 'c502f870fb784c1c8bdb28cc77042ed3ff9ffff32f0ae0b996df4abe6beb7591',
  kanban: '12fbcd9b86045edeb6f31dfc2ea5b0e0c27147e411548efbbd1372b045aa9ae1',
};
const BaseMs = 900_000;
const StepMs = 700;
const SwitchWaitMs = config.contextSwitchMs + 1000;
const SampleNote: Key = 'bot.note.try.3';
const MateNotes: Record<string, readonly [Key, Key]> = {
  'mate-1': ['bot.note.went_well.1', 'bot.note.slowed_us.1'],
  'mate-2': ['bot.note.try.1', 'bot.note.slowed_us.2'],
  'mate-3': ['bot.note.went_well.2', 'bot.note.try.2'],
};
const NoteColumns: Record<string, RetroColumn> = {
  went_well: 'went_well',
  slowed_us: 'slowed_us',
  try: 'try',
};

/**
 * The prepared situations of the tour; each is built from nothing by the engine's reducer.
 */
export type SceneId =
  | 'card'
  | 'board'
  | 'take'
  | 'solo'
  | 'switch'
  | 'limit'
  | 'pair'
  | 'held'
  | 'right'
  | 'wrong'
  | 'daily'
  | 'review'
  | 'note'
  | 'vote'
  | 'action';

/**
 * What the scripted partner of a pair item says: the clues of the partner's own part, taken from the engine's state.
 */
export interface TourSays {
  clues: OrderClue[];
}

/**
 * A built situation, the engine time it ends at and, for the pair step, the partner's line.
 */
export interface Scene {
  state: RoomState;
  at: number;
  says: TourSays | null;
}

/**
 * The note the player wrote in the notes step, carried into the vote scene.
 */
export interface OwnNote {
  column: RetroColumn;
  text: string;
}

/**
 * The items the tour's scenes are cast with: the player's own, two a scripted teammate works, a spare one to switch to, and the pair and blocked ones.
 */
export interface Cast {
  solos: string[];
  order: string;
  pair: string;
  dependent: string;
  right: string;
  wrong: string;
  spare: string;
}

class Run {
  state: RoomState;
  t: number;

  constructor(framework: Framework) {
    this.t = Date.now() - BaseMs;
    this.state = machine.createRoom({ code: 'TOUR', framework, secret: Secrets[framework], nameSeed: 1, now: this.t });
    for (const id of [TourYou, ...Mates]) {
      const joined = machine.reduce(this.state, { type: 'server.join', playerId: id, name: null, now: this.t });
      if (!joined.ok) throw new Error(`tour: ${id} could not join`);
      this.state = joined.state;
    }
  }

  act(id: PlayerId, action: ClientAction, gap: number = StepMs): void {
    this.t += gap;
    const result = machine.reduce(this.state, { ...action, playerId: id, now: this.t } as Action);
    if (!result.ok) throw new Error(`tour: ${action.type} was refused for ${id} (${result.code})`);
    this.state = result.state;
  }

  server(): void {
    const result = machine.reduce(this.state, { type: 'server.deadline', now: this.t });
    if (!result.ok) throw new Error('tour: the deadline was refused');
    this.state = result.state;
  }

  wait(ms: number): void {
    this.t += ms;
  }

  clock(): LocalClock {
    return {
      now: () => this.t,
      advance: (ms: number) => {
        this.t += ms;
      },
    };
  }

  lead(): PlayerId {
    return this.state.facilitatorId ?? TourYou;
  }
}

function itemOf(run: Run, id: string): WorkItem {
  const found = run.state.items.find((own) => own.id === id);
  if (found === undefined) throw new Error(`tour: no item ${id}`);
  return found;
}

function castOf(state: RoomState): Cast {
  const backlog = state.items.filter((item) => item.status === 'backlog');
  const solos = backlog.filter((item) => item.workersNeeded === 1);
  const ordered = [...solos.filter((item) => item.kind === 'order'), ...solos.filter((item) => item.kind !== 'order')].map((item) => item.id);
  const pair = backlog.find((item) => item.workersNeeded === 2 && !item.dependency && item.kind === 'order');
  const dependent = backlog.find((item) => item.workersNeeded === 2 && item.dependency);
  const first = ordered[0];
  const head = first === undefined ? undefined : backlog.find((item) => item.id === first);
  if (ordered.length < 3 || head === undefined || head.kind !== 'order' || pair === undefined || dependent === undefined) {
    throw new Error('tour: the backlog lacks the items the tour needs');
  }
  const [right, wrong] = [ordered[1], ordered[2]];
  if (right === undefined || wrong === undefined) throw new Error('tour: the backlog lacks the items the tour needs');
  return { solos: ordered, order: head.id, pair: pair.id, dependent: dependent.id, right, wrong, spare: ordered[3] ?? right };
}

function start(run: Run, lead: PlayerId): Cast {
  if (lead !== TourYou) run.act(lead, { type: 'lobby.volunteer', volunteer: true });
  run.act(TourYou, { type: 'lobby.start' });
  return castOf(run.state);
}

function toCard(run: Run, pulls: string[]): void {
  const lead = run.lead();
  run.act(lead, { type: 'phase.begin' });
  if (profileOf(run.state.framework).goals) {
    const theme = run.state.iterations[0]?.goalOptions[0];
    if (theme === undefined) throw new Error('tour: no goal option');
    for (const id of [TourYou, ...Mates]) run.act(id, { type: 'plan.goal_vote', theme });
    run.act(lead, { type: 'plan.goal_confirm' });
    run.act(lead, { type: 'plan.estimation_stop' });
  }
  for (const itemId of pulls) run.act(lead, { type: 'plan.pull', itemId });
  run.act(lead, { type: 'phase.advance' });
}

function toRunning(run: Run, pulls: string[]): void {
  toCard(run, pulls);
  run.act(run.lead(), { type: 'phase.begin' });
}

function answer(run: Run, id: string, right: boolean): ClientAction {
  const item = itemOf(run, id);
  if (item.puzzle === null) throw new Error(`tour: item ${id} has no puzzle`);
  return { type: 'item.submit', itemId: id, response: right ? rightResponse(item.puzzle) : wrongResponse(item.puzzle) };
}

function submitAs(run: Run, who: PlayerId, id: string, right = true): void {
  run.act(who, { type: 'item.take', itemId: id });
  run.act(who, { type: 'item.open', itemId: id, mode: 'work' });
  run.wait(SwitchWaitMs);
  run.act(who, answer(run, id, right));
}

function reviewAs(run: Run, who: PlayerId, id: string, verdict: 'lgtm' | 'changes' = 'lgtm'): void {
  run.act(who, { type: 'item.take_review', itemId: id });
  run.wait(SwitchWaitMs);
  run.act(who, { type: 'item.verdict', itemId: id, verdict });
}

function pairUp(run: Run, id: string, first: PlayerId, second: PlayerId): void {
  run.act(first, { type: 'item.take', itemId: id });
  run.act(second, { type: 'item.take', itemId: id });
}

function four(cast: Cast): string[] {
  return [cast.solos[0] as string, cast.solos[1] as string, cast.solos[2] as string, cast.pair];
}

function endHalf(run: Run): void {
  const phase = run.state.phase;
  if (phase.kind !== 'work' || phase.timebox.deadline === null) throw new Error('tour: no Sprint clock to run out');
  run.t = Math.max(run.t, phase.timebox.deadline) + 50;
  run.server();
}

function board(run: Run, cast: Cast): void {
  const [finished, waiting] = [cast.right, cast.wrong];
  toRunning(run, four(cast));
  submitAs(run, 'mate-1', finished);
  reviewAs(run, 'mate-2', finished);
  submitAs(run, 'mate-3', waiting);
  run.act('mate-2', { type: 'item.take', itemId: cast.pair });
}

function crowd(run: Run, cast: Cast): void {
  toRunning(run, four(cast));
  run.act('mate-2', { type: 'item.take', itemId: cast.solos[2] as string });
  pairUp(run, cast.pair, 'mate-1', 'mate-3');
}

function solo(run: Run, cast: Cast): void {
  toRunning(run, [cast.order, cast.solos[1] as string, cast.solos[2] as string, cast.pair]);
  run.act('mate-2', { type: 'item.take', itemId: cast.solos[1] as string });
  pairUp(run, cast.pair, 'mate-1', 'mate-3');
  run.act(TourYou, { type: 'item.take', itemId: cast.order });
  run.act(TourYou, { type: 'item.open', itemId: cast.order, mode: 'work' });
  run.wait(SwitchWaitMs);
}

function switching(run: Run, cast: Cast): void {
  const mate = cast.solos.find((id) => id !== cast.order && id !== cast.spare);
  if (mate === undefined) throw new Error('tour: the switch scene lacks a teammate item');
  toRunning(run, [cast.order, cast.spare, mate, cast.pair]);
  run.act('mate-2', { type: 'item.take', itemId: mate });
  pairUp(run, cast.pair, 'mate-1', 'mate-3');
  run.act(TourYou, { type: 'item.take', itemId: cast.order });
  run.act(TourYou, { type: 'item.open', itemId: cast.order, mode: 'work' });
  run.act(TourYou, { type: 'item.take', itemId: cast.spare });
  run.wait(SwitchWaitMs);
}

function pair(run: Run, cast: Cast): void {
  toRunning(run, four(cast));
  run.act('mate-2', { type: 'item.take', itemId: cast.solos[2] as string });
  pairUp(run, cast.pair, 'mate-1', TourYou);
  run.act(TourYou, { type: 'item.open', itemId: cast.pair, mode: 'work' });
  run.act('mate-1', { type: 'item.open', itemId: cast.pair, mode: 'work' });
  run.wait(SwitchWaitMs);
}

function held(run: Run, cast: Cast): void {
  toRunning(run, [cast.solos[0] as string, cast.solos[1] as string, cast.dependent]);
  pairUp(run, cast.dependent, 'mate-1', 'mate-2');
  run.act('mate-3', { type: 'item.take', itemId: cast.solos[1] as string });
  if (itemOf(run, cast.dependent).dependencyHolder !== TourYou) throw new Error('tour: the player does not hold the information');
}

function review(run: Run, cast: Cast, right: boolean): void {
  const [item, other] = right ? [cast.right, cast.wrong] : [cast.wrong, cast.right];
  toRunning(run, four(cast));
  submitAs(run, 'mate-1', item, right);
  run.act(TourYou, { type: 'item.take_review', itemId: item });
  run.act('mate-2', { type: 'item.take', itemId: other });
  run.wait(SwitchWaitMs);
}

function daily(run: Run, cast: Cast): void {
  toRunning(run, [cast.right, cast.wrong, cast.pair, cast.dependent]);
  pairUp(run, cast.dependent, 'mate-1', 'mate-2');
  run.act(TourYou, { type: 'help.promise', itemId: cast.dependent });
  submitAs(run, 'mate-2', cast.right);
  run.act('mate-3', { type: 'item.take', itemId: cast.pair });
  endHalf(run);
  run.act(run.lead(), { type: 'phase.begin' });
}

function inspect(run: Run, cast: Cast): void {
  toRunning(run, four(cast));
  submitAs(run, TourYou, cast.order, true);
  reviewAs(run, 'mate-2', cast.order);
  submitAs(run, 'mate-3', cast.wrong, false);
  reviewAs(run, 'mate-2', cast.wrong);
  endHalf(run);
  run.act(TourYou, { type: 'phase.begin' });
  run.act(TourYou, { type: 'daily.end' });
  endHalf(run);
  run.act(TourYou, { type: 'phase.begin' });
}

function toRetro(run: Run, cast: Cast, note: (key: Key) => string): void {
  toRunning(run, four(cast));
  const clock = run.clock();
  for (let guard = 0; guard < 16 && run.state.phase.kind !== 'retro'; guard += 1) {
    run.state = skipEvent(run.state, clock, note);
  }
  if (run.state.phase.kind !== 'retro') throw new Error('tour: the retrospective was not reached');
}

function notesDone(run: Run): boolean {
  const retro = run.state.iterations[run.state.iterations.length - 1]?.retro;
  return retro !== undefined && Mates.every((id) => retro.notes.filter((own) => own.authorId === id).length >= 2);
}

function votesDone(run: Run): boolean {
  const retro = run.state.iterations[run.state.iterations.length - 1]?.retro;
  return retro !== undefined && Mates.every((id) => (retro.votes[id] ?? []).length >= config.retro.votesPerPlayer);
}

function mateRounds(run: Run, note: (key: Key) => string, finished: () => boolean): void {
  for (let guard = 0; guard < 80 && !finished(); guard += 1) {
    run.wait(StepMs);
    for (const id of Mates) {
      const decision = decide(run.state, id, run.t, () => [], note);
      if (decision === null) continue;
      const type = decision.action.type;
      if (type === 'retro.reveal' || type === 'phase.advance' || type === 'phase.begin') continue;
      run.act(id, type === 'retro.note_add' ? (mateNote(run, id, note) ?? decision.action) : decision.action, 0);
    }
  }
}

function mateNote(run: Run, id: PlayerId, note: (key: Key) => string): ClientAction | null {
  const retro = run.state.iterations[run.state.iterations.length - 1]?.retro;
  const keys = MateNotes[id];
  if (retro === undefined || keys === undefined) return null;
  const key = keys[retro.notes.filter((own) => own.authorId === id).length];
  const column = key === undefined ? undefined : NoteColumns[key.split('.')[2] as string];
  return key === undefined || column === undefined ? null : { type: 'retro.note_add', column, text: note(key) };
}

function retroNotes(run: Run, note: (key: Key) => string): void {
  run.act(run.lead(), { type: 'phase.begin' });
  mateRounds(run, note, () => notesDone(run));
}

function retroVote(run: Run, note: (key: Key) => string, own: OwnNote | null): void {
  retroNotes(run, note);
  run.act(TourYou, { type: 'retro.note_add', column: own?.column ?? 'try', text: own?.text ?? note(SampleNote) });
  run.act(run.lead(), { type: 'retro.reveal' });
}

function retroAction(run: Run, note: (key: Key) => string): void {
  retroNotes(run, note);
  run.act(TourYou, { type: 'retro.reveal' });
  mateRounds(run, note, () => votesDone(run));
  run.act(TourYou, { type: 'phase.advance' });
}

function limit(run: Run, cast: Cast, note: (key: Key) => string): void {
  toRetro(run, cast, note);
  const clock = run.clock();
  for (let guard = 0; guard < 4 && !(run.state.phase.kind === 'plan' && run.state.phase.iteration === 2); guard += 1) {
    run.state = skipEvent(run.state, clock, note);
  }
  if (run.state.phase.kind !== 'plan') throw new Error('tour: round 2 was not reached');
  const lead = run.lead();
  run.act(lead, { type: 'phase.begin' });
  const backlog = run.state.items.filter((item) => item.status === 'backlog');
  const pool = [...backlog.filter((item) => item.workersNeeded === 1).slice(0, 2), ...backlog.filter((item) => item.workersNeeded === 2).slice(0, 2)];
  for (const item of pool) run.act(lead, { type: 'plan.pull', itemId: item.id });
  run.act(lead, { type: 'phase.advance' });
  run.act(lead, { type: 'plan.set_limits', inProgress: 2, review: null });
  run.act(lead, { type: 'phase.advance' });
  run.act(lead, { type: 'phase.begin' });
  const ready = run.state.items.filter((item) => item.status === 'todo' && item.workersNeeded === 1);
  const [one, two] = [ready[0], ready[1]];
  if (one === undefined || two === undefined) throw new Error('tour: round 2 has too few single requests');
  run.act('mate-1', { type: 'item.take', itemId: one.id });
  run.act('mate-3', { type: 'item.take', itemId: two.id });
}

function says(run: Run, cast: Cast): TourSays {
  const part = itemOf(run, cast.pair).puzzle?.parts[0];
  if (part === undefined || part.kind !== 'order') throw new Error('tour: the pair item is not an order item');
  return { clues: part.clues.map((clue) => ({ ...clue })) };
}

/**
 * Builds one prepared situation from a fixed secret by playing the scripted teammates' moves through the engine's reducer.
 */
export function buildScene(framework: Framework, id: SceneId, note: (key: Key) => string, own: OwnNote | null = null): Scene {
  const run = new Run(framework);
  const lead: PlayerId = id === 'review' || id === 'action' ? TourYou : 'mate-1';
  const cast = start(run, lead);
  let partner: TourSays | null = null;
  if (id === 'card') toCard(run, [cast.solos[0] as string]);
  else if (id === 'board') board(run, cast);
  else if (id === 'take') crowd(run, cast);
  else if (id === 'solo') solo(run, cast);
  else if (id === 'switch') switching(run, cast);
  else if (id === 'limit') limit(run, cast, note);
  else if (id === 'pair') {
    pair(run, cast);
    partner = says(run, cast);
  } else if (id === 'held') held(run, cast);
  else if (id === 'right') review(run, cast, true);
  else if (id === 'wrong') review(run, cast, false);
  else if (id === 'daily') daily(run, cast);
  else if (id === 'review') inspect(run, cast);
  else {
    toRetro(run, cast, note);
    if (id === 'note') retroNotes(run, note);
    else if (id === 'vote') retroVote(run, note, own);
    else retroAction(run, note);
  }
  return { state: run.state, at: run.t, says: partner };
}
