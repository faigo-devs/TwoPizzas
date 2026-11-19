/**
 * Merges what the workers' pages and the holder's page show into one canonical puzzle, as people comparing notes on a call would.
 */
export function canonical(parts) {
  const kind = parts[0].kind;
  if (kind === 'review') {
    const copies = [];
    let ignore = [];
    for (const part of parts) {
      if (part.copies) copies.push(...part.copies);
      if (part.ignore) ignore = part.ignore;
    }
    return { kind, copies, ignore, complete: copies.length === 2 };
  }
  if (kind === 'order') {
    const clues = [];
    let components = [];
    for (const part of parts) {
      if (part.components) components = part.components;
      for (const clue of part.clues) {
        if (!clues.some((known) => known.before === clue.before && known.after === clue.after)) clues.push(clue);
      }
    }
    return { kind, components, clues, complete: components.length > 0 };
  }
  if (kind === 'incident') {
    const readings = [];
    const rules = new Map();
    let options = [];
    for (const part of parts) {
      if (part.options) options = part.options;
      for (const reading of part.readings) {
        if (!readings.some((known) => known.indicator === reading.indicator)) readings.push(reading);
      }
      for (const rule of part.rules ?? []) rules.set(rule.number, rule);
    }
    return { kind, options, readings, rules: [...rules.values()].sort((a, b) => a.number - b.number), complete: true };
  }
  let rule = null;
  let base = null;
  const sides = [null, null];
  for (const part of parts) {
    if (part.rule) rule = part.rule;
    if (!part.lines) continue;
    base = part.lines.map((line) => ({ key: line.key, base: line.base }));
    part.sides.forEach((side, position) => {
      sides[side] = part.lines.map((line) => line.changes[position]);
    });
  }
  return { kind, rule, lines: base ?? [], sides, complete: rule !== null && sides[0] !== null && sides[1] !== null };
}

function mergeValue(rule, a, b) {
  if (rule === 'max') return Math.max(a, b);
  if (rule === 'min') return Math.min(a, b);
  return rule === 'side_a' ? a : b;
}

function orderOf(components, clues) {
  const remaining = new Set(components);
  const out = [];
  while (remaining.size > 0) {
    const free = [...remaining].filter((name) => !clues.some((clue) => clue.after === name && remaining.has(clue.before)));
    if (free.length === 0) return null;
    free.sort();
    out.push(free[0]);
    remaining.delete(free[0]);
  }
  return out;
}

/**
 * The right response for a canonical puzzle, or null when the pieces are not all there.
 */
export function solve(puzzle) {
  if (!puzzle.complete) return null;
  if (puzzle.kind === 'review') {
    const [a, b] = puzzle.copies;
    const keys = a
      .filter((line) => {
        const other = b.find((candidate) => candidate.key === line.key);
        return other !== undefined && other.value !== line.value && !puzzle.ignore.includes(line.key);
      })
      .map((line) => line.key)
      .sort();
    return { kind: 'review', keys };
  }
  if (puzzle.kind === 'order') {
    const order = orderOf(puzzle.components, puzzle.clues);
    return order === null ? null : { kind: 'order', order };
  }
  if (puzzle.kind === 'incident') {
    const matches = (rule) =>
      rule.conditions.every((condition) =>
        puzzle.readings.some((reading) => reading.indicator === condition.indicator && reading.level === condition.level),
      );
    const winner = puzzle.rules.find(matches);
    return winner === undefined ? null : { kind: 'incident', action: winner.action };
  }
  const values = puzzle.lines.map((line, index) => {
    const a = puzzle.sides[0][index];
    const b = puzzle.sides[1][index];
    if (a !== null && b !== null) return mergeValue(puzzle.rule, a, b);
    if (a !== null) return a;
    if (b !== null) return b;
    return line.base;
  });
  return { kind: 'merge', values };
}

/**
 * A response of the same kind that is certainly wrong.
 */
export function wrongResponse(response, puzzle) {
  if (response.kind === 'review') {
    const probe = puzzle.copies[0][0].key;
    const keys = response.keys.includes(probe) ? response.keys.filter((key) => key !== probe) : [...response.keys, probe];
    return { kind: 'review', keys };
  }
  if (response.kind === 'order') {
    const order = [...response.order];
    [order[0], order[1]] = [order[1], order[0]];
    return { kind: 'order', order };
  }
  if (response.kind === 'incident') {
    const other = puzzle.options.find((option) => option !== response.action);
    return { kind: 'incident', action: other };
  }
  const values = [...response.values];
  values[0] += 1;
  return { kind: 'merge', values };
}

/**
 * Whether a submitted response equals the right one for a canonical puzzle.
 */
export function sameResponse(left, right) {
  if (left === null || right === null || left.kind !== right.kind) return false;
  if (left.kind === 'review') return left.keys.length === right.keys.length && [...left.keys].sort().every((key, index) => key === [...right.keys].sort()[index]);
  if (left.kind === 'order') return left.order.length === right.order.length && left.order.every((name, index) => name === right.order[index]);
  if (left.kind === 'incident') return left.action === right.action;
  return left.values.length === right.values.length && left.values.every((value, index) => value === right.values[index]);
}
