import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import type {
  ClientAction,
  ClientMessage,
  Framework,
  LeaderboardEntry,
  PlayerView,
  RoomState,
  ServerMessage,
} from '../../core/index.ts';
import type {
  LeaderboardPort,
  LogFields,
  Random,
  SocketAttachment,
  SocketPort,
  SqlPort,
  StoragePort,
} from '../src/ports.ts';
import { RoomHandler } from '../src/room.ts';
import { playGame } from '../../core/test/machine-support.ts';

export class FakeStorage implements StoragePort {
  data = new Map<string, unknown>();
  alarm: number | null = null;
  deletedAll = 0;

  async get<T>(key: string): Promise<T | undefined> {
    const value = this.data.get(key);
    return value === undefined ? undefined : (structuredClone(value) as T);
  }

  async put(key: string, value: unknown): Promise<void> {
    this.data.set(key, structuredClone(value));
  }

  async deleteAll(): Promise<void> {
    this.data.clear();
    this.alarm = null;
    this.deletedAll += 1;
  }

  async getAlarm(): Promise<number | null> {
    return this.alarm;
  }

  async setAlarm(time: number): Promise<void> {
    this.alarm = time;
  }

  async deleteAlarm(): Promise<void> {
    this.alarm = null;
  }

  state(): RoomState | undefined {
    return this.data.get('state') as RoomState | undefined;
  }
}

export class FakeSocket implements SocketPort {
  sent: string[] = [];
  closed: { code: number; reason: string } | null = null;
  attachment: SocketAttachment | null = null;

  send(text: string): void {
    assert.equal(this.closed, null, 'send after close');
    this.sent.push(text);
  }

  close(code: number, reason: string): void {
    this.closed = { code, reason };
  }

  readAttachment(): SocketAttachment | null {
    return this.attachment === null ? null : { ...this.attachment };
  }

  writeAttachment(value: SocketAttachment): void {
    this.attachment = { ...value };
  }

  messages(): ServerMessage[] {
    return this.sent.map((text) => JSON.parse(text) as ServerMessage);
  }

  views(): PlayerView[] {
    return this.messages().flatMap((message) => (message.t === 'view' ? [message.view] : []));
  }

  errors(): string[] {
    return this.messages().flatMap((message) => (message.t === 'error' ? [message.code] : []));
  }

  welcome(): { playerId: string; token: string } {
    const found = this.messages().find((message) => message.t === 'welcome');
    assert.ok(found !== undefined && found.t === 'welcome', 'no welcome');
    return { playerId: found.playerId, token: found.token };
  }

  clear(): void {
    this.sent = [];
  }
}

export function seededRandom(seed: number): Random {
  let state = seed >>> 0 || 1;
  return (bytes) => {
    const out = new Uint8Array(bytes);
    for (let index = 0; index < bytes; index += 1) {
      state ^= state << 13;
      state >>>= 0;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      out[index] = state & 0xff;
    }
    return out;
  };
}

export class FakeLeaderboard implements LeaderboardPort {
  submissions: { id: string; entry: LeaderboardEntry }[] = [];
  failing = false;

  async submit(id: string, entry: LeaderboardEntry): Promise<boolean> {
    if (this.failing) throw new Error('down');
    this.submissions.push({ id, entry });
    return true;
  }
}

export class Harness {
  storage = new FakeStorage();
  sockets: FakeSocket[] = [];
  clock = 1_700_000_000_000;
  leaderboard = new FakeLeaderboard();
  logs: { event: string; fields: LogFields }[] = [];
  random = seededRandom(12345);
  handler: RoomHandler;

  constructor() {
    this.handler = this.makeHandler();
  }

  private makeHandler(): RoomHandler {
    return new RoomHandler({
      storage: this.storage,
      sockets: () => this.sockets.filter((socket) => socket.closed === null),
      now: () => this.clock,
      random: (bytes) => this.random(bytes),
      leaderboard: this.leaderboard,
      log: (event, fields = {}) => this.logs.push({ event, fields }),
    });
  }

  hibernate(): void {
    this.handler = this.makeHandler();
  }

  async create(framework: Framework = 'scrum', code = 'BCDFG'): Promise<boolean> {
    return this.handler.create(code, framework);
  }

