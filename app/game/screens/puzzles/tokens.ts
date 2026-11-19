import type { IncidentReading, IncidentRule, PuzzleResponse } from '../../../../core/index.ts';
import { dictionaries, type Translate } from '../../../i18n/index.ts';
import { key } from '../../format.ts';

export interface BodyProps {
  t: Translate;
  subject: string;
  readOnly: boolean;
  copyIndex: number;
  submission: PuzzleResponse | null;
  onResponse: (response: PuzzleResponse | null) => void;
}

/**
 * A technical token in the player's language when the dictionary has a word for it, otherwise as it is.
 */
export function token(t: Translate, group: string, value: string): string {
  const name = `token.${group}.${value}`;
  return name in dictionaries.en ? t(key(name)) : value;
}

export function levelText(t: Translate, indicator: string, level: string): string {
  return token(t, `level.${indicator}`, level);
}

export function readingText(t: Translate, reading: IncidentReading): string {
  return t('puzzle.incident.condition', {
    indicator: token(t, `indicator.${reading.indicator}`, 'is'),
    level: levelText(t, reading.indicator, reading.level),
  });
}

export function ruleText(t: Translate, rule: IncidentRule): string {
  if (rule.conditions.length === 0) return t('puzzle.incident.otherwise');
  const parts = rule.conditions.map((condition) => readingText(t, condition));
  return t('puzzle.incident.when', { conditions: parts.join(` ${t('puzzle.incident.and')} `) });
}
