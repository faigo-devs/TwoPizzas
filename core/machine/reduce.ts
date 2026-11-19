import { generateTeamName } from '../names.ts';
import { StateVersion } from '../state.ts';
import type { Action, CreateRoomInput, ReduceResult, RoomState, ServerAction, StampedClientAction } from '../types.ts';
import { deadline, pauseAction, playerConnected, playerDisconnected } from './connection.ts';
import { dailyEnd } from './daily.ts';
import { join, lobbyAction } from './lobby.ts';
import { phaseAdvance, phaseBegin } from './phases.ts';
import { settlePoker } from './scrum-plan.ts';
import { retroAction } from './retro.ts';
import { rulesFor } from './rules.ts';
import { summaryPublish } from './summary.ts';
import { findPlayer, type Refusal } from './util.ts';
import { trackWip, workAction } from './work.ts';

/**
 * Builds an empty room in the lobby; the seed stays in the state and never reaches a view.
 */
export function createRoom(input: CreateRoomInput): RoomState {
  return {
    version: StateVersion,
    code: input.code,
    framework: input.framework,
    secret: input.secret,
    nameSeed: input.nameSeed >>> 0,
    locked: false,
    rng: 0,
    createdAt: input.now,
    now: input.now,
    emptySince: input.now,
    players: [],
    hostId: null,
    facilitatorId: null,
    teamName: generateTeamName(input.nameSeed >>> 0, 0),
    nameAttempt: 0,
    phase: { kind: 'lobby' },
    items: [],
    nextItemNumber: 1,
    iterations: [],
    events: [],
    observations: [],
    observationsFrom: 0,
    published: false,
  };
}

function isServerAction(action: Action): action is ServerAction {
  return action.type.startsWith('server.');
}

function unhandled(_action: never): Refusal {
  return 'bad_request';
}

function dispatchServer(s: RoomState, action: ServerAction): Refusal {
  switch (action.type) {
    case 'server.join':
      return join(s, action);
    case 'server.deadline':
      return deadline(s);
    case 'server.connected':
      return playerConnected(s, action);
    case 'server.disconnected':
      return playerDisconnected(s, action);
    default:
      return unhandled(action);
  }
}

function dispatchPlayer(s: RoomState, action: StampedClientAction): Refusal {
  const player = findPlayer(s, action.playerId);
  if (player === undefined) return 'not_allowed';
  if (player.pausedUntil !== null && action.type !== 'player.pause') player.pausedUntil = null;
  const rules = rulesFor(s);
  switch (action.type) {
    case 'player.pause':
    case 'player.resume':
      return pauseAction(s, action, player);
    case 'lobby.set_name':
    case 'lobby.volunteer':
    case 'lobby.new_team_name':
    case 'lobby.start':
    case 'lobby.kick':
    case 'lobby.lock':
      return lobbyAction(s, action, player);
    case 'phase.begin':
      return phaseBegin(s, player);
    case 'phase.advance':
      return phaseAdvance(s, player);
    case 'plan.goal_vote':
    case 'plan.goal_confirm':
    case 'plan.poker_vote':
    case 'plan.poker_reveal':
    case 'plan.poker_revote':
    case 'plan.poker_record':
    case 'plan.estimation_stop':
    case 'plan.pull':
    case 'plan.unpull':
    case 'plan.set_limits':
      return rules.planAction(s, action, player);
    case 'item.take':
    case 'item.leave':
    case 'item.open':
    case 'item.close':
    case 'work.end_early':
    case 'item.submit':
    case 'item.take_review':
    case 'item.verdict':
    case 'help.promise':
    case 'help.withdraw':
      return workAction(s, action, player);
    case 'daily.end':
      return dailyEnd(s, player);
    case 'inspect.reveal':
      return rules.inspectReveal(s, player);
    case 'retro.note_add':
    case 'retro.note_edit':
    case 'retro.note_remove':
    case 'retro.reveal':
    case 'retro.vote':
    case 'retro.unvote':
    case 'retro.choose_action':
    case 'retro.help_start':
    case 'retro.help_answer':
    case 'retro.help_use':
      return retroAction(s, action, player);
    case 'summary.publish':
      return summaryPublish(s, player);
    default:
      return unhandled(action);
  }
}

function dispatch(s: RoomState, action: Action): Refusal {
  return isServerAction(action) ? dispatchServer(s, action) : dispatchPlayer(s, action);
}

/**
 * Applies one action to a copy of the state; a refused action leaves the original untouched.
 */
export function reduce(state: RoomState, action: Action): ReduceResult {
  const next: RoomState = JSON.parse(JSON.stringify(state));
  next.now = Math.max(next.now, action.now);
  const refusal = dispatch(next, action);
  if (refusal !== null) return { ok: false, code: refusal };
  settlePoker(next);
  trackWip(next);
  return { ok: true, state: next };
}
