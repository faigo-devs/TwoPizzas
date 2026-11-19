import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { serverNow, store } from '../store.ts';

describe('store', () => {
  it('merges a patch, notifies subscribers and stops after unsubscribe', () => {
    let calls = 0;
    const off = store.subscribe(() => {
      calls += 1;
    });
    const before = store.get();
    store.set({ status: 'open' });
    assert.equal(store.get().status, 'open');
    assert.equal(store.get().lang, before.lang);
    assert.notEqual(store.get(), before);
    assert.equal(calls, 1);
    off();
    store.set({ status: 'idle' });
    assert.equal(calls, 1);
  });

  it('lets a listener unsubscribe while being notified', () => {
    const order: string[] = [];
    const off = store.subscribe(() => {
      order.push('a');
      off();
    });
    store.subscribe(() => order.push('b'));
    store.set({ copied: true });
    store.set({ copied: false });
    assert.deepEqual(order, ['a', 'b', 'b']);
  });

  it('estimates the server time from the last view and the time elapsed since', () => {
    const at = performance.now() - 1500;
    const estimate = serverNow({ server: 10_000, at });
    assert.ok(estimate >= 11_500 && estimate < 13_000);
    assert.ok(Math.abs(serverNow(null) - Date.now()) < 50);
  });
});
