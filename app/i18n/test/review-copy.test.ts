import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createT } from '../index.ts';

test('the delivery review says both that real open items keep ageing and that round 2 starts on a fresh board', () => {
  const en = createT('en');
  assert.ok(/real work/.test(en('inspect.verdict.notDoneText.kanban')) && /keeps growing/.test(en('inspect.verdict.notDoneText.kanban')));
  assert.ok(/round 2/.test(en('delivery.freshBoard')) && /fresh board/.test(en('delivery.freshBoard')) && /fairly/.test(en('delivery.freshBoard')));
  const ro = createT('ro');
  assert.ok(/munca reală/.test(ro('inspect.verdict.notDoneText.kanban')) && /crească/.test(ro('inspect.verdict.notDoneText.kanban')));
  assert.ok(/runda 2/.test(ro('delivery.freshBoard')) && /tablă curată/.test(ro('delivery.freshBoard')));
});

test('the work item age says it counts all the time, meetings included', () => {
  assert.ok(/all the time, meetings included/.test(createT('en')('kanban.metric.age.text')));
  assert.ok(/ședințele incluse/.test(createT('ro')('kanban.metric.age.text')));
});

test('ending the retrospective without an action has its own confirmation in both languages', () => {
  for (const lang of ['en', 'ro'] as const) {
    const t = createT(lang);
    assert.ok(t('retro.end.confirm').length > 0 && t('retro.end.yes').length > 0);
    assert.notEqual(t('retro.end.yes'), t('retro.end'));
  }
});
