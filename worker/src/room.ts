import { CloseCodes, StateVersion, config, leaderboardEntry, machine, parseClientMessage, parseProtocols } from '../../core/index.ts';
import type { Action, ErrorCode, Framework, PlayerId, PlayerView, ReduceResult, RoomState } from '../../core/index.ts';
import { randomUint32, toBase64Url, toHex } from './encoding.ts';
import { Outbox } from './outbox.ts';
import type { OutboxMeta } from './outbox.ts';
import type { RoomDeps, SocketAttachment, SocketPort } from './ports.ts';
import { SeatRegistry } from './seats.ts';
import type { TokenHashes } from './seats.ts';
import { PingText, PongText, SocketPolicy } from './sockets.ts';

const SecretBytes = 32;
const MinAlarmAheadMs = 1000;

/**
 * The answer to an upgrade request before any socket exists.
 */
export type Admission = { ok: true; seat: PlayerId | null; protocol: string | null } | { ok: false; status: number; code: ErrorCode };

/**
 * Why a room is deleted: it lived out its lifetime, it stayed empty, or its stored state has another version.
 */
export type DestroyReason = 'lifetime' | 'empty' | 'outdated';

/**
 * The next moment a room must wake: the machine's deadline, a clean-up time or a publish retry.
 */
export function nextAlarm(
  state: RoomState,
  outbox: { at: number } | null,
  socketTimes: readonly number[] = [],
  machineFaulted = false,
): number {
  const times = [state.createdAt + config.room.lifetimeMs, ...socketTimes];
  const deadline = machineFaulted ? null : machine.nextDeadline(state);
  if (deadline !== null) times.push(deadline);
  if (state.emptySince !== null) times.push(state.emptySince + config.room.emptyGraceMs);
  if (outbox !== null) times.push(outbox.at);
  return Math.min(...times);
}

/**
 * The reason a room must be deleted at this time, or null while it may live on.
 */
export function cleanupReason(state: RoomState, now: number): Exclude<DestroyReason, 'outdated'> | null {
  if (now >= state.createdAt + config.room.lifetimeMs) return 'lifetime';
  if (state.emptySince !== null && now >= state.emptySince + config.room.emptyGraceMs) return 'empty';
  return null;
}


function fingerprint(state: RoomState): string {
  return JSON.stringify({ ...state, now: 0 });
}

/**
 * The logic of one room, written against injected storage, sockets, clock and randomness.
 */
export class RoomHandler {
  private readonly deps: RoomDeps;
  private readonly seats = new SeatRegistry();
  private readonly outbox: Outbox;
  private readonly policy: SocketPolicy;
  private state: RoomState | null = null;
  private loaded = false;
  private persistedKey = '';
  private armed: number | null = null;
  private faulted = false;
  private readonly lastSent = new Map<PlayerId, string>();

  constructor(deps: RoomDeps) {
    this.deps = deps;
    this.outbox = new Outbox(deps.leaderboard, deps.log);
    this.policy = new SocketPolicy(() => deps.sockets(), deps.log);
  }

  /**
   * Creates the room's state; answers false when the room already exists.
   */
  async create(code: string, framework: Framework): Promise<boolean> {
    await this.load();
    if (this.state !== null) return false;
    const now = this.deps.now();
    this.state = machine.createRoom({
      code,
      framework,
      secret: toHex(this.deps.random(SecretBytes)),
      nameSeed: randomUint32(this.deps.random),
      now,
    });
    this.seats.clear();
    this.outbox.init(toBase64Url(this.deps.random(18)));
    await this.persist(true, true);
    await this.schedule();
    this.deps.log('room_created', { framework });
    return true;
  }

  /**
   * Decides an upgrade before a socket exists: a seat proven by its token is always admitted, a stranger only below the memory backstop.
   */
  async admit(header: string | null): Promise<Admission> {
    await this.load();
    const offered = parseProtocols(header);
    if (header !== null && !offered.game) return { ok: false, status: 400, code: 'bad_request' };
    const protocol = header === null ? null : config.room.protocol;
    if (offered.seat !== null && this.state !== null && this.seats.verify(offered.seat.playerId, offered.seat.token)) {
      return { ok: true, seat: offered.seat.playerId, protocol };
    }
    const listed = this.policy.listed();
    if (listed >= config.room.socketsBackstopMax) {
      this.deps.log('upgrade_refused', { listed });
      return { ok: false, status: 503, code: 'rate_limited' };
    }
    return { ok: true, seat: null, protocol };
  }

