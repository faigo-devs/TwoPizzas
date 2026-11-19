import http from 'node:http';
import net from 'node:net';
import { existsSync, readFileSync, statSync, createReadStream } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

const HeaderPattern = /^\s*Header\s+always\s+set\s+(\S+)\s+"(.*)"\s*$/;

/**
 * Reads the response headers the host adds in a built .htaccess, as a list of name and value pairs.
 */
export function readHostHeaders(htaccessPath) {
  if (!existsSync(htaccessPath)) throw new Error(`no .htaccess at ${htaccessPath}`);
  const headers = [];
  for (const line of readFileSync(htaccessPath, 'utf8').split(/\r?\n/)) {
    const match = HeaderPattern.exec(line);
    if (match) headers.push([match[1], match[2]]);
  }
  return headers;
}

/**
 * Adapts the host's policy to a plain local server: drops upgrade-insecure-requests and adds the local socket origin to connect-src.
 */
export function localPolicy(policy, socketOrigin) {
  const directives = policy
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part !== '' && part !== 'upgrade-insecure-requests');
  let extended = false;
  const adapted = directives.map((directive) => {
    if (directive.startsWith('connect-src ')) {
      extended = true;
      return `${directive} ${socketOrigin}`;
    }
    return directive;
  });
  if (!extended) throw new Error('the policy has no connect-src directive');
  return adapted.join('; ');
}

function parseArguments(argv) {
  const values = { root: 'dist', port: '4410', 'upstream-port': '8797', host: '127.0.0.1' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) throw new Error(`unexpected argument ${argument}`);
    const name = argument.slice(2);
    if (!(name in values)) throw new Error(`unknown option ${argument}`);
    values[name] = argv[index + 1];
    index += 1;
  }
  return values;
}

/**
 * Starts the server and resolves with the Node server once it listens.
 */
export function startServer({ root, port, upstreamPort, host = '127.0.0.1' }) {
  const rootDirectory = resolve(root);
  const socketOrigin = `ws://${host}:${port}`;
  const hostHeaders = readHostHeaders(join(rootDirectory, '.htaccess')).map(([name, value]) =>
    name.toLowerCase() === 'content-security-policy' ? [name, localPolicy(value, socketOrigin)] : [name, value],
  );
  if (!hostHeaders.some(([name]) => name.toLowerCase() === 'content-security-policy')) {
    throw new Error('the built .htaccess carries no Content-Security-Policy');
  }

  function withHostHeaders(extra) {
    const headers = { ...extra };
    for (const [name, value] of hostHeaders) headers[name] = value;
    return headers;
  }

  function proxy(request, response) {
    const outgoing = http.request(
      { host, port: Number(upstreamPort), path: request.url, method: request.method, headers: request.headers },
      (upstream) => {
        response.writeHead(upstream.statusCode ?? 502, upstream.headers);
        upstream.pipe(response);
      },
    );
    outgoing.on('error', () => {
      response.writeHead(502, { 'content-type': 'text/plain' });
      response.end('bad gateway');
    });
    request.pipe(outgoing);
  }

  function serveFile(file, status, response) {
    response.writeHead(
      status,
      withHostHeaders({ 'content-type': MimeTypes[extname(file).toLowerCase()] ?? 'application/octet-stream', 'content-length': statSync(file).size }),
    );
    createReadStream(file).pipe(response);
  }

  function resolveFile(urlPath) {
    let decoded;
    try {
      decoded = decodeURIComponent(urlPath);
    } catch {
      return null;
    }
    const target = normalize(join(rootDirectory, decoded));
    if (target !== rootDirectory && !target.startsWith(rootDirectory + sep)) return null;
    if (existsSync(target) && statSync(target).isDirectory()) {
      const index = join(target, 'index.html');
      return existsSync(index) ? index : null;
    }
    return existsSync(target) ? target : null;
  }

  const server = http.createServer((request, response) => {
    const urlPath = (request.url ?? '/').split('?')[0];
    if (urlPath === '/api/room' || urlPath.startsWith('/api/room/')) {
      proxy(request, response);
      return;
    }
    const file = resolveFile(urlPath);
    if (file !== null) {
      serveFile(file, 200, response);
      return;
    }
    const notFound = join(rootDirectory, '404.html');
    if (existsSync(notFound)) {
      serveFile(notFound, 404, response);
      return;
    }
    response.writeHead(404, withHostHeaders({ 'content-type': 'text/plain' }));
    response.end('not found');
  });

  server.on('upgrade', (request, socket, head) => {
    const urlPath = (request.url ?? '/').split('?')[0];
    if (!urlPath.startsWith('/api/room/')) {
      socket.destroy();
      return;
    }
    const upstream = net.connect(Number(upstreamPort), host, () => {
      upstream.write(`${request.method} ${request.url} HTTP/1.1\r\n`);
      for (let index = 0; index < request.rawHeaders.length; index += 2) {
        upstream.write(`${request.rawHeaders[index]}: ${request.rawHeaders[index + 1]}\r\n`);
      }
      upstream.write('\r\n');
      if (head.length > 0) upstream.write(head);
      socket.pipe(upstream);
      upstream.pipe(socket);
    });
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
    upstream.on('close', () => socket.destroy());
    socket.on('close', () => upstream.destroy());
  });

  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(Number(port), host, () => resolveServer(server));
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const options = parseArguments(process.argv.slice(2));
  startServer({ root: options.root, port: options.port, upstreamPort: options['upstream-port'], host: options.host }).then(
    () => process.stdout.write(`serving ${resolve(options.root)} on http://${options.host}:${options.port}\n`),
    (error) => {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    },
  );
}
