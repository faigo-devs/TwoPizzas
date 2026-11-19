import { config } from '../../../core/index.ts';
import type { Card, ItemView, PlanPhase, ScrumPlayerView } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { Panel } from '../../ui/Hero.tsx';
import { GoalOption, PokerCard } from '../../ui/Poker.tsx';
import { WorkItemCard } from '../../ui/WorkItemCard.tsx';
import { act } from '../controller.ts';
import { facilitatorRoleDef, itemLabels, lowerFirst, key, markerOf, named, playerName, statusText, themeOf, titleIdOf } from '../format.ts';
import { ScriptBox, stepTitle } from './Parts.tsx';

export interface PlanProps {
  view: ScrumPlayerView;
  phase: PlanPhase;
  t: Translate;
  scriptStep: number;
}

function itemCard(item: ItemView, view: ScrumPlayerView, t: Translate) {
  return (
    <WorkItemCard
      id={item.id}
      kind={item.kind}
      kindLabel={t(key(`item.kind.${item.kind}`))}
      subject={item.subject}
      value={item.value}
      estimate={item.estimate}
      status={markerOf(item)}
      statusLabel={statusText(item, t)}
      titleId={titleIdOf(item)}
      {...themeOf(view, item, t)}
      labels={itemLabels(t)}
    />
  );
}

function GoalStep({ view, t }: { view: ScrumPlayerView; t: Translate }) {
  const planning = view.planning;
  if (planning === null) return null;
  const role = facilitatorRoleDef(view, t);
  const canConfirm = view.controls.includes('confirm_goal');
  const isFacilitator = view.facilitatorId === view.selfId;
  const total = Object.values(planning.goalVotes).reduce((sum, count) => sum + count, 0);
  return (
    <Panel title={t('goal.title')} icon="flag">
      <p class="lg-muted">{t('goal.hint', { role })}</p>
      <p class="lg-muted">{t('goal.note')}</p>
      <div class="lg-goals" role="radiogroup" aria-label={t('goal.title')}>
        {planning.goalOptions.map((theme) => (
          <GoalOption
            key={theme}
            name="plan-goal"
            value={theme}
            title={t('goal.option', { theme })}
            description={`${t('goal.optionDetail')} ${t('goal.votes', { count: planning.goalVotes[theme] ?? 0 })}`}
            bonus={t('goal.bonus', { bonus: config.goal.bonus })}
            checked={planning.myGoalVote === theme}
            onChange={() => act({ type: 'plan.goal_vote', theme })}
          />
        ))}
      </div>
      {total === 0 ? <p class="lg-muted">{t('goal.noVotes')}</p> : null}
      {isFacilitator ? (
        <Button variant="primary" size="md" icon="check" disabled={!canConfirm} onClick={() => act({ type: 'plan.goal_confirm' })}>
          {t('goal.confirm')}
        </Button>
      ) : (
        <p class="lg-muted">{t('goal.waitingConfirm', { role })}</p>
      )}
    </Panel>
  );
}

function Totals({ view, t }: { view: ScrumPlayerView; t: Translate }) {
  const planning = view.planning;
  if (planning === null) return null;
  return (
    <>
      <div class="lg-sum" role="status">
        <span>{t('poker.sum')}</span>
        <strong>{planning.totalEstimate}</strong>
      </div>
      {planning.previousVelocity !== null ? <p class="lg-muted lg-sum-note">{t('poker.velocity', { velocity: planning.previousVelocity })}</p> : null}
    </>
  );
}

