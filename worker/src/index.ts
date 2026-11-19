import { DurableObject } from 'cloudflare:workers';
import { config } from '../../core/index.ts';
import type { Framework } from '../../core/index.ts';
import { BoardCache } from './cache.ts';
import type { EdgeStore, Stamped } from './cache.ts';
import { handleRequest, parseOrigins } from './http.ts';
import { LeaderboardStore } from './leaderboard.ts';
import type { HttpDeps, LimiterPort, Log, LogFields, SocketPort, SqlPort } from './ports.ts';
import { inRegion } from './region.ts';
import { RoomHandler } from './room.ts';

interface Env {
  ROOM: DurableObjectNamespaceLike<RoomStubLike>;
  LEADERBOARD: DurableObjectNamespaceLike<LeaderboardStubLike>;
  CREATE_LIMIT: LimiterPort;
  SOCKET_LIMIT: LimiterPort;
  ALLOWED_ORIGINS?: string;
  DO_JURISDICTION?: string;
}

const LeaderboardName = 'main';
const PingText = 'ping';
const PongText = 'pong';
const boardCache = new BoardCache(config.leaderboard.cacheSeconds * 1000, () => Date.now());

function edgeStore(request: Request): EdgeStore {
  const key = new Request(new URL('/api/room/leaderboard', request.url).href);
  return {
    async read() {
      const hit = await caches.default.match(key);
      return hit === undefined ? null : ((await hit.json()) as Stamped);
    },
    async write(value) {
      const headers = { 'content-type': 'application/json', 'cache-control': `public, max-age=${config.leaderboard.cacheSeconds}` };
      await caches.default.put(key, new Response(JSON.stringify(value), { headers }));
    },
  };
}

const random = (bytes: number): Uint8Array => crypto.getRandomValues(new Uint8Array(bytes));

const log: Log = (event: string, fields: LogFields = {}) => {
  console.log(JSON.stringify({ event, ...fields }));
};

function wrap(socket: HibernatableWebSocket, ctx: DurableObjectStateLike): SocketPort {
  return {
    send: (text) => socket.send(text),
    close: (code, reason) => socket.close(code, reason),
    readAttachment: () => socket.deserializeAttachment() as ReturnType<SocketPort['readAttachment']>,
    writeAttachment: (value) => socket.serializeAttachment(value),
    isOpen: () => socket.readyState === 1,
    lastAutoResponse: () => ctx.getWebSocketAutoResponseTimestamp(socket)?.getTime() ?? null,
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
      sockets: () => ctx.getWebSockets().map((own) => wrap(own, ctx)),
      now: () => Date.now(),
      random,
      leaderboard: {
        submit: (id, entry) => inRegion(env.LEADERBOARD, env.DO_JURISDICTION).getByName(LeaderboardName).submit(id, entry),
      },
      log,
    });
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PingText, PongText));
  }

  async create(code: string, framework: Framework): Promise<boolean> {
    return this.handler.create(code, framework);
  }

  async fetch(request: Request): Promise<Response> {
    const admission = await this.handler.admit(request.headers.get('sec-websocket-protocol'));
    if (!admission.ok) {
      return new Response(JSON.stringify({ code: admission.code }), {
        status: admission.status,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'retry-after': '5' },
      });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    await this.handler.accepted(wrap(server, this.ctx), admission.seat);
    const headers: Record<string, string> = admission.protocol === null ? {} : { 'sec-websocket-protocol': admission.protocol };
    return new Response(null, { status: 101, webSocket: client, headers } as ResponseInit);
  }

  async webSocketMessage(socket: HibernatableWebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.handler.onMessage(wrap(socket, this.ctx), message);
  }

  async webSocketClose(socket: HibernatableWebSocket): Promise<void> {
    await this.handler.onClose(wrap(socket, this.ctx));
    try {
      socket.close(1000, 'closed');
    } catch {
      log('close_failed');
    }
  }

  async webSocketError(socket: HibernatableWebSocket): Promise<void> {
    await this.handler.onClose(wrap(socket, this.ctx));
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
      socketLimiter: env.SOCKET_LIMIT,
      rooms: {
        create: (code, framework) => inRegion(env.ROOM, env.DO_JURISDICTION).getByName(code).create(code, framework),
        connect: (code, incoming) => inRegion(env.ROOM, env.DO_JURISDICTION).getByName(code).fetch(incoming),
      },
      board: { top: () => boardCache.get(() => inRegion(env.LEADERBOARD, env.DO_JURISDICTION).getByName(LeaderboardName).top(), edgeStore(request)) },
      random,
      log,
    };
    return handleRequest(request, deps);
  },
};
