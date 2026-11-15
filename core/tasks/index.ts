import { config } from '../config.ts';
import type { Puzzle, PuzzleKind, PuzzleResponse, PuzzleSpec } from '../types.ts';
import { generateIncident } from './incident.ts';
import { generateMerge } from './merge.ts';
import { generateOrder } from './order.ts';
import { generateReview } from './review.ts';

export { Actions, Components, Indicators, MergeRules, MergeSettings, ReviewSettings } from './data.ts';
export { resolveConflict } from './merge.ts';

const TokenPattern = /^[a-z0-9][a-z0-9_.-]*$/;

function isToken(value: unknown): value is string {
  return typeof value === 'string' && value.length <= config.puzzle.limits.tokenLengthMax && TokenPattern.test(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(value);
  return own.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isTokenList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= config.puzzle.limits.listLengthMax && value.every(isToken);
}

/**
 * Builds the parts and the answer of one puzzle; the same spec always gives the same puzzle.
 */
export function generatePuzzle(spec: PuzzleSpec): Puzzle {
  const { kind, size, seed, workers, dependency } = spec;
  if (kind === 'review') return generateReview(size, seed, workers, dependency);
  if (kind === 'order') return generateOrder(size, seed, workers, dependency);
  if (kind === 'incident') return generateIncident(size, seed, workers, dependency);
  return generateMerge(size, seed, workers, dependency);
}

/**
 * Whether a response is the puzzle's answer; a response of another kind is never correct.
 */
export function isCorrect(puzzle: Puzzle, response: PuzzleResponse): boolean {
  if (puzzle.kind === 'review' && response.kind === 'review') {
    const given = [...response.keys].sort();
    return given.length === puzzle.answer.keys.length && given.every((key, index) => key === puzzle.answer.keys[index]);
  }
  if (puzzle.kind === 'order' && response.kind === 'order') {
    return (
      response.order.length === puzzle.answer.order.length &&
      response.order.every((name, index) => name === puzzle.answer.order[index])
    );
  }
  if (puzzle.kind === 'incident' && response.kind === 'incident') {
    return response.action === puzzle.answer.action;
  }
  if (puzzle.kind === 'merge' && response.kind === 'merge') {
    return (
      response.values.length === puzzle.answer.values.length &&
      response.values.every((value, index) => value === puzzle.answer.values[index])
    );
  }
  return false;
}

/**
 * Checks the shape of an untrusted response of a given kind and returns a clean copy, or null when it is malformed.
 */
export function parseResponse(kind: PuzzleKind, raw: unknown): PuzzleResponse | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (value.kind !== kind) return null;
  if (kind === 'review') {
    if (!hasExactKeys(value, ['kind', 'keys']) || !isTokenList(value.keys)) return null;
    if (new Set(value.keys).size !== value.keys.length) return null;
    return { kind, keys: [...value.keys] };
  }
  if (kind === 'order') {
    if (!hasExactKeys(value, ['kind', 'order']) || !isTokenList(value.order)) return null;
    if (new Set(value.order).size !== value.order.length) return null;
    return { kind, order: [...value.order] };
  }
  if (kind === 'incident') {
    if (!hasExactKeys(value, ['kind', 'action']) || !isToken(value.action)) return null;
    return { kind, action: value.action };
  }
  if (!hasExactKeys(value, ['kind', 'values']) || !Array.isArray(value.values)) return null;
  if (value.values.length > config.puzzle.limits.listLengthMax) return null;
  const limit = config.puzzle.limits.mergeValueMax;
  const numbers = value.values as unknown[];
  if (!numbers.every((item) => typeof item === 'number' && Number.isInteger(item) && item >= 0 && item <= limit)) {
    return null;
  }
  return { kind: 'merge', values: [...(numbers as number[])] };
}
