import type { FlowComparison, InspectPhase, IterationMetrics, KanbanPlayerView } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Panel } from '../../ui/Hero.tsx';
import { ComparisonChart } from '../../ui/Charts.tsx';
import { StatusMarker } from '../../ui/Status.tsx';
import { formatClock, statusText } from '../format.ts';
import { limitsLine } from './Flow.tsx';
import { IncrementStep } from './Inspect.tsx';
import { ScriptBox } from './Parts.tsx';
import { CycleDots, ScreenHead, StepMove } from './ReviewParts.tsx';

export interface DeliveryProps {
  view: KanbanPlayerView;
  phase: InspectPhase;
  t: Translate;
  scriptStep: number;
}

function clock(ms: number | null, t: Translate): string {
  return ms === null ? t('kanban.metric.noCycle') : formatClock(ms);
}

function Metric({ name, value, text }: { name: string; value: string; text: string }) {
  return (
    <div class="lg-metric">
      <dt class="lg-metric__name">{name}</dt>
      <dd class="lg-metric__value">{value}</dd>
      <dd class="lg-metric__text">{text}</dd>
    </div>
  );
}

function MetricsPanel({ flow, t }: { flow: IterationMetrics; t: Translate }) {
  const oldest = flow.openAges.reduce((top, own) => Math.max(top, own.ageMs), 0);
  const limits = flow.wipLimits;
  return (
    <Panel title={t('kanban.metrics.title')} icon="clock">
      <dl class="lg-metrics">
        <Metric name={t('kanban.metric.wip')} value={String(flow.wipMax)} text={t('kanban.metric.wip.text', { value: flow.wipMax })} />
        <Metric name={t('kanban.metric.throughput')} value={String(flow.throughput)} text={t('kanban.metric.throughput.text', { value: flow.throughput })} />
        <Metric
          name={t('kanban.metric.cycleTime')}
          value={clock(flow.averageCycleMs, t)}
          text={t('kanban.metric.cycleTime.text', { value: clock(flow.averageCycleMs, t) })}
        />
        <Metric
          name={t('kanban.metric.age')}
          value={flow.openAges.length === 0 ? t('kanban.metric.noOpen') : formatClock(oldest)}
          text={t('kanban.metric.age.text')}
        />
      </dl>
      <p class="lg-muted">
        {t('kanban.metric.defects')}: {flow.escapedDefects}
        {' · '}
        {t('limits.title')}: {limits === undefined || (limits.inProgress === null && limits.review === null) ? t('limits.noneShort') : limitsLine(limits, t)}
      </p>
    </Panel>
  );
}

