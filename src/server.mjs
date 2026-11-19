import { createServer } from 'node:http';
import { constants } from 'node:fs';
import { open, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { IntelligenceStore } from './store.mjs';
const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = new Map([['/', ['index.html', 'text/html; charset=utf-8']], ['/index.html', ['index.html', 'text/html; charset=utf-8']], ['/app.js', ['app.js', 'text/javascript; charset=utf-8']], ['/styles.css', ['styles.css', 'text/css; charset=utf-8']], ['/icon.svg', ['icon.svg', 'image/svg+xml']], ['/icons.svg', ['icons.svg', 'image/svg+xml']]]);
function send(response, status, value, head = false, headers = {}) { const bytes = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)); response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': bytes.length, ...headers }); response.end(head ? undefined : bytes); }
export function createIntelligenceServer({ store, dataDir, preview = false, publicDir = join(APP_ROOT, 'public'), fixtureFile } = {}) {
  store ??= new IntelligenceStore({ dataDir, preview, fixtureFile });
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('Content-Security-Policy', "default-src 'self';script-src 'self';style-src 'self' 'unsafe-inline';connect-src 'self';img-src 'self' data:;object-src 'none';base-uri 'self';form-action 'none'");
    const head = request.method === 'HEAD';
    try {
      if (!['GET', 'HEAD'].includes(request.method)) return send(response, 405, { code: 'METHOD_NOT_ALLOWED' }, false, { Allow: 'GET, HEAD', Connection: 'close' });
      const url = new URL(request.url, 'http://intelligence.invalid'); let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { return send(response, 400, { code: 'INVALID_URL' }, head); }
      if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) return send(response, 404, { code: 'NOT_FOUND' }, head);
      if (pathname.startsWith('/apps/intelligence/')) pathname = pathname.slice('/apps/intelligence'.length);
      if (pathname === '/api/intelligence' || pathname === '/health') {
        if (url.search) return send(response, 400, { code: 'INVALID_QUERY' }, head);
        const snapshot = await store.read();
        return send(response, 200, pathname === '/health' ? { status: 'ok', appId: 'intelligence', version: '0.1.0', dataMode: snapshot.preview ? 'preview' : 'configured' } : snapshot, head);
      }
      if (pathname === '/favicon.ico') { response.writeHead(204); return response.end(); }
      const asset = assets.get(pathname); if (!asset) return send(response, 404, { code: 'NOT_FOUND' }, head);
      let handle;
      try {
        const root = await realpath(publicDir), target = join(root, asset[0]);
        if (relative(root, await realpath(target)) !== asset[0]) return send(response, 404, { code: 'NOT_FOUND' }, head);
        handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW); const info = await handle.stat();
        if (!info.isFile() || info.size > 2 * 1024 * 1024) return send(response, 404, { code: 'NOT_FOUND' }, head);
        const bytes = await handle.readFile(), headers = { 'Content-Type': asset[1], 'Content-Length': bytes.length };
        if (asset[1].startsWith('image/')) {
          const etag = '"' + createHash('sha256').update(bytes).digest('hex') + '"';
          Object.assign(headers, { 'Cache-Control': 'private, max-age=3600, must-revalidate', ETag: etag, 'Last-Modified': info.mtime.toUTCString() });
          const match = request.headers['if-none-match'];
          if (match ? match.split(',').some(value => value.trim() === '*' || value.trim().replace(/^W\//, '') === etag) : request.headers['if-modified-since'] && Date.parse(request.headers['if-modified-since']) >= Math.floor(info.mtimeMs / 1000) * 1000) { delete headers['Content-Length']; response.writeHead(304, headers); return response.end(); }
        }
        response.writeHead(200, headers); return response.end(head ? undefined : bytes);
      } catch (error) { if (['ENOENT', 'ENOTDIR', 'ELOOP'].includes(error.code)) return send(response, 404, { code: 'NOT_FOUND' }, head); throw error; }
      finally { await handle?.close(); }
    } catch (error) { return send(response, error.code === 'DATA_UNAVAILABLE' ? 503 : 500, { code: error.code === 'DATA_UNAVAILABLE' ? 'DATA_UNAVAILABLE' : 'INTERNAL_ERROR' }, head); }
  });
}
export function loadIntelligenceOptions(env = process.env, argv = process.argv.slice(2)) {
  if (env.INTELLIGENCE_PREVIEW !== undefined && !['0', '1'].includes(env.INTELLIGENCE_PREVIEW)) throw new Error('INTELLIGENCE_PREVIEW must be 0 or 1.');
  const options = { host: env.INTELLIGENCE_HOST || env.HOST || '127.0.0.1', port: env.INTELLIGENCE_PORT || env.PORT || '4330', preview: env.INTELLIGENCE_PREVIEW === '1', dataDir: env.INTELLIGENCE_DATA_DIR };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index]; if (flag === '--demo') { options.preview = true; continue; }
    if (!['--host', '--port', '--data-dir'].includes(flag) || !argv[index + 1]) throw new Error('Usage: npm start -- [--demo] [--host HOST] [--port PORT] [--data-dir DIRECTORY]');
    options[{ '--host': 'host', '--port': 'port', '--data-dir': 'dataDir' }[flag]] = argv[++index];
  }
  options.port = Number(options.port);
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535 || typeof options.host !== 'string' || !/^[a-zA-Z0-9.:-]+$/.test(options.host)) throw new Error('A valid host and port are required.');
  if (!options.preview && (!options.dataDir || !isAbsolute(options.dataDir))) throw new Error('Set INTELLIGENCE_DATA_DIR or explicitly enable preview mode.');
  return options;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const options = loadIntelligenceOptions(), server = createIntelligenceServer(options);
    server.on('error', () => { console.error('Intelligence server failed.'); process.exitCode = 1; });
    server.listen(options.port, options.host, () => console.log(`Intelligence listening on ${options.host}:${options.port}`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(); server.closeIdleConnections(); });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
