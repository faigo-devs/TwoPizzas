import { config } from '../config.ts';
import type { Player, PlayerId, RoomState, ServerAction, StampedClientAction } from '../types.ts';
import { pendingArrival } from './flow.ts';
import { rulesFor } from './rules.ts';
import { dropFromLobby } from './lobby.ts';
import { endWorkHalf } from './transitions.ts';
import { releaseAll } from './work.ts';
import { connectedPlayers, currentIteration, findPlayer, nextConnectedAfter, type Refusal } from './util.ts';

function refreshEmpty(s: RoomState): void {
  s.emptySince = connectedPlayers(s).length === 0 ? (s.emptySince ?? s.now) : null;
}

export function playerConnected(s: RoomState, action: Extract<ServerAction, { type: 'server.connected' }>): Refusal {
  const player = findPlayer(s, action.playerId);
  if (player === undefined) return 'not_allowed';
  player.connected = true;
  player.disconnectedAt = null;
  player.pausedUntil = null;
  refreshEmpty(s);
  return null;
}

export function playerDisconnected(
  s: RoomState,
  action: Extract<ServerAction, { type: 'server.disconnected' }>,
): Refusal {
  const player = findPlayer(s, action.playerId);
  if (player === undefined) return 'not_allowed';
  if (player.connected) {
    player.connected = false;
    player.disconnectedAt = s.now;
  }
  refreshEmpty(s);
  return null;
}

function graceBase(player: Player): number | null {
  if (player.disconnectedAt === null) return null;
  return player.pausedUntil === null ? player.disconnectedAt : Math.max(player.disconnectedAt, player.pausedUntil);
}

/**
 * Handles a player's own pause and resume; a pause is allowed once the game has started and until the summary.
 */
export function pauseAction(s: RoomState, action: StampedClientAction, player: Player): Refusal {
  if (s.phase.kind === 'lobby' || s.phase.kind === 'summary') return 'not_allowed';
  if (action.type === 'player.resume') {
    player.pausedUntil = null;
    return null;
  }
  if (action.type !== 'player.pause') return 'bad_request';
  const { minMinutes, maxMinutes } = config.pause;
  if (!Number.isInteger(action.minutes) || action.minutes < minMinutes || action.minutes > maxMinutes) return 'bad_request';
  player.pausedUntil = s.now + action.minutes * 60_000;
  return null;
}

function endPauses(s: RoomState): void {
  for (const player of s.players) {
    if (player.pausedUntil === null || s.now < player.pausedUntil) continue;
    if (player.disconnectedAt !== null) player.disconnectedAt = Math.max(player.disconnectedAt, player.pausedUntil);
    player.pausedUntil = null;
  }
}

function holdsSomething(s: RoomState, id: PlayerId): boolean {
  const player = findPlayer(s, id);
  if (player === undefined) return false;
  if (player.open !== null) return true;
  return s.items.some(
    (item) =>
      item.helpPromisedBy === id ||
      (item.status === 'doing' && (item.workers.includes(id) || item.dependencyHolder === id)) ||
      (item.status === 'review' && item.reviewer === id),
  );
}

function roleHeld(s: RoomState, id: PlayerId): boolean {
  return s.hostId === id || (s.phase.kind !== 'lobby' && s.facilitatorId === id);
}

/**
 * The moment after which an away player's seat is given up, or null when nothing is left to release.
 */
function leaveTime(s: RoomState, id: PlayerId): number | null {
  const player = findPlayer(s, id);
  if (player === undefined || player.connected) return null;
  const base = graceBase(player);
  if (base === null) return null;
  const pending = s.phase.kind === 'lobby' || holdsSomething(s, id) || roleHeld(s, id);
  return pending ? base + config.room.reconnectGraceMs : null;
}

/**
 * The next moment the server must call the machine: a hard end, a request arriving, a context switch that passes, or a release.
 */
export function nextDeadline(s: RoomState): number | null {
  const times: number[] = [];
  const phase = s.phase;
  if (phase.kind === 'work' && phase.step === 'running' && phase.timebox.hard && phase.timebox.deadline !== null) {
    times.push(phase.timebox.deadline);
  }
  const arrival = pendingArrival(s);
  if (arrival !== null) times.push(arrival);
  for (const player of s.players) {
    if (player.open !== null) times.push(player.open.readyAt);
    if (player.pausedUntil !== null) times.push(player.pausedUntil);
    const leave = leaveTime(s, player.id);
    if (leave !== null) times.push(leave);
  }
  const future = times.filter((time) => time > s.now);
  return future.length === 0 ? null : Math.min(...future);
}

function passRoles(s: RoomState): void {
  const host = s.hostId === null ? undefined : findPlayer(s, s.hostId);
  if (host !== undefined && !host.connected && leaveTime(s, host.id) !== null && s.now >= (leaveTime(s, host.id) ?? 0)) {
    const next = nextConnectedAfter(s, host.id);
    if (next !== undefined) s.hostId = next.id;
  }
  const fac = s.facilitatorId === null ? undefined : findPlayer(s, s.facilitatorId);
  if (fac !== undefined && !fac.connected && graceBase(fac) !== null) {
    if (s.now >= (graceBase(fac) ?? 0) + config.room.reconnectGraceMs) {
      const next = nextConnectedAfter(s, fac.id);
      if (next !== undefined) {
        s.facilitatorId = next.id;
        if (s.iterations.length > 0) currentIteration(s).facilitatorId = next.id;
      }
    }
  }
}

/**
 * Processes everything that is due at the action's time; calling it when nothing is due changes nothing.
 */
export function deadline(s: RoomState): Refusal {
  endPauses(s);
  const phase = s.phase;
  if (phase.kind === 'work' && phase.step === 'running') {
    rulesFor(s).onWorkTick(s, Math.min(s.now, phase.timebox.deadline ?? s.now));
  }
  if (phase.kind === 'work' && phase.step === 'running' && phase.timebox.hard) {
    if (phase.timebox.deadline !== null && s.now >= phase.timebox.deadline) endWorkHalf(s);
  }
  for (const player of [...s.players]) {
    const leave = leaveTime(s, player.id);
    if (leave === null || s.now < leave) continue;
    if (s.phase.kind === 'lobby') {
      dropFromLobby(s, player);
      continue;
    }
    releaseAll(s, player.id);
  }
  passRoles(s);
  return null;
}
