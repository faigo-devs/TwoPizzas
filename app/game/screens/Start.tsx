import { useState } from 'preact/hooks';
import type { Framework, LeaderboardEntry } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Hero } from '../../ui/Hero.tsx';
import { Leaderboard, type LeaderboardRow } from '../../ui/Leaderboard.tsx';
import { createRoom, joinRoom, startLocal } from '../controller.ts';
import { key } from '../format.ts';
import type { AppState } from '../store.ts';

function rowsOf(entries: LeaderboardEntry[]): LeaderboardRow[] {
  return entries.map((entry, index) => ({
    rank: index + 1,
    team: entry.teamName,
    players: entry.players,
    score: entry.score,
    defects: entry.escapedDefects,
    date: entry.date,
  }));
}

export interface StartProps {
  state: AppState;
  t: Translate;
}

/**
 * The start screen: choose a framework, create a room, join by code or take the solo tour, with the public lists below.
 */
export function Start({ state, t }: StartProps) {
  const [framework, setFramework] = useState<Framework>('scrum');
  const [code, setCode] = useState('');
  const board = state.leaderboard;
  const columns = {
    rank: t('leaderboard.rank'),
    team: t('leaderboard.team'),
    players: t('leaderboard.players'),
    score: t('leaderboard.score'),
    defects: t('leaderboard.defects'),
    date: t('leaderboard.date'),
  };
  const failure = state.startError;
  const codeError = failure === 'codeShape' || failure === 'room_not_found' ? t(failure === 'codeShape' ? 'error.codeShape' : 'error.room_not_found') : undefined;
  const generalError = failure !== null && codeError === undefined ? t(key(`error.${failure}`)) : null;
  return (
    <>
      {generalError !== null ? (
        <p class="lg-notice lg-notice--bad" role="alert">
          {generalError}
        </p>
      ) : null}
      <Hero
        scope="app"
        tagline={t('start.tagline')}
        frameworkLegend={t('start.frameworkLegend')}
        frameworks={[
          { value: 'scrum', label: t('start.framework.scrum') },
          { value: 'kanban', label: t('start.framework.kanban') },
        ]}
        framework={framework}
        frameworkNote={framework === 'kanban' ? t('start.kanbanSoon') : t(key(`start.framework.${framework}.line`))}
        createLabel={t('start.create')}
        createBusyLabel={t('start.creating')}
        joinTitle={t('start.joinTitle')}
        codeLabel={t('start.codeLabel')}
        codeHint={t('start.codeHint')}
        code={code}
        codeError={codeError}
        joinLabel={t('start.join')}
        joinBusyLabel={t('start.joining')}
        soloLabel={t('start.solo')}
        soloHint={t('start.soloHint')}
        busy={state.busy}
        decorative={{
          itemLabels: {
            value: t('item.label.value'),
            estimate: t('item.label.estimate'),
            workers: t('item.label.workers'),
            reviewer: t('item.label.reviewer'),
            noEstimate: t('item.label.noEstimate'),
          },
          subjects: ['payments-api', 'checkout-service', 'search-index'],
          statuses: [t('item.status.done'), t('item.status.review'), t('item.status.todo')],
          kinds: [t('item.kind.review'), t('item.kind.incident'), t('item.kind.order')],
        }}
        onFramework={(value) => setFramework(value === 'kanban' ? 'kanban' : 'scrum')}
        onCode={(value) => setCode(value.replace(/[^A-Za-z]/g, '').toUpperCase())}
        onCreate={() => void createRoom(framework)}
        onJoin={() => joinRoom(code)}
        onSolo={() => startLocal('scrum')}
      />
      <p class="lg-start-how">{t('start.how')}</p>
      {board !== null ? (
        <section class="lg-start-board" aria-labelledby="lg-board-title">
          <h2 id="lg-board-title" class="lg-section-title">
            {t('leaderboard.title')}
          </h2>
          <div class="lg-start-lower">
            <Leaderboard
              title={t(key(`leaderboard.month.${framework}`))}
              columns={columns}
              rows={rowsOf(board.month[framework] ?? [])}
              emptyLabel={t('leaderboard.empty')}
            />
            <Leaderboard
              title={t(key(`leaderboard.allTime.${framework}`))}
              columns={columns}
              rows={rowsOf(board.allTime[framework] ?? [])}
              emptyLabel={t('leaderboard.empty')}
            />
          </div>
          <p class="lg-muted lg-start-note">{t('leaderboard.note')}</p>
        </section>
      ) : null}
    </>
  );
}
