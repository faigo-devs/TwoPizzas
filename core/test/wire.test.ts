import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CloseCodes, ErrorCodes, isErrorCode } from '../errors.ts';
import type { ClientAction } from '../types.ts';
import { Samples } from './action-samples.ts';
import { clientActionTypes, isRoomCode, parseClientMessage } from '../wire.ts';

const doing = (action: unknown): string => JSON.stringify({ t: 'do', action });

test('hello accepts only its three optional fields', () => {
  assert.deepEqual(parseClientMessage('{"t":"hello"}'), { t: 'hello' });
  assert.deepEqual(parseClientMessage('{"t":"hello","playerId":"abc_1","token":"x-y_z","name":"Ana"}'), {
    t: 'hello',
    playerId: 'abc_1',
    token: 'x-y_z',
    name: 'Ana',
  });
  assert.equal(parseClientMessage('{"t":"hello","extra":1}'), null);
  assert.equal(parseClientMessage('{"t":"hello","playerId":"a b"}'), null);
  assert.equal(parseClientMessage('{"t":"hello","playerId":1}'), null);
  assert.equal(parseClientMessage('{"t":"hello","token":""}'), null);
  assert.equal(parseClientMessage(`{"t":"hello","name":"${'x'.repeat(65)}"}`), null);
});

test('untrusted text that is not a message is refused', () => {
  for (const text of ['', 'null', '[]', '1', '"do"', '{', '{"t":"nope"}', '{"t":"do"}', '{"action":{}}', '{"t":"do","action":null}']) {
    assert.equal(parseClientMessage(text), null, text);
  }
  assert.equal(parseClientMessage(undefined), null);
  assert.equal(parseClientMessage(5), null);
});

test('a message over 2 KB is refused, counted in bytes', () => {
  const big = doing({ type: 'retro.note_add', column: 'try', text: 'x'.repeat(2100) });
  assert.equal(parseClientMessage(big), null);
  const multibyte = JSON.stringify({ t: 'do', action: { type: 'lobby.set_name', name: 'é'.repeat(10) } });
  assert.ok(parseClientMessage(multibyte) !== null);
  const wide = `{"t":"hello","name":"${'é'.repeat(64)}","pad":"${'a'.repeat(1900)}"}`;
  assert.equal(parseClientMessage(wide), null);
  assert.equal(parseClientMessage(doing({ type: 'retro.note_add', column: 'try', text: 'é'.repeat(401) })), null);
});

test('a client may never send a server action, and unknown action types are refused', () => {
  assert.equal(parseClientMessage(doing({ type: 'server.deadline', now: 1 })), null);
  assert.equal(parseClientMessage(doing({ type: 'server.join', playerId: 'a', name: null, now: 1 })), null);
  assert.equal(parseClientMessage(doing({ type: 'lobby.destroy' })), null);
  assert.equal(parseClientMessage(doing({ type: 5 })), null);
  assert.equal(parseClientMessage(doing({})), null);
});

test('unknown keys are refused, also the ones the server stamps', () => {
  assert.equal(parseClientMessage(doing({ type: 'lobby.start', playerId: 'p1' })), null);
  assert.equal(parseClientMessage(doing({ type: 'lobby.start', now: 5 })), null);
  assert.equal(parseClientMessage(doing({ type: 'plan.pull', itemId: '#1', extra: true })), null);
  assert.equal(parseClientMessage('{"t":"do","action":{"type":"lobby.start"},"also":1}'), null);
  assert.equal(parseClientMessage('{"t":"do","action":{"type":"lobby.start","__proto__":{"x":1}}}'), null);
  assert.equal(parseClientMessage('{"t":"do","action":{"type":"lobby.start","constructor":1}}'), null);
});

