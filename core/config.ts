function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
}

/**
 * Every tunable of the game in one frozen object; the pilot session changes numbers here and nowhere else.
 */
export const config = deepFreeze({
  players: {
    min: 3,
    max: 6,
    nameMax: 20,
  },
  room: {
    codeLetters: 'BCDFGHJKLMNPRSTVWXZ',
    codeLength: 5,
    emptyGraceMs: 5 * 60_000,
    lifetimeMs: 2 * 60 * 60_000,
    messageBytesMax: 2048,
    messagesPerWindow: 20,
    messageWindowMs: 5000,
    createPerMinute: 5,
    reconnectGraceMs: 60_000,
  },
  iterations: 2,
  timeboxMs: {
    plan: [6 * 60_000, 4 * 60_000],
    workHalf: 4 * 60_000,
    daily: 2 * 60_000,
    inspect: [4 * 60_000, 3 * 60_000],
    retro: [5 * 60_000, 3 * 60_000],
  },
  phaseEnds: {
    plan: 'soft',
    work: 'hard',
    daily: 'soft',
    inspect: 'soft',
    retro: 'soft',
  },
  contextSwitchMs: 8000,
  review: {
    waitThresholdMs: 60_000,
  },
  backlog: {
    composition: { S: 4, M: 4, L: 2 },
    dependencies: { S: 0, M: 2, L: 2 },
    workersNeeded: { S: 1, M: 2, L: 2 },
    valueMin: 1,
    valueMax: 8,
    themes: ['payments', 'accounts', 'platform'],
    subjects: [
      'payments-api',
      'checkout-service',
      'invoice-export',
      'login-flow',
      'session-store',
      'profile-page',
      'search-index',
      'email-queue',
      'audit-log',
      'rate-limiter',
      'image-resizer',
      'report-builder',
      'webhook-relay',
      'config-loader',
      'billing-cron',
      'notification-hub',
      'user-sync',
      'cache-warmer',
      'feature-flags',
      'metrics-agent',
      'order-tracker',
      'refund-handler',
      'password-reset',
      'api-gateway',
      'job-scheduler',
      'file-uploader',
      'status-page',
      'ledger-sync',
    ],
  },
  poker: {
    cards: [1, 2, 3, 5, 8, 13],
    revotesAllowed: 1,
  },
  goal: {
    options: 2,
    bonus: 5,
  },
  kanban: {
    arrivalIntervalMs: 45_000,
    arrivalComposition: { S: 4, M: 3, L: 1 },
    wipLimitMin: 1,
    wipLimitMax: 6,
    suggestedAgreement: 'wip_limits_set',
  },
  feedback: {
    newItems: 3,
    shiftBonus: 3,
    composition: { S: 1, M: 2, L: 0 },
  },
  agreements: {
    wipLimitMin: 1,
    wipLimitMax: 6,
    reviewWaitMs: 60_000,
  },
  retro: {
    columns: ['went_well', 'slowed_us', 'try'],
    noteMax: 140,
    notesPerPlayerMax: 6,
    votesPerPlayer: 2,
    helpQuestionsMax: 3,
    freeActionMax: 140,
  },
  observations: {
    maxPerEvent: 2,
    wipHighFactor: 1.5,
    pairWaitMs: 30_000,
  },
  leaderboard: {
    top: 10,
    cacheSeconds: 60,
  },
  names: {
    attemptsMax: 20,
  },
  puzzle: {
    sizes: {
      review: {
        S: { keys: 6, differing: 3, ignored: 1 },
        M: { keys: 8, differing: 4, ignored: 1 },
        L: { keys: 10, differing: 5, ignored: 2 },
      },
      order: {
        S: { components: 4, spare: 1 },
        M: { components: 5, spare: 2 },
        L: { components: 6, spare: 3 },
      },
      incident: {
        S: { indicators: 4, rules: 4 },
        M: { indicators: 5, rules: 5 },
        L: { indicators: 6, rules: 6 },
      },
      merge: {
        S: { lines: 5, conflicts: 2, singles: 1 },
        M: { lines: 7, conflicts: 2, singles: 2 },
        L: { lines: 8, conflicts: 3, singles: 2 },
      },
    },
    limits: {
      tokenLengthMax: 40,
      listLengthMax: 32,
      mergeValueMax: 1_000_000,
    },
  },
} as const);

export type Config = typeof config;
