import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { HeldInfo, ItemView, PlayerView, WorkPhase } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { BoardColumn } from '../../ui/Board.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { InfoHeld } from '../../ui/Puzzle.tsx';
import { act, skipAhead } from '../controller.ts';
import { facilitatorRoleDef, key, lowerFirst } from '../format.ts';
import { boardOf, byFramework, goalOf, profileOf } from '../framework.ts';
import { ActionBar } from '../../ui/ActionBar.tsx';
import { ConfirmAction } from '../../ui/Confirm.tsx';
import { useServerNow } from '../store.ts';
import { backlogToTake, boardItems, nextActions, rightsOf, type Todo } from './board.ts';
import { FlowBar, useArrivals, type Arrivals } from './Flow.tsx';
import { ItemCell } from './ItemCell.tsx';
import { ItemWorkspace } from './ItemWorkspace.tsx';
import { ScriptBox } from './Parts.tsx';
import { QuickCheck } from './Learn.tsx';
import { levelText, token } from './puzzles/tokens.ts';

export interface WorkProps {
  view: PlayerView;
  phase: WorkPhase;
  t: Translate;
  scriptStep: number;
  local: boolean;
}

function labelOf(view: PlayerView, itemId: string): string {
  const item = view.items.find((own) => own.id === itemId);
  return item === undefined ? itemId : `${item.id} ${item.subject}`;
}

/**
 * The Sprint Goal in sight, with how many items of its theme are Done on the board.
 */
export function GoalLine({ view, t }: { view: PlayerView; t: Translate }) {
  const goal = goalOf(view);
  if (goal === null) return null;
  return (
    <p class="lg-goalline">
      <strong>{t('goal.title')}:</strong> {lowerFirst(t('goal.option', { theme: t(key(`item.theme.${goal.theme}`)) }))}
      {goal.total > 0 ? <span class="lg-goalline__progress"> · {t('work.goalProgress', { done: goal.done, total: goal.total })}</span> : null}
    </p>
  );
}

function describe(todo: Todo, view: PlayerView, t: Translate): string {
  const item = labelOf(view, todo.itemId);
  const limits = boardOf(view)?.limits;
  const limit = todo.kind === 'submitLimited' ? (limits?.review ?? 0) : (limits?.inProgress ?? 0);
  return t(key(`work.next.${todo.kind}`), { item, limit });
}

function TodoButton({ todo, view, t }: { todo: Todo; view: PlayerView; t: Translate }) {
  const id = todo.itemId;
  if (todo.kind === 'openWork' || todo.kind === 'openBlocked') {
    return (
      <Button variant="primary" size="md" onClick={() => act({ type: 'item.open', itemId: id, mode: 'work' })}>
        {t('item.open')}
      </Button>
    );
  }
  if (todo.kind === 'openReview') {
    return (
      <Button variant="primary" size="md" onClick={() => act({ type: 'item.open', itemId: id, mode: 'review' })}>
        {t('item.open')}
      </Button>
    );
  }
  if (todo.kind === 'join' || todo.kind === 'pull' || todo.kind === 'pullBacklog') {
    return (
      <Button variant="primary" size="md" onClick={() => act({ type: 'item.take', itemId: id })}>
        {todo.kind === 'join' ? t('item.joinSecond') : t('item.take')}
      </Button>
    );
  }
  if (todo.kind === 'takeReview') {
    return (
      <Button variant="primary" size="md" icon="eye" onClick={() => act({ type: 'item.take_review', itemId: id })}>
        {t('item.review')}
      </Button>
    );
  }
  if (todo.kind === 'help') {
    const item = view.items.find((own) => own.id === id);
    if (item === undefined || !rightsOf(view, item).promise) return null;
    return (
      <Button variant="secondary" size="md" onClick={() => act({ type: 'help.promise', itemId: id })}>
        {t('item.promiseHelp')}
      </Button>
    );
  }
  return null;
}

/**
 * The short list of what this player can do now, built only from the view; the first line is the one to do first.
 */
