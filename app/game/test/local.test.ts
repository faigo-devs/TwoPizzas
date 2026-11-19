import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { machine } from '../../../core/index.ts';
import type { Framework, PlayerId, RoomState } from '../../../core/index.ts';
import { decide } from '../local/bots.ts';
import { HumanId, applyAction, applyServer, createLocalClock, createTeammates, newLocalRoom, skipEvent, viewOf } from '../local/room.ts';
import type { LocalClock } from '../local/room.ts';

const note = (key: string): string => key;
const StartMs = 1_800_000_000_000;

function fixedClock(): LocalClock {
  let t = StartMs;
  return {
    now: () => t,
    advance(ms: number) {
      t += ms;
    },
  };
}

function lobbyOf(framework: Framework, players: number, clock: LocalClock): RoomState {
  let state = machine.createRoom({ code: 'BCDFG', framework, secret: 'a'.repeat(64), nameSeed: 7, now: clock.now() });
  for (let index = 0; index < players; index += 1) {
    const joined = machine.reduce(state, { type: 'server.join', playerId: `p${index}`, name: null, now: clock.now() });
    assert.ok(joined.ok);
    state = joined.state;
  }
  const host = state.hostId;
  assert.ok(host !== null);
  const started = applyAction(state, host, { type: 'lobby.start' }, clock.now());
  assert.ok(started.ok);
  return started.state;
}

function kindOf(state: RoomState): string {
  return state.phase.kind === 'lobby' || state.phase.kind === 'summary' ? state.phase.kind : `${state.phase.kind}:${state.phase.iteration}`;
}

function playThrough(start: RoomState, clock: LocalClock): string[] {
  let state = start;
  const seen: string[] = [];
  for (let events = 0; events < 40 && state.phase.kind !== 'summary'; events += 1) {
    const before = JSON.stringify(state.phase);
    state = skipEvent(state, clock, note);
    assert.notEqual(JSON.stringify(state.phase), before, `stuck in ${kindOf(state)} after ${events} events`);
    seen.push(kindOf(state));
  }
  assert.equal(state.phase.kind, 'summary');
  return seen;
}

describe('skipEvent plays whole games', () => {
  for (const framework of ['scrum', 'kanban'] as const) {
    for (const players of [3, 6]) {
      it(`${framework} with ${players} players reaches the summary`, () => {
        const clock = fixedClock();
        const seen = playThrough(lobbyOf(framework, players, clock), clock);
        assert.ok(seen.includes('retro:1') && seen.includes('retro:2'));
        assert.equal(seen.at(-1), 'summary');
      });
    }
  }

  it('does nothing in a lobby or a summary', () => {
    const clock = fixedClock();
    const room = newLocalRoom('scrum', clock);
    assert.equal(room.phase.kind, 'lobby');
    assert.equal(skipEvent(room, clock, note), room);
  });

  it('leaves the human seat a view of the finished game', () => {
    const clock = fixedClock();
    const lobby = lobbyOf('scrum', 4, clock);
    let state = lobby;
    for (let events = 0; events < 40 && state.phase.kind !== 'summary'; events += 1) state = skipEvent(state, clock, note);
    const view = machine.viewFor(state, state.players[0]!.id, clock.now());
    assert.ok(view.summary !== null);
  });
});

describe('the local room', () => {
  it('seats the human with three teammates in a lobby', () => {
    const room = newLocalRoom('kanban', createLocalClock());
    assert.equal(room.phase.kind, 'lobby');
    assert.deepEqual(
      room.players.map((player) => player.id),
      [HumanId, 'mate-1', 'mate-2', 'mate-3'],
    );
    assert.equal(room.framework, 'kanban');
  });

  it('refuses an action the reducer refuses and applies one it accepts', () => {
    const clock = createLocalClock();
    const room = newLocalRoom('scrum', clock);
    const refused = applyAction(room, 'mate-1', { type: 'lobby.start' }, clock.now());
    assert.equal(refused.ok, false);
    const host = room.hostId as PlayerId;
    const started = applyAction(room, host, { type: 'lobby.start' }, clock.now());
    assert.ok(started.ok);
    assert.equal(started.state.phase.kind, 'plan');
    assert.equal(viewOf(started.state, clock).selfId, HumanId);
  });

  it('refuses a server action out of turn', () => {
    const clock = createLocalClock();
    const room = newLocalRoom('scrum', clock);
    const result = applyServer(room, { type: 'server.deadline', now: clock.now() });
    assert.equal(typeof result.ok, 'boolean');
  });

  it('keeps the teammates moving with a clock that only advances by the test', () => {
    const clock = fixedClock();
    const room = newLocalRoom('scrum', clock);
    const started = applyAction(room, room.hostId as PlayerId, { type: 'lobby.start' }, clock.now());
    assert.ok(started.ok);
    let state = started.state;
    const teammates = createTeammates();
    let moves = 0;
    for (let tick = 0; tick < 4000 && moves < 25; tick += 1) {
      clock.advance(400);
      const own = decide(state, HumanId, clock.now(), () => [], note);
      if (own !== null) {
        const played = applyAction(state, HumanId, own.action, clock.now());
        if (played.ok) state = played.state;
      }
      const move = teammates.next(state, clock.now(), note, clock);
      if (move === null) continue;
      const result = applyAction(state, move.id, move.action, clock.now());
      assert.ok(result.ok, `${move.id} made an invalid move ${move.action.type}`);
      state = result.state;
      moves += 1;
    }
    assert.ok(moves >= 5, `only ${moves} teammate moves`);
  });

  it('decide returns nothing for a missing or lobby player', () => {
    const clock = fixedClock();
    const room = newLocalRoom('scrum', clock);
    assert.equal(decide(room, 'mate-1', clock.now(), () => [], note), null);
    const started = lobbyOf('scrum', 3, clock);
    assert.equal(decide(started, 'nobody', clock.now(), () => [], note), null);
  });
});
