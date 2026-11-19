import { config } from '../config.ts';
import { generateTeamName } from '../names.ts';
import type { Player, RoomState, ServerAction, StampedClientAction } from '../types.ts';
import { summaryNewTeamName } from './summary.ts';
import { startIteration } from './transitions.ts';
import { rulesFor } from './rules.ts';
import { connectedPlayers, sanitize, type Refusal } from './util.ts';

function lobbyFacilitator(s: RoomState): void {
  const volunteer = [...s.players].sort((a, b) => a.seat - b.seat).find((player) => player.volunteer);
  s.facilitatorId = volunteer?.id ?? s.hostId;
}

function cleanName(name: string | null): string | null {
  if (name === null) return null;
  const clean = sanitize(name, config.players.nameMax);
  return clean.length > 0 ? clean : null;
}

/**
 * Seats a new player in the lobby; the first one is the host.
 */
export function join(s: RoomState, action: Extract<ServerAction, { type: 'server.join' }>): Refusal {
  if (s.phase.kind !== 'lobby') return 'already_started';
  if (s.players.some((player) => player.id === action.playerId)) return 'bad_request';
  if (s.locked) return 'room_locked';
  if (s.players.length >= config.players.max) return 'room_full';
  const seat = s.players.reduce((max, player) => Math.max(max, player.seat), 0) + 1;
  s.players.push({
    id: action.playerId,
    seat,
    name: cleanName(action.name),
    connected: true,
    disconnectedAt: null,
    pausedUntil: null,
    volunteer: false,
    open: null,
  });
  if (s.hostId === null) s.hostId = action.playerId;
  s.emptySince = null;
  lobbyFacilitator(s);
  return null;
}

/**
 * Removes a lobby player that stayed away past the grace period and hands the host role on.
 */
export function dropFromLobby(s: RoomState, player: Player): void {
  s.players = s.players.filter((own) => own.id !== player.id);
  if (s.hostId === player.id) {
    const next = [...connectedPlayers(s)].sort((a, b) => a.seat - b.seat)[0];
    s.hostId = next?.id ?? s.players[0]?.id ?? null;
  }
  lobbyFacilitator(s);
}

/**
 * Handles the lobby actions of a player.
 */
export function lobbyAction(s: RoomState, action: StampedClientAction, p: Player): Refusal {
  if (s.phase.kind === 'summary' && action.type === 'lobby.new_team_name') return summaryNewTeamName(s, p);
  if (s.phase.kind !== 'lobby') return action.type === 'lobby.start' ? 'already_started' : 'not_allowed';
  switch (action.type) {
    case 'lobby.set_name': {
      p.name = cleanName(action.name);
      return null;
    }
    case 'lobby.volunteer': {
      p.volunteer = action.volunteer;
      lobbyFacilitator(s);
      return null;
    }
    case 'lobby.new_team_name': {
      if (p.id !== s.hostId || s.nameAttempt + 1 >= config.names.attemptsMax) return 'not_allowed';
      s.nameAttempt += 1;
      s.teamName = generateTeamName(s.nameSeed, s.nameAttempt);
      return null;
    }
    case 'lobby.lock': {
      if (p.id !== s.hostId) return 'not_allowed';
      s.locked = action.locked;
      return null;
    }
    case 'lobby.kick': {
      if (p.id !== s.hostId || action.targetId === p.id) return 'not_allowed';
      const target = s.players.find((player) => player.id === action.targetId);
      if (target === undefined) return 'not_allowed';
      s.players = s.players.filter((player) => player.id !== target.id);
      lobbyFacilitator(s);
      return null;
    }
    case 'lobby.start': {
      if (p.id !== s.hostId) return 'not_allowed';
      if (connectedPlayers(s).length < config.players.min) return 'not_allowed';
      const refusal = rulesFor(s).start(s);
      if (refusal !== null) return refusal;
      lobbyFacilitator(s);
      const named = s.players.find((player) => player.id === s.facilitatorId);
      if (named === undefined || !named.connected) s.facilitatorId = connectedPlayers(s)[0]?.id ?? s.hostId;
      startIteration(s, 1);
      return null;
    }
    default:
      return 'not_allowed';
  }
}
