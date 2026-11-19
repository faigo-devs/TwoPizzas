import { Button } from './Button.tsx';
import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

export type RetroColumnKind = 'well' | 'slow' | 'try';

export interface RetroNoteProps {
  text: string;
  column: RetroColumnKind;
  votes: number;
  voted?: boolean;
  mine?: boolean;
  hidden?: boolean;
  hiddenLabel: string;
  voteLabel: string;
  votesLabel: string;
  voteDisabled?: boolean;
  noteId?: string;
  onVote?: () => void;
}

/**
 * Retrospective note with its vote count and vote button; a private note shows only a hidden placeholder.
 */
export function RetroNote({ text, column, votes, voted, mine, hidden, hiddenLabel, voteLabel, votesLabel, voteDisabled, noteId, onVote }: RetroNoteProps) {
  return (
    <li class={cx('lg-note', `lg-note--${column}`, mine && 'is-mine', hidden && 'is-hidden')}>
      <p id={noteId ? `lg-note-${noteId}` : undefined} class="lg-note__text">
        {hidden ? hiddenLabel : text}
      </p>
      {!hidden ? (
        <div class="lg-note__foot">
          <span class="lg-note__votes">
            <Icon name="vote" size={14} />
            <span>{votes}</span>
            <span class="lg-sr">{votesLabel}</span>
          </span>
          <button type="button" class="lg-note__vote" aria-pressed={voted ? 'true' : 'false'} aria-label={`${voteLabel}: ${text.slice(0, 60)}`} disabled={voteDisabled && !voted} onClick={onVote}>
            {voteLabel}
          </button>
        </div>
      ) : (
        <span class="lg-note__lock">
          <Icon name="lock" size={14} />
        </span>
      )}
    </li>
  );
}

export interface RetroHelperProps {
  buttonLabel: string;
  title: string;
  questions: string[];
  proposalsLabel: string;
  proposals: string[];
  useLabel: string;
  open: boolean;
  onToggle?: () => void;
  onUse?: (text: string) => void;
}

/**
 * Helper behind "I don't know what to write": two or three questions and editable proposals made from the iteration's own numbers.
 */
export function RetroHelper({ buttonLabel, title, questions, proposalsLabel, proposals, useLabel, open, onToggle, onUse }: RetroHelperProps) {
  return (
    <div class={cx('lg-helper', open && 'is-open')}>
      <Button variant="quiet" size="sm" icon="bulb" onClick={onToggle}>
        {buttonLabel}
      </Button>
      {open ? (
        <div class="lg-helper__panel">
          <h4 class="lg-helper__title">{title}</h4>
          <ul class="lg-helper__questions">
            {questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          <p class="lg-helper__label">{proposalsLabel}</p>
          <ul class="lg-helper__proposals">
            {proposals.map((proposal) => (
              <li key={proposal}>
                <span>{proposal}</span>
                <Button variant="secondary" size="sm" icon="plus" onClick={() => onUse?.(proposal)}>
                  {useLabel}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
