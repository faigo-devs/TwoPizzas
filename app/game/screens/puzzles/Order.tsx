import { useEffect, useState } from 'preact/hooks';
import type { OrderFullPart, OrderWorkerPart } from '../../../../core/index.ts';
import { OrderList } from '../../../ui/Puzzle.tsx';
import { loadDraft, saveDraft } from '../../drafts.ts';
import type { BodyProps } from './tokens.ts';

export interface OrderBodyProps extends BodyProps {
  part: OrderWorkerPart | OrderFullPart;
  pair: boolean;
}

/**
 * Deploy order: the clues, and the components in the order the player puts them.
 */
export function OrderBody({ itemId, part, pair, t, readOnly, submission, onResponse }: OrderBodyProps) {
  const [order, setOrder] = useState<string[]>(() => {
    const draft = loadDraft(itemId, 'order');
    const same = draft !== null && draft.order.length === part.components.length && part.components.every((name) => draft.order.includes(name));
    return same ? [...draft.order] : [...part.components];
  });
  useEffect(() => {
    if (readOnly) return;
    saveDraft(itemId, { kind: 'order', order });
    onResponse({ kind: 'order', order });
  }, [order]);
  const move = (index: number, delta: -1 | 1) =>
    setOrder((own) => {
      const next = [...own];
      const target = index + delta;
      if (target < 0 || target >= next.length) return own;
      const [taken] = next.splice(index, 1);
      next.splice(target, 0, taken as string);
      return next;
    });
  const submitted = readOnly && submission?.kind === 'order' ? submission.order : null;
  return (
    <>
      {readOnly ? null : <p>{t(pair ? 'puzzle.order.task.pair' : 'puzzle.order.task.solo')}</p>}
      <ul class="lg-clues">
        {part.clues.map((clue) => (
          <li key={`${clue.before}>${clue.after}`}>
            <code>{t('puzzle.order.clue', { before: clue.before, after: clue.after })}</code>
          </li>
        ))}
      </ul>
      {submitted !== null ? (
        <div class="lg-order">
          <p class="lg-order__legend">{t('puzzle.order.legend')}</p>
          <ol class="lg-order__list">
            {submitted.map((name, index) => (
              <li key={name} class="lg-order__row">
                <span class="lg-order__pos">{index + 1}</span>
                <code class="lg-order__name">{name}</code>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <OrderList
          legend={t('puzzle.order.legend')}
          items={order.map((name) => ({ id: name, label: name }))}
          moveUpLabel={(label) => t('puzzle.order.moveUp', { label })}
          moveDownLabel={(label) => t('puzzle.order.moveDown', { label })}
          onMove={move}
        />
      )}
    </>
  );
}
