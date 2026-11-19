import type { ItemAction, ItemView, PlayerView } from '../../../core/index.ts';
import { boardOf, goalOf, submitLimited } from '../framework.ts';

export interface ItemRights {
  take: boolean;
  takeBacklog: boolean;
  join: boolean;
  open: boolean;
  leave: boolean;
  takeReview: boolean;
  promise: boolean;
  withdraw: boolean;
  isWorker: boolean;
  isReviewer: boolean;
  isOpen: boolean;
}

export type Todo =
  | { kind: 'switching'; itemId: string }
  | { kind: 'work'; itemId: string }
  | { kind: 'reviewing'; itemId: string }
  | { kind: 'openWork'; itemId: string }
  | { kind: 'openBlocked'; itemId: string }
  | { kind: 'openReview'; itemId: string }
  | { kind: 'join'; itemId: string }
  | { kind: 'takeReview'; itemId: string }
  | { kind: 'help'; itemId: string }
  | { kind: 'held'; itemId: string }
  | { kind: 'submitted'; itemId: string }
  | { kind: 'waitingPartner'; itemId: string }
  | { kind: 'pull'; itemId: string }
  | { kind: 'pullBacklog'; itemId: string }
  | { kind: 'startLimited'; itemId: string }
  | { kind: 'submitLimited'; itemId: string };

export function isRunning(view: PlayerView): boolean {
  return view.phase.kind === 'work' && view.phase.step === 'running';
}

export function startBlocked(view: PlayerView): boolean {
  return boardOf(view)?.startBlockedByLimit === true;
}

export function rightsOf(view: PlayerView, item: ItemView): ItemRights {
  const self = view.selfId;
  const isWorker = item.workers.includes(self);
  const isReviewer = item.status === 'review' && item.reviewer === self;
  const workspace = view.workspace;
  const isOpen = workspace !== null && workspace.itemId === item.id && workspace.mode === (isReviewer ? 'review' : 'work');
  const can = (action: ItemAction): boolean => item.actions.includes(action);
  const takes = can('item.take');
  return {
    take: takes && item.status === 'todo',
    takeBacklog: takes && item.status === 'backlog',
    join: takes && item.status === 'doing',
    open: can('item.open.work') || can('item.open.review'),
    leave: can('item.leave'),
    takeReview: can('item.take_review'),
    promise: can('help.promise'),
    withdraw: can('help.withdraw'),
    isWorker,
    isReviewer,
    isOpen,
  };
}

/**
 * Product Backlog items the player may take into the running Sprint, the Sprint Goal's theme first.
 */
export function backlogToTake(view: PlayerView): ItemView[] {
  const goal = goalOf(view)?.theme;
  return view.items
    .filter((item) => item.status === 'backlog' && rightsOf(view, item).takeBacklog)
    .sort((a, b) => Number(b.theme === goal) - Number(a.theme === goal));
}

/**
 * What the player can do now, most useful first, derived only from the view.
 */
export function nextActions(view: PlayerView, now: number): Todo[] {
  const running = isRunning(view);
  const list: Todo[] = [];
  const workspace = view.workspace;
  if (workspace !== null && now < workspace.readyAt) list.push({ kind: 'switching', itemId: workspace.itemId });
  else if (workspace !== null && submitLimited(view) && workspace.mode === 'work') {
    list.push({ kind: 'submitLimited', itemId: workspace.itemId });
  } else if (workspace !== null && workspace.canSubmit) list.push({ kind: 'work', itemId: workspace.itemId });
  else if (workspace !== null && workspace.canVerdict) list.push({ kind: 'reviewing', itemId: workspace.itemId });
  for (const item of view.items) {
    const rights = rightsOf(view, item);
    if (item.status === 'doing' && rights.isWorker && item.waitingForPair) list.push({ kind: 'waitingPartner', itemId: item.id });
  }
  for (const item of view.items) {
    const rights = rightsOf(view, item);
    if (rights.open && rights.isReviewer) list.push({ kind: 'openReview', itemId: item.id });
  }
  for (const item of view.items) {
    const rights = rightsOf(view, item);
    if (rights.open && rights.isWorker && item.status === 'doing') list.push({ kind: item.blocked && item.helpPromisedBy === null ? 'openBlocked' : 'openWork', itemId: item.id });
  }
  for (const held of view.held) list.push({ kind: 'held', itemId: held.itemId });
  for (const item of view.items) {
    const rights = rightsOf(view, item);
    if (rights.takeReview) list.push({ kind: 'takeReview', itemId: item.id });
  }
  for (const item of view.items) {
    const rights = rightsOf(view, item);
    if (rights.join) list.push({ kind: 'join', itemId: item.id });
  }
  for (const item of view.items) {
    const rights = rightsOf(view, item);
    if (rights.promise) list.push({ kind: 'help', itemId: item.id });
  }
  for (const item of view.items) {
    if (item.status === 'review' && item.workers.includes(view.selfId)) list.push({ kind: 'submitted', itemId: item.id });
  }
  const isPassive = (todo: Todo): boolean => todo.kind === 'submitted' || todo.kind === 'waitingPartner';
  const active = list.filter((todo) => !isPassive(todo));
  const passive = list.filter(isPassive);
  const pulls: Todo[] = [];
  if (active.length === 0 && running) {
    for (const item of view.items) {
      if (pulls.length < 3 && rightsOf(view, item).take) pulls.push({ kind: 'pull', itemId: item.id });
    }
  }
  if (active.length === 0 && running && pulls.length === 0) {
    const next = backlogToTake(view)[0];
    if (next !== undefined) pulls.push({ kind: 'pullBacklog', itemId: next.id });
  }
  const firstReady = view.items.find((item) => item.status === 'todo');
  if (active.length === 0 && running && startBlocked(view) && firstReady !== undefined) {
    pulls.push({ kind: 'startLimited', itemId: firstReady.id });
  }
  return [...active, ...pulls, ...passive];
}

/**
 * Items shown on the board: those of the current iteration that are no longer in the backlog.
 */
export function boardItems(view: PlayerView): ItemView[] {
  return view.items.filter((item) => item.status !== 'backlog' && (view.iteration === null || item.iteration === view.iteration));
}
