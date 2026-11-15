import { cx } from './cx.ts';

export interface AvatarProps {
  name: string;
  initials?: string;
  number?: number;
  colour?: number;
  facilitator?: boolean;
  you?: boolean;
  disconnected?: boolean;
  empty?: boolean;
  size?: 'sm' | 'md' | 'lg';
  roleLabels?: { facilitator: string; you: string; disconnected: string };
  showName?: boolean;
}

const defaultRoles = { facilitator: 'facilitator', you: 'you', disconnected: 'disconnected' };

/**
 * Round player badge with a number or initials, a colour slot, and role marks for facilitator, you and disconnected.
 */
export function Avatar({
  name,
  initials,
  number,
  colour = 0,
  facilitator,
  you,
  disconnected,
  empty,
  size = 'md',
  roleLabels = defaultRoles,
  showName = false,
}: AvatarProps) {
  const text = empty ? '?' : (initials ?? (number !== undefined ? String(number) : name.slice(0, 2).toUpperCase()));
  const roles = [facilitator ? roleLabels.facilitator : '', you ? roleLabels.you : '', disconnected ? roleLabels.disconnected : ''].filter(Boolean);
  return (
    <span class={cx('lg-avatar', `lg-avatar--${size}`, `lg-avatar--c${colour % 6}`, empty && 'is-empty', disconnected && 'is-off', you && 'is-you')}>
      <span class="lg-avatar__disc" role="img" aria-label={[name, ...roles].join(', ')}>
        <span aria-hidden="true">{text}</span>
        {facilitator ? (
          <svg class="lg-avatar__crown" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 12.5l-.8-7 3.6 3L8 3.5l3.2 5 3.6-3-.8 7z" fill="currentColor" />
          </svg>
        ) : null}
        {disconnected ? <span class="lg-avatar__off" aria-hidden="true" /> : null}
      </span>
      {showName ? (
        <span class="lg-avatar__name">
          {name}
          {you ? <span class="lg-avatar__tag"> · {roleLabels.you}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
