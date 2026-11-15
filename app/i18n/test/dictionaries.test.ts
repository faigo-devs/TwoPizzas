import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Actions, Indicators, MergeRules } from '../../../core/tasks/data.ts';
import { dictionaries, templateParams, templatePlurals, createT } from '../index.ts';
import type { Key } from '../index.ts';
import {
  agreementTypes,
  buttonKeys,
  errorCodes,
  eventKinds,
  helpChoices,
  helpProposalIds,
  itemStatuses,
  observationIds,
  puzzleKinds,
  retroColumns,
  stepFrameworks,
} from './support.ts';

const en = dictionaries.en;
const ro = dictionaries.ro;
const keys = Object.keys(en) as Key[];

function has(key: string): void {
  assert.ok(key in en, `missing en key ${key}`);
  assert.ok(key in ro, `missing ro key ${key}`);
}

test('both dictionaries have exactly the same keys', () => {
  assert.deepEqual(Object.keys(ro).sort(), Object.keys(en).sort());
});

test('no value is empty or has stray spaces', () => {
  for (const lang of ['en', 'ro'] as const) {
    for (const key of keys) {
      const value = dictionaries[lang][key];
      assert.ok(value.trim() !== '', `${lang} ${key} is empty`);
      assert.equal(value, value.trim(), `${lang} ${key} has outer spaces`);
      assert.ok(!value.includes('  '), `${lang} ${key} has a double space`);
    }
  }
});

test('every parameter is present in both languages', () => {
  for (const key of keys) {
    assert.deepEqual(templateParams(ro[key]).sort(), templateParams(en[key]).sort(), `parameters of ${key}`);
  }
});

test('plural forms: one and other in English, one, few and other in Romanian', () => {
  for (const key of keys) {
    const enPlurals = templatePlurals(en[key]);
    const roPlurals = templatePlurals(ro[key]);
    assert.equal(roPlurals.length, enPlurals.length, `plural count of ${key}`);
    for (const forms of enPlurals) assert.deepEqual(forms, ['one', 'other'], `en plural of ${key}`);
    for (const forms of roPlurals) assert.deepEqual(forms, ['one', 'few', 'other'], `ro plural of ${key}`);
  }
});

test('every key renders without leftovers', () => {
  for (const lang of ['en', 'ro'] as const) {
    const t = createT(lang);
    for (const key of keys) {
      const params: Record<string, number> = {};
      for (const name of templateParams(en[key])) params[name] = 3;
      const text = t(key, params);
      assert.ok(!/[{}]/.test(text), `${lang} ${key} left a brace: ${text}`);
      assert.ok(!text.includes('undefined'), `${lang} ${key} printed undefined`);
    }
  }
});

test('no cedilla letters, no hyphenated email, no exclamation marks in English', () => {
  for (const key of keys) {
    assert.ok(!/[ŞşŢţ]/.test(ro[key]), `cedilla in ${key}`);
    assert.ok(!/e-mail/i.test(ro[key]) && !/e-mail/i.test(en[key]), `hyphenated email in ${key}`);
    assert.ok(!en[key].includes('!'), `exclamation mark in en ${key}`);
  }
});

test('no vendor, platform or tool names', () => {
  const forbidden = [
    'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'atlassian', 'trello', 'asana', 'slack', 'discord',
    'whatsapp', 'zoom', 'miro', 'mural', 'figma', 'notion', 'azure', 'aws', 'amazon', 'google', 'cloudflare',
    'microsoft', 'docker', 'kubernetes', 'jenkins', 'excel', 'openai', 'chatgpt', 'claude', 'copilot', 'wordpress',
    'facebook', 'linkedin', 'youtube', 'apple', 'android', 'chrome', 'firefox', 'safari',
  ];
  const pattern = new RegExp(`\\b(${forbidden.join('|')})\\b`, 'i');
  for (const key of keys) {
    for (const lang of ['en', 'ro'] as const) {
      const match = pattern.exec(dictionaries[lang][key]);
      assert.equal(match, null, `${lang} ${key} names ${match?.[0]}`);
    }
  }
});

