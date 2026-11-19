import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../../core/index.ts';
import type { LeaderboardResponse } from '../../core/index.ts';
import { generateCode, handleRequest, parseOrigins } from '../src/http.ts';
import type { HttpDeps } from '../src/ports.ts';
import { seededRandom } from './support.ts';

const Origin = 'https://game.example';

interface Setup {
  deps: HttpDeps;
  created: { code: string; framework: string }[];
  forwarded: string[];
  logs: string[];
  existing: Set<string>;
}

function setup(limitPerKey = 5, random = seededRandom(7), socketLimitPerKey = 60): Setup {
  const counts = new Map<string, number>();
  const socketCounts = new Map<string, number>();
  const created: { code: string; framework: string }[] = [];
  const forwarded: string[] = [];
  const logs: string[] = [];
  const existing = new Set<string>();
  const empty: LeaderboardResponse = {
    month: { scrum: [], kanban: [] },
    allTime: { scrum: [], kanban: [] },
  };
  const deps: HttpDeps = {
    allowedOrigins: parseOrigins(` ${Origin} , http://localhost:4321`),
    limiter: {
      async limit({ key }) {
        const used = (counts.get(key) ?? 0) + 1;
        counts.set(key, used);
        return { success: used <= limitPerKey };
      },
    },
    socketLimiter: {
      async limit({ key }) {
        const used = (socketCounts.get(key) ?? 0) + 1;
        socketCounts.set(key, used);
        return { success: used <= socketLimitPerKey };
      },
    },
    rooms: {
      async create(code, framework) {
        if (existing.has(code)) return false;
        existing.add(code);
        created.push({ code, framework });
        return true;
      },
      async connect(code) {
        forwarded.push(code);
        return new Response('forwarded', { status: 200 });
      },
    },
    board: { top: async () => empty },
    random,
    log: (event, fields) => logs.push(JSON.stringify({ event, ...fields })),
  };
  return { deps, created, forwarded, logs, existing };
}

function post(body: unknown, headers: Record<string, string> = { origin: Origin }): Request {
  return new Request('https://api.example/api/room', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('creating a room answers a five-letter code from the alphabet', async () => {
  const s = setup();
  const response = await handleRequest(post({ framework: 'scrum' }), s.deps);
  assert.equal(response.status, 200);
  const body = (await response.json()) as { code: string };
  assert.match(body.code, new RegExp(`^[${config.room.codeLetters}]{5}$`));
  assert.deepEqual(s.created, [{ code: body.code, framework: 'scrum' }]);
});

test('generated codes only use the alphabet and are not all alike', () => {
  const random = seededRandom(99);
  const codes = new Set<string>();
  for (let index = 0; index < 200; index += 1) {
    const code = generateCode(random);
    assert.match(code, /^[BCDFGHJKLMNPRSTVWXZ]{5}$/);
    codes.add(code);
  }
  assert.ok(codes.size > 190);
});

test('a code that already exists is drawn again', async () => {
  const s = setup();
  const first = (await (await handleRequest(post({ framework: 'scrum' }), s.deps)).json()) as { code: string };
  const sameAgain = setup(5, seededRandom(7));
  sameAgain.existing.add(first.code);
  const response = await handleRequest(post({ framework: 'kanban' }), sameAgain.deps);
  const body = (await response.json()) as { code: string };
  assert.equal(response.status, 200);
  assert.notEqual(body.code, first.code);
  assert.ok(sameAgain.logs.some((line) => line.includes('create_collision')));
});

test('when every draw collides the answer is a code, not a crash', async () => {
  const s = setup(5, () => new Uint8Array(10));
  const fixed = generateCode(() => new Uint8Array(10));
  s.existing.add(fixed);
  const response = await handleRequest(post({ framework: 'scrum' }), s.deps);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { code: 'rate_limited' });
});

test('a foreign or missing origin is refused before anything is spent', async () => {
  const s = setup();
  const foreign = await handleRequest(post({ framework: 'scrum' }, { origin: 'https://evil.example' }), s.deps);
  assert.equal(foreign.status, 403);
  assert.deepEqual(await foreign.json(), { code: 'not_allowed' });
  const missing = await handleRequest(post({ framework: 'scrum' }, {}), s.deps);
  assert.equal(missing.status, 403);
  assert.equal(s.created.length, 0);
});

test('five rooms per minute per address, the sixth is rate limited, another address is not', async () => {
  const s = setup();
  const headers = { origin: Origin, 'cf-connecting-ip': '203.0.113.9' };
  for (let index = 0; index < config.room.createPerMinute; index += 1) {
    const ok = await handleRequest(post({ framework: 'scrum' }, headers), s.deps);
    assert.equal(ok.status, 200);
  }
  const sixth = await handleRequest(post({ framework: 'scrum' }, headers), s.deps);
  assert.equal(sixth.status, 429);
  assert.deepEqual(await sixth.json(), { code: 'rate_limited' });
  const other = await handleRequest(post({ framework: 'scrum' }, { origin: Origin, 'cf-connecting-ip': '203.0.113.10' }), s.deps);
  assert.equal(other.status, 200);
  assert.ok(!s.logs.join('').includes('203.0.113'));
});

test('a bad body is bad_request', async () => {
  const s = setup(100);
  for (const body of ['nope', { framework: 'waterfall' }, {}, { framework: 'scrum', extra: 1 }, 'x'.repeat(2000), '[]']) {
    const response = await handleRequest(post(body), s.deps);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { code: 'bad_request' });
  }
  assert.equal(s.created.length, 0);
});

