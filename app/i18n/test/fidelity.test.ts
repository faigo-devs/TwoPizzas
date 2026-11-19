import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dictionaries } from '../index.ts';

const en = dictionaries.en;
const ro = dictionaries.ro;

test('the Kanban tour calls the retrospective and the vote a common practice', () => {
  assert.ok(/common practice/.test(en['tour.note.text.kanban']) && /common practice/.test(en['tour.vote.text.kanban']));
  assert.ok(/uzuală/.test(ro['tour.note.text.kanban']) && /uzuală/.test(ro['tour.vote.text.kanban']));
});

test('the Scrum tour says walking the board from the right is the game’s rule', () => {
  assert.ok(/this game’s rule/.test(en['tour.daily.text']));
  assert.ok(/regula jocului/.test(ro['tour.daily.text']));
});

test('the visible Kanban plan note says the Guide defines no roles', () => {
  assert.ok(/defines no roles/.test(en['phase.kanban.plan.practice']));
  assert.ok(/nu definește roluri/.test(ro['phase.kanban.plan.practice']));
});

test('the real duration of every Scrum event is a line of its own and the timebox gloss exists', () => {
  for (const event of ['plan', 'work', 'daily', 'inspect', 'retro']) {
    assert.ok(`phase.scrum.${event}.real` in en && `phase.scrum.${event}.real` in ro);
  }
  assert.ok(/fixed length for the Sprint/.test(en['phase.gloss']) && /durată fixă pentru Sprint/.test(ro['phase.gloss']));
  assert.ok(!/fixed length/.test(en['phase.scale']) && !/durată fixă/.test(ro['phase.scale']));
});

test('the next-action copy no longer says there is nothing to do when an item can be taken', () => {
  assert.ok(!/nothing else to do/.test(en['work.next.pull']) && !/nimic de făcut/.test(ro['work.next.pull']));
});

test('the defensible wrong choice names the Developer who worked on the item', () => {
  assert.ok(en['learn.scrum.work.1.no1'].includes('who worked on it'));
  assert.ok(ro['learn.scrum.work.1.no1'].includes('care a lucrat la el'));
});

test('the escaped defect is explained once above the verdicts, not on each card', () => {
  for (const lang of [en, ro]) {
    assert.ok(!/escaped defect/.test(lang['inspect.verdict.rejectedText']) && !/escaped defect/.test(lang['inspect.verdict.rejectedTextKanban']));
    assert.ok(/escaped defect/.test(lang['inspect.escapedNote']));
  }
});

test('items without an estimate count 0: the planning, review and summary lines say so', () => {
  assert.ok(/without an estimate count 0/.test(en['commit.unestimated']) && /without an estimate counts 0/.test(en['summary.velocityNote']) && /without an estimate counts 0/.test(en['inspect.velocityNote']));
  assert.ok(/fără estimare contează 0/.test(ro['commit.unestimated']) && /fără estimare contează 0/.test(ro['summary.velocityNote']) && /fără estimare contează 0/.test(ro['inspect.velocityNote']));
});

test('the Kanban wait line says more requests are coming and when the finish appears', () => {
  assert.ok(/still coming/.test(en['work.next.waitArrivals']) && /\{label\}/.test(en['work.next.waitArrivals']));
  assert.ok(/mai vin/.test(ro['work.next.waitArrivals']) && /\{label\}/.test(ro['work.next.waitArrivals']));
});
