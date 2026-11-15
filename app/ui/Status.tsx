import type { JSX } from 'preact';
import { cx } from './cx.ts';

export type ItemStatus = 'todo' | 'waiting' | 'doing' | 'blocked' | 'review' | 'done' | 'accepted' | 'rejected';

export interface StatusMarkerProps {
  status: ItemStatus;
  label: string;
  iconOnly?: boolean;
  class?: string;
}

const cut = 'var(--lg-marker-cut)';

const shapes: Record<ItemStatus, JSX.Element> = {
  todo: <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" stroke-width="1.8" />,
  waiting: <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.4 2.2" />,
  doing: (
    <>
      <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" stroke-width="1.8" />
      <path d="M8 4.2a3.8 3.8 0 0 1 0 7.6z" fill="currentColor" />
    </>
  ),
  blocked: (
    <>
      <path d="M5.2 1.8h5.6l3.4 3.4v5.6l-3.4 3.4H5.2l-3.4-3.4V5.2z" fill="currentColor" />
      <path d="M5 8h6" stroke={cut} stroke-width="1.8" stroke-linecap="round" />
    </>
  ),
  review: (
    <>
      <path d="M8 1.6l6.2 6.4L8 14.4 1.8 8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
      <circle cx="8" cy="8" r="1.7" fill="currentColor" />
    </>
  ),
  done: (
    <>
      <circle cx="8" cy="8" r="6.2" fill="currentColor" />
      <path d="M5 8.2l2.2 2.2L11 6" fill="none" stroke={cut} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </>
  ),
  accepted: (
    <>
      <circle cx="8" cy="8" r="6.8" fill="none" stroke="currentColor" stroke-width="1.3" />
      <circle cx="8" cy="8" r="4.6" fill="currentColor" />
      <path d="M5.9 8.1l1.5 1.5 2.7-3" fill="none" stroke={cut} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </>
  ),
  rejected: (
    <>
      <path d="M8 1.4l6.6 11.8H1.4z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
      <path d="M8 6v3.2M8 11.2v.1" stroke={cut} stroke-width="1.7" stroke-linecap="round" />
    </>
  ),
};

/**
 * Status shape plus label; every status has its own shape so colour is never the only signal.
 */
export function StatusMarker({ status, label, iconOnly = false, class: className }: StatusMarkerProps) {
  return (
    <span class={cx('lg-status', `lg-status--${status}`, className)} title={iconOnly ? label : undefined}>
      <svg class="lg-status__shape" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {shapes[status]}
      </svg>
      <span class={iconOnly ? 'lg-sr' : 'lg-status__label'}>{label}</span>
    </span>
  );
}
