import { config } from '../config.ts';
import type {
  HeldInfo,
  InspectView,
  ItemView,
  Player,
  PlanningView,
  PlayerView,
  PublicPlayer,
  RetroColumn,
  RetroNoteView,
  RetroView,
  RoomState,
  ScriptStep,
  SummaryView,
  Theme,
  WorkItem,
  WorkspaceView,
} from '../types.ts';
import { controlsFor } from './controls.ts';
import { latestObservations } from './observations.ts';
import { rulesFor } from './rules.ts';
import { helpProposals, helpQuestions } from './help.ts';
import { computeScore } from './scoring.ts';
import { currentIteration, findPlayer, isBlocked, median, waitsForPair } from './util.ts';

function revealedIds(s: RoomState): Set<string> {
  const ids = new Set<string>();
  for (const iteration of s.iterations) {
    for (const verdict of iteration.verdicts.slice(0, iteration.verdictsRevealed)) ids.add(verdict.itemId);
  }
  return ids;
}

function itemView(item: WorkItem, revealed: Set<string>): ItemView {
  return {
    id: item.id,
    kind: item.kind,
    value: item.value,
    theme: item.theme,
    subject: item.subject,
    estimate: item.estimate,
    status: item.status,
    workersNeeded: item.workersNeeded,
    workers: [...item.workers],
    waitingForPair: waitsForPair(item),
    blocked: isBlocked(item),
    helpPromisedBy: item.helpPromisedBy,
    reviewer: item.reviewer,
    submitted: item.submission !== null,
    changesRequested: item.changesRequested,
    arrivedAt: item.times.arrivedAt,
    startedAt: item.times.startedAt,
    submittedAt: item.times.submittedAt,
    outcome: item.outcome !== null && revealed.has(item.id) ? item.outcome : null,
  };
}

function publicPlayer(s: RoomState, player: Player): PublicPlayer {
  return {
    id: player.id,
    seat: player.seat,
    name: player.name,
    connected: player.connected,
    isHost: s.hostId === player.id,
    role: s.facilitatorId === player.id ? 'facilitator' : 'developer',
    openItemId: player.open?.itemId ?? null,
    workingOn: s.items
      .filter((item) => (item.status === 'doing' || item.status === 'review') && item.workers.includes(player.id))
      .map((item) => item.id),
  };
}

function workspaceView(s: RoomState, p: Player, now: number): WorkspaceView | null {
  if (s.phase.kind !== 'work' || s.phase.step !== 'running' || p.open === null) return null;
  const item = s.items.find((own) => own.id === p.open?.itemId);
  if (item === undefined || item.puzzle === null) return null;
  const ready = now >= p.open.readyAt;
  if (p.open.mode === 'work') {
    const index = Math.max(0, item.workers.indexOf(p.id));
    const part = item.puzzle.parts[index] ?? item.puzzle.parts[0] ?? null;
    return {
      itemId: item.id,
      mode: 'work',
      readyAt: p.open.readyAt,
      part: ready ? part : null,
      submission: null,
      canSubmit: ready && item.status === 'doing' && item.workers.includes(p.id),
      canVerdict: false,
    };
  }
  const allowed = item.status === 'review' && item.reviewer === p.id;
  return {
    itemId: item.id,
    mode: 'review',
    readyAt: p.open.readyAt,
    part: ready && allowed ? item.puzzle.fullPart : null,
    submission: ready && allowed ? item.submission : null,
    canSubmit: false,
    canVerdict: ready && allowed,
  };
}

function heldInfo(s: RoomState, p: Player): HeldInfo[] {
  if (s.phase.kind !== 'work' && s.phase.kind !== 'daily') return [];
  return s.items.flatMap((item) =>
    item.status === 'doing' &&
    item.dependencyHolder === p.id &&
    item.puzzle !== null &&
    item.puzzle.dependencyPart !== null
      ? [{ itemId: item.id, part: item.puzzle.dependencyPart }]
      : [],
  );
}

function planningView(s: RoomState, p: Player): PlanningView {
  const state = currentIteration(s);
  const goalVotes = Object.fromEntries(config.backlog.themes.map((theme) => [theme, 0])) as Record<Theme, number>;
  for (const theme of Object.values(state.goalVotes)) goalVotes[theme] += 1;
  const poker = state.poker;
  const votes = poker === null ? [] : Object.values(poker.votes);
  const planned = s.items.filter((item) => item.status === 'backlog' || item.status === 'todo');
  return {
    goalOptions: [...state.goalOptions],
    goal: state.goal,
    myGoalVote: state.goalVotes[p.id] ?? null,
    goalVotes,
    poker:
      poker === null
        ? null
        : {
            itemId: poker.itemId,
            voted: Object.keys(poker.votes),
            myVote: poker.votes[p.id] ?? null,
            revealed: poker.revealed,
            votes: poker.revealed ? { ...poker.votes } : null,
            median: poker.revealed && votes.length > 0 ? median(votes) : null,
            revotesLeft: Math.max(0, config.poker.revotesAllowed - poker.revotesUsed),
          },
    estimatedCount: planned.filter((item) => item.estimate !== null).length,
    totalEstimate: s.items
      .filter((item) => item.status === 'todo')
      .reduce((sum, item) => sum + (item.estimate ?? 0), 0),
    previousVelocity: state.signals.previousVelocity,
    estimationStopped: state.estimationStopped,
  };
}

