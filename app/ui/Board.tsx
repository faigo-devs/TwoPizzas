import type { ComponentChildren } from 'preact';
import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';
import type { ItemStatus } from './Status.tsx';

export interface BoardColumnProps {
  id: string;
  title: string;
  count: number;
  tone?: ItemStatus;
  wip?: number;
  enforced?: boolean;
  wipLabel?: string;
  exceededLabel?: string;
  emptyLabel?: string;
  children?: ComponentChildren;
}

/**
 * Board column with a title, an item count, an optional WIP limit and its exceeded state.
 */
export function BoardColumn({ id, title, count, tone = 'todo', wip, enforced = false, wipLabel, exceededLabel, emptyLabel, children }: BoardColumnProps) {
  const exceeded = wip !== undefined && (enforced ? count >= wip : count > wip);
  return (
    <section class={cx('lg-col', `lg-col--${tone}`, exceeded && 'is-exceeded')} aria-labelledby={`${id}-title`}>
      <header class="lg-col__head">
        <h3 id={`${id}-title`} class="lg-col__title">
          {title}
        </h3>
        <span class="lg-col__count">{count}</span>
        {wip !== undefined ? (
          <span class="lg-col__wip">
            {exceeded ? <Icon name="warning" size={14} /> : null}
            <span>
              {wipLabel ?? 'WIP limit'} {count}/{wip}
            </span>
            {exceeded && exceededLabel ? <span class="lg-sr">{exceededLabel}</span> : null}
          </span>
        ) : null}
      </header>
      {exceeded && exceededLabel ? (
        <p class="lg-col__alert" aria-hidden="true">
          {exceededLabel}
        </p>
      ) : null}
      <div class="lg-col__body">
        {count === 0 && emptyLabel ? <p class="lg-col__empty">{emptyLabel}</p> : children}
      </div>
    </section>
  );
}
