import assert from 'node:assert/strict';
import { test } from 'node:test';
import { machine } from '../../core/index.ts';
import type { Action, ClientAction, Framework, RoomState } from '../../core/index.ts';
import { sha256Hex } from '../../core/sha256.ts';
import { defaultStyle, kanbanStyle, newRoom, playIteration, playLobby } from '../../core/test/machine-support.ts';
import { FakeSocket, Harness } from './support.ts';

const Players = 6;
const MeanBudgetMs = 25;
const MaxBudgetMs = 250;

interface Timings {
  actions: number;
  refused: number;
  totalMs: number[];
  cloneMs: number[];
  fingerprintMs: number[];
  viewsMs: number[];
}

function stats(values: number[]): { mean: number; p95: number; max: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  return { mean, p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0, max: sorted[sorted.length - 1] ?? 0 };
}

function line(name: string, values: number[]): string {
  const { mean, p95, max } = stats(values);
  return `${name} mean ${mean.toFixed(3)} ms, p95 ${p95.toFixed(3)} ms, max ${max.toFixed(3)} ms`;
}

function time<T>(body: () => T): [T, number] {
  const start = performance.now();
  const value = body();
  return [value, performance.now() - start];
}

async function replay(framework: Framework): Promise<Timings> {
  const seed = 5150 + (framework === 'kanban' ? 1 : 0);
  const room = newRoom({ seed, players: Players, framework });
  const initial: RoomState = structuredClone(room.state);
  room.checks = false;
  room.record = [];
  playLobby(room, Players);
  const style = framework === 'kanban' ? kanbanStyle : defaultStyle;
  playIteration(room, style);
  playIteration(room, style);
  const recorded: Action[] = room.record;

  const h = new Harness();
  const tokens: Record<string, string> = {};
  const tokenHashes: Record<string, string> = {};
  for (const player of initial.players) {
    tokens[player.id] = `token-${player.id}`;
    tokenHashes[player.id] = sha256Hex(tokens[player.id] as string);
  }
  await h.storage.put({
    state: initial,
    tokenHashes,
    meta: { publishId: 'bench', outbox: null, outboxAt: 0 },
  });
  h.clock = initial.now;
  h.hibernate();
  const sockets = new Map<string, FakeSocket>();
  for (const player of initial.players) {
    const socket = await h.connect();
    await h.send(socket, { t: 'hello', playerId: player.id, token: tokens[player.id] });
    sockets.set(player.id, socket);
  }

  const timings: Timings = { actions: 0, refused: 0, totalMs: [], cloneMs: [], fingerprintMs: [], viewsMs: [] };
  for (const action of recorded) {
    if (!('playerId' in action) || action.type.startsWith('server.')) continue;
    const socket = sockets.get(action.playerId);
    assert.ok(socket !== undefined);
    h.clock = Math.max(h.clock, action.now);
    h.pingAll();
    if (socket.attachment !== null) socket.attachment = { ...socket.attachment, count: 0 };
    const sample = h.state();
    const { playerId: _player, now: _now, ...client } = action;
    const before = socket.errors().length;
    const start = performance.now();
    await h.act(socket, client as ClientAction);
    timings.totalMs.push(performance.now() - start);
    timings.actions += 1;
    if (socket.errors().length > before) timings.refused += 1;
    timings.cloneMs.push(time(() => structuredClone(sample))[1] * 2);
    timings.fingerprintMs.push(time(() => JSON.stringify({ ...sample, now: 0 }))[1] * 2);
    timings.viewsMs.push(
      time(() => {
        for (const player of sample.players) JSON.stringify({ ...machine.viewFor(sample, player.id, h.clock), now: 0 });
      })[1],
    );
  }
  return timings;
}

for (const framework of ['scrum', 'kanban'] as const) {
  test(`a full six-player ${framework} game through the room handler stays within the cost budget`, async (t) => {
    const timings = await replay(framework);
    t.diagnostic(`${framework}: ${timings.actions} actions, ${timings.refused} refused`);
    t.diagnostic(line('handler per action', timings.totalMs));
    t.diagnostic(line('clone (two per action)', timings.cloneMs));
    t.diagnostic(line('fingerprint (two per action)', timings.fingerprintMs));
    t.diagnostic(line('views and their keys (six per action)', timings.viewsMs));
    assert.ok(timings.actions > 100);
    assert.ok(stats(timings.totalMs).mean < MeanBudgetMs, 'mean cost per action is over the budget');
    assert.ok(stats(timings.totalMs).max < MaxBudgetMs, 'slowest action is over the budget');
  });
}
