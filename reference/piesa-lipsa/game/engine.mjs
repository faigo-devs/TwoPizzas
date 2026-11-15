const CodeLetters = 'BCDFGHJKLMNPRSTVWXZ';
const CodePattern = new RegExp(`^[${CodeLetters}]{4}[234]$`);

export const MissionCount = 4;
export const PenaltyMs = 30000;

const ReviewSettings = [
  ['timp_asteptare', ['15 s', '30 s', '45 s', '60 s']],
  ['reincercari', ['2', '3', '5']],
  ['limita_cereri', ['60', '120', '240']],
  ['port', ['8080', '8443', '9090']],
  ['jurnal', ['scurt', 'detaliat', 'oprit']],
  ['memorie_cache', ['pornita', 'oprita']],
  ['mediu', ['test', 'pregatire', 'productie']],
  ['versiune', ['2.3.9', '2.4.0', '2.4.1']],
  ['conexiuni_max', ['20', '50', '100']],
  ['copie_siguranta', ['zilnic', 'saptamanal', 'lunar']],
  ['compresie', ['pornita', 'oprita']],
  ['expirare_sesiune', ['15 min', '30 min', '60 min']],
  ['dimensiune_lot', ['100', '250', '500']],
  ['fire_executie', ['4', '8', '16']],
];

const Components = [
  'Baza de date',
  'Autentificare',
  'API',
  'Coadă de mesaje',
  'Cache',
  'Interfață web',
  'Lucrători',
  'Monitorizare',
];

const Indicators = [
  ['Erori', ['puține', 'multe']],
  ['Memorie', ['liberă', 'plină']],
  ['Coadă de mesaje', ['goală', 'plină']],
  ['Timp de răspuns', ['normal', 'mare']],
  ['Disc', ['liber', 'plin']],
  ['Trafic', ['obișnuit', 'dublu']],
];

const Actions = [
  'Reporniți lucrătorii',
  'Reveniți la versiunea anterioară',
  'Adăugați încă o instanță',
  'Goliți memoria cache',
  'Eliberați spațiu pe disc',
  'Anunțați echipa și așteptați',
];

const MergeSettings = [
  ['timp_asteptare', [15, 30, 45, 60, 90]],
  ['reincercari', [2, 3, 4, 5, 6]],
  ['limita_cereri', [60, 120, 180, 240, 300]],
  ['conexiuni_max', [20, 40, 50, 80, 100]],
  ['dimensiune_lot', [100, 200, 250, 400, 500]],
  ['expirare_sesiune', [15, 20, 30, 45, 60]],
  ['fire_executie', [2, 4, 8, 12, 16]],
  ['port', [8080, 8081, 8443, 9000, 9090]],
];

export const MergeRules = ['max', 'min', 'lowSeat', 'highSeat'];

/**
 * FNV-1a hash of a text, as an unsigned 32-bit seed.
 */
export function hashSeed(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deterministic generator (mulberry32) of numbers in [0, 1) from a 32-bit seed.
 */
export function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rng, bound) => Math.floor(rng() * bound);
const pick = (rng, items) => items[int(rng, items.length)];

function shuffle(rng, items) {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const other = int(rng, index + 1);
    [out[index], out[other]] = [out[other], out[index]];
  }
  return out;
}

/**
 * A new team code: four consonants, then the number of players (2 to 4).
 */
export function generateCode(players, random = Math.random) {
  let letters = '';
  for (let index = 0; index < 4; index += 1) {
    letters += CodeLetters[Math.floor(random() * CodeLetters.length)];
  }
  return `${letters}${players}`;
}

/**
 * Reads a typed team code; returns the code and its number of players, or null when it is not one.
 */
