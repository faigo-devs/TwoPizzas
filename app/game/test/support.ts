import type { PlayerView } from '../../../core/index.ts';
import type { RemoteEnv, SocketLike } from '../transport/remote.ts';
import type { ConnectionStatus, FailureCode, TransportHandlers } from '../types.ts';
import type { Seat } from '../session.ts';

export class FakeSocket implements SocketLike {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  closedWith: number | null = null;

  readonly url: string;
  readonly protocols: string[];

  constructor(url: string, protocols: string[]) {
    this.url = url;
    this.protocols = protocols;
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number): void {
    this.closedWith = code ?? 1005;
    this.readyState = 3;
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  receive(message: unknown): void {
    this.onmessage?.({ data: typeof message === 'string' ? message : JSON.stringify(message) });
  }

  drop(code: number): void {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

interface Timer {
  id: number;
  run: () => void;
  ms: number;
  every: boolean;
}

export interface Harness {
  env: RemoteEnv;
  sockets: FakeSocket[];
  timers: Map<number, Timer>;
  written: Seat[];
  cleared: number;
  fireTimeout(): number;
  fireInterval(): void;
  events: string[];
  views: PlayerView[];
  statuses: ConnectionStatus[];
  errors: { code: FailureCode; fatal: boolean }[];
  handlers: TransportHandlers;
}

export function harness(): Harness {
  let next = 1;
  const timers = new Map<number, Timer>();
  const sockets: FakeSocket[] = [];
  const events: string[] = [];
  const views: PlayerView[] = [];
  const statuses: ConnectionStatus[] = [];
  const errors: { code: FailureCode; fatal: boolean }[] = [];
  const self: Harness = {
    sockets,
    timers,
    written: [],
    cleared: 0,
    events,
    views,
    statuses,
    errors,
    env: {
      openSocket: (url, protocols) => {
        const made = new FakeSocket(url, protocols);
        sockets.push(made);
        return made;
      },
      address: () => ({ protocol: 'https:', host: 'example.test' }),
      setTimeout: (run, ms) => {
        const id = next++;
        timers.set(id, { id, run, ms, every: false });
        return id;
      },
      clearTimeout: (handle) => {
        timers.delete(handle as number);
      },
      setInterval: (run, ms) => {
        const id = next++;
        timers.set(id, { id, run, ms, every: true });
        return id;
      },
      clearInterval: (handle) => {
        timers.delete(handle as number);
      },
      random: () => 0,
      writeSeat: (seat) => {
        self.written.push(seat);
      },
      clearSeat: () => {
        self.cleared += 1;
      },
    },
    fireTimeout() {
      const found = [...timers.values()].find((timer) => !timer.every);
      if (found === undefined) throw new Error('no timeout pending');
      timers.delete(found.id);
      found.run();
      return found.ms;
    },
    fireInterval() {
      const found = [...timers.values()].find((timer) => timer.every);
      if (found === undefined) throw new Error('no interval pending');
      found.run();
    },
    handlers: {
      onStatus: (status) => {
        statuses.push(status);
        events.push(`status:${status}`);
      },
      onView: (view) => {
        views.push(view);
        events.push('view');
      },
      onError: (code, fatal) => {
        errors.push({ code, fatal });
        events.push(`error:${code}:${fatal}`);
      },
    },
  };
  return self;
}

export function fakeView(now = 1000): PlayerView {
  return { now } as unknown as PlayerView;
}

interface Pending {
  id: number;
  run: () => void;
  ms: number;
  every: boolean;
}

export interface GlobalStubs {
  sockets: FakeSocket[];
  pending: Map<number, Pending>;
  storage: Map<string, string>;
  tickTimeouts(): number;
  restore(): void;
}

const Saved = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'WebSocket', 'location', 'sessionStorage', 'localStorage', 'fetch', 'document', 'window', 'navigator'] as const;

export function stubGlobals(): GlobalStubs {
  const target = globalThis as unknown as Record<string, unknown>;
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const name of Saved) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  const pending = new Map<number, Pending>();
  const sockets: FakeSocket[] = [];
  const storage = new Map<string, string>();
  let next = 1;
  const define = (name: string, value: unknown): void => {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  };
  define('setTimeout', (run: () => void, ms: number) => {
    const id = next++;
    pending.set(id, { id, run, ms, every: false });
    return id;
  });
  define('setInterval', (run: () => void, ms: number) => {
    const id = next++;
    pending.set(id, { id, run, ms, every: true });
    return id;
  });
  define('clearTimeout', (id: number) => {
    pending.delete(id);
  });
  define('clearInterval', (id: number) => {
    pending.delete(id);
  });
  define(
    'WebSocket',
    class {
      constructor(url: string, protocols: string[]) {
        const made = new FakeSocket(url, protocols);
        sockets.push(made);
        return made;
      }
    },
  );
  define('location', { protocol: 'https:', host: 'example.test', search: '' });
  const area = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  };
  define('sessionStorage', area);
  define('localStorage', area);
  define('document', { documentElement: { lang: '' }, querySelector: () => null });
  define('window', { addEventListener: () => undefined });
  define('navigator', { languages: ['en'], language: 'en' });
  return {
    sockets,
    pending,
    storage,
    tickTimeouts() {
      const due = [...pending.values()].filter((timer) => !timer.every);
      for (const timer of due) {
        pending.delete(timer.id);
        timer.run();
      }
      return due.length;
    },
    restore() {
      for (const [name, descriptor] of originals) {
        if (descriptor === undefined) delete target[name];
        else Object.defineProperty(globalThis, name, descriptor);
      }
    },
  };
}
