import { useEffect, useState } from 'preact/hooks';
import type { IncidentFullPart, IncidentWorkerPart } from '../../../../core/index.ts';
import { ReadingsRules } from '../../../ui/Puzzle.tsx';
import { levelText, token, ruleText, type BodyProps } from './tokens.ts';

export interface IncidentBodyProps extends BodyProps {
  part: IncidentWorkerPart | IncidentFullPart;
  pair: boolean;
}

/**
 * Incident: the readings, the numbered rules, and the action the first fitting rule gives.
 */
export function IncidentBody({ part, pair, t, readOnly, submission, onResponse }: IncidentBodyProps) {
  const [action, setAction] = useState<string | null>(null);
  useEffect(() => {
    if (!readOnly) onResponse(action === null ? null : { kind: 'incident', action });
  }, [action]);
  const chosen = readOnly && submission?.kind === 'incident' ? submission.action : action ?? undefined;
  const label = (value: string) => token(t, 'action', value);
  return (
    <>
      {readOnly ? null : <p>{t(pair ? 'puzzle.incident.task.pair' : 'puzzle.incident.task.solo')}</p>}
      <ReadingsRules
        title={t('puzzle.incident.readings')}
        readings={part.readings.map((reading) => ({ key: token(t, 'indicator', reading.indicator), value: levelText(t, reading.indicator, reading.level) }))}
        rulesTitle={t('puzzle.incident.rules')}
        rules={part.rules.map((rule) => ({ n: rule.number, when: ruleText(t, rule), hint: label(rule.action) }))}
        actionLegend={t('puzzle.incident.action')}
        actions={part.options}
        chosen={chosen}
        name="work-incident"
        actionLabel={label}
        readOnly={readOnly}
        onChoose={setAction}
      />
    </>
  );
}
