import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, test } from 'node:test';
import type { ItemView } from '../../../core/index.ts';
import { clearDraft, clearDrafts, loadDraft, pruneDrafts, saveDraft } from '../drafts.ts';

function item(id: string, patch: Partial<ItemView> = {}): ItemView {
  return { id, status: 'doing', submitted: false, workers: ['me'], ...patch } as unknown as ItemView;
}

beforeEach(() => clearDrafts());

test('a draft is kept for its item and kind across a phase change', () => {
  saveDraft('7', { kind: 'order', order: ['b', 'a'] });
  pruneDrafts([item('7')], 'me');
  assert.deepEqual(loadDraft('7', 'order'), { kind: 'order', order: ['b', 'a'] });
  assert.equal(loadDraft('7', 'merge'), null);
  assert.equal(loadDraft('8', 'order'), null);
});

test('a draft is cleared once the item is submitted and by an explicit clear', () => {
  saveDraft('7', { kind: 'incident', action: 'restart' });
  pruneDrafts([item('7', { submitted: true })], 'me');
  assert.equal(loadDraft('7', 'incident'), null);
  saveDraft('7', { kind: 'review', marked: ['x'] });
  clearDraft('7');
  assert.equal(loadDraft('7', 'review'), null);
});

test('a draft is dropped when the item leaves the player or is gone from the view', () => {
  saveDraft('7', { kind: 'merge', values: ['1', ''] });
  saveDraft('8', { kind: 'merge', values: ['2'] });
  saveDraft('9', { kind: 'merge', values: ['3'] });
  pruneDrafts([item('7', { workers: ['other'] }), item('8', { status: 'review' })], 'me');
  assert.equal(loadDraft('7', 'merge'), null);
  assert.equal(loadDraft('8', 'merge'), null);
  assert.equal(loadDraft('9', 'merge'), null);
});

test('every puzzle body saves and restores its draft through the module', () => {
  for (const name of ['Order', 'Incident', 'Merge', 'Review']) {
    const source = readFileSync(new URL(`../screens/puzzles/${name}.tsx`, import.meta.url), 'utf8');
    assert.ok(source.includes('loadDraft(') && source.includes('saveDraft('), name);
  }
});
