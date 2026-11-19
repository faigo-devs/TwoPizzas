import type { PlayerView, TimedPhase } from '../../../core/index.ts';
import { dictionaries, type Translate } from '../../i18n/index.ts';
import { PhaseCard } from '../../ui/Phase.tsx';
import { act } from '../controller.ts';
import { facilitatorRoleDef, key, lowerFirst, minutes } from '../format.ts';
import { profileOf } from '../framework.ts';
import { goalKey } from '../learn.ts';
import { store } from '../store.ts';
import { QuickCheck } from './Learn.tsx';
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
  const profile = profileOf(view.framework);
  const roles = profile.roles.map((role) => ({ who: t(role.who), what: t(key(`${prefix}.${role.what}`)) }));
  const akaKey = `${prefix}.aka`;
  const aka = akaKey in dictionaries.en ? `${t('phase.akaLabel')}: ${t(key(akaKey))}` : undefined;
  const scale = [t('phase.scale', { minutes: Math.round(phase.timebox.durationMs / 60_000) })];
  if (phase.kind === 'daily') scale.push(t(key(`phase.resume.${view.framework}`)));
  return (
    <div class="lg-card-layout">
      <div class="lg-stack lg-stack--lg">
        <PhaseCard
          eyebrow={`${t(key(`iteration.${view.framework}`), { n: phase.iteration })} · ${t(key(`${prefix}.name`))}`}
          title={t(key(`${prefix}.name`))}
          aka={aka}
          goal={t(key(goalKey(view.framework, phase.kind)))}
          real={profile.realInline ? `${t('phase.realLabel')}: ${lowerFirst(t(key(`${prefix}.real`)))} ${t('phase.gloss')}` : undefined}
          purpose={t(key(`${prefix}.purpose`))}
          purposeLabel={t('phase.purposeLabel')}
          timebox={minutes(phase.timebox.durationMs, t)}
          timeboxLabel={t('phase.timeboxLabel')}
          endsLabel={t(phase.timebox.hard ? 'phase.ends.hard' : profile.softEnd)}
          rolesLabel={t('phase.rolesLabel')}
          roles={roles}
          scaleNote={scale.join(' ')}
          note={{ label: t('phase.practiceLabel'), text: t(key(`${prefix}.practice`)) }}
          more={{
            summary: `${t('phase.realLabel')} · ${t('phase.mistakeLabel')}`,
            items: [
              ...(profile.realInline ? [] : [{ label: t('phase.realLabel'), text: t(key(`${prefix}.real`)) }]),
              { label: t('phase.mistakeLabel'), text: t(key(`${prefix}.mistake`)) },
            ],
          }}
          moreLabel={t('phase.moreAll')}
          beginLabel={t('phase.begin')}
          waitingLabel={t('phase.waiting', { role: facilitatorRoleDef(view, t) })}
          canBegin={view.controls.includes('begin_phase')}
          onBegin={() => act({ type: 'phase.begin' })}
        />
      </div>
      <div class="lg-stack lg-stack--lg">
        <QuickCheck view={view} t={t} />
        {store.get().mode === 'tour' ? null : <Observations view={view} t={t} />}
        <ScriptBox view={view} t={t} current={scriptStep} />
      </div>
    </div>
  );
}
