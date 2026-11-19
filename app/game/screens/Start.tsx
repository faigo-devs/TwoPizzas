import { useState } from 'preact/hooks';
import type { Framework } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Hero } from '../../ui/Hero.tsx';
import { TourInvite } from '../../ui/TourInvite.tsx';
import { createRoom, joinRoom, startTour } from '../controller.ts';
import { key } from '../format.ts';
import type { AppState } from '../store.ts';
import { stepsFor } from '../tour/steps.ts';
import { PublicBoard } from './LeaderboardPanel.tsx';
import { profileOf } from '../framework.ts';

export interface StartProps {
  state: AppState;
  t: Translate;
}

/**
 * The start screen in two zones: play with a team (create or join a room) and the solo tour, with the public lists below.
 */
export function Start({ state, t }: StartProps) {
  const [framework, setFramework] = useState<Framework>('scrum');
  const [code, setCode] = useState('');
  const failure = state.startError;
  const codeError = failure === 'codeShape' || failure === 'room_not_found' ? t(failure === 'codeShape' ? 'error.codeShape' : 'error.room_not_found') : undefined;
  const generalError = failure !== null && codeError === undefined ? t(key(`error.${failure}`)) : null;
  const profile = profileOf(framework);
  const stops = stepsFor(framework).map((step) => t(key(`tour.${step.id}.title${profile.tourTitleSuffixSteps.includes(step.id) ? profile.tourSuffix : ''}`)));
  return (
    <>
      {generalError !== null ? (
        <p class="lg-notice lg-notice--bad" role="alert" tabIndex={-1} data-lg-focus>
          {generalError}
        </p>
      ) : null}
      <div class="lg-start">
        <Hero
          scope="app"
          badge={t('start.team.badge')}
          tagline={t('start.tagline')}
          facts={t('start.team.facts')}
          tourLink={t('start.tourLink')}
          frameworkLegend={t('start.frameworkLegend')}
          frameworks={[
            { value: 'scrum', label: t('start.framework.scrum') },
            { value: 'kanban', label: t('start.framework.kanban') },
          ]}
          framework={framework}
          createLabel={t('start.create')}
          createBusyLabel={t('start.creating')}
          joinTitle={t('start.joinTitle')}
          codeLabel={t('start.codeLabel')}
          codeHint={t('start.codeHint')}
          code={code}
          codeError={codeError}
          joinLabel={t('start.join')}
          joinBusyLabel={t('start.joining')}
          busy={state.busy}
          onFramework={(value) => setFramework(value === 'kanban' ? 'kanban' : 'scrum')}
          onCode={(value) => setCode(value.replace(/[^A-Za-z]/g, '').toUpperCase())}
          onCreate={() => void createRoom(framework)}
          onJoin={() => joinRoom(code)}
        />
        <TourInvite
          badge={t('start.tour.badge')}
          title={t('start.tour.title')}
          text={t('start.tour.text')}
          facts={t('start.tour.facts')}
          routeLabel={t('start.tour.route')}
          stops={stops}
          startLabel={t('start.solo')}
          busy={state.busy !== null}
          onStart={() => startTour(framework)}
        />
      </div>
      <PublicBoard state={state} t={t} framework={framework} />
    </>
  );
}
