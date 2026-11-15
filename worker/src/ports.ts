import type { ErrorCode, Framework, LeaderboardEntry, LeaderboardResponse } from '../../core/index.ts';

export type LogFields = Record<string, string | number | boolean>;

export type Log = (event: string, fields?: LogFields) => void;

export type Random = (bytes: number) => Uint8Array;

/**
 * What a room keeps with each socket across hibernation.
 */
export interface SocketAttachment {
  conn: string;
  playerId: string | null;
  windowStart: number;
  count: number;
}

/**
 * One accepted WebSocket as the room logic sees it.
 */
export interface SocketPort {
  send(text: string): void;
  close(code: number, reason: string): void;
  readAttachment(): SocketAttachment | null;
  writeAttachment(value: SocketAttachment): void;
}

/**
 * The slice of Durable Object storage the room uses.
 */
export interface StoragePort {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  deleteAll(): Promise<void>;
  getAlarm(): Promise<number | null>;
  setAlarm(time: number): Promise<void>;
  deleteAlarm(): Promise<void>;
}

/**
 * The leaderboard as a room reaches it.
 */
export interface LeaderboardPort {
  submit(id: string, entry: LeaderboardEntry): Promise<boolean>;
}

export interface RoomDeps {
  storage: StoragePort;
  sockets: () => SocketPort[];
  now: () => number;
  random: Random;
  leaderboard: LeaderboardPort;
  log: Log;
}

/**
 * Synchronous SQL as the leaderboard uses it.
 */
export interface SqlPort {
  exec(query: string, ...bindings: (string | number | null)[]): { toArray(): Record<string, unknown>[] };
  transaction<T>(body: () => T): T;
}

export interface RoomsPort {
  create(code: string, framework: Framework): Promise<boolean>;
  connect(code: string, request: Request): Promise<Response>;
}

export interface BoardPort {
  top(): Promise<LeaderboardResponse>;
}

export interface LimiterPort {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

export interface HttpDeps {
  allowedOrigins: readonly string[];
  limiter: LimiterPort;
  rooms: RoomsPort;
  board: BoardPort;
  random: Random;
  log: Log;
}

export type ErrorBody = { code: ErrorCode };
