import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { config } from '../../../core/config.ts';
import { dictionaries, createT, privacyKeys, privacyParams } from '../index.ts';
import { identity } from '../identity.ts';
import type { Key } from '../index.ts';

const en = dictionaries.en;
const ro = dictionaries.ro;

function plural(count: number, one: string, other: string, few?: string): string {
  if (count === 1) return `${count} ${one}`;
  if (few !== undefined && count % 100 >= 2 && count % 100 <= 19) return `${count} ${few}`;
  return `${count} ${other}`;
}

test('the privacy text states the room delay and lifetime from the configuration', () => {
  const minutes = config.room.emptyGraceMs / 60_000;
  const hours = config.room.lifetimeMs / 3_600_000;
  const english = createT('en')('privacy.p3', privacyParams);
  assert.ok(english.includes(plural(minutes, 'minute', 'minutes')), english);
  assert.ok(english.includes(plural(hours, 'hour', 'hours')), english);
  const romanian = createT('ro')('privacy.p3', privacyParams);
  assert.ok(romanian.includes(`${minutes} `) && romanian.includes(`${hours} `), romanian);
});

test('the privacy text states how long the public list keeps a result', () => {
  assert.ok(createT('en')('privacy.p4', privacyParams).includes(`top ${config.leaderboard.top} `));
  assert.ok(createT('ro')('privacy.p4', privacyParams).includes(`primele ${config.leaderboard.top} `));
});

test('the device storage the page uses is the storage the privacy text names', () => {
  const source = readFileSync(join(import.meta.dirname, '..', '..', 'game', 'session.ts'), 'utf8');
  const keys = [...source.matchAll(/const (\w+) = '(lg-[a-z]+)';/g)].map((match) => match[2]).sort();
  assert.deepEqual(keys, ['lg-lang', 'lg-seat', 'lg-theme']);
  assert.ok(/StaleThemeKey/.test(source) && /removeItem\(StaleThemeKey\)/.test(source));
  assert.ok(en['privacy.p5'].includes('language') && en['privacy.p5'].includes('seat'));
  assert.ok(ro['privacy.p5'].includes('limba') && ro['privacy.p5'].includes('locul'));
});

test('the firm and its contact address appear in the privacy text and nowhere else on the page', () => {
  const text = createT('en')('privacy.p0', privacyParams);
  for (const value of Object.values(identity)) assert.ok(text.includes(value), `${value} is missing from the operator line`);
  for (const lang of ['en', 'ro'] as const) {
    for (const key of Object.keys(dictionaries[lang]) as Key[]) {
      if (key === 'privacy.p0') continue;
      for (const value of Object.values(identity)) assert.ok(!dictionaries[lang][key].includes(value), `${lang} ${key} repeats ${value}`);
    }
  }
  const roots = [join(import.meta.dirname, '..', '..')];
  const offenders: string[] = [];
  const walk = (directory: string): void => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) {
        if (name !== 'test') walk(path);
      } else if (/\.(tsx?|astro)$/.test(name) && !/[\\/]i18n[\\/](identity|en|ro)\.ts$/.test(path)) {
        const content = readFileSync(path, 'utf8');
        if (Object.values(identity).some((value) => content.includes(value))) offenders.push(path);
      }
    }
  };
  for (const root of roots) walk(root);
  assert.deepEqual(offenders, []);
});

test('the privacy text names the rights, the contact, the room code and the authority in both languages', () => {
  assert.ok(privacyKeys.includes('privacy.p7'));
  assert.ok(/access/.test(en['privacy.p7']) && /erasure/.test(en['privacy.p7']) && /ANSPDCP/.test(en['privacy.p7']) && /room code/.test(en['privacy.p7']));
  assert.ok(/acces/.test(ro['privacy.p7']) && /ștergere/.test(ro['privacy.p7']) && /ANSPDCP/.test(ro['privacy.p7']) && /codul camerei/.test(ro['privacy.p7']));
  assert.ok(/portable/.test(en['privacy.p7']) && /portabil/.test(ro['privacy.p7']));
  assert.ok(/copy of those clauses/.test(en['privacy.p6']) && /copie a acestor clauze/.test(ro['privacy.p6']));
});