  /**
   * Takes a freshly accepted socket; a seat proven at the upgrade is bound at once and skips every cap, anyone else may be refused when the room is unknown or crowded.
   */
  async accepted(socket: SocketPort, seat: PlayerId | null = null): Promise<void> {
    await this.load();
    if (this.state === null) {
      this.policy.refuse(socket, 'room_not_found');
      return;
    }
    const now = this.deps.now();
    const conn = toHex(this.deps.random(8));
    if (seat !== null) {
      const bound = this.policy.attach(socket, conn, seat, now);
      await this.resumeBound(socket, bound, seat, now);
      return;
    }
    if (this.policy.admitStranger() === 'room_full') {
      this.policy.refuse(socket, 'room_full');
      return;
    }
    this.policy.attach(socket, conn, null, now);
    await this.schedule();
  }

  /**
   * Handles one message from a socket.
   */
  async onMessage(socket: SocketPort, message: string | ArrayBuffer): Promise<void> {
    await this.load();
    const attachment = socket.readAttachment();
    if (attachment === null) {
      socket.close(CloseCodes.policy, 'unknown');
      return;
    }
    if (attachment.closing) return;
    if (this.state === null) {
      this.policy.refuse(socket, 'room_not_found');
      return;
    }
    const now = this.deps.now();
    if (message === PingText) {
      this.policy.touch(socket, attachment, now);
      this.policy.send(socket, PongText);
      return;
    }
    if (this.policy.overLimit(socket, attachment, now)) {
      this.deps.log('message_limited');
      this.policy.send(socket, { t: 'error', code: 'rate_limited' });
      return;
    }
    const parsed = typeof message === 'string' ? parseClientMessage(message) : null;
    if (parsed === null) {
      this.deps.log('message_refused', { code: 'bad_request' });
      this.policy.send(socket, { t: 'error', code: 'bad_request' });
      return;
    }
    if (parsed.t === 'hello') {
      await this.hello(socket, attachment, parsed, now);
      return;
    }
    if (attachment.playerId === null) {
      this.policy.send(socket, { t: 'error', code: 'not_allowed' });
      return;
    }
    const result = this.step({ ...parsed.action, playerId: attachment.playerId, now });
    if (!result.ok) {
      this.deps.log('action_refused', { code: result.code });
      this.policy.send(socket, { t: 'error', code: result.code });
      if (this.changed()) await this.commit();
      return;
    }
    if (parsed.action.type === 'lobby.kick') this.removeSeat(parsed.action.targetId);
    const publish = parsed.action.type === 'summary.publish';
    let metaChanged = false;
    if (publish && this.state !== null) {
      const entry = leaderboardEntry(this.state);
      if (entry !== null) metaChanged = this.outbox.queue(entry, now);
    }
    await this.commit(false, metaChanged);
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
    this.armed = null;
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
    for (const playerId of this.policy.sweep(now)) this.step({ type: 'server.disconnected', playerId, now });
    this.step({ type: 'server.deadline', now });
    await this.commit();
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const { storage } = this.deps;
    const stored = (await storage.get<RoomState>('state')) ?? null;
    this.seats.load(await storage.get<TokenHashes>('tokenHashes'));
    this.outbox.load(await storage.get<OutboxMeta>('meta'));
    if (stored === null) return;
    if (stored.version !== StateVersion) {
      const found = typeof stored.version === 'number' ? stored.version : -1;
      this.deps.log('state_outdated', { stored: found, current: StateVersion });
      await this.destroy('outdated', 0);
      return;
    }
    this.state = stored;
    this.persistedKey = fingerprint(stored);
    const bound = this.policy.boundPlayers();
    const now = this.deps.now();
    for (const player of [...stored.players]) {
      if (player.connected && !bound.has(player.id)) {
        this.step({ type: 'server.disconnected', playerId: player.id, now });
      }
    }
  }

  private reduce(state: RoomState, action: Action): ReduceResult {
    try {
      const result = machine.reduce(state, action);
      this.faulted = false;
      return result;
    } catch {
      this.faulted = true;
      this.deps.log('machine_error', { action: action.type });
      return { ok: false, code: 'bad_request' };
    }
  }

  private step(action: Action): ReduceResult {
    const state = this.state;
    if (state === null) return { ok: false, code: 'room_not_found' };
    const settled = this.reduce(state, { type: 'server.deadline', now: action.now });
    if (this.faulted) return { ok: false, code: 'bad_request' };
    const base = settled.ok ? settled.state : state;
    const result = this.reduce(base, action);
    this.state = result.ok ? result.state : base;
    return result;
  }

  private async hello(
    socket: SocketPort,
    attachment: SocketAttachment,
    message: { playerId?: string; token?: string; name?: string },
    now: number,
  ): Promise<void> {
    if (attachment.playerId !== null && attachment.playerId === message.playerId) return;
    if (attachment.playerId !== null || this.state === null) {
      this.policy.send(socket, { t: 'error', code: 'bad_request' });
      return;
    }
    if ((message.playerId !== undefined) !== (message.token !== undefined)) {
      this.policy.send(socket, { t: 'error', code: message.token !== undefined ? 'bad_request' : 'not_allowed' });
      return;
    }
    if (message.playerId !== undefined && message.token !== undefined) {
      await this.resumeSeat(socket, attachment, message.playerId, message.token, now);
      return;
    }
    await this.joinNew(socket, attachment, message.name ?? null, now);
  }

