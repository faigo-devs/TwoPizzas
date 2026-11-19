import { config } from './config.ts';
import { parseResponse } from './tasks/index.ts';
import type { Agreement, Card, ClientAction, ClientActionType, ClientMessage, PuzzleKind, RetroColumn, Theme, Verdict, WorkMode } from './types.ts';

type Shape = Record<string, unknown>;

const RoomCodePattern = new RegExp(`^[${config.room.codeLetters}]{${config.room.codeLength}}$`);
const PlayerIdPattern = /^[A-Za-z0-9_-]{1,64}$/;
const TokenPattern = /^[A-Za-z0-9_-]{1,128}$/;
const ItemIdPattern = /^#[0-9]{1,4}$/;
const NoteIdPattern = /^n[0-9]{1,5}$/;
const KeyPattern = /^[a-z][a-z0-9_.]{0,39}$/;
const NameWireMax = 64;
const TextWireMax = 400;
const Kinds: readonly PuzzleKind[] = ['review', 'order', 'incident', 'merge'];
const Modes: readonly WorkMode[] = ['work', 'review'];
const Verdicts: readonly Verdict[] = ['lgtm', 'changes'];

/**
 * Whether a text has the shape of a room code: the game's alphabet and length.
 */
export function isRoomCode(value: unknown): value is string {
  return typeof value === 'string' && RoomCodePattern.test(value);
}

function isShape(value: unknown): value is Shape {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasKeys(value: Shape, required: readonly string[], optional: readonly string[] = []): boolean {
  const keys = Object.keys(value);
  return required.every((key) => Object.hasOwn(value, key)) && keys.every((key) => required.includes(key) || optional.includes(key));
}

function isText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max;
}

function isPattern(value: unknown, pattern: RegExp): value is string {
  return typeof value === 'string' && pattern.test(value);
}

function isSmallInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1_000_000;
}

function isCard(value: unknown): value is Card {
  return typeof value === 'number' && (config.poker.cards as readonly number[]).includes(value);
}

function isMinutes(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= config.pause.minMinutes &&
    value <= config.pause.maxMinutes
  );
}

function oneOf<T extends string>(value: unknown, list: readonly T[]): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

function parseAgreement(raw: unknown): Agreement | null {
  if (!isShape(raw)) return null;
  const type = raw.type;
  if (type === 'wip_limit') return hasKeys(raw, ['type', 'max']) && isSmallInt(raw.max) ? { type, max: raw.max } : null;
  if (type === 'review_wait') {
    return hasKeys(raw, ['type', 'maxMs']) && isSmallInt(raw.maxMs) ? { type, maxMs: raw.maxMs } : null;
  }
  if (type === 'no_new_while_blocked' || type === 'pair_first' || type === 'wip_limits_set') {
    return hasKeys(raw, ['type']) ? { type } : null;
  }
  if (type === 'free') return hasKeys(raw, ['type', 'text']) && isText(raw.text, TextWireMax) ? { type, text: raw.text } : null;
  return null;
}

function parseLimit(value: unknown): number | null | undefined {
  if (value === null) return null;
  return isSmallInt(value) ? value : undefined;
}

function itemAction<T extends string>(raw: Shape, type: T): { type: T; itemId: string } | null {
  return hasKeys(raw, ['type', 'itemId']) && isPattern(raw.itemId, ItemIdPattern) ? { type, itemId: raw.itemId } : null;
}

function noteAction<T extends string>(raw: Shape, type: T): { type: T; noteId: string } | null {
  return hasKeys(raw, ['type', 'noteId']) && isPattern(raw.noteId, NoteIdPattern) ? { type, noteId: raw.noteId } : null;
}

function bare<T extends ClientAction['type']>(raw: Shape, type: T): { type: T } | null {
  return hasKeys(raw, ['type']) ? { type } : null;
}

type ActionParsers = { [T in ClientActionType]: (raw: Shape) => Extract<ClientAction, { type: T }> | null };

