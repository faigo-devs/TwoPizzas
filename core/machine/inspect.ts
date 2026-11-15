import { config } from '../config.ts';
import { createRng } from '../rng.ts';
import { isCorrect } from '../tasks/index.ts';
import type { Player, RoomState, Theme } from '../types.ts';
import { generateFeedbackItems, reorderBacklog } from './backlog.ts';
import { observe } from './observations.ts';
import { computeMetrics } from './scoring.ts';
import { enterRetro, recordEvent } from './transitions.ts';
import { currentIteration, itemNumber, resetItem, type Refusal } from './util.ts';

function inspectStep(s: RoomState): string | null {
  return s.phase.kind === 'inspect' ? s.phase.step : null;
}

function setStep(s: RoomState, step: 'increment' | 'result' | 'feedback'): void {
  if (s.phase.kind === 'inspect') s.phase.step = step;
}

/**
 * Opens the Increment: the Product Owner's verdict is decided for each item done in this Sprint and revealed one by one.
 */
export function inspectBegin(s: RoomState): void {
  const state = currentIteration(s);
  const done = s.items
    .filter((item) => item.status === 'done' && item.outcome === null && item.iteration === state.iteration)
    .sort((a, b) => (a.times.doneAt ?? 0) - (b.times.doneAt ?? 0) || itemNumber(a.id) - itemNumber(b.id));
  state.verdicts = done.map((item) => {
    const right = item.puzzle !== null && item.submission !== null && isCorrect(item.puzzle, item.submission);
    item.outcome = right ? 'accepted' : 'escaped_defect';
    return { itemId: item.id, outcome: item.outcome };
  });
  state.verdictsRevealed = 0;
  setStep(s, 'increment');
}

export function inspectReveal(s: RoomState, p: Player): Refusal {
  if (inspectStep(s) !== 'increment' || p.id !== s.facilitatorId) return 'not_allowed';
  const state = currentIteration(s);
  if (state.verdictsRevealed >= state.verdicts.length) return 'not_allowed';
  state.verdictsRevealed += 1;
  return null;
}

function returnItems(s: RoomState): void {
  const state = currentIteration(s);
  const defects = new Set(state.verdicts.filter((verdict) => verdict.outcome === 'escaped_defect').map((v) => v.itemId));
  const back = s.items.filter((item) => item.iteration === state.iteration && item.status !== 'backlog' && !(item.status === 'done' && item.outcome === 'accepted'));
  for (const item of back) {
    const escaped = defects.has(item.id);
    resetItem(item);
    item.defect = escaped;
  }
  for (const item of s.items) if (item.outcome === 'accepted') item.defect = false;
  reorderBacklog(s);
}

function applyFeedback(s: RoomState): void {
  const state = currentIteration(s);
  const rng = createRng(s.rng);
  const theme: Theme = rng.pick(config.backlog.themes);
  s.rng = rng.state();
  for (const item of s.items) {
    if (item.status === 'backlog' && item.theme === theme) item.value += config.feedback.shiftBonus;
  }
  const created = generateFeedbackItems(s, 2);
  state.feedback = { theme, bonus: config.feedback.shiftBonus, newItemIds: created.map((item) => item.id) };
  reorderBacklog(s);
}

function leaveInspect(s: RoomState): void {
  recordEvent(s);
  observe(s, 'inspect');
  enterRetro(s);
}

/**
 * Moves the Sprint Review on: Increment, then result, then the customers' feedback (after Sprint 1 only).
 */
export function inspectAdvance(s: RoomState, p: Player): Refusal {
  if (p.id !== s.facilitatorId) return 'not_allowed';
  const state = currentIteration(s);
  const step = inspectStep(s);
  if (step === 'increment') {
    if (state.verdictsRevealed < state.verdicts.length) return 'not_allowed';
    state.metrics = computeMetrics(s, state.iteration);
    returnItems(s);
    setStep(s, 'result');
    return null;
  }
  if (step === 'result') {
    if (state.iteration === 1) {
      applyFeedback(s);
      setStep(s, 'feedback');
    } else leaveInspect(s);
    return null;
  }
  if (step === 'feedback') {
    leaveInspect(s);
    return null;
  }
  return 'not_allowed';
}
