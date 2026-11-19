import type { ComponentChildren } from 'preact';
import { Button } from './Button.tsx';
import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

export interface PhaseRole {
  who: string;
  what: string;
}

export interface PhaseCardProps {
  eyebrow: string;
  title: string;
  purpose: string;
  purposeLabel: string;
  timebox: string;
  timeboxLabel: string;
  endsLabel: string;
  rolesLabel: string;
  roles: PhaseRole[];
  scaleNote?: string;
  note?: { label: string; text: string };
  aka?: string;
  goal?: string;
  real?: string;
  more?: { summary: string; items: { label: string; text: string }[] };
  moreLabel?: string;
  beginLabel?: string;
  waitingLabel?: string;
  canBegin?: boolean;
  onBegin?: () => void;
}

/**
 * Card that opens every phase: its purpose, timebox, who does what, and a begin button for the facilitator.
 */
export function PhaseCard({
  eyebrow,
  title,
  purpose,
  purposeLabel,
  timebox,
  timeboxLabel,
  endsLabel,
  rolesLabel,
  roles,
  scaleNote,
  note,
  aka,
  goal,
  real,
  more,
  moreLabel,
  beginLabel,
  waitingLabel,
  canBegin = false,
  onBegin,
}: PhaseCardProps) {
  return (
    <section class="lg-phase" aria-labelledby="lg-phase-title">
      <p class="lg-eyebrow">{eyebrow}</p>
      <h2 id="lg-phase-title" class="lg-phase__title" tabIndex={-1}>
        {title}
      </h2>
      {goal ? <p class="lg-phase__goal">{goal}</p> : null}
      {aka ? <p class="lg-phase__aka">{aka}</p> : null}
      <div class="lg-phase__grid">
        <div class="lg-phase__block">
          <h3 class="lg-phase__label">{purposeLabel}</h3>
          <p class="lg-phase__purpose">{purpose}</p>
        </div>
        <div class="lg-phase__block lg-phase__block--time">
          <h3 class="lg-phase__label">{timeboxLabel}</h3>
          <p class="lg-phase__time">
            <Icon name="clock" size={22} />
            <span>{timebox}</span>
          </p>
          <p class="lg-phase__ends">{endsLabel}</p>
          {real ? <p class="lg-phase__real">{real}</p> : null}
        </div>
      </div>
      <div class="lg-phase__foot">
        {canBegin && beginLabel ? (
          <Button variant="primary" size="lg" icon="play" onClick={onBegin}>
            {beginLabel}
          </Button>
        ) : (
          <p class={cx('lg-phase__wait')}>{waitingLabel}</p>
        )}
      </div>
      {note ? (
        <p class="lg-phase__scale">
          <strong>{note.label}:</strong> {note.text}
        </p>
      ) : null}
      <details class="lg-phase__more">
        <summary>{moreLabel ?? more?.summary ?? rolesLabel}</summary>
        <div class="lg-phase__roles">
          <h3 class="lg-phase__label">{rolesLabel}</h3>
          <dl class="lg-phase__list">
            {roles.map((role) => (
              <div key={role.who}>
                <dt>{role.who}</dt>
                <dd>{role.what}</dd>
              </div>
            ))}
          </dl>
        </div>
        {scaleNote ? <p class="lg-phase__scale">{scaleNote}</p> : null}
        {more ? (
          <dl>
            {more.items.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.text}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </details>
    </section>
  );
}

export interface ScriptStep {
  text: string;
}

export interface ScriptPanelProps {
  title: string;
  badge: string;
  steps: ScriptStep[];
  current: number;
  stepLabel: string;
  doneLabel: string;
  allLabel?: string;
  footer?: ComponentChildren;
}

/**
 * Facilitator script: an ordered list of steps with the current one marked and the finished ones ticked.
 */
export function ScriptPanel({ title, badge, steps, current, stepLabel, doneLabel, allLabel, footer }: ScriptPanelProps) {
  const line = steps[Math.min(current, steps.length - 1)];
  return (
    <aside class="lg-script lg-script--short" aria-label={title}>
      <p class="lg-script__line">
        <span class="lg-script__badge">{badge}</span>
        <span>{line === undefined ? '' : line.text}</span>
      </p>
      {footer ? <div class="lg-script__foot">{footer}</div> : null}
      <details class="lg-script__all">
        <summary>{allLabel ?? title}</summary>
      <ol class="lg-script__steps">
        {steps.map((step, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'next';
          return (
            <li key={index} class={cx('lg-script__step', `is-${state}`)} aria-current={state === 'current' ? 'step' : undefined}>
              <span class="lg-script__n" aria-hidden="true">
                {state === 'done' ? <Icon name="check" size={14} /> : index + 1}
              </span>
              <span class="lg-script__text">
                <span class="lg-sr">
                  {stepLabel} {index + 1}
                  {state === 'done' ? `, ${doneLabel}` : ''}:{' '}
                </span>
                {step.text}
              </span>
            </li>
          );
        })}
      </ol>
      </details>
    </aside>
  );
}
