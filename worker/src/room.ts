import { config, leaderboardEntry, machine, parseClientMessage } from '../../core/index.ts';
import type {
  Action,
  ErrorCode,
  Framework,
  LeaderboardEntry,
  PlayerId,
  ReduceResult,
  RoomState,
  ServerMessage,
} from '../../core/index.ts';
import { randomUint32, safeEqual, toBase64Url, toHex } from './encoding.ts';
import type { RoomDeps, SocketAttachment, SocketPort } from './ports.ts';

const OutboxRetryMs = 10_000;
const SocketsPerPlayer = 2;
const CloseGoingAway = 1001;
const ClosePolicy = 1008;
const CloseReplaced = 4000;

interface RoomMeta {
  publishId: string;
  outbox: LeaderboardEntry | null;
  outboxAt: number;
}

type Tokens = Record<PlayerId, string>;

/**
 * The next moment a room must wake: the machine's deadline, a clean-up time or a publish retry.
 */
export function nextAlarm(state: RoomState, outbox: { at: number } | null): number {
  const times = [state.createdAt + config.room.lifetimeMs];
  const deadline = machine.nextDeadline(state);
  if (deadline !== null) times.push(deadline);
  if (state.emptySince !== null) times.push(state.emptySince + config.room.emptyGraceMs);
  if (outbox !== null) times.push(outbox.at);
  return Math.min(...times);
}

/**
 * The reason a room must be deleted at this time, or null while it may live on.
 */
export function cleanupReason(state: RoomState, now: number): 'lifetime' | 'empty' | null {
  if (now >= state.createdAt + config.room.lifetimeMs) return 'lifetime';
  if (state.emptySince !== null && now >= state.emptySince + config.room.emptyGraceMs) return 'empty';
  return null;
}

/**
 * The logic of one room, written against injected storage, sockets, clock and randomness.
 */
export class RoomHandler {
  private readonly deps: RoomDeps;
  private state: RoomState | null = null;
  private tokens: Tokens = {};
  private meta: RoomMeta | null = null;
  private loaded = false;
  private readonly lastSent = new Map<PlayerId, string>();

  constructor(deps: RoomDeps) {
    this.deps = deps;
  }

  /**
   * Creates the room's state; answers false when the room already exists.
   */
  async create(code: string, framework: Framework): Promise<boolean> {
    await this.load();
    if (this.state !== null) return false;
    const now = this.deps.now();
    this.state = machine.createRoom({ code, framework, seed: randomUint32(this.deps.random), now });
    this.tokens = {};
    this.meta = { publishId: toBase64Url(this.deps.random(18)), outbox: null, outboxAt: 0 };
    await this.persist(true);
    await this.schedule();
    this.deps.log('room_created', { framework });
    return true;
  }

  /**
   * Takes a freshly accepted socket and refuses it when the room is unknown or crowded.
   */
  async accepted(socket: SocketPort): Promise<void> {
    await this.load();
    if (this.state === null) {
      this.refuse(socket, 'room_not_found');
      return;
    }
    if (this.deps.sockets().length > config.players.max * SocketsPerPlayer) {
      this.refuse(socket, 'room_full');
      return;
    }
    socket.writeAttachment({ conn: toHex(this.deps.random(8)), playerId: null, windowStart: this.deps.now(), count: 0 });
  }

  /**
   * Handles one message from a socket.
   */
  async onMessage(socket: SocketPort, message: string | ArrayBuffer): Promise<void> {
    await this.load();
    const attachment = socket.readAttachment();
    if (attachment === null) {
      socket.close(ClosePolicy, 'unknown');
      return;
    }
    if (this.state === null) {
      this.refuse(socket, 'room_not_found');
      return;
    }
    const now = this.deps.now();
    if (this.overLimit(socket, attachment, now)) {
      this.deps.log('message_limited');
      this.send(socket, { t: 'error', code: 'rate_limited' });
      return;
    }
    const parsed = typeof message === 'string' ? parseClientMessage(message) : null;
    if (parsed === null) {
      this.deps.log('message_refused', { code: 'bad_request' });
      this.send(socket, { t: 'error', code: 'bad_request' });
      return;
    }
    if (parsed.t === 'hello') {
      await this.hello(socket, attachment, parsed, now);
      return;
    }
    if (attachment.playerId === null) {
      this.send(socket, { t: 'error', code: 'not_allowed' });
      return;
    }
    const result = this.step({ ...parsed.action, playerId: attachment.playerId, now });
    if (!result.ok) {
      this.deps.log('action_refused', { code: result.code });
      this.send(socket, { t: 'error', code: result.code });
    }
    const publish = result.ok && parsed.action.type === 'summary.publish';
    if (publish && this.state !== null && this.meta !== null) {
      const entry = leaderboardEntry(this.state);
      if (entry !== null) this.meta = { ...this.meta, outbox: entry, outboxAt: now };
    }
    await this.commit();
    if (publish) await this.flushOutbox(now);
  }

