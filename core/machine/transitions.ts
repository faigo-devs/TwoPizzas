import { config } from '../config.ts';
import type { EventRecord, IterationNumber, IterationState, PlayerId, RoomState } from '../types.ts';
import { sweepOpenWaits } from './agreements.ts';
import { flowResume } from './flow.ts';
import { observe } from './observations.ts';
import { rulesFor } from './rules.ts';
import { at, box, currentIteration, emptySignals, nextConnectedAfter, startBox } from './util.ts';

function isHard(end: string): boolean {
  return end === 'hard';
}

function newIteration(iteration: IterationNumber, facilitatorId: PlayerId | null): IterationState {
  return {
    iteration,
    facilitatorId,
    goalOptions: [],
    goalVotes: {},
    goal: null,
    poker: null,
    estimationStopped: false,
    wipLimits: { inProgress: null, review: null },
    nextArrivalAt: null,
    arrivalsLeft: 0,
    flowEndedAt: null,
    verdicts: [],
    verdictsRevealed: 0,
    dailySpan: null,
    feedback: null,
    retro: { notes: [], nextNoteNumber: 1, revealed: false, votes: {}, action: null, help: {} },
    signals: emptySignals(),
    metrics: null,
  };
}

/**
 * Opens an iteration on the card of its planning; iteration 2 passes the facilitator role on first.
 */
export function startIteration(s: RoomState, iteration: IterationNumber): void {
  if (iteration === 2) {
    const next = nextConnectedAfter(s, s.facilitatorId);
    if (next !== undefined) s.facilitatorId = next.id;
  }
  const state = newIteration(iteration, s.facilitatorId);
  s.iterations.push(state);
  rulesFor(s).onIterationStart(s, state, iteration);
  s.phase = {
    kind: 'plan',
    iteration,
    timebox: box(at(config.timeboxMs.plan, iteration), isHard(config.phaseEnds.plan)),
    step: 'card',
  };
}

/**
 * Appends the record of the event that is ending and returns it; the Sprint itself has no record.
 */
export function recordEvent(s: RoomState): EventRecord | null {
  const phase = s.phase;
  if (phase.kind === 'lobby' || phase.kind === 'summary' || phase.kind === 'work') return null;
  const startedAt = phase.timebox.startedAt ?? s.now;
  const usedMs = Math.max(0, s.now - startedAt);
  const record: EventRecord = {
    kind: phase.kind,
    iteration: phase.iteration,
    timeboxMs: phase.timebox.durationMs,
    usedMs,
    overrunMs: Math.max(0, usedMs - phase.timebox.durationMs),
  };
  s.events.push(record);
  return record;
}

function clearOpen(s: RoomState): void {
  for (const player of s.players) player.open = null;
}

export function enterWorkCard(s: RoomState, iteration: IterationNumber): void {
  s.phase = {
    kind: 'work',
    iteration,
    half: 1,
    timebox: box(config.timeboxMs.workHalf, isHard(config.phaseEnds.work)),
    step: 'card',
  };
}

export function enterDaily(s: RoomState): void {
  const state = currentIteration(s);
  clearOpen(s);
  state.dailySpan = { from: s.now, to: null };
  state.signals.dailyChanges = 0;
  s.phase = {
    kind: 'daily',
    iteration: state.iteration,
    timebox: box(config.timeboxMs.daily, isHard(config.phaseEnds.daily)),
    step: 'card',
  };
}

export function resumeWork(s: RoomState): void {
  const state = currentIteration(s);
  if (state.dailySpan !== null) state.dailySpan.to = s.now;
  flowResume(s, state);
  const timebox = box(config.timeboxMs.workHalf, isHard(config.phaseEnds.work));
  startBox(timebox, s.now);
  s.phase = { kind: 'work', iteration: state.iteration, half: 2, timebox, step: 'running' };
}

export function enterInspect(s: RoomState): void {
  const state = currentIteration(s);
  clearOpen(s);
  s.phase = {
    kind: 'inspect',
    iteration: state.iteration,
    timebox: box(at(config.timeboxMs.inspect, state.iteration), isHard(config.phaseEnds.inspect)),
    step: 'card',
  };
}

export function enterRetro(s: RoomState): void {
  const state = currentIteration(s);
  s.phase = {
    kind: 'retro',
    iteration: state.iteration,
    timebox: box(at(config.timeboxMs.retro, state.iteration), isHard(config.phaseEnds.retro)),
    step: 'card',
  };
}

export function enterSummary(s: RoomState): void {
  s.phase = { kind: 'summary' };
}

/**
 * The Sprint's hard end: the first half leads to the Daily Scrum, the second to the Sprint Review.
 */
export function endWorkHalf(s: RoomState, early = false): void {
  if (s.phase.kind !== 'work') return;
  if (s.phase.half === 1) {
    enterDaily(s);
    return;
  }
  currentIteration(s).flowEndedAt = early ? s.now : (s.phase.timebox.deadline ?? s.now);
  sweepOpenWaits(s);
  observe(s, 'work');
  enterInspect(s);
}
