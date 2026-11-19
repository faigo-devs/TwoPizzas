import type { InspectPhase, ItemView, PlayerView, ScrumPlayerView } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { ActionBar } from '../../ui/ActionBar.tsx';
import { Button } from '../../ui/Button.tsx';
import { Panel } from '../../ui/Hero.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { WorkItemCard } from '../../ui/WorkItemCard.tsx';
import { act } from '../controller.ts';
import { itemLabels, key, themeOf } from '../format.ts';
import { profileOf } from '../framework.ts';
import { ScriptBox } from './Parts.tsx';
import { Comparison, ScreenHead, StepMove } from './ReviewParts.tsx';

export interface InspectProps {
  view: ScrumPlayerView;
  phase: InspectPhase;
  t: Translate;
  scriptStep: number;
}

function verdictCard(view: PlayerView, item: ItemView | undefined, id: string, accepted: boolean, t: Translate) {
  const profile = profileOf(view.framework);
  const label = t(accepted ? 'inspect.verdict.accepted' : 'inspect.verdict.rejected');
  return (
    <WorkItemCard
      id={id}
      kind={item?.kind ?? 'review'}
      kindLabel={t(key(`item.kind.${item?.kind ?? 'review'}`))}
      subject={item?.subject ?? id}
      value={item?.value ?? 0}
      estimate={item?.estimate ?? null}
      showEstimate={profile.estimates}
      status={accepted ? 'accepted' : 'rejected'}
      statusLabel={label}
      {...(item === undefined ? {} : themeOf(view, item, t))}
      note={t(accepted ? 'inspect.verdict.acceptedText' : profile.rejectedText)}
      labels={itemLabels(t)}
    />
  );
}

/**
 * The verdicts on the finished items, shown one at a time as the facilitator reveals them.
 */
export function IncrementStep({ view, t }: { view: PlayerView; t: Translate }) {
  const inspect = view.inspect;
  if (inspect === null) return null;
  const shown = inspect.verdicts.length;
  const pending = Math.max(0, inspect.verdictsTotal - shown);
  const canReveal = view.controls.includes('reveal_verdict');
  return (
    <Panel title={t(profileOf(view.framework).incrementTitle)} icon="check">
      {inspect.verdictsTotal === 0 ? (
        <p>{t('inspect.noneDone')}</p>
      ) : (
        <p class="lg-muted" role="status">
          {t('inspect.revealed', { shown, total: inspect.verdictsTotal })}
        </p>
      )}
      {inspect.verdicts.some((verdict) => verdict.outcome !== 'accepted') ? <p class="lg-muted">{t('inspect.escapedNote')}</p> : null}
      <ul class="lg-verdicts">
        {inspect.verdicts.map((verdict) => (
          <li key={verdict.itemId} class="lg-verdict">
            {verdictCard(
              view,
              view.items.find((own) => own.id === verdict.itemId),
              verdict.itemId,
              verdict.outcome === 'accepted',
              t,
            )}
          </li>
        ))}
        {Array.from({ length: pending }, (_, index) => (
          <li key={`pending-${index}`} class="lg-verdict lg-verdict--pending">
            <Icon name="lock" size={16} />
            <span>{t('inspect.pending')}</span>
          </li>
        ))}
      </ul>
      <ActionBar>
        {canReveal ? (
          <Button variant="primary" size="lg" icon="eye" onClick={() => act({ type: 'inspect.reveal' })}>
            {t('inspect.reveal')}
          </Button>
        ) : null}
        {canReveal && inspect.verdictsTotal - inspect.verdicts.length > 1 ? (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              for (let left = inspect.verdictsTotal - inspect.verdicts.length; left > 0; left -= 1) act({ type: 'inspect.reveal' });
            }}
          >
            {t('inspect.revealAll')}
          </Button>
        ) : null}
        <StepMove view={view} t={t} bare />
      </ActionBar>
    </Panel>
  );
}

