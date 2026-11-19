import type { LeaderboardResponse } from '../../core/index.ts';

export interface Stamped {
  at: number;
  body: LeaderboardResponse;
}

/**
 * A second, shared place for the cached list, such as the edge cache; failures are ignored by the caller.
 */
export interface EdgeStore {
  read(): Promise<Stamped | null>;
  write(value: Stamped): Promise<void>;
}

/**
 * Keeps the leaderboard for a fixed time in memory and, when given, in an edge store; concurrent misses share one load.
 */
export class BoardCache {
  private readonly ttlMs: number;
  private readonly now: () => number;
  private held: Stamped | null = null;
  private loading: Promise<LeaderboardResponse> | null = null;

  constructor(ttlMs: number, now: () => number) {
    this.ttlMs = ttlMs;
    this.now = now;
  }

  /**
   * Returns the cached list while it is fresh, otherwise loads it once and stores it.
   */
  async get(load: () => Promise<LeaderboardResponse>, store?: EdgeStore): Promise<LeaderboardResponse> {
    if (this.fresh(this.held)) return (this.held as Stamped).body;
    if (this.loading !== null) return this.loading;
    this.loading = this.fill(load, store).finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  private fresh(value: Stamped | null): boolean {
    if (value === null) return false;
    const age = this.now() - value.at;
    return age >= 0 && age < this.ttlMs;
  }

  private async fill(load: () => Promise<LeaderboardResponse>, store?: EdgeStore): Promise<LeaderboardResponse> {
    const shared = store === undefined ? null : await attempt(() => store.read());
    if (shared !== null && this.fresh(shared)) {
      this.held = shared;
      return shared.body;
    }
    const body = await load();
    const stamped: Stamped = { at: this.now(), body };
    this.held = stamped;
    if (store !== undefined) await attempt(() => store.write(stamped));
    return body;
  }
}

async function attempt<T>(body: () => Promise<T>): Promise<T | null> {
  try {
    return await body();
  } catch {
    return null;
  }
}