function inspectView(s: RoomState): InspectView {
  const state = currentIteration(s);
  const step = s.phase.kind === 'inspect' ? s.phase.step : 'card';
  const shown = step === 'result' || step === 'feedback';
  const metrics = state.metrics;
  return {
    verdicts: state.verdicts.slice(0, state.verdictsRevealed).map((verdict) => ({ ...verdict })),
    verdictsTotal: state.verdicts.length,
    goal: state.goal,
    goalMet: shown ? metrics?.goalMet ?? null : null,
    valueDelivered: shown ? metrics?.valueDelivered ?? null : null,
    goalBonus: shown ? metrics?.goalBonus ?? null : null,
    velocity: shown ? metrics?.velocity ?? null : null,
    feedback: step === 'feedback' && state.feedback !== null ? { ...state.feedback } : null,
  };
}

function retroView(s: RoomState, p: Player): RetroView {
  const state = currentIteration(s);
  const retro = state.retro;
  const counts = new Map<string, number>();
  for (const ids of Object.values(retro.votes)) for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const visible = retro.revealed ? retro.notes : retro.notes.filter((note) => note.authorId === p.id);
  const notes: RetroNoteView[] = visible.map((note) => ({
    id: note.id,
    authorId: note.authorId === p.id ? p.id : null,
    column: note.column,
    text: note.text,
    mine: note.authorId === p.id,
    votes: retro.revealed ? counts.get(note.id) ?? 0 : null,
  }));
  const hiddenCounts = Object.fromEntries(config.retro.columns.map((column) => [column, 0])) as Record<RetroColumn, number>;
  if (!retro.revealed) {
    for (const note of retro.notes) if (note.authorId !== p.id) hiddenCounts[note.column] += 1;
  }
  const myVotes = [...(retro.votes[p.id] ?? [])];
  const help = retro.help[p.id];
  return {
    notes,
    hiddenCounts,
    revealed: retro.revealed,
    votesLeft: Math.max(0, config.retro.votesPerPlayer - myVotes.length),
    myVotes,
    action: retro.action,
    previous: state.iteration === 2 ? state.metrics?.agreement ?? null : null,
    suggestedAgreements: rulesFor(s).suggestedAgreements(s),
    help: help === undefined ? null : { questions: helpQuestions(s), proposals: helpProposals(s, help) },
  };
}

function summaryView(s: RoomState, p: Player): SummaryView {
  return {
    score: computeScore(s),
    metrics: s.iterations.flatMap((iteration) => (iteration.metrics === null ? [] : [iteration.metrics])),
    recap: s.events.map((event) => ({ ...event })),
    published: s.published,
    canPublish: s.facilitatorId === p.id && !s.published,
  };
}

const ScriptSteps = {
  plan: ['card', 'goal', 'estimate', 'commit'],
  daily: ['card', 'walk'],
  inspectFirst: ['card', 'increment', 'result', 'feedback'],
  inspectSecond: ['card', 'increment', 'result'],
  retroFirst: ['card', 'notes', 'vote', 'action'],
  retroSecond: ['card', 'previous', 'notes', 'vote', 'action'],
} as const;

function scriptFor(s: RoomState, p: Player): ScriptStep | null {
  const phase = s.phase;
  if (p.id !== s.facilitatorId) return null;
  if (phase.kind === 'lobby' || phase.kind === 'summary' || phase.kind === 'work') return null;
  const first = phase.iteration === 1;
  let steps: readonly string[] = ScriptSteps.plan;
  if (phase.kind === 'daily') steps = ScriptSteps.daily;
  if (phase.kind === 'inspect') steps = first ? ScriptSteps.inspectFirst : ScriptSteps.inspectSecond;
  if (phase.kind === 'retro') steps = first ? ScriptSteps.retroFirst : ScriptSteps.retroSecond;
  const position = Math.max(0, steps.indexOf(phase.step));
  return { event: phase.kind, step: phase.step, index: position + 1, total: steps.length };
}

/**
 * Builds what one player may see; it never carries sizes, answers, correctness, other players' parts or notes, or the seed.
 */
export function viewFor(s: RoomState, playerId: string, now: number): PlayerView {
  const p = findPlayer(s, playerId);
  if (p === undefined) throw new Error('unknown player');
  const phase = s.phase;
  const revealed = revealedIds(s);
  return {
    now,
    code: s.code,
    framework: s.framework,
    iteration: phase.kind === 'lobby' || phase.kind === 'summary' ? null : phase.iteration,
    selfId: p.id,
    teamName: s.teamName,
    players: [...s.players].sort((a, b) => a.seat - b.seat).map((player) => publicPlayer(s, player)),
    hostId: s.hostId,
    facilitatorId: s.facilitatorId,
    phase: JSON.parse(JSON.stringify(phase)),
    script: scriptFor(s, p),
    controls: controlsFor(s, p),
    items: s.items.map((item) => itemView(item, revealed)),
    limits: null,
    workspace: workspaceView(s, p, now),
    held: heldInfo(s, p),
    planning: phase.kind === 'plan' ? planningView(s, p) : null,
    inspect: phase.kind === 'inspect' ? inspectView(s) : null,
    retro: phase.kind === 'retro' ? retroView(s, p) : null,
    observations: latestObservations(s).map((observation) => ({ ...observation, params: { ...observation.params } })),
    metrics: s.iterations.flatMap((iteration) => (iteration.metrics === null ? [] : [iteration.metrics])),
    summary: phase.kind === 'summary' ? summaryView(s, p) : null,
  };
}