const ActionParsers: ActionParsers = {
  'lobby.set_name': (raw) => (hasKeys(raw, ['type', 'name']) && isText(raw.name, NameWireMax) ? { type: 'lobby.set_name', name: raw.name } : null),
  'lobby.volunteer': (raw) =>
    hasKeys(raw, ['type', 'volunteer']) && typeof raw.volunteer === 'boolean' ? { type: 'lobby.volunteer', volunteer: raw.volunteer } : null,
  'lobby.new_team_name': (raw) => bare(raw, 'lobby.new_team_name'),
  'lobby.start': (raw) => bare(raw, 'lobby.start'),
  'lobby.kick': (raw) =>
    hasKeys(raw, ['type', 'targetId']) && isPattern(raw.targetId, PlayerIdPattern) ? { type: 'lobby.kick', targetId: raw.targetId } : null,
  'lobby.lock': (raw) =>
    hasKeys(raw, ['type', 'locked']) && typeof raw.locked === 'boolean' ? { type: 'lobby.lock', locked: raw.locked } : null,
  'player.pause': (raw) =>
    hasKeys(raw, ['type', 'minutes']) && isMinutes(raw.minutes) ? { type: 'player.pause', minutes: raw.minutes } : null,
  'player.resume': (raw) => bare(raw, 'player.resume'),
  'phase.begin': (raw) => bare(raw, 'phase.begin'),
  'phase.advance': (raw) => bare(raw, 'phase.advance'),
  'plan.goal_vote': (raw) =>
    hasKeys(raw, ['type', 'theme']) && oneOf<Theme>(raw.theme, config.backlog.themes) ? { type: 'plan.goal_vote', theme: raw.theme } : null,
  'plan.goal_confirm': (raw) => bare(raw, 'plan.goal_confirm'),
  'plan.poker_vote': (raw) => (hasKeys(raw, ['type', 'card']) && isCard(raw.card) ? { type: 'plan.poker_vote', card: raw.card } : null),
  'plan.poker_reveal': (raw) => bare(raw, 'plan.poker_reveal'),
  'plan.poker_revote': (raw) => bare(raw, 'plan.poker_revote'),
  'plan.poker_record': (raw) => {
    if (!hasKeys(raw, ['type', 'estimate'])) return null;
    if (raw.estimate === null) return { type: 'plan.poker_record', estimate: null };
    return isCard(raw.estimate) ? { type: 'plan.poker_record', estimate: raw.estimate } : null;
  },
  'plan.estimation_stop': (raw) => bare(raw, 'plan.estimation_stop'),
  'plan.pull': (raw) => itemAction(raw, 'plan.pull'),
  'plan.unpull': (raw) => itemAction(raw, 'plan.unpull'),
  'plan.set_limits': (raw) => {
    if (!hasKeys(raw, ['type', 'inProgress', 'review'])) return null;
    const inProgress = parseLimit(raw.inProgress);
    const review = parseLimit(raw.review);
    return inProgress === undefined || review === undefined ? null : { type: 'plan.set_limits', inProgress, review };
  },
  'item.take': (raw) => itemAction(raw, 'item.take'),
  'item.leave': (raw) => itemAction(raw, 'item.leave'),
  'item.open': (raw) =>
    hasKeys(raw, ['type', 'itemId', 'mode']) && isPattern(raw.itemId, ItemIdPattern) && oneOf<WorkMode>(raw.mode, Modes)
      ? { type: 'item.open', itemId: raw.itemId, mode: raw.mode }
      : null,
  'item.close': (raw) => bare(raw, 'item.close'),
  'work.end_early': (raw) => bare(raw, 'work.end_early'),
  'item.submit': (raw) => {
    if (!hasKeys(raw, ['type', 'itemId', 'response']) || !isPattern(raw.itemId, ItemIdPattern)) return null;
    const body = raw.response;
    if (!isShape(body) || !oneOf<PuzzleKind>(body.kind, Kinds)) return null;
    const response = parseResponse(body.kind, body);
    return response === null ? null : { type: 'item.submit', itemId: raw.itemId, response };
  },
  'item.take_review': (raw) => itemAction(raw, 'item.take_review'),
  'item.verdict': (raw) =>
    hasKeys(raw, ['type', 'itemId', 'verdict']) && isPattern(raw.itemId, ItemIdPattern) && oneOf<Verdict>(raw.verdict, Verdicts)
      ? { type: 'item.verdict', itemId: raw.itemId, verdict: raw.verdict }
      : null,
  'help.promise': (raw) => itemAction(raw, 'help.promise'),
  'help.withdraw': (raw) => itemAction(raw, 'help.withdraw'),
  'daily.end': (raw) => bare(raw, 'daily.end'),
  'inspect.reveal': (raw) => bare(raw, 'inspect.reveal'),
  'retro.note_add': (raw) =>
    hasKeys(raw, ['type', 'column', 'text']) && oneOf<RetroColumn>(raw.column, config.retro.columns) && isText(raw.text, TextWireMax)
      ? { type: 'retro.note_add', column: raw.column, text: raw.text }
      : null,
  'retro.note_edit': (raw) =>
    hasKeys(raw, ['type', 'noteId', 'text']) && isPattern(raw.noteId, NoteIdPattern) && isText(raw.text, TextWireMax)
      ? { type: 'retro.note_edit', noteId: raw.noteId, text: raw.text }
      : null,
  'retro.note_remove': (raw) => noteAction(raw, 'retro.note_remove'),
  'retro.reveal': (raw) => bare(raw, 'retro.reveal'),
  'retro.vote': (raw) => noteAction(raw, 'retro.vote'),
  'retro.unvote': (raw) => noteAction(raw, 'retro.unvote'),
  'retro.choose_action': (raw) => {
    if (!hasKeys(raw, ['type', 'agreement'])) return null;
    const agreement = parseAgreement(raw.agreement);
    return agreement === null ? null : { type: 'retro.choose_action', agreement };
  },
  'retro.help_start': (raw) => bare(raw, 'retro.help_start'),
  'retro.help_answer': (raw) =>
    hasKeys(raw, ['type', 'questionId', 'choice']) && isPattern(raw.questionId, KeyPattern) && isPattern(raw.choice, KeyPattern)
      ? { type: 'retro.help_answer', questionId: raw.questionId, choice: raw.choice }
      : null,
  'retro.help_use': (raw) =>
    hasKeys(raw, ['type', 'proposalId']) && isPattern(raw.proposalId, KeyPattern)
      ? { type: 'retro.help_use', proposalId: raw.proposalId }
      : null,
  'summary.publish': (raw) => bare(raw, 'summary.publish'),
};

