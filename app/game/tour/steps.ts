import type { Framework, PlayerView } from '../../../core/index.ts';
import { profileOf } from '../framework.ts';
import type { SceneId } from './script.ts';

/**
 * One step of the tour: its id (the copy is under `tour.<id>.*`), the situation it shows, the control its task needs and how the view shows that the task was done.
 */
export interface TourStep {
  id: string;
  scene: SceneId;
  task: boolean;
  target: string | null;
  baseline(view: PlayerView): string | null;
  done(view: PlayerView, baseline: string | null): boolean;
}

function nothing(): null {
  return null;
}

function never(): boolean {
  return false;
}

function openId(view: PlayerView): string | null {
  return view.workspace === null ? null : view.workspace.itemId;
}

function involved(view: PlayerView): number {
  return view.items.filter((item) => item.workers.includes(view.selfId) || item.reviewer === view.selfId || item.helpPromisedBy === view.selfId).length;
}

function submitted(view: PlayerView, baseline: string | null): boolean {
  return baseline !== null && view.items.some((item) => item.id === baseline && item.status === 'review');
}

function judged(view: PlayerView, baseline: string | null): boolean {
  return baseline !== null && view.items.some((item) => item.id === baseline && item.status !== 'review');
}

const Workspace = '.lg-ws__body button:not([disabled]), .lg-ws__body input';

const Take: TourStep = {
  id: 'take',
  scene: 'take',
  task: true,
  target: '.lg-next__main .lg-btn--primary',
  baseline: nothing,
  done: (view) => view.workspace !== null && view.workspace.mode === 'work',
};

const Common: Record<string, TourStep> = {
  idea: { id: 'idea', scene: 'card', task: false, target: null, baseline: nothing, done: never },
  board: { id: 'board', scene: 'board', task: false, target: null, baseline: nothing, done: never },
  take: Take,
  solo: { id: 'solo', scene: 'solo', task: true, target: Workspace, baseline: openId, done: submitted },
  switch: {
    id: 'switch',
    scene: 'switch',
    task: true,
    target: '.lg-cell__actions .lg-btn--primary',
    baseline: openId,
    done: (view, baseline) => view.workspace !== null && view.workspace.itemId !== baseline,
  },
  limit: { id: 'limit', scene: 'limit', task: false, target: null, baseline: nothing, done: never },
  pair: { id: 'pair', scene: 'pair', task: true, target: Workspace, baseline: openId, done: submitted },
  held: {
    id: 'held',
    scene: 'held',
    task: true,
    target: '.lg-cell__actions .lg-btn--secondary',
    baseline: nothing,
    done: (view) => view.items.some((item) => item.helpPromisedBy === view.selfId),
  },
  right: { id: 'right', scene: 'right', task: true, target: '.lg-btn--approve', baseline: openId, done: judged },
  wrong: { id: 'wrong', scene: 'wrong', task: true, target: '.lg-btn--approve', baseline: openId, done: judged },
  daily: {
    id: 'daily',
    scene: 'daily',
    task: true,
    target: '.lg-cell__actions .lg-btn:not([disabled])',
    baseline: (view) => String(involved(view)),
    done: (view, baseline) => involved(view) > Number(baseline),
  },
  review: {
    id: 'review',
    scene: 'review',
    task: true,
    target: '.lg-tour__stage .lg-btn--primary',
    baseline: nothing,
    done: (view) => view.inspect !== null && view.inspect.verdictsTotal > 0 && view.inspect.verdicts.length === view.inspect.verdictsTotal,
  },
  note: {
    id: 'note',
    scene: 'note',
    task: true,
    target: '#retro-note',
    baseline: nothing,
    done: (view) => view.retro !== null && view.retro.notes.some((note) => note.mine),
  },
  vote: {
    id: 'vote',
    scene: 'vote',
    task: true,
    target: '.lg-note__vote:not([disabled])',
    baseline: nothing,
    done: (view) => view.retro !== null && view.retro.myVotes.length > 0,
  },
  action: {
    id: 'action',
    scene: 'action',
    task: true,
    target: 'input[name=retro-action]',
    baseline: nothing,
    done: (view) => view.retro !== null && view.retro.action !== null,
  },
};

const Order = ['idea', 'board', 'take', 'solo', 'switch', 'limit', 'pair', 'held', 'right', 'wrong', 'daily', 'review', 'note', 'vote', 'action'];

/**
 * The steps of the tour for a framework, in order; the Kanban tour adds one step that shows a WIP limit stopping a start.
 */
export function stepsFor(framework: Framework): readonly TourStep[] {
  return Order.filter((id) => id !== 'limit' || profileOf(framework).limits).map((id) => Common[id] as TourStep);
}

