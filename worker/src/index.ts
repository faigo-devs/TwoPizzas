import { DurableObject } from 'cloudflare:workers';
import type { Framework } from '../../core/index.ts';
import { handleRequest, parseOrigins } from './http.ts';
import { LeaderboardStore } from './leaderboard.ts';
import type { HttpDeps, LimiterPort, Log, LogFields, SocketPort, SqlPort } from './ports.ts';
import { RoomHandler } from './room.ts';

interface Env {
  ROOM: DurableObjectNamespaceLike<RoomStubLike>;
  LEADERBOARD: DurableObjectNamespaceLike<LeaderboardStubLike>;
  CREATE_LIMIT: LimiterPort;
  ALLOWED_ORIGINS?: string;
}

const LeaderboardName = 'main';

const random = (bytes: number): Uint8Array => crypto.getRandomValues(new Uint8Array(bytes));

const log: Log = (event: string, fields: LogFields = {}) => {
  console.log(JSON.stringify({ event, ...fields }));
};

function wrap(socket: HibernatableWebSocket): SocketPort {
  return {
    send: (text) => socket.send(text),
    close: (code, reason) => socket.close(code, reason),
    readAttachment: () => socket.deserializeAttachment() as ReturnType<SocketPort['readAttachment']>,
    writeAttachment: (value) => socket.serializeAttachment(value),
  };
}

/**
 * One game room: its WebSockets, its state and its alarm.
 */
export class Room extends DurableObject<Env> {
  private readonly handler: RoomHandler;

  constructor(ctx: DurableObjectStateLike, env: Env) {
    super(ctx, env);
    this.handler = new RoomHandler({
      storage: ctx.storage,
      sockets: () => ctx.getWebSockets().map(wrap),
      now: () => Date.now(),
      random,
      leaderboard: {
        submit: (id, entry) => env.LEADERBOARD.getByName(LeaderboardName).submit(id, entry),
      },
      log,
    });
  }

  async create(code: string, framework: Framework): Promise<boolean> {
    return this.handler.create(code, framework);
  }

  async fetch(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    await this.handler.accepted(wrap(server));
    return new Response(null, { status: 101, webSocket: client } as ResponseInit);
  }

  async webSocketMessage(socket: HibernatableWebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.handler.onMessage(wrap(socket), message);
  }

  async webSocketClose(socket: HibernatableWebSocket): Promise<void> {
    await this.handler.onClose(wrap(socket));
    try {
      socket.close(1000, 'closed');
    } catch {
      log('close_failed');
    }
  }

  async webSocketError(socket: HibernatableWebSocket): Promise<void> {
    await this.handler.onClose(wrap(socket));
  }

  async alarm(): Promise<void> {
    await this.handler.alarm();
  }
}

/**
 * The single leaderboard, stored in SQLite.
 */
export class Leaderboard extends DurableObject<Env> {
  private readonly store: LeaderboardStore;

  constructor(ctx: DurableObjectStateLike, env: Env) {
    super(ctx, env);
    const sql: SqlPort = {
      exec: (query, ...bindings) => ctx.storage.sql.exec(query, ...bindings),
      transaction: (body) => ctx.storage.transactionSync(body),
    };
    this.store = new LeaderboardStore(sql, () => Date.now());
  }

  async submit(id: string, entry: unknown): Promise<boolean> {
    return this.store.submit(id, entry);
  }

  async top(): Promise<ReturnType<LeaderboardStore['top']>> {
    return this.store.top();
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const deps: HttpDeps = {
      allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS),
      limiter: env.CREATE_LIMIT,
      rooms: {
        create: (code, framework) => env.ROOM.getByName(code).create(code, framework),
        connect: (code, incoming) => env.ROOM.getByName(code).fetch(incoming),
      },
      board: { top: () => env.LEADERBOARD.getByName(LeaderboardName).top() },
      random,
      log,
    };
    return handleRequest(request, deps);
  },
};
