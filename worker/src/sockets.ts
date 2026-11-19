import { CloseCodes, config } from '../../core/index.ts';
import type { ErrorCode, PlayerId, ServerMessage } from '../../core/index.ts';
import type { Log, SocketAttachment, SocketPort } from './ports.ts';

const SocketsPerPlayer = 2;

export const PingText = 'ping';
export const PongText = 'pong';

/**
 * A live socket together with the seat it is bound to.
 */
export interface BoundSocket {
  socket: SocketPort;
  playerId: PlayerId;
}

function heardAt(socket: SocketPort, attached: SocketAttachment): number {
  return Math.max(attached.heardAt, socket.lastAutoResponse() ?? 0);
}

/**
 * The rules about a room's sockets: who may connect, how fast they may talk, when silence ends a socket and how a socket is closed.
 */
export class SocketPolicy {
  private readonly list: () => SocketPort[];
  private readonly log: Log;

  constructor(list: () => SocketPort[], log: Log) {
    this.list = list;
    this.log = log;
  }

  /**
   * How many sockets the platform lists, closing ones included.
   */
  listed(): number {
    return this.list().length;
  }

  /**
   * The open sockets that are not already closing.
   */
  live(): SocketPort[] {
    return this.list().filter((socket) => {
      const attached = socket.readAttachment();
      return attached !== null && !attached.closing && socket.isOpen();
    });
  }

  /**
   * The live sockets that carry a seat.
   */
  bound(): BoundSocket[] {
    const found: BoundSocket[] = [];
    for (const socket of this.live()) {
      const playerId = socket.readAttachment()?.playerId;
      if (playerId) found.push({ socket, playerId });
    }
    return found;
  }

  /**
   * The seats that have a live socket.
   */
  boundPlayers(): Set<PlayerId> {
    return new Set(this.bound().map((entry) => entry.playerId));
  }

  send(socket: SocketPort, message: ServerMessage | string): void {
    try {
      socket.send(typeof message === 'string' ? message : JSON.stringify(message));
    } catch {
      this.log('send_failed');
    }
  }

  close(socket: SocketPort, code: number, reason: string): void {
    const attached = socket.readAttachment();
    if (attached !== null) socket.writeAttachment({ ...attached, playerId: null, closing: true });
    try {
      socket.close(code, reason);
    } catch {
      this.log('close_failed');
    }
  }

  /**
   * Sends an error and closes the socket by policy.
   */
  refuse(socket: SocketPort, code: ErrorCode): void {
    this.send(socket, { t: 'error', code });
    this.close(socket, CloseCodes.policy, code);
  }

  /**
   * Ends every socket of a room that is going away.
   */
  closeAll(): void {
    for (const socket of this.list()) this.close(socket, CloseCodes.goingAway, 'room_closed');
  }

  /**
   * Gives a new socket its attachment, bound to a seat or not.
   */
  attach(socket: SocketPort, conn: string, playerId: PlayerId | null, now: number): SocketAttachment {
    const attachment: SocketAttachment = {
      conn,
      playerId,
      windowStart: now,
      count: 0,
      acceptedAt: now,
      heardAt: now,
      closing: false,
    };
    socket.writeAttachment(attachment);
    return attachment;
  }

  /**
   * Binds a socket to a seat.
   */
  bind(socket: SocketPort, attachment: SocketAttachment, playerId: PlayerId): void {
    socket.writeAttachment({ ...attachment, playerId });
  }

  /**
   * Notes that the socket was heard from.
   */
  touch(socket: SocketPort, attachment: SocketAttachment, now: number): void {
    socket.writeAttachment({ ...attachment, heardAt: now });
  }

  /**
   * Decides whether a socket without a proven seat may join: refuses when the room's seats are all taken, and evicts the oldest idle socket when too many wait for a hello.
   */
  admitStranger(): 'ok' | 'room_full' {
    let joined = 0;
    let unjoined = 0;
    let oldest: SocketPort | null = null;
    let oldestAt = Infinity;
    for (const other of this.live()) {
      const attached = other.readAttachment();
      if (attached === null) continue;
      if (attached.playerId !== null) {
        joined += 1;
        continue;
      }
      unjoined += 1;
      if (attached.acceptedAt < oldestAt) {
        oldestAt = attached.acceptedAt;
        oldest = other;
      }
    }
    if (joined >= config.players.max * SocketsPerPlayer) {
      this.log('socket_refused', { joined, unjoined });
      return 'room_full';
    }
    if (unjoined >= config.room.unjoinedSocketsMax && oldest !== null) {
      this.log('socket_evicted', { unjoined });
      this.close(oldest, CloseCodes.noHello, 'evicted');
    }
    return 'ok';
  }

  /**
   * Counts a message against the socket's window and answers whether it is one too many.
   */
  overLimit(socket: SocketPort, attachment: SocketAttachment, now: number): boolean {
    const fresh = now - attachment.windowStart >= config.room.messageWindowMs || now < attachment.windowStart;
    const next: SocketAttachment = fresh
      ? { ...attachment, windowStart: now, count: 1, heardAt: now }
      : { ...attachment, count: attachment.count + 1, heardAt: now };
    socket.writeAttachment(next);
    attachment.windowStart = next.windowStart;
    attachment.count = next.count;
    attachment.heardAt = next.heardAt;
    return next.count > config.room.messagesPerWindow;
  }

  /**
   * Closes the other sockets of a seat that has just connected again.
   */
  releaseOthers(conn: string, playerId: PlayerId): void {
    for (const other of this.live()) {
      const attached = other.readAttachment();
      if (attached === null || attached.conn === conn || attached.playerId !== playerId) continue;
      this.close(other, CloseCodes.replaced, 'replaced');
    }
  }

  /**
   * Tells every socket of a removed seat and closes it.
   */
  removeSeat(playerId: PlayerId): void {
    for (const other of this.live()) {
      const attached = other.readAttachment();
      if (attached === null || attached.playerId !== playerId) continue;
      this.send(other, { t: 'error', code: 'removed' });
      this.close(other, CloseCodes.removed, 'removed');
    }
  }

  /**
   * The moments at which a socket would run out of patience: a missing hello or too long a silence.
   */
  wakeTimes(): number[] {
    const times: number[] = [];
    for (const socket of this.live()) {
      const attached = socket.readAttachment();
      if (attached === null) continue;
      times.push(
        attached.playerId === null
          ? attached.acceptedAt + config.room.helloTimeoutMs
          : heardAt(socket, attached) + config.room.silenceMs,
      );
    }
    return times;
  }

  /**
   * Closes the sockets that never said hello or went silent; answers the seats left without any live socket.
   */
  sweep(now: number): PlayerId[] {
    let idle = 0;
    let silent = 0;
    const orphaned: PlayerId[] = [];
    for (const socket of this.live()) {
      const attached = socket.readAttachment();
      if (attached === null) continue;
      if (attached.playerId === null) {
        if (now < attached.acceptedAt + config.room.helloTimeoutMs) continue;
        idle += 1;
        this.close(socket, CloseCodes.noHello, 'no_hello');
        continue;
      }
      if (now < heardAt(socket, attached) + config.room.silenceMs) continue;
      silent += 1;
      const playerId = attached.playerId;
      this.close(socket, CloseCodes.silent, 'silent');
      const stillBound = this.live().some((other) => other !== socket && other.readAttachment()?.playerId === playerId);
      if (!stillBound) orphaned.push(playerId);
    }
    if (idle > 0 || silent > 0) this.log('sockets_swept', { idle, silent });
    return orphaned;
  }
}
