import { useEffect, useRef, useState } from 'preact/hooks';
import type { PlayerView } from '../../core/index.ts';
import { identity, privacyKeys, privacyParams, sources, type Translate } from '../i18n/index.ts';
import { Button } from '../ui/Button.tsx';
import { Footer } from '../ui/Footer.tsx';
import { Panel } from '../ui/Hero.tsx';
import { Icon } from '../ui/Icon.tsx';
import { Timer } from '../ui/Timer.tsx';
import { TopBar } from '../ui/TopBar.tsx';
import { dismissToast, init, leave, setLanguage, setScriptStep, setTheme, translator } from './controller.ts';
import { formatClock, key, phaseName, screenKey } from './format.ts';
import { Card } from './screens/Card.tsx';
import { Lobby } from './screens/Lobby.tsx';
import { Placeholder } from './screens/Placeholder.tsx';
import { Plan } from './screens/Plan.tsx';
import { Start } from './screens/Start.tsx';
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

function Screen({ view, state, t }: { view: PlayerView; state: AppState; t: Translate }) {
  const phase = view.phase;
  if (phase.kind === 'lobby') return <Lobby view={view} state={state} t={t} />;
  if (phase.kind === 'summary') return <Placeholder view={view} state={state} t={t} />;
  if (phase.step === 'card') return <Card view={view} phase={phase} t={t} scriptStep={state.scriptStep} />;
  if (phase.kind === 'plan' && view.framework === 'scrum') return <Plan view={view} phase={phase} t={t} scriptStep={state.scriptStep} />;
  return <Placeholder view={view} state={state} t={t} />;
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

  useEffect(() => {
    if (previous.current === null) {
      previous.current = here;
      return;
    }
    if (previous.current === here) return;
    previous.current = here;
    setScriptStep(0);
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('#lg-phase-title, #lg-hero-title, [data-lg-focus]');
      heading?.focus();
    });
    if (view !== null) setAnnounce(t('a11y.phaseChanged', { phase: phaseName(view, t) }));
    return () => cancelAnimationFrame(frame);
  }, [here]);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => undefined);
    return unsubscribe;
  }, []);

  const inGame = state.mode !== null;
  const leaveButton = inGame ? (
    <Button
      variant="quiet"
      size="sm"
      onClick={() => {
        const started = view !== null && view.phase.kind !== 'lobby' && state.mode === 'remote';
        if (!started || window.confirm(t('shell.leaveConfirm'))) leave();
      }}
    >
      {t('shell.leave')}
    </Button>
  ) : null;
  return (
    <div class="lg-screen">
      <TopBar
        scope="app"
        home={t('a11y.home')}
        language={state.lang}
        languageLegend={t('a11y.language')}
        theme={state.theme}
        themeLegend={t('a11y.theme')}
        themeOptions={{ dark: t('a11y.theme.dark'), light: t('a11y.theme.light') }}
        roomCode={view !== null && state.mode === 'remote' ? view.code : undefined}
        roomLabel={t('a11y.room')}
        middle={view !== null ? <PhaseClock view={view} t={t} /> : undefined}
        extra={leaveButton}
        onLanguage={(value) => setLanguage(value === 'en' ? 'en' : 'ro')}
        onTheme={(value) => setTheme(value === 'light' ? 'light' : 'dark')}
      />
      <Notices state={state} t={t} />
      <main id="main" class="lg-page lg-main" tabIndex={-1}>
        {view !== null ? <Screen view={view} state={state} t={t} /> : inGame ? <Connecting state={state} t={t} /> : <Start state={state} t={t} />}
      </main>
      <Footer
        identity={identity}
        byline={t('footer.byline', { name: identity.name })}
        labels={{
          cif: t('footer.cif'),
          regCom: t('footer.regCom'),
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