export function NextAction({ view, t }: { view: PlayerView; t: Translate }) {
  const now = useServerNow(500);
  const todos = nextActions(view, now);
  const first = todos[0];
  return (
    <section class="lg-next" aria-labelledby="lg-next-title">
      <h3 id="lg-next-title" class="lg-next__title" tabIndex={-1}>
        <Icon name="flag" size={18} />
        <span>{t('work.next.title')}</span>
      </h3>
      {first === undefined ? (
        <p class="lg-next__main">
          {(boardOf(view)?.arrivalsLeft ?? 0) > 0
            ? t('work.next.waitArrivals', { count: boardOf(view)?.arrivalsLeft ?? 0, label: t('work.endEarly.kanban') })
            : t('work.next.nothing')}
        </p>
      ) : (
        <div class="lg-next__main">
          <p>{describe(first, view, t)}</p>
          <TodoButton todo={first} view={view} t={t} />
          {view.controls.includes('end_work') ? <p class="lg-muted">{t(key(`work.next.endHalf.${view.framework}`))}</p> : null}
        </div>
      )}
    </section>
  );
}

function heldText(info: HeldInfo, t: Translate): ComponentChildren {
  const part = info.part;
  if (part.kind === 'review') return <p>{t('held.review', { keys: part.ignore.join(', ') })}</p>;
  if (part.kind === 'order') {
    return (
      <p>
        {part.clues.map((clue) => (
          <code key={`${clue.before}>${clue.after}`}>{t('held.order', { rule: t('puzzle.order.clue', { before: clue.before, after: clue.after }) })}</code>
        ))}
      </p>
    );
  }
  if (part.kind === 'incident') {
    return (
      <>
        {part.readings.map((reading) => (
          <p key={reading.indicator}>
            {t('held.incident', { indicator: token(t, `indicator.${reading.indicator}`, 'is'), level: levelText(t, reading.indicator, reading.level) })}
          </p>
        ))}
      </>
    );
  }
  return <p>{t(key(`held.merge.${part.rule}`))}</p>;
}

/**
 * The information this player holds for items they are not on, with a private tick for what they have already told the team.
 */
export function Held({ view, t }: { view: PlayerView; t: Translate }) {
  const [told, setTold] = useState<string[]>([]);
  if (view.held.length === 0) return null;
  return (
    <InfoHeld
      title={t('held.title')}
      hint={t('held.hint')}
      itemLabel={t('held.for')}
      items={view.held.map((info) => {
        const item = view.items.find((own) => own.id === info.itemId);
        const done = told.includes(info.itemId);
        return {
          itemId: info.itemId,
          subject: item?.subject ?? '',
          text: (
            <>
              {heldText(info, t)}
              <label class="lg-told">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => setTold((own) => (done ? own.filter((id) => id !== info.itemId) : [...own, info.itemId]))}
                />
                <span>{t('work.told')}</span>
              </label>
            </>
          ),
        };
      })}
    />
  );
}

interface ColumnProps {
  view: PlayerView;
  t: Translate;
  id: string;
  status: ItemView['status'];
  items: ItemView[];
  arrivals: Arrivals;
}

function Column({ view, t, id, status, items, arrivals }: ColumnProps) {
  const tone = status === 'todo' ? 'todo' : status === 'doing' ? 'doing' : status === 'review' ? 'review' : 'done';
  const board = boardOf(view);
  const limit = board === null ? null : status === 'doing' ? board.limits.inProgress : status === 'review' ? board.limits.review : null;
  const limited = limit !== null;
  const alertKey = status === 'review' ? 'board.limitReached.review' : 'board.limitReached.doing';
  return (
    <BoardColumn
      id={id}
      title={t(key(`board.column.${view.framework}.${status === 'todo' ? 'backlog' : status}`))}
      count={items.length}
      tone={tone}
      wip={limited ? limit : undefined}
      enforced={limited}
      wipLabel={t('board.wipLimit')}
      exceededLabel={limited ? t(alertKey, { limit }) : undefined}
      emptyLabel={t('board.empty')}
    >
      {items.map((item) => (
        <ItemCell key={item.id} view={view} item={item} t={t} fresh={arrivals.fresh.has(item.id)} />
      ))}
    </BoardColumn>
  );
}

