import { useEffect, useRef } from 'preact/hooks';
import { Button } from './Button.tsx';
import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

export interface CheckProps {
  id: string;
  title: string;
  question: string;
  choices: string[];
  right: number;
  picked: number | null;
  skipLabel: string;
  verdict: string;
  answerLine: string;
  why: string;
  onPick: (index: number) => void;
  onSkip: () => void;
}

/**
 * One check question: three choices as buttons, then the verdict, the right answer and a one-line reason.
 */
export function Check({ id, title, question, choices, right, picked, skipLabel, verdict, answerLine, why, onPick, onSkip }: CheckProps) {
  const result = useRef<HTMLDivElement>(null);
  const answered = picked !== null;
  useEffect(() => {
    if (answered) result.current?.focus();
  }, [answered]);
  const heading = `lg-check-q-${id}`;
  return (
    <section class="lg-check" aria-labelledby={heading}>
      <p id={heading} class="lg-check__q">
        <span class="lg-check__title">{title}</span> {question}
      </p>
      {answered ? (
        <div class="lg-check__result" ref={result} tabIndex={-1} role="status">
          <ul class="lg-check__choices" aria-label={question}>
            {choices.map((choice, index) => (
              <li key={index} class={cx('lg-check__choice', index === right && 'is-right', index === picked && index !== right && 'is-wrong')}>
                {index === right ? <Icon name="check" size={16} /> : null}
                <span>{choice}</span>
              </li>
            ))}
          </ul>
          <p class="lg-check__verdict">
            <strong>{verdict}.</strong>{picked === right ? null : ` ${answerLine}`}
          </p>
          <p class="lg-check__why">{why}</p>
        </div>
      ) : (
        <>
          <div class="lg-check__choices" role="group" aria-labelledby={heading}>
            {choices.map((choice, index) => (
              <Button key={index} variant="secondary" size="md" onClick={() => onPick(index)}>
                {choice}
              </Button>
            ))}
            <Button variant="quiet" size="md" class="lg-check__skip" onClick={onSkip}>
              {skipLabel}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
