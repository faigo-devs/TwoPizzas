import assert from 'node:assert/strict';
import { config } from '../config.ts';
import { createRoom, nextDeadline, reduce, viewFor } from '../machine/index.ts';
import type {
  Action,
  Agreement,
  ClientAction,
  PlayerId,
  Phase,
  PlayerView,
  PuzzleResponse,
  Puzzle,
  ReduceResult,
  RoomState,
  WorkItem,
} from '../types.ts';

export interface Room {
  state: RoomState;
  now: number;
  checks: boolean;
  phases: string[];
  actions: number;
}

export function label(state: RoomState): string {
  const phase = state.phase;
  if (phase.kind === 'lobby' || phase.kind === 'summary') return phase.kind;
  if (phase.kind === 'work') return `work${phase.iteration}.${phase.half}`;
  return `${phase.kind}${phase.iteration}`;
}

export function phaseOf(room: Room): Phase {
  return room.state.phase;
}

export function stepOf(room: Room): string {
  const phase = room.state.phase;
  return phase.kind === 'lobby' || phase.kind === 'summary' ? '' : phase.step;
}

export function pid(index: number): PlayerId {
  return `p${index + 1}`;
}

export function newRoom(options: { seed?: number; framework?: 'scrum' | 'kanban'; players?: number } = {}): Room {
  const seed = options.seed ?? 7654321;
  const room: Room = {
    state: createRoom({ code: 'BCDFG', framework: options.framework ?? 'scrum', seed, now: 1_000 }),
    now: 1_000,
    checks: true,
    phases: ['lobby'],
    actions: 0,
  };
  for (let index = 0; index < (options.players ?? 0); index += 1) {
    server(room, { type: 'server.join', playerId: pid(index), name: null, now: room.now });
  }
  return room;
}

function allViews(room: Room): PlayerView[] {
  return room.state.players.map((player) => viewFor(room.state, player.id, room.now));
}

function jsonOf(value: unknown): string {
  return JSON.stringify(value);
}

export function assertNoLeak(state: RoomState, view: PlayerView): void {
  const text = jsonOf(view);
  assert.ok(!/"(answer|puzzle|seed|rng|size|fullPart|dependencyPart|parts|token)"/u.test(text), 'forbidden key in view');
  const numbers = [state.seed, state.rng, ...state.items.map((item) => item.seed)];
  for (const value of numbers) assert.ok(!new RegExp(`(?<![0-9])${value}(?![0-9])`, 'u').test(text), 'seed in view');
  const allowed = new Set<string>();
  if (view.workspace?.part) allowed.add(jsonOf(view.workspace.part));
  if (view.workspace?.submission) allowed.add(jsonOf(view.workspace.submission));
  for (const held of view.held) allowed.add(jsonOf(held.part));
  for (const item of state.items) {
    if (item.puzzle === null) continue;
    const secrets = [...item.puzzle.parts, item.puzzle.dependencyPart, item.puzzle.fullPart, item.puzzle.answer];
    for (const secret of secrets) {
      if (secret === null) continue;
      const json = jsonOf(secret);
      if (!allowed.has(json)) assert.ok(!text.includes(json), `view leaks a part of ${item.id}`);
    }
  }
  const revealedAny = state.iterations.some((iteration) => iteration.verdictsRevealed > 0);
  if (!revealedAny) {
    assert.ok(!/"outcome":"(accepted|escaped_defect)"/u.test(text), 'verdict before reveal');
  }
  for (const iteration of state.iterations) {
    for (const note of iteration.retro.notes) {
      if (note.authorId !== view.selfId && !iteration.retro.revealed) {
        assert.ok(!text.includes(note.text), 'view leaks a hidden note');
      }
    }
  }
}

export function checkInvariants(room: Room): void {
  assert.deepEqual(JSON.parse(JSON.stringify(room.state)), room.state);
  for (const view of allViews(room)) assertNoLeak(room.state, view);
}

function settle(room: Room, result: ReduceResult): ReduceResult {
  if (!result.ok) return result;
  room.state = result.state;
  room.actions += 1;
  const current = label(room.state);
  if (room.phases[room.phases.length - 1] !== current) room.phases.push(current);
  if (room.checks) checkInvariants(room);
  return result;
}

export function server(room: Room, action: Action): ReduceResult {
  return settle(room, reduce(room.state, action));
}

export function tryAct(room: Room, playerId: PlayerId, action: ClientAction): ReduceResult {
  const before = JSON.stringify(room.state);
  const result = settle(room, reduce(room.state, { ...action, playerId, now: room.now }));
  if (!result.ok) assert.equal(JSON.stringify(room.state), before, 'a refused action changed the state');
  return result;
}

