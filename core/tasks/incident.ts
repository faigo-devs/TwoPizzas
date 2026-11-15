import { config } from '../config.ts';
import { createRng } from '../rng.ts';
import type {
  IncidentPuzzle,
  IncidentReading,
  IncidentRule,
  ItemSize,
  WorkerCount,
} from '../types.ts';
import { Actions, Indicators } from './data.ts';

/**
 * Builds an incident puzzle: readings and numbered rules, the first fitting rule wins and a later one fits too.
 */
export function generateIncident(
  size: ItemSize,
  seed: number,
  workers: WorkerCount,
  dependency: boolean,
): IncidentPuzzle {
  const rng = createRng(seed);
  const table = config.puzzle.sizes.incident[size];
  const indicators = rng.shuffle(Indicators).slice(0, table.indicators);
  const levels = indicators.map(() => rng.int(2));
  const actions = rng.shuffle(Actions);
  const ruleCount = table.rules;
  const winner = 1 + rng.int(2);
  const decoy = winner + 1 + rng.int(ruleCount - 1 - winner);
  const rules: IncidentRule[] = [];
  for (let index = 0; index < ruleCount; index += 1) {
    const [first, second] = rng.shuffle(indicators.map((_, position) => position)) as [number, number];
    const matches = index === winner || index === decoy;
    const conditionOf = (position: number, level: number): IncidentReading => {
      const [indicator, values] = indicators[position] as (typeof indicators)[number];
      return { indicator, level: values[level] as string };
    };
    rules.push({
      number: index + 1,
      conditions: rng.shuffle([
        conditionOf(first, levels[first] as number),
        conditionOf(second, matches ? (levels[second] as number) : 1 - (levels[second] as number)),
      ]),
      action: actions[index] as string,
    });
  }
  rules.push({ number: ruleCount + 1, conditions: [], action: actions[ruleCount] as string });
  const readings: IncidentReading[] = indicators.map(([indicator, values], position) => ({
    indicator,
    level: values[levels[position] as number] as string,
  }));
  const options = rng.shuffle(actions.slice(0, ruleCount + 1));
  const winningRule = rules[winner] as IncidentRule;
  const decoyIndicators = new Set((rules[decoy] as IncidentRule).conditions.map((condition) => condition.indicator));
  const candidates = winningRule.conditions.map((condition) => condition.indicator);
  const preferred = candidates.filter((indicator) => !decoyIndicators.has(indicator));
  const heldIndicator = dependency ? rng.pick(preferred.length > 0 ? preferred : candidates) : null;
  const held = readings.filter((reading) => reading.indicator === heldIndicator);
  const shared = readings.filter((reading) => reading.indicator !== heldIndicator);
  const readingsOf: IncidentReading[][] = Array.from({ length: workers }, () => []);
  rng.shuffle(shared).forEach((reading, index) => (readingsOf[index % workers] as IncidentReading[]).push(reading));
  const rulesOf: IncidentRule[][] = Array.from({ length: workers }, () => []);
  if (workers === 1) {
    (rulesOf[0] as IncidentRule[]).push(...rules);
  } else {
    const first = rules[0] as IncidentRule;
    const pinned = [first, winningRule];
    (rulesOf[0] as IncidentRule[]).push(first);
    (rulesOf[1] as IncidentRule[]).push(winningRule);
    rng.shuffle(rules.filter((rule) => !pinned.includes(rule))).forEach((rule, index) =>
      (rulesOf[index % 2] as IncidentRule[]).push(rule),
    );
  }
  return {
    kind: 'incident',
    size,
    seed,
    workers,
    dependency,
    parts: readingsOf.map((own, index) => ({
      kind: 'incident' as const,
      scope: 'worker' as const,
      options,
      readings: own,
      rules: [...(rulesOf[index] as IncidentRule[])].sort((a, b) => a.number - b.number),
    })),
    dependencyPart: dependency ? { kind: 'incident', scope: 'dependency', readings: held } : null,
    fullPart: { kind: 'incident', scope: 'full', options, readings, rules },
    answer: { kind: 'incident', action: winningRule.action },
  };
}
