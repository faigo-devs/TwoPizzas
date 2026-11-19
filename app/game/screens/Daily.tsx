import type { DailyPhase, ItemView, PlayerView } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { act, skipAhead } from '../controller.ts';
import { byFramework, profileOf } from '../framework.ts';
import { key } from '../format.ts';
import { boardItems } from './board.ts';
import { FlowBar } from './Flow.tsx';
import { ItemCell } from './ItemCell.tsx';
import { Held, GoalLine } from './Work.tsx';
import { ScriptBox } from './Parts.tsx';

export interface DailyProps {
  view: PlayerView;
  phase: DailyPhase;
  t: Translate;
  scriptStep: number;
  local: boolean;
}

interface StopProps {
  view: PlayerView;
  t: Translate;
  n: number;
  status: ItemView['status'];
  ask: string;
  items: ItemView[];
}

function Stop({ view, t, n, status, ask, items }: StopProps) {
  const column = t(key(`board.column.${view.framework}.${status === 'todo' ? 'backlog' : status}`));
  const id = `daily-stop-${n}`;
  return (
    <section class="lg-stop" aria-labelledby={id}>
      <header class="lg-stop__head">
        <span class="lg-stop__n" aria-hidden="true">
          {n}
        </span>
        <h3 id={id} class="lg-stop__title">
          {column}
        </h3>
        <span class="lg-col__count">{items.length}</span>
      </header>
      <p class="lg-stop__ask">{ask}</p>
      {items.length === 0 ? (
        <p class="lg-muted">{t('board.empty')}</p>
      ) : (
        <div class="lg-stop__items">
          {items.map((item) => (
            <ItemCell key={item.id} view={view} item={item} t={t} daily />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * The Daily Scrum or the Kanban daily: the clock is stopped and the team walks the board from the right, re-planning as it goes.
 */
export function Daily({ view, phase, t, scriptStep, local }: DailyProps) {
  const items = boardItems(view);
  const by = (status: ItemView['status']) => items.filter((item) => item.status === status);
  const blocked = items.filter((item) => item.status === 'doing' && item.blocked && item.helpPromisedBy === null);
  const waitingReview = items.filter((item) => item.status === 'review' && item.reviewer === null);
  const waitingPair = items.filter((item) => item.status === 'doing' && item.waitingForPair);
  const canEnd = view.controls.includes('end_daily');
  const profile = profileOf(view.framework);
  const facts: string[] = [
    t('daily.summary.blocked', { count: blocked.length }),
    t('daily.summary.review', { count: waitingReview.length }),
    t('daily.summary.pair', { count: waitingPair.length }),
  ];
  return (
    <>
      <div class="lg-play-head">
        <div class="lg-play-head__title">
          <p class="lg-eyebrow">{`${t(key(`iteration.${view.framework}`), { n: phase.iteration })} · ${t(key(`phase.${view.framework}.daily.name`))}`}</p>
          <h2 tabIndex={-1} data-lg-focus>
            {t(key(`step.${view.framework}.daily.walk`))}
          </h2>
        </div>
        <span class="lg-muted lg-daily__stopped">
          <Icon name="lock" size={14} /> {t('daily.clockStopped')}
        </span>
      </div>
      {byFramework(view, { scrum: (own) => <GoalLine view={own} t={t} />, kanban: (own) => <FlowBar view={own} t={t} /> })}
      <div class={view.held.length === 0 && view.script === null ? 'lg-work-top lg-work-top--single' : 'lg-work-top'}>
        <section class="lg-next" aria-labelledby="lg-daily-walk">
          <h3 id="lg-daily-walk" class="lg-next__title">
            <Icon name="flag" size={18} />
            <span>{t(key(`daily.walkOrder.${view.framework}`))}</span>
          </h3>
          <ul class="lg-daily__facts">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          <div class="lg-cluster">
            {canEnd ? (
              <Button variant="primary" size="lg" icon="check" onClick={() => act({ type: 'daily.end' })}>
                {t(key(`daily.end.${view.framework}`))}
              </Button>
            ) : null}
            {local ? (
              <Button variant="quiet" size="md" icon="play" onClick={skipAhead}>
                {t('shell.skipAhead')}
              </Button>
            ) : null}
          </div>
        </section>
        <div class="lg-stack">
          <Held view={view} t={t} />
          <ScriptBox view={view} t={t} current={scriptStep} />
        </div>
      </div>
      <div class="lg-walk">
        <Stop view={view} t={t} n={1} status="review" ask={t('daily.ask.review')} items={by('review')} />
        <Stop view={view} t={t} n={2} status="doing" ask={t('daily.ask.progress')} items={by('doing')} />
        <Stop view={view} t={t} n={3} status="todo" ask={t(profile.dailyAsk)} items={by('todo')} />
      </div>
    </>
  );
}
