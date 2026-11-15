import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { budget, checkDist, readProjectFacts } from './check-dist.mjs';

const qa = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.qa');
mkdirSync(qa, { recursive: true });
const work = mkdtempSync(join(qa, 'check-dist-test-'));
after(() => rmSync(work, { recursive: true, force: true }));

const facts = {
  site: 'https://www.example.org',
  sourceUrls: ['https://guides.example.net/scrum.html', 'https://guides.example.net/kanban/'],
};
const csp =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' wss://www.example.org wss://example.org; object-src 'none'";
const page = (extra = '') =>
  `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"><title>t</title></head><body>${extra}</body></html>`;
const webConfig = (policy) =>
  `<configuration><hiddenSegments><add segment=".ftp-deploy-sync-state.json" /></hiddenSegments><add name="Content-Security-Policy" value="${policy}" /></configuration>`;
const htaccess = (policy) =>
  `<Files ".ftp-deploy-sync-state.json">\n  Require all denied\n</Files>\nHeader always set Content-Security-Policy "${policy}"\n`;

function baseFiles() {
  return {
    'index.html': page(),
    '404.html': page(),
    'web.config': webConfig(csp),
    '.htaccess': htaccess(csp),
    'robots.txt': 'User-agent: *\nAllow: /\n',
    'favicon.ico': 'x',
    'favicon.svg': '<svg></svg>',
    '_astro/app.js': 'export const a = 1;',
    '_astro/app.css': 'body{margin:0}',
    '_astro/font.woff2': 'x',
  };
}

