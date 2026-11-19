import { useEffect, useState } from 'preact/hooks';
import type { MergeFullPart, MergeWorkerPart } from '../../../../core/index.ts';
import { MergeTable } from '../../../ui/Puzzle.tsx';
import { key } from '../../format.ts';
import type { BodyProps } from './tokens.ts';

export interface MergeBodyProps extends BodyProps {
  part: MergeWorkerPart | MergeFullPart;
  pair: boolean;
}

function parse(values: string[]): number[] | null {
  const numbers = values.map((value) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN));
  return numbers.every((value) => Number.isInteger(value)) ? numbers : null;
}

/**
 * Merge: the base file and each side's changes, and one merged value per line.
 */
export function MergeBody({ part, pair, t, subject, readOnly, submission, onResponse }: MergeBodyProps) {
  const [values, setValues] = useState<string[]>(() => part.lines.map(() => ''));
  useEffect(() => {
    if (readOnly) return;
    const numbers = parse(values);
    onResponse(numbers === null ? null : { kind: 'merge', values: numbers });
  }, [values]);
  const submitted = readOnly && submission?.kind === 'merge' ? submission.values : null;
  const sideA = part.sides.indexOf(0);
  const sideB = part.sides.indexOf(1);
  const hidden = sideA < 0 ? 'ours' : sideB < 0 ? 'theirs' : undefined;
  const cell = (change: number | null | undefined) => (change === null || change === undefined ? undefined : String(change));
  const rows = part.lines.map((line, index) => ({
    n: index + 1,
    base: `${line.key} = ${line.base}`,
    ours: sideA < 0 ? undefined : cell(line.changes[sideA]),
    theirs: sideB < 0 ? undefined : cell(line.changes[sideB]),
    value: submitted !== null ? String(submitted[index] ?? '') : values[index] ?? '',
  }));
  return (
    <>
      {readOnly ? null : <p>{t(pair ? 'puzzle.merge.task.pair' : 'puzzle.merge.task.solo')}</p>}
      <p class="lg-merge__rule">{part.rule === null ? t('puzzle.merge.ruleMissing') : t(key(`puzzle.merge.rule.${part.rule}`))}</p>
      <MergeTable
        caption={t('puzzle.merge.caption', { subject })}
        columns={{
          line: t('puzzle.merge.line'),
          base: t('puzzle.merge.base'),
          ours: t('puzzle.merge.sideA'),
          theirs: t('puzzle.merge.sideB'),
          result: t('puzzle.merge.result'),
        }}
        rows={rows}
        resultLabel={(n) => `${t('puzzle.merge.result')}, ${t('puzzle.merge.line')} ${n}`}
        hidden={hidden}
        hiddenLabel={t('puzzle.merge.hidden')}
        sameLabel={t('puzzle.merge.sameLabel')}
        readOnly={readOnly}
        onInput={(n, value) => setValues((own) => own.map((entry, index) => (index === n - 1 ? value : entry)))}
      />
      {readOnly ? null : <p class="lg-muted lg-merge__legend">{t('puzzle.merge.sameLegend')}</p>}
    </>
  );
}
