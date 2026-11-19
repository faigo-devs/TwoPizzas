import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { inRegion } from '../src/region.ts';

interface Namespace {
  name: string;
  jurisdiction(name: 'eu'): Namespace;
}

function fake(calls: string[]): Namespace {
  return {
    name: 'open',
    jurisdiction(name) {
      calls.push(name);
      return { name: 'eu', jurisdiction: () => assert.fail('twice') };
    },
  };
}

test('every value but "local", a missing one included, reaches objects only through the EU-restricted namespace', () => {
  const calls: string[] = [];
  for (const value of ['eu', undefined, '', 'EU', 'us', 'Local']) assert.equal(inRegion(fake(calls), value).name, 'eu');
  assert.deepEqual(calls, ['eu', 'eu', 'eu', 'eu', 'eu', 'eu']);
});

test('only the exact value "local", set for local development, leaves the namespace unrestricted', () => {
  const calls: string[] = [];
  assert.equal(inRegion(fake(calls), 'local').name, 'open');
  assert.deepEqual(calls, []);
});

test('the deployed configuration names the EU jurisdiction', () => {
  const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  assert.match(toml, /^DO_JURISDICTION = "eu"$/m);
});
