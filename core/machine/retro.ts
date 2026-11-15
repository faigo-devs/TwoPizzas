import { config } from '../config.ts';
import type { Player, RoomState, StampedClientAction } from '../types.ts';
import { helpProposals, helpQuestions } from './help.ts';
import { observe } from './observations.ts';
import { rulesFor } from './rules.ts';
import { enterSummary, recordEvent, startIteration } from './transitions.ts';
import { currentIteration, sanitize, type Refusal } from './util.ts';

function retroStep(s: RoomState): string | null {
  return s.phase.kind === 'retro' ? s.phase.step : null;
}

function setStep(s: RoomState, step: 'previous' | 'notes' | 'vote' | 'action'): void {
  if (s.phase.kind === 'retro') s.phase.step = step;
}

/**
 * The step a retrospective opens on: the result of the earlier agreement in Sprint 2, otherwise the notes.
 */
export function retroBegin(s: RoomState): void {
  setStep(s, currentIteration(s).iteration === 2 ? 'previous' : 'notes');
}

/**
 * Handles every retrospective action except the facilitator's moves forward.
 */
export function retroAction(s: RoomState, action: StampedClientAction, p: Player): Refusal {
  if (s.phase.kind !== 'retro') return 'not_allowed';
  const state = currentIteration(s);
  const retro = state.retro;
  const step = retroStep(s);
  const fac = p.id === s.facilitatorId;
  switch (action.type) {
    case 'retro.note_add': {
      if (step !== 'notes') return 'not_allowed';
      if (!(config.retro.columns as readonly string[]).includes(action.column)) return 'bad_request';
      const text = sanitize(action.text, config.retro.noteMax);
      if (text.length === 0) return 'bad_request';
      if (retro.notes.filter((note) => note.authorId === p.id).length >= config.retro.notesPerPlayerMax) {
        return 'not_allowed';
      }
      retro.notes.push({ id: `n${retro.nextNoteNumber}`, authorId: p.id, column: action.column, text });
      retro.nextNoteNumber += 1;
      return null;
    }
    case 'retro.note_edit': {
      if (step !== 'notes') return 'not_allowed';
      const note = retro.notes.find((own) => own.id === action.noteId);
      if (note === undefined) return 'bad_request';
      if (note.authorId !== p.id) return 'not_allowed';
      const text = sanitize(action.text, config.retro.noteMax);
      if (text.length === 0) return 'bad_request';
      note.text = text;
      return null;
    }
    case 'retro.note_remove': {
      if (step !== 'notes') return 'not_allowed';
      const note = retro.notes.find((own) => own.id === action.noteId);
      if (note === undefined) return 'bad_request';
      if (note.authorId !== p.id) return 'not_allowed';
      retro.notes = retro.notes.filter((own) => own.id !== note.id);
      return null;
    }
    case 'retro.reveal': {
      if (step !== 'notes' || !fac) return 'not_allowed';
      retro.revealed = true;
      setStep(s, 'vote');
      return null;
    }
    case 'retro.vote': {
      if (step !== 'vote') return 'not_allowed';
      if (!retro.notes.some((note) => note.id === action.noteId)) return 'bad_request';
      const mine = retro.votes[p.id] ?? [];
      if (mine.includes(action.noteId) || mine.length >= config.retro.votesPerPlayer) return 'not_allowed';
      retro.votes[p.id] = [...mine, action.noteId];
      return null;
    }
    case 'retro.unvote': {
      if (step !== 'vote') return 'not_allowed';
      const mine = retro.votes[p.id] ?? [];
      if (!mine.includes(action.noteId)) return 'not_allowed';
      retro.votes[p.id] = mine.filter((id) => id !== action.noteId);
      return null;
    }
    case 'retro.choose_action': {
      if (step !== 'action' || !fac) return 'not_allowed';
      const clean = rulesFor(s).cleanAgreement(action.agreement);
      if (clean === null) return 'bad_request';
      retro.action = clean;
      return null;
    }
    case 'retro.help_start': {
      if (step !== 'notes') return 'not_allowed';
      if (retro.help[p.id] === undefined) retro.help[p.id] = { answers: {}, used: [] };
      return null;
    }
    case 'retro.help_answer': {
      const help = retro.help[p.id];
      if (step !== 'notes' || help === undefined) return 'not_allowed';
      const question = helpQuestions(s).find((own) => own.id === action.questionId);
      if (question === undefined || !question.choices.includes(action.choice)) return 'bad_request';
      help.answers[question.id] = action.choice;
      return null;
    }
    case 'retro.help_use': {
      const help = retro.help[p.id];
      if (step !== 'notes' || help === undefined) return 'not_allowed';
      if (!helpProposals(s, help).some((proposal) => proposal.id === action.proposalId)) return 'bad_request';
      help.used.push(action.proposalId);
      return null;
    }
    default:
      return 'not_allowed';
  }
}

/**
 * Moves the retrospective forward; the last move ends it and opens Sprint 2 or the summary.
 */
export function retroAdvance(s: RoomState, p: Player): Refusal {
  if (p.id !== s.facilitatorId) return 'not_allowed';
  const step = retroStep(s);
  if (step === 'previous') {
    setStep(s, 'notes');
    return null;
  }
  if (step === 'vote') {
    setStep(s, 'action');
    return null;
  }
  if (step !== 'action') return 'not_allowed';
  recordEvent(s);
  observe(s, 'retro');
  if (currentIteration(s).iteration === 1) startIteration(s, 2);
  else enterSummary(s);
  return null;
}