  async connect(): Promise<FakeSocket> {
    const socket = new FakeSocket();
    this.sockets.push(socket);
    await this.handler.accepted(socket);
    return socket;
  }

  async send(socket: FakeSocket, message: ClientMessage | string): Promise<void> {
    await this.handler.onMessage(socket, typeof message === 'string' ? message : JSON.stringify(message));
  }

  async join(name?: string): Promise<FakeSocket> {
    const socket = await this.connect();
    await this.send(socket, name === undefined ? { t: 'hello' } : { t: 'hello', name });
    return socket;
  }

  async act(socket: FakeSocket, action: ClientAction): Promise<void> {
    await this.send(socket, { t: 'do', action });
  }

  async drop(socket: FakeSocket): Promise<void> {
    await this.handler.onClose(socket);
    socket.closed ??= { code: 1006, reason: '' };
  }

  async fireAlarm(): Promise<void> {
    assert.notEqual(this.storage.alarm, null, 'no alarm set');
    this.clock = Math.max(this.clock, this.storage.alarm ?? 0);
    await this.handler.alarm();
  }

  state(): RoomState {
    const state = this.storage.state();
    assert.ok(state !== undefined, 'no state');
    return state;
  }

  advance(ms: number): void {
    this.clock += ms;
  }

  logText(): string {
    return JSON.stringify(this.logs);
  }
}

export function sqlPort(): SqlPort {
  const db = new DatabaseSync(':memory:');
  return {
    exec(query, ...bindings) {
      const statement = db.prepare(query);
      if (/^\s*select/iu.test(query)) {
        const rows = statement.all(...bindings) as Record<string, unknown>[];
        return { toArray: () => rows };
      }
      statement.run(...bindings);
      return { toArray: () => [] };
    },
    transaction(body) {
      db.exec('BEGIN');
      try {
        const result = body();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

export function entry(partial: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    framework: 'scrum',
    teamName: 'quick-heron',
    players: 4,
    score: 30,
    escapedDefects: 0,
    averageCycleMs: null,
    date: '2026-11-15',
    ...partial,
  };
}

export async function toPlanning(h: Harness): Promise<FakeSocket[]> {
  await h.create('scrum');
  const players = [await h.join('Ana'), await h.join('Bob'), await h.join('Cleo')];
  h.advance(1000);
  const host = players[0] as FakeSocket;
  await h.act(host, { type: 'lobby.start' });
  h.advance(1000);
  await h.act(host, { type: 'phase.begin' });
  return players;
}

export async function toSprint(h: Harness): Promise<FakeSocket[]> {
  const players = await toPlanning(h);
  const host = players[0] as FakeSocket;
  const iteration = h.state().iterations[0];
  assert.ok(iteration !== undefined);
  const theme = iteration.goalOptions[0] ?? 'payments';
  for (const player of players) await h.act(player, { type: 'plan.goal_vote', theme });
  await h.act(host, { type: 'plan.goal_confirm' });
  await h.act(host, { type: 'plan.estimation_stop' });
  const backlog = h.state().items.filter((own) => own.status === 'backlog').slice(0, 3);
  for (const own of backlog) await h.act(host, { type: 'plan.pull', itemId: own.id });
  await h.act(host, { type: 'phase.advance' });
  h.advance(1000);
  await h.act(host, { type: 'phase.begin' });
  return players;
}

export async function toSummary(h: Harness): Promise<Map<string, FakeSocket>> {
  const played = playGame({ players: 3, seed: 987654, checks: false }).state;
  const state = { ...played, code: 'BCDFG' };
  const tokens: Record<string, string> = {};
  for (const player of state.players) tokens[player.id] = `token-${player.id}`;
  await h.storage.put('state', state);
  await h.storage.put('tokens', tokens);
  await h.storage.put('meta', { publishId: 'fixed-publish-id', outbox: null, outboxAt: 0 });
  h.clock = state.now + 1000;
  h.hibernate();
  const sockets = new Map<string, FakeSocket>();
  for (const player of state.players) {
    const socket = await h.connect();
    await h.send(socket, { t: 'hello', playerId: player.id, token: tokens[player.id] });
    sockets.set(player.id, socket);
  }
  return sockets;
}
