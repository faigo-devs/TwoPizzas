import type { Lang } from './index.ts';

/**
 * One outbound link: its address and its title per language.
 */
export interface Source {
  id: 'scrum' | 'kanban' | 'manifesto';
  href: Record<Lang, string>;
  title: Record<Lang, string>;
}

/**
 * The three primary sources the page links to; the Kanban Guide has no Romanian translation.
 */
export const sources: readonly Source[] = [
  {
    id: 'scrum',
    href: {
      en: 'https://scrumguides.org/scrum-guide.html',
      ro: 'https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-Romanian.pdf',
    },
    title: { en: 'The Scrum Guide', ro: 'Scrum Guide (traducere comunitară, PDF)' },
  },
  {
    id: 'kanban',
    href: {
      en: 'https://kanbanguides.org/english/',
      ro: 'https://kanbanguides.org/english/',
    },
    title: { en: 'The Kanban Guide', ro: 'Kanban Guide (în engleză)' },
  },
  {
    id: 'manifesto',
    href: {
      en: 'https://agilemanifesto.org/',
      ro: 'https://agilemanifesto.org/iso/ro/manifesto.html',
    },
    title: { en: 'The Agile Manifesto', ro: 'Manifestul pentru dezvoltarea agilă de software' },
  },
];
