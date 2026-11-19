import type { Framework, LeaderboardEntry, PlayerView } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { Panel } from '../../ui/Hero.tsx';
import { Leaderboard, type LeaderboardRow } from '../../ui/Leaderboard.tsx';
import { act, refreshLeaderboard } from '../controller.ts';
import { facilitatorRoleDef, key } from '../format.ts';
import type { AppState } from '../store.ts';

function rowsOf(entries: LeaderboardEntry[]): LeaderboardRow[] {
  return entries.slice(0, 10).map((entry, index) => ({
    rank: index + 1,
    team: entry.teamName,
    players: entry.players,
    score: entry.score,
    defects: entry.escapedDefects,
    date: entry.date,
  }));
}

export interface PublicBoardProps {
  state: AppState;
  t: Translate;
  framework: Framework;
}

/**
 * The public lists for one framework: the current month and all time, or a loading or error line when the server did not answer.
 */
export function PublicBoard({ state, t, framework }: PublicBoardProps) {
  const board = state.leaderboard;
  const columns = {
    rank: t('leaderboard.rank'),
    team: t('leaderboard.team'),
    players: t('leaderboard.players'),
    score: t('leaderboard.score'),
    defects: t('leaderboard.defects'),
    date: t('leaderboard.date'),
  };
  if (board === null && state.leaderboardStatus === 'idle') return null;
  return (
    <section class="lg-start-board" aria-labelledby="lg-board-title">
      <h2 id="lg-board-title" class="lg-section-title">
        {t('leaderboard.title')}
      </h2>
      {board === null ? (
        state.leaderboardStatus === 'error' ? (
          <p class="lg-muted" role="status">
            {t('leaderboard.unavailable')}{' '}
            <button type="button" class="lg-link" onClick={refreshLeaderboard}>
              {t('leaderboard.retry')}
            </button>
          </p>
        ) : (
          <p class="lg-muted" role="status">
            {t('leaderboard.loading')}
          </p>
        )
      ) : (board.month[framework] ?? []).length === 0 && (board.allTime[framework] ?? []).length === 0 ? (
        <p class="lg-muted">{t('leaderboard.emptyState')}</p>
      ) : (
        <>
          <div class="lg-start-lower">
            <Leaderboard title={t(key(`leaderboard.month.${framework}`))} columns={columns} rows={rowsOf(board.month[framework] ?? [])} emptyLabel={t('leaderboard.empty')} />
            <Leaderboard title={t(key(`leaderboard.allTime.${framework}`))} columns={columns} rows={rowsOf(board.allTime[framework] ?? [])} emptyLabel={t('leaderboard.empty')} />
          </div>
          <p class="lg-muted lg-start-note">{t('leaderboard.note')}</p>
        </>
      )}
    </section>
  );
}

export interface PublishPanelProps {
  view: PlayerView;
  state: AppState;
  t: Translate;
}

/**
 * The facilitator's one-time "Publish result" with the generated team name; absent in local mode, where there is no leaderboard.
 */
export function PublishPanel({ view, state, t }: PublishPanelProps) {
  const summary = view.summary;
  if (state.mode !== 'remote' || summary === null) return null;
  return (
    <Panel title={t('leaderboard.title')} icon="trophy" class="lg-noprint">
      <p>
        <span class="lg-muted">{t('summary.team')}: </span>
        <strong class="lg-teamname">{view.teamName}</strong>
      </p>
      {view.controls.includes('new_team_name') ? (
        <div class="lg-cluster">
          <Button variant="secondary" size="sm" icon="switch" onClick={() => act({ type: 'lobby.new_team_name' })}>
            {t('summary.anotherName')}
          </Button>
        </div>
      ) : null}
      <p class="lg-muted">{t('summary.publishHint')}</p>
      <p class="lg-muted">{t('leaderboard.note')}</p>
      {summary.published ? (
        <p class="lg-result lg-result--good" role="status">
          {t('summary.published')}
        </p>
      ) : view.controls.includes('publish') ? (
        <div class="lg-cluster">
          <Button variant="primary" size="md" icon="trophy" onClick={() => act({ type: 'summary.publish' })}>
            {t('summary.publish')}
          </Button>
        </div>
      ) : (
        <p class="lg-muted">{t('summary.onlyFacilitator', { role: facilitatorRoleDef(view, t) })}</p>
      )}
    </Panel>
  );
}
