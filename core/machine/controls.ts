import { config } from '../config.ts';
import type { Control, Player, RoomState } from '../types.ts';
import { goalWinner } from './plan.ts';
import { rulesFor } from './rules.ts';
import { connectedPlayers, currentIteration } from './util.ts';

/**
 * What one player may do right now, derived from the same state the rules check.
 */
export function controlsFor(s: RoomState, p: Player): Control[] {
  const out: Control[] = [];
  const fac = p.id === s.facilitatorId;
  const phase = s.phase;
  if (phase.kind === 'lobby') {
    if (p.id === s.hostId && rulesFor(s).canStart(s) && connectedPlayers(s).length >= config.players.min) {
      out.push('start_game');
    }
    return out;
  }
  if (phase.kind === 'summary') {
    if (fac && !s.published) out.push('publish');
    return out;
  }
  if (phase.kind === 'daily' && phase.step === 'walk') out.push('end_daily');
  if (!fac) return out;
  if (phase.step === 'card') {
    out.push('begin_phase');
    return out;
  }
  const state = currentIteration(s);
  if (phase.kind === 'plan') {
    if (phase.step === 'goal' && goalWinner(s) !== null) out.push('confirm_goal');
    if (phase.step === 'estimate') {
      const poker = state.poker;
      if (poker !== null) {
        if (!poker.revealed && Object.keys(poker.votes).length > 0) out.push('poker_reveal');
        if (poker.revealed && poker.revotesUsed < config.poker.revotesAllowed) out.push('poker_revote');
        if (poker.revealed) out.push('poker_record');
      }
      out.push('stop_estimation');
    }
    if (phase.step === 'commit' && s.items.some((item) => item.status === 'todo')) out.push('advance');
    if (phase.step === 'replenish' && s.items.some((item) => item.status === 'todo')) out.push('advance');
    if (phase.step === 'limits') out.push('set_limits', 'advance');
  } else if (phase.kind === 'inspect') {
    if (phase.step === 'increment' && state.verdictsRevealed < state.verdicts.length) out.push('reveal_verdict');
    else out.push('advance');
  } else if (phase.kind === 'retro') {
    if (phase.step === 'notes') out.push('reveal_notes');
    else if (phase.step === 'action') out.push('choose_action', 'advance');
    else out.push('advance');
  }
  return out;
}
