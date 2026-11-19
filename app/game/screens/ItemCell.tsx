import type { ItemView, PlayerView } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { Stamp } from '../../ui/Callout.tsx';
import { WorkItemCard } from '../../ui/WorkItemCard.tsx';
import { act } from '../controller.ts';
import { avatarOf, itemLabels, key, markerOf, named, playerName, statusText, themeOf, titleIdOf } from '../format.ts';
import { boardOf, profileOf } from '../framework.ts';
import { rightsOf } from './board.ts';

export interface ItemCellProps {
  view: PlayerView;
  item: ItemView;
  t: Translate;
  daily?: boolean;
  fresh?: boolean;
}

function noteOf(view: PlayerView, item: ItemView, t: Translate): string | undefined {
  const parts: string[] = [];
  if (item.blocked) parts.push(t('item.blocked'));
  if (item.helpPromisedBy !== null) {
    const helper = view.players.find((player) => player.id === item.helpPromisedBy);
    parts.push(helper === undefined ? t('item.helpPromised') : `${t('item.helpPromised')}: ${playerName(helper, t)}`);
  }
  if (item.status === 'doing' && item.changesRequested > 0) parts.push(t('item.label.changes', { count: item.changesRequested }));
  if (item.status === 'review' && item.reviewer === null) parts.push(t('work.waitsReviewer'));
  if (profileOf(view.framework).arrivals && item.status === 'todo' && item.arrivedAt !== null) parts.push(`${t('board.request')}. ${t('board.requestNow')}`);
  return parts.length === 0 ? undefined : parts.join('. ');
}

/**
 * One work item as a card with the actions this player may take on it right now.
 */
export function ItemCell({ view, item, t, daily = false, fresh = false }: ItemCellProps) {
  const rights = rightsOf(view, item);
  const person = (id: string) => view.players.find((player) => player.id === id);
  const workers = item.workers.flatMap((id) => {
    const found = person(id);
    return found === undefined ? [] : [avatarOf(found, view, t)];
  });
  const reviewerPlayer = item.reviewer === null ? undefined : person(item.reviewer);
  const marker = markerOf(item);
  const open = (): void => act({ type: 'item.open', itemId: item.id, mode: rights.isReviewer ? 'review' : 'work' });
  const canOpen = rights.open && !daily;
  const startLimited = item.status === 'todo' && !daily && boardOf(view)?.startBlockedByLimit === true;
  const limitId = `limit-${item.id}`;
  return (
    <div class={fresh ? 'lg-cell is-fresh' : 'lg-cell'}>
      <WorkItemCard
        id={item.id}
        kind={item.kind}
        kindLabel={t(key(`item.kind.${item.kind}`))}
        subject={item.subject}
        value={item.value}
        estimate={item.estimate}
        showEstimate={profileOf(view.framework).estimates}
        status={marker}
        statusLabel={statusText(item, t)}
        titleId={titleIdOf(item)}
        {...themeOf(view, item, t)}
        workers={workers}
        reviewer={reviewerPlayer === undefined ? undefined : avatarOf(reviewerPlayer, view, t)}
        pairSlotLabel={item.waitingForPair ? t('item.pairSlot') : undefined}
        note={noteOf(view, item, t)}
        labels={itemLabels(t)}
        selected={rights.isOpen}
        stamp={item.status === 'done' ? <Stamp size="sm" label={t('puzzle.verdict.lgtm')} /> : undefined}
      />
      <div class="lg-cell__actions">
        {rights.take || startLimited ? (
          <Button variant="primary" size="md" disabled={startLimited} label={named(t('item.take'), item)} describedBy={startLimited ? limitId : undefined} onClick={() => act({ type: 'item.take', itemId: item.id })}>
            {t('item.take')}
          </Button>
        ) : null}
        {startLimited ? (
          <p id={limitId} class="lg-cell__why">
            {t('work.startLimit', { limit: boardOf(view)?.limits.inProgress ?? 0 })}
          </p>
        ) : null}
        {rights.takeBacklog ? (
          <Button variant="secondary" size="md" label={named(t('item.take'), item)} onClick={() => act({ type: 'item.take', itemId: item.id })}>
            {t('item.take')}
          </Button>
        ) : null}
        {rights.join ? (
          <Button variant="primary" size="md" label={named(t('item.joinSecond'), item)} onClick={() => act({ type: 'item.take', itemId: item.id })}>
            {t('item.joinSecond')}
          </Button>
        ) : null}
        {rights.takeReview ? (
          <Button variant="primary" size="md" icon="eye" label={named(t('item.review'), item)} onClick={() => act({ type: 'item.take_review', itemId: item.id })}>
            {t('item.review')}
          </Button>
        ) : null}
        {canOpen ? (
          <Button variant="primary" size="md" label={named(t('item.open'), item)} onClick={open}>
            {t('item.open')}
          </Button>
        ) : null}
        {rights.promise ? (
          <Button variant="secondary" size="md" label={named(t('item.promiseHelp'), item)} onClick={() => act({ type: 'help.promise', itemId: item.id })}>
            {t('item.promiseHelp')}
          </Button>
        ) : null}
        {rights.withdraw ? (
          <Button variant="quiet" size="md" label={named(t('item.withdrawHelp'), item)} onClick={() => act({ type: 'help.withdraw', itemId: item.id })}>
            {t('item.withdrawHelp')}
          </Button>
        ) : null}
        {rights.leave ? (
          <Button variant="secondary" size="sm" label={named(t('item.leave'), item)} onClick={() => act({ type: 'item.leave', itemId: item.id })}>
            {t('item.leave')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
