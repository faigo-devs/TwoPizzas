import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { CloseCodes } from '../../../core/index.ts';
import {
  act,
  answerCheck,
  createRoom,
  dismissToast,
  entryFor,
  failureOf,
  joinRoom,
  leave,
  normalCode,
  setLanguage,
  setScriptStep,
  skipAhead,
  startLocal,
  startTour,
  takeSeatHere,
  tourGo,
} from '../controller.ts';
import { store } from '../store.ts';
import { fakeView, stubGlobals } from './support.ts';
import type { GlobalStubs } from './support.ts';

const Code = 'BCDFG';
let stubs: GlobalStubs;

function respond(body: unknown, ok = true): void {
  Object.defineProperty(globalThis, 'fetch', {
    value: async () => ({ ok, json: async () => body }),
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  stubs = stubGlobals();
  leave();
});

afterEach(() => {
  leave();
  stubs.restore();
});

describe('room code and failure parsing', () => {
  it('normalises a typed code and refuses a malformed one', () => {
    assert.equal(normalCode(' bcdfg '), Code);
    for (const bad of ['', 'ABCDE', 'BCDF', 'BCDFGH', 'bcd1g']) assert.equal(normalCode(bad), null, bad);
  });

  it('takes the error code from a body, from either key, else bad_request', () => {
    assert.equal(failureOf({ code: 'room_full' }), 'room_full');
    assert.equal(failureOf({ error: 'rate_limited' }), 'rate_limited');
    assert.equal(failureOf({ code: 'zzz', error: 'removed' }), 'removed');
    for (const bad of [null, 'x', 4, {}, { code: 'zzz' }]) assert.equal(failureOf(bad), 'bad_request');
  });

  it('chooses how the page begins', () => {
    const seat = { code: Code, playerId: 'p', token: 't' };
    assert.deepEqual(entryFor('?local=1', null), { kind: 'local', framework: 'scrum' });
    assert.deepEqual(entryFor('?local=1&framework=kanban', seat), { kind: 'local', framework: 'kanban' });
    assert.deepEqual(entryFor('?local=1&framework=other', null), { kind: 'local', framework: 'scrum' });
    assert.deepEqual(entryFor('?local=2', seat), { kind: 'resume', seat });
    assert.deepEqual(entryFor('', null), { kind: 'start' });
  });
});

describe('joining a room', () => {
  it('shows codeShape for a malformed code and opens no socket', () => {
    joinRoom('nope');
    assert.equal(store.get().startError, 'codeShape');
    assert.equal(stubs.sockets.length, 0);
  });

  it('connects, then welcome, view, toast and a fatal error move the store', () => {
    joinRoom(` ${Code.toLowerCase()} `);
    assert.equal(store.get().mode, 'remote');
    assert.equal(store.get().status, 'connecting');
    assert.equal(store.get().busy, 'join');
    const socket = stubs.sockets[0]!;
    assert.ok(socket.url.endsWith(`/api/room/${Code}/ws`));
    socket.open();
    socket.receive({ t: 'welcome', playerId: 'p1', token: 'tk' });
    assert.equal(store.get().status, 'open');
    assert.equal(store.get().busy, null);
    assert.deepEqual(JSON.parse(stubs.storage.get('lg-seat')!), { code: Code, playerId: 'p1', token: 'tk' });
    socket.receive({ t: 'view', view: fakeView(5000) });
    assert.equal(store.get().view?.now, 5000);
    assert.equal(store.get().clock?.server, 5000);
    socket.receive({ t: 'error', code: 'not_allowed' });
    assert.equal(store.get().toast?.code, 'not_allowed');
    const first = store.get().toast!.id;
    socket.receive({ t: 'error', code: 'bad_request' });
    assert.ok(store.get().toast!.id > first);
    dismissToast();
    assert.equal(store.get().toast, null);
    socket.receive({ t: 'error', code: 'removed' });
    assert.equal(store.get().startError, 'removed');
    assert.equal(store.get().mode, null);
    assert.equal(store.get().status, 'idle');
    assert.equal(store.get().view, null);
    assert.equal(stubs.storage.has('lg-seat'), false);
  });

  it('reuses a kept seat for the same code only', () => {
    stubs.storage.set('lg-seat', JSON.stringify({ code: Code, playerId: 'p1', token: 'tk' }));
    joinRoom(Code);
    assert.equal(stubs.sockets[0]!.protocols.length, 2);
    leave();
    stubs.storage.set('lg-seat', JSON.stringify({ code: 'XXXXX', playerId: 'p1', token: 'tk' }));
    joinRoom(Code);
    assert.equal(stubs.sockets[1]!.protocols.length, 1);
  });

  it('notes a lost connection, then that it is back, then drops the note', () => {
    joinRoom(Code);
    const socket = stubs.sockets[0]!;
    socket.open();
    socket.receive({ t: 'welcome', playerId: 'p1', token: 'tk' });
    socket.drop(1006);
    assert.equal(store.get().status, 'reconnecting');
    assert.equal(store.get().connectionNote, 'lost');
    stubs.tickTimeouts();
    const again = stubs.sockets[1]!;
    again.open();
    again.receive({ t: 'welcome', playerId: 'p1', token: 'tk' });
    assert.equal(store.get().status, 'open');
    assert.equal(store.get().connectionNote, 'back');
    stubs.tickTimeouts();
    assert.equal(store.get().connectionNote, null);
  });

  it('shows elsewhere when the seat is taken in another tab', () => {
    joinRoom(Code);
    const socket = stubs.sockets[0]!;
    socket.open();
    socket.receive({ t: 'welcome', playerId: 'p1', token: 'tk' });
    socket.drop(CloseCodes.replaced);
    assert.equal(store.get().status, 'elsewhere');
    assert.equal(store.get().mode, 'remote');
  });

  it('takeSeatHere reconnects with the kept seat or leaves when there is none', () => {
    takeSeatHere();
    assert.equal(store.get().mode, null);
    stubs.storage.set('lg-seat', JSON.stringify({ code: Code, playerId: 'p1', token: 'tk' }));
    takeSeatHere();
    assert.equal(store.get().mode, 'remote');
    assert.equal(stubs.sockets.length, 1);
  });

  it('sends actions through the transport and says so after a submit', () => {
    joinRoom(Code);
    const socket = stubs.sockets[0]!;
    socket.open();
    socket.receive({ t: 'welcome', playerId: 'p1', token: 'tk' });
    act({ type: 'item.submit', itemId: '#1', response: { kind: 'review', keys: [] } });
    assert.equal(JSON.parse(socket.sent.at(-1)!).action.type, 'item.submit');
    assert.notEqual(store.get().said, null);
    stubs.tickTimeouts();
    assert.equal(store.get().said, null);
    leave();
    act({ type: 'lobby.start' });
    assert.equal(socket.sent.length, 2);
  });
});

describe('creating a room', () => {
  it('connects with the code the server returns', async () => {
    respond({ code: Code });
    await createRoom('kanban');
    assert.equal(store.get().mode, 'remote');
    assert.ok(stubs.sockets[0]!.url.includes(Code));
  });

  it('maps a refusal, a malformed code and a network failure to start errors', async () => {
    respond({ error: 'rate_limited' }, false);
    await createRoom('scrum');
    assert.equal(store.get().startError, 'rate_limited');
    assert.equal(store.get().busy, null);
    respond({ code: 'bad' });
    await createRoom('scrum');
    assert.equal(store.get().startError, 'bad_request');
    Object.defineProperty(globalThis, 'fetch', {
      value: async () => {
        throw new Error('offline');
      },
      configurable: true,
      writable: true,
    });
    await createRoom('scrum');
    assert.equal(store.get().startError, 'network');
    assert.equal(stubs.sockets.length, 0);
  });
});

describe('local and tour modes', () => {
  it('starts the local game open with a view, and leave closes it', () => {
    startLocal('kanban');
    assert.equal(store.get().mode, 'local');
    assert.equal(store.get().status, 'open');
    assert.equal(store.get().view?.framework, 'kanban');
    skipAhead();
    leave();
    assert.equal(store.get().mode, null);
    assert.equal(stubs.pending.size, 0);
  });

  it('starts the tour on its first step and clamps tourGo', () => {
    startTour('scrum');
    assert.equal(store.get().mode, 'tour');
    assert.equal(store.get().tourStep, 0);
    assert.notEqual(store.get().view, null);
    tourGo(-4);
    assert.equal(store.get().tourStep, 0);
    tourGo(2);
    assert.equal(store.get().tourStep, 2);
    tourGo(999);
    assert.ok(store.get().tourStep < 999);
  });

  it('keeps small state setters simple', () => {
    setScriptStep(3);
    assert.equal(store.get().scriptStep, 3);
    answerCheck('q1', 2);
    answerCheck('q2', 0);
    assert.deepEqual(store.get().learn, { q1: 2, q2: 0 });
    setLanguage('en');
    assert.equal(store.get().lang, 'en');
    assert.equal(stubs.storage.get('lg-lang'), 'en');
  });
});
