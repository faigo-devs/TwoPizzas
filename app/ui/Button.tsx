import type { ComponentChildren } from 'preact';
import { cx } from './cx.ts';
import { Icon, type IconName } from './Icon.tsx';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'approve';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  icon?: IconName;
  block?: boolean;
  class?: string;
  onClick?: (event: MouseEvent) => void;
  children?: ComponentChildren;
}

/**
 * Text button in five variants and three sizes, with busy and disabled states.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  busy = false,
  busyLabel,
  disabled = false,
  type = 'button',
  icon,
  block = false,
  class: className,
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      type={type}
      class={cx('lg-btn', `lg-btn--${variant}`, `lg-btn--${size}`, block && 'lg-btn--block', busy && 'is-busy', className)}
      disabled={disabled || busy}
      aria-busy={busy ? 'true' : undefined}
      onClick={onClick}
    >
      {busy ? <span class="lg-btn__spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={18} /> : null}
      <span>{busy && busyLabel ? busyLabel : children}</span>
    </button>
  );
}

export interface IconButtonProps {
  icon: IconName;
  label: string;
  variant?: 'secondary' | 'quiet' | 'primary';
  disabled?: boolean;
  pressed?: boolean;
  class?: string;
  onClick?: (event: MouseEvent) => void;
}

/**
 * Square icon-only button; the label is its accessible name and its tooltip.
 */
export function IconButton({ icon, label, variant = 'quiet', disabled, pressed, class: className, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      class={cx('lg-iconbtn', `lg-btn--${variant}`, className)}
      aria-label={label}
      title={label}
      aria-pressed={pressed === undefined ? undefined : pressed ? 'true' : 'false'}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} />
    </button>
  );
}