let counter = 0;
function build(overrides) {
  const dir = join(work, `fixture-${counter++}`);
  const files = { ...baseFiles(), ...overrides };
  for (const [name, content] of Object.entries(files)) {
    if (content === null) continue;
    const full = join(dir, name);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

function failing(overrides, fragment) {
  const { failures } = checkDist(build(overrides), facts);
  assert.ok(failures.some((line) => line.includes(fragment)), `expected "${fragment}" in:\n${failures.join('\n')}`);
}

test('a clean fixture passes', () => {
  const { failures, notes } = checkDist(build({}), facts);
  assert.deepEqual(failures, []);
  assert.deepEqual(notes, []);
});

test('the real project facts are readable', () => {
  const real = readProjectFacts();
  assert.match(real.site, /^https:\/\//);
  assert.equal(real.sourceUrls.length >= 3, true);
});

test('missing folder fails', () => {
  assert.equal(checkDist(join(work, 'nope'), facts).failures.length, 1);
});

for (const name of ['index.html', '404.html', 'web.config', '.htaccess', 'robots.txt', 'favicon.ico', 'favicon.svg']) {
  test(`missing ${name} fails`, () => failing({ [name]: null }, `${name}: missing`));
}

test('an extra HTML page fails', () => failing({ 'kit/index.html': page() }, 'unexpected HTML page'));
test('a kit folder fails', () => failing({ 'kit/data.json': '{}' }, 'kit page'));
test('a source map fails', () => failing({ '_astro/app.js.map': '{}' }, 'source map'));
test('a missing lang fails', () => failing({ 'index.html': '<html><body></body></html>' }, 'no lang'));
test('a wrong lang fails', () => failing({ 'index.html': page().replace('lang="ro"', 'lang="fr"') }, 'lang="fr"'));
test('a generator tag fails', () =>
  failing({ 'index.html': page('<meta name="generator" content="x">') }, 'generator meta'));

test('a third-party URL in JS fails', () => failing({ '_astro/app.js': 'fetch("https://cdn.example.com/x.js")' }, 'third-party URL'));
test('a websocket URL in JS fails', () => failing({ '_astro/app.js': 'new WebSocket("wss://other.example.com/ws")' }, 'third-party URL'));
test('a protocol-relative URL fails', () => failing({ '_astro/app.js': 'load("//cdn.example.com/x.js")' }, 'protocol-relative'));
test('a third-party URL in CSS fails', () =>
  failing({ '_astro/app.css': 'a{background:url(https://img.example.com/a.png)}' }, 'third-party URL'));
test('a third-party URL in SVG fails', () =>
  failing({ 'favicon.svg': '<svg><image href="https://img.example.com/a.png"/></svg>' }, 'third-party URL'));

test('own origin, source URLs and namespace identifiers pass', () => {
  const html = page(
    '<a href="https://guides.example.net/scrum.html">a</a><a href="https://www.example.org/x">b</a>',
  );
  const { failures, notes } = checkDist(build({ 'index.html': html, '_astro/app.js': 'x="http://www.w3.org/1999/xhtml"' }), facts);
  assert.deepEqual(failures, []);
  assert.equal(notes.length, 1);
});

test('another path on a source host fails', () =>
  failing({ 'index.html': page('<a href="https://guides.example.net/other">a</a>') }, 'third-party URL'));
test('an https w3.org URL fails', () => failing({ '_astro/app.js': 'x="https://www.w3.org/tr"' }, 'third-party URL'));

test('localhost fails', () => failing({ '_astro/app.js': 'x="localhost"' }, 'localhost'));
test('127.0.0.1 fails', () => failing({ '_astro/app.js': 'x="127.0.0.1"' }, '127.0.0.1'));
test(':8787 fails', () => failing({ '_astro/app.js': 'x="host:8787"' }, ':8787'));
test('/kit fails', () => failing({ '_astro/app.js': 'x="/kit"' }, '/kit'));
test('reference/ fails', () => failing({ '_astro/app.js': 'x="reference/piesa"' }, 'reference/'));
test('localStorage does not trip localhost', () => {
  assert.deepEqual(checkDist(build({ '_astro/app.js': 'localStorage.getItem("a")' }), facts).failures, []);
});

test('analytics fails', () => failing({ '_astro/app.js': 'gtag("config")' }, 'analytics'));
test('a tracker fails', () => failing({ '_astro/app.js': 'var p="plausible"' }, 'tracker'));
test('a third-party font marker fails', () => failing({ '_astro/app.css': '@import "fonts.googleapis"' }, 'third-party asset'));
test('document.cookie fails', () => failing({ '_astro/app.js': 'document.cookie="a=b"' }, 'document.cookie'));
test('an injected cdn-cgi path fails', () => failing({ 'index.html': page('<script src="/cdn-cgi/x.js"></script>') }, '/cdn-cgi/'));

test('a missing CSP fails', () =>
  failing({ 'web.config': '<configuration><add segment=".ftp-deploy-sync-state.json" /></configuration>' }, 'no Content-Security-Policy'));
test('differing policies fail', () =>
  failing({ '.htaccess': htaccess(`${csp}; base-uri 'self'`) }, 'differs from web.config'));
test('Strict-Transport-Security in web.config fails', () =>
  failing({ 'web.config': `${webConfig(csp)}<add name="Strict-Transport-Security" />` }, 'Strict-Transport-Security'));
test('Strict-Transport-Security in .htaccess fails', () =>
  failing({ '.htaccess': `${htaccess(csp)}Header set Strict-Transport-Security "x"\n` }, 'Strict-Transport-Security'));
test('a wrong connect-src fails in both files', () => {
  const bad = csp.replace(' wss://example.org', '');
  const { failures } = checkDist(build({ 'web.config': webConfig(bad), '.htaccess': htaccess(bad) }), facts);
  assert.equal(failures.filter((line) => line.includes('connect-src')).length, 2);
});
test('an extra connect-src origin fails', () => {
  const bad = csp.replace("'self' wss", "'self' https://api.example.com wss");
  const { failures } = checkDist(build({ 'web.config': webConfig(bad), '.htaccess': htaccess(bad) }), facts);
  assert.ok(failures.some((line) => line.includes('connect-src is')));
  assert.ok(failures.some((line) => line.includes('CSP names')));
});
test('an unprotected sync-state file fails', () =>
  failing({ '.htaccess': `Header always set Content-Security-Policy "${csp}"\n` }, 'does not protect'));
test('unsafe-eval fails', () => {
  const bad = csp.replace("'unsafe-inline'", "'unsafe-eval'");
  failing({ 'web.config': webConfig(bad), '.htaccess': htaccess(bad) }, "'unsafe-eval'");
});

test('exceeding the JS budget fails', () => failing({ '_astro/app.js': 'a'.repeat(budget.js + 1) }, 'js is'));
test('exceeding the CSS budget fails', () => failing({ '_astro/app.css': 'a'.repeat(budget.css + 1) }, 'css is'));
test('exceeding the font budget fails', () => failing({ '_astro/font.woff2': 'a'.repeat(budget.fonts + 1) }, 'fonts is'));
