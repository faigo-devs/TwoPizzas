import type { PlayerView, TimedPhase } from '../../../core/index.ts';
import { dictionaries, type Translate } from '../../i18n/index.ts';
import { PhaseCard } from '../../ui/Phase.tsx';
import { act } from '../controller.ts';
import { facilitatorRole, key, minutes } from '../format.ts';
import { Observations, ScriptBox } from './Parts.tsx';

export interface CardProps {
  view: PlayerView;
  phase: TimedPhase;
  t: Translate;
  scriptStep: number;
}

/**
 * The card that opens every phase: purpose, real and game timebox, who does what, and Begin for the facilitator.
 */
export function Card({ view, phase, t, scriptStep }: CardProps) {
  const prefix = `phase.${view.framework}.${phase.kind}`;
  const roles =
    view.framework === 'scrum'
      ? [
          { who: t('role.productOwner'), what: t(key(`${prefix}.role.productOwner`)) },
          { who: t('role.developers'), what: t(key(`${prefix}.role.developers`)) },
          { who: t('role.scrumMaster'), what: t(key(`${prefix}.role.scrumMaster`)) },
        ]
      : [
          { who: t('role.customer'), what: t(key(`${prefix}.role.customer`)) },
          { who: t('role.team'), what: t(key(`${prefix}.role.team`)) },
          { who: t('role.facilitator.kanban'), what: t(key(`${prefix}.role.facilitator`)) },
        ];
  const akaKey = `${prefix}.aka`;
  const aka = akaKey in dictionaries.en ? `${t('phase.akaLabel')}: ${t(key(akaKey))}` : undefined;
  const scale = [t('phase.scale', { minutes: Math.round(phase.timebox.durationMs / 60_000) })];
  if (phase.kind === 'daily') scale.push(t(key(`phase.resume.${view.framework}`)));
  return (
    <div class="lg-card-layout">
      <div class="lg-stack lg-stack--lg">
        <Observations view={view} t={t} />
        <PhaseCard
          eyebrow={`${t(key(`iteration.${view.framework}`), { n: phase.iteration })} · ${t(key(`${prefix}.name`))}`}
          title={t(key(`${prefix}.name`))}
          aka={aka}
          purpose={t(key(`${prefix}.purpose`))}
          purposeLabel={t('phase.purposeLabel')}
          timebox={minutes(phase.timebox.durationMs, t)}
          timeboxLabel={t('phase.timeboxLabel')}
          endsLabel={t(phase.timebox.hard ? 'phase.ends.hard' : 'phase.ends.soft')}
          rolesLabel={t('phase.rolesLabel')}
          roles={roles}
          scaleNote={scale.join(' ')}
          more={{
            summary: `${t('phase.realLabel')} · ${t('phase.mistakeLabel')}`,
            items: [
              { label: t('phase.realLabel'), text: t(key(`${prefix}.real`)) },
              { label: t('phase.mistakeLabel'), text: t(key(`${prefix}.mistake`)) },
              { label: t('phase.practiceLabel'), text: t(key(`${prefix}.practice`)) },
            ],
          }}
          beginLabel={t('phase.begin')}
          waitingLabel={t('phase.waiting', { role: facilitatorRole(view, t) })}
          canBegin={view.controls.includes('begin_phase')}
          onBegin={() => act({ type: 'phase.begin' })}
        />
      </div>
      <div class="lg-stack">
        <ScriptBox view={view} t={t} current={scriptStep} />
      </div>
    </div>
  );
}
