import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CloseCodes, config } from '../../../core/index.ts';
import { createRemoteTransport, parseIncoming, socketUrl } from '../transport/remote.ts';
import { fakeView, harness } from './support.ts';

const Code = 'BCDFG';
const NoSeat = { code: Code, playerId: null, token: null };
const Held = { code: Code, playerId: 'p1', token: 'tok' };

describe('parseIncoming', () => {
  it('reads a welcome with and without a token', () => {
    assert.deepEqual(parseIncoming('{"t":"welcome","playerId":"p1","token":"x"}'), { t: 'welcome', playerId: 'p1', token: 'x' });
    assert.deepEqual(parseIncoming('{"t":"welcome","playerId":"p1"}'), { t: 'welcome', playerId: 'p1', token: null });
  });

  it('reads a view and a known error code', () => {
    assert.deepEqual(parseIncoming('{"t":"view","view":{"now":5}}'), { t: 'view', view: { now: 5 } });
    assert.deepEqual(parseIncoming('{"t":"error","code":"room_full"}'), { t: 'error', code: 'room_full' });
  });

  it('refuses everything else', () => {
    for (const bad of [
      42,
      null,
      '',
      'not json',
      'null',
      '[]',
      '7',
      '{"t":"welcome"}',
      '{"t":"welcome","playerId":3}',
      '{"t":"welcome","playerId":"p","token":4}',
      '{"t":"view","view":null}',
      '{"t":"view","view":"x"}',
      '{"t":"error","code":"nope"}',
      '{"t":"error"}',
      '{"t":"other"}',
    ]) {
      assert.equal(parseIncoming(bad), null, String(bad));
    }
  });
});

describe('socketUrl', () => {
  it('follows the page scheme', () => {
    assert.equal(socketUrl(Code, { protocol: 'https:', host: 'h' }), `wss://h/api/room/${Code}/ws`);
    assert.equal(socketUrl(Code, { protocol: 'http:', host: 'h:1' }), `ws://h:1/api/room/${Code}/ws`);
  });
});

