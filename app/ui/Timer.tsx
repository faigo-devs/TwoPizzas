import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

export interface TimerProps {
  label: string;
  time: string;
  fraction: number;
  hard: boolean;
  overtime?: boolean;
  hardLabel: string;
  softLabel: string;
  overtimeLabel: string;
  lastFifthLabel: string;
}

/**
 * Phase clock: digits, a bar for what remains, and distinct states for the last fifth and for overtime of a soft timebox.
 */
export function Timer({ label, time, fraction, hard, overtime = false, hardLabel, softLabel, overtimeLabel, lastFifthLabel }: TimerProps) {
  const last = !overtime && fraction <= 0.2;
  const width = overtime ? 100 : Math.max(0, Math.min(1, fraction)) * 100;
  const state = overtime ? overtimeLabel : last ? lastFifthLabel : hard ? hardLabel : softLabel;
  return (
    <div class={cx('lg-timer', hard ? 'lg-timer--hard' : 'lg-timer--soft', last && 'is-last', overtime && 'is-over')} role="timer" aria-label={label}>
      <div class="lg-timer__row">
        <span class="lg-timer__icon">
          <Icon name={overtime ? 'warning' : hard ? 'lock' : 'clock'} size={16} />
        </span>
        <span class="lg-timer__time">
          {overtime ? '+' : ''}
          {time}
        </span>
        <span class="lg-timer__state">{state}</span>
      </div>
      <div class="lg-timer__bar" aria-hidden="true">
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
