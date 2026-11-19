import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { config } from '../../../core/index.ts';
import type { Agreement, AgreementType, PlayerView, RetroColumn, RetroNoteView, RetroPhase } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { ActionBar } from '../../ui/ActionBar.tsx';
import { Button } from '../../ui/Button.tsx';
import { Segmented, TextField } from '../../ui/Field.tsx';
import { Panel } from '../../ui/Hero.tsx';
import { Icon, type IconName } from '../../ui/Icon.tsx';
import { RetroNote, type RetroColumnKind } from '../../ui/Retro.tsx';
import { act } from '../controller.ts';
import { facilitatorRoleDef, key } from '../format.ts';
import { Observations, ScriptBox } from './Parts.tsx';
import { RetroHelp } from './RetroHelp.tsx';
import { agreementMeaning, agreementName, Comparison, ScreenHead, StepMove } from './ReviewParts.tsx';
import { profileOf } from '../framework.ts';

export interface RetroProps {
  view: PlayerView;
  phase: RetroPhase;
  t: Translate;
  scriptStep: number;
}

const Columns: { column: RetroColumn; kind: RetroColumnKind; icon: IconName }[] = [
  { column: 'went_well', kind: 'well', icon: 'check' },
  { column: 'slowed_us', kind: 'slow', icon: 'stop' },
  { column: 'try', kind: 'try', icon: 'bulb' },
];

function Board({ view, t, children }: { view: PlayerView; t: Translate; children: (column: RetroColumn, kind: RetroColumnKind, notes: RetroNoteView[]) => ComponentChildren }) {
  const retro = view.retro;
  if (retro === null) return null;
  return (
    <div class="lg-retro">
      {Columns.map(({ column, kind, icon }) => (
        <section key={column} class={`lg-retro__col lg-retro__col--${kind}`} aria-labelledby={`lg-col-${column}`}>
          <h3 id={`lg-col-${column}`} class="lg-retro__head">
            <Icon name={icon} size={18} />
            <span>{t(key(`retro.column.${column}`))}</span>
          </h3>
          <ul class="lg-retro__notes">{children(column, kind, retro.notes.filter((note) => note.column === column))}</ul>
        </section>
      ))}
    </div>
  );
}

function HiddenNotes({ view, column, kind, t }: { view: PlayerView; column: RetroColumn; kind: RetroColumnKind; t: Translate }) {
  const count = view.retro?.hiddenCounts[column] ?? 0;
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <RetroNote key={`hidden-${index}`} text="" column={kind} votes={0} hidden hiddenLabel={t('retro.hidden')} voteLabel="" votesLabel="" />
      ))}
    </>
  );
}

