import { useEffect, useRef, useState } from 'preact/hooks';
import type { PlayerView } from '../../core/index.ts';
import { privacyKeys, privacyParams, sources, type Translate } from '../i18n/index.ts';
import { Button } from '../ui/Button.tsx';
import { Footer } from '../ui/Footer.tsx';
import { Panel } from '../ui/Hero.tsx';
import { ConfirmAction } from '../ui/Confirm.tsx';
import { Icon } from '../ui/Icon.tsx';
import { Timer } from '../ui/Timer.tsx';
import { TopBar } from '../ui/TopBar.tsx';
import { dismissToast, init, leave, setLanguage, setScriptStep, takeSeatHere, translator } from './controller.ts';
import { successorOf, trailOf, type FocusTrail } from './focus.ts';
import { formatClock, key, phaseName, screenKey } from './format.ts';
import { PausedBanner, PauseControl } from './PauseControl.tsx';
import { Screen } from './Screen.tsx';
import { Start } from './screens/Start.tsx';
import { Tour } from './tour/Tour.tsx';
import { store, useAppState, useServerNow, type AppState } from './store.ts';

function PhaseClock({ view, t }: { view: PlayerView; t: Translate }) {
  const now = useServerNow(500);
  const phase = view.phase;
  if (phase.kind === 'lobby' || phase.kind === 'summary') return null;
  const box = phase.timebox;
  if (box.startedAt === null || box.deadline === null) return null;
  const remaining = box.deadline - now;
  const over = !box.hard && remaining < 0;
  const shown = over ? -remaining : Math.max(0, remaining);
  return (
    <Timer
      label={t('timer.label')}
      time={formatClock(shown)}
      fraction={Math.max(0, remaining) / box.durationMs}
      hard={box.hard}
      overtime={over}
      hardLabel={t('timer.hard')}
      softLabel={t('timer.soft')}
      overtimeLabel={t('timer.overtime')}
      lastFifthLabel={t('timer.lastFifth')}
    />
  );
}

function Notices({ state, t }: { state: AppState; t: Translate }) {
  const lost = state.status === 'reconnecting' || state.status === 'connecting';
  const joining = state.mode === 'remote' && state.view === null;
  return (
    <div class="lg-banners" role="status" aria-live="polite" aria-label={t('a11y.messages')}>
      {state.mode === 'local' ? (
        <p class="lg-notice lg-notice--info">
          <Icon name="info" size={16} />
          <span>{t('shell.local')}</span>
        </p>
      ) : null}
      {state.mode === 'remote' && state.view !== null && lost ? (
        <p class="lg-notice lg-notice--bad">
          <Icon name="offline" size={16} />
          <span>{t('error.connectionLost')}</span>
        </p>
      ) : null}
      {state.connectionNote === 'back' && !lost ? (
        <p class="lg-notice lg-notice--good">
          <Icon name="check" size={16} />
          <span>{t('error.connectionBack')}</span>
        </p>
      ) : null}
      {state.said !== null && state.mode !== 'tour' ? (
        <p class="lg-notice lg-notice--good">
          <Icon name="check" size={16} />
          <span>{t('work.sent')}</span>
        </p>
      ) : null}
      {joining ? <span class="lg-sr">{t('shell.connecting')}</span> : null}
    </div>
  );
}

function Toast({ state, t }: { state: AppState; t: Translate }) {
  const toast = state.toast;
  useEffect(() => {
    if (toast === null) return;
    const id = setTimeout(dismissToast, 7000);
    return () => clearTimeout(id);
  }, [toast?.id]);
  if (toast === null) return null;
  return (
    <div class="lg-toast" role="alert">
      <Icon name="warning" size={18} />
      <p>{t(key(`error.${toast.code}`))}</p>
      <Button variant="quiet" size="sm" onClick={dismissToast}>
        {t('common.close')}
      </Button>
    </div>
  );
}

function Connecting({ state, t }: { state: AppState; t: Translate }) {
  return (
    <Panel title={t('shell.connecting')} icon="link">
      <p class="lg-muted" role="status">
        {state.status === 'reconnecting' ? t('error.connectionLost') : t('shell.connecting')}
      </p>
      <div class="lg-cluster">
        <Button variant="secondary" size="md" onClick={leave}>
          {t('shell.leave')}
        </Button>
      </div>
    </Panel>
  );
}

function Elsewhere({ t }: { t: Translate }) {
  return (
    <Panel title={t('shell.elsewhereTitle')} icon="link">
      <p class="lg-muted" role="status">
        {t('shell.elsewhereBody')}
      </p>
      <div class="lg-cluster">
        <Button variant="primary" size="md" onClick={takeSeatHere}>
          {t('shell.elsewhereTake')}
        </Button>
        <Button variant="secondary" size="md" onClick={leave}>
          {t('shell.leave')}
        </Button>
      </div>
    </Panel>
  );
}

