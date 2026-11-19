import type { EventRecord, IterationMetrics, ObservationEntry, PlayerView } from '../../../core/index.ts';
import { dictionaries, type Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { leave } from '../controller.ts';
import { formatClock, key } from '../format.ts';
import { buildQuestion, Slots, slotId } from '../learn.ts';
import type { AppState } from '../store.ts';
import { limitsLine } from './Flow.tsx';
import { PublishPanel } from './LeaderboardPanel.tsx';
import { agreementName, Comparison, CycleDots } from './ReviewParts.tsx';
import { profileOf } from '../framework.ts';

export interface SummaryProps {
  view: PlayerView;
  state: AppState;
  t: Translate;
}

function cycle(ms: number | null, t: Translate): string {
  return ms === null ? t('common.none') : formatClock(ms);
}

function Numbers({ view, metrics, t }: { view: PlayerView; metrics: IterationMetrics[]; t: Translate }) {
  const profile = profileOf(view.framework);
  const rows: { label: string; cell: (own: IterationMetrics) => string }[] = [
    { label: t('summary.accepted'), cell: (own) => String(own.accepted) },
    { label: t('summary.defects'), cell: (own) => String(own.escapedDefects) },
    { label: t('summary.value'), cell: (own) => String(own.valueDelivered) },
    { label: t(profile.sizeMetric.numbers), cell: (own) => String(profile.sizeMetric.pick(own)) },
    { label: t('summary.cycle'), cell: (own) => cycle(own.averageCycleMs, t) },
  ];
  if (profile.goals) {
    rows.splice(3, 0, {
      label: t('summary.goal'),
      cell: (own) => (own.goalMet === null ? t('common.none') : own.goalMet ? t('summary.goalMet', { bonus: own.goalBonus }) : t('summary.goalMissed')),
    });
  }
  if (profile.limits) {
    rows.splice(
      4,
      0,
      { label: t('summary.wipMax'), cell: (own) => String(own.wipMax) },
      {
        label: t('summary.open'),
        cell: (own) => (own.openAges.length === 0 ? t('common.none') : t('summary.openOldest', { count: own.openAges.length, oldest: formatClock(Math.max(...own.openAges.map((open) => open.ageMs))) })),
      },
      {
        label: t('summary.limits'),
        cell: (own) => (own.wipLimits === undefined || (own.wipLimits.inProgress === null && own.wipLimits.review === null) ? t('limits.noneShort') : limitsLine(own.wipLimits, t)),
      },
    );
  }
  rows.push({
    label: t('summary.agreement'),
    cell: (own) => {
      if (own.agreement === null) return t('common.none');
      const status = own.agreement.kept === null ? t('summary.untracked') : own.agreement.kept ? t('summary.kept') : t('summary.broken', { count: own.agreement.violations ?? 0 });
      return `${agreementName(own.agreement.agreement, t)}: ${status}`;
    },
  });
  return (
    <table class="lg-sheet__table">
      <caption class="lg-sr">{t('summary.perIteration')}</caption>
      <thead>
        <tr>
          <th scope="col">
            <span class="lg-sr">{t('summary.perIteration')}</span>
          </th>
          {metrics.map((own) => (
            <th key={own.iteration} scope="col">
              {t(key(`iteration.${view.framework}`), { n: own.iteration })}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            {metrics.map((own) => (
              <td key={own.iteration}>{row.cell(own)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Recap({ view, recap, t }: { view: PlayerView; recap: EventRecord[]; t: Translate }) {
  return (
    <div class="lg-sheet__recap">
      {[1, 2].map((iteration) => {
        const own = recap.filter((record) => record.iteration === iteration);
        if (own.length === 0) return null;
        return (
          <div key={iteration} class="lg-sheet__block">
            <h4>{t(key(`iteration.${view.framework}`), { n: iteration })}</h4>
            <ul class="lg-sheet__list">
              {own.map((record) => (
                <li key={`${record.kind}-${iteration}`}>
                  <strong>{t(key(`phase.${view.framework}.${record.kind}.name`))}</strong>
                  <span>
                    {t('summary.recap.used', { used: formatClock(record.usedMs), timebox: formatClock(record.timeboxMs) })}
                    {' · '}
                    {record.overrunMs > 0 ? t('summary.recap.over', { overrun: formatClock(record.overrunMs) }) : t('summary.recap.onTime')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function History({ view, history, t }: { view: PlayerView; history: ObservationEntry[]; t: Translate }) {
  const groups = [1, 2].flatMap((iteration) => {
    const events = history.filter((entry) => entry.iteration === iteration && entry.observations.length > 0);
    return events.length === 0 ? [] : [{ iteration, events }];
  });
  if (groups.length === 0) return <p class="lg-muted">{t('summary.history.none')}</p>;
  return (
    <div class="lg-sheet__recap lg-hist">
      {groups.map(({ iteration, events }) => (
        <div key={iteration} class="lg-sheet__block">
          <h4>{t(key(`iteration.${view.framework}`), { n: iteration })}</h4>
          <ul class="lg-hist__events">
            {events.map((entry) => (
              <li key={entry.event} class="lg-hist__event">
                <strong>{t(key(`phase.${view.framework}.${entry.event}.name`))}</strong>
                <ul class="lg-hist__list">
                  {entry.observations.map((observation) => (
                    <li key={observation.id} class={observation.positive ? 'lg-hist__obs lg-hist__obs--good' : 'lg-hist__obs lg-hist__obs--watch'}>
                      <span class="lg-hist__tag">{t(observation.positive ? 'observation.positive' : 'observation.watch')}</span>
                      <span>
                        <strong>{t(key(`observation.${observation.id}.title`))}.</strong> {t(key(`observation.${observation.id}.text`), observation.params)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Learned({ view, t }: { view: PlayerView; t: Translate }) {
  const present = profileOf(view.framework).recapEvents.filter((event) => `phase.${view.framework}.${event}.purpose` in dictionaries.en);
  return (
    <div class="lg-sheet__events">
      {present.map((event) => {
        const base = `phase.${view.framework}.${event}`;
        const mistake = `${base}.mistake`;
        return (
          <article key={event} class="lg-sheet__event">
            <h4>{event === 'work' ? t('summary.sprintName') : t(key(`${base}.name`))}</h4>
            <dl>
              <dt>{t('summary.purpose')}</dt>
              <dd>{t(key(`${base}.purpose`))}</dd>
              <dt>{t('summary.duration')}</dt>
              <dd>{t(key(`${base}.real`))}</dd>
              <dt>{t('observation.typicalMistake')}</dt>
              <dd>{mistake in dictionaries.en ? t(key(mistake)) : null}</dd>
            </dl>
          </article>
        );
      })}
    </div>
  );
}

function Checks({ view, state, t }: { view: PlayerView; state: AppState; t: Translate }) {
  const seen = Slots.flatMap((slot) => {
    const pick = state.learn[slotId(slot)];
    const question = pick === undefined ? null : buildQuestion(view.code, view.framework, slot, t);
    return pick === undefined || question === null ? [] : [{ question, pick }];
  });
  if (seen.length === 0 || state.mode === 'tour') return null;
  const answered = seen.filter((own) => own.pick >= 0);
  const right = answered.filter((own) => own.pick === own.question.right).length;
  const list = (
    <ul class="lg-checks__list">
      {seen.map(({ question, pick }) => (
        <li key={question.id}>
          <strong>{question.question}</strong>
          <span>{t('learn.answer', { answer: question.choices[question.right]! })}</span>
          <span class="lg-muted">{pick >= 0 ? t('learn.summary.pick', { answer: question.choices[pick]! }) : t('learn.summary.skipped')}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <section class="lg-sheet__section lg-checks">
      <h3 class="lg-section-title">{t('learn.summary.title')}</h3>
      {answered.length > 0 ? <p class="lg-checks__count">{t('learn.summary.count', { right, total: answered.length })}</p> : null}
      <details class="lg-checks__more lg-noprint">
        <summary>{t('learn.summary.show')}</summary>
        {list}
      </details>
      <div class="lg-printonly">{list}</div>
      <p class="lg-muted lg-noprint">{t('learn.summary.note')}</p>
    </section>
  );
}

/**
 * The session sheet: score, numbers of both iterations, what each event did, what each event is for; it prints and saves as PDF.
 */
export function Summary({ view, state, t }: SummaryProps) {
  const summary = view.summary;
  if (summary === null) return null;
  const date = new Date(view.now).toLocaleDateString(state.lang, { year: 'numeric', month: 'long', day: 'numeric' });
  const score = summary.score;
  return (
    <>
      <div class="lg-play-head lg-noprint">
        <div class="lg-play-head__title">
          <p class="lg-eyebrow">{t(key(`start.framework.${view.framework}`))}</p>
          <h2 tabIndex={-1} data-lg-focus>
            {t('summary.title')}
          </h2>
        </div>
        <Button variant="primary" size="md" onClick={() => window.print()}>
          {t('summary.printSave')}
        </Button>
        <Button variant="secondary" size="md" onClick={leave}>
          {t('summary.again')}
        </Button>
      </div>
      <p class="lg-muted lg-noprint">{t('summary.printHint')}</p>
      <PublishPanel view={view} state={state} t={t} />
      <article class="lg-sheet" aria-labelledby="lg-sheet-title">
        <header class="lg-sheet__head">
          <h3 id="lg-sheet-title">{t('summary.sheetTitle')}</h3>
          <dl class="lg-sheet__meta">
            <div>
              <dt>{t('summary.team')}</dt>
              <dd>{view.teamName}</dd>
            </div>
            <div>
              <dt>{t('summary.framework')}</dt>
              <dd>{t(key(`start.framework.${view.framework}`))}</dd>
            </div>
            <div>
              <dt>{t('summary.date')}</dt>
              <dd>{date}</dd>
            </div>
          </dl>
        </header>
        <section class="lg-sheet__section">
          <div class="lg-sheet__score">
            <div class="lg-sum" role="status">
              <span>{t('summary.score')}</span>
              <strong>{score.total}</strong>
            </div>
            <p class="lg-muted lg-sheet__scorenote">{t(profileOf(view.framework).scoreNote)}</p>
            <dl class="lg-sheet__stats">
              <div>
                <dt>{t('summary.value')}</dt>
                <dd>{score.value}</dd>
              </div>
              {profileOf(view.framework).goals ? (
                <div>
                  <dt>{t('summary.goalBonus')}</dt>
                  <dd>{score.goalBonus}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t('summary.defects')}</dt>
                <dd>{score.escapedDefects}</dd>
              </div>
              <div>
                <dt>{t('summary.cycle')}</dt>
                <dd>{cycle(score.averageCycleMs, t)}</dd>
              </div>
            </dl>
          </div>
        </section>
        <section class="lg-sheet__section">
          <h3 class="lg-section-title">{t('summary.perIteration')}</h3>
          <Numbers view={view} metrics={summary.metrics} t={t} />
          {profileOf(view.framework).velocity && summary.metrics.some((own) => own.velocity === 0 && own.accepted > 0) ? <p class="lg-muted">{t('summary.velocityNote')}</p> : null}
          <div class="lg-sheet__charts">
            <Comparison metrics={summary.metrics} view={view} t={t} />
            <CycleDots metrics={summary.metrics} view={view} t={t} />
          </div>
        </section>
        <section class="lg-sheet__section">
          <h3 class="lg-section-title">{t('summary.recap')}</h3>
          <Recap view={view} recap={summary.recap} t={t} />
        </section>
        <section class="lg-sheet__section">
          <h3 class="lg-section-title">{t('observation.title')}</h3>
          <History view={view} history={summary.observationHistory} t={t} />
          <p class="lg-muted lg-obs__note">{t('observation.note')}</p>
        </section>
        <Checks view={view} state={state} t={t} />
        <section class="lg-sheet__section">
          <h3 class="lg-section-title">{t(profileOf(view.framework).learnedTitle)}</h3>
          <p class="lg-muted">{t(profileOf(view.framework).learned)}</p>
          <Learned view={view} t={t} />
        </section>
      </article>
      <div class="lg-noprint lg-sheet__end">
        <Button variant="primary" size="md" onClick={() => window.print()}>
          {t('summary.printSave')}
        </Button>
      </div>
    </>
  );
}
