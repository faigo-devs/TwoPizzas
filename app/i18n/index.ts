import { config } from '../../core/config.ts';
import { en } from './en.ts';
import type { Key } from './en.ts';
import { ro } from './ro.ts';

export type { Key } from './en.ts';

/**
 * The languages of the game, Romanian first.
 */
export const languages = ['ro', 'en'] as const;

export type Lang = (typeof languages)[number];

/**
 * The language used when the browser offers none of the two.
 */
export const defaultLanguage: Lang = 'ro';

export type Param = string | number;

export type Params = Readonly<Record<string, Param>>;

export type Translate = (key: Key, params?: Params) => string;

export type PluralCategory = 'one' | 'few' | 'other';

export const dictionaries: Readonly<Record<Lang, Readonly<Record<Key, string>>>> = { en, ro };

type Node =
  | { t: 'text'; v: string }
  | { t: 'param'; name: string }
  | { t: 'hash' }
  | { t: 'plural'; name: string; options: Record<string, Node[]> };

function closing(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error(`Unbalanced braces in: ${src}`);
}

function parsePlural(name: string, rest: string): Node {
  const options: Record<string, Node[]> = {};
  let i = 0;
  while (i < rest.length) {
    while (rest[i] === ' ') i += 1;
    if (i >= rest.length) break;
    let label = '';
    while (i < rest.length && /\w/.test(rest[i] as string)) {
      label += rest[i];
      i += 1;
    }
    while (rest[i] === ' ') i += 1;
    if (label === '' || rest[i] !== '{') throw new Error(`Bad plural options: ${rest}`);
    const end = closing(rest, i);
    options[label] = parse(rest.slice(i + 1, end), true);
    i = end + 1;
  }
  if (options['other'] === undefined) throw new Error(`Plural without other: ${rest}`);
  return { t: 'plural', name, options };
}

function parse(src: string, inPlural: boolean): Node[] {
  const nodes: Node[] = [];
  let text = '';
  const flush = (): void => {
    if (text !== '') nodes.push({ t: 'text', v: text });
    text = '';
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i] as string;
    if (c === '{') {
      const end = closing(src, i);
      const body = src.slice(i + 1, end);
      flush();
      const match = /^(\w+), plural, ?/.exec(body);
      nodes.push(match ? parsePlural(match[1] as string, body.slice(match[0].length)) : { t: 'param', name: body });
      i = end + 1;
    } else if (c === '#' && inPlural) {
      flush();
      nodes.push({ t: 'hash' });
      i += 1;
    } else {
      text += c;
      i += 1;
    }
  }
  flush();
  return nodes;
}

/**
 * The plural category of a whole number: English has one and other, Romanian has one, few and other.
 */
export function pluralCategory(lang: Lang, n: number): PluralCategory {
  if (lang === 'en') return n === 1 ? 'one' : 'other';
  if (n === 1) return 'one';
  const tail = n % 100;
  if (n === 0 || (tail >= 2 && tail <= 19)) return 'few';
  return 'other';
}

/**
 * The names of the parameters a template needs, in order of first use, without duplicates.
 */
export function templateParams(template: string): string[] {
  const found: string[] = [];
  const walk = (nodes: Node[]): void => {
    for (const node of nodes) {
      if (node.t === 'param' && !found.includes(node.name)) found.push(node.name);
      if (node.t === 'plural') {
        if (!found.includes(node.name)) found.push(node.name);
        for (const option of Object.values(node.options)) walk(option);
      }
    }
  };
  walk(parse(template, false));
  return found;
}

/**
 * The plural categories a template spells out for one parameter; empty when it has no plural.
 */
export function templatePlurals(template: string): string[][] {
  const out: string[][] = [];
  const walk = (nodes: Node[]): void => {
    for (const node of nodes) {
      if (node.t === 'plural') {
        out.push(Object.keys(node.options));
        for (const option of Object.values(node.options)) walk(option);
      }
    }
  };
  walk(parse(template, false));
  return out;
}

const cache = new Map<string, Node[]>();

function compiled(template: string): Node[] {
  let nodes = cache.get(template);
  if (nodes === undefined) {
    nodes = parse(template, false);
    cache.set(template, nodes);
  }
  return nodes;
}

function render(lang: Lang, nodes: Node[], params: Params, hash: number | null): string {
  let out = '';
  for (const node of nodes) {
    if (node.t === 'text') out += node.v;
    else if (node.t === 'hash') out += String(hash ?? '#');
    else if (node.t === 'param') out += node.name in params ? String(params[node.name]) : `{${node.name}}`;
    else {
      const raw = params[node.name];
      const n = typeof raw === 'number' ? raw : Number(raw);
      const options = node.options;
      const chosen = options[pluralCategory(lang, n)] ?? (options['other'] as Node[]);
      out += render(lang, chosen, params, n);
    }
  }
  return out;
}

const themeIds = ['payments', 'accounts', 'platform'] as const;
const agreementIds = ['wip_limit', 'review_wait', 'no_new_while_blocked', 'pair_first', 'wip_limits_set', 'free'] as const;

function resolve(lang: Lang, name: string, value: Param): Param {
  const dictionary = dictionaries[lang];
  if (name === 'theme' && (themeIds as readonly Param[]).includes(value)) {
    return dictionary[`item.theme.${value as (typeof themeIds)[number]}`];
  }
  if (name === 'type' && (agreementIds as readonly Param[]).includes(value)) {
    return dictionary[`agreement.${value as (typeof agreementIds)[number]}.name`];
  }
  return value;
}

/**
 * Builds the translate function of one language. Parameters named theme and type that carry a theme or agreement id are replaced by its label.
 */
export function createT(lang: Lang): Translate {
  const dictionary = dictionaries[lang];
  return (key, params = {}) => {
    const template = dictionary[key];
    const resolved: Record<string, Param> = {};
    for (const [name, value] of Object.entries(params)) resolved[name] = resolve(lang, name, value);
    return render(lang, compiled(template), resolved, null);
  };
}

/**
 * Picks the first visit's language: the first browser language that is Romanian or English, otherwise Romanian.
 */
export function pickLanguage(preferred: readonly string[] | string | null | undefined): Lang {
  const list = typeof preferred === 'string' ? [preferred] : (preferred ?? []);
  for (const tag of list) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (base === 'ro') return 'ro';
    if (base === 'en') return 'en';
  }
  return defaultLanguage;
}

/**
 * Whether a string is one of the game's languages.
 */
export function isLanguage(value: unknown): value is Lang {
  return value === 'ro' || value === 'en';
}

/**
 * The privacy paragraphs in reading order.
 */
export const privacyKeys = ['privacy.p1', 'privacy.p2', 'privacy.p3', 'privacy.p4', 'privacy.p5', 'privacy.p6'] as const satisfies readonly Key[];

/**
 * The numbers the privacy text quotes, taken from the game's configuration.
 */
export const privacyParams: Params = {
  minutes: config.room.emptyGraceMs / 60_000,
  hours: config.room.lifetimeMs / 3_600_000,
};

export { identity } from './identity.ts';
export { sources } from './sources.ts';
export type { Source } from './sources.ts';
