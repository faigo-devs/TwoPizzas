import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../../ui/Confirm.tsx', import.meta.url), 'utf8');
const parts = readFileSync(new URL('../screens/ReviewParts.tsx', import.meta.url), 'utf8');
const retro = readFileSync(new URL('../screens/Retro.tsx', import.meta.url), 'utf8');

test('a confirm opens with focus on Cancel, never on the destructive answer', () => {
  assert.ok(source.includes("querySelector<HTMLElement>('[data-cancel] button')?.focus()"));
  assert.equal(source.includes("querySelector<HTMLElement>('[data-confirm]')?.focus()"), false);
});

test('Escape cancels a confirm and focus returns to the control that opened it', () => {
  assert.ok(source.includes("event.key !== 'Escape'"));
  assert.ok(/Escape[\s\S]*returning\.current = true;[\s\S]*setAsking\(false\)/.test(source));
  assert.ok(source.includes("root.current?.querySelector<HTMLElement>('button')?.focus()"));
});

test('the retrospective asks before ending with no action chosen', () => {
  assert.ok(parts.includes('<ConfirmAction'));
  assert.ok(retro.includes('confirm={retro.action === null ?'));
});
