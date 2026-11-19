import { useEffect, useRef, useState } from 'preact/hooks';
import { config, type PlayerView } from '../../core/index.ts';
import type { Translate } from '../i18n/index.ts';
import { Button } from '../ui/Button.tsx';
import { Segmented } from '../ui/Field.tsx';
import { act } from './controller.ts';
import { clockTime } from './format.ts';
import { useServerNow } from './store.ts';

const Presets = [1, 5, 10, 15].filter((minutes) => minutes >= config.pause.minMinutes && minutes <= config.pause.maxMinutes);

/**
 * A quiet Pause button in the top bar that opens a small chooser of minutes.
 */
export function PauseControl({ view, t }: { view: PlayerView; t: Translate }) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState<number>(config.pause.defaultMinutes);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
  }, [open]);
  if (!view.controls.includes('pause')) return null;
  const close = (): void => {
    setOpen(false);
    button.current?.focus();
  };
  return (
    <div
      class="lg-pause"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) close();
      }}
    >
      <button ref={button} type="button" class="lg-btn lg-btn--quiet lg-btn--sm" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        {t('pause.button')}
      </button>
      {open ? (
        <div class="lg-pause__panel" ref={panel} role="group" aria-label={t('pause.legend')}>
          <p class="lg-pause__legend" aria-hidden="true">
            {t('pause.legend')}
          </p>
          <Segmented
            legend={t('pause.legend')}
            name="pause-minutes"
            value={String(minutes)}
            onChange={(value) => setMinutes(Number(value))}
            options={Presets.map((own) => ({ value: String(own), label: t('pause.option', { minutes: own }) }))}
          />
          <div class="lg-pause__row">
            <span data-menu-close>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  act({ type: 'player.pause', minutes });
                  setOpen(false);
                }}
              >
                {t('pause.confirm')}
              </Button>
            </span>
            <Button variant="quiet" size="sm" onClick={close}>
              {t('pause.cancel')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The player's own notice while paused: time left, the time the team sees, and the way back.
 */
export function PausedBanner({ view, t }: { view: PlayerView; t: Translate }) {
  const now = useServerNow(1000);
  const self = view.players.find((player) => player.id === view.selfId);
  const root = useRef<HTMLDivElement>(null);
  const shown = self !== undefined && self.pausedUntil !== null && view.controls.includes('resume');
  useEffect(() => {
    if (shown) root.current?.querySelector('button')?.focus();
  }, [shown]);
  if (self === undefined || self.pausedUntil === null || !shown) return null;
  const ms = Math.max(0, self.pausedUntil - now);
  const left = ms < 60_000 ? t('pause.leftSeconds', { count: Math.ceil(ms / 1000) }) : t('pause.leftMinutes', { count: Math.ceil(ms / 60_000) });
  return (
    <div class="lg-pause__away" role="status" ref={root}>
      <p>{t('pause.away', { left, time: clockTime(self.pausedUntil) })}</p>
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          act({ type: 'player.resume' });
          setTimeout(() => {
            const pause = document.querySelector<HTMLElement>('.lg-pause > button');
            const target = pause !== null && pause.offsetParent !== null ? pause : document.querySelector<HTMLElement>('.lg-top__menu');
            target?.focus();
          }, 150);
        }}
      >
        {t('pause.back')}
      </Button>
    </div>
  );
}
