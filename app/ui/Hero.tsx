import type { ComponentChildren } from 'preact';
import { Button } from './Button.tsx';
import { Segmented, TextField } from './Field.tsx';
import { Stamp } from './Callout.tsx';
import { Icon, type IconName } from './Icon.tsx';
import { WorkItemCard } from './WorkItemCard.tsx';

export interface HeroProps {
  scope: string;
  tagline: string;
  frameworkLegend: string;
  frameworks: { value: string; label: string }[];
  framework: string;
  createLabel: string;
  joinTitle: string;
  codeLabel: string;
  codeHint: string;
  code: string;
  joinLabel: string;
  soloLabel: string;
  soloHint: string;
  decorative: {
    itemLabels: { value: string; estimate: string; workers: string; reviewer: string; noEstimate: string };
    subjects: [string, string, string];
    statuses: [string, string, string];
    kinds: [string, string, string];
  };
  frameworkNote?: string;
  codeError?: string;
  busy?: 'create' | 'join' | null;
  createBusyLabel?: string;
  joinBusyLabel?: string;
  onFramework?: (value: string) => void;
  onCode?: (value: string) => void;
  onCreate?: () => void;
  onJoin?: () => void;
  onSolo?: () => void;
}

/**
 * Start-screen hero: the name, one line of explanation, create or join by code, the solo tour and a decorative stack of cards.
 */
export function Hero({
  scope,
  tagline,
  frameworkLegend,
  frameworks,
  framework,
  createLabel,
  joinTitle,
  codeLabel,
  codeHint,
  code,
  joinLabel,
  soloLabel,
  soloHint,
  decorative,
  frameworkNote,
  codeError,
  busy = null,
  createBusyLabel,
  joinBusyLabel,
  onFramework,
  onCode,
  onCreate,
  onJoin,
  onSolo,
}: HeroProps) {
  const labels = decorative.itemLabels;
  return (
    <section class="lg-hero" aria-labelledby="lg-hero-title">
      <div class="lg-hero__copy">
        <h1 id="lg-hero-title" class="lg-hero__name" tabIndex={-1}>
          <span class="lg-hero__lg">LG</span>
          <span class="lg-hero__tm">TM</span>
        </h1>
        <p class="lg-hero__tagline">{tagline}</p>
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
          <div class="lg-hero__solo">
            <Button variant="quiet" size="md" icon="play" disabled={busy !== null} onClick={onSolo}>
              {soloLabel}
            </Button>
            <p>{soloHint}</p>
          </div>
        </div>
      </div>
      <div class="lg-hero__art" aria-hidden="true">
        <div class="lg-hero__stack">
          <WorkItemCard
            class="lg-hero__card lg-hero__card--back"
            id="#3"
            kind="order"
            kindLabel={decorative.kinds[2]}
            subject={decorative.subjects[2]}
            value={3}
            status="todo"
            statusLabel={decorative.statuses[2]}
            labels={labels}
          />
          <WorkItemCard
            class="lg-hero__card lg-hero__card--mid"
            id="#2"
            kind="incident"
            kindLabel={decorative.kinds[1]}
            subject={decorative.subjects[1]}
            value={5}
            estimate={5}
            status="review"
            statusLabel={decorative.statuses[1]}
            labels={labels}
          />
          <WorkItemCard
            class="lg-hero__card lg-hero__card--front"
            id="#1"
            kind="review"
            kindLabel={decorative.kinds[0]}
            subject={decorative.subjects[0]}
            value={8}
            estimate={8}
            status="done"
            statusLabel={decorative.statuses[0]}
            labels={labels}
            stamp={<Stamp size="md" animate />}
          />
        </div>
      </div>
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
