import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../../core/index.ts';
import { LeaderboardStore, parseEntry } from '../src/leaderboard.ts';
import { entry, sqlPort } from './support.ts';

const November = Date.UTC(2026, 10, 15);

function store(now = November): { store: LeaderboardStore; clock: { now: number } } {
  const clock = { now };
  return { store: new LeaderboardStore(sqlPort(), () => clock.now), clock };
}

function rowCount(board: LeaderboardStore): number {
  const sql = (board as unknown as { sql: { exec(query: string): { toArray(): { n: number }[] } } }).sql;
  return Number(sql.exec('SELECT COUNT(*) AS n FROM entries').toArray()[0]?.n);
}

test('an entry is accepted once per room', () => {
  const { store: board } = store();
  assert.equal(board.submit('room-a', entry()), true);
  assert.equal(board.submit('room-a', entry({ score: 99 })), false);
  const top = board.top();
  assert.equal(top.allTime.scrum.length, 1);
  assert.equal(top.allTime.scrum[0]?.score, 30);
  assert.deepEqual(top.allTime.kanban, []);
});

test('invalid entries are refused and unknown fields are dropped', () => {
  const { store: board } = store();
  const bad: unknown[] = [
    null,
    'x',
    entry({ framework: 'waterfall' as never }),
    entry({ teamName: '' }),
    entry({ teamName: 'x'.repeat(41) }),
    entry({ players: 0 }),
    entry({ players: 7 }),
    entry({ score: -1 }),
    entry({ score: 1.5 }),
    entry({ escapedDefects: -2 }),
    entry({ averageCycleMs: -1 }),
    entry({ averageCycleMs: Number.NaN }),
    entry({ date: '15/11/2026' }),
  ];
  for (const value of bad) assert.equal(board.submit('room-x', value), false);
  assert.deepEqual(board.top().allTime.scrum, []);
  assert.equal('extra' in (parseEntry({ ...entry(), extra: 1 }) ?? { extra: 1 }), false);
});

test('scrum order: score, fewer escaped defects, earlier date, earlier entry', () => {
  const { store: board } = store();
  board.submit('1', entry({ teamName: 'low', score: 10 }));
  board.submit('2', entry({ teamName: 'high-defects', score: 40, escapedDefects: 2 }));
  board.submit('3', entry({ teamName: 'high-clean', score: 40, escapedDefects: 0 }));
  board.submit('4', entry({ teamName: 'tie-late', score: 25, date: '2026-11-14' }));
  board.submit('5', entry({ teamName: 'tie-first', score: 25, date: '2026-11-10' }));
  board.submit('6', entry({ teamName: 'tie-second', score: 25, date: '2026-11-10' }));
  const names = board.top().allTime.scrum.map((row) => row.teamName);
  assert.deepEqual(names, ['high-clean', 'high-defects', 'tie-first', 'tie-second', 'tie-late', 'low']);
});

test('kanban breaks the last tie by the lower average cycle time, unknown last', () => {
  const { store: board } = store();
  const base = { framework: 'kanban' as const, score: 20, escapedDefects: 1 };
  board.submit('1', entry({ ...base, teamName: 'slow', averageCycleMs: 90_000 }));
  board.submit('2', entry({ ...base, teamName: 'none', averageCycleMs: null }));
  board.submit('3', entry({ ...base, teamName: 'fast', averageCycleMs: 30_000 }));
  const names = board.top().allTime.kanban.map((row) => row.teamName);
  assert.deepEqual(names, ['fast', 'slow', 'none']);
});

test('scrum ignores the cycle time in the order', () => {
  const { store: board } = store();
  board.submit('1', entry({ teamName: 'first', averageCycleMs: 90_000 }));
  board.submit('2', entry({ teamName: 'second', averageCycleMs: 1_000 }));
  assert.deepEqual(
    board.top().allTime.scrum.map((row) => row.teamName),
    ['first', 'second'],
  );
});

test('the lists hold at most ten rows per framework', () => {
  const { store: board } = store();
  for (let index = 0; index < 15; index += 1) board.submit(`s${index}`, entry({ teamName: `s${index}`, score: index }));
  for (let index = 0; index < 12; index += 1) {
    board.submit(`k${index}`, entry({ framework: 'kanban', teamName: `k${index}`, score: index }));
  }
  const top = board.top();
  assert.equal(top.allTime.scrum.length, config.leaderboard.top);
  assert.equal(top.month.scrum.length, config.leaderboard.top);
  assert.equal(top.allTime.kanban.length, config.leaderboard.top);
  assert.equal(top.allTime.scrum[0]?.score, 14);
});

test('the month list holds only the current month, the all-time list keeps older rows', () => {
  const { store: board, clock } = store();
  board.submit('old', entry({ teamName: 'october', score: 90, date: '2026-10-20' }));
  board.submit('now', entry({ teamName: 'november', score: 10, date: '2026-11-02' }));
  let top = board.top();
  assert.deepEqual(top.month.scrum.map((row) => row.teamName), ['november']);
  assert.deepEqual(top.allTime.scrum.map((row) => row.teamName), ['october', 'november']);
  clock.now = Date.UTC(2026, 11, 1);
  top = board.top();
  assert.deepEqual(top.month.scrum, []);
  assert.equal(top.allTime.scrum.length, 2);
  board.submit('dec', entry({ teamName: 'december', score: 5, date: '2026-12-01' }));
  top = board.top();
  assert.deepEqual(top.month.scrum.map((row) => row.teamName), ['december']);
});

test('rows that can no longer appear in any list are pruned', () => {
  const { store: board, clock } = store();
  for (let index = 0; index < 10; index += 1) {
    board.submit(`top${index}`, entry({ teamName: `top${index}`, score: 100 + index, date: '2026-10-05' }));
  }
  for (let index = 0; index < 5; index += 1) {
    board.submit(`weak${index}`, entry({ teamName: `weak${index}`, score: index, date: '2026-10-06' }));
  }
  assert.equal(rowCount(board), 10);
  clock.now = Date.UTC(2026, 10, 20);
  for (let index = 0; index < 12; index += 1) {
    board.submit(`nov${index}`, entry({ teamName: `nov${index}`, score: 20 + index, date: '2026-11-18' }));
  }
  const top = board.top();
  assert.equal(top.month.scrum.length, 10);
  assert.equal(top.allTime.scrum.length, 10);
  assert.ok(rowCount(board) <= 20);
  assert.ok(top.allTime.scrum.every((row) => row.score >= 100));
});

test('pruning keeps the two frameworks apart', () => {
  const { store: board } = store();
  for (let index = 0; index < 12; index += 1) board.submit(`s${index}`, entry({ score: 50 + index }));
  board.submit('k', entry({ framework: 'kanban', score: 1, teamName: 'lonely' }));
  assert.equal(board.top().allTime.kanban[0]?.teamName, 'lonely');
});
