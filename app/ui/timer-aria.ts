/**
 * How the phase clock is exposed to assistive technology: a timer role whose live region is off, so the countdown is never read out each second.
 */
export const timerAria = {
  role: 'timer',
  'aria-live': 'off',
} as const;
