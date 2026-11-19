import { useEffect, useRef, useState } from 'preact/hooks';
import type { PlayerView } from '../../../core/index.ts';
import { dictionaries, type Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { tourFinish, tourGo, tourRefresh } from '../controller.ts';
import { key } from '../format.ts';
import { profileOf } from '../framework.ts';
import { Screen } from '../Screen.tsx';
import { QuickCheck } from '../screens/Learn.tsx';
import type { AppState } from '../store.ts';
import { stepsFor } from './steps.ts';

export interface TourProps {
  state: AppState;
  view: PlayerView;
  t: Translate;
}

const LanguageScenes: readonly string[] = ['note', 'vote', 'action'];

function useHeadingFocus(token: string) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => heading.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [token]);
  return heading;
}

function copyKey(id: string, part: string, suffix: string): string {
  const variant = `tour.${id}.${part}${suffix}`;
  return variant in dictionaries.en ? variant : `tour.${id}.${part}`;
}

function Closing({ state, view, t, last }: { state: AppState; view: PlayerView; t: Translate; last: number }) {
  const heading = useHeadingFocus(`end:${state.lang}`);
  return (
    <section class="lg-coach lg-coach--end" aria-labelledby="lg-coach-title">
      <h2 id="lg-coach-title" class="lg-coach__title" tabIndex={-1} ref={heading}>
        {t('tour.end.title')}
      </h2>
      <p>{t('tour.end.text')}</p>
      <p>{t('start.how')}</p>
      <QuickCheck view={view} t={t} slot={{ event: 'retro', iteration: 2 }} onDone={() => document.getElementById('lg-coach-title')?.focus()} />
      <div class="lg-cluster">
        <Button variant="tour" size="lg" icon="flag" onClick={tourFinish}>
          {t('summary.again')}
        </Button>
        <Button variant="secondary" size="md" onClick={() => tourGo(last)}>
          {t('tour.back')}
        </Button>
      </div>
      <p class="lg-muted lg-coach__scripted">{t('tour.scripted')}</p>
    </section>
  );
}

/**
 * The solo tour: a coach panel above the real screen of the situation each step prepared, and a closing panel after the last step.
 */
