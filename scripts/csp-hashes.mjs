import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ScriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const StylePattern = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
const CommentPattern = /<!--[\s\S]*?-->/g;
const TagPattern = /<[a-zA-Z][^>]*>/g;
const SrcAttribute = /(?:^|\s)src\s*=/i;
const XmlEntities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };

const HostFiles = [
  {
    name: 'web.config',
    pattern: /(name="Content-Security-Policy"\s+value=")([^"]*)(")/,
    decode: (value) => value.replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) => XmlEntities[entity]),
    encode: (value) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  },
  {
    name: '.htaccess',
    pattern: /(Content-Security-Policy\s+")([^"]*)(")/,
    decode: (value) => value,
    encode: (value) => {
      if (/["\\\r\n]/.test(value)) throw new Error('.htaccess: the policy holds a character that needs quoting');
      return value;
    },
  },
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
 * Base64 SHA-256 of a block's exact text, as a CSP source expression.
 */
export function cspHash(text) {
  return `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
}

/**
 * Lists the inline script and style blocks of an HTML text as CSP hash sources, in document order.
 */
export function inlineBlocks(html) {
  const visible = html.replace(CommentPattern, '');
  const scripts = [];
  const styles = [];
  for (const match of visible.matchAll(ScriptPattern)) {
    if (!SrcAttribute.test(match[1])) scripts.push(cspHash(match[2]));
  }
  for (const match of visible.matchAll(StylePattern)) styles.push(cspHash(match[1]));
  return { scripts, styles };
}

/**
 * Names what a hash cannot cover: inline event handlers, style attributes and javascript: URLs.
 */
export function unhashable(html) {
  const markup = html.replace(CommentPattern, '').replace(ScriptPattern, '<script>').replace(StylePattern, '<style>');
  const found = new Set();
  for (const tag of markup.match(TagPattern) ?? []) {
    const handler = /\s(on[a-z]+)\s*=/i.exec(tag);
    if (handler !== null) found.add(`inline event handler ${handler[1].toLowerCase()}`);
    if (/\sstyle\s*=/i.test(tag)) found.add('inline style attribute');
    if (/javascript:/i.test(tag)) found.add('javascript: URL');
  }
  return [...found];
}

/**
 * Collects the sorted union of script and style hashes over every HTML file under a folder.
 */
export function collectHashes(dir) {
  const base = resolve(dir);
  const scripts = new Set();
  const styles = new Set();
  const problems = [];
  for (const full of walk(base)) {
    if (!full.toLowerCase().endsWith('.html')) continue;
    const rel = relative(base, full).split(sep).join('/');
    const html = readFileSync(full, 'utf8');
    for (const item of unhashable(html)) problems.push(`${rel}: ${item}`);
    const blocks = inlineBlocks(html);
    blocks.scripts.forEach((hash) => scripts.add(hash));
    blocks.styles.forEach((hash) => styles.add(hash));
  }
  return { scripts: [...scripts].sort(), styles: [...styles].sort(), problems };
}

/**
 * Sets script-src and style-src of a policy to 'self' plus the given hashes, leaving every other directive as it is.
 */
export function applyHashes(policy, scripts, styles) {
  const wanted = { 'script-src': scripts, 'style-src': styles };
  const seen = new Set();
  const parts = policy.split(';').map((part) => {
    const trimmed = part.trim();
    const name = trimmed.split(/\s+/)[0];
    if (!(name in wanted)) return trimmed;
    seen.add(name);
    return [name, "'self'", ...wanted[name]].join(' ');
  });
  for (const name of Object.keys(wanted)) {
    if (!seen.has(name)) throw new Error(`the policy has no ${name} directive`);
  }
  return parts.filter((part) => part !== '').join('; ');
}

/**
 * Reads the policy directive sources of a policy; null when the directive is absent.
 */
export function directiveSources(policy, name) {
  const part = policy.split(';').map((item) => item.trim()).find((item) => item === name || item.startsWith(`${name} `));
  return part === undefined ? null : part.split(/\s+/).slice(1);
}

/**
 * Reads the Content-Security-Policy of a host file's text, decoding XML entities in web.config.
 */
export function readPolicy(name, text) {
  const host = HostFiles.find((item) => item.name === name);
  const found = host.pattern.exec(text);
  return found === null ? null : host.decode(found[2]);
}

/**
 * Rewrites the policy of both host files in a folder; returns the policy written.
 */
export function rewriteFolder(dir) {
  const base = resolve(dir);
  if (!existsSync(base) || !statSync(base).isDirectory()) throw new Error(`${dir}: folder does not exist`);
  const { scripts, styles, problems } = collectHashes(base);
  if (problems.length > 0) throw new Error(`a hash cannot cover:\n${problems.map((line) => `  ${line}`).join('\n')}`);
  const written = [];
  for (const host of HostFiles) {
    const file = join(base, host.name);
    if (!existsSync(file)) throw new Error(`${host.name}: missing in ${dir}`);
    const text = readFileSync(file, 'utf8');
    const found = host.pattern.exec(text);
    if (found === null) throw new Error(`${host.name}: no Content-Security-Policy`);
    const policy = applyHashes(host.decode(found[2]), scripts, styles);
    const encoded = host.encode(policy);
    writeFileSync(file, text.replace(host.pattern, (_all, head, _value, tail) => `${head}${encoded}${tail}`));
    written.push(policy);
  }
  if (written[0] !== written[1]) throw new Error('the two host files ended with different policies');
  return { policy: written[0], scripts, styles };
}

const invoked = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const dir = process.argv[2] ?? 'dist';
  try {
    const { scripts, styles } = rewriteFolder(dir);
    console.log(`csp-hashes: ${dir} policy rewritten; ${scripts.length} script hash(es), ${styles.length} style hash(es)`);
  } catch (error) {
    console.error(`csp-hashes: ${error.message}`);
    process.exit(1);
  }
}