  /**
   * Handles a socket that closed or failed.
   */
  async onClose(socket: SocketPort): Promise<void> {
    await this.load();
    const attachment = socket.readAttachment();
    if (attachment === null || attachment.playerId === null || this.state === null) return;
    const playerId = attachment.playerId;
    if (!this.state.players.some((player) => player.id === playerId)) return;
    this.step({ type: 'server.disconnected', playerId, now: this.deps.now() });
    await this.commit();
  }

  /**
   * Runs what is due: a publish retry, clean-up, or the machine's deadlines.
   */
  async alarm(): Promise<void> {
    await this.load();
    const now = this.deps.now();
    if (this.state === null) {
      await this.deps.storage.deleteAll();
      return;
    }
    await this.flushOutbox(now);
    const reason = cleanupReason(this.state, now);
    if (reason !== null) {
      await this.destroy(reason);
      return;
    }
    this.step({ type: 'server.deadline', now });
    await this.commit();
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const { storage } = this.deps;
    this.state = (await storage.get<RoomState>('state')) ?? null;
    this.tokens = (await storage.get<Tokens>('tokens')) ?? {};
    this.meta = (await storage.get<RoomMeta>('meta')) ?? null;
    if (this.state === null) return;
    const bound = new Set<string>();
    for (const socket of this.deps.sockets()) {
      const playerId = socket.readAttachment()?.playerId;
      if (playerId) bound.add(playerId);
    }
    const now = this.deps.now();
    for (const player of [...this.state.players]) {
      if (player.connected && !bound.has(player.id)) {
        this.step({ type: 'server.disconnected', playerId: player.id, now });
      }
    }
  }

  private step(action: Action): ReduceResult {
    const state = this.state;
    if (state === null) return { ok: false, code: 'room_not_found' };
    const settled = machine.reduce(state, { type: 'server.deadline', now: action.now });
    const base = settled.ok ? settled.state : state;
    const result = machine.reduce(base, action);
    this.state = result.ok ? result.state : base;
    return result;
  }

  private overLimit(socket: SocketPort, attachment: SocketAttachment, now: number): boolean {
    const fresh = now - attachment.windowStart >= config.room.messageWindowMs || now < attachment.windowStart;
    const next: SocketAttachment = fresh
      ? { ...attachment, windowStart: now, count: 1 }
      : { ...attachment, count: attachment.count + 1 };
    socket.writeAttachment(next);
    attachment.windowStart = next.windowStart;
    attachment.count = next.count;
    return next.count > config.room.messagesPerWindow;
  }

  private async hello(
    socket: SocketPort,
    attachment: SocketAttachment,
    message: { playerId?: string; token?: string; name?: string },
    now: number,
  ): Promise<void> {
    if (attachment.playerId !== null || this.state === null) {
      this.send(socket, { t: 'error', code: 'bad_request' });
      return;
    }
    const returning = message.playerId !== undefined;
    if (returning !== (message.token !== undefined)) {
      this.send(socket, { t: 'error', code: message.token !== undefined ? 'bad_request' : 'not_allowed' });
      return;
    }
    let playerId: PlayerId;
    let token: string;
    if (message.playerId !== undefined && message.token !== undefined) {
      const known = Object.hasOwn(this.tokens, message.playerId) ? (this.tokens[message.playerId] ?? '') : '';
      if (known === '' || !safeEqual(known, message.token)) {
        this.deps.log('hello_refused', { code: 'not_allowed' });
        this.refuse(socket, 'not_allowed');
        return;
      }
      playerId = message.playerId;
      token = known;
      const result = this.step({ type: 'server.connected', playerId, now });
      if (!result.ok) {
        this.refuse(socket, result.code);
        await this.commit();
        return;
      }
      this.releaseOthers(attachment.conn, playerId);
      this.deps.log('player_returned');
    } else {
      playerId = toBase64Url(this.deps.random(12));
      token = toBase64Url(this.deps.random(24));
      const result = this.step({ type: 'server.join', playerId, name: message.name ?? null, now });
      if (!result.ok) {
        this.deps.log('hello_refused', { code: result.code });
        this.refuse(socket, result.code);
        await this.commit();
        return;
      }
      this.tokens = { ...this.tokens, [playerId]: token };
      this.deps.log('player_joined', { players: this.state.players.length });
    }
    socket.writeAttachment({ ...attachment, playerId });
    this.lastSent.delete(playerId);
    this.send(socket, { t: 'welcome', playerId, token });
    await this.commit(true);
  }

