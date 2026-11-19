import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildQuestion, Slots, type LearnEvent } from '../../game/learn.ts';
import { createT, dictionaries, type Key } from '../index.ts';

const events: LearnEvent[] = ['plan', 'work', 'daily', 'inspect', 'retro'];
const frameworks = ['scrum', 'kanban'] as const;
const parts = ['q', 'ok', 'no1', 'no2', 'why'] as const;

function text(lang: 'en' | 'ro', id: string): string {
  return dictionaries[lang][id as Key];
}

test('every event has one objective sentence in both languages', () => {
  for (const framework of frameworks) {
    for (const event of events) {
      const id = `learn.${framework}.${event}.goal`;
      const word = framework === 'scrum' ? ['event', 'eveniment'] : event === 'work' ? ['round', 'rundă'] : ['meeting', 'întâlnire'];
      assert.ok(text('en', id).startsWith(`After this ${word[0]} you will know`), id);
      assert.ok(text('ro', id).startsWith(`După ${framework === 'scrum' ? 'acest' : 'această'} ${word[1]} vei ști`), id);
      for (const lang of ['en', 'ro'] as const) {
        assert.ok((text(lang, id).match(/[.?!](\s|$)/g) ?? []).length === 1, `${lang} ${id} is one sentence`);
        assert.ok(text(lang, id).length <= 170, `${lang} ${id} is short`);
      }
    }
  }
});

test('every event has at least two complete questions with three distinct choices in both languages', () => {
  for (const framework of frameworks) {
    for (const event of events) {
      for (const variant of [1, 2]) {
        for (const lang of ['en', 'ro'] as const) {
          const own = parts.map((part) => text(lang, `learn.${framework}.${event}.${variant}.${part}`));
          assert.equal(new Set(own.slice(1, 4)).size, 3, `${lang} ${framework} ${event} ${variant} choices differ`);
          assert.ok(own[0]!.length <= 90, `${lang} ${framework} ${event} ${variant} question is short`);
          assert.ok(own.slice(1, 4).every((choice) => choice.length <= 70), `${lang} ${framework} ${event} ${variant} choices are short`);
          assert.ok(own[4]!.length <= 170, `${lang} ${framework} ${event} ${variant} reason is short`);
          assert.ok(!own.join(' ').includes('dumneavoastră'));
        }
      }
    }
  }
});

test('a built question has exactly one right choice, the same for the whole room, in both languages', () => {
  for (const lang of ['en', 'ro'] as const) {
    const t = createT(lang);
    for (const framework of frameworks) {
      for (const slot of Slots) {
        for (const code of ['ABCD', 'WXYZ', 'K7M2']) {
          const first = buildQuestion(code, framework, slot, t);
          const second = buildQuestion(code, framework, slot, t);
          assert.ok(first !== null);
          assert.deepEqual(first, second);
          assert.equal(first.choices.length, 3);
          assert.equal(new Set(first.choices).size, 3);
          assert.ok([1, 2].some((variant) => text(lang, `learn.${framework}.${slot.event}.${variant}.ok`) === first.choices[first.right]?.replaceAll(String.fromCharCode(0x2011), '-')));
          assert.ok(first.right >= 0 && first.right < 3);
        }
      }
    }
  }
});

test('the two iterations of one event ask different variants', () => {
  const t = createT('en');
  for (const framework of frameworks) {
    for (const event of events) {
      const one = buildQuestion('ABCD', framework, { event, iteration: 1 }, t);
      const two = buildQuestion('ABCD', framework, { event, iteration: 2 }, t);
      assert.notEqual(one?.question, two?.question);
    }
  }
});


test('the Kanban limit question is asked only in round 2 and every Scrum event has one duration question', () => {
  const t = createT('en');
  for (const code of ['ABCD', 'WXYZ', 'K7M2', 'Q3R8']) {
    assert.ok(!buildQuestion(code, 'kanban', { event: 'work', iteration: 1 }, t)?.question.includes('limit'));
    assert.equal(buildQuestion(code, 'kanban', { event: 'work', iteration: 2 }, t)?.question, 'What does a WIP limit do?');
  }
  for (const event of ['plan', 'work', 'daily', 'inspect', 'retro']) {
    const durations = [1, 2].filter((variant) => /How long|Cât /.test(text('en', `learn.scrum.${event}.${variant}.q`)));
    assert.equal(durations.length, 1, event);
  }
});
