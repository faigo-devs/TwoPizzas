import { config, isRoomCode } from '../../core/index.ts';
import type { ErrorCode, Framework, LeaderboardResponse } from '../../core/index.ts';
import type { HttpDeps } from './ports.ts';

const BodyBytesMax = 1024;
const Decoder = new TextDecoder();
const CreateAttempts = 8;
const WsPath = /^\/api\/room\/([^/]+)\/ws$/;

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });
}

function failure(status: number, code: ErrorCode): Response {
  return json(status, { code });
}

/**
 * Splits the comma-separated list of allowed origins from the configuration.
 */
export function parseOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Draws a room code from the game's alphabet without modulo bias.
 */
export function generateCode(random: (bytes: number) => Uint8Array): string {
  const letters = config.room.codeLetters;
  const limit = 256 - (256 % letters.length);
  let code = '';
  while (code.length < config.room.codeLength) {
    for (const byte of random(config.room.codeLength * 2)) {
      if (byte < limit && code.length < config.room.codeLength) code += letters[byte % letters.length];
    }
  }
  return code;
}

function addressOf(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'local';
}

async function readCapped(request: Request, max: number): Promise<string | null> {
  const declared = request.headers.get('content-length');
  if (declared !== null && !(Number(declared) <= max)) return null;
  if (request.body === null) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return Decoder.decode(joined);
}

function originAllowed(request: Request, deps: HttpDeps, required: boolean): boolean {
  const origin = request.headers.get('origin');
  if (origin === null) return !required;
  return deps.allowedOrigins.includes(origin);
}

async function createRoom(request: Request, deps: HttpDeps): Promise<Response> {
  if (!originAllowed(request, deps, true)) {
    deps.log('create_refused', { code: 'not_allowed' });
    return failure(403, 'not_allowed');
  }
  const verdict = await deps.limiter.limit({ key: addressOf(request) });
  if (!verdict.success) {
    deps.log('create_refused', { code: 'rate_limited' });
    return failure(429, 'rate_limited');
  }
  const text = await readCapped(request, BodyBytesMax);
  if (text === null) return failure(400, 'bad_request');
  let framework: Framework | null = null;
  try {
    const body: unknown = JSON.parse(text);
    const value = body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const keys = Object.keys(value);
    if (keys.length === 1 && (value.framework === 'scrum' || value.framework === 'kanban')) framework = value.framework;
  } catch {
    framework = null;
  }
  if (framework === null) return failure(400, 'bad_request');
  for (let attempt = 0; attempt < CreateAttempts; attempt += 1) {
    const code = generateCode(deps.random);
    if (await deps.rooms.create(code, framework)) return json(200, { code });
    deps.log('create_collision');
  }
  return failure(503, 'rate_limited');
}

async function leaderboard(deps: HttpDeps): Promise<Response> {
  const body: LeaderboardResponse = await deps.board.top();
  return json(200, body, { 'cache-control': `public, max-age=${config.leaderboard.cacheSeconds}` });
}

/**
 * Routes one HTTP request of the public API; errors are codes only.
 */
export async function handleRequest(request: Request, deps: HttpDeps): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === '/api/room') {
    return request.method === 'POST' ? createRoom(request, deps) : failure(404, 'bad_request');
  }
  if (pathname === '/api/room/leaderboard') {
    return request.method === 'GET' ? leaderboard(deps) : failure(404, 'bad_request');
  }
  const match = WsPath.exec(pathname);
  if (match !== null && request.method === 'GET') {
    const code = match[1] ?? '';
    if (!isRoomCode(code)) return failure(404, 'room_not_found');
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return failure(426, 'bad_request');
    if (!originAllowed(request, deps, false)) return failure(403, 'not_allowed');
    const verdict = await deps.socketLimiter.limit({ key: addressOf(request) });
    if (!verdict.success) {
      deps.log('socket_refused', { code: 'rate_limited' });
      return failure(429, 'rate_limited');
    }
    return deps.rooms.connect(code, request);
  }
  return failure(404, 'bad_request');
}
