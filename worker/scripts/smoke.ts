import assert from 'node:assert/strict';

const Base = process.env.SMOKE_BASE ?? 'http://127.0.0.1:8787';
const Origin = process.env.SMOKE_ORIGIN ?? 'http://localhost:4321';
const Socket = Base.replace(/^http/, 'ws');

interface Message {
  t: string;
  playerId?: string;
  token?: string;
  code?: string;
  view?: { phase: { kind: string; step?: string }; selfId: string; controls: string[]; players: unknown[]; [key: string]: unknown };
}

class Client {
  socket: WebSocket;
  messages: Message[] = [];
  playerId = '';
  token = '';
  private waiters: (() => void)[] = [];

  constructor(code: string) {
    this.socket = new WebSocket(`${Socket}/api/room/${code}/ws`);
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as Message;
      this.messages.push(message);
      if (message.t === 'welcome') {
        this.playerId = message.playerId ?? '';
        this.token = message.token ?? '';
      }
      for (const wake of this.waiters.splice(0)) wake();
    });
  }

  async open(): Promise<void> {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise<void>((resolve, reject) => {
      this.socket.addEventListener('open', () => resolve(), { once: true });
      this.socket.addEventListener('error', () => reject(new Error('socket error')), { once: true });
    });
  }

  send(message: unknown): void {
    this.socket.send(JSON.stringify(message));
  }

  last(): NonNullable<Message['view']> {
    const views = this.messages.filter((message) => message.t === 'view');
    const view = views.at(-1)?.view;
    assert.ok(view !== undefined, 'no view yet');
    return view;
  }

  async until(check: () => boolean, label: string): Promise<void> {
    const deadline = Date.now() + 5000;
    while (!check()) {
      if (Date.now() > deadline) throw new Error(`timeout: ${label}`);
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve);
        setTimeout(resolve, 100);
      });
    }
  }
}

async function main(): Promise<void> {
  const created = await fetch(`${Base}/api/room`, {
    method: 'POST',
    headers: { origin: Origin, 'content-type': 'application/json' },
    body: JSON.stringify({ framework: 'scrum' }),
  });
  assert.equal(created.status, 200);
  const { code } = (await created.json()) as { code: string };
  assert.match(code, /^[BCDFGHJKLMNPRSTVWXZ]{5}$/);
  console.log('created a room, code of 5 letters');

  const foreign = await fetch(`${Base}/api/room`, {
    method: 'POST',
    headers: { origin: 'https://other.invalid' },
    body: JSON.stringify({ framework: 'scrum' }),
  });
  console.log('foreign origin status', foreign.status);

  const clients: Client[] = [];
  for (const name of ['Ana', 'Bob', 'Cleo']) {
    const client = new Client(code);
    await client.open();
    client.send({ t: 'hello', name });
    await client.until(() => client.messages.some((message) => message.t === 'view'), `view of ${name}`);
    clients.push(client);
  }
  const [host, second, third] = clients as [Client, Client, Client];
  console.log('three players seated, players in view:', host.last().players.length);

  host.send({ t: 'do', action: { type: 'lobby.start' } });
  await host.until(() => host.last().phase.kind === 'plan', 'plan phase');
  console.log('phase after start:', host.last().phase.kind, host.last().phase.step ?? '');

  const reconnect = new Client(code);
  await reconnect.open();
  reconnect.send({ t: 'hello', playerId: second.playerId, token: second.token });
  await reconnect.until(() => reconnect.messages.some((message) => message.t === 'view'), 'reconnect view');
  assert.equal(reconnect.last().selfId, second.playerId);
  console.log('reconnected with id and token, got the seat back');

  const intruder = new Client(code);
  await intruder.open();
  intruder.send({ t: 'hello', playerId: third.playerId, token: 'wrong-token' });
  await intruder.until(() => intruder.messages.some((message) => message.t === 'error'), 'refusal');
  console.log('wrong token answered:', intruder.messages.find((message) => message.t === 'error')?.code);

  const missing = new Client('BCDFB');
  await missing.open().catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log('unknown room answered:', missing.messages.find((message) => message.t === 'error')?.code ?? 'closed');

  const board = await fetch(`${Base}/api/room/leaderboard`);
  console.log('leaderboard', board.status, board.headers.get('cache-control'));

  for (const client of [...clients, reconnect, intruder, missing]) client.socket.close();
  console.log('smoke test passed');
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error('smoke test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
