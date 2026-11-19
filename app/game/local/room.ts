import { machine } from '../../../core/index.ts';
import type { Action, ClientAction, ErrorCode, Framework, PlayerId, PlayerView, RoomState } from '../../../core/index.ts';
import type { Key } from '../../i18n/index.ts';
import { decide, delayFor } from './bots.ts';

export const HumanId: PlayerId = 'you';
const BotIds: readonly PlayerId[] = ['mate-1', 'mate-2', 'mate-3'];
const RoomCode = 'LOCAL';
const SkipTickMs = 1000;

export interface LocalClock {
  now(): number;
  advance(ms: number): void;
}

export type Applied = { ok: true; state: RoomState } | { ok: false; code: ErrorCode };

export function createLocalClock(): LocalClock {
  let skew = 0;
  return {
    now: () => Date.now() + skew,
    advance(ms: number) {
      skew += ms;
    },
  };
}

export function newLocalRoom(framework: Framework, clock: LocalClock): RoomState {
  const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const nameSeed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  let state = machine.createRoom({ code: RoomCode, framework, secret, nameSeed, now: clock.now() });
  for (const id of [HumanId, ...BotIds]) {
    const joined = machine.reduce(state, { type: 'server.join', playerId: id, name: null, now: clock.now() });
    if (joined.ok) state = joined.state;
  }
  return state;
}

export function applyAction(state: RoomState, playerId: PlayerId, action: ClientAction, now: number): Applied {
  const result = machine.reduce(state, { ...action, playerId, now });
  return result.ok ? { ok: true, state: result.state } : { ok: false, code: result.code };
}

export function applyServer(state: RoomState, action: Extract<Action, { type: `server.${string}` }>): Applied {
  const result = machine.reduce(state, action);
  return result.ok ? { ok: true, state: result.state } : { ok: false, code: result.code };
}

export function viewOf(state: RoomState, clock: LocalClock): PlayerView {
  return machine.viewFor(state, HumanId, clock.now());
}

export function phaseLabel(state: RoomState): string {
  const phase = state.phase;
  if (phase.kind === 'lobby' || phase.kind === 'summary') return phase.kind;
  return `${phase.kind}:${phase.iteration}:${phase.kind === 'work' ? phase.half : 0}:${phase.step}`;
}

function eventLabel(state: RoomState): string {
  const phase = state.phase;
  if (phase.kind === 'lobby' || phase.kind === 'summary') return phase.kind;
  return `${phase.kind}:${phase.iteration}:${phase.kind === 'work' ? phase.half : 0}`;
}

function suggestionsFor(state: RoomState, id: PlayerId, clock: LocalClock): () => readonly string[] {
  return () => machine.viewFor(state, id, clock.now()).retro?.suggestedAgreements ?? [];
}

/**
 * Plays the rest of the current event for the whole team, the human seat included, and stops on the next card.
 */
export function skipEvent(start: RoomState, clock: LocalClock, note: (key: Key) => string): RoomState {
  let state = start;
  const from = eventLabel(state);
  const take = (result: Applied): boolean => {
    if (result.ok) state = result.state;
    return result.ok;
  };
  for (let guard = 0; guard < 1200 && eventLabel(state) === from; guard += 1) {
    const phase = state.phase;
    if (phase.kind === 'lobby' || phase.kind === 'summary') break;
    if (phase.kind === 'work' && phase.step === 'running') {
      const deadline = phase.timebox.deadline ?? clock.now();
      clock.advance(Math.min(SkipTickMs, Math.max(0, deadline - clock.now()) + 50));
      take(applyServer(state, { type: 'server.deadline', now: clock.now() }));
      for (const player of state.players) {
        if (eventLabel(state) !== from) break;
        const decision = decide(state, player.id, clock.now(), suggestionsFor(state, player.id, clock), note);
        if (decision !== null) take(applyAction(state, player.id, decision.action, clock.now()));
      }
      continue;
    }
    if (phase.kind === 'daily' && phase.step === 'walk') {
      const first = state.players[0];
      if (first === undefined || !take(applyAction(state, first.id, { type: 'daily.end' }, clock.now()))) break;
      continue;
    }
    let acted = false;
    for (const player of state.players) {
      if (eventLabel(state) !== from) break;
      const decision = decide(state, player.id, clock.now(), suggestionsFor(state, player.id, clock), note);
      if (decision !== null && take(applyAction(state, player.id, decision.action, clock.now()))) acted = true;
    }
    if (!acted) break;
  }
  return state;
}

export interface Teammates {
  next(state: RoomState, now: number, note: (key: Key) => string, clock: LocalClock): { id: PlayerId; action: ClientAction } | null;
}

/**
 * Keeps the pace of the scripted teammates: each one thinks for a while before every move, never all at once.
 */
export function createTeammates(): Teammates {
  const waiting = new Map<PlayerId, { key: string; at: number }>();
  return {
    next(state, now, note, clock) {
      const order = [...BotIds].sort(() => Math.random() - 0.5);
      for (const id of order) {
        const decision = decide(state, id, now, suggestionsFor(state, id, clock), note);
        if (decision === null) {
          waiting.delete(id);
          continue;
        }
        const key = JSON.stringify(decision.action);
        const pending = waiting.get(id);
        if (pending === undefined || pending.key !== key) {
          waiting.set(id, { key, at: now + delayFor(decision.pace) });
          continue;
        }
        if (pending.at > now) continue;
        waiting.delete(id);
        return { id, action: decision.action };
      }
      return null;
    },
  };
}
