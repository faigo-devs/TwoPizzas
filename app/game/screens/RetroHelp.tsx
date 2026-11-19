import type { PlayerView, RetroColumn } from '../../../core/index.ts';
import { dictionaries, type Translate } from '../../i18n/index.ts';
import { Button } from '../../ui/Button.tsx';
import { act } from '../controller.ts';
import { key } from '../format.ts';
import { profileOf } from '../framework.ts';

export interface RetroHelpProps {
  view: PlayerView;
  t: Translate;
  onUse: (text: string, column: RetroColumn) => void;
}

function choiceLabel(question: string, choice: string, t: Translate): string {
  const choiceKey = `retro.help.q.${question}.${choice}`;
  return choiceKey in dictionaries.en ? t(key(choiceKey)) : choice;
}

/**
 * "I don't know what to write": the server's short questions and the notes it proposes, which the player edits before adding.
 */
export function RetroHelp({ view, t, onUse }: RetroHelpProps) {
  const help = view.retro?.help ?? null;
  if (help === null) {
    return (
      <div class="lg-helper">
        <Button variant="quiet" size="md" icon="bulb" onClick={() => act({ type: 'retro.help_start' })}>
          {t('retro.help.button')}
        </Button>
      </div>
    );
  }
  return (
    <div class="lg-helper is-open">
      <div class="lg-helper__panel">
        <h4 class="lg-helper__title">{t('retro.help.title')}</h4>
        <ol class="lg-helper__asks">
          {help.questions.map((question) => {
            const text = t(key(`retro.help.q.${question.id}`), question.params);
            return (
              <li key={question.id}>
                <fieldset class="lg-ask">
                  <legend>{text}</legend>
                  <div class="lg-ask__choices">
                    {question.choices.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        class="lg-pick"
                        aria-pressed={help.answers[question.id] === choice ? 'true' : 'false'}
                        onClick={() => act({ type: 'retro.help_answer', questionId: question.id, choice })}
                      >
                        {choiceLabel(question.id, choice, t)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>
        <p class="lg-helper__label">{t('retro.help.proposals')}</p>
        {help.proposals.length === 0 ? (
          <p class="lg-muted">{t('retro.help.noProposals')}</p>
        ) : (
          <ul class="lg-helper__proposals">
            {help.proposals.map((proposal) => {
              const text = t(key(`retro.help.p.${proposal.id}`), proposal.params);
              return (
                <li key={proposal.id}>
                  <span>
                    <span class="lg-helper__tag">{t(key(`retro.column.${proposal.column}`))}</span> {text}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="plus"
                    onClick={() => {
                      act({ type: 'retro.help_use', proposalId: proposal.id });
                      onUse(text, proposal.column);
                    }}
                  >
                    {t('retro.help.use')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {profileOf(view.framework).wipNote && (help.questions.some((question) => question.id === 'overload') || help.proposals.some((proposal) => proposal.id.endsWith('.wip'))) ? (
          <p class="lg-muted lg-helper__note">{t('agreement.wip_limit.scrumNote')}</p>
        ) : null}
        <p class="lg-muted lg-helper__note">{t('retro.help.note')}</p>
      </div>
    </div>
  );
}
