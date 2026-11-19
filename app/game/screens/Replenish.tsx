import { useState } from 'preact/hooks';
import type { ItemView, PlanPhase, KanbanPlayerView, WipLimits } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { Panel } from '../../ui/Hero.tsx';
import { WorkItemCard } from '../../ui/WorkItemCard.tsx';
import { act } from '../controller.ts';
import { facilitatorRoleDef, itemLabels, key, markerOf, named, statusText, themeOf, titleIdOf } from '../format.ts';
import { limitsLine } from './Flow.tsx';
import { ScriptBox, stepTitle } from './Parts.tsx';

export interface ReplenishProps {
  view: KanbanPlayerView;
  phase: PlanPhase;
  t: Translate;
  scriptStep: number;
}

function itemCard(item: ItemView, view: KanbanPlayerView, t: Translate) {
  return (
    <WorkItemCard
      id={item.id}
      kind={item.kind}
      kindLabel={t(key(`item.kind.${item.kind}`))}
      subject={item.subject}
      value={item.value}
      showEstimate={false}
      status={markerOf(item)}
      statusLabel={statusText(item, t)}
      titleId={titleIdOf(item)}
      {...themeOf(view, item, t)}
      labels={itemLabels(t)}
    />
  );
}

function PullStep({ view, phase, t }: { view: KanbanPlayerView; phase: PlanPhase; t: Translate }) {
  const replenish = view.planning?.replenish ?? null;
  if (replenish === null) return null;
  const role = facilitatorRoleDef(view, t);
  const ready = view.items.filter((item) => item.status === 'todo');
  const pool = view.items.filter((item) => item.status === 'backlog');
  const isFacilitator = view.facilitatorId === view.selfId;
  const full = replenish.ready >= replenish.readyMax;
  const canAdvance = view.controls.includes('advance');
  const second = phase.iteration === 2;
  return (
    <div class="lg-stack lg-stack--lg">
      <Panel title={stepTitle(view, t) === t('replenish.title') ? undefined : t('replenish.title')} icon="flag">
        <p class="lg-muted">{t('replenish.hint', { max: replenish.readyMax })}</p>
        <p class="lg-muted">{t(second ? 'replenish.hintSecond' : 'limits.none')}</p>
        <div class="lg-sum" role="status">
          <span>{t('replenish.readyCount')}</span>
          <strong>{`${replenish.ready} / ${replenish.readyMax}`}</strong>
        </div>
        {isFacilitator ? (
          <div class="lg-stack">
            <Button variant="primary" size="lg" icon="play" disabled={!canAdvance} onClick={() => act({ type: 'phase.advance' })}>
              {second ? t('replenish.toLimits') : t('replenish.start')}
            </Button>
            {ready.length === 0 ? <p class="lg-muted">{t('replenish.minimum')}</p> : null}
          </div>
        ) : (
          <p class="lg-muted">{t('replenish.waitingStart', { role })}</p>
        )}
      </Panel>
      <div class="lg-two">
        <Panel title={`${t('replenish.inReady')} · ${ready.length}`} icon="check">
          <ul class="lg-pulls">
            {ready.length === 0 ? <li class="lg-muted">{t('board.empty')}</li> : null}
            {ready.map((item) => (
              <li key={item.id} class="lg-pull">
                {itemCard(item, view, t)}
                <Button variant="quiet" size="sm" icon="up" label={named(t('replenish.unpull'), item)} onClick={() => act({ type: 'plan.unpull', itemId: item.id })}>
                  {t('replenish.unpull')}
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={`${t('replenish.pool')} · ${pool.length}`} icon="diff">
          {full ? <p class="lg-muted">{t('replenish.full', { max: replenish.readyMax })}</p> : null}
          <ul class="lg-pulls">
            {pool.length === 0 ? <li class="lg-muted">{t('board.empty')}</li> : null}
            {pool.map((item) => (
              <li key={item.id} class="lg-pull">
                {itemCard(item, view, t)}
                <Button variant="secondary" size="sm" icon="down" disabled={full} label={named(t('replenish.pull'), item)} onClick={() => act({ type: 'plan.pull', itemId: item.id })}>
                  {t('replenish.pull')}
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function LimitSelect({ id, label, value, min, max, onChange, t }: { id: string; label: string; value: number | null; min: number; max: number; onChange: (value: number | null) => void; t: Translate }) {
  const sizes = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  return (
    <div class="lg-field">
      <label class="lg-field__label" for={id}>
        {label}
      </label>
      <select
        id={id}
        class="lg-input"
        value={value === null ? '' : String(value)}
        onChange={(event) => {
          const raw = (event.currentTarget as HTMLSelectElement).value;
          onChange(raw === '' ? null : Number(raw));
        }}
      >
        <option value="">{t('limits.noLimit')}</option>
        {sizes.map((size) => (
          <option key={size} value={String(size)}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
}

function sameLimits(a: WipLimits, b: WipLimits): boolean {
  return a.inProgress === b.inProgress && a.review === b.review;
}

function LimitsStep({ view, t }: { view: KanbanPlayerView; t: Translate }) {
  const replenish = view.planning?.replenish ?? null;
  const saved = view.limits ?? { inProgress: null, review: null };
  const [draft, setDraft] = useState<WipLimits>(saved);
  if (replenish === null) return null;
  const role = facilitatorRoleDef(view, t);
  const canSet = view.controls.includes('set_limits');
  const canAdvance = view.controls.includes('advance');
  const none = saved.inProgress === null && saved.review === null;
  const dirty = !sameLimits(draft, saved);
  return (
    <div class="lg-stack lg-stack--lg">
      <Panel title={stepTitle(view, t) === t('limits.title') ? undefined : t('limits.title')} icon="flag">
        <p class="lg-muted">{t('limits.explain')}</p>
        <div class="lg-sum" role="status">
          <span>{t('limits.inEffect')}</span>
          <strong>{none ? t('limits.noneSet') : limitsLine(saved, t)}</strong>
        </div>
        {canSet ? (
          <form
            class="lg-stack"
            onSubmit={(event) => {
              event.preventDefault();
              act({ type: 'plan.set_limits', inProgress: draft.inProgress, review: draft.review });
            }}
          >
            <div class="lg-two">
              <LimitSelect id="limit-doing" label={t('limits.inProgress')} value={draft.inProgress} min={replenish.limitMin} max={replenish.limitMax} onChange={(value) => setDraft({ ...draft, inProgress: value })} t={t} />
              <LimitSelect id="limit-review" label={t('limits.review')} value={draft.review} min={replenish.limitMin} max={replenish.limitMax} onChange={(value) => setDraft({ ...draft, review: value })} t={t} />
            </div>
            <p class="lg-muted">{t('limits.hint', { min: replenish.limitMin, max: replenish.limitMax })}</p>
            <div class="lg-cluster">
              <Button type="submit" variant="secondary" size="md" icon="check" disabled={!dirty}>
                {t('limits.save')}
              </Button>
            </div>
            {dirty ? <p class="lg-muted">{t('limits.unsaved')}</p> : null}
          </form>
        ) : (
          <p class="lg-muted">{t('limits.waiting', { role })}</p>
        )}
        {canAdvance ? (
          <div class="lg-stack">
            <Button variant="primary" size="lg" icon="play" onClick={() => act({ type: 'phase.advance' })}>
              {t('replenish.start')}
            </Button>
            {none && !dirty ? <p class="lg-muted">{t('limits.startWithout')}</p> : null}
          </div>
        ) : null}
        <p class="lg-muted">{t('limits.practice')}</p>
      </Panel>
    </div>
  );
}

/**
 * The Kanban Replenishment: choosing which requests enter Ready and, in round 2, setting the WIP limits.
 */
export function Replenish({ view, phase, t, scriptStep }: ReplenishProps) {
  const steps = phase.iteration === 1 ? ['replenish'] : ['replenish', 'limits'];
  const position = steps.indexOf(phase.step) + 1;
  const title = stepTitle(view, t);
  return (
    <>
      <div class="lg-play-head">
        <div class="lg-play-head__title">
          <p class="lg-eyebrow">{`${t(key(`iteration.${view.framework}`), { n: phase.iteration })} · ${t(key(`phase.${view.framework}.plan.name`))}`}</p>
          <h2 tabIndex={-1} data-lg-focus>
            {title}
          </h2>
        </div>
        {steps.length > 1 && position > 0 ? <span class="lg-muted">{t('phase.stepOf', { n: position, total: steps.length })}</span> : null}
      </div>
      {phase.step === 'replenish' ? <p class="lg-muted lg-legend">{t('item.legend.kanban')}</p> : null}
      <div class="lg-plan">
        <div class="lg-stack lg-stack--lg">
          {phase.step === 'replenish' ? <PullStep view={view} phase={phase} t={t} /> : null}
          {phase.step === 'limits' ? <LimitsStep view={view} t={t} /> : null}
        </div>
        <div class="lg-stack">
          <ScriptBox view={view} t={t} current={scriptStep} />
        </div>
      </div>
    </>
  );
}