function EstimateStep({ view, t }: { view: ScrumPlayerView; t: Translate }) {
  const planning = view.planning;
  if (planning === null) return null;
  const poker = planning.poker;
  const role = facilitatorRoleDef(view, t);
  const isFacilitator = view.facilitatorId === view.selfId;
  const item = poker === null ? undefined : view.items.find((own) => own.id === poker.itemId);
  const present = view.players.filter((player) => player.connected);
  const labelOf = (id: string) => {
    const found = view.players.find((player) => player.id === id);
    return found === undefined ? id : playerName(found, t);
  };
  if (poker === null || item === undefined) return null;
  return (
    <Panel title={t('poker.title')} icon="vote">
      <p class="lg-muted">{t('poker.note')}</p>
      <div class="lg-plan__current">
        <div>
          <p class="lg-eyebrow lg-plan__next">{t('poker.itemNext')}</p>
          {itemCard(item, view, t)}
        </div>
        {view.controls.includes('poker_reveal') ? (
          <Button variant="secondary" size="sm" icon="eye" onClick={() => act({ type: 'plan.poker_reveal' })}>
            {t('poker.reveal')}
          </Button>
        ) : null}
      </div>
      <p class="lg-muted" role="status">
        {poker.revealed
          ? t('poker.revealed')
          : [t('poker.voteCount', { voted: poker.voted.length, total: present.length }), poker.myVote === null ? t('poker.waiting') : null].filter(Boolean).join(' · ')}
      </p>
      {!poker.revealed ? (
        <div class="lg-poker-hand" role="group" aria-label={t('poker.yourCards')}>
          {config.poker.cards.map((value) => (
            <PokerCard
              key={value}
              value={value}
              selectable
              chosen={poker.myVote === value}
              label={t('poker.vote', { value })}
              onSelect={() => act({ type: 'plan.poker_vote', card: value as Card })}
            />
          ))}
        </div>
      ) : null}
      <div class="lg-poker-table" role="group" aria-label={t('poker.cardsOnTable')}>
        {present.map((player) => {
          const name = labelOf(player.id);
          const shown = poker.votes?.[player.id];
          if (shown !== undefined) {
            return <PokerCard key={player.id} value={shown} owner={name} ownerNumber={player.seat} label={t('poker.shown', { name, value: shown })} revealing />;
          }
          if (poker.voted.includes(player.id)) {
            return <PokerCard key={player.id} faceDown owner={name} ownerNumber={player.seat} label={t('poker.voted', { name })} />;
          }
          return null;
        })}
      </div>
      {isFacilitator ? (
        <div class="lg-stack">
          <div class="lg-cluster">
            {view.controls.includes('poker_record') && poker.median !== null ? (
              <Button variant="primary" size="md" icon="check" onClick={() => act({ type: 'plan.poker_record', estimate: null })}>
                {t('poker.recordMedian', { value: poker.median })}
              </Button>
            ) : null}
            {view.controls.includes('poker_revote') ? (
              <Button variant="secondary" size="md" icon="switch" onClick={() => act({ type: 'plan.poker_revote' })}>
                {t('poker.revote')}
              </Button>
            ) : null}
            {view.controls.includes('stop_estimation') ? (
              <Button variant="quiet" size="md" icon="stop" onClick={() => act({ type: 'plan.estimation_stop' })}>
                {t('poker.stop')}
              </Button>
            ) : null}
          </div>
          {poker.revealed ? <p class="lg-muted">{t('poker.revotesLeft', { count: poker.revotesLeft })}</p> : null}
          {poker.revealed && poker.median !== null ? <p class="lg-muted">{t('poker.middleNote')}</p> : null}
          {view.controls.includes('poker_record') ? (
            <div class="lg-stack" role="group" aria-label={t('poker.recordOther')}>
              <p class="lg-muted">{t('poker.recordOther')}</p>
              <div class="lg-cluster">
                {config.poker.cards.map((value) => (
                  <Button key={value} variant="quiet" size="sm" onClick={() => act({ type: 'plan.poker_record', estimate: value as Card })}>
                    {t('poker.recordCard', { value })}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p class="lg-muted">{t('poker.facilitatorOnly', { role })}</p>
      )}
    </Panel>
  );
}

function CommitStep({ view, t }: { view: ScrumPlayerView; t: Translate }) {
  const planning = view.planning;
  if (planning === null) return null;
  const role = facilitatorRoleDef(view, t);
  const pulled = view.items.filter((item) => item.status === 'todo');
  const backlog = view.items.filter((item) => item.status === 'backlog');
  const isFacilitator = view.facilitatorId === view.selfId;
  const canStart = view.controls.includes('advance');
  return (
    <div class="lg-stack lg-stack--lg">
      <Panel title={t('commit.title')} icon="flag">
        <p class="lg-muted">{t('commit.hint')}</p>
        <Totals view={view} t={t} />
        {pulled.some((item) => item.estimate === null) ? <p class="lg-muted">{t('commit.unestimated')}</p> : null}
        {isFacilitator ? (
          <div class="lg-stack">
            <Button variant="primary" size="lg" icon="play" disabled={!canStart} onClick={() => act({ type: 'phase.advance' })}>
              {t('commit.start')}
            </Button>
            {pulled.length === 0 ? <p class="lg-muted">{t('commit.minimum')}</p> : null}
          </div>
        ) : (
          <p class="lg-muted">{t('commit.waitingStart', { role })}</p>
        )}
      </Panel>
      <div class="lg-two">
        <Panel title={`${t('commit.inSprint')} · ${t('commit.pulled', { count: pulled.length })}`} icon="check">
          <ul class="lg-pulls">
            {pulled.length === 0 ? <li class="lg-muted">{t('board.empty')}</li> : null}
            {pulled.map((item) => (
              <li key={item.id} class="lg-pull">
                {itemCard(item, view, t)}
                <Button variant="quiet" size="sm" icon="up" label={named(t('commit.unpull'), item)} onClick={() => act({ type: 'plan.unpull', itemId: item.id })}>
                  {t('commit.unpull')}
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t('commit.productBacklog')} icon="diff">
          <ul class="lg-pulls">
            {backlog.length === 0 ? <li class="lg-muted">{t('board.empty')}</li> : null}
            {backlog.map((item) => (
              <li key={item.id} class="lg-pull">
                {itemCard(item, view, t)}
                <Button variant="secondary" size="sm" icon="down" label={named(t('commit.pull'), item)} onClick={() => act({ type: 'plan.pull', itemId: item.id })}>
                  {t('commit.pull')}
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/**
 * Sprint Planning in full: the Sprint Goal vote, planning poker and the commitment.
 */
export function Plan({ view, phase, t, scriptStep }: PlanProps) {
  const planning = view.planning;
  const steps = ['goal', 'estimate', 'commit'];
  const position = steps.indexOf(phase.step) + 1;
  const title = stepTitle(view, t);
  const goal = planning?.goal ?? null;
  return (
    <>
      <div class="lg-play-head">
        <div class="lg-play-head__title">
          <p class="lg-eyebrow">{`${t(key(`iteration.${view.framework}`), { n: phase.iteration })} · ${t(key(`phase.${view.framework}.plan.name`))}`}</p>
          <h2 tabIndex={-1} data-lg-focus>
            {title}
          </h2>
        </div>
        {position > 0 ? <span class="lg-muted">{t('phase.stepOf', { n: position, total: steps.length })}</span> : null}
      </div>
      <p class="lg-muted lg-legend">{t('item.legend')}</p>
      {goal !== null ? (
        <p class="lg-goalline">
          <strong>{t('goal.confirmed')}:</strong> {lowerFirst(t('goal.option', { theme: goal }))}
        </p>
      ) : null}
      <div class="lg-plan">
        <div class="lg-stack lg-stack--lg">
          {phase.step === 'goal' ? <GoalStep view={view} t={t} /> : null}
          {phase.step === 'estimate' ? <EstimateStep view={view} t={t} /> : null}
          {phase.step === 'commit' ? <CommitStep view={view} t={t} /> : null}
        </div>
        <div class="lg-stack">
          {phase.step === 'estimate' ? <Totals view={view} t={t} /> : null}
          <ScriptBox view={view} t={t} current={scriptStep} />
        </div>
      </div>
    </>
  );
}
