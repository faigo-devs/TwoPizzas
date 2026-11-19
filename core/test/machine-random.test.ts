import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../config.ts';
import { nextDeadline, reduce, viewFor } from '../machine/index.ts';
import { createRng } from '../rng.ts';
import type { Rng } from '../rng.ts';
import type { Action, Agreement, ClientAction, Framework, ItemStatus, PlayerId, RoomState } from '../types.ts';
import { answerOf, assertNoLeak, newRoom, wrongResponse } from './machine-support.ts';
import { testSecret } from './support.ts';

const Statuses: readonly ItemStatus[] = ['backlog', 'todo', 'doing', 'review', 'done'];
const Advancing = new Set(['lobby.start', 'phase.begin', 'phase.advance', 'daily.end', 'inspect.reveal', 'retro.reveal', 'summary.publish']);
const Agreements: Agreement[] = [
  { type: 'wip_limit', max: 2 },
  { type: 'review_wait', maxMs: 60_000 },
  { type: 'no_new_while_blocked' },
  { type: 'pair_first' },
  { type: 'wip_limits_set' },
  { type: 'free', text: 'keep it small' },
];
const StepsPerGame = 1500;

function candidates(state: RoomState, playerId: PlayerId, rng: Rng): ClientAction[] {
  const list: ClientAction[] = [
    { type: 'lobby.set_name', name: `Name ${rng.int(100)}` },
    { type: 'lobby.volunteer', volunteer: rng.next() < 0.5 },
    { type: 'lobby.new_team_name' },
    { type: 'lobby.start' },
    { type: 'lobby.lock', locked: rng.next() < 0.5 },
    { type: 'player.pause', minutes: 1 },
    { type: 'player.resume' },
    { type: 'phase.begin' },
    { type: 'phase.advance' },
    { type: 'plan.goal_confirm' },
    { type: 'plan.poker_reveal' },
    { type: 'plan.poker_revote' },
    { type: 'plan.poker_record', estimate: rng.next() < 0.5 ? null : rng.pick(config.poker.cards) },
    { type: 'plan.estimation_stop' },
    { type: 'plan.set_limits', inProgress: rng.next() < 0.3 ? null : 1 + rng.int(6), review: rng.next() < 0.3 ? null : 1 + rng.int(6) },
    { type: 'plan.poker_vote', card: rng.pick(config.poker.cards) },
    { type: 'item.close' },
    { type: 'work.end_early' },
    { type: 'daily.end' },
    { type: 'inspect.reveal' },
    { type: 'retro.note_add', column: rng.pick(config.retro.columns), text: `note ${rng.int(1000)}` },
    { type: 'retro.reveal' },
    { type: 'retro.choose_action', agreement: rng.pick(Agreements) },
    { type: 'retro.help_start' },
    { type: 'summary.publish' },
  ];
  for (const theme of config.backlog.themes) list.push({ type: 'plan.goal_vote', theme });
  for (const item of rng.shuffle(state.items).slice(0, 8)) {
    list.push(
      { type: 'plan.pull', itemId: item.id },
      { type: 'plan.unpull', itemId: item.id },
      { type: 'item.take', itemId: item.id },
      { type: 'item.leave', itemId: item.id },
      { type: 'item.open', itemId: item.id, mode: rng.next() < 0.5 ? 'work' : 'review' },
      { type: 'item.take_review', itemId: item.id },
      { type: 'item.verdict', itemId: item.id, verdict: rng.next() < 0.7 ? 'lgtm' : 'changes' },
      { type: 'help.promise', itemId: item.id },
      { type: 'help.withdraw', itemId: item.id },
    );
    if (item.puzzle !== null) {
      const response = rng.next() < 0.7 ? answerOf(item.puzzle) : wrongResponse(item.puzzle);
      list.push({ type: 'item.submit', itemId: item.id, response });
    }
  }
  const iteration = state.iterations[state.iterations.length - 1];
  if (iteration !== undefined) {
    const notes = iteration.retro.notes;
    for (const note of rng.shuffle(notes).slice(0, 3)) {
      list.push(
        { type: 'retro.vote', noteId: note.id },
        { type: 'retro.unvote', noteId: note.id },
        { type: 'retro.note_edit', noteId: note.id, text: `edited ${rng.int(1000)}` },
        { type: 'retro.note_remove', noteId: note.id },
      );
    }
    const view = viewFor(state, playerId, state.now);
    const help = view.retro?.help;
    if (help) {
      for (const question of help.questions) list.push({ type: 'retro.help_answer', questionId: question.id, choice: rng.pick(question.choices) });
      for (const proposal of help.proposals) list.push({ type: 'retro.help_use', proposalId: proposal.id });
    }
  }
  return list;
}

