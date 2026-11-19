import type { ComponentChildren } from 'preact';

export interface ActionBarProps {
  children?: ComponentChildren;
}

/**
 * The buttons that move a screen on, kept in view at the bottom of the window while the screen scrolls.
 */
export function ActionBar({ children }: ActionBarProps) {
  return <div class="lg-actionbar">{children}</div>;
}
