import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { init, leave } from '../controller.ts';
import { store } from '../store.ts';
import { stubGlobals } from './support.ts';
import type { GlobalStubs } from './support.ts';

describe('init', () => {
  let stubs: GlobalStubs;

  afterEach(() => {
    leave();
    stubs.restore();
  });

  it('reads the language, starts the local mode the address asks for and runs only once', () => {
    stubs = stubGlobals();
    (globalThis as unknown as { location: { search: string } }).location.search = '?local=1&framework=kanban';
    stubs.storage.set('lg-lang', 'en');
    init();
    assert.equal(store.get().lang, 'en');
    assert.equal(store.get().mode, 'local');
    assert.equal(store.get().view?.framework, 'kanban');
    leave();
    init();
    assert.equal(store.get().mode, null);
  });
});
