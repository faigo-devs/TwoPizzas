import type { PlayerId } from '../../core/index.ts';
import { sha256Hex } from '../../core/sha256.ts';
import { safeEqual, toBase64Url } from './encoding.ts';
import type { Random } from './ports.ts';

const PlayerIdBytes = 12;
const TokenBytes = 24;

export type TokenHashes = Record<PlayerId, string>;

/**
 * The seats of one room: only the hash of each seat's token is kept, and a seat is proven by comparing hashes.
 */
export class SeatRegistry {
  private hashes: TokenHashes = {};

  /**
   * Replaces the registry with what storage held.
   */
  load(stored: TokenHashes | undefined): void {
    this.hashes = stored ?? {};
  }

  /**
   * The hashes as they are written to storage.
   */
  snapshot(): TokenHashes {
    return this.hashes;
  }

  /**
   * Whether the token belongs to the seat; an unknown seat costs the same comparison as a wrong token.
   */
  verify(playerId: PlayerId, token: string): boolean {
    const stored = Object.hasOwn(this.hashes, playerId) ? (this.hashes[playerId] ?? '') : '';
    const known = stored !== '';
    const matches = safeEqual(known ? stored : sha256Hex(playerId), sha256Hex(token));
    return known && matches;
  }

  /**
   * Draws a new seat id and its secret token; the seat is not recorded until bind.
   */
  issue(random: Random): { playerId: PlayerId; token: string } {
    return { playerId: toBase64Url(random(PlayerIdBytes)), token: toBase64Url(random(TokenBytes)) };
  }

  /**
   * Records the hash of a seat's token.
   */
  bind(playerId: PlayerId, token: string): void {
    this.hashes = { ...this.hashes, [playerId]: sha256Hex(token) };
  }

  /**
   * Forgets every seat that is no longer a player; answers whether anything was removed.
   */
  prune(players: readonly { id: PlayerId }[]): boolean {
    let removed = false;
    for (const id of Object.keys(this.hashes)) {
      if (players.some((player) => player.id === id)) continue;
      const { [id]: _gone, ...rest } = this.hashes;
      this.hashes = rest;
      removed = true;
    }
    return removed;
  }

  clear(): void {
    this.hashes = {};
  }
}