/**
 * Every client action type the wire accepts, taken from the parser table so the two cannot drift apart.
 */
export const clientActionTypes = Object.keys(ActionParsers) as ClientActionType[];

function parseAction(raw: unknown): ClientAction | null {
  if (!isShape(raw) || typeof raw.type !== 'string' || !Object.hasOwn(ActionParsers, raw.type)) return null;
  const parse = ActionParsers[raw.type as ClientActionType] as (shape: Shape) => ClientAction | null;
  return parse(raw);
}

const SeatProtocolPattern = /^seat\.([A-Za-z0-9_-]{1,64})\.([A-Za-z0-9_-]{1,128})$/;

/**
 * The WebSocket subprotocols a browser offers: the game's fixed name, plus an entry that carries the seat when it holds one.
 */
export function offeredProtocols(seat: { playerId: string; token: string } | null): string[] {
  return seat === null ? [config.room.protocol] : [config.room.protocol, `${config.room.seatPrefix}${seat.playerId}.${seat.token}`];
}

/**
 * Reads the Sec-WebSocket-Protocol header of an upgrade: whether it offers the game's name and the seat it carries, if any.
 */
export function parseProtocols(header: string | null): { game: boolean; seat: { playerId: string; token: string } | null } {
  if (header === null) return { game: false, seat: null };
  const names = header.split(',').map((part) => part.trim());
  let seat: { playerId: string; token: string } | null = null;
  for (const name of names) {
    const match = SeatProtocolPattern.exec(name);
    if (match !== null) {
      seat = { playerId: match[1] as string, token: match[2] as string };
      break;
    }
  }
  return { game: names.includes(config.room.protocol), seat };
}

/**
 * Parses an untrusted text from a browser into a typed message, or null when it is oversized, malformed or has any unknown key.
 */
export function parseClientMessage(text: unknown): ClientMessage | null {
  if (typeof text !== 'string') return null;
  if (text.length > config.room.messageBytesMax) return null;
  if (new TextEncoder().encode(text).length > config.room.messageBytesMax) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isShape(raw)) return null;
  if (raw.t === 'hello') {
    if (!hasKeys(raw, ['t'], ['playerId', 'token', 'name'])) return null;
    const message: { t: 'hello'; playerId?: string; token?: string; name?: string } = { t: 'hello' };
    if (raw.playerId !== undefined) {
      if (!isPattern(raw.playerId, PlayerIdPattern)) return null;
      message.playerId = raw.playerId;
    }
    if (raw.token !== undefined) {
      if (!isPattern(raw.token, TokenPattern)) return null;
      message.token = raw.token;
    }
    if (raw.name !== undefined) {
      if (!isText(raw.name, NameWireMax)) return null;
      message.name = raw.name;
    }
    return message;
  }
  if (raw.t === 'do') {
    if (!hasKeys(raw, ['t', 'action'])) return null;
    const action = parseAction(raw.action);
    return action === null ? null : { t: 'do', action };
  }
  return null;
}