test('the socket route forwards a valid code and refuses the rest', async () => {
  const s = setup();
  const upgrade = { upgrade: 'websocket' };
  const ok = await handleRequest(new Request('https://api.example/api/room/BCDFG/ws', { headers: upgrade }), s.deps);
  assert.equal(await ok.text(), 'forwarded');
  assert.deepEqual(s.forwarded, ['BCDFG']);
  for (const path of ['/api/room/ABCDE/ws', '/api/room/BCDF/ws', '/api/room/bcdfg/ws', '/api/room/BCDFGH/ws']) {
    const response = await handleRequest(new Request(`https://api.example${path}`, { headers: upgrade }), s.deps);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { code: 'room_not_found' });
  }
  const plain = await handleRequest(new Request('https://api.example/api/room/BCDFG/ws'), s.deps);
  assert.equal(plain.status, 426);
  const foreign = await handleRequest(
    new Request('https://api.example/api/room/BCDFG/ws', { headers: { ...upgrade, origin: 'https://evil.example' } }),
    s.deps,
  );
  assert.equal(foreign.status, 403);
  assert.equal(s.forwarded.length, 1);
});

test('the leaderboard answers both lists and may be cached for sixty seconds', async () => {
  const s = setup();
  const response = await handleRequest(new Request('https://api.example/api/room/leaderboard'), s.deps);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=60');
  const body = (await response.json()) as LeaderboardResponse;
  assert.deepEqual(Object.keys(body).sort(), ['allTime', 'month']);
});

test('anything else is a 404 with a code', async () => {
  const s = setup();
  const cases: [string, string][] = [
    ['GET', '/'],
    ['GET', '/api'],
    ['GET', '/api/room'],
    ['POST', '/api/room/leaderboard'],
    ['POST', '/api/room/BCDFG/ws'],
    ['GET', '/api/room/BCDFG'],
    ['DELETE', '/api/room'],
  ];
  for (const [method, path] of cases) {
    const response = await handleRequest(new Request(`https://api.example${path}`, { method }), s.deps);
    assert.equal(response.status, 404, `${method} ${path}`);
    assert.deepEqual(await response.json(), { code: 'bad_request' });
  }
});
