interface DurableObjectStorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  deleteAll(): Promise<void>;
  getAlarm(): Promise<number | null>;
  setAlarm(time: number): Promise<void>;
  deleteAlarm(): Promise<void>;
  transactionSync<T>(body: () => T): T;
  sql: {
    exec(query: string, ...bindings: unknown[]): { toArray(): Record<string, unknown>[] };
  };
}

interface HibernatableWebSocket {
  send(message: string): void;
  close(code?: number, reason?: string): void;
  serializeAttachment(value: unknown): void;
  deserializeAttachment(): unknown;
}

interface DurableObjectStateLike {
  storage: DurableObjectStorageLike;
  acceptWebSocket(socket: HibernatableWebSocket): void;
  getWebSockets(): HibernatableWebSocket[];
}

interface DurableObjectStubLike {
  fetch(request: Request): Promise<Response>;
}

interface RoomStubLike extends DurableObjectStubLike {
  create(code: string, framework: string): Promise<boolean>;
}

interface LeaderboardStubLike {
  submit(id: string, entry: unknown): Promise<boolean>;
  top(): Promise<import('../../core/index.ts').LeaderboardResponse>;
}

interface DurableObjectNamespaceLike<Stub> {
  getByName(name: string): Stub;
}

declare module 'cloudflare:workers' {
  export class DurableObject<Env = unknown> {
    ctx: DurableObjectStateLike;
    env: Env;
    constructor(ctx: DurableObjectStateLike, env: Env);
  }
}

declare class WebSocketPair {
  0: HibernatableWebSocket & WebSocket;
  1: HibernatableWebSocket;
}
