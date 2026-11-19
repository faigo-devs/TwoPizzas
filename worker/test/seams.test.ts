import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../../core/index.ts';
import { sha256Hex } from '../../core/sha256.ts';
import { Outbox } from '../src/outbox.ts';
import { SeatRegistry } from '../src/seats.ts';
import { SocketPolicy } from '../src/sockets.ts';
import { FakeLeaderboard, FakeSocket, entry, seededRandom } from './support.ts';

test('a seat is proven only by the token whose hash was bound', () => {
  const seats = new SeatRegistry();
  const { playerId, token } = seats.issue(seededRandom(1));
  assert.equal(seats.verify(playerId, token), false);
  seats.bind(playerId, token);
  assert.equal(seats.verify(playerId, token), true);
  assert.equal(seats.verify(playerId, `${token}x`), false);
  assert.equal(seats.verify('other', token), false);
  assert.equal(seats.verify(playerId, ''), false);
  assert.equal(seats.snapshot()[playerId], sha256Hex(token));
});

test('an unknown seat is refused even when the token is its own id', () => {
  const seats = new SeatRegistry();
  assert.equal(seats.verify('seat-a', 'seat-a'), false);
  assert.equal(seats.verify('__proto__', 'x'), false);
  assert.equal(seats.verify('constructor', 'x'), false);
});

test('pruning forgets the seats that are no longer players', () => {
  const seats = new SeatRegistry();
  seats.bind('a', 'ta');
  seats.bind('b', 'tb');
  assert.equal(seats.prune([{ id: 'a' }]), true);
  assert.deepEqual(Object.keys(seats.snapshot()), ['a']);
  assert.equal(seats.prune([{ id: 'a' }]), false);
});

test('the outbox keeps an entry queued while a delivery is awaited', async () => {
  const board = new FakeLeaderboard();
  const log: string[] = [];
  const outbox = new Outbox(board, (event) => log.push(event));
  outbox.init('id');
  const first = entry({ teamName: 'first-team' });
  const second = entry({ teamName: 'second-team' });
  outbox.queue(first, 100);
  const original = board.submit.bind(board);
  board.submit = async (id, sent) => {
    outbox.queue(second, 100);
    return original(id, sent);
  };
  assert.equal(await outbox.flush(100), false);
  assert.equal(outbox.snapshot()?.outbox, second);
  board.submit = original;
  assert.equal(await outbox.flush(100), true);
  assert.equal(outbox.snapshot()?.outbox, null);
  assert.deepEqual(
    board.submissions.map((own) => own.entry.teamName),
    ['first-team', 'second-team'],
  );
});

test('a failed delivery is retried later and a due time gates it', async () => {
  const board = new FakeLeaderboard();
  board.failing = true;
  const outbox = new Outbox(board, () => undefined);
  outbox.init('id');
  assert.equal(await outbox.flush(0), false);
  outbox.queue(entry(), 1000);
  assert.equal(await outbox.flush(999), false);
  assert.equal(await outbox.flush(1000), true);
  assert.ok((outbox.due()?.at ?? 0) > 1000);
  board.failing = false;
  assert.equal(await outbox.flush(outbox.due()?.at ?? 0), true);
  assert.equal(outbox.due(), null);
});

test('the socket policy counts messages per window and closes silent sockets', () => {
  const sockets: FakeSocket[] = [];
  const policy = new SocketPolicy(() => sockets, () => undefined);
  const socket = new FakeSocket();
  sockets.push(socket);
  const attachment = policy.attach(socket, 'c1', 'p1', 0);
  let limited = false;
  for (let count = 0; count <= config.room.messagesPerWindow; count += 1) limited = policy.overLimit(socket, attachment, 10);
  assert.equal(limited, true);
  assert.equal(policy.overLimit(socket, attachment, 10 + config.room.messageWindowMs), false);
  assert.deepEqual(policy.sweep(config.room.silenceMs + 20 + config.room.messageWindowMs), ['p1']);
  assert.equal(socket.closed?.code, 4002);
});
