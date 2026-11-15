import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist-single';
const TopLevel = ['.htaccess', '404.html', '_astro', 'favicon.ico', 'favicon.svg', 'index.html', 'robots.txt', 'web.config'];
const Needles = ['googletagmanager', 'mailerlite', 'fonts.googleapis', 'formsubmit', 'challenges.cloudflare', 'WordPress', 'Joomla', 'PrestaShop', 'name="generator"'];
const failures = [];

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const read = (name) => readFileSync(join(dir, name), 'utf8');

const walk = (folder) =>
  readdirSync(join(dir, folder), { withFileTypes: true }).flatMap((entry) => {
    const path = folder ? `${folder}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(path) : [path];
  });

const top = readdirSync(dir).sort();
expect(JSON.stringify(top) === JSON.stringify([...TopLevel].sort()), `${dir} holds ${top.join(', ')} instead of ${TopLevel.join(', ')}`);

const pages = walk('').filter((path) => path.endsWith('.html'));
expect(JSON.stringify(pages.sort()) === JSON.stringify(['404.html', 'index.html']), `the HTML files are ${pages.join(', ')}`);

for (const name of pages) {
  const html = read(name);
  expect(html.includes('<html lang="ro"'), `${name} is not marked as Romanian`);
  expect(!/<(a|area)[\s>]/i.test(html), `${name} has a link`);
  for (const needle of Needles) expect(!html.includes(needle), `${name} contains ${needle}`);
  for (const [, url] of html.matchAll(/(?:src|href|action)="((?:https?:)?\/\/[^"]*)"/g)) {
    expect(url.startsWith('https://www.faigo.ro/'), `${name} points to ${url}`);
  }
}

const home = read('index.html');
expect(home.includes('id="game"'), 'index.html does not hold the game');
expect(!home.includes('http-equiv="refresh"'), 'index.html redirects');
expect(read('404.html').includes('http-equiv="refresh" content="0; url=/"'), '404.html does not lead to the home page');

const config = read('web.config');
const policy = config.match(/name="Content-Security-Policy" value="([^"]*)"/)?.[1] ?? '';
expect(!config.includes('Strict-Transport-Security'), 'web.config sets Strict-Transport-Security, which the host already sends');
expect(policy.includes("default-src 'self'"), 'web.config has no Content-Security-Policy');
expect(!policy.includes('https://'), 'the Content-Security-Policy of web.config allows an outside origin');
expect(read('.htaccess').includes(policy), '.htaccess and web.config do not send the same Content-Security-Policy');

for (const message of failures) console.log(`::error::${message}`);
console.log(failures.length ? `${failures.length} check(s) failed in ${dir}.` : `${dir}: one page, no link, checks passed.`);
process.exit(failures.length ? 1 : 0);