  private releaseOthers(conn: string, playerId: PlayerId): void {
    for (const other of this.deps.sockets()) {
      const attached = other.readAttachment();
      if (attached === null || attached.conn === conn || attached.playerId !== playerId) continue;
      other.writeAttachment({ ...attached, playerId: null });
      try {
        other.close(CloseReplaced, 'replaced');
      } catch {
        this.deps.log('close_failed');
      }
    }
  }

  private refuse(socket: SocketPort, code: ErrorCode): void {
    this.send(socket, { t: 'error', code });
    try {
      socket.close(ClosePolicy, code);
    } catch {
      this.deps.log('close_failed');
    }
  }

  private send(socket: SocketPort, message: ServerMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      this.deps.log('send_failed');
    }
  }

  private async persist(withTokens: boolean): Promise<void> {
    const { storage } = this.deps;
    if (this.state === null) return;
    await storage.put('state', this.state);
    if (withTokens) await storage.put('tokens', this.tokens);
    if (this.meta !== null) await storage.put('meta', this.meta);
  }

  private async commit(tokensChanged = false): Promise<void> {
    const state = this.state;
    if (state === null) return;
    let dirty = tokensChanged;
    for (const id of Object.keys(this.tokens)) {
      if (!state.players.some((player) => player.id === id)) {
        const { [id]: _removed, ...rest } = this.tokens;
        this.tokens = rest;
        dirty = true;
      }
    }
    await this.persist(dirty);
    await this.schedule();
    this.broadcast(state);
  }

  private async schedule(): Promise<void> {
    if (this.state === null) return;
    const outbox = this.meta?.outbox ? { at: this.meta.outboxAt } : null;
    await this.deps.storage.setAlarm(nextAlarm(this.state, outbox));
  }

  private broadcast(state: RoomState): void {
    const now = this.deps.now();
    for (const socket of this.deps.sockets()) {
      const attachment = socket.readAttachment();
      const playerId = attachment?.playerId;
      if (!attachment || !playerId) continue;
      if (!state.players.some((player) => player.id === playerId)) {
        socket.writeAttachment({ ...attachment, playerId: null });
        this.refuse(socket, 'not_allowed');
        continue;
      }
      const view = machine.viewFor(state, playerId, now);
      const key = JSON.stringify({ ...view, now: 0 });
      if (this.lastSent.get(playerId) === key) continue;
      this.lastSent.set(playerId, key);
      this.send(socket, { t: 'view', view });
    }
  }

  private async flushOutbox(now: number): Promise<void> {
    const meta = this.meta;
    if (meta === null || meta.outbox === null || now < meta.outboxAt) return;
    try {
      await this.deps.leaderboard.submit(meta.publishId, meta.outbox);
      this.meta = { ...meta, outbox: null };
      this.deps.log('publish', { ok: true });
    } catch {
      this.meta = { ...meta, outboxAt: now + OutboxRetryMs };
      this.deps.log('publish', { ok: false });
    }
    await this.persist(false);
    await this.schedule();
  }

  private async destroy(reason: 'lifetime' | 'empty'): Promise<void> {
    const players = this.state?.players.length ?? 0;
    this.deps.log('room_destroyed', { reason, players });
    for (const socket of this.deps.sockets()) {
      try {
        socket.close(CloseGoingAway, 'room_closed');
      } catch {
        this.deps.log('close_failed');
      }
    }
    await this.deps.storage.deleteAlarm();
    await this.deps.storage.deleteAll();
    this.state = null;
    this.tokens = {};
    this.meta = null;
    this.lastSent.clear();
  }
}
