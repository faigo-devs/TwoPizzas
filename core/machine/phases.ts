import type { Player, RoomState } from '../types.ts';
import { dailyBegin } from './daily.ts';
import { retroAdvance, retroBegin } from './retro.ts';
import { rulesFor } from './rules.ts';
import { startBox, type Refusal } from './util.ts';

/**
 * The facilitator begins the phase that is showing its card; its timebox starts now.
 */
export function phaseBegin(s: RoomState, p: Player): Refusal {
  const phase = s.phase;
  if (phase.kind === 'lobby' || phase.kind === 'summary') return 'not_allowed';
  if (p.id !== s.facilitatorId || phase.step !== 'card') return 'not_allowed';
  startBox(phase.timebox, s.now);
  const rules = rulesFor(s);
  if (phase.kind === 'plan') rules.planBegin(s);
  else if (phase.kind === 'work') phase.step = 'running';
  else if (phase.kind === 'daily') dailyBegin(s);
  else if (phase.kind === 'inspect') rules.inspectBegin(s);
  else retroBegin(s);
  return null;
}

/**
 * The facilitator moves the current event to its next step or ends it.
 */
export function phaseAdvance(s: RoomState, p: Player): Refusal {
  const rules = rulesFor(s);
  switch (s.phase.kind) {
    case 'plan':
      return rules.planAdvance(s, p);
    case 'inspect':
      return rules.inspectAdvance(s, p);
    case 'retro':
      return retroAdvance(s, p);
    default:
      return 'not_allowed';
  }
}