export function Tour({ state, view, t }: TourProps) {
  const steps = stepsFor(view.framework);
  const index = state.tourStep;
  const step = steps[index];
  const heading = useHeadingFocus(step === undefined ? 'end' : `${index}`);
  const first = useRef(true);
  const opened = view.workspace === null ? null : `${view.workspace.itemId}:${view.workspace.readyAt}`;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (step !== undefined && LanguageScenes.includes(step.scene)) tourRefresh();
  }, [state.lang]);
  useEffect(() => {
    if (opened === null || step === undefined || !step.task) return;
    const frame = requestAnimationFrame(() => document.querySelector('.lg-work-space')?.scrollIntoView({ block: 'nearest' }));
    return () => cancelAnimationFrame(frame);
  }, [opened]);
  const [barOpen, setBarOpen] = useState(false);
  useEffect(() => {
    setBarOpen(false);
  }, [index]);
  const coach = useRef<HTMLElement>(null);
  const [coachOn, setCoachOn] = useState(true);
  useEffect(() => {
    const node = coach.current;
    if (node === null || typeof IntersectionObserver === 'undefined') return;
    const watch = new IntersectionObserver((entries) => setCoachOn(entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0.35)), { threshold: [0, 0.35, 1] });
    watch.observe(node);
    return () => watch.disconnect();
  }, [index]);
  const done = step !== undefined && step.task && step.done(view, state.tourBaseline);
  const finished = useRef(false);
  useEffect(() => {
    finished.current = false;
  }, [index]);
  useEffect(() => {
    if (step === undefined || !step.task) return;
    const active = document.activeElement;
    const lost = active === null || active === document.body;
    if (done) {
      if (finished.current) return;
      finished.current = true;
      if (lost || document.querySelector('.lg-tour__stage')?.contains(active) === true) document.querySelector<HTMLElement>('.lg-coach__moves .lg-btn--tour')?.focus();
      return;
    }
    if (lost && step.target !== null) document.querySelector<HTMLElement>(step.target)?.focus();
  }, [view]);
  if (step === undefined) return <Closing state={state} view={view} t={t} last={steps.length - 1} />;
  const suffix = profileOf(view.framework).tourSuffix;
  const n = index + 1;
  const last = index === steps.length - 1;
  const toTask = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || event.shiftKey || !step.task || step.target === null) return;
    const target = document.querySelector<HTMLElement>(step.target);
    if (target === null) return;
    event.preventDefault();
    target.focus();
  };
  return (
    <div class={coachOn ? 'lg-tour' : 'lg-tour is-bar'} data-tour-step={step.id}>
      <section class="lg-coach" aria-labelledby="lg-coach-title" ref={coach}>
        <div class="lg-coach__body">
          <div class="lg-coach__top">
            <p class="lg-eyebrow">{t('tour.title')}</p>
            <ol class="lg-coach__dots" aria-hidden="true">
              {steps.map((own, position) => (
                <li key={own.id} class={position < index ? 'is-done' : position === index ? 'is-current' : undefined} />
              ))}
            </ol>
          </div>
          <h2 id="lg-coach-title" class="lg-coach__title" tabIndex={-1} ref={heading} onKeyDown={toTask}>
            <span class="lg-coach__count">{t('tour.step', { n, total: steps.length })}</span>
            <span class="lg-sr">. </span>
            {t(key(copyKey(step.id, 'title', suffix)))}
          </h2>
          <p class="lg-coach__text">{t(key(copyKey(step.id, 'text', suffix)))}</p>
          {step.id === 'idea' ? <p class="lg-coach__skips">{t(key(copyKey(step.id, 'skips', suffix)))}</p> : null}
          {step.task ? (
            <p class="lg-coach__task">
              <Icon name="flag" size={18} />
              <span>
                <strong>{t('tour.do')}:</strong> {t(key(copyKey(step.id, 'do', suffix)))}
              </span>
            </p>
          ) : null}
          <p class="lg-coach__done" role="status">
            {done ? (
              <>
                <Icon name="check" size={18} />
                <span>{t('tour.done')}</span>
              </>
            ) : null}
          </p>
        </div>
        <div class="lg-coach__side">
          <div class="lg-cluster lg-coach__moves lg-wide">
            {index > 0 ? (
              <Button variant="secondary" size="md" onClick={() => tourGo(index - 1)}>
                {t('tour.back')}
              </Button>
            ) : null}
            <Button variant="tour" size="md" icon="play" onClick={() => tourGo(index + 1)}>
              {last ? t('tour.finish') : t('tour.next')}
            </Button>
          </div>
          <div class="lg-coach__leave">
            <Button variant="quiet" size="md" onClick={tourFinish}>
              {t('tour.exit')}
            </Button>
          </div>
          <p class="lg-muted lg-coach__scripted">{t('tour.scripted')}</p>
        </div>
      </section>
      <div class="lg-tour__stage">
        <Screen view={view} state={state} t={t} />
      </div>
      <div class="lg-tourbar" role="group" aria-label={t('tour.title')}>
        <div class="lg-tourbar__row">
          <button type="button" class="lg-tourbar__toggle" aria-expanded={barOpen} aria-controls="lg-tourbar-more" onClick={() => setBarOpen(!barOpen)}>
            <strong>{t('tour.step', { n, total: steps.length })}</strong>
            {done ? <Icon name="check" size={16} /> : null}
            <Icon name={barOpen ? 'down' : 'up'} size={16} />
            <span class="lg-sr">{t(barOpen ? 'tour.hideTask' : 'tour.showTask')}</span>
          </button>
          <Button variant="tour" size="md" icon="play" onClick={() => tourGo(index + 1)}>
            {last ? t('tour.finish') : t('tour.next')}
          </Button>
        </div>
        {barOpen ? (
          <div id="lg-tourbar-more" class="lg-tourbar__more">
            <p>{step.task ? t(key(copyKey(step.id, 'do', suffix))) : t(key(copyKey(step.id, 'title', suffix)))}</p>
            {index > 0 ? (
              <Button variant="secondary" size="md" onClick={() => tourGo(index - 1)}>
                {t('tour.back')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
