import { CloseCodes, config, isErrorCode, offeredProtocols } from '../../../core/index.ts';
import type { ClientAction, ClientMessage, ErrorCode, PlayerView } from '../../../core/index.ts';
import { clearSeat, writeSeat, type Seat } from '../session.ts';
import type { Transport, TransportHandlers } from '../types.ts';

const PingIntervalMs = config.room.pingIntervalMs;
const PingText = 'ping';
const GiveUpAfter = 3;
const BackoffBaseMs = 500;
const BackoffMaxMs = 10_000;

export type Incoming =
  | { t: 'welcome'; playerId: string; token: string | null }
  | { t: 'view'; view: PlayerView }
  | { t: 'error'; code: ErrorCode };

/**
 * Reads one frame from the room: a welcome, a view or an error code; anything else is null.
 */
export function parseIncoming(data: unknown): Incoming | null {
  if (typeof data !== 'string') return null;
  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== 'object') return null;
  const message = raw as Record<string, unknown>;
  if (message.t === 'welcome' && typeof message.playerId === 'string' && (message.token === undefined || typeof message.token === 'string')) {
    return { t: 'welcome', playerId: message.playerId, token: message.token ?? null };
  }
  if (message.t === 'view' && message.view !== null && typeof message.view === 'object') {
    return { t: 'view', view: message.view as PlayerView };
  }
  if (message.t === 'error' && isErrorCode(message.code)) {
    return { t: 'error', code: message.code };
  }
  return null;
}

const SocketOpen = 1;

/**
 * The part of a WebSocket the transport uses.
 */
export interface SocketLike {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(code?: number): void;
}

/**
 * What the transport takes from its surroundings: the socket, the page address, timers, randomness and the stored seat.
 */
export interface RemoteEnv {
  openSocket(url: string, protocols: string[]): SocketLike;
  address(): { protocol: string; host: string };
  setTimeout(run: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  setInterval(run: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
  random(): number;
  writeSeat(seat: Seat): void;
  clearSeat(): void;
}

const browserEnv: RemoteEnv = {
  openSocket: (url, protocols) => new WebSocket(url, protocols) as unknown as SocketLike,
  address: () => location,
  setTimeout: (run, ms) => setTimeout(run, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  setInterval: (run, ms) => setInterval(run, ms),
  clearInterval: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
  random: () => Math.random(),
  writeSeat,
  clearSeat,
};

/**
 * The address of a room's socket on the page's own host.
 */
export function socketUrl(code: string, address: { protocol: string; host: string }): string {
  const scheme = address.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${address.host}/api/room/${code}/ws`;
}

/**
 * Talks to one room over its WebSocket: keeps the seat in the tab, reconnects with back-off and reports codes only.
 */
export function createRemoteTransport(initial: Seat, handlers: TransportHandlers, env: RemoteEnv = browserEnv): Transport {
  let seat: Seat = initial;
  let socket: SocketLike | null = null;
  let timer: unknown = null;
  let attempts = 0;
  let welcomed = false;
  let stopped = false;
  let pinger: unknown = null;

  function stopPing(): void {
    if (pinger !== null) env.clearInterval(pinger);
    pinger = null;
  }

  function startPing(own: SocketLike): void {
    stopPing();
    pinger = env.setInterval(() => {
      if (socket === own && own.readyState === SocketOpen) own.send(PingText);
    }, PingIntervalMs);
  }

  function stop(): void {
    stopped = true;
    stopPing();
    if (timer !== null) env.clearTimeout(timer);
    timer = null;
    const current = socket;
    socket = null;
    if (current !== null) {
      current.onopen = null;
      current.onmessage = null;
      current.onclose = null;
      current.onerror = null;
      try {
        current.close(1000);
      } catch {
        return;
      }
    }
  }

  function fail(code: ErrorCode | 'network'): void {
    if (code === 'room_not_found' || code === 'removed') env.clearSeat();
    stop();
    handlers.onStatus('closed');
    handlers.onError(code, true);
  }

  function schedule(): void {
    attempts += 1;
    if (!welcomed && attempts >= GiveUpAfter) {
      fail('network');
      return;
    }
    handlers.onStatus(welcomed ? 'reconnecting' : 'connecting');
    const delay = Math.min(BackoffMaxMs, BackoffBaseMs * 2 ** (attempts - 1)) + env.random() * 250;
    timer = env.setTimeout(connect, delay);
  }

  function hello(): ClientMessage {
    const message: { t: 'hello'; playerId?: string; token?: string } = { t: 'hello' };
    if (seat.playerId !== null && seat.token !== null) {
      message.playerId = seat.playerId;
      message.token = seat.token;
    }
    return message;
  }

  function connect(): void {
    timer = null;
    if (stopped) return;
    handlers.onStatus(welcomed ? 'reconnecting' : 'connecting');
    let own: SocketLike;
    try {
      const held = seat.playerId !== null && seat.token !== null ? { playerId: seat.playerId, token: seat.token } : null;
      own = env.openSocket(socketUrl(seat.code, env.address()), offeredProtocols(held));
    } catch {
      schedule();
      return;
    }
    socket = own;
    own.onopen = () => {
      if (socket !== own) return;
      own.send(JSON.stringify(hello()));
      startPing(own);
    };
    own.onmessage = (event) => {
      if (socket !== own) return;
      const message = parseIncoming(event.data);
      if (message === null) return;
      if (message.t === 'welcome') {
        seat = { code: seat.code, playerId: message.playerId, token: message.token ?? seat.token };
        env.writeSeat(seat);
        welcomed = true;
        attempts = 0;
        handlers.onStatus('open');
      } else if (message.t === 'view') {
        if (!welcomed) {
          welcomed = true;
          attempts = 0;
        }
        handlers.onStatus('open');
        handlers.onView(message.view);
      } else if (!welcomed || message.code === 'room_not_found' || message.code === 'removed') {
        fail(message.code);
      } else {
        handlers.onError(message.code, false);
      }
    };
    own.onclose = (event) => {
      if (socket !== own || stopped) return;
      socket = null;
      stopPing();
      if (event.code === CloseCodes.replaced) {
        stop();
        handlers.onStatus('elsewhere');
        return;
      }
      if (event.code === CloseCodes.removed) {
        fail('removed');
        return;
      }
      schedule();
    };
    own.onerror = () => {
      if (socket === own) own.close();
    };
  }

  return {
    kind: 'remote',
    start() {
      stopped = false;
      connect();
    },
    send(action: ClientAction) {
      const open = socket;
      if (open === null || open.readyState !== SocketOpen) {
        handlers.onError('network', false);
        return;
      }
      const message: ClientMessage = { t: 'do', action };
      open.send(JSON.stringify(message));
    },
    close() {
      stop();
    },
  };
}
