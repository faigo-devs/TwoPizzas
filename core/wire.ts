import { config } from './config.ts';
import { parseResponse } from './tasks/index.ts';
import type { Agreement, ClientAction, ClientMessage, PuzzleKind, RetroColumn, Theme, Verdict, WorkMode } from './types.ts';

type Shape = Record<string, unknown>;

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

function bare<T extends ClientAction['type']>(raw: Shape, type: T): { type: T } | null {
  return hasKeys(raw, ['type']) ? { type } : null;
}

function parseAction(raw: unknown): ClientAction | null {
  if (!isShape(raw) || typeof raw.type !== 'string') return null;
  switch (raw.type) {
    case 'lobby.set_name':
      return hasKeys(raw, ['type', 'name']) && isText(raw.name, NameWireMax) ? { type: raw.type, name: raw.name } : null;
    case 'lobby.volunteer':
      return hasKeys(raw, ['type', 'volunteer']) && typeof raw.volunteer === 'boolean'
        ? { type: raw.type, volunteer: raw.volunteer }
        : null;
    case 'lobby.new_team_name':
    case 'lobby.start':
    case 'phase.begin':
    case 'phase.advance':
    case 'plan.goal_confirm':
    case 'plan.poker_reveal':
    case 'plan.poker_revote':
    case 'plan.estimation_stop':
    case 'item.close':
    case 'daily.end':
    case 'inspect.reveal':
    case 'retro.reveal':
    case 'retro.help_start':
    case 'summary.publish':
      return bare(raw, raw.type);
    case 'plan.goal_vote':
      return hasKeys(raw, ['type', 'theme']) && oneOf<Theme>(raw.theme, config.backlog.themes)
        ? { type: raw.type, theme: raw.theme }
        : null;
    case 'plan.poker_vote':
      return hasKeys(raw, ['type', 'card']) && typeof raw.card === 'number' && (config.poker.cards as readonly number[]).includes(raw.card)
        ? { type: raw.type, card: raw.card as 1 | 2 | 3 | 5 | 8 | 13 }
        : null;
    case 'plan.poker_record': {
      if (!hasKeys(raw, ['type', 'estimate'])) return null;
      if (raw.estimate === null) return { type: raw.type, estimate: null };
      return typeof raw.estimate === 'number' && (config.poker.cards as readonly number[]).includes(raw.estimate)
        ? { type: raw.type, estimate: raw.estimate as 1 | 2 | 3 | 5 | 8 | 13 }
        : null;
    }
    case 'plan.pull':
    case 'plan.unpull':
    case 'item.take':
    case 'item.leave':
    case 'item.take_review':
    case 'help.promise':
    case 'help.withdraw':
      return itemAction(raw, raw.type);
    case 'plan.set_limits': {
      if (!hasKeys(raw, ['type', 'inProgress', 'review'])) return null;
      const inProgress = parseLimit(raw.inProgress);
      const review = parseLimit(raw.review);
      return inProgress === undefined || review === undefined ? null : { type: raw.type, inProgress, review };
    }
    case 'item.open':
      return hasKeys(raw, ['type', 'itemId', 'mode']) && isPattern(raw.itemId, ItemIdPattern) && oneOf<WorkMode>(raw.mode, Modes)
        ? { type: raw.type, itemId: raw.itemId, mode: raw.mode }
        : null;
    case 'item.submit': {
      if (!hasKeys(raw, ['type', 'itemId', 'response']) || !isPattern(raw.itemId, ItemIdPattern)) return null;
      const body = raw.response;
      if (!isShape(body) || !oneOf<PuzzleKind>(body.kind, Kinds)) return null;
      const response = parseResponse(body.kind, body);
      return response === null ? null : { type: raw.type, itemId: raw.itemId, response };
    }
    case 'item.verdict':
      return hasKeys(raw, ['type', 'itemId', 'verdict']) && isPattern(raw.itemId, ItemIdPattern) && oneOf<Verdict>(raw.verdict, Verdicts)
        ? { type: raw.type, itemId: raw.itemId, verdict: raw.verdict }
        : null;
    case 'retro.note_add':
      return hasKeys(raw, ['type', 'column', 'text']) && oneOf<RetroColumn>(raw.column, config.retro.columns) && isText(raw.text, TextWireMax)
        ? { type: raw.type, column: raw.column, text: raw.text }
        : null;
    case 'retro.note_edit':
      return hasKeys(raw, ['type', 'noteId', 'text']) && isPattern(raw.noteId, NoteIdPattern) && isText(raw.text, TextWireMax)
        ? { type: raw.type, noteId: raw.noteId, text: raw.text }
        : null;
    case 'retro.note_remove':
    case 'retro.vote':
    case 'retro.unvote':
      return hasKeys(raw, ['type', 'noteId']) && isPattern(raw.noteId, NoteIdPattern)
        ? { type: raw.type, noteId: raw.noteId }
        : null;
    case 'retro.choose_action': {
      if (!hasKeys(raw, ['type', 'agreement'])) return null;
      const agreement = parseAgreement(raw.agreement);
      return agreement === null ? null : { type: raw.type, agreement };
    }
    case 'retro.help_answer':
      return hasKeys(raw, ['type', 'questionId', 'choice']) && isPattern(raw.questionId, KeyPattern) && isPattern(raw.choice, KeyPattern)
        ? { type: raw.type, questionId: raw.questionId, choice: raw.choice }
        : null;
    case 'retro.help_use':
      return hasKeys(raw, ['type', 'proposalId']) && isPattern(raw.proposalId, KeyPattern)
        ? { type: raw.type, proposalId: raw.proposalId }
        : null;
    default:
      return null;
  }
}

/**
 * Parses an untrusted text from a browser into a typed message, or null when it is oversized, malformed or has any unknown key.
 */
export function parseClientMessage(text: unknown): ClientMessage | null {
  if (typeof text !== 'string') return null;
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
