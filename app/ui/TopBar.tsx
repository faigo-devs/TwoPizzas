import type { ComponentChildren } from 'preact';
import { Segmented } from './Field.tsx';

export interface TopBarProps {
  scope: string;
  home: string;
  language: string;
  languageLegend: string;
  theme: string;
  themeLegend: string;
  themeOptions: { dark: string; light: string };
  roomCode?: string;
  roomLabel?: string;
  middle?: ComponentChildren;
  extra?: ComponentChildren;
  onLanguage?: (value: string) => void;
  onTheme?: (value: string) => void;
  onHome?: (event: MouseEvent) => void;
}

/**
 * Top bar with the wordmark, an optional room code and phase clock, and the language and theme toggles.
 */
export function TopBar({ scope, home, language, languageLegend, theme, themeLegend, themeOptions, roomCode, roomLabel, middle, extra, onLanguage, onTheme, onHome }: TopBarProps) {
  return (
    <header class="lg-top">
      <div class="lg-top__inner">
        <a class="lg-top__brand" href="/" aria-label={home} onClick={onHome}>
          <span class="lg-top__mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          </span>
          <span class="lg-top__word">LGTM</span>
        </a>
        {roomCode ? (
          <p class="lg-top__room">
            <span class="lg-top__room-label">{roomLabel}</span>
            <code>{roomCode}</code>
          </p>
        ) : null}
        {middle ? <div class="lg-top__middle">{middle}</div> : null}
        <div class="lg-top__tools">
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
          <Segmented
            legend={themeLegend}
            name={`${scope}-theme`}
            compact
            value={theme}
            onChange={onTheme}
            options={[
              { value: 'dark', label: themeOptions.dark, icon: 'moon', hideLabel: true },
              { value: 'light', label: themeOptions.light, icon: 'sun', hideLabel: true },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
