import { useEffect, useState } from 'preact/hooks';
import type { ReviewFullPart, ReviewWorkerPart } from '../../../../core/index.ts';
import { ConfigListing } from '../../../ui/Puzzle.tsx';
import type { BodyProps } from './tokens.ts';

export interface ReviewBodyProps extends BodyProps {
  part: ReviewWorkerPart | ReviewFullPart;
}

/**
 * Code review: the copies of one file, and a mark on every key whose value differs.
 */
export function ReviewBody({ part, t, subject, readOnly, copyIndex, submission, onResponse }: ReviewBodyProps) {
  const [marked, setMarked] = useState<string[]>([]);
  const shown = readOnly && submission?.kind === 'review' ? submission.keys : marked;
  useEffect(() => {
    if (!readOnly) onResponse({ kind: 'review', keys: marked });
  }, [marked]);
  const toggle = (name: string) => setMarked((own) => (own.includes(name) ? own.filter((entry) => entry !== name) : [...own, name]));
  const ignore = part.scope === 'full' ? part.ignore : [];
  const single = part.copies.length === 1;
  return (
    <>
      {readOnly ? null : <p>{t(single ? 'puzzle.review.task.pair' : 'puzzle.review.task.solo')}</p>}
      <div class="lg-two">
        {part.copies.map((copy, index) => (
          <ConfigListing
            key={index}
            file={t('puzzle.review.file', { subject, copy: String.fromCharCode(65 + (single ? copyIndex : index)) })}
            lines={copy.map((line) => ({ key: line.key, value: line.value, marked: shown.includes(line.key) }))}
            markLabel={(name) => t('puzzle.review.mark', { key: name })}
            markedLabel={t('puzzle.review.marked')}
            readOnly={readOnly}
            onToggle={toggle}
          />
        ))}
      </div>
      {ignore.length > 0 ? <p class="lg-muted">{t('puzzle.review.ignore', { keys: ignore.join(', ') })}</p> : null}
    </>
  );
}
