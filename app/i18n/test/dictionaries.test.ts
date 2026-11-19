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
    has(`token.indicator.${indicator}.is`);
    for (const level of levels) has(`token.level.${indicator}.${level}`);
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
  assert.equal(createT('ro')('observation.inspect.goalMissed.text', { theme: 'payments' }), 'Nu toate elementele din tema Plăți au fost terminate cu răspuns corect.');
  assert.equal(createT('en')('observation.retro.actionChosen.text', { type: 'wip_limit' }), 'The team chose an action: WIP limit.');
});

function forbid(patterns: RegExp[], except: readonly string[] = []): void {
  for (const key of keys) {
    if (except.includes(key)) continue;
    for (const lang of ['en', 'ro'] as const) {
      const text = dictionaries[lang][key].replace(/\{\w+\}/g, '').replace(/\{\w+, plural,/g, '{');
      for (const pattern of patterns) assert.ok(!pattern.test(text), `${lang} ${key} matches ${pattern}`);
    }
  }
}

test('no timebox is called soft or flexible: in Scrum an event ends within its timebox', () => {
  forbid([/soft timebox/i, /timebox flexibil/i]);
});

test('the Product Owner does not accept or reject work: the Guide has no acceptance step', () => {
  forbid([/\breject(ed|s|ion)?\b/i, /\baccept(ed|s)?\b/i, /acceptă/i, /acceptat/i, /respins/i, /respinge/i]);
});

test('the three Scrum accountabilities are not called roles in running text', () => {
  forbid([/three roles/i, /trei roluri/i]);
});

test('no 2017 or non-Guide Scrum wording: Development Team, three questions, ceremonies', () => {
  forbid([/development team/i, /three questions/i, /ceremon/i, /echipa de dezvoltare/i, /cele trei întrebări/i]);
});

test('commit is not used in its old sense, only inside key names', () => {
  forbid([/\bcommit(ted|ment)?\b/i, /\bangaja/i]);
});

test('demo is a nickname with a disclaimer, never the name of the Sprint Review', () => {
  forbid([/\bdemo\b/i], ['phase.scrum.inspect.aka']);
});

test('items are selected for the Sprint Backlog, not pulled into it', () => {
  forbid([/\bpull(ed)? (into|items)/i, /\bpull\b.*Sprint/i, /(^|\s)Trageți/, /trase\b/i]);
});

test('the Sprint does not start when Planning ends: Planning is inside the Sprint', () => {
  forbid(
    [/\b(start|starts|begin)\s+the\s+Sprint\b(?!\s+(Review|Retrospective|Planning|Goal|Backlog))/i, /\b(porni|pornește|începe|începeți|porniți)\s+Sprint-ul/i],
    ['phase.scrum.plan.purpose'],
  );
});

test('every Scrum card carries its practice note naming the Scrum Guide', () => {
  for (const phase of ['plan', 'work', 'daily', 'inspect', 'retro']) {
    for (const lang of ['en', 'ro'] as const) {
      const text = dictionaries[lang][`phase.scrum.${phase}.practice` as Key];
      assert.ok(text.includes('Scrum Guide'), `${lang} phase.scrum.${phase}.practice names no guide`);
    }
  }
});

test('every Kanban card names the Kanban Guide in its practice or real-life line', () => {
  for (const phase of ['plan', 'work', 'daily', 'inspect', 'retro']) {
    for (const lang of ['en', 'ro'] as const) {
      const text = `${dictionaries[lang][`phase.kanban.${phase}.practice` as Key]} ${dictionaries[lang][`phase.kanban.${phase}.real` as Key]}`;
      assert.ok(text.includes('Kanban Guide'), `${lang} phase.kanban.${phase} names no guide`);
    }
  }
});

test('planning poker and velocity lines say they are not in the Scrum Guide', () => {
  for (const lang of ['en', 'ro'] as const) {
    for (const id of ['poker.note', 'poker.velocity', 'inspect.velocityNote', 'script.scrum.plan.commit.2', 'observation.plan.overcommitted.text', 'observation.plan.fitsVelocity.text'] as const) {
      assert.ok(dictionaries[lang][id].includes('Scrum Guide'), `${lang} ${id} carries no disclosure`);
    }
  }
  assert.ok(/weak forecast/.test(en['commit.hint']) && /prognoză slabă/.test(ro['commit.hint']));
});

test('a WIP limit in Scrum is marked as coming from Kanban', () => {
  assert.ok(en['agreement.wip_limit.scrumNote'].includes('Kanban'));
  assert.ok(ro['agreement.wip_limit.scrumNote'].includes('Kanban'));
});

test('the soft-timebox sentence says what Scrum and Kanban say', () => {
  assert.ok(en['phase.ends.soft'].includes('Scrum') && ro['phase.ends.soft'].includes('Scrum'));
  assert.ok(en['phase.ends.soft.kanban'].includes('Kanban Guide') && ro['phase.ends.soft.kanban'].includes('Kanban Guide'));
});

test('the Sprint Goal copy says every theme item must be selected and finished', () => {
  assert.ok(/every item of the theme/.test(en['goal.note']) && /select and finish/.test(en['goal.hint']));
  assert.ok(/selectează și termină/.test(ro['goal.hint']));
});

test('no phase-card row is longer than two sentences', () => {
  for (const key of keys) {
    if (!/^phase\.(scrum|kanban)\.\w+\.(purpose|real|mistake|practice|role\.\w+)$/.test(key)) continue;
    for (const lang of ['en', 'ro'] as const) {
      const sentences = dictionaries[lang][key].split(/(?<=[.!?])\s+(?=[A-ZȘȚÎÂĂ])/).length;
      assert.ok(sentences <= 2, `${lang} ${key} has ${sentences} sentences`);
    }
  }
});

test('Romanian counts agree for 1, 2 and 20', () => {
  const t = createT('ro');
  assert.equal(t('observation.work.allFinished.text', { count: 1 }), 'Elementul a ajuns în Done.');
  assert.equal(t('observation.work.allFinished.text', { count: 2 }), 'Toate cele 2 elemente au ajuns în Done.');
  assert.equal(t('observation.work.allFinished.text', { count: 20 }), 'Toate cele 20 de elemente au ajuns în Done.');
  assert.equal(t('agreement.wip_limit.meaning', { max: 1 }), 'Cel mult 1 element în In Progress în același timp.');
  assert.equal(t('poker.voteCount', { voted: 1, total: 4 }), '1 din 4 a votat');
  assert.equal(createT('en')('poker.voteCount', { voted: 1, total: 4 }), '1 of 4 has voted');
});

test('Romanian is informal: no dumneavoastră, no dvs., no formal address pronouns', () => {
  for (const key of keys) {
    assert.ok(!/dumneavoastr/i.test(ro[key]) && !/\bdvs\b/i.test(ro[key]), `ro ${key} is formal`);
  }
});

test('Romanian buttons for one player are imperative singular', () => {
  const expected: Partial<Record<Key, string>> = {
    'start.create': 'Creează o cameră',
    'start.join': 'Intră',
    'lobby.start': 'Pornește jocul',
    'lobby.copyCode': 'Copiază codul',
    'lobby.volunteer.scrum': 'Oferă-te ca Scrum Master',
    'lobby.withdraw': 'Renunță la ofertă',
    'phase.begin': 'Începe',
    'goal.confirm': 'Confirmă obiectivul',
    'goal.vote': 'Votează acest obiectiv',
    'poker.reveal': 'Dezvăluie',
    'poker.record': 'Înregistrează estimarea',
    'commit.pull': 'Selectează pentru Sprint',
    'commit.start': 'Începe lucrul',
    'item.take': 'Ia',
    'item.open': 'Deschide',
    'item.review': 'Verifică',
    'item.submit': 'Trimite răspunsul',
    'daily.end.scrum': 'Încheie Daily Scrum',
    'retro.vote': 'Votează',
    'retro.end': 'Încheie retrospectiva',
    'summary.publish': 'Publică rezultatul',
    'shell.retry': 'Încearcă din nou',
  };
  for (const [key, value] of Object.entries(expected)) assert.equal(ro[key as Key], value, `ro ${key}`);
});

test('no Romanian button for one player ends in a formal plural imperative', () => {
  for (const key of buttonKeys) {
    assert.ok(!/ți$/.test(ro[key].split(' ')[0] ?? ''), `ro ${key} starts with a plural imperative: ${ro[key]}`);
  }
});

test('the other person on a pair item is a partner, never a second worker', () => {
  forbid([/second worker/i, /al doilea lucrător/i, /lucrători/i, /lucrătorii/i, /lucrător/i]);
});

test('escaped defect, flow metrics and WIP limit keep their English names in Romanian', () => {
  forbid([/defecte? scăpate?/i, /măsur\w* de flux/i, /flow measures/i, /limite WIP/i, /limitelor WIP/i]);
});

test('Romanian says uzuală for a common practice', () => {
  forbid([/practică obișnuită/i, /practici obișnuite/i]);
});

test('English terms used as a Romanian subject take the hyphenated article', () => {
  forbid(
    [/\b(Sprint Review|Daily Scrum|Product Owner|Scrum Master|Sprint Goal|Sprint Planning|Sprint Retrospective|Increment|Velocity|Throughput|Cycle time|Replenishment) (este|sunt|a|nu|verifică|inspectează|dezvăluie|conduce|participă|planifică|hotărăște|se|are|ține)\b/],
    [],
  );
});

test('a role placed in a sentence has an indefinite and a definite Romanian form', () => {
  assert.equal(ro['role.facilitator.kanban.def'], 'facilitatorul');
  assert.equal(ro['role.facilitator.scrum.def'], 'Scrum Master-ul');
  assert.equal(ro['role.facilitator.kanban'], 'facilitator');
});

test('incident levels agree with their indicator in Romanian', () => {
  assert.equal(ro['token.level.errors.low'], 'scăzute');
  assert.equal(ro['token.level.memory.full'], 'plină');
  assert.equal(ro['token.level.disk.full'], 'plin');
  assert.equal(ro['token.indicator.queue.is'], 'coada este');
  assert.equal(en['token.indicator.errors'], 'error rate');
});

test('card statuses use the words of the board columns', () => {
  for (const lang of ['en', 'ro'] as const) {
    const d = dictionaries[lang];
    assert.equal(d['item.status.todo'], 'To do');
    assert.equal(d['item.status.doing'], 'In Progress');
    assert.equal(d['item.status.review'], 'Review');
    assert.equal(d['item.status.done'], 'Done');
    assert.equal(d['item.status.blocked'], 'Blocked');
  }
});

test('promise and withdraw help are imperative buttons', () => {
  assert.equal(en['item.promiseHelp'], 'Promise help');
  assert.equal(ro['item.promiseHelp'], 'Promite ajutor');
  assert.equal(ro['item.withdrawHelp'], 'Retrage ajutorul');
});

test('the privacy text names the IP address, what the team asks for and the tab', () => {
  assert.ok(en['privacy.p2'].includes('IP address') && ro['privacy.p2'].includes('Adresa ta IP'));
  assert.ok(en['privacy.p4'].includes('publish its result') && ro['privacy.p4'].includes('să publice rezultatul'));
  assert.ok(en['privacy.p4'].includes('no other personal data') && ro['privacy.p4'].includes('nici alte date personale'));
  assert.ok(en['privacy.p5'].includes('only while this tab is open') && ro['privacy.p5'].includes('doar cât timp această filă e deschisă'));
});

test('beginner glosses are present once where the term first appears', () => {
  assert.ok(en['puzzle.verdict.note'].includes('Looks Good To Me') && ro['puzzle.verdict.note'].includes('Looks Good To Me'));
  assert.ok(en['puzzle.verdict.note'].includes('Request changes'));
  assert.ok(en['phase.gloss'].includes('timebox') && ro['phase.gloss'].includes('Timebox'));
  assert.ok(en['limits.explain'].includes('work in progress') && ro['limits.explain'].includes('work in progress'));
  assert.ok(en['phase.scrum.plan.practice'].includes('story points (') && ro['phase.scrum.plan.practice'].includes('story points ('));
});

test('Romanian keeps the hyphen before the article of an English term and keeps WIP limits as the name', () => {
  forbid([/Sprintul/, /Sprintului/, /WIP limit-ur/, /Developer-ul/]);
  for (const key of keys) assert.ok(!/stakeholders/i.test(ro[key]), `ro ${key} says stakeholders`);
});

test('the quiz does not reuse verificare, which is reserved for the peer review', () => {
  assert.ok(!/verific/i.test(ro['learn.title']) && !/verific/i.test(ro['learn.summary.title']));
});

test('the verdict status matches the verdict label in both languages', () => {
  assert.equal(en['item.status.rejected'], en['inspect.verdict.rejected']);
  assert.equal(ro['item.status.rejected'], ro['inspect.verdict.rejected']);
});

test('the pause copy says the game keeps running', () => {
  assert.ok(/keeps running/.test(en['pause.legend']) && /continuă/.test(ro['pause.legend']));
  assert.ok(/keeps running/.test(en['pause.away']) && /continuă/.test(ro['pause.away']));
});

test('stakeholders are defined once on the Sprint Review card', () => {
  assert.ok(en['phase.scrum.inspect.role.productOwner'].includes('who use or pay for the product'));
  assert.ok(ro['phase.scrum.inspect.role.productOwner'].includes('folosesc sau plătesc produsul'));
});

test('the work-half keys name the Sprint or the round', () => {
  for (const part of ['', '.hint', '.wait'] as const) {
    assert.ok(/half of the Sprint/.test(en[`work.endEarly${part}.scrum` as 'work.endEarly.scrum']) && /jumătate a Sprint-ului/.test(ro[`work.endEarly${part}.scrum` as 'work.endEarly.scrum']), part);
    assert.ok(/half of the round/.test(en[`work.endEarly${part}.kanban` as 'work.endEarly.kanban']) && /jumătate a rundei/.test(ro[`work.endEarly${part}.kanban` as 'work.endEarly.kanban']), part);
  }
});

test('Romanian output joins a word and its ending with a non-breaking hyphen, English is untouched', () => {
  const nb = String.fromCharCode(0x2011);
  assert.equal(createT('ro')('script.scrum.inspect.card.1'), `Citește scopul cu voce tare, apoi începe Sprint Review${nb}ul.`);
  assert.equal(createT('ro')('lobby.kickAria', { name: 'Ana-Maria' }).includes('Ana-Maria'), true);
  assert.ok(!createT('en')('script.scrum.inspect.card.1').includes(nb));
  for (const key of keys) assert.ok(!/\p{L}-\p{L}/u.test(createT('ro')(key, Object.fromEntries(templateParams(en[key]).map((name) => [name, 3])))), `ro ${key} still has a breaking hyphen`);
});

test('the English wait text names the role with an article', () => {
  assert.ok(en['work.endEarly.wait.scrum'].includes('The {role}') && en['work.endEarly.wait.kanban'].includes('The {role}'));
});
