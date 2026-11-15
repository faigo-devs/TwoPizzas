import type { Control, PlayerView } from '../../../core/index.ts';
import type { Key, Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { Panel } from '../../ui/Hero.tsx';
import { act, leave, skipAhead } from '../controller.ts';
import { facilitatorRole, key, phaseName } from '../format.ts';
import type { AppState } from '../store.ts';
import { Observations, ScriptBox, stepTitle } from './Parts.tsx';

export interface PlaceholderProps {
  view: PlayerView;
  state: AppState;
  t: Translate;
}

interface Move {
  control: Control;
  label: Key;
  send: () => void;
}

function moves(view: PlayerView): Move[] {
  const list: Move[] = [
    { control: 'end_daily', label: key(`daily.end.${view.framework}`), send: () => act({ type: 'daily.end' }) },
    { control: 'reveal_verdict', label: 'inspect.reveal', send: () => act({ type: 'inspect.reveal' }) },
    { control: 'reveal_notes', label: 'retro.reveal', send: () => act({ type: 'retro.reveal' }) },
    { control: 'advance', label: 'phase.next', send: () => act({ type: 'phase.advance' }) },
    { control: 'publish', label: 'summary.publish', send: () => act({ type: 'summary.publish' }) },
  ];
  return list.filter((move) => view.controls.includes(move.control));
}

/**
 * A plain screen for the phases that are not built yet: it names the phase, shows what the player may do and lets the game go on.
 */
export function Placeholder({ view, state, t }: PlaceholderProps) {
  const phase = view.phase;
  const local = state.mode === 'local';
  const name = phaseName(view, t);
  const title = stepTitle(view, t);
  const running = phase.kind === 'work' && phase.step === 'running';
  const summary = view.summary;
  const eyebrow =
    phase.kind === 'lobby' || phase.kind === 'summary' ? t('summary.title') : `${t(key(`iteration.${view.framework}`), { n: phase.iteration })} · ${name}`;
  return (
    <>
      <div class="lg-play-head">
        <div class="lg-play-head__title">
          <p class="lg-eyebrow">{eyebrow}</p>
          <h2 tabIndex={-1} data-lg-focus>
            {title ?? name}
          </h2>
        </div>
      </div>
      <div class="lg-plan">
        <div class="lg-stack lg-stack--lg">
          <Observations view={view} t={t} />
          <Panel title={name} icon="info">
            <p>{t('placeholder.note')}</p>
            {running ? <p class="lg-muted">{t(local ? 'placeholder.working' : 'placeholder.workingRemote')}</p> : null}
            {summary !== null ? (
              <div class="lg-sum" role="status">
                <span>{t('summary.score')}</span>
                <strong>{summary.score.total}</strong>
              </div>
            ) : null}
            <div class="lg-cluster">
              {moves(view).map((move) => (
                <Button key={move.control} variant="primary" size="md" onClick={move.send}>
                  {t(move.label)}
                </Button>
              ))}
              {local && phase.kind !== 'summary' ? (
                <Button variant="secondary" size="md" icon="play" onClick={skipAhead}>
                  {t('shell.skipAhead')}
                </Button>
              ) : null}
              {phase.kind === 'summary' ? (
                <Button variant="secondary" size="md" onClick={leave}>
                  {t('summary.again')}
                </Button>
              ) : null}
            </div>
            {local && phase.kind !== 'summary' ? <p class="lg-muted">{t('shell.skipHint')}</p> : null}
            {moves(view).length === 0 && !local && phase.kind !== 'summary' && !running ? (
              <p class="lg-muted">{t('phase.waitingFor', { role: facilitatorRole(view, t) })}</p>
            ) : null}
          </Panel>
        </div>
        <div class="lg-stack">
          <ScriptBox view={view} t={t} current={state.scriptStep} />
        </div>
      </div>
    </>
  );
}
