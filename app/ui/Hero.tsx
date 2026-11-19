import type { ComponentChildren } from 'preact';
import { Button } from './Button.tsx';
import { Segmented, TextField } from './Field.tsx';
import { Icon, type IconName } from './Icon.tsx';

export interface HeroProps {
  scope: string;
  badge: string;
  tagline: string;
  facts: string;
  note?: string;
  tourLink: string;
  frameworkLegend: string;
  frameworks: { value: string; label: string }[];
  framework: string;
  createLabel: string;
  joinTitle: string;
  codeLabel: string;
  codeHint: string;
  code: string;
  joinLabel: string;
  frameworkNote?: string;
  codeError?: string;
  busy?: 'create' | 'join' | null;
  createBusyLabel?: string;
  joinBusyLabel?: string;
  onFramework?: (value: string) => void;
  onCode?: (value: string) => void;
  onCreate?: () => void;
  onJoin?: () => void;
}

/**
 * The team zone of the start screen: the name, one line of explanation, the framework, create a room and join by code.
 */
export function Hero({
  scope,
  badge,
  tagline,
  facts,
  note,
  tourLink,
  frameworkLegend,
  frameworks,
  framework,
  createLabel,
  joinTitle,
  codeLabel,
  codeHint,
  code,
  joinLabel,
  frameworkNote,
  codeError,
  busy = null,
  createBusyLabel,
  joinBusyLabel,
  onFramework,
  onCode,
  onCreate,
  onJoin,
}: HeroProps) {
  return (
    <section class="lg-zone lg-zone--team lg-hero" aria-labelledby="lg-hero-title">
      <p class="lg-zone__badge">
        <Icon name="users" size={14} />
        <span>{badge}</span>
      </p>
      <h1 id="lg-hero-title" class="lg-hero__name" tabIndex={-1}>
        <span class="lg-hero__lg">Two</span>
        <span class="lg-hero__tm">Pizzas</span>
      </h1>
      <p class="lg-hero__tagline">{tagline}</p>
      <a class="lg-zone__link" href="#lg-tour">
        {tourLink}
      </a>
      <p class="lg-zone__facts">{facts}</p>
      <div class="lg-hero__actions">
        <div class="lg-hero__create">
          <Segmented legend={frameworkLegend} name={`${scope}-framework`} options={frameworks} value={framework} onChange={onFramework} />
          {frameworkNote ? <p class="lg-hero__note">{frameworkNote}</p> : null}
          <Button variant="primary" size="lg" icon="plus" busy={busy === 'create'} busyLabel={createBusyLabel} disabled={busy !== null} onClick={onCreate}>
            {createLabel}
          </Button>
        </div>
        <form
          class="lg-hero__join"
          onSubmit={(event) => {
            event.preventDefault();
            onJoin?.();
          }}
        >
          <h2 class="lg-hero__join-title">{joinTitle}</h2>
          <div class="lg-hero__join-row">
            <TextField id={`${scope}-code`} label={codeLabel} hint={codeHint} value={code} maxLength={5} mono uppercase error={codeError} onInput={onCode} />
            <Button variant="secondary" size="lg" type="submit" busy={busy === 'join'} busyLabel={joinBusyLabel} disabled={busy !== null}>
              {joinLabel}
            </Button>
          </div>
        </form>
      </div>
      {note ? <p class="lg-zone__note">{note}</p> : null}
    </section>
  );
}

export interface PanelProps {
  title?: string;
  icon?: IconName;
  children?: ComponentChildren;
  class?: string;
}

/**
 * Plain surface panel with an optional titled header, used to group screen sections.
 */
export function Panel({ title, icon, children, class: className }: PanelProps) {
  return (
    <section class={className ? `lg-panel ${className}` : 'lg-panel'}>
      {title ? (
        <h2 class="lg-panel__title">
          {icon ? <Icon name={icon} size={18} /> : null}
          <span>{title}</span>
        </h2>
      ) : null}
      {children}
    </section>
  );
}