export function act(room: Room, playerId: PlayerId, action: ClientAction): RoomState {
  const result = tryAct(room, playerId, action);
  assert.ok(result.ok, `${action.type} by ${playerId} refused: ${result.ok ? '' : result.code}`);
  return room.state;
}

export function advanceTo(room: Room, time: number): void {
  for (let guard = 0; guard < 1000; guard += 1) {
    const due = nextDeadline(room.state);
    if (due === null || due > time) break;
    room.now = due;
    server(room, { type: 'server.deadline', now: due });
  }
  room.now = Math.max(room.now, time);
}

export function wait(room: Room, ms: number): void {
  advanceTo(room, room.now + ms);
}

export function facilitator(room: Room): PlayerId {
  const id = room.state.facilitatorId;
  assert.ok(id !== null);
  return id;
}

export function host(room: Room): PlayerId {
  const id = room.state.hostId;
  assert.ok(id !== null);
  return id;
}

export function item(room: Room, id: string): WorkItem {
  const found = room.state.items.find((own) => own.id === id);
  assert.ok(found !== undefined, `no item ${id}`);
  return found;
}

export function answerOf(puzzle: Puzzle): PuzzleResponse {
  return JSON.parse(JSON.stringify(puzzle.answer)) as PuzzleResponse;
}

export function wrongResponse(puzzle: Puzzle): PuzzleResponse {
  if (puzzle.kind === 'review') return { kind: 'review', keys: [] };
  if (puzzle.kind === 'order') return { kind: 'order', order: [...puzzle.answer.order].reverse() };
  if (puzzle.kind === 'incident') return { kind: 'incident', action: 'nothing' };
  return { kind: 'merge', values: puzzle.answer.values.map((value) => value + 1) };
}

export interface TeamStyle {
  careful: boolean;
  wrongMod: number;
  wipLimit: number;
  pullCount: number;
  slowPlanMs: number;
  agreement: Agreement | null;
  secondAgreement: Agreement | null;
  helpBlocked: boolean;
  noteText: (index: number) => string;
}

export const defaultStyle: TeamStyle = {
  careful: true,
  wrongMod: 0,
  wipLimit: 3,
  pullCount: 4,
  slowPlanMs: 0,
  agreement: { type: 'wip_limit', max: 2 },
  secondAgreement: { type: 'free', text: 'keep it small' },
  helpBlocked: true,
  noteText: (index) => `note from player ${index + 1}`,
};

export function playLobby(room: Room, count: number): void {
  for (let index = room.state.players.length; index < count; index += 1) {
    server(room, { type: 'server.join', playerId: pid(index), name: `Player ${index + 1}`, now: room.now });
  }
  act(room, host(room), { type: 'lobby.start' });
}

export function begin(room: Room): void {
  wait(room, 1000);
  act(room, facilitator(room), { type: 'phase.begin' });
}

export function playPlanning(room: Room, style: TeamStyle): void {
  begin(room);
  const phase = room.state.phase;
  assert.equal(phase.kind, 'plan');
  const players = room.state.players.map((player) => player.id);
  const iteration = room.state.iterations[room.state.iterations.length - 1];
  assert.ok(iteration !== undefined);
  if (room.state.phase.kind === 'plan' && room.state.phase.step === 'goal') {
    for (const player of players) act(room, player, { type: 'plan.goal_vote', theme: iteration.goalOptions[0] ?? 'payments' });
    act(room, facilitator(room), { type: 'plan.goal_confirm' });
  }
  let first = true;
  while (room.state.phase.kind === 'plan' && room.state.phase.step === 'estimate') {
    const current = room.state.iterations[room.state.iterations.length - 1]?.poker;
    assert.ok(current !== undefined && current !== null);
    const cards = config.poker.cards;
    players.forEach((player, index) => {
      const card = cards[(index + Number(current.itemId.slice(1))) % 4] ?? 1;
      act(room, player, { type: 'plan.poker_vote', card });
    });
    if (first) {
      first = false;
      act(room, facilitator(room), { type: 'plan.poker_revote' });
      players.forEach((player) => act(room, player, { type: 'plan.poker_vote', card: 3 }));
    }
    act(room, facilitator(room), { type: 'plan.poker_record', estimate: null });
    if (room.state.items.filter((own) => own.estimate !== null).length >= style.pullCount + 2) {
      act(room, facilitator(room), { type: 'plan.estimation_stop' });
    }
  }
  const backlog = room.state.items.filter((own) => own.status === 'backlog');
  for (const own of backlog.slice(0, style.pullCount)) act(room, players[0] as PlayerId, { type: 'plan.pull', itemId: own.id });
  if (style.slowPlanMs > 0) wait(room, style.slowPlanMs);
  act(room, facilitator(room), { type: 'phase.advance' });
}

