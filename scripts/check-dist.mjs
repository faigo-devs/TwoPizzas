import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

const TextExtensions = new Set(['.html', '.js', '.css', '.svg', '.json', '.txt']);
const PageLanguages = new Set(['ro', 'en']);
const RequiredFiles = ['index.html', '404.html', 'web.config', '.htaccess', 'robots.txt', 'favicon.ico', 'favicon.svg'];
const SyncStateFile = '.ftp-deploy-sync-state.json';
const NamespaceHosts = new Set(['www.w3.org']);

export const budget = { js: 450_000, css: 150_000, fonts: 300_000 };

const UrlPattern = /\b(?:https?|wss?):\/\/[^\s"'`<>)\\,;]+/gi;
const RelativeUrlPattern = /(?<=["'`(=\s])\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s"'`<>)\\,;]*/gi;
const LocalMarkers = [
  [/\blocalhost\b/i, 'localhost'],
  [/127\.0\.0\.1/, '127.0.0.1'],
  [/:8787\b/, ':8787'],
  [/(?<=["'`(=\s])\/kit(?=[/"'`?#)\s]|$)/, '/kit'],
  [/reference\//, 'reference/'],
];
const TrackerMarkers = [
  [/google-analytics|googletagmanager|gtag\s*\(/i, 'analytics'],
  [/plausible|matomo|hotjar|mixpanel|segment\.(?:io|com)|fullstory|clarity\.ms/i, 'tracker'],
  [/fonts\.googleapis|fonts\.gstatic|use\.typekit|fontawesome|cdn\.jsdelivr|unpkg\.com|cdnjs/i, 'third-party asset marker'],
  [/navigator\.sendBeacon/, 'sendBeacon'],
  [/document\.cookie/, 'document.cookie'],
  [/\/cdn-cgi\//, '/cdn-cgi/'],
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/**
 * Reads the site origin from `astro.config.mjs` and the source URLs from `app/i18n/sources.ts`.
 */
export function readProjectFacts(base = root) {
  const config = readFileSync(join(base, 'astro.config.mjs'), 'utf8');
  const siteMatch = /site:\s*'(https:\/\/[^']+)'/.exec(config);
  if (siteMatch === null) throw new Error('astro.config.mjs: no site origin found');
  const sourcesText = readFileSync(join(base, 'app', 'i18n', 'sources.ts'), 'utf8');
  const sourceUrls = [...new Set([...sourcesText.matchAll(/'(https:\/\/[^']+)'/g)].map((match) => match[1]))];
  if (sourceUrls.length === 0) throw new Error('app/i18n/sources.ts: no source URLs found');
  return { site: siteMatch[1], sourceUrls };
}

function siteHosts(site) {
  const host = new URL(site).hostname;
  const bare = host.startsWith('www.') ? host.slice(4) : host;
  return bare === host ? [host] : [host, bare];
}

function directive(csp, name) {
  const part = csp.split(';').map((item) => item.trim()).find((item) => item === name || item.startsWith(`${name} `));
  return part === undefined ? null : part.split(/\s+/).slice(1);
}

/**
 * Checks a built folder; returns failures (one line each), informational notes and byte totals.
 */
export function checkDist(dir, facts = readProjectFacts()) {
  const failures = [];
  const notes = [];
  const base = resolve(dir);
  if (!existsSync(base) || !statSync(base).isDirectory()) {
    return { failures: [`${dir}: folder does not exist`], notes, sizes: { js: 0, css: 0, fonts: 0 } };
  }
  const files = walk(base).map((full) => ({ full, rel: relative(base, full).split(sep).join('/') }));
  const fail = (rel, message) => failures.push(`${rel}: ${message}`);
  const hosts = siteHosts(facts.site);

  for (const required of RequiredFiles) {
    if (!files.some((file) => file.rel === required)) fail(required, 'missing');
  }
  for (const file of files) {
    const ext = extname(file.rel).toLowerCase();
    if (ext === '.html' && file.rel !== 'index.html' && file.rel !== '404.html') fail(file.rel, 'unexpected HTML page');
    if (ext === '.map') fail(file.rel, 'source map in output');
    if (/(^|\/)kit(\/|$)/.test(file.rel)) fail(file.rel, 'dev-only kit page in output');
  }

  const allowedUrls = new Set(facts.sourceUrls);
  const origins = new Set(hosts.map((host) => `https://${host}`));
  const allowedNotes = new Map();
  for (const file of files) {
    if (!TextExtensions.has(extname(file.rel).toLowerCase())) continue;
    const text = readFileSync(file.full, 'utf8');
    if (file.rel.endsWith('.html')) {
      const lang = /<html[^>]*\slang="([^"]*)"/i.exec(text);
      if (lang === null) fail(file.rel, 'no lang attribute on <html>');
      else if (!PageLanguages.has(lang[1])) fail(file.rel, `lang="${lang[1]}" is not one of ${[...PageLanguages].join(', ')}`);
      if (/<meta[^>]*name=["']generator["']/i.test(text)) fail(file.rel, 'generator meta tag');
    }
    const urls = [...text.matchAll(UrlPattern)].map((match) => match[0]);
    for (const match of text.matchAll(RelativeUrlPattern)) urls.push(match[0]);
    for (const url of urls) {
      if (url.startsWith('//')) {
        fail(file.rel, `protocol-relative URL ${url}`);
        continue;
      }
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        fail(file.rel, `unparseable URL ${url}`);
        continue;
      }
      if (allowedUrls.has(url)) continue;
      if (origins.has(parsed.origin)) continue;
      if (NamespaceHosts.has(parsed.hostname) && parsed.protocol === 'http:') {
        allowedNotes.set(url, (allowedNotes.get(url) ?? 0) + 1);
        continue;
      }
      fail(file.rel, `third-party URL ${url}`);
    }
    for (const [pattern, label] of LocalMarkers) {
      if (pattern.test(text)) fail(file.rel, `contains ${label}`);
    }
    for (const [pattern, label] of TrackerMarkers) {
      if (pattern.test(text)) fail(file.rel, `contains ${label}`);
    }
  }
  for (const [url, count] of allowedNotes) notes.push(`allowed namespace identifier ${url} (${count}x): XML namespace string, never fetched`);

  const policies = [];
  for (const [rel, pattern] of [
    ['web.config', /name="Content-Security-Policy"\s+value="([^"]*)"/],
    ['.htaccess', /Content-Security-Policy\s+"([^"]*)"/],
  ]) {
    const file = files.find((item) => item.rel === rel);
    if (file === undefined) continue;
    const text = readFileSync(file.full, 'utf8');
    if (/Strict-Transport-Security/i.test(text)) fail(rel, 'contains Strict-Transport-Security');
    if (!text.includes(SyncStateFile)) fail(rel, `does not protect ${SyncStateFile}`);
    const found = pattern.exec(text);
    if (found === null) {
      fail(rel, 'no Content-Security-Policy');
      continue;
    }
    const csp = found[1];
    policies.push(csp);
    const connect = directive(csp, 'connect-src');
    const expected = ["'self'", ...hosts.map((host) => `wss://${host}`)];
    if (connect === null) fail(rel, 'CSP has no connect-src');
    else if (connect.length !== expected.length || !expected.every((item) => connect.includes(item))) {
      fail(rel, `connect-src is "${connect.join(' ')}", expected "${expected.join(' ')}"`);
    }
    if (/'unsafe-eval'/.test(csp)) fail(rel, "CSP allows 'unsafe-eval'");
    for (const url of csp.match(UrlPattern) ?? []) {
      if (!url.startsWith('wss://') || !hosts.includes(new URL(url).hostname)) fail(rel, `CSP names ${url}`);
    }
  }
  if (policies.length === 2 && policies[0] !== policies[1]) fail('.htaccess', 'Content-Security-Policy differs from web.config');

  const sizes = { js: 0, css: 0, fonts: 0 };
  for (const file of files) {
    const ext = extname(file.rel).toLowerCase();
    const size = statSync(file.full).size;
    if (ext === '.js') sizes.js += size;
    else if (ext === '.css') sizes.css += size;
    else if (['.woff2', '.woff', '.ttf', '.otf'].includes(ext)) sizes.fonts += size;
  }
  for (const key of Object.keys(budget)) {
    if (sizes[key] > budget[key]) fail('budget', `${key} is ${sizes[key]} bytes, limit ${budget[key]}`);
  }
  return { failures, notes, sizes };
}

const invoked = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const dir = process.argv[2] ?? 'dist';
  const { failures, notes, sizes } = checkDist(dir);
  for (const note of notes) console.log(`note: ${note}`);
  if (failures.length > 0) {
    for (const line of failures) console.error(`FAIL ${line}`);
    console.error(`check-dist: ${failures.length} failure(s) in ${dir}`);
    process.exit(1);
  }
  console.log(`check-dist: ${dir} ok; js ${sizes.js} B, css ${sizes.css} B, fonts ${sizes.fonts} B`);
}