/**
 * The whole application: the shell around the start screen or the screen of the phase the room is in.
 */
export function App() {
  const state = useAppState();
  const t = translator(state.lang);
  const view = state.view;
  const here = view === null ? 'start' : screenKey(view.phase);
  const previous = useRef<string | null>(null);
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    init();
  }, []);

  const lastFocus = useRef<Element | null>(null);
  const trail = useRef<FocusTrail | null>(null);
  useEffect(() => {
    const remember = (event: FocusEvent): void => {
      lastFocus.current = event.target as Element;
      trail.current = trailOf(event.target as Element);
    };
    document.addEventListener('focusin', remember);
    return () => document.removeEventListener('focusin', remember);
  }, []);

  useEffect(() => {
    if (state.mode === 'tour' || view === null) return;
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      const lost = active === null || active === document.body;
      const gone = lastFocus.current !== null && !lastFocus.current.isConnected;
      if (!lost || !gone) return;
      const successor = trail.current === null ? null : successorOf(trail.current);
      if (successor !== null) {
        successor.focus();
        return;
      }
      for (const selector of ['.lg-next .lg-btn', '#lg-next-title', '#lg-ws-title', '[data-lg-focus]', '#lg-phase-title']) {
        const target = document.querySelector<HTMLElement>(selector);
        if (target !== null) {
          lastFocus.current = target;
          target.focus();
          return;
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [state.view]);

  useEffect(() => {
    if (previous.current === null) {
      previous.current = here;
      return;
    }
    if (previous.current === here) return;
    previous.current = here;
    if (state.mode === 'tour') return;
    setScriptStep(0);
    const frame = requestAnimationFrame(() => {
      const create = store.get().startFocus ? document.querySelector<HTMLElement>('.lg-hero__create .lg-btn--primary') : null;
      const heading = create ?? document.querySelector<HTMLElement>('#lg-phase-title, #lg-hero-title, [data-lg-focus]');
      if (create !== null) store.set({ startFocus: false });
      heading?.focus();
    });
    if (view !== null) setAnnounce(t('a11y.phaseChanged', { phase: phaseName(view, t) }));
    return () => cancelAnimationFrame(frame);
  }, [here]);

  const inGame = state.mode !== null;
  const touring = state.mode === 'tour';
  const leaveButton = inGame && !touring ? (
    view !== null && view.phase.kind !== 'lobby' ? (
      <ConfirmAction variant="quiet" size="sm" label={t('shell.leave')} prompt={t('shell.leaveConfirm')} confirmLabel={t('shell.leaveYes')} cancelLabel={t('common.cancel')} onConfirm={leave} />
    ) : (
      <Button variant="quiet" size="sm" onClick={leave}>
        {t('shell.leave')}
      </Button>
    )
  ) : null;
  return (
    <div class="lg-screen">
      <TopBar
        scope="app"
        home={t('a11y.home')}
        language={state.lang}
        languageLegend={t('a11y.language')}
        roomCode={view !== null && state.mode === 'remote' ? view.code : undefined}
        roomLabel={t('a11y.room')}
        middle={view !== null && !touring ? <PhaseClock view={view} t={t} /> : undefined}
        extra={
          inGame && !touring ? (
            <>
              {view !== null ? <PauseControl view={view} t={t} /> : null}
              {leaveButton}
            </>
          ) : undefined
        }
        menuLabel={t('shell.menu')}
        inlineLanguage={view === null || view.phase.kind === 'lobby'}
        onLanguage={(value) => setLanguage(value === 'en' ? 'en' : 'ro')}
      />
      <Notices state={state} t={t} />
      <main id="main" class="lg-page lg-main" tabIndex={-1}>
        {view !== null && !touring ? <PausedBanner view={view} t={t} /> : null}
        {state.status === 'elsewhere' ? <Elsewhere t={t} /> : view !== null ? touring ? <Tour view={view} state={state} t={t} /> : <Screen view={view} state={state} t={t} /> : inGame ? <Connecting state={state} t={t} /> : <Start state={state} t={t} />}
      </main>
      <Footer
        labels={{
          privacySummary: t('privacy.summary'),
          privacy: privacyKeys.map((privacyKey) => t(privacyKey, privacyParams)),
          linksTitle: t('footer.linksTitle'),
          newTab: t('footer.newTab'),
        }}
        links={sources.map((source) => ({ label: source.title[state.lang], href: source.href[state.lang] }))}
      />
      <Toast state={state} t={t} />
      <p class="lg-sr" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