function moveBot(room: Room, id: PlayerId, style: TeamStyle): boolean {
  const state = room.state;
  const player = state.players.find((own) => own.id === id);
  assert.ok(player !== undefined);
  const open = player.open;
  if (open !== null) {
    const target = item(room, open.itemId);
    if (room.now < open.readyAt) return false;
    if (open.mode === 'review' && target.status === 'review' && target.reviewer === id) {
      const right = target.puzzle !== null && target.submission !== null && isRight(target);
      const verdict = style.careful && !right ? 'changes' : 'lgtm';
      act(room, id, { type: 'item.verdict', itemId: target.id, verdict });
      return true;
    }
    if (open.mode === 'work' && target.status === 'doing' && target.puzzle !== null && target.workers.includes(id)) {
      const number = Number(target.id.slice(1));
      const wrong = style.wrongMod > 0 && number % style.wrongMod === 0 && target.changesRequested === 0;
      const response = wrong ? wrongResponse(target.puzzle) : answerOf(target.puzzle);
      act(room, id, { type: 'item.submit', itemId: target.id, response });
      return true;
    }
    act(room, id, { type: 'item.close' });
    return true;
  }
  const reviewable = state.items.find((own) => own.status === 'review' && own.reviewer === null && !own.workers.includes(id));
  if (reviewable !== undefined) {
    act(room, id, { type: 'item.take_review', itemId: reviewable.id });
    return true;
  }
  const claimed = state.items.find((own) => own.status === 'review' && own.reviewer === id);
  if (claimed !== undefined) {
    act(room, id, { type: 'item.open', itemId: claimed.id, mode: 'review' });
    return true;
  }
  const mine = state.items.find((own) => own.status === 'doing' && own.workers.includes(id) && own.puzzle !== null);
  if (mine !== undefined) {
    act(room, id, { type: 'item.open', itemId: mine.id, mode: 'work' });
    return true;
  }
  const waiting = state.items.find((own) => own.status === 'doing' && own.workers.length < own.workersNeeded && !own.workers.includes(id));
  if (waiting !== undefined) {
    act(room, id, { type: 'item.take', itemId: waiting.id });
    return true;
  }
  const doing = state.items.filter((own) => own.status === 'doing').length;
  const todo = state.items.find((own) => own.status === 'todo');
  if (todo !== undefined && doing < style.wipLimit) {
    act(room, id, { type: 'item.take', itemId: todo.id });
    return true;
  }
  return false;
}

function isRight(target: WorkItem): boolean {
  if (target.puzzle === null || target.submission === null) return false;
  return JSON.stringify(target.puzzle.answer) === JSON.stringify(target.submission);
}

export function playHalf(room: Room, style: TeamStyle, ids?: PlayerId[]): void {
  const players = ids ?? room.state.players.map((player) => player.id);
  const startLabel = label(room.state);
  for (let guard = 0; guard < 2000 && label(room.state) === startLabel; guard += 1) {
    for (const id of players) {
      if (label(room.state) !== startLabel) break;
      moveBot(room, id, style);
    }
    wait(room, 2000);
  }
}

export function playWork(room: Room, style: TeamStyle): void {
  begin(room);
  playHalf(room, style);
  assert.equal(room.state.phase.kind, 'daily');
  begin(room);
  const blocked = room.state.items.filter((own) => own.status === 'doing' && own.dependency && own.puzzle !== null);
  const players = room.state.players.map((player) => player.id);
  if (style.helpBlocked) {
    for (const own of blocked) {
      const helper = players.find((id) => !own.workers.includes(id));
      if (helper !== undefined) act(room, helper, { type: 'help.promise', itemId: own.id });
    }
  }
  wait(room, 30_000);
  act(room, players[players.length - 1] as PlayerId, { type: 'daily.end' });
  playHalf(room, style);
}

export function playInspect(room: Room): void {
  begin(room);
  const fac = facilitator(room);
  while (room.state.phase.kind === 'inspect' && room.state.phase.step === 'increment') {
    const iteration = room.state.iterations[room.state.iterations.length - 1];
    assert.ok(iteration !== undefined);
    if (iteration.verdictsRevealed < iteration.verdicts.length) act(room, fac, { type: 'inspect.reveal' });
    else act(room, fac, { type: 'phase.advance' });
  }
  while (room.state.phase.kind === 'inspect') act(room, fac, { type: 'phase.advance' });
}

