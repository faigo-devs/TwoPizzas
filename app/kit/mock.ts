import type { AvatarProps } from '../ui/Avatar.tsx';

export const itemLabels = { value: 'Value', estimate: 'Est.', workers: 'Workers', reviewer: 'Reviewer', noEstimate: 'none' };

export const roleLabels = { facilitator: 'Scrum Master', you: 'you', disconnected: 'disconnected' };

export const players: AvatarProps[] = [
  { name: 'Player 1', number: 1, colour: 0, you: true, facilitator: true, roleLabels },
  { name: 'Player 2', number: 2, colour: 1, roleLabels },
  { name: 'Player 3', number: 3, colour: 2, roleLabels },
  { name: 'Player 4', number: 4, colour: 3, roleLabels },
  { name: 'Player 5', number: 5, colour: 4, disconnected: true, roleLabels },
  { name: 'Player 6', number: 6, colour: 5, roleLabels },
];

export const kindLabels = { review: 'Code review', order: 'Deploy order', incident: 'Incident', merge: 'Merge' };

export const statusLabels = {
  todo: 'To do',
  waiting: 'Waiting for a pair',
  doing: 'In progress',
  blocked: 'Blocked',
  review: 'In review',
  done: 'Done',
  accepted: 'Accepted',
  rejected: 'Escaped defect',
} as const;

export const themeOptions = { dark: 'Dark theme', light: 'Light theme' };

export const footerIdentity = {
  identity: { name: 'FAIGO SRL', seat: 'Oradea, Romania', cif: 'RO00000000', regCom: 'J00/000/2000' },
  labels: {
    cif: 'CIF',
    regCom: 'Reg. Com.',
    privacySummary: 'Privacy',
    privacy: [
      'The game stores no account and sets no cookie. A room lives for a few hours and is deleted when the last player has left.',
      'Only the published result is kept: framework, generated team name, number of players, score and date.',
    ],
    linksTitle: 'Primary sources',
    newTab: '(opens in a new tab)',
  },
  links: [
    { label: 'The Scrum Guide', href: 'https://scrumguides.org/scrum-guide.html' },
    { label: 'The Kanban Guide', href: 'https://kanbanguides.org/english/' },
    { label: 'The Agile Manifesto', href: 'https://agilemanifesto.org/' },
  ],
};

export const boardColumns = {
  rank: 'Rank',
  team: 'Team',
  players: 'Players',
  score: 'Score',
  defects: 'Defects',
  date: 'Date',
};

export const monthRows = [
  { rank: 1, team: 'brave-otter', players: 5, score: 61, defects: 0, date: '2026-11-12' },
  { rank: 2, team: 'quiet-heron', players: 4, score: 55, defects: 1, date: '2026-11-09' },
  { rank: 3, team: 'swift-lynx', players: 6, score: 55, defects: 2, date: '2026-11-14' },
  { rank: 4, team: 'amber-falcon', players: 3, score: 47, defects: 0, date: '2026-11-03' },
  { rank: 5, team: 'calm-badger', players: 5, score: 40, defects: 1, date: '2026-11-07' },
];

export const allTimeRows = [
  { rank: 1, team: 'bold-panda', players: 6, score: 74, defects: 0, date: '2026-10-21' },
  { rank: 2, team: 'brave-otter', players: 5, score: 61, defects: 0, date: '2026-11-12' },
  { rank: 3, team: 'clever-fox', players: 4, score: 58, defects: 1, date: '2026-10-30' },
  { rank: 4, team: 'quiet-heron', players: 4, score: 55, defects: 1, date: '2026-11-09' },
];

export const configA = [
  { key: 'pool.max', value: '20' },
  { key: 'pool.timeout', value: '30s' },
  { key: 'cache.ttl', value: '600' },
  { key: 'retry.count', value: '3' },
  { key: 'log.level', value: 'info' },
  { key: 'tls.min_version', value: '1.2' },
];

export const configB = [
  { key: 'log.level', value: 'info' },
  { key: 'retry.count', value: '5' },
  { key: 'pool.max', value: '20' },
  { key: 'cache.ttl', value: '600' },
  { key: 'tls.min_version', value: '1.3' },
  { key: 'pool.timeout', value: '30s' },
];