export function parseCode(text) {
  const code = String(text ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return CodePattern.test(code) ? { code, players: Number(code[4]) } : null;
}

function buildReview(rng, players) {
  const settings = shuffle(rng, ReviewSettings).slice(0, 10);
  const differing = new Set(shuffle(rng, settings.map(([key]) => key)).slice(0, players === 2 ? 3 : 4));
  const copies = Array.from({ length: players }, () => []);
  for (const [key, values] of settings) {
    const [base, other] = shuffle(rng, values);
    const odd = differing.has(key) ? int(rng, players) : -1;
    copies.forEach((copy, seat) => copy.push({ key, value: seat === odd ? other : base }));
  }
  return {
    kind: 'review',
    views: copies.map((copy) => ({ lines: shuffle(rng, copy) })),
    answer: [...differing].sort(),
  };
}

function buildOrder(rng, players) {
  const count = players === 2 ? 5 : 6;
  const order = shuffle(rng, Components).slice(0, count);
  const chain = [];
  const spare = [];
  for (let later = 1; later < count; later += 1) {
    for (let earlier = 0; earlier < later; earlier += 1) {
      (later - earlier === 1 ? chain : spare).push({ before: order[earlier], after: order[later] });
    }
  }
  const total = Math.max(chain.length, players * 2);
  const clues = shuffle(rng, [...chain, ...shuffle(rng, spare).slice(0, total - chain.length)]);
  const start = [...order].sort();
  if (start.every((name, index) => name === order[index])) start.reverse();
  return {
    kind: 'order',
    views: Array.from({ length: players }, (_, seat) => ({
      clues: clues.filter((_, index) => index % players === seat),
      items: start,
    })),
    answer: order,
  };
}

function buildIncident(rng, players) {
  const indicators = shuffle(rng, Indicators).slice(0, 5);
  const state = indicators.map(() => int(rng, 2));
  const actions = shuffle(rng, Actions);
  const winner = 1 + int(rng, 2);
  const decoy = winner + 1 + int(rng, 4 - winner);
  const rules = [];
  for (let index = 0; index < 5; index += 1) {
    const [first, second] = shuffle(rng, [0, 1, 2, 3, 4]);
    const matches = index === winner || index === decoy;
    const conditions = [
      { name: indicators[first][0], value: indicators[first][1][state[first]] },
      { name: indicators[second][0], value: indicators[second][1][matches ? state[second] : 1 - state[second]] },
    ];
    rules.push({ number: index + 1, conditions: shuffle(rng, conditions), action: actions[index] });
  }
  rules.push({ number: 6, conditions: [], action: actions[5] });
  const readings = indicators.map(([name, values], index) => ({ name, value: values[state[index]] }));
  const offset = int(rng, players);
  return {
    kind: 'incident',
    views: Array.from({ length: players }, (_, seat) => ({
      readings: readings.filter((_, index) => (index + offset) % players === seat),
      rules: rules.filter((_, index) => (index + offset + 1) % players === seat),
    })),
    options: Actions,
    readings,
    rules,
    answer: actions[winner],
  };
}

function resolveConflict(rule, changes) {
  const [low, high] = [...changes].sort((a, b) => a.seat - b.seat);
  if (rule === 'max') return Math.max(low.value, high.value);
  if (rule === 'min') return Math.min(low.value, high.value);
  return rule === 'lowSeat' ? low.value : high.value;
}

function buildMerge(rng, players) {
  const settings = shuffle(rng, MergeSettings).slice(0, 6);
  const rule = pick(rng, MergeRules);
  const holder = int(rng, players);
  const slots = shuffle(rng, [0, 1, 2, 3, 4, 5]);
  const soloSeats = shuffle(rng, Array.from({ length: players }, (_, seat) => seat));
  const changes = settings.map(() => []);
  const bases = [];
  settings.forEach(([, values], line) => {
    const [base, first, second] = shuffle(rng, values);
    bases.push(base);
    const slot = slots.indexOf(line);
    if (slot < 2) {
      const [seatA, seatB] = shuffle(rng, soloSeats);
      changes[line].push({ seat: seatA, value: first }, { seat: seatB, value: second });
    } else if (slot - 2 < players) {
      changes[line].push({ seat: soloSeats[slot - 2], value: first });
    }
  });
  const answer = settings.map((_, line) => {
    if (changes[line].length === 0) return bases[line];
    return changes[line].length === 1 ? changes[line][0].value : resolveConflict(rule, changes[line]);
  });
  return {
    kind: 'merge',
    views: Array.from({ length: players }, (_, seat) => ({
      lines: settings.map(([key], line) => ({
        key,
        base: bases[line],
        mine: changes[line].find((change) => change.seat === seat)?.value ?? null,
      })),
      rule: seat === holder ? rule : null,
    })),
    rule,
    changes,
    answer,
  };
}

const Builders = [buildReview, buildOrder, buildIncident, buildMerge];

/**
 * One mission of a team's game: the view of every seat and the answer, the same on every device for the same code.
 */
export function buildMission(code, index, players) {
  return Builders[index](createRng(hashSeed(`${code}:${index}`)), players);
}

/**
 * Whether a response is the mission's answer.
 */
export function isCorrect(mission, response) {
  if (mission.kind === 'incident') return response === mission.answer;
  if (!Array.isArray(response) || response.length !== mission.answer.length) return false;
  const given = mission.kind === 'review' ? [...response].sort() : response;
  return given.every((value, index) => value === mission.answer[index]);
}
