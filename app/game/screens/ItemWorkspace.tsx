import { useEffect, useRef, useState } from 'preact/hooks';
import { config } from '../../../core/index.ts';
import type { ItemView, PlayerView, PuzzleResponse, WorkspaceView } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { ItemWorkspace as Frame, SwitchingContext, VerdictBar } from '../../ui/Puzzle.tsx';
import { act } from '../controller.ts';
import { key, markerOf, statusText, themeOf } from '../format.ts';
import { submitLimited } from '../framework.ts';
import { useAppState, useServerNow } from '../store.ts';
import { IncidentBody } from './puzzles/Incident.tsx';
import { MergeBody } from './puzzles/Merge.tsx';
import { OrderBody } from './puzzles/Order.tsx';
import { ReviewBody } from './puzzles/Review.tsx';

export interface WorkspaceProps {
  view: PlayerView;
  workspace: WorkspaceView;
  item: ItemView;
  t: Translate;
}

function Body({ view, workspace, item, t, onResponse }: WorkspaceProps & { onResponse: (response: PuzzleResponse | null) => void }) {
  const part = workspace.part;
  if (part === null) return null;
  const readOnly = workspace.mode === 'review';
  const pair = item.workersNeeded === 2;
  const common = {
    t,
    subject: item.subject,
    readOnly,
    copyIndex: Math.max(0, item.workers.indexOf(view.selfId)),
    submission: workspace.submission,
    onResponse,
  };
  if (part.kind === 'review') return <ReviewBody part={part} {...common} />;
  if (part.kind === 'order') return <OrderBody part={part} pair={pair} {...common} />;
  if (part.kind === 'incident') return <IncidentBody part={part} pair={pair} {...common} />;
  return <MergeBody part={part} pair={pair} {...common} />;
}

function roleNote(workspace: WorkspaceView, item: ItemView, t: Translate): string {
  if (workspace.mode === 'review') return t('puzzle.role.reviewer');
  if (item.workersNeeded === 1) return t('puzzle.role.solo');
  return t(item.blocked ? 'puzzle.role.pairDependency' : 'puzzle.role.pair');
}

/**
 * The open item: the countdown of the context switch, then the player's part of the puzzle, the answer to send or the verdict to give.
 */
export function ItemWorkspace({ view, workspace, item, t }: WorkspaceProps) {
  const now = useServerNow(250);
  const says = useAppState().tourSays;
  const [response, setResponse] = useState<PuzzleResponse | null>(null);
  const waiting = workspace.part === null && now < workspace.readyAt;
  const identity = `${workspace.itemId}:${workspace.mode}:${workspace.readyAt}`;
  const waited = useRef(false);
  useEffect(() => {
    if (workspace.part === null) {
      waited.current = true;
      return;
    }
    if (!waited.current) return;
    waited.current = false;
    document.getElementById('lg-ws-title')?.focus();
  }, [identity, workspace.part === null]);
  const total = config.contextSwitchMs;
  const left = Math.max(0, workspace.readyAt - now);
  const status = markerOf(item);
  const footer = waiting ? undefined : workspace.mode === 'review' ? (
      <VerdictBar
        prompt={t('puzzle.verdict.prompt')}
        note={t('puzzle.verdict.note')}
        lgtmLabel={t('puzzle.verdict.lgtm')}
        changesLabel={t('puzzle.verdict.changes')}
        disabled={!workspace.canVerdict}
        onLgtm={() => act({ type: 'item.verdict', itemId: item.id, verdict: 'lgtm' })}
        onChanges={() => act({ type: 'item.verdict', itemId: item.id, verdict: 'changes' })}
      />
    ) : workspace.part === null ? undefined : (
      <div class="lg-ws__submit">
        <Button
          variant="primary"
          size="lg"
          icon="check"
          disabled={!workspace.canSubmit || response === null}
          onClick={() => {
            if (response !== null) act({ type: 'item.submit', itemId: item.id, response });
          }}
        >
          {t('item.submit')}
        </Button>
        {submitLimited(view) ? <p class="lg-muted">{t('work.submitLimit')}</p> : null}
      </div>
    );
  return (
    <Frame
      id={item.id}
      subject={item.subject}
      kindLabel={t(key(`item.kind.${item.kind}`))}
      status={status}
      statusLabel={statusText(item, t)}
      theme={themeOf(view, item, t).theme}
      goalTheme={themeOf(view, item, t).goalTheme}
      closeLabel={t('item.close')}
      roleNote={waiting ? undefined : roleNote(workspace, item, t)}
      footer={footer}
      onClose={() => act({ type: 'item.close' })}
    >
      {waiting ? (
        <SwitchingContext
          label={t('item.switching', { id: item.id })}
          detail={t('item.switchingDetail', { seconds: Math.round(total / 1000) })}
          remaining={t('item.switchingLeft', { seconds: Math.ceil(left / 1000) })}
          fraction={1 - left / total}
        />
      ) : workspace.part === null ? (
        <p class="lg-muted">{t('work.notAvailable')}</p>
      ) : (
        <>
          {says !== null ? (
            <aside class="lg-coach__says">
              <p>
                <strong>{t('tour.says')}</strong>
              </p>
              <ul>
                {says.clues.map((clue) => (
                  <li key={`${clue.before}>${clue.after}`}>
                    <code>{t('puzzle.order.clue', { before: clue.before, after: clue.after })}</code>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
          <Body key={identity} view={view} workspace={workspace} item={item} t={t} onResponse={setResponse} />
        </>
      )}
    </Frame>
  );
}
