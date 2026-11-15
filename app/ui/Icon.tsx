import type { JSX } from 'preact';

export type IconName =
  | 'check'
  | 'x'
  | 'up'
  | 'down'
  | 'sun'
  | 'moon'
  | 'plus'
  | 'copy'
  | 'lock'
  | 'clock'
  | 'bug'
  | 'users'
  | 'eye'
  | 'stop'
  | 'info'
  | 'warning'
  | 'bulb'
  | 'external'
  | 'offline'
  | 'switch'
  | 'flag'
  | 'play'
  | 'vote'
  | 'diff'
  | 'link'
  | 'trophy';

const paths: Record<IconName, JSX.Element> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  up: <path d="M12 19V6M6 11.5l6-6 6 6" />,
  down: <path d="M12 5v13M6 12.5l6 6 6-6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  bug: (
    <>
      <path d="M9 8.5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z" />
      <path d="M4 12h5M15 12h5M5.5 6.5L9 9M18.5 6.5L15 9M5.5 18L9 15M18.5 18L15 15" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 19.5c.4-3.2 2.8-5 6-5s5.6 1.8 6 5" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M18 14.8c1.8.6 2.7 2.2 3 4.4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  stop: (
    <>
      <path d="M8.2 3.5h7.6l4.7 4.7v7.6l-4.7 4.7H8.2l-4.7-4.7V8.2z" />
      <path d="M8 12h8" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.2M12 7.8v.1" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.8l9 15.7H3z" />
      <path d="M12 10v4.4M12 17v.1" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 17.5h6M10 20.5h4" />
      <path d="M12 3.5a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.5z" />
    </>
  ),
  external: <path d="M14 4.5h5.5V10M19.5 4.5L11 13M17.5 14v4a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V8A1.5 1.5 0 0 1 6 6.5h4" />,
  offline: (
    <>
      <path d="M4 4l16 16" />
      <path d="M8.6 8.6A9 9 0 0 0 3 11.2M12 6.5c3 0 5.6 1.2 7.5 3M6.5 14.6a8 8 0 0 1 3.1-1.8M16 14.2a8 8 0 0 0-1-.6" />
      <path d="M12 18.5v.1" />
    </>
  ),
  switch: <path d="M4 8h13M13.5 4.5L17 8l-3.5 3.5M20 16H7M10.5 12.5L7 16l3.5 3.5" />,
  flag: <path d="M6 20.5V4M6 4.5h11l-2.2 4 2.2 4H6" />,
  play: <path d="M8 5.5v13l11-6.5z" />,
  vote: (
    <>
      <path d="M12 4l2.4 5 5.4.7-4 3.7 1 5.4L12 16.1 7.2 18.8l1-5.4-4-3.7 5.4-.7z" />
    </>
  ),
  diff: (
    <>
      <path d="M8 4v10M3.5 9H12.5" />
      <path d="M13 17.5h7.5" />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" />,
  trophy: (
    <>
      <path d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0zM7.5 6.5h-3c0 3 1.2 4.4 3.4 4.8M16.5 6.5h3c0 3-1.2 4.4-3.4 4.8" />
      <path d="M12 14v3.5M8.5 20h7M9.5 17.5h5" />
    </>
  ),
};

export interface IconProps {
  name: IconName;
  size?: number;
  class?: string;
}

/**
 * Inline SVG icon drawn with the current text colour; always decorative.
 */
export function Icon({ name, size = 20, class: className }: IconProps) {
  return (
    <svg
      class={className ? `lg-icon ${className}` : 'lg-icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
