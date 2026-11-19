import type { PlayerView } from '../../../core/index.ts';
import type { Translate } from '../../i18n/index.ts';
import { Check } from '../../ui/Check.tsx';
import { answerCheck } from '../controller.ts';
import { buildQuestion, dueSlot, slotId, type LearnSlot } from '../learn.ts';
import { useAppState } from '../store.ts';

export interface QuickCheckProps {
  view: PlayerView;
  t: Translate;
  slot?: LearnSlot;
  onDone?: () => void;
}

/**
 * The check question for the event that just ended; absent when none is due or the player skipped it.
 */
export function QuickCheck({ view, t, slot, onDone }: QuickCheckProps) {
  const state = useAppState();
  const due = slot ?? (state.mode === 'tour' ? null : dueSlot(view));
  if (due === null) return null;
  const question = buildQuestion(view.code, view.framework, due, t);
  const known = state.learn[slotId(due)];
  if (question === null || known === -1) return null;
  const picked = known === undefined ? null : known;
  const correct = picked === question.right;
  return (
    <Check
      id={question.id}
      title={t('learn.title')}
      question={question.question}
      choices={question.choices}
      right={question.right}
      picked={picked}
      skipLabel={t('learn.skip')}
      verdict={t(correct ? 'learn.right' : 'learn.wrong')}
      answerLine={t('learn.answer', { answer: question.choices[question.right]! })}
      why={question.why}
      onPick={(index) => answerCheck(question.id, index)}
      onSkip={() => {
        answerCheck(question.id, -1);
        if (onDone) onDone();
        else document.getElementById('lg-phase-title')?.focus();
      }}
    />
  );
}
