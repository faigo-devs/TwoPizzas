import type {
  PlayerId,
  ItemId,
  RoomCode,
  NoteId,
  Framework,
  Theme,
  Card,
  RetroColumn,
  Verdict,
  WorkMode,
  PuzzleResponse,
  Agreement,
  RoomState,
} from './state.ts';
import type { PlayerView } from './views.ts';
import type { ErrorCode } from './errors.ts';

/**
 * Every intent a player can send; the server stamps it with the player and the time before the machine sees it.
 */
export type ClientAction =
  | { type: 'lobby.set_name'; name: string }
  | { type: 'lobby.volunteer'; volunteer: boolean }
  | { type: 'lobby.new_team_name' }
  | { type: 'lobby.start' }
  | { type: 'lobby.kick'; targetId: PlayerId }
  | { type: 'lobby.lock'; locked: boolean }
  | { type: 'player.pause'; minutes: number }
  | { type: 'player.resume' }
  | { type: 'phase.begin' }
  | { type: 'phase.advance' }
  | { type: 'plan.goal_vote'; theme: Theme }
  | { type: 'plan.goal_confirm' }
  | { type: 'plan.poker_vote'; card: Card }
  | { type: 'plan.poker_reveal' }
  | { type: 'plan.poker_revote' }
  | { type: 'plan.poker_record'; estimate: Card | null }
  | { type: 'plan.estimation_stop' }
  | { type: 'plan.pull'; itemId: ItemId }
  | { type: 'plan.unpull'; itemId: ItemId }
  | { type: 'plan.set_limits'; inProgress: number | null; review: number | null }
  | { type: 'item.take'; itemId: ItemId }
  | { type: 'item.leave'; itemId: ItemId }
  | { type: 'item.open'; itemId: ItemId; mode: WorkMode }
  | { type: 'item.close' }
  | { type: 'work.end_early' }
  | { type: 'item.submit'; itemId: ItemId; response: PuzzleResponse }
  | { type: 'item.take_review'; itemId: ItemId }
  | { type: 'item.verdict'; itemId: ItemId; verdict: Verdict }
  | { type: 'help.promise'; itemId: ItemId }
  | { type: 'help.withdraw'; itemId: ItemId }
  | { type: 'daily.end' }
  | { type: 'inspect.reveal' }
  | { type: 'retro.note_add'; column: RetroColumn; text: string }
  | { type: 'retro.note_edit'; noteId: NoteId; text: string }
  | { type: 'retro.note_remove'; noteId: NoteId }
  | { type: 'retro.reveal' }
  | { type: 'retro.vote'; noteId: NoteId }
  | { type: 'retro.unvote'; noteId: NoteId }
  | { type: 'retro.choose_action'; agreement: Agreement }
  | { type: 'retro.help_start' }
  | { type: 'retro.help_answer'; questionId: string; choice: string }
  | { type: 'retro.help_use'; proposalId: string }
  | { type: 'summary.publish' };

export type ClientActionType = ClientAction['type'];

export interface Stamp {
  playerId: PlayerId;
  now: number;
}

export type StampedClientAction = ClientAction & Stamp;

/**
 * Actions only the server raises; a client may never send a type that starts with server.
 */
export type ServerAction =
  | { type: 'server.join'; playerId: PlayerId; name: string | null; now: number }
  | { type: 'server.deadline'; now: number }
  | { type: 'server.connected'; playerId: PlayerId; now: number }
  | { type: 'server.disconnected'; playerId: PlayerId; now: number };

/**
 * Anything the machine reduces: a stamped client action or a server action.
 */
export type Action = StampedClientAction | ServerAction;

/**
 * A message from the browser to the room.
 */
export type ClientMessage =
  | { t: 'hello'; playerId?: string; token?: string; name?: string }
  | { t: 'do'; action: ClientAction };

/**
 * A message from the room to the browser.
 */
export type ServerMessage =
  | { t: 'welcome'; playerId: PlayerId; token?: string }
  | { t: 'view'; view: PlayerView }
  | { t: 'error'; code: ErrorCode };

export interface CreateRoomRequest {
  framework: Framework;
}

export interface CreateRoomResponse {
  code: RoomCode;
}

export interface CreateRoomInput {
  code: RoomCode;
  framework: Framework;
  secret: string;
  nameSeed: number;
  now: number;
}

export type ReduceResult = { ok: true; state: RoomState } | { ok: false; code: ErrorCode };

/**
 * The state machine API; every function is pure.
 */
export interface Machine {
  createRoom(input: CreateRoomInput): RoomState;
  reduce(state: RoomState, action: Action): ReduceResult;
  viewFor(state: RoomState, playerId: PlayerId, now: number): PlayerView;
  nextDeadline(state: RoomState): number | null;
}
