import assert from 'node:assert/strict';
import { test } from 'node:test';
import { itemsOfTheme } from '../format.ts';

test('the goal vote lists the items of one theme as id and name, in backlog order', () => {
  const view = {
    items: [
      { id: 'A1', theme: 'payments', subject: 'checkout-service' },
      { id: 'A2', theme: 'accounts', subject: 'login-flow' },
      { id: 'A3', theme: 'payments', subject: 'invoice-export' },
    ],
  } as unknown as Parameters<typeof itemsOfTheme>[0];
  assert.deepEqual(itemsOfTheme(view, 'payments'), [
    { id: 'A1', subject: 'checkout-service' },
    { id: 'A3', subject: 'invoice-export' },
  ]);
  assert.deepEqual(itemsOfTheme(view, 'platform'), []);
});