function MissingItems({ view, t }: { view: ScrumPlayerView; t: Translate }) {
  const inspect = view.inspect;
  const theme = inspect === null ? null : inspect.goal;
  if (inspect === null || theme === null) return null;
  const missing = view.items.filter((item) => item.theme === theme && !(item.status === 'done' && item.outcome === 'accepted'));
  if (missing.length === 0) return null;
  const wrong = new Set(inspect.verdicts.filter((verdict) => verdict.outcome === 'escaped_defect').map((verdict) => verdict.itemId));
  return (
    <div class="lg-missing">
      <h4 class="lg-section-title">{t('inspect.goalMissing', { theme: t(key(`item.theme.${theme}`)) })}</h4>
      <ul class="lg-missing__list">
        {missing.map((item) => (
          <li key={item.id}>
            <strong>{item.id}</strong> {item.subject}: {t(wrong.has(item.id) ? 'inspect.goalMissing.wrong' : 'inspect.goalMissing.open')}
          </li>
        ))}
      </ul>
      <p class="lg-muted">{t('inspect.goalMissing.note')}</p>
    </div>
  );
}

function ResultStep({ view, t }: { view: ScrumPlayerView; t: Translate }) {
  const inspect = view.inspect;
  if (inspect === null) return null;
  return (
    <div class="lg-stack lg-stack--lg">
      <Panel title={t('inspect.goal', { theme: inspect.goal ?? '' })} icon="flag">
        {inspect.goalMet === null ? null : (
          <p class={inspect.goalMet ? 'lg-result lg-result--good' : 'lg-result lg-result--bad'} role="status">
            <Icon name={inspect.goalMet ? 'check' : 'warning'} size={18} />
            <span>{inspect.goalMet ? t('inspect.goalMet', { bonus: inspect.goalBonus ?? 0 }) : t('inspect.goalMissed')}</span>
          </p>
        )}
        <div class="lg-stats">
          <div class="lg-sum">
            <span>{t('inspect.value')}</span>
            <strong>{inspect.valueDelivered ?? 0}</strong>
          </div>
          <div class="lg-sum">
            <span>{t('inspect.velocity')}</span>
            <strong>{inspect.velocity ?? 0}</strong>
          </div>
        </div>
        {inspect.goalMet === false ? <MissingItems view={view} t={t} /> : null}
        <p class="lg-muted lg-sum-note">{t('inspect.velocityNote')}</p>
        <StepMove view={view} t={t} />
      </Panel>
      <Comparison metrics={view.metrics} view={view} t={t} />
    </div>
  );
}

function FeedbackStep({ view, t }: { view: ScrumPlayerView; t: Translate }) {
  const feedback = view.inspect?.feedback ?? null;
  if (feedback === null) return null;
  const created = feedback.newItemIds.flatMap((id) => {
    const found = view.items.find((own) => own.id === id);
    return found === undefined ? [] : [found];
  });
  return (
    <Panel title={t('inspect.feedback.title')} icon="users">
      <p>{t('inspect.feedback.shift', { theme: feedback.theme, bonus: feedback.bonus })}</p>
      <p>{t('inspect.feedback.newItems', { count: feedback.newItemIds.length })}</p>
      <ul class="lg-verdicts">
        {created.map((item) => (
          <li key={item.id} class="lg-verdict">
            <WorkItemCard
              id={item.id}
              kind={item.kind}
              kindLabel={t(key(`item.kind.${item.kind}`))}
              subject={item.subject}
              value={item.value}
              estimate={item.estimate}
              status="todo"
              statusLabel={t('item.status.backlog')}
              {...themeOf(view, item, t)}
              labels={itemLabels(t)}
            />
          </li>
        ))}
      </ul>
      <p class="lg-muted">{t('inspect.feedback.reordered')}</p>
      <StepMove view={view} t={t} />
    </Panel>
  );
}

/**
 * The Sprint Review: the Increment with each verdict revealed in turn, the result and the customers' feedback.
 */
export function Inspect({ view, phase, t, scriptStep }: InspectProps) {
  const steps = phase.iteration === 1 ? ['increment', 'result', 'feedback'] : ['increment', 'result'];
  return (
    <>
      <ScreenHead view={view} phase={phase} steps={steps} t={t} />
      <div class={view.script === null ? 'lg-stack lg-stack--lg' : 'lg-plan'}>
        <div class="lg-stack lg-stack--lg">
          {phase.step === 'increment' ? <IncrementStep view={view} t={t} /> : null}
          {phase.step === 'result' ? <ResultStep view={view} t={t} /> : null}
          {phase.step === 'feedback' ? <FeedbackStep view={view} t={t} /> : null}
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