function AgePanel({ flow, view, t }: { flow: IterationMetrics; view: KanbanPlayerView; t: Translate }) {
  const sorted = [...flow.openAges].sort((a, b) => b.ageMs - a.ageMs);
  const top = Math.max(1, ...sorted.map((own) => own.ageMs));
  return (
    <Panel title={t('delivery.openTitle')} icon={sorted.length === 0 ? 'check' : 'warning'}>
      {sorted.length === 0 ? (
        <p>{t('delivery.noOpen')}</p>
      ) : (
        <>
          <p class="lg-muted">{t('inspect.verdict.notDoneText.kanban')}</p>
          <ul class="lg-ages">
            {sorted.map((own) => {
              const item = view.items.find((candidate) => candidate.id === own.itemId);
              return (
                <li key={own.itemId} class="lg-age">
                  <span class="lg-age__name">
                    <span class="lg-item__id">{own.itemId}</span> {item?.subject ?? ''}
                    {item === undefined ? null : <span class="lg-muted"> · {statusText(item, t)}</span>}
                  </span>
                  <span class="lg-age__bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(3, Math.round((own.ageMs / top) * 100))}%` }} />
                  </span>
                  <span class="lg-age__value">{formatClock(own.ageMs)}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}

function FlowStep({ view, t }: { view: KanbanPlayerView; t: Translate }) {
  const flow = view.inspect?.flow ?? null;
  if (flow === null) return null;
  return (
    <div class="lg-stack lg-stack--lg">
      <MetricsPanel flow={flow} t={t} />
      <div class="lg-flowpair">
        <div class="lg-stack">
          {flow.cycleTimesMs.length === 0 ? (
            <Panel title={t('compare.cycleTitle')} icon="clock">
              <p>{t('delivery.noCycle')}</p>
            </Panel>
          ) : (
            <CycleDots metrics={view.metrics} view={view} t={t} />
          )}
        </div>
        <AgePanel flow={flow} view={view} t={t} />
      </div>
      <StepMove view={view} t={t} />
    </div>
  );
}

interface Row {
  label: string;
  first: string;
  second: string;
}

function rowsOf(comparison: FlowComparison, t: Translate): Row[] {
  const number = (value: number | null): string => (value === null ? t('common.none') : String(value));
  return [
    { label: t('kanban.metric.throughput'), first: number(comparison.throughput.first), second: number(comparison.throughput.second) },
    { label: t('kanban.metric.cycleTime'), first: clock(comparison.averageCycleMs.first, t), second: clock(comparison.averageCycleMs.second, t) },
    { label: t('kanban.metric.wip'), first: number(comparison.wipMax.first), second: number(comparison.wipMax.second) },
    { label: t('delivery.openCount'), first: number(comparison.openCount.first), second: number(comparison.openCount.second) },
    { label: t('kanban.metric.defects'), first: number(comparison.escapedDefects.first), second: number(comparison.escapedDefects.second) },
    { label: t('summary.value'), first: number(comparison.valueDelivered.first), second: number(comparison.valueDelivered.second) },
  ];
}

function ComparisonStep({ view, t }: { view: KanbanPlayerView; t: Translate }) {
  const comparison = view.inspect?.comparison ?? null;
  if (comparison === null) return null;
  const rows = rowsOf(comparison, t);
  const whole = (value: number | null): number => value ?? 0;
  const groups = [
    { label: t('kanban.metric.throughput'), first: whole(comparison.throughput.first), second: whole(comparison.throughput.second) },
    { label: t('kanban.metric.wip'), first: whole(comparison.wipMax.first), second: whole(comparison.wipMax.second) },
    { label: t('delivery.openCount'), first: whole(comparison.openCount.first), second: whole(comparison.openCount.second) },
    { label: t('kanban.metric.defects'), first: whole(comparison.escapedDefects.first), second: whole(comparison.escapedDefects.second) },
  ];
  const cycle = comparison.averageCycleMs;
  if (cycle.first !== null && cycle.second !== null) {
    groups.push({ label: `${t('kanban.metric.cycleTime')} (${t('kanban.compare.unit.seconds')})`, first: Math.round(cycle.first / 1000), second: Math.round(cycle.second / 1000) });
  }
  const summary = groups.map((group) => `${group.label}: ${group.first}, ${group.second}`).join('. ');
  const limits = comparison.limits;
  const none = limits.inProgress === null && limits.review === null;
  return (
    <div class="lg-stack lg-stack--lg">
      <Panel title={t('kanban.compare.title')} icon="diff">
        <p>{t('kanban.compare.summary', { first: whole(comparison.throughput.first), second: whole(comparison.throughput.second) })}</p>
        {cycle.first !== null && cycle.second !== null ? (
          <p>{t('kanban.compare.cycleSummary', { first: formatClock(cycle.first), second: formatClock(cycle.second) })}</p>
        ) : null}
        <p class="lg-muted">
          {t('delivery.limitsInRound2')}: {none ? t('limits.noneShort') : limitsLine(limits, t)}
        </p>
        <table class="lg-sheet__table">
          <caption class="lg-sr">{t('kanban.compare.title')}</caption>
          <thead>
            <tr>
              <th scope="col">
                <span class="lg-sr">{t('kanban.metrics.title')}</span>
              </th>
              <th scope="col">{t('kanban.compare.first')}</th>
              <th scope="col">{t('kanban.compare.second')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.first}</td>
                <td>{row.second}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <StepMove view={view} t={t} />
      </Panel>
      <div class="lg-stack lg-stack--lg">
        <ComparisonChart title={t('kanban.compare.title')} firstLabel={t('kanban.compare.first')} secondLabel={t('kanban.compare.second')} groups={groups} summary={summary} />
        <CycleDots metrics={view.metrics} view={view} t={t} />
      </div>
    </div>
  );
}

/**
 * The Kanban Delivery review: the customer's verdicts, the four flow metrics with the open items' age and, in round 2, the two rounds side by side.
 */
export function Delivery({ view, phase, t, scriptStep }: DeliveryProps) {
  const steps = phase.iteration === 1 ? ['increment', 'flow'] : ['increment', 'flow', 'comparison'];
  return (
    <>
      <ScreenHead view={view} phase={phase} steps={steps} t={t} />
      <div class={view.script === null ? 'lg-stack lg-stack--lg' : 'lg-plan'}>
        <div class="lg-stack lg-stack--lg">
          {phase.step === 'increment' ? <IncrementStep view={view} t={t} /> : null}
          {phase.step === 'flow' ? <FlowStep view={view} t={t} /> : null}
          {phase.step === 'comparison' ? <ComparisonStep view={view} t={t} /> : null}
        </div>
        {view.script === null ? null : (
          <div class="lg-stack">
            <ScriptBox view={view} t={t} current={scriptStep} />
          </div>
        )}
      </div>
    </>
  );
}

