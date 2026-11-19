import { useEffect, useRef, useState } from 'preact/hooks';
import type { ItemView, PlayerView, WipLimits } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Icon } from '../../ui/Icon.tsx';
import { formatClock } from '../format.ts';
import { boardOf } from '../framework.ts';
import { useServerNow } from '../store.ts';

const FreshMs = 12_000;

export interface Arrivals {
  fresh: ReadonlySet<string>;
  latest: ItemView | null;
}

/**
 * Notices requests that arrive while the board is open: the ids stay marked for a few seconds and nothing takes focus.
 */
export function useArrivals(view: PlayerView): Arrivals {
  const seen = useRef<Set<string> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  useEffect(() => {
    const arrived = view.items.filter((item) => item.arrivedAt !== null).map((item) => item.id);
    if (seen.current === null) {
      seen.current = new Set(arrived);
      return;
    }
    const known = seen.current;
    const added = arrived.filter((id) => !known.has(id));
    if (added.length === 0) return;
    for (const id of added) known.add(id);
    setFresh(added);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFresh([]), FreshMs);
  }, [view.items]);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  const latestId = fresh[fresh.length - 1];
  return {
    fresh: new Set(fresh),
    latest: latestId === undefined ? null : (view.items.find((item) => item.id === latestId) ?? null),
  };
}

/**
 * The limits of both columns as one line, with "none" for a column that has no limit.
 */
export function limitsLine(limits: WipLimits, t: Translate): string {
  const text = (limit: number | null): string => (limit === null ? t('limits.off') : String(limit));
  return t('limits.summary', { inProgress: text(limits.inProgress), review: text(limits.review) });
}

function ArrivalClock({ view, t }: { view: PlayerView; t: Translate }) {
  const now = useServerNow(1000);
  const kanban = boardOf(view);
  if (kanban === null) return null;
  const arrived = kanban.arrivalsTotal - kanban.arrivalsLeft;
  const running = view.phase.kind === 'work' && view.phase.step === 'running';
  let next: string | null = null;
  if (kanban.arrivalsLeft === 0) next = t('board.arrivalsDone');
  else if (running && kanban.nextArrivalAt !== null) next = t('board.nextRequest', { time: formatClock(Math.max(0, kanban.nextArrivalAt - now)) });
  else if (view.phase.kind === 'daily') next = t('board.arrivalsPaused');
  return (
    <>
      <span>{t('board.arrivals', { arrived, total: kanban.arrivalsTotal })}</span>
      {next === null ? null : <span>{next}</span>}
    </>
  );
}

export interface FlowBarProps {
  view: PlayerView;
  t: Translate;
  arrivals?: Arrivals;
  showArrivals?: boolean;
}

/**
 * The Kanban strip above the board: the limits in force, how many requests have arrived and when the next one is due.
 */
export function FlowBar({ view, t, arrivals, showArrivals = true }: FlowBarProps) {
  const kanban = boardOf(view);
  if (kanban === null) return null;
  const limits = kanban.limits;
  const none = limits.inProgress === null && limits.review === null;
  const latest = arrivals?.latest ?? null;
  return (
    <section class="lg-flowbar" aria-label={t('board.flowTitle')}>
      <p class="lg-flowbar__row">
        <Icon name="flag" size={16} />
        <strong>{t('limits.title')}:</strong>
        <span>{none ? t(view.iteration === 2 ? 'board.noLimitsSet' : 'board.noLimits') : limitsLine(limits, t)}</span>
      </p>
      {showArrivals ? (
        <p class="lg-flowbar__row">
          <Icon name="clock" size={16} />
          <ArrivalClock view={view} t={t} />
        </p>
      ) : null}
      <p class="lg-flowbar__new" role="status" aria-live="polite">
        {latest === null ? null : (
          <>
            <Icon name="plus" size={16} />
            <span>{t('board.arrived', { item: `${latest.id} ${latest.subject}` })}</span>
          </>
        )}
      </p>
    </section>
  );
}
