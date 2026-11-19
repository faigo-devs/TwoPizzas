import type { ItemView } from '../../core/index.ts';

export type Draft =
  | { kind: 'review'; marked: string[] }
  | { kind: 'order'; order: string[] }
  | { kind: 'incident'; action: string | null }
  | { kind: 'merge'; values: string[] };

const kept = new Map<string, Draft>();

/**
 * The unsent answer kept for an item, or null when none of that kind is kept.
 */
export function loadDraft<K extends Draft['kind']>(itemId: string, kind: K): Extract<Draft, { kind: K }> | null {
  const found = kept.get(itemId);
  return found !== undefined && found.kind === kind ? (found as Extract<Draft, { kind: K }>) : null;
}

/**
 * Keeps the unsent answer of an item in the client until it is submitted or the item leaves the player.
 */
export function saveDraft(itemId: string, draft: Draft): void {
  kept.set(itemId, draft);
}

/**
 * Drops the draft of one item.
 */
export function clearDraft(itemId: string): void {
  kept.delete(itemId);
}

/**
 * Drops every draft whose item is no longer the player's work in progress or has been submitted.
 */
export function pruneDrafts(items: readonly ItemView[], selfId: string): void {
  for (const id of [...kept.keys()]) {
    const item = items.find((own) => own.id === id);
    if (item === undefined || item.status !== 'doing' || item.submitted || !item.workers.includes(selfId)) kept.delete(id);
  }
}

/**
 * Drops every draft.
 */
export function clearDrafts(): void {
  kept.clear();
}
