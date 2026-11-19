import type { LeaderboardEntry } from '../../core/index.ts';
import type { LeaderboardPort, Log } from './ports.ts';

const RetryMs = 10_000;

/**
 * What a room keeps about its leaderboard entry: the id it publishes under and the entry still to be delivered.
 */
export interface OutboxMeta {
  publishId: string;
  outbox: LeaderboardEntry | null;
  outboxAt: number;
}

/**
 * The entry a finished game owes the leaderboard, kept until a delivery succeeds.
 */
export class Outbox {
  private readonly leaderboard: LeaderboardPort;
  private readonly log: Log;
  private meta: OutboxMeta | null = null;

  constructor(leaderboard: LeaderboardPort, log: Log) {
    this.leaderboard = leaderboard;
    this.log = log;
  }

  load(stored: OutboxMeta | undefined): void {
    this.meta = stored ?? null;
  }

  /**
   * Starts an empty outbox under a fresh publish id.
   */
  init(publishId: string): void {
    this.meta = { publishId, outbox: null, outboxAt: 0 };
  }

  /**
   * The meta as it is written to storage.
   */
  snapshot(): OutboxMeta | null {
    return this.meta;
  }

  /**
   * When the next delivery is due, or null when nothing waits.
   */
  due(): { at: number } | null {
    return this.meta?.outbox ? { at: this.meta.outboxAt } : null;
  }

  /**
   * Puts an entry up for delivery; answers whether there was an outbox to hold it.
   */
  queue(entry: LeaderboardEntry, now: number): boolean {
    if (this.meta === null) return false;
    this.meta = { ...this.meta, outbox: entry, outboxAt: now };
    return true;
  }

  /**
   * Tries to deliver a due entry; answers whether the meta changed. The meta is read again after the await, so a change made meanwhile is kept.
   */
  async flush(now: number): Promise<boolean> {
    const sent = this.meta;
    if (sent === null || sent.outbox === null || now < sent.outboxAt) return false;
    const entry = sent.outbox;
    let delivered = false;
    try {
      await this.leaderboard.submit(sent.publishId, entry);
      delivered = true;
    } catch {
      delivered = false;
    }
    this.log('publish', { ok: delivered });
    const current = this.meta;
    if (current === null || current.outbox !== entry) return false;
    this.meta = delivered ? { ...current, outbox: null } : { ...current, outboxAt: now + RetryMs };
    return true;
  }

  clear(): void {
    this.meta = null;
  }
}