test('every action shape is checked exactly', () => {
  const good: unknown[] = [
    { type: 'lobby.set_name', name: 'Ana' },
    { type: 'lobby.volunteer', volunteer: false },
    { type: 'lobby.new_team_name' },
    { type: 'lobby.start' },
    { type: 'phase.begin' },
    { type: 'phase.advance' },
    { type: 'plan.goal_vote', theme: 'platform' },
    { type: 'plan.goal_confirm' },
    { type: 'plan.poker_vote', card: 13 },
    { type: 'plan.poker_reveal' },
    { type: 'plan.poker_revote' },
    { type: 'plan.poker_record', estimate: null },
    { type: 'plan.poker_record', estimate: 8 },
    { type: 'plan.estimation_stop' },
    { type: 'plan.pull', itemId: '#12' },
    { type: 'plan.unpull', itemId: '#1' },
    { type: 'plan.set_limits', inProgress: null, review: 3 },
    { type: 'item.take', itemId: '#2' },
    { type: 'item.leave', itemId: '#2' },
    { type: 'item.open', itemId: '#2', mode: 'review' },
    { type: 'item.close' },
    { type: 'item.submit', itemId: '#2', response: { kind: 'review', keys: ['a', 'b'] } },
    { type: 'item.submit', itemId: '#2', response: { kind: 'order', order: ['a', 'b'] } },
    { type: 'item.submit', itemId: '#2', response: { kind: 'incident', action: 'restart' } },
    { type: 'item.submit', itemId: '#2', response: { kind: 'merge', values: [1, 2] } },
    { type: 'item.take_review', itemId: '#2' },
    { type: 'item.verdict', itemId: '#2', verdict: 'changes' },
    { type: 'help.promise', itemId: '#2' },
    { type: 'help.withdraw', itemId: '#2' },
    { type: 'daily.end' },
    { type: 'inspect.reveal' },
    { type: 'retro.note_add', column: 'slowed_us', text: 'slow' },
    { type: 'retro.note_edit', noteId: 'n3', text: 'slower' },
    { type: 'retro.note_remove', noteId: 'n3' },
    { type: 'retro.reveal' },
    { type: 'retro.vote', noteId: 'n3' },
    { type: 'retro.unvote', noteId: 'n3' },
    { type: 'retro.choose_action', agreement: { type: 'wip_limit', max: 2 } },
    { type: 'retro.choose_action', agreement: { type: 'review_wait', maxMs: 60000 } },
    { type: 'retro.choose_action', agreement: { type: 'no_new_while_blocked' } },
    { type: 'retro.choose_action', agreement: { type: 'pair_first' } },
    { type: 'retro.choose_action', agreement: { type: 'wip_limits_set' } },
    { type: 'retro.choose_action', agreement: { type: 'free', text: 'be kind' } },
    { type: 'retro.help_start' },
    { type: 'retro.help_answer', questionId: 'wait', choice: 'review' },
    { type: 'retro.help_use', proposalId: 'went_well.value' },
    { type: 'summary.publish' },
  ];
  for (const action of good) {
    const parsed = parseClientMessage(doing(action));
    assert.deepEqual(parsed, { t: 'do', action }, JSON.stringify(action));
  }
});

