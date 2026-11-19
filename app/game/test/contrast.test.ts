import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

type Rgb = [number, number, number];

const css = readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8');

const tokens = new Map<string, string>();
for (const match of css.matchAll(/--lg-([a-z0-9-]+):\s*([^;]+);/g)) tokens.set(match[1] ?? '', (match[2] ?? '').trim());

function parse(name: string, under: Rgb | null = null): Rgb {
  const raw = tokens.get(name);
  assert.ok(raw !== undefined, `token --lg-${name} exists`);
  const ref = /^var\(--lg-([a-z0-9-]+)\)$/.exec(raw);
  if (ref !== null) return parse(ref[1] ?? '', under);
  const hex = /^#([0-9a-f]{6})$/i.exec(raw);
  if (hex !== null) {
    const n = parseInt(hex[1] ?? '0', 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const fn = /^rgb\((\d+) (\d+) (\d+) \/ (\d+)%\)$/.exec(raw);
  assert.ok(fn !== null, `token --lg-${name} is a hex or an rgb() with alpha`);
  assert.ok(under !== null, `token --lg-${name} has alpha and needs a background`);
  const alpha = Number(fn[4]) / 100;
  const own = [Number(fn[1]), Number(fn[2]), Number(fn[3])];
  return under.map((base, i) => Math.round((own[i] ?? 0) * alpha + base * (1 - alpha))) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const surfaces = ['bg', 'surface', 'raised', 'sunken'];
const statuses = ['todo', 'doing', 'blocked', 'review', 'done', 'accepted', 'rejected'];

const textPairs: [string, string][] = [
  ...surfaces.flatMap((bg): [string, string][] => [['text', bg], ['text-2', bg], ['text-3', bg], ['accent-text', bg], ['danger', bg]]),
  ...statuses.map((s): [string, string] => [s, 'surface']),
  ...statuses.map((s): [string, string] => [s, 'raised']),
  ['on-accent', 'accent'],
  ['on-accent', 'accent-strong'],
  ['tour-text', 'tour-bg'],
  ['on-tour', 'tour'],
  ['on-tour', 'tour-strong'],
  ['paper-ink', 'paper'],
  ['on-fill', 'doing'],
  ['on-fill', 'done'],
  ['on-fill', 'accepted'],
  ['on-fill', 'review'],
  ['on-fill', 'blocked'],
  ['on-fill', 'rejected'],
];

const nonTextPairs: [string, string][] = [
  ['line-strong', 'bg'],
  ['line-strong', 'surface'],
  ['line-strong', 'raised'],
  ['focus', 'bg'],
  ['focus', 'surface'],
  ['focus', 'raised'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['tour-strong', 'tour-bg'],
  ...statuses.map((s): [string, string] => [s, 'surface']),
];

test('body text pairs reach WCAG 4.5:1', () => {
  const failures: string[] = [];
  for (const [fg, bg] of textPairs) {
    const back = parse(bg);
    const value = ratio(parse(fg, back), back);
    if (value < 4.5) failures.push(`${fg} on ${bg}: ${value.toFixed(2)}`);
  }
  assert.deepEqual(failures, []);
});

test('status text on its tinted background reaches 4.5:1', () => {
  const failures: string[] = [];
  for (const s of statuses) {
    for (const base of ['surface', 'raised']) {
      const under = parse(base);
      const back = parse(`${s}-bg`, under);
      const value = ratio(parse(s), back);
      if (value < 4.5) failures.push(`${s} on ${s}-bg over ${base}: ${value.toFixed(2)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('borders and focus rings reach WCAG 3:1 against what they sit on', () => {
  const failures: string[] = [];
  for (const [fg, bg] of nonTextPairs) {
    const back = parse(bg);
    const value = ratio(parse(fg, back), back);
    if (value < 3) failures.push(`${fg} against ${bg}: ${value.toFixed(2)}`);
  }
  assert.deepEqual(failures, []);
});

test('the contrast arithmetic matches known values', () => {
  assert.equal(Math.round(ratio([0, 0, 0], [255, 255, 255])), 21);
  assert.equal(ratio([255, 255, 255], [255, 255, 255]), 1);
});
