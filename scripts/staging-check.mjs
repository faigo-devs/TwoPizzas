import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const WS = require('../worker/node_modules/ws');
const base = new URL(process.argv[2]);
const site = /site: '([^']+)'/.exec(readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8'))?.[1];
if (site === undefined || new URL(site).hostname === base.hostname) {
  console.error('Refused: this test creates rooms and floods sockets; run it only against a staging host, never the published one.');
  process.exit(2);
}
const secure = base.protocol === 'https:';
const origin = process.env.ORIGIN ?? base.origin;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (m) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)} s] ${m}`);
const results = [];
const verdict = (name, pass, detail) => { results.push(pass); log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`); };
const api = (path, init = {}) => fetch(new URL(path, base), { ...init, headers: { origin, 'content-type': 'application/json', ...(init.headers ?? {}) } });
const create = async () => (await (await api('/api/room', { method: 'POST', body: '{"framework":"scrum"}' })).json()).code;
const wsUrl = (code) => `${secure ? 'wss' : 'ws'}://${base.host}/api/room/${code}/ws`;

function open(code, seat = null) {
  const protocols = seat === null ? ['lgtm.v1'] : ['lgtm.v1', `seat.${seat.playerId}.${seat.token}`];
  const ws = new WS(wsUrl(code), protocols, { headers: { origin } });
  const c = { ws, msgs: [], status: null, closed: null, selected: null };
  c.ready = new Promise((res) => {
    ws.on('open', () => { c.selected = ws.protocol; res(true); });
    ws.on('unexpected-response', (_q, r) => { c.status = r.statusCode; res(false); });
    ws.on('error', () => res(false));
  });
  ws.on('message', (d) => c.msgs.push(d.toString()));
  ws.on('close', (closeCode, reason) => { c.closed = { code: closeCode, reason: reason.toString(), at: Date.now() }; });
  const parse = () => c.msgs.map((m) => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
  c.send = (o) => ws.send(JSON.stringify(o));
  c.welcome = () => parse().find((m) => m.t === 'welcome');
  c.lastView = () => parse().filter((m) => m.t === 'view').pop()?.view;
  c.errors = () => parse().filter((m) => m.t === 'error').map((m) => m.code);
  c.firstWelcomeMs = async (limit) => {
    const s = Date.now();
    while (!c.welcome() && Date.now() - s < limit) await sleep(20);
    return c.welcome() ? Date.now() - s : null;
  };
  return c;
}

function rawSocket() {
  const port = Number(base.port || (secure ? 443 : 80));
  const s = secure ? tls.connect({ host: base.hostname, port, servername: base.hostname }) : net.connect(port, base.hostname);
  return new Promise((resolve) => s.once(secure ? 'secureConnect' : 'connect', () => resolve(s)));
}

function upgradeText(code, header) {
  const key = crypto.randomBytes(16).toString('base64');
  const protocol = header === null ? '' : `Sec-WebSocket-Protocol: ${header}\r\n`;
  return `GET /api/room/${code}/ws HTTP/1.1\r\nHost: ${base.host}\r\nOrigin: ${origin}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n${protocol}\r\n`;
}

async function stalled(code) {
  const s = await rawSocket();
  s.write(upgradeText(code, 'lgtm.v1'));
  let buf = '';
  s.on('data', (d) => { buf += d.toString('latin1'); s.pause(); });
  s.on('error', () => {});
  await sleep(400);
  return { s, status: /^HTTP\/1.1 (\d+)/.exec(buf)?.[1] ?? 'none' };
}

async function rawHeader(code, header) {
  const s = await rawSocket();
  s.write(upgradeText(code, header));
  let buf = '';
  s.on('data', (d) => { buf += d.toString('latin1'); });
  s.on('error', () => {});
  await sleep(800);
  s.destroy();
  return { status: /^HTTP\/1.1 (\d+)/.exec(buf)?.[1] ?? 'none', protocol: /sec-websocket-protocol: ([^\r\n]*)/i.exec(buf)?.[1] ?? null, buf };
}

async function probeSeat(code, seat) {
  const c = open(code, seat);
  const ok = await c.ready;
  let res = `HTTP ${c.status}`;
  let ms = null;
  if (ok) {
    ms = await c.firstWelcomeMs(3000);
    res = ms !== null ? 'in' : 'no welcome';
  }
  try { c.ws.close(); } catch { /* closed already */ }
  return { res, ms };
}

async function probeStranger(code) {
  const c = open(code);
  const ok = await c.ready;
  if (ok) {
    c.send({ t: 'hello', name: 'S' });
    await sleep(500);
  }
  const res = ok && c.welcome() ? 'in' : `HTTP ${c.status} ${c.errors()}`;
  try { c.ws.close(); } catch { /* closed already */ }
  return res;
}

log(`base ${base.origin}, origin header ${origin}`);
const board = await api('/api/room/leaderboard');
verdict('leaderboard route', board.status === 200 && /max-age=60/.test(board.headers.get('cache-control') ?? ''), `status ${board.status}, cache-control ${board.headers.get('cache-control')}`);

const code = await create();
const host = open(code);
await host.ready;
host.send({ t: 'hello', name: 'Host' });
await sleep(800);
const hw = host.welcome();
verdict('handshake selects the game protocol only', host.selected === 'lgtm.v1', `selected "${host.selected}"`);
verdict('token only on first welcome', !!hw?.token, 'first welcome carries a token');

let seatSocket = open(code, hw);
await seatSocket.ready;
const ms = await seatSocket.firstWelcomeMs(3000);
verdict('seat in the handshake: welcome first, no token, no hello', ms !== null && seatSocket.welcome().token === undefined && seatSocket.selected === 'lgtm.v1', `welcome after ${ms} ms, ${JSON.stringify(seatSocket.welcome())}, selected "${seatSocket.selected}"`);

const wrong = open(code, { playerId: hw.playerId, token: 'x'.repeat(32) });
await wrong.ready;
await sleep(1200);
verdict('wrong token is a silent stranger', !wrong.welcome() && wrong.closed === null && wrong.errors().length === 0, `welcome ${!!wrong.welcome()}, closed ${JSON.stringify(wrong.closed)}`);
try { wrong.ws.close(); } catch { /* closed already */ }

const h1 = await rawHeader(code, null);
const h2 = await rawHeader(code, 'foo');
const h3 = await rawHeader(code, `lgtm.v1, seat.${hw.playerId}.${hw.token}`);
verdict('no protocol header: plain 101 without a selection', h1.status === '101' && h1.protocol === null, `status ${h1.status}, protocol ${h1.protocol}`);
verdict('header without the game name: 400', h2.status === '400', `status ${h2.status}`);
verdict('response never echoes the seat entry', h3.status === '101' && h3.protocol === 'lgtm.v1' && !h3.buf.includes(hw.token), `status ${h3.status}, protocol ${h3.protocol}`);

seatSocket = open(code, hw);
await seatSocket.ready;
await seatSocket.firstWelcomeMs(3000);
const keep = setInterval(() => { try { seatSocket.ws.send('ping'); } catch { /* closed already */ } }, 25_000);

log('phase P: personal pause in a started game');
const pcode = await create();
const pl = [];
for (const n of ['P1', 'P2', 'P3']) {
  const c = open(pcode);
  await c.ready;
  c.send({ t: 'hello', name: n });
  await sleep(700);
  pl.push(c);
}
pl[1].send({ t: 'do', action: { type: 'player.pause', minutes: 5 } });
await sleep(700);
verdict('pause is refused in the lobby', pl[1].errors().includes('not_allowed'), JSON.stringify(pl[1].errors()));
pl[0].send({ t: 'do', action: { type: 'lobby.start' } });
await sleep(1000);
const before = pl[1].errors().length;
for (const minutes of [0, 16, 1.5, '5']) pl[1].send({ t: 'do', action: { type: 'player.pause', minutes } });
await sleep(1500);
verdict('bad pause lengths are refused', pl[1].errors().length - before === 4, `${pl[1].errors().length - before} of 4 refused`);
pl[1].send({ t: 'do', action: { type: 'player.pause', minutes: 5 } });
await sleep(800);
const pv = pl[0].lastView();
const pausedUntil = pv?.players.find((p) => p.id === pl[1].welcome().playerId)?.pausedUntil ?? null;
verdict('pause is visible to the team and about 5 minutes long', pausedUntil !== null && Math.abs((pausedUntil - pv.now) / 60000 - 5) < 0.5, pausedUntil === null ? 'no pausedUntil' : `${((pausedUntil - pv.now) / 60000).toFixed(2)} min`);
const pw = pl[1].welcome();
const back = open(pcode, pw);
await back.ready;
await back.firstWelcomeMs(3000);
await sleep(800);
const cleared = pl[0].lastView()?.players.find((p) => p.id === pw.playerId)?.pausedUntil === null;
verdict('returning through the seat clears the pause', cleared, `cleared ${cleared}`);
for (const c of [...pl, back]) try { c.ws.close(); } catch { /* closed already */ }

log('phase A: 66 stalled sockets (never read, never answer a close) in the room with the seated player');
const codes = {};
for (let i = 0; i < 66; i += 1) {
  const z = await stalled(code);
  codes[z.status] = (codes[z.status] ?? 0) + 1;
}
log(`upgrade statuses while filling: ${JSON.stringify(codes)}`);
let worst = 0;
let failures = 0;
for (let i = 0; i < 20; i += 1) {
  const r = await probeSeat(code, hw);
  if (r.res !== 'in') failures += 1;
  else worst = Math.max(worst, r.ms);
  await sleep(2000);
}
verdict('seated player gets in during the attack', failures === 0 && worst <= 2000, `20 reconnects, ${failures} failed, slowest welcome ${worst} ms (pass: none failed, 2000 ms or less)`);
const stranger = await probeStranger(code);
verdict('a stranger can still join below the backstop', stranger === 'in' || /room_locked|room_full|already_started/.test(stranger), stranger);
seatSocket = open(code, hw);
await seatSocket.ready;
await seatSocket.firstWelcomeMs(3000);

log('phase B: 5 stalled sockets held for 300 s; count alarm invocations of this room in the same window (see the notes)');
for (let i = 0; i < 5; i += 1) await stalled(code);
log(`phase B started ${new Date().toISOString()}`);
await sleep(300_000);
log(`phase B ended ${new Date().toISOString()}`);
const still = await probeSeat(code, hw);
verdict('room healthy after phase B', still.res === 'in', JSON.stringify(still));

log('phase C: 130 upgrades to a room that does not exist, to see the per-address limit');
let first429 = null;
for (let i = 1; i <= 130; i += 1) {
  const c = open('BCDFG');
  const ok = await c.ready;
  if (!ok && c.status === 429 && first429 === null) first429 = i;
  try { c.ws.close(); } catch { /* closed already */ }
}
verdict('upgrade limit answers 429', first429 !== null && first429 >= 60 && first429 <= 125, `first 429 at upgrade ${first429} (pass: between 60 and 125; limit is 120 per minute and approximate)`);

log('phase D: 100 leaderboard reads in a few seconds');
const t1 = Date.now();
const bodies = new Set();
for (let i = 0; i < 100; i += 1) bodies.add(await (await api('/api/room/leaderboard')).text());
verdict('leaderboard reads', bodies.size === 1, `${bodies.size} distinct bodies in ${((Date.now() - t1) / 1000).toFixed(1)} s (check the Leaderboard object's request count: pass is 5 or fewer)`);
clearInterval(keep);
log(results.every(Boolean) ? 'ALL AUTOMATIC CHECKS PASSED' : 'SOME AUTOMATIC CHECKS FAILED');
process.exit(results.every(Boolean) ? 0 : 1);
