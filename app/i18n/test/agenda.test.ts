import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sessionAgenda } from '../../../core/agenda.ts';
import { createT } from '../index.ts';

test('the lobby agenda copy names every event, the total and the real duration range in both languages', () => {
  const { entries, totalMinutes } = sessionAgenda();
  for (const lang of ['en', 'ro'] as const) {
    const t = createT(lang);
    for (const framework of ['scrum', 'kanban'] as const) {
      for (const entry of entries) {
        const name = t(`phase.${framework}.${entry.event}.name` as never);
        assert.ok(name.length > 0 && !name.startsWith('phase.'));
      }
      assert.ok(t(`iteration.${framework}` as never, { n: 1 }).includes('1'));
    }
    assert.ok(t('lobby.agenda.total', { minutes: totalMinutes }).includes(String(totalMinutes)));
    assert.ok(t('lobby.agenda.total', { minutes: 1 }).includes('1'));
    assert.ok(t('lobby.agenda.talk').includes('45–60'));
    assert.ok(t('lobby.agenda.half', { name: 'X', n: 2 }).includes('2'));
    assert.ok(t('lobby.agenda.row', { minutes: '6 / 4' }).includes('6 / 4'));
  }
});

test('the agenda note says these are game minutes, not real timeboxes', () => {
  assert.ok(/game/i.test(createT('en')('lobby.agenda.note')) && /timebox/i.test(createT('en')('lobby.agenda.note')));
  assert.ok(/jocului/.test(createT('ro')('lobby.agenda.note')) && /timebox/i.test(createT('ro')('lobby.agenda.note')));
});