describe('remote transport', () => {
  it('connects, says hello and reports open on the welcome', () => {
    const h = harness();
    const transport = createRemoteTransport(NoSeat, h.handlers, h.env);
    transport.start();
    assert.deepEqual(h.statuses, ['connecting']);
    const socket = h.sockets[0]!;
    assert.equal(socket.url, `wss://example.test/api/room/${Code}/ws`);
    socket.open();
    assert.deepEqual(JSON.parse(socket.sent[0]!), { t: 'hello' });
    socket.receive({ t: 'welcome', playerId: 'p9', token: 'secret' });
    assert.deepEqual(h.statuses, ['connecting', 'open']);
    assert.deepEqual(h.written, [{ code: Code, playerId: 'p9', token: 'secret' }]);
    socket.receive({ t: 'view', view: fakeView() });
    assert.equal(h.views.length, 1);
    assert.equal(transport.kind, 'remote');
  });

  it('offers the protocol alone without a seat and with the seat when one is held', () => {
    const bare = harness();
    createRemoteTransport(NoSeat, bare.handlers, bare.env).start();
    assert.deepEqual(bare.sockets[0]!.protocols, [config.room.protocol]);
    const kept = harness();
    createRemoteTransport(Held, kept.handlers, kept.env).start();
    assert.deepEqual(kept.sockets[0]!.protocols, [config.room.protocol, `${config.room.seatPrefix}p1.tok`]);
    kept.sockets[0]!.open();
    assert.deepEqual(JSON.parse(kept.sockets[0]!.sent[0]!), { t: 'hello', playerId: 'p1', token: 'tok' });
  });

  it('keeps the old token when a welcome carries none', () => {
    const h = harness();
    createRemoteTransport(Held, h.handlers, h.env).start();
    h.sockets[0]!.open();
    h.sockets[0]!.receive({ t: 'welcome', playerId: 'p1' });
    assert.deepEqual(h.written, [Held]);
  });

  it('sends actions only while the socket is open', () => {
    const h = harness();
    const transport = createRemoteTransport(NoSeat, h.handlers, h.env);
    transport.start();
    transport.send({ type: 'lobby.start' });
    assert.deepEqual(h.errors, [{ code: 'network', fatal: false }]);
    h.sockets[0]!.open();
    transport.send({ type: 'lobby.start' });
    assert.deepEqual(JSON.parse(h.sockets[0]!.sent[1]!), { t: 'do', action: { type: 'lobby.start' } });
  });

  it('pings on its interval and stops pinging once closed', () => {
    const h = harness();
    const transport = createRemoteTransport(NoSeat, h.handlers, h.env);
    transport.start();
    h.sockets[0]!.open();
    const interval = [...h.timers.values()].find((timer) => timer.every)!;
    assert.equal(interval.ms, config.room.pingIntervalMs);
    h.fireInterval();
    assert.equal(h.sockets[0]!.sent.at(-1), 'ping');
    transport.close();
    assert.equal([...h.timers.values()].filter((timer) => timer.every).length, 0);
  });

  it('reconnects with growing back-off after a drop and shows reconnecting', () => {
    const h = harness();
    createRemoteTransport(Held, h.handlers, h.env).start();
    h.sockets[0]!.open();
    h.sockets[0]!.receive({ t: 'welcome', playerId: 'p1', token: 'tok' });
    h.sockets[0]!.drop(1006);
    assert.equal(h.statuses.at(-1), 'reconnecting');
    assert.equal(h.fireTimeout(), 500);
    assert.equal(h.sockets.length, 2);
    h.sockets[1]!.drop(1006);
    assert.equal(h.fireTimeout(), 1000);
    h.sockets[2]!.drop(1006);
    assert.equal(h.fireTimeout(), 2000);
    assert.equal(h.errors.length, 0);
    h.sockets[3]!.open();
    h.sockets[3]!.receive({ t: 'welcome', playerId: 'p1', token: 'tok' });
    assert.equal(h.statuses.at(-1), 'open');
    h.sockets[3]!.drop(1006);
    assert.equal(h.fireTimeout(), 500);
  });

  it('caps the back-off', () => {
    const h = harness();
    createRemoteTransport(Held, h.handlers, h.env).start();
    h.sockets[0]!.open();
    h.sockets[0]!.receive({ t: 'welcome', playerId: 'p1', token: 'tok' });
    let last = 0;
    for (let index = 0; index < 12; index += 1) {
      h.sockets.at(-1)!.drop(1006);
      last = h.fireTimeout();
    }
    assert.equal(last, 10_000);
  });

  it('gives up with a fatal network error when never welcomed', () => {
    const h = harness();
    createRemoteTransport(NoSeat, h.handlers, h.env).start();
    h.sockets[0]!.drop(1006);
    h.fireTimeout();
    h.sockets[1]!.drop(1006);
    h.fireTimeout();
    h.sockets[2]!.drop(1006);
    assert.deepEqual(h.errors, [{ code: 'network', fatal: true }]);
    assert.equal(h.statuses.at(-1), 'closed');
    assert.equal(h.timers.size, 0);
    assert.equal(h.cleared, 0);
  });

  it('treats a throwing socket constructor as a failed attempt', () => {
    const h = harness();
    h.env.openSocket = () => {
      throw new Error('blocked');
    };
    createRemoteTransport(NoSeat, h.handlers, h.env).start();
    h.fireTimeout();
    h.fireTimeout();
    assert.deepEqual(h.errors, [{ code: 'network', fatal: true }]);
  });

  it('stops without reconnecting when the seat is taken elsewhere', () => {
    const h = harness();
    createRemoteTransport(Held, h.handlers, h.env).start();
    h.sockets[0]!.open();
    h.sockets[0]!.receive({ t: 'welcome', playerId: 'p1', token: 'tok' });
    h.sockets[0]!.drop(CloseCodes.replaced);
    assert.equal(h.statuses.at(-1), 'elsewhere');
    assert.equal(h.timers.size, 0);
    assert.equal(h.sockets.length, 1);
    assert.equal(h.cleared, 0);
    assert.equal(h.errors.length, 0);
  });

  it('fails fatally, clears the seat and never reconnects when removed', () => {
    const h = harness();
    createRemoteTransport(Held, h.handlers, h.env).start();
    h.sockets[0]!.open();
    h.sockets[0]!.receive({ t: 'welcome', playerId: 'p1', token: 'tok' });
    h.sockets[0]!.drop(CloseCodes.removed);
    assert.deepEqual(h.errors, [{ code: 'removed', fatal: true }]);
    assert.equal(h.statuses.at(-1), 'closed');
    assert.equal(h.cleared, 1);
    assert.equal(h.timers.size, 0);
    assert.equal(h.sockets.length, 1);
  });

  it('clears the seat on room_not_found, even before a welcome', () => {
    const h = harness();
    createRemoteTransport(Held, h.handlers, h.env).start();
    h.sockets[0]!.open();
    h.sockets[0]!.receive({ t: 'error', code: 'room_not_found' });
    assert.deepEqual(h.errors, [{ code: 'room_not_found', fatal: true }]);
    assert.equal(h.cleared, 1);
    assert.equal(h.statuses.at(-1), 'closed');
    assert.equal(h.sockets[0]!.closedWith, 1000);
  });

  it('treats an error before the welcome as fatal and one after as a toast', () => {
    const early = harness();
    createRemoteTransport(NoSeat, early.handlers, early.env).start();
    early.sockets[0]!.open();
    early.sockets[0]!.receive({ t: 'error', code: 'room_full' });
    assert.deepEqual(early.errors, [{ code: 'room_full', fatal: true }]);
    assert.equal(early.cleared, 0);
    const late = harness();
    createRemoteTransport(NoSeat, late.handlers, late.env).start();
    late.sockets[0]!.open();
    late.sockets[0]!.receive({ t: 'welcome', playerId: 'p', token: 't' });
    late.sockets[0]!.receive({ t: 'error', code: 'not_allowed' });
    assert.deepEqual(late.errors, [{ code: 'not_allowed', fatal: false }]);
    assert.equal(late.statuses.at(-1), 'open');
  });

  it('counts a first view as a welcome', () => {
    const h = harness();
    createRemoteTransport(NoSeat, h.handlers, h.env).start();
    h.sockets[0]!.open();
    h.sockets[0]!.receive({ t: 'view', view: fakeView() });
    h.sockets[0]!.drop(1006);
    assert.equal(h.statuses.at(-1), 'reconnecting');
  });

  it('ignores junk frames and events from a replaced socket', () => {
    const h = harness();
    createRemoteTransport(NoSeat, h.handlers, h.env).start();
    const first = h.sockets[0]!;
    first.open();
    first.receive('garbage');
    assert.equal(h.events.length, 1);
    first.drop(1006);
    h.fireTimeout();
    first.receive({ t: 'view', view: fakeView() });
    assert.equal(h.views.length, 0);
  });

  it('close ends everything and detaches the socket', () => {
    const h = harness();
    const transport = createRemoteTransport(NoSeat, h.handlers, h.env);
    transport.start();
    const socket = h.sockets[0]!;
    socket.open();
    transport.close();
    assert.equal(socket.closedWith, 1000);
    assert.equal(socket.onmessage, null);
    assert.equal(h.timers.size, 0);
    socket.onclose?.({ code: 1006 });
    assert.equal(h.sockets.length, 1);
  });

  it('closes a socket that errors so the drop path runs', () => {
    const h = harness();
    createRemoteTransport(NoSeat, h.handlers, h.env).start();
    h.sockets[0]!.onerror?.();
    assert.equal(h.sockets[0]!.closedWith, 1005);
  });
});