function NotesStep({ view, t }: { view: PlayerView; t: Translate }) {
  const [draft, setDraft] = useState('');
  const [column, setColumn] = useState<RetroColumn>('went_well');
  const [editing, setEditing] = useState<string | null>(null);
  const retro = view.retro;
  if (retro === null) return null;
  const mine = retro.notes.filter((note) => note.mine);
  const full = editing === null && mine.length >= config.retro.notesPerPlayerMax;
  const text = draft.trim();
  const reset = () => {
    setDraft('');
    setEditing(null);
  };
  const submit = () => {
    if (text.length === 0) return;
    if (editing !== null) act({ type: 'retro.note_edit', noteId: editing, text });
    else act({ type: 'retro.note_add', column, text });
    reset();
    requestAnimationFrame(() => document.getElementById('retro-note')?.focus());
  };
  const hiddenTotal = Object.values(retro.hiddenCounts).reduce((sum, count) => sum + count, 0);
  return (
    <div class="lg-stack lg-stack--lg">
      <Panel>
        <form
          class="lg-stack"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {editing === null ? (
            <div class="lg-colpick">
              <Segmented
                legend={t('retro.columnLegend')}
                name="retro-column"
                value={column}
                options={Columns.map((entry) => ({ value: entry.column, label: t(key(`retro.column.${entry.column}`)), icon: entry.icon }))}
                onChange={(value) => setColumn(value as RetroColumn)}
              />
            </div>
          ) : null}
          <TextField
            id="retro-note"
            label={t('retro.noteLabel')}
            hint={t('retro.noteHint', { max: config.retro.noteMax })}
            value={draft}
            maxLength={config.retro.noteMax}
            multiline
            rows={2}
            onInput={setDraft}
          />
          {editing === null ? (
            <RetroHelp
              view={view}
              t={t}
              onUse={(proposal, proposed) => {
                setEditing(null);
                setDraft(proposal.slice(0, config.retro.noteMax));
                setColumn(proposed);
              }}
            />
          ) : null}
          <div class="lg-cluster">
            <Button type="submit" variant="primary" size="md" icon={editing === null ? 'plus' : 'check'} disabled={text.length === 0 || full}>
              {editing === null ? t('retro.noteAdd') : t('retro.noteSave')}
            </Button>
            {editing !== null ? (
              <Button variant="quiet" size="md" onClick={reset}>
                {t('common.cancel')}
              </Button>
            ) : null}
          </div>
          {full ? <p class="lg-muted">{t('retro.noteLimit', { max: config.retro.notesPerPlayerMax })}</p> : null}
        </form>
      </Panel>
      <Board view={view} t={t}>
        {(columnId, kind, notes) => (
          <>
            {notes.map((note) => (
              <li key={note.id} class={`lg-note lg-note--${kind} is-mine`}>
                <p id={`lg-note-${note.id}`} class="lg-note__text">
                  {note.text}
                </p>
                <div class="lg-note__foot">
                  <Button
                    variant="quiet"
                    size="sm"
                    label={`${t('retro.noteEdit')}: ${note.text.slice(0, 60)}`}
                    onClick={() => {
                      setEditing(note.id);
                      setDraft(note.text);
                      requestAnimationFrame(() => document.getElementById('retro-note')?.focus());
                    }}
                  >
                    {t('retro.noteEdit')}
                  </Button>
                  <Button variant="quiet" size="sm" label={`${t('retro.noteRemove')}: ${note.text.slice(0, 60)}`} onClick={() => act({ type: 'retro.note_remove', noteId: note.id })}>
                    {t('retro.noteRemove')}
                  </Button>
                </div>
              </li>
            ))}
            <HiddenNotes view={view} column={columnId} kind={kind} t={t} />
          </>
        )}
      </Board>
      <p class="lg-muted" role="status">
        {t('retro.hiddenCount', { count: hiddenTotal })}
      </p>
      <div class="lg-cluster">
        {view.controls.includes('reveal_notes') ? (
          <ActionBar>
            <Button variant="primary" size="lg" icon="eye" onClick={() => act({ type: 'retro.reveal' })}>
              {t('retro.reveal')}
            </Button>
          </ActionBar>
        ) : view.facilitatorId !== view.selfId ? (
          <p class="lg-muted">{t('phase.waitingFor', { role: facilitatorRoleDef(view, t) })}</p>
        ) : null}
      </div>
    </div>
  );
}

function VoteBoard({ view, t, readOnly }: { view: PlayerView; t: Translate; readOnly?: boolean }) {
  const retro = view.retro;
  if (retro === null) return null;
  return (
    <Board view={view} t={t}>
      {(_column, kind, notes) =>
        notes.map((note) => {
          if (readOnly === true) {
            return (
              <li key={note.id} class={`lg-note lg-note--${kind}${note.mine ? ' is-mine' : ''}`}>
                <p class="lg-note__text">{note.text}</p>
                <span class="lg-note__votes">
                  <Icon name="vote" size={14} />
                  <span>{note.votes ?? 0}</span>
                  <span class="lg-sr">{t('retro.votesUnit', { count: note.votes ?? 0 })}</span>
                </span>
              </li>
            );
          }
          const voted = retro.myVotes.includes(note.id);
          return (
            <RetroNote
              key={note.id}
              text={note.text}
              column={kind}
              votes={note.votes ?? 0}
              voted={voted}
              mine={note.mine}
              noteId={note.id}
              hiddenLabel={t('retro.hidden')}
              voteLabel={voted ? t('retro.unvote') : t('retro.vote')}
              votesLabel={t('retro.votesUnit', { count: note.votes ?? 0 })}
              voteDisabled={retro.votesLeft === 0}
              onVote={() => act(voted ? { type: 'retro.unvote', noteId: note.id } : { type: 'retro.vote', noteId: note.id })}
            />
          );
        })
      }
    </Board>
  );
}

