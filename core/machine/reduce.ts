import { generateTeamName } from '../names.ts';
import { mixSeed } from '../rng.ts';
import type { Action, CreateRoomInput, ReduceResult, RoomState } from '../types.ts';
import { deadline, playerConnected, playerDisconnected } from './connection.ts';
import { dailyEnd } from './daily.ts';
import { join, lobbyAction } from './lobby.ts';
import { phaseAdvance, phaseBegin } from './phases.ts';
import { settlePoker } from './plan.ts';
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
    version: 1,
    code: input.code,
    framework: input.framework,
    seed: input.seed >>> 0,
    rng: mixSeed(input.seed, 'machine'),
    createdAt: input.now,
    now: input.now,
    emptySince: input.now,
    players: [],
    hostId: null,
    facilitatorId: null,
    teamName: generateTeamName(input.seed, 0),
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

function dispatch(s: RoomState, action: Action): Refusal {
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
      break;
  }
  const player = findPlayer(s, action.playerId);
  if (player === undefined) return 'not_allowed';
  const rules = rulesFor(s);
  switch (action.type) {
    case 'lobby.set_name':
    case 'lobby.volunteer':
    case 'lobby.new_team_name':
    case 'lobby.start':
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
      return 'bad_request';
  }
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
