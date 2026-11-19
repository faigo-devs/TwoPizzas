import type { PlayerView } from '../../core/index.ts';
import type { Translate } from '../i18n/index.ts';
import { Card } from './screens/Card.tsx';
import { Daily } from './screens/Daily.tsx';
import { Delivery } from './screens/Delivery.tsx';
import { Inspect } from './screens/Inspect.tsx';
import { Lobby } from './screens/Lobby.tsx';
import { Plan } from './screens/Plan.tsx';
import { Replenish } from './screens/Replenish.tsx';
import { Retro } from './screens/Retro.tsx';
import { Summary } from './screens/Summary.tsx';
import { Work } from './screens/Work.tsx';
import { byFramework } from './framework.ts';
import type { AppState } from './store.ts';

export interface ScreenProps {
  view: PlayerView;
  state: AppState;
  t: Translate;
}

/**
 * The screen of the phase the view is in: the lobby, the card that opens an event, the event itself or the summary.
 */
export function Screen({ view, state, t }: ScreenProps) {
  const phase = view.phase;
  if (phase.kind === 'lobby') return <Lobby view={view} state={state} t={t} />;
  if (phase.kind === 'summary') return <Summary view={view} state={state} t={t} />;
  if (phase.step === 'card') return <Card view={view} phase={phase} t={t} scriptStep={state.scriptStep} />;
  if (phase.kind === 'plan') {
    return byFramework(view, {
      scrum: (own) => <Plan view={own} phase={phase} t={t} scriptStep={state.scriptStep} />,
      kanban: (own) => <Replenish view={own} phase={phase} t={t} scriptStep={state.scriptStep} />,
    });
  }
  if (phase.kind === 'inspect') {
    return byFramework(view, {
      scrum: (own) => <Inspect view={own} phase={phase} t={t} scriptStep={state.scriptStep} />,
      kanban: (own) => <Delivery view={own} phase={phase} t={t} scriptStep={state.scriptStep} />,
    });
  }
  if (phase.kind === 'retro') return <Retro view={view} phase={phase} t={t} scriptStep={state.scriptStep} />;
  if (phase.kind === 'work') return <Work view={view} phase={phase} t={t} scriptStep={state.scriptStep} local={state.mode === 'local'} />;
  return <Daily view={view} phase={phase} t={t} scriptStep={state.scriptStep} local={state.mode === 'local'} />;
}
