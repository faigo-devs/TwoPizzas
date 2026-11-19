import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from '../../../core/config.ts';
import { createT, dictionaries, privacyParams } from '../index.ts';

test('the pause copy exists in both languages and quotes the time', () => {
  for (const lang of ['en', 'ro'] as const) {
    const t = createT(lang);
    assert.ok(t('pause.awayUntil', { time: '21:45' }).includes('21:45'));
    assert.ok(t('pause.away', { left: '04:30', time: '21:45' }).includes('04:30'));
    assert.ok(t('pause.option', { minutes: config.pause.defaultMinutes }).includes(String(config.pause.defaultMinutes)));
  }
});

test('the privacy text on deletion names the provider recovery copies and the 30 days in both languages', () => {
  assert.ok(createT('en')('privacy.p3', privacyParams).includes('recovery copies may keep deleted data for up to 30 days'));
  assert.ok(createT('ro')('privacy.p3', privacyParams).includes('până la 30 de zile'));
});

test('the pause time left is a duration, not a clock, and the finish confirmation names the next event per framework', () => {
  for (const lang of ['en', 'ro'] as const) {
    const t = createT(lang);
    assert.ok(!/\d:\d\d/.test(t('pause.leftMinutes', { count: 4 })) && /4/.test(t('pause.leftMinutes', { count: 4 })));
    assert.ok(/\d/.test(t('pause.leftSeconds', { count: 30 })));
  }
  assert.ok(dictionaries.en['work.endEarly.confirm.scrum.2'].includes('Sprint Review') && dictionaries.en['work.endEarly.confirm.scrum.1'].includes('Daily Scrum'));
  assert.ok(dictionaries.en['work.endEarly.confirm.kanban.2'].includes('Delivery review') && dictionaries.en['work.endEarly.confirm.kanban.1'].includes('daily at the board'));
  assert.ok(dictionaries.ro['work.endEarly.confirm.kanban.2'].includes('Delivery review') && dictionaries.ro['work.endEarly.confirm.scrum.1'].includes('Daily Scrum'));
});