test('every error code, observation, agreement, status, puzzle kind and column has copy', () => {
  for (const code of Object.keys(errorCodes)) has(`error.${code}`);
  for (const id of Object.keys(observationIds)) {
    has(`observation.${id}.title`);
    has(`observation.${id}.text`);
  }
  for (const type of Object.keys(agreementTypes)) {
    has(`agreement.${type}.name`);
    has(`agreement.${type}.meaning`);
  }
  for (const status of Object.keys(itemStatuses)) has(`item.status.${status}`);
  for (const status of ['waiting', 'blocked', 'accepted', 'rejected']) has(`item.status.${status}`);
  for (const kind of Object.keys(puzzleKinds)) {
    has(`item.kind.${kind}`);
    has(`puzzle.${kind}.task.solo`);
    has(`puzzle.${kind}.task.pair`);
  }
  for (const column of Object.keys(retroColumns)) has(`retro.column.${column}`);
  for (const theme of ['payments', 'accounts', 'platform']) has(`item.theme.${theme}`);
});

test('every token of the puzzles has copy', () => {
  for (const [indicator, levels] of Indicators) {
    has(`token.indicator.${indicator}`);
    for (const level of levels) has(`token.level.${level}`);
  }
  for (const action of Actions) has(`token.action.${action}`);
  for (const rule of MergeRules) {
    has(`token.mergeRule.${rule}`);
    has(`puzzle.merge.rule.${rule}`);
    has(`held.merge.${rule}`);
  }
  for (const kind of ['review', 'order', 'incident']) has(`held.${kind}`);
});

test('every phase and step has a card, copy and a script for each framework it exists in', () => {
  for (const framework of ['scrum', 'kanban'] as const) {
    for (const phase of Object.keys(eventKinds)) {
      for (const part of ['name', 'purpose', 'real', 'mistake', 'practice']) has(`phase.${framework}.${phase}.${part}`);
      const roles = framework === 'scrum' ? ['productOwner', 'developers', 'scrumMaster'] : ['customer', 'team', 'facilitator'];
      for (const role of roles) has(`phase.${framework}.${phase}.role.${role}`);
    }
    const steps = stepFrameworks as Record<string, Record<string, readonly string[]>>;
    for (const [phase, byStep] of Object.entries(steps)) {
      for (const [step, frameworks] of Object.entries(byStep)) {
        if (!frameworks.includes(framework)) continue;
        has(`script.${framework}.${phase}.${step}.1`);
        if (step !== 'card') has(`step.${framework}.${phase}.${step}`);
      }
    }
  }
});

test('script lines are numbered without gaps', () => {
  const groups = new Map<string, number[]>();
  for (const key of keys) {
    const match = /^(script\.\w+\.\w+\.\w+)\.(\d+)$/.exec(key);
    if (match) groups.set(match[1] as string, [...(groups.get(match[1] as string) ?? []), Number(match[2])]);
  }
  for (const [group, numbers] of groups) {
    assert.deepEqual(numbers, numbers.map((_, index) => index + 1), `numbering of ${group}`);
  }
});

test('the help questions, choices and proposals have copy', () => {
  for (const [id, choices] of Object.entries(helpChoices)) {
    has(`retro.help.q.${id}`);
    for (const choice of choices) has(`retro.help.q.${id}.${choice}`);
  }
  for (const id of helpProposalIds) has(`retro.help.p.${id}`);
});

test('the daily script only asks to keep the timebox', () => {
  assert.ok(en['script.scrum.daily.walk.1'].includes('timebox'));
  assert.ok(en['script.scrum.daily.walk.2'].includes('Developers run it'));
});

test('button labels stay short', () => {
  for (const key of buttonKeys) {
    assert.ok(en[key].length <= 32, `en ${key} is ${en[key].length} characters`);
    assert.ok(ro[key].length <= 36, `ro ${key} is ${ro[key].length} characters`);
  }
});

test('theme and agreement ids are replaced by their labels', () => {
  assert.equal(createT('ro')('observation.inspect.goalMissed.text', { theme: 'payments' }), 'Nu toate elementele din tema Plăți au fost acceptate.');
  assert.equal(createT('en')('observation.retro.actionChosen.text', { type: 'wip_limit' }), 'The team chose an action: WIP limit.');
});