export function playRetro(room: Room, style: TeamStyle): void {
  begin(room);
  const fac = facilitator(room);
  const players = room.state.players.map((player) => player.id);
  if (room.state.phase.kind === 'retro' && room.state.phase.step === 'previous') act(room, fac, { type: 'phase.advance' });
  players.forEach((id, index) => {
    act(room, id, { type: 'retro.note_add', column: 'went_well', text: style.noteText(index) });
    act(room, id, { type: 'retro.note_add', column: 'try', text: `try ${style.noteText(index)}` });
  });
  act(room, players[0] as PlayerId, { type: 'retro.help_start' });
  act(room, fac, { type: 'retro.reveal' });
  const notes = room.state.iterations[room.state.iterations.length - 1]?.retro.notes ?? [];
  players.forEach((id, index) => {
    const first = notes[index % notes.length];
    const second = notes[(index + 1) % notes.length];
    if (first !== undefined) act(room, id, { type: 'retro.vote', noteId: first.id });
    if (second !== undefined) act(room, id, { type: 'retro.vote', noteId: second.id });
  });
  act(room, fac, { type: 'phase.advance' });
  const iteration = room.state.iterations[room.state.iterations.length - 1]?.iteration;
  const agreement = iteration === 1 ? style.agreement : style.secondAgreement;
  if (agreement !== null) act(room, fac, { type: 'retro.choose_action', agreement });
  act(room, fac, { type: 'phase.advance' });
}

export function playIteration(room: Room, style: TeamStyle): void {
  playPlanning(room, style);
  playWork(room, style);
  playInspect(room);
  playRetro(room, style);
}

export function playGame(options: { players: number; seed: number; style?: Partial<TeamStyle>; checks?: boolean }): Room {
  const style: TeamStyle = { ...defaultStyle, ...options.style };
  const room = newRoom({ seed: options.seed, players: 1 });
  room.checks = options.checks ?? true;
  playLobby(room, options.players);
  playIteration(room, style);
  playIteration(room, style);
  return room;
}

export const ExpectedPhases = [
  'lobby',
  'plan1',
  'work1.1',
  'daily1',
  'work1.2',
  'inspect1',
  'retro1',
  'plan2',
  'work2.1',
  'daily2',
  'work2.2',
  'inspect2',
  'retro2',
  'summary',
];

export function startedRoom(players: number, seed: number, checks = true): Room {
  const room = newRoom({ seed, players: 1 });
  room.checks = checks;
  playLobby(room, players);
  return room;
}

export function planCustom(room: Room, pick: (backlog: WorkItem[]) => string[]): void {
  begin(room);
  const everyone = room.state.players.map((player) => player.id);
  const iteration = room.state.iterations[room.state.iterations.length - 1];
  assert.ok(iteration !== undefined);
  if (room.state.phase.kind === 'plan' && room.state.phase.step === 'goal') {
    for (const id of everyone) act(room, id, { type: 'plan.goal_vote', theme: iteration.goalOptions[0] ?? 'payments' });
    act(room, facilitator(room), { type: 'plan.goal_confirm' });
  }
  if (room.state.phase.kind === 'plan' && room.state.phase.step === 'estimate') {
    act(room, facilitator(room), { type: 'plan.estimation_stop' });
  }
  const ids = pick(room.state.items.filter((own) => own.status === 'backlog'));
  for (const id of ids) act(room, everyone[0] as PlayerId, { type: 'plan.pull', itemId: id });
  act(room, facilitator(room), { type: 'phase.advance' });
}

export function sprintRunning(players: number, seed: number, pick: (backlog: WorkItem[]) => string[], checks = true): Room {
  const room = startedRoom(players, seed, checks);
  planCustom(room, pick);
  begin(room);
  return room;
}

export function finishSprint(room: Room): void {
  const startLabel = label(room.state);
  const second = startLabel.endsWith('.2');
  if (!second) {
    wait(room, config.timeboxMs.workHalf);
    begin(room);
    act(room, facilitator(room), { type: 'daily.end' });
  }
  wait(room, config.timeboxMs.workHalf);
}

export function revealAll(room: Room): void {
  begin(room);
  const fac = facilitator(room);
  while (room.state.phase.kind === 'inspect' && room.state.phase.step === 'increment') {
    const iteration = room.state.iterations[room.state.iterations.length - 1];
    assert.ok(iteration !== undefined);
    if (iteration.verdictsRevealed < iteration.verdicts.length) act(room, fac, { type: 'inspect.reveal' });
    else act(room, fac, { type: 'phase.advance' });
  }
}

export function secondSprint(agreement: Agreement | null, pick: (backlog: WorkItem[]) => string[], players = 4): Room {
  const fresh = startedRoom(players, 4040404, false);
  const style: TeamStyle = { ...defaultStyle, agreement, pullCount: 3 };
  playPlanning(fresh, style);
  playWork(fresh, style);
  playInspect(fresh);
  playRetro(fresh, style);
  planCustom(fresh, pick);
  begin(fresh);
  return fresh;
}
