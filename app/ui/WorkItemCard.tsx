import type { ComponentChildren } from 'preact';
import { Avatar, type AvatarProps } from './Avatar.tsx';
import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';
import { StatusMarker, type ItemStatus } from './Status.tsx';

export type ItemKind = 'review' | 'order' | 'incident' | 'merge';

export interface WorkItemCardProps {
  id: string;
  kind: ItemKind;
  kindLabel: string;
  subject: string;
  value: number;
  estimate?: number | null;
  status: ItemStatus;
  statusLabel: string;
  workers?: AvatarProps[];
  reviewer?: AvatarProps;
  pairSlotLabel?: string;
  note?: string;
  age?: string;
  labels: { value: string; estimate: string; workers: string; reviewer: string; noEstimate: string };
  selected?: boolean;
  openLabel?: string;
  onOpen?: () => void;
  stamp?: ComponentChildren;
  class?: string;
}

const kindGlyph: Record<ItemKind, string> = {
  review: '<>',
  order: '1→2',
  incident: '!',
  merge: '⑂',
};

/**
 * Work item rendered as a card: id, kind, subject, value, estimate, workers and reviewer, in any of its eight states.
 */
export function WorkItemCard({
  id,
  kind,
  kindLabel,
  subject,
  value,
  estimate,
  status,
  statusLabel,
  workers = [],
  reviewer,
  pairSlotLabel,
  note,
  age,
  labels,
  selected,
  openLabel,
  onOpen,
  stamp,
  class: className,
}: WorkItemCardProps) {
  const title = (
    <>
      <span class="lg-item__id">{id}</span>
      <span class="lg-item__subject">{subject}</span>
    </>
  );
  return (
    <article class={cx('lg-item', `lg-item--${status}`, selected && 'is-selected', className)} data-kind={kind}>
      <div class="lg-item__top">
        <span class="lg-item__kind">
          <span class="lg-item__glyph" aria-hidden="true">
            {kindGlyph[kind]}
          </span>
          {kindLabel}
        </span>
        <StatusMarker status={status} label={statusLabel} />
      </div>
      <h4 class="lg-item__title">
        {onOpen ? (
          <button type="button" class="lg-item__open" onClick={onOpen} aria-label={openLabel ? `${openLabel} ${id} ${subject}` : undefined}>
            {title}
          </button>
        ) : (
          title
        )}
      </h4>
      {note ? (
        <p class="lg-item__note">
          <Icon name={status === 'rejected' ? 'bug' : status === 'blocked' ? 'stop' : 'info'} size={16} />
          <span>{note}</span>
        </p>
      ) : null}
      <div class="lg-item__row">
      <dl class="lg-item__meta">
        <div>
          <dt>{labels.value}</dt>
          <dd class="lg-item__value">{value}</dd>
        </div>
        <div>
          <dt>{labels.estimate}</dt>
          <dd class={cx('lg-item__est', (estimate === null || estimate === undefined) && 'is-none')}>
            {estimate === null || estimate === undefined ? labels.noEstimate : estimate}
          </dd>
        </div>
        {age ? (
          <div>
            <dt>
              <Icon name="clock" size={13} />
              <span class="lg-sr">age</span>
            </dt>
            <dd class="lg-item__age">{age}</dd>
          </div>
        ) : null}
      </dl>
      {stamp ? <div class="lg-item__stamp">{stamp}</div> : null}
      </div>
      {workers.length || pairSlotLabel || reviewer ? (
        <div class="lg-item__people">
          {workers.length || pairSlotLabel ? (
            <div class="lg-item__group" role="group" aria-label={labels.workers}>
              {workers.map((worker) => (
                <Avatar key={worker.name} {...worker} size="sm" />
              ))}
              {pairSlotLabel ? (
                <span class="lg-item__slot">
                  <Avatar name={pairSlotLabel} empty size="sm" />
                  <span>{pairSlotLabel}</span>
                </span>
              ) : null}
            </div>
          ) : null}
          {reviewer ? (
            <div class="lg-item__group lg-item__group--reviewer" role="group" aria-label={labels.reviewer}>
              <Icon name="eye" size={15} />
              <Avatar {...reviewer} size="sm" />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
