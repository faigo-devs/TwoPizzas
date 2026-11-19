import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { cx } from './cx.ts';
import { Segmented } from './Field.tsx';

export interface TopBarProps {
  scope: string;
  home: string;
  language: string;
  languageLegend: string;
  roomCode?: string;
  roomLabel?: string;
  middle?: ComponentChildren;
  extra?: ComponentChildren;
  menuLabel?: string;
  inlineLanguage?: boolean;
  onLanguage?: (value: string) => void;
  onHome?: (event: MouseEvent) => void;
}

/**
 * Top bar with the wordmark, an optional room code and phase clock, and the language toggle.
 */
export function TopBar({ scope, home, language, languageLegend, roomCode, roomLabel, middle, extra, menuLabel, inlineLanguage, onLanguage, onHome }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>('#lg-top-tools button, #lg-top-tools input')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      menu.current?.focus();
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);
  return (
    <header class={cx('lg-top', extra ? 'lg-top--menu' : undefined, extra && inlineLanguage ? 'lg-top--lang' : undefined, open ? 'is-open' : undefined)}>
      <div class="lg-top__inner">
        <a class="lg-top__brand" href="/" aria-label={home} onClick={onHome}>
          <span class="lg-top__mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="7.5" cy="12" r="5" />
              <path d="M7.5 12V7M7.5 12l4 3" />
              <circle cx="16.5" cy="12" r="5" />
              <path d="M16.5 12V7M16.5 12l4 3" />
            </svg>
          </span>
          <span class="lg-top__word">Two Pizzas</span>
        </a>
        {roomCode ? (
          <p class="lg-top__room">
            <span class="lg-top__room-label">{roomLabel}</span>
            <code>{roomCode}</code>
          </p>
        ) : null}
        {middle ? <div class="lg-top__middle">{middle}</div> : null}
        {extra && inlineLanguage ? (
          <div class="lg-top__lang">
            <Segmented
              legend={languageLegend}
              name={`${scope}-lang-quick`}
              compact
              value={language}
              onChange={onLanguage}
              options={[
                { value: 'ro', label: 'RO' },
                { value: 'en', label: 'EN' },
              ]}
            />
          </div>
        ) : null}
        {extra ? (
          <button ref={menu} type="button" class="lg-top__menu" aria-expanded={open} aria-controls="lg-top-tools" aria-label={menuLabel} onClick={() => setOpen(!open)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        ) : null}
        <div
          class="lg-top__tools"
          id="lg-top-tools"
          onClick={(event) => {
            if ((event.target as Element).closest('[data-menu-close]') !== null) setOpen(false);
          }}
        >
          {extra}
          <Segmented
            legend={languageLegend}
            name={`${scope}-lang`}
            compact
            value={language}
            onChange={onLanguage}
            options={[
              { value: 'ro', label: 'RO' },
              { value: 'en', label: 'EN' },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
