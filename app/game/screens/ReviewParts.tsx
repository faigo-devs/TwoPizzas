import type { Agreement, InspectPhase, IterationMetrics, PlayerView, RetroPhase } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { ActionBar } from '../../ui/ActionBar.tsx';
import { Button } from '../../ui/Button.tsx';
import { ComparisonChart, DotPlot } from '../../ui/Charts.tsx';
import { act } from '../controller.ts';
import { facilitatorRoleDef, formatClock, key } from '../format.ts';
import { stepTitle } from './Parts.tsx';
import { profileOf } from '../framework.ts';

export interface ScreenHeadProps {
  view: PlayerView;
  phase: InspectPhase | RetroPhase;
  steps: string[];
  t: Translate;
}

/**
 * The line above a review or retrospective screen: the event, the step title and the position among the steps.
 */
export function ScreenHead({ view, phase, steps, t }: ScreenHeadProps) {
  const position = steps.indexOf(phase.step) + 1;
  const event = t(key(`phase.${view.framework}.${phase.kind}.name`));
  return (
    <div class="lg-play-head">
      <div class="lg-play-head__title">
        <p class="lg-eyebrow">{`${t(key(`iteration.${view.framework}`), { n: phase.iteration })} · ${event}`}</p>
        <h2 tabIndex={-1} data-lg-focus>
          {stepTitle(view, t) ?? event}
        </h2>
      </div>
      {position > 0 ? <span class="lg-muted">{t('phase.stepOf', { n: position, total: steps.length })}</span> : null}
    </div>
  );
}

export interface MoveProps {
  view: PlayerView;
  t: Translate;
  label?: string;
  secondary?: boolean;
  bare?: boolean;
}

/**
 * The facilitator's button that ends the step, or a line telling everyone else who moves the game on.
 */
export function StepMove({ view, t, label, secondary = false, bare = false }: MoveProps) {
  if (view.controls.includes('advance')) {
    const button = (
      <Button variant={secondary ? 'secondary' : 'primary'} size="lg" icon="play" onClick={() => act({ type: 'phase.advance' })}>
        {label ?? t('phase.next')}
      </Button>
    );
    return bare ? button : <ActionBar>{button}</ActionBar>;
  }
  if (view.facilitatorId === view.selfId) return null;
  return <p class="lg-muted">{t('phase.waitingFor', { role: facilitatorRoleDef(view, t) })}</p>;
}

/**
 * The name of an agreement the game can track, or the team's own words for a free one.
 */
export function agreementName(agreement: Agreement, t: Translate): string {
  return t(key(`agreement.${agreement.type}.name`));
}

/**
 * What an agreement means, with its numbers filled in; a free agreement is shown as typed.
 */
export function agreementMeaning(agreement: Agreement, t: Translate): string {
  if (agreement.type === 'free') return agreement.text;
  if (agreement.type === 'wip_limit') return t('agreement.wip_limit.meaning', { max: agreement.max });
  if (agreement.type === 'review_wait') return t('agreement.review_wait.meaning', { seconds: Math.round(agreement.maxMs / 1000) });
  return t(key(`agreement.${agreement.type}.meaning`));
}

/**
 * The two iterations side by side as bars, drawn from the numbers the server sent; null until both have run.
 */
export function Comparison({ metrics, view, t }: { metrics: IterationMetrics[]; view: PlayerView; t: Translate }) {
  const first = metrics[0];
  const second = metrics[1];
  if (first === undefined || second === undefined) return null;
  const metric = profileOf(view.framework).sizeMetric;
  const groups = [
    { label: t('summary.value'), first: first.valueDelivered, second: second.valueDelivered },
    { label: t('summary.accepted'), first: first.accepted, second: second.accepted },
    { label: t(metric.compared), first: metric.pick(first), second: metric.pick(second) },
    { label: t('summary.defects'), first: first.escapedDefects, second: second.escapedDefects },
  ];
  const summary = groups.map((group) => `${group.label}: ${group.first}, ${group.second}`).join('. ');
  return (
    <ComparisonChart
      title={t('compare.title')}
      firstLabel={t(key(`iteration.${view.framework}`), { n: 1 })}
      secondLabel={t(key(`iteration.${view.framework}`), { n: 2 })}
      groups={groups}
      summary={summary}
    />
  );
}

/**
 * Cycle times of the finished items, one dot each, with the server's average marked on every row.
 */
export function CycleDots({ metrics, view, t }: { metrics: IterationMetrics[]; view: PlayerView; t: Translate }) {
  const rows = metrics
    .filter((own) => own.cycleTimesMs.length > 0 && own.averageCycleMs !== null)
    .map((own) => ({
      label: t(key(`iteration.${view.framework}`), { n: own.iteration }),
      values: own.cycleTimesMs.map((ms) => Math.round(ms / 1000)),
      median: Math.round((own.averageCycleMs ?? 0) / 1000),
    }));
  if (rows.length === 0) return null;
  const highest = Math.max(...rows.flatMap((row) => row.values), ...rows.map((row) => row.median));
  const max = Math.max(60, Math.ceil(highest / 60) * 60);
  const summary = rows.map((row) => `${row.label}: ${t('compare.cycleAverage')} ${formatClock(row.median * 1000)}`).join('. ');
  return <DotPlot title={t('compare.cycleTitle')} rows={rows} max={max} unit="s" medianLabel={t('compare.cycleAverage')} summary={summary} />;
}
