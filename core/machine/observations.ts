import type { IterationNumber, Observation, ObservationEntry, ObservationGroup, RoomState } from '../types.ts';
import { config } from '../config.ts';
import type { Candidate } from './candidates.ts';
import { rulesFor } from './rules.ts';
import { currentIteration } from './util.ts';

function choose(candidates: Candidate[]): Candidate[] {
  const limit = config.observations.maxPerEvent;
  const positive = candidates.filter((candidate) => candidate.positive);
  const watch = candidates.filter((candidate) => !candidate.positive);
  const chosen: Candidate[] = [];
  const first = positive[0];
  const second = watch[0];
  if (first !== undefined) chosen.push(first);
  if (second !== undefined) chosen.push(second);
  for (const candidate of candidates) {
    if (chosen.length >= limit) break;
    if (!chosen.includes(candidate)) chosen.push(candidate);
  }
  return candidates.filter((candidate) => chosen.includes(candidate)).slice(0, limit);
}

/**
 * Computes the observations of the phase that just ended and makes them the current group.
 */
export function observe(s: RoomState, group: ObservationGroup): void {
  const iteration: IterationNumber = currentIteration(s).iteration;
  const picked: Observation[] = choose(rulesFor(s).observationCandidates(s, group)).map((candidate) => ({
    id: candidate.id,
    iteration,
    positive: candidate.positive,
    params: candidate.params,
  }));
  s.observationsFrom = s.observations.length;
  s.observations.push(...picked);
}

export function latestObservations(s: RoomState): Observation[] {
  return s.observations.slice(s.observationsFrom);
}

const GroupOrder: readonly ObservationGroup[] = ['plan', 'daily', 'work', 'inspect', 'retro'];

/**
 * Every observation the game made, grouped by iteration and event in play order; events without one carry an empty list.
 */
export function observationHistory(s: RoomState): ObservationEntry[] {
  const out: ObservationEntry[] = [];
  for (const iteration of s.iterations) {
    for (const event of GroupOrder) {
      const observations = s.observations
        .filter((observation) => observation.iteration === iteration.iteration && observation.id.startsWith(`${event}.`))
        .map((observation) => ({ ...observation, params: { ...observation.params } }));
      out.push({ iteration: iteration.iteration, event, observations });
    }
  }
  return out;
}