function VoteStep({ view, t }: { view: PlayerView; t: Translate }) {
  const retro = view.retro;
  if (retro === null) return null;
  return (
    <div class="lg-stack lg-stack--lg">
      <p class="lg-counter" role="status">
        {t('retro.votesLeft', { count: retro.votesLeft })}
      </p>
      <VoteBoard view={view} t={t} />
      <StepMove view={view} t={t} />
    </div>
  );
}

function PreviousStep({ view, t }: { view: PlayerView; t: Translate }) {
  const previous = view.retro?.previous ?? null;
  return (
    <div class="lg-stack lg-stack--lg">
      <Panel title={t('retro.previous.title')} icon="flag">
        {previous === null ? (
          <p>{t('retro.previous.none')}</p>
        ) : (
          <>
            <p class="lg-agreement">
              <strong>{agreementName(previous.agreement, t)}</strong>
              <span>{agreementMeaning(previous.agreement, t)}</span>
            </p>
            <p class={previous.kept === true ? 'lg-result lg-result--good' : previous.kept === false ? 'lg-result lg-result--bad' : 'lg-result'} role="status">
              <Icon name={previous.kept === true ? 'check' : previous.kept === false ? 'warning' : 'info'} size={18} />
              <span>{previous.kept === true ? t('retro.previous.kept') : previous.kept === false ? t('retro.previous.broken', { count: previous.violations ?? 0 }) : t('retro.previous.free')}</span>
            </p>
          </>
        )}
        <StepMove view={view} t={t} />
      </Panel>
      <Comparison metrics={view.metrics} view={view} t={t} />
    </div>
  );
}

function draftAgreement(type: AgreementType, max: number, text: string): Agreement | null {
  if (type === 'wip_limit') return { type, max };
  if (type === 'review_wait') return { type, maxMs: config.agreements.reviewWaitMs };
  if (type === 'free') return text.trim().length > 0 ? { type, text: text.trim() } : null;
  if (type === 'no_new_while_blocked' || type === 'pair_first' || type === 'wip_limits_set') return { type };
  return null;
}