function references(state: RoomState): string[] {
  const ids = new Set(state.players.map((player) => player.id));
  const dangling: string[] = [];
  const check = (label: string, id: string | null): void => {
    if (id !== null && !ids.has(id)) dangling.push(`${label}:${id}`);
  };
  check('host', state.hostId);
  check('facilitator', state.facilitatorId);
  for (const item of state.items) {
    for (const worker of item.workers) check(`${item.id}.worker`, worker);
    check(`${item.id}.reviewer`, item.reviewer);
    check(`${item.id}.reviewedBy`, item.reviewedBy);
    check(`${item.id}.submittedBy`, item.submittedBy);
    check(`${item.id}.helpPromisedBy`, item.helpPromisedBy);
    check(`${item.id}.dependencyHolder`, item.dependencyHolder);
  }
  for (const iteration of state.iterations) {
    check('iteration.facilitator', iteration.facilitatorId);
    for (const note of iteration.retro.notes) check(`${note.id}.author`, note.authorId);
  }
  const known = new Set(state.items.map((item) => item.id));
  for (const player of state.players) {
    if (player.open !== null && !known.has(player.open.itemId)) dangling.push(`${player.id}.open:${player.open.itemId}`);
  }
  return dangling;
}

function assertInvariants(state: RoomState): void {
  const seen = new Set<string>();
  for (const item of state.items) {
    assert.ok(!seen.has(item.id), `item ${item.id} listed twice`);
    seen.add(item.id);
    assert.ok(Statuses.includes(item.status), `item ${item.id} has status ${String(item.status)}`);
    if (item.status === 'backlog') {
      assert.equal(item.workers.length, 0, `${item.id} in backlog with workers`);
      assert.equal(item.puzzle, null, `${item.id} in backlog with a puzzle`);
    }
    if (item.outcome !== null) assert.equal(item.status, 'done', `${item.id} has an outcome but is ${item.status}`);
    assert.equal(new Set(item.workers).size, item.workers.length, `${item.id} has a worker twice`);
  }
  assert.deepEqual(references(state), [], 'a reference to a player who is not in the room');
  assert.equal(new Set(state.players.map((player) => player.id)).size, state.players.length);
}

interface PlayResult {
  phases: Set<string>;
  accepted: number;
  refusals: number;
  deadlines: number;
  finished: boolean;
}

function play(framework: Framework, players: number, seed: number): PlayResult {
  const rng = createRng(testSecret(`random:${framework}:${players}:${seed}`), 'play');
  const room = newRoom({ seed, players, framework });
  let state = room.state;
  let now = state.now;
  const result: PlayResult = { phases: new Set(['lobby']), accepted: 0, refusals: 0, deadlines: 0, finished: false };
  const ids = state.players.map((player) => player.id);

  const settleDeadlines = (): void => {
    for (let guard = 0; guard < 200; guard += 1) {
      const due = nextDeadline(state);
      if (due === null || due > now) return;
      const action: Action = { type: 'server.deadline', now: due };
      const first = reduce(state, action);
      assert.ok(first.ok, 'server.deadline refused');
      const second = reduce(first.state, action);
      assert.ok(second.ok, 'second server.deadline refused');
      assert.deepEqual(second.state, first.state, 'server.deadline applied twice changed the state');
      state = first.state;
      result.deadlines += 1;
    }
  };

  for (let step = 0; step < StepsPerGame && !result.finished; step += 1) {
    now += 1 + rng.int(4000);
    settleDeadlines();
    const order = rng.shuffle(ids);
    const preferAdvance = rng.next() < 0.4;
    let acted = false;
    let sampled = 0;
    const before = step % 5 === 0 ? JSON.stringify(state) : null;
    for (const playerId of order) {
      let list = rng.shuffle(candidates(state, playerId, rng));
      if (preferAdvance) list = [...list.filter((own) => Advancing.has(own.type)), ...list.filter((own) => !Advancing.has(own.type))];
      for (const action of list.slice(0, 40)) {
        const outcome = reduce(state, { ...action, playerId, now });
        if (!outcome.ok) {
          result.refusals += 1;
          if (before !== null && sampled < 3) {
            sampled += 1;
            assert.equal(JSON.stringify(state), before, `a refused ${action.type} changed the state`);
          }
          continue;
        }
        state = outcome.state;
        result.accepted += 1;
        acted = true;
        break;
      }
      if (acted) break;
    }
    assertInvariants(state);
    result.phases.add(state.phase.kind);
    if (step % 25 === 0) {
      for (const id of ids) assertNoLeak(state, viewFor(state, id, now));
    }
    if (state.phase.kind === 'summary') result.finished = true;
    if (!acted) now += 5000;
  }
  return result;
}

for (const framework of ['scrum', 'kanban'] as const) {
  for (const players of [3, 4, 5, 6]) {
    test(`random legal play keeps the invariants, ${framework}, ${players} players`, (t) => {
      const result = play(framework, players, 9000 + players);
      t.diagnostic(
        `phases ${[...result.phases].join(',')}; accepted ${result.accepted}; refused ${result.refusals}; deadlines ${result.deadlines}; finished ${result.finished}`,
      );
      assert.ok(result.accepted > 100, 'random play made too little progress');
      assert.ok(result.phases.has('plan') && result.phases.has('work'), 'random play never reached the work');
      assert.ok(result.refusals > 0);
    });
  }
}
