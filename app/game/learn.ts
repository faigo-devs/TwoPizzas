import type { EventKind, IterationNumber, PlayerView } from '../../core/index.ts';
import { dictionaries, type Translate } from '../i18n/index.ts';
import { key } from './format.ts';
import { profileOf } from './framework.ts';

export type LearnEvent = EventKind | 'work';

export interface LearnSlot {
  event: LearnEvent;
  iteration: IterationNumber;
}

export interface LearnQuestion {
  id: string;
  question: string;
  choices: string[];
  right: number;
  why: string;
}

export const Slots: LearnSlot[] = [1, 2].flatMap((iteration) =>
  (['plan', 'daily', 'work', 'inspect', 'retro'] as LearnEvent[]).map((event) => ({ event, iteration: iteration as IterationNumber })),
);

export function slotId(slot: LearnSlot): string {
  return `${slot.event}.${slot.iteration}`;
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

const Orders = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/**
 * The event whose question the screen in front of the player carries: the one that just ended, or none.
 */
export function dueSlot(view: PlayerView): LearnSlot | null {
  const phase = view.phase;
  if (phase.kind === 'summary') return { event: 'retro', iteration: 2 };
  if (phase.kind === 'plan' && phase.step === 'card') return phase.iteration > 1 ? { event: 'retro', iteration: 1 } : null;
  if (phase.kind === 'work' && phase.step === 'card') return { event: 'plan', iteration: phase.iteration };
  if (phase.kind === 'work' && phase.half === 2) return { event: 'daily', iteration: phase.iteration };
  if (phase.kind === 'inspect' && phase.step === 'card') return { event: 'work', iteration: phase.iteration };
  if (phase.kind === 'retro' && phase.step === 'card') return { event: 'inspect', iteration: phase.iteration };
  return null;
}

/**
 * The same question for the whole team, taken from the room code, with the choices in a code-derived order.
 */
export function buildQuestion(code: string, framework: PlayerView['framework'], slot: LearnSlot, t: Translate): LearnQuestion | null {
  const seed = hash(`${code}|${framework}|${slot.event}`);
  const pinned = profileOf(framework).pinnedWorkQuestion && slot.event === 'work';
  const variant = pinned ? slot.iteration : ((seed + slot.iteration) % 2) + 1;
  const base = `learn.${framework}.${slot.event}.${variant}`;
  if (!(`${base}.q` in dictionaries.en)) return null;
  const texts = [t(key(`${base}.ok`)), t(key(`${base}.no1`)), t(key(`${base}.no2`))];
  const order = Orders[hash(`${code}|${framework}|${slot.event}|${slot.iteration}`) % Orders.length]!;
  return {
    id: slotId(slot),
    question: t(key(`${base}.q`)),
    choices: order.map((index) => texts[index]!),
    right: order.indexOf(0),
    why: t(key(`${base}.why`)),
  };
}

export function goalKey(framework: PlayerView['framework'], event: LearnEvent): string {
  return `learn.${framework}.${event}.goal`;
}
