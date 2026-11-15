import type { ClientAction, ClientMessage, ErrorCode, PlayerView } from '../../../core/index.ts';
import { clearSeat, writeSeat, type Seat } from '../session.ts';
import type { Transport, TransportHandlers } from '../types.ts';

const ErrorCodes: readonly string[] = ['room_not_found', 'room_full', 'already_started', 'not_allowed', 'bad_request', 'rate_limited'];
const GiveUpAfter = 3;
const BackoffBaseMs = 500;
const BackoffMaxMs = 10_000;

type Incoming =
  | { t: 'welcome'; playerId: string; token: string }
  | { t: 'view'; view: PlayerView }
  | { t: 'error'; code: ErrorCode };

function parseIncoming(data: unknown): Incoming | null {
  if (typeof data !== 'string') return null;
  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== 'object') return null;
  const message = raw as Record<string, unknown>;
  if (message.t === 'welcome' && typeof message.playerId === 'string' && typeof message.token === 'string') {
    return { t: 'welcome', playerId: message.playerId, token: message.token };
  }
  if (message.t === 'view' && message.view !== null && typeof message.view === 'object') {
    return { t: 'view', view: message.view as PlayerView };
  }
  if (message.t === 'error' && typeof message.code === 'string' && ErrorCodes.includes(message.code)) {
    return { t: 'error', code: message.code as ErrorCode };
  }
  return null;
}

function socketUrl(code: string): string {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${location.host}/api/room/${code}/ws`;
}

/**
 * Talks to one room over its WebSocket: keeps the seat in the tab, reconnects with back-off and reports codes only.
 */
export function createRemoteTransport(initial: Seat, handlers: TransportHandlers): Transport {
  let seat: Seat = initial;
  let socket: WebSocket | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;
  let welcomed = false;
  let stopped = false;

  function stop(): void {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
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
    if (code === 'room_not_found') clearSeat();
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
    const delay = Math.min(BackoffMaxMs, BackoffBaseMs * 2 ** (attempts - 1)) + Math.random() * 250;
    timer = setTimeout(connect, delay);
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
    let own: WebSocket;
    try {
      own = new WebSocket(socketUrl(seat.code));
    } catch {
      schedule();
      return;
    }
    socket = own;
    own.onopen = () => {
      if (socket === own) own.send(JSON.stringify(hello()));
    };
    own.onmessage = (event) => {
      if (socket !== own) return;
      const message = parseIncoming(event.data);
      if (message === null) return;
      if (message.t === 'welcome') {
        seat = { code: seat.code, playerId: message.playerId, token: message.token };
        writeSeat(seat);
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
      } else if (!welcomed || message.code === 'room_not_found') {
        fail(message.code);
      } else {
        handlers.onError(message.code, false);
      }
    };
    own.onclose = () => {
      if (socket !== own || stopped) return;
      socket = null;
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
      if (open === null || open.readyState !== WebSocket.OPEN) {
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
