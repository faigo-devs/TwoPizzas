import type { ComponentChildren } from 'preact';
import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

export interface CalloutProps {
  tone: 'good' | 'watch';
  tag: string;
  title: string;
  children?: ComponentChildren;
}

/**
 * Observation computed from the board: what went well or what to watch out for.
 */
export function Callout({ tone, tag, title, children }: CalloutProps) {
  return (
    <aside class={cx('lg-callout', `lg-callout--${tone}`)}>
      <span class="lg-callout__icon">
        <Icon name={tone === 'good' ? 'check' : 'warning'} size={18} />
      </span>
      <div class="lg-callout__body">
        <p class="lg-callout__tag">{tag}</p>
        <p class="lg-callout__title">{title}</p>
        {children ? <div class="lg-callout__text">{children}</div> : null}
      </div>
    </aside>
  );
}

export interface StampProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  caption?: string;
}

/**
 * The LGTM stamp pressed onto an item that was approved by someone who did not work on it.
 */
export function Stamp({ label = 'LGTM', size = 'md', animate = false, caption }: StampProps) {
  return (
    <span class={cx('lg-stamp', `lg-stamp--${size}`, animate && 'is-animated')} role="img" aria-label={caption ?? label}>
      <span class="lg-stamp__ring" aria-hidden="true">
        <span class="lg-stamp__label">{label}</span>
        <span class="lg-stamp__rule" />
        {caption ? <span class="lg-stamp__caption">{caption}</span> : null}
      </span>
    </span>
  );
}
