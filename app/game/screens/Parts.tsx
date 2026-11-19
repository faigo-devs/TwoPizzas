import type { Observation, PlayerView } from '../../../core/index.ts';
import { dictionaries, type Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { Callout } from '../../ui/Callout.tsx';
import { ScriptPanel } from '../../ui/Phase.tsx';
import { setScriptStep } from '../controller.ts';
import { facilitatorRole, key } from '../format.ts';
import { store } from '../store.ts';
import { profileOf } from '../framework.ts';

export interface PartProps {
  view: PlayerView;
  t: Translate;
}

/**
 * What the board showed in the last event, as callouts, with the event's typical mistake under them.
 */
export function Observations({ view, t }: PartProps) {
  const list: Observation[] = view.observations;
  if (list.length === 0) return null;
  const first = list[0];
  const event = first === undefined ? null : first.id.split('.')[0];
  const mistakeKey = event === null ? null : `phase.${view.framework}.${event}.mistake`;
  return (
    <details class="lg-obs lg-obs--fold">
      <summary>{t('observation.titleFor', { event: t(key(`phase.${view.framework}.${event}.name`)) })}</summary>
      <div class="lg-obs__list">
        {list.map((observation) => (
          <Callout
            key={observation.id}
            tone={observation.positive ? 'good' : 'watch'}
            tag={t(observation.positive ? 'observation.positive' : 'observation.watch')}
            title={t(key(`observation.${observation.id}.title`))}
          >
            {t(key(`observation.${observation.id}.text`), observation.params)}
          </Callout>
        ))}
      </div>
      {mistakeKey !== null && mistakeKey in dictionaries.en ? (
        <p class="lg-obs__mistake">
          <strong>{t('observation.typicalMistakeFor', { event: t(key(`phase.${view.framework}.${event}.name`)) })}.</strong> {t(key(mistakeKey))}
        </p>
      ) : null}
      {profileOf(view.framework).wipNote && list.some((observation) => observation.id === 'work.wipLow' || observation.id === 'work.wipHigh') ? (
        <p class="lg-muted lg-obs__note">{t('agreement.wip_limit.scrumNote')}</p>
      ) : null}
      <p class="lg-muted lg-obs__note">{t('observation.note')}</p>
    </details>
  );
}

export interface ScriptBoxProps extends PartProps {
  current: number;
}

/**
 * The facilitator's script for the event and step that is open, with the lines ticked as the facilitator goes.
 */
export function ScriptBox({ view, t, current }: ScriptBoxProps) {
  const script = view.script;
  if (script === null || store.get().mode === 'tour') return null;
  const prefix = `script.${view.framework}.${script.event}.${script.step}.`;
  const lines: string[] = [];
  for (let n = 1; `${prefix}${n}` in dictionaries.en; n += 1) lines.push(t(key(`${prefix}${n}`)));
  if (lines.length === 0) return null;
  return (
    <ScriptPanel
      title={t('script.title')}
      badge={facilitatorRole(view, t)}
      steps={lines.map((text) => ({ text }))}
      current={current}
      stepLabel={t('script.step')}
      doneLabel={t('script.done')}
      allLabel={t('script.allSteps')}
      footer={
        <Button variant="secondary" size="sm" icon="check" disabled={current >= lines.length} onClick={() => setScriptStep(current + 1)}>
          {t('script.markDone')}
        </Button>
      }
    />
  );
}

/**
 * The name of the step that is open, for the line next to a screen's title.
 */
export function stepTitle(view: PlayerView, t: Translate): string | null {
  const phase = view.phase;
  if (phase.kind === 'lobby' || phase.kind === 'summary') return null;
  const stepKey = `step.${view.framework}.${phase.kind}.${phase.step}`;
  return stepKey in dictionaries.en ? t(key(stepKey)) : null;
}