function ActionStep({ view, t }: { view: PlayerView; t: Translate }) {
  const retro = view.retro;
  const [type, setType] = useState<AgreementType | null>(null);
  const [max, setMax] = useState<number>(Math.min(config.agreements.wipLimitMax, Math.max(config.agreements.wipLimitMin, 2)));
  const [text, setText] = useState('');
  if (retro === null) return null;
  const canChoose = view.controls.includes('choose_action');
  const draft = type === null ? null : draftAgreement(type, max, text);
  const sizes = Array.from({ length: config.agreements.wipLimitMax - config.agreements.wipLimitMin + 1 }, (_, index) => config.agreements.wipLimitMin + index);
  return (
    <div class="lg-stack lg-stack--lg">
      <Panel title={t('retro.action.title')} icon="flag">
        <p class="lg-muted">{t('retro.action.hint')}</p>
        {retro.action !== null ? (
          <p class="lg-agreement lg-agreement--chosen" role="status">
            <span class="lg-eyebrow">{t('retro.action.chosen')}</span>
            <strong>{agreementName(retro.action, t)}</strong>
            <span>{agreementMeaning(retro.action, t)}</span>
          </p>
        ) : null}
        {canChoose ? (
          <fieldset class="lg-choices">
            <legend class="lg-sr">{t('retro.action.title')}</legend>
            {retro.suggestedAgreements.map((option, index) => {
              const sample = draftAgreement(option, max, text);
              return (
                <label key={option} class={`lg-choice${type === option ? ' is-checked' : ''}`}>
                  <input type="radio" name="retro-action" value={option} checked={type === option} onChange={() => setType(option)} />
                  <span class="lg-choice__body">
                    <span class="lg-choice__name">
                      {t(key(`agreement.${option}.name`))}
                      {index === 0 && option !== 'free' ? <span class="lg-choice__tag">{t('retro.action.suggested')}</span> : null}
                    </span>
                    <span class="lg-muted">{sample === null || option === 'free' ? t(key(`agreement.${option}.meaning`)) : agreementMeaning(sample, t)}</span>
                    {option === 'wip_limit' && profileOf(view.framework).wipNote ? <span class="lg-muted">{t('agreement.wip_limit.scrumNote')}</span> : null}
                  </span>
                </label>
              );
            })}
          </fieldset>
        ) : null}
        {canChoose && type === 'wip_limit' ? (
          <div class="lg-field">
            <label class="lg-field__label" for="retro-wip-max">
              {t('retro.action.paramMax')}
            </label>
            <select id="retro-wip-max" class="lg-input" value={String(max)} onChange={(event) => setMax(Number((event.currentTarget as HTMLSelectElement).value))}>
              {sizes.map((size) => (
                <option key={size} value={String(size)}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {canChoose && type === 'free' ? (
          <TextField
            id="retro-free"
            label={t('retro.action.freeLabel')}
            hint={t('retro.action.freeHint', { max: config.retro.freeActionMax })}
            value={text}
            maxLength={config.retro.freeActionMax}
            multiline
            rows={2}
            onInput={setText}
          />
        ) : null}
        {canChoose ? (
          <ActionBar>
            <Button
              variant={draft !== null && retro.action === null ? 'primary' : 'secondary'}
              size="lg"
              icon="check"
              disabled={draft === null}
              onClick={() => {
                if (draft !== null) act({ type: 'retro.choose_action', agreement: draft });
              }}
            >
              {t('retro.action.choose')}
            </Button>
            <StepMove view={view} t={t} label={t('retro.end')} secondary={retro.action === null} bare confirm={retro.action === null ? { prompt: t('retro.end.confirm'), yes: t('retro.end.yes') } : undefined} />
          </ActionBar>
        ) : null}
        {retro.action === null && !canChoose ? <p class="lg-muted">{t('phase.waitingFor', { role: facilitatorRoleDef(view, t) })}</p> : null}
        {canChoose && retro.action === null ? <p class="lg-muted">{t('retro.action.needed')}</p> : null}
      </Panel>
      <VoteBoard view={view} t={t} readOnly />
    </div>
  );
}

/**
 * The Sprint Retrospective: notes in three columns with a helper, two votes each and one action for the next iteration.
 */
export function Retro({ view, phase, t, scriptStep }: RetroProps) {
  const steps = phase.iteration === 1 ? ['notes', 'vote', 'action'] : ['previous', 'notes', 'vote', 'action'];
  return (
    <>
      <ScreenHead view={view} phase={phase} steps={steps} t={t} />
      <div class="lg-plan">
        <div class="lg-stack lg-stack--lg">
          {phase.step === 'previous' ? <PreviousStep view={view} t={t} /> : null}
          {phase.step === 'notes' ? <NotesStep view={view} t={t} /> : null}
          {phase.step === 'vote' ? <VoteStep view={view} t={t} /> : null}
          {phase.step === 'action' ? <ActionStep view={view} t={t} /> : null}
        </div>
        <div class="lg-stack">
          <ScriptBox view={view} t={t} current={scriptStep} />
          <Observations view={view} t={t} />
        </div>
      </div>
    </>
  );
}
