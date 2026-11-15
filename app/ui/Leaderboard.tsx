import { cx } from './cx.ts';

export interface LeaderboardRow {
  rank: number;
  team: string;
  players: number;
  score: number;
  defects: number;
  date: string;
  highlight?: boolean;
}

export interface LeaderboardProps {
  title: string;
  columns: { rank: string; team: string; players: string; score: string; defects: string; date: string };
  rows: LeaderboardRow[];
  emptyLabel: string;
  highlightLabel?: string;
}

/**
 * Leaderboard table: rank, generated team name, players, score, escaped defects and date.
 */
export function Leaderboard({ title, columns, rows, emptyLabel, highlightLabel }: LeaderboardProps) {
  return (
    <div class="lg-board-table">
      <table class="lg-lb">
        <caption class="lg-lb__caption">{title}</caption>
        <thead>
          <tr>
            <th scope="col" class="lg-lb__rank">
              {columns.rank}
            </th>
            <th scope="col">{columns.team}</th>
            <th scope="col" class="lg-lb__num lg-lb__opt">
              {columns.players}
            </th>
            <th scope="col" class="lg-lb__num">
              {columns.score}
            </th>
            <th scope="col" class="lg-lb__num lg-lb__opt">
              {columns.defects}
            </th>
            <th scope="col" class="lg-lb__date lg-lb__opt">
              {columns.date}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} class="lg-lb__empty">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={`${row.rank}-${row.team}`} class={cx(row.highlight && 'is-you')}>
                <td class="lg-lb__rank">
                  <span class={cx('lg-lb__medal', row.rank <= 3 && `is-top${row.rank}`)}>{row.rank}</span>
                </td>
                <th scope="row" class="lg-lb__team">
                  {row.team}
                  {row.highlight && highlightLabel ? <span class="lg-lb__you">{highlightLabel}</span> : null}
                </th>
                <td class="lg-lb__num lg-lb__opt">{row.players}</td>
                <td class="lg-lb__num lg-lb__score">{row.score}</td>
                <td class="lg-lb__num lg-lb__opt">{row.defects}</td>
                <td class="lg-lb__date lg-lb__opt">{row.date}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