  private async resumeSeat(socket: SocketPort, attachment: SocketAttachment, playerId: PlayerId, token: string, now: number): Promise<void> {
    if (!this.seats.verify(playerId, token)) {
      this.deps.log('hello_refused', { code: 'not_allowed' });
      this.policy.refuse(socket, 'not_allowed');
      return;
    }
    await this.resumeBound(socket, attachment, playerId, now);
  }

  private async joinNew(socket: SocketPort, attachment: SocketAttachment, name: string | null, now: number): Promise<void> {
    const { playerId, token } = this.seats.issue(this.deps.random);
    const result = this.step({ type: 'server.join', playerId, name, now });
    if (!result.ok) {
      this.deps.log('hello_refused', { code: result.code });
      this.policy.refuse(socket, result.code);
      if (this.changed()) await this.commit();
      return;
    }
    this.seats.bind(playerId, token);
    this.deps.log('player_joined', { players: this.state?.players.length ?? 0 });
    this.policy.bind(socket, attachment, playerId);
    this.lastSent.delete(playerId);
    this.policy.send(socket, { t: 'welcome', playerId, token });
    await this.commit(true);
  }

  private async resumeBound(socket: SocketPort, attachment: SocketAttachment, playerId: PlayerId, now: number): Promise<void> {
    const result = this.step({ type: 'server.connected', playerId, now });
    if (!result.ok) {
      this.policy.refuse(socket, result.code);
      if (this.changed()) await this.commit();
      return;
    }
    this.policy.releaseOthers(attachment.conn, playerId);
    this.deps.log('player_returned');
    this.policy.bind(socket, attachment, playerId);
    this.lastSent.delete(playerId);
    this.policy.send(socket, { t: 'welcome', playerId });
    await this.commit(true);
  }

  private removeSeat(playerId: PlayerId): void {
    this.lastSent.delete(playerId);
    this.policy.removeSeat(playerId);
    this.deps.log('player_removed');
  }

  private changed(): boolean {
    return this.state !== null && fingerprint(this.state) !== this.persistedKey;
  }

  private async persist(withTokens: boolean, withMeta: boolean): Promise<void> {
    if (this.state === null) return;
    const entries: Record<string, unknown> = {};
    const key = fingerprint(this.state);
    if (key !== this.persistedKey) entries.state = this.state;
    if (withTokens) entries.tokenHashes = this.seats.snapshot();
    const meta = this.outbox.snapshot();
    if (withMeta && meta !== null) entries.meta = meta;
    if (Object.keys(entries).length === 0) return;
    await this.deps.storage.put(entries);
    this.persistedKey = key;
  }

  private async commit(tokensChanged = false, metaChanged = false): Promise<void> {
    const state = this.state;
    if (state === null) return;
    const pruned = this.seats.prune(state.players);
    await this.persist(tokensChanged || pruned, metaChanged);
    await this.schedule();
    this.broadcast(state);
  }

  private async schedule(): Promise<void> {
    const state = this.state;
    if (state === null) return;
    let wake: number;
    try {
      wake = nextAlarm(state, this.outbox.due(), this.policy.wakeTimes(), this.faulted);
    } catch {
      this.deps.log('machine_error', { action: 'schedule' });
      wake = state.createdAt + config.room.lifetimeMs;
    }
    const target = Math.max(wake, this.deps.now() + MinAlarmAheadMs);
    if (target === this.armed) return;
    await this.deps.storage.setAlarm(target);
    this.armed = target;
  }

  private broadcast(state: RoomState): void {
    const now = this.deps.now();
    for (const { socket, playerId } of this.policy.bound()) {
      if (!state.players.some((player) => player.id === playerId)) {
        this.policy.refuse(socket, 'not_allowed');
        continue;
      }
      let view: PlayerView;
      try {
        view = machine.viewFor(state, playerId, now);
      } catch {
        this.deps.log('machine_error', { action: 'view' });
        continue;
      }
      const key = JSON.stringify({ ...view, now: 0 });
      if (this.lastSent.get(playerId) === key) continue;
      this.lastSent.set(playerId, key);
      this.policy.send(socket, { t: 'view', view });
    }
  }

  private async flushOutbox(now: number): Promise<void> {
    if (!(await this.outbox.flush(now))) return;
    await this.persist(false, true);
    await this.schedule();
  }

  private async destroy(reason: DestroyReason, players = this.state?.players.length ?? 0): Promise<void> {
    this.deps.log('room_destroyed', { reason, players });
    this.policy.closeAll();
    await this.deps.storage.deleteAlarm();
    await this.deps.storage.deleteAll();
    this.armed = null;
    this.persistedKey = '';
    this.state = null;
    this.faulted = false;
    this.seats.clear();
    this.outbox.clear();
    this.lastSent.clear();
  }
}