function BacklogFold({ view, t }: { view: PlayerView; t: Translate }) {
  const list = backlogToTake(view);
  if (list.length === 0) return null;
  return (
    <details class="lg-pbfold">
      <summary>{t('work.pb.title', { count: list.length })}</summary>
      <p class="lg-muted">{t('work.pb.note')}</p>
      <div class="lg-pbfold__items">
        {list.map((item) => (
          <ItemCell key={item.id} view={view} item={item} t={t} />
        ))}
      </div>
    </details>
  );
}

function EndHalf({ view, phase, t, items }: { view: PlayerView; phase: WorkPhase; t: Translate; items: ItemView[] }) {
  if (view.controls.includes('end_work')) {
    const fw = view.framework;
    return (
      <ActionBar>
        <ConfirmAction
          variant="secondary"
          size="lg"
          icon="play"
          label={t(key(`work.endEarly.${fw}`))}
          prompt={t(key(`work.endEarly.confirm.${fw}.${phase.half}`))}
          confirmLabel={t('work.endEarly.yes')}
          cancelLabel={t('common.cancel')}
          hint={t(key(`work.endEarly.hint.${fw}`))}
          onConfirm={() => act({ type: 'work.end_early' })}
        />
      </ActionBar>
    );
  }
  const idle = profileOf(view.framework).backlogPull && items.length > 0 && items.every((item) => item.status === 'done') && backlogToTake(view).length === 0;
  return idle ? <p class="lg-muted">{t(key(`work.endEarly.wait.${view.framework}`), { role: facilitatorRoleDef(view, t) })}</p> : null;
}

/**
 * The Sprint: what to do now, the open item, the info this player holds and the board.
 */
export function Work({ view, phase, t, scriptStep, local }: WorkProps) {
  const items = boardItems(view);
  const by = (status: ItemView['status']) => items.filter((item) => item.status === status);
  const workspace = view.workspace;
  const openItem = workspace === null ? undefined : view.items.find((own) => own.id === workspace.itemId);
  const arrivals = useArrivals(view);
  return (
    <>
      <div class="lg-play-head">
        <div class="lg-play-head__title">
          <p class="lg-eyebrow">{`${t(key(`iteration.${view.framework}`), { n: phase.iteration })} · ${t(key(`phase.${view.framework}.work.name`))}`}</p>
          <h2 tabIndex={-1} data-lg-focus>
            {t('board.title')}
          </h2>
        </div>
        {workspace !== null && openItem !== undefined ? <span class="lg-muted">{t('board.openItem', { id: `${openItem.id} ${openItem.subject}` })}</span> : null}
      </div>
      <GoalLine view={view} t={t} />
      <div class={view.held.length === 0 && view.script === null ? 'lg-work-top lg-work-top--single' : 'lg-work-top'}>
        <NextAction view={view} t={t} />
        <div class="lg-stack">
          <Held view={view} t={t} />
          <ScriptBox view={view} t={t} current={scriptStep} />
        </div>
      </div>
      <QuickCheck view={view} t={t} />
      {workspace !== null && openItem !== undefined ? (
        <div class="lg-work-space">
          <ItemWorkspace view={view} workspace={workspace} item={openItem} t={t} />
        </div>
      ) : null}
      {byFramework(view, { scrum: () => null, kanban: (own) => <FlowBar view={own} t={t} arrivals={arrivals} /> })}
      <div class="lg-board lg-board--work">
        <Column view={view} t={t} id="work-todo" status="todo" items={by('todo')} arrivals={arrivals} />
        <Column view={view} t={t} id="work-doing" status="doing" items={by('doing')} arrivals={arrivals} />
        <Column view={view} t={t} id="work-review" status="review" items={by('review')} arrivals={arrivals} />
        <Column view={view} t={t} id="work-done" status="done" items={by('done')} arrivals={arrivals} />
      </div>
      <BacklogFold view={view} t={t} />
      <EndHalf view={view} phase={phase} t={t} items={items} />
      {local ? (
        <div class="lg-cluster lg-work-skip">
          <Button variant="quiet" size="md" icon="play" onClick={skipAhead}>
            {t('shell.skipAhead')}
          </Button>
          <span class="lg-muted">{t('shell.skipHint')}</span>
        </div>
      ) : null}
    </>
  );
}