test('malformed values are refused', () => {
  const bad: unknown[] = [
    { type: 'lobby.set_name' },
    { type: 'lobby.set_name', name: 5 },
    { type: 'lobby.volunteer', volunteer: 'yes' },
    { type: 'plan.goal_vote', theme: 'sales' },
    { type: 'plan.poker_vote', card: 4 },
    { type: 'plan.poker_vote', card: '5' },
    { type: 'plan.poker_record', estimate: 4 },
    { type: 'plan.poker_record' },
    { type: 'plan.pull', itemId: '1' },
    { type: 'plan.pull', itemId: '#' },
    { type: 'plan.pull', itemId: '#12345' },
    { type: 'plan.pull', itemId: ['#1'] },
    { type: 'plan.set_limits', inProgress: -1, review: null },
    { type: 'plan.set_limits', inProgress: 1.5, review: null },
    { type: 'plan.set_limits', inProgress: 1 },
    { type: 'item.open', itemId: '#1', mode: 'peek' },
    { type: 'item.open', itemId: '#1' },
    { type: 'item.submit', itemId: '#1', response: { kind: 'review' } },
    { type: 'item.submit', itemId: '#1', response: { kind: 'review', keys: 'a' } },
    { type: 'item.submit', itemId: '#1', response: { kind: 'review', keys: ['a', 'a'] } },
    { type: 'item.submit', itemId: '#1', response: { kind: 'merge', values: [1.5] } },
    { type: 'item.submit', itemId: '#1', response: { kind: 'merge', values: [-1] } },
    { type: 'item.submit', itemId: '#1', response: { kind: 'other', keys: [] } },
    { type: 'item.submit', itemId: '#1', response: { kind: 'incident', action: 'Not A Token' } },
    { type: 'item.submit', itemId: '#1', response: { kind: 'incident', action: 'a', extra: 1 } },
    { type: 'item.submit', itemId: '#1', response: null },
    { type: 'item.verdict', itemId: '#1', verdict: 'approve' },
    { type: 'retro.note_add', column: 'other', text: 'x' },
    { type: 'retro.note_add', column: 'try' },
    { type: 'retro.vote', noteId: '3' },
    { type: 'retro.vote', noteId: 'n' },
    { type: 'retro.choose_action', agreement: { type: 'wip_limit' } },
    { type: 'retro.choose_action', agreement: { type: 'wip_limit', max: '2' } },
    { type: 'retro.choose_action', agreement: { type: 'wip_limit', max: 2, extra: 1 } },
    { type: 'retro.choose_action', agreement: { type: 'free' } },
    { type: 'retro.choose_action', agreement: { type: 'pair_first', text: 'x' } },
    { type: 'retro.choose_action', agreement: { type: 'unknown' } },
    { type: 'retro.choose_action', agreement: [] },
    { type: 'retro.help_answer', questionId: 'Wait', choice: 'review' },
    { type: 'retro.help_use', proposalId: '' },
  ];
  for (const action of bad) assert.equal(parseClientMessage(doing(action)), null, JSON.stringify(action));
});

test('every client action type has a sample, and the sample parses to itself', () => {
  assert.deepEqual([...clientActionTypes].sort(), Object.keys(Samples).sort());
  for (const type of clientActionTypes) {
    const sample: ClientAction = Samples[type];
    assert.equal(sample.type, type);
    assert.deepEqual(parseClientMessage(doing(sample)), { t: 'do', action: sample }, type);
  }
});

test('every client action type refuses an extra key, a missing key and a wrong type name', () => {
  for (const type of clientActionTypes) {
    const sample = Samples[type];
    assert.equal(parseClientMessage(doing({ ...sample, extra: 1 })), null, `${type} with an extra key`);
    assert.equal(parseClientMessage(doing({ ...sample, playerId: 'p1' })), null, `${type} with a stamp`);
    for (const key of Object.keys(sample).filter((own) => own !== 'type')) {
      const { [key]: _removed, ...rest } = sample as Record<string, unknown>;
      assert.equal(parseClientMessage(doing(rest)), null, `${type} without ${key}`);
    }
    assert.equal(parseClientMessage(doing({ ...sample, type: `${type}x` })), null);
  }
});

test('the error codes and room codes the wire shares are checked from one list', () => {
  for (const code of ErrorCodes) assert.equal(isErrorCode(code), true);
  assert.equal(isErrorCode('nope'), false);
  assert.equal(isErrorCode(undefined), false);
  assert.equal(isErrorCode('toString'), false);
  assert.equal(isRoomCode('BCDFG'), true);
  assert.equal(isRoomCode('bcdfg'), false);
  assert.equal(isRoomCode('ABCDE'), false);
  assert.equal(isRoomCode('BCDF'), false);
  assert.equal(isRoomCode('BCDFGH'), false);
  assert.equal(isRoomCode(5), false);
  assert.deepEqual(Object.values(CloseCodes), [...new Set(Object.values(CloseCodes))]);
});
