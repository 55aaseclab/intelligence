import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { createPreviewSnapshot } from '../src/preview.mjs';
import { validateSnapshot, safeSourceUrl } from '../src/schema.mjs';
import { IntelligenceStore, APP_ROOT } from '../src/store.mjs';
import { createIntelligenceServer, loadIntelligenceOptions } from '../src/server.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
async function temporary(t) { const root = await mkdtemp(join(tmpdir(), 'intelligence-')); t.after(() => rm(root, { recursive: true, force: true })); return root; }
async function listening(t, options = {}) { const server = createIntelligenceServer({ preview: true, ...options }); server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); }); return 'http://127.0.0.1:' + server.address().port; }
function configured() { const value = createPreviewSnapshot(); value.preview = false; return value; }

test('preview has every material mode and crosslinked catalog, entities and changes', () => {
  const value = createPreviewSnapshot(); assert.equal(validateSnapshot(value), value);
  assert.deepEqual(new Set(value.materials.map(material => material.type)), new Set(['paper', 'interview', 'comment', 'blog']));
  assert.equal(value.objects.filter(object => object.type === 'product').length, 1);
  assert.ok(value.collections.every(collection => collection.monitoringState === 'not_configured'));
  value.materials[0].title = 'changed'; assert.notEqual(createPreviewSnapshot().materials[0].title, 'changed');
});
test('strict typed schema rejects unexpected fields, invalid dates, markup and invented references', () => {
  const changes = [value => { value.layout = '<div />'; }, value => { value.materials[0].blocks[0].html = '<b>text</b>'; }, value => { value.materials[0].title = '<script>alert(1)</script>'; }, value => { value.materials[0].publishedAt = '2026-02-30'; }, value => { value.objects[0].fields.price = '每月五十元'; }, value => { value.events[0].objectIds = ['missing-object']; }, value => { value.materials[0].collectionIds = ['missing-collection']; }, value => { value.materials.push(structuredClone(value.materials[0])); }, value => { value.materials[0].interview = { participants: ['not-a-paper'] }; }, value => { value.materials[1].blocks.find(block => block.type === 'transcript').startSeconds = 9999; }, value => { value.materials[0].statements = [{ kind: 'certain', text: 'unsupported' }]; }, value => { value.objects[0].fields.price = { amount: -1, currency: 'CNY', interval: 'month' }; }];
  for (const change of changes) { const value = createPreviewSnapshot(); change(value); assert.throws(() => validateSnapshot(value), { code: 'INVALID_SNAPSHOT' }); }
});
test('historical and unknown dates retain their meaning, with optional verification time', () => {
  const value = createPreviewSnapshot(); value.materials[0].publishedAt = '1999-03-01'; value.materials[0].verifiedAt = '2026-11-18'; value.materials[1].publishedAt = null; value.materials[1].firstObservedAt = null; value.events[0].occurredAt = null; value.events[0].firstObservedAt = null;
  assert.equal(validateSnapshot(value), value); assert.equal(value.materials[1].publishedAt, null);
});
test('references cannot expose an object or material from another collection', () => {
  const value = createPreviewSnapshot(); value.materials[0].objectIds = ['sample-gauge'];
  assert.throws(() => validateSnapshot(value), { code: 'INVALID_SNAPSHOT' });
  const other = createPreviewSnapshot(); other.objects.find(object => object.id === 'sample-workshop').materialIds = ['sample-blog'];
  assert.throws(() => validateSnapshot(other), { code: 'INVALID_SNAPSHOT' });
});
test('source links require credential-free HTTP and unknown values stay omitted', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'https://u:p@example.com/file', 'https://example.com/\nsecret', '/local/file', 'file:///private/file']) assert.equal(safeSourceUrl(value), false);
  assert.equal(safeSourceUrl('https://example.com/paper?q=one#section'), true);
  const value = createPreviewSnapshot(); value.materials[0].paper.pdfUrl = 'https://example.com/paper.pdf'; value.materials[0].paper.doi = '10.12345/paper.001'; assert.equal(validateSnapshot(value), value);
  assert.equal(Object.hasOwn(createPreviewSnapshot().objects[0].fields, 'price'), false);
});
test('configured storage reads current bytes and never rewrites the input', async t => {
  const root = await temporary(t), file = join(root, 'data.json'); await writeFile(file, JSON.stringify(configured()), { mode: 0o600 });
  const before = hash(await readFile(file)), store = new IntelligenceStore({ dataDir: root, fixtureFile: file });
  assert.equal((await store.read()).preview, false); assert.equal(hash(await readFile(file)), before);
  const next = configured(); next.collections[0].title = '新版资料'; await writeFile(file, JSON.stringify(next), { mode: 0o600 });
  assert.equal((await store.read()).collections[0].title, '新版资料');
});
test('missing, malformed and wrong-mode data fail without seeding a store', async t => {
  const root = await temporary(t), file = join(root, 'data.json'), store = new IntelligenceStore({ dataDir: root });
  await assert.rejects(store.read(), { code: 'DATA_UNAVAILABLE' }); await assert.rejects(readFile(file), { code: 'ENOENT' });
  await writeFile(file, '{invalid', { mode: 0o600 }); await assert.rejects(store.read(), { code: 'DATA_UNAVAILABLE' });
  await writeFile(file, JSON.stringify(createPreviewSnapshot()), { mode: 0o600 }); await assert.rejects(store.read(), { code: 'DATA_UNAVAILABLE' });
  assert.equal(await readFile(file, 'utf8'), JSON.stringify(createPreviewSnapshot()));
});
test('storage rejects source-coupled, relative, writable and aliased data paths', async t => {
  assert.throws(() => new IntelligenceStore({ dataDir: 'relative' })); assert.throws(() => new IntelligenceStore({ dataDir: join(APP_ROOT, 'data') }));
  const root = await temporary(t), real = join(root, 'real'), alias = join(root, 'alias'); await mkdir(real, { mode: 0o700 });
  await writeFile(join(real, 'data.json'), JSON.stringify(configured()), { mode: 0o600 }); await symlink(real, alias);
  await assert.rejects(new IntelligenceStore({ dataDir: alias }).read(), { code: 'DATA_UNAVAILABLE' });
  await chmod(join(real, 'data.json'), 0o666); await assert.rejects(new IntelligenceStore({ dataDir: real }).read(), { code: 'DATA_UNAVAILABLE' });
});
test('explicit preview never opens or seeds a configured working directory', async t => {
  const root = await temporary(t), absent = join(root, 'not-created');
  const store = new IntelligenceStore({ preview: true, dataDir: absent }); assert.equal((await store.read()).preview, true);
  await assert.rejects(readFile(join(absent, 'data.json')), { code: 'ENOENT' });
});
test('CLI configuration requires an explicit mode and valid bounded port', () => {
  assert.throws(() => loadIntelligenceOptions({}, []));
  assert.throws(() => loadIntelligenceOptions({ INTELLIGENCE_PREVIEW: 'false' }, []));
  assert.throws(() => loadIntelligenceOptions({}, ['--demo', '--port', '0']));
  assert.throws(() => loadIntelligenceOptions({}, ['--demo', '--unknown']));
  const value = loadIntelligenceOptions({ INTELLIGENCE_DATA_DIR: '/private/data/intelligence' }, ['--demo', '--host', '127.0.0.1']);
  assert.equal(value.preview, true); assert.equal(value.port, 4330); assert.equal(value.host, '127.0.0.1');
});
test('HTTP serves only readonly typed data in standalone and prefixed paths', async t => {
  const base = await listening(t);
  for (const path of ['/api/intelligence', '/apps/intelligence/api/intelligence']) { const response = await fetch(base + path); assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /no-store/); assert.equal((await response.json()).materials.length, 4); }
  const head = await fetch(base + '/api/intelligence', { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(await head.text(), '');
  const health = await fetch(base + '/health'); assert.deepEqual(await health.json(), { status: 'ok', appId: 'intelligence', version: JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version, dataMode: 'preview' });
  for (const method of ['POST', 'PATCH', 'DELETE', 'PUT']) { const response = await fetch(base + '/api/intelligence', { method, body: '{}' }); assert.equal(response.status, 405); assert.match(response.headers.get('allow'), /GET/); }
  assert.equal((await fetch(base + '/api/intelligence?file=anything')).status, 400);
  assert.equal((await fetch(base + '/fixtures/preview.json')).status, 404);
});
test('HTTP unavailable data produces safe 503 and health does not claim readiness', async t => {
  const root = await temporary(t), base = await listening(t, { preview: false, dataDir: root });
  for (const path of ['/api/intelligence', '/health']) { const response = await fetch(base + path); assert.equal(response.status, 503); assert.deepEqual(await response.json(), { code: 'DATA_UNAVAILABLE' }); assert.match(response.headers.get('cache-control'), /no-store/); }
});
test('static serving is contained and image cache validators survive revalidation and replacement', async t => {
  const root = await temporary(t), publicDir = join(root, 'public'); await mkdir(publicDir); await writeFile(join(publicDir, 'index.html'), '<!doctype html><title>Intelligence</title>'); await writeFile(join(publicDir, 'icon.svg'), '<svg>one</svg>');
  const base = await listening(t, { publicDir });
  const html = await fetch(base + '/'); assert.equal(html.status, 200); assert.match(html.headers.get('content-type'), /text\/html/); assert.equal(html.headers.get('cache-control'), 'no-store');
  const first = await fetch(base + '/icon.svg'), etag = first.headers.get('etag'); assert.equal(first.status, 200); assert.match(first.headers.get('cache-control'), /private, max-age=3600/); assert.ok(etag); await first.arrayBuffer();
  const fresh = await fetch(base + '/icon.svg', { headers: { 'If-None-Match': 'W/' + etag } }); assert.equal(fresh.status, 304); assert.equal(await fresh.text(), ''); assert.equal(fresh.headers.get('content-length'), null);
  const miss = await fetch(base + '/icon.svg', { headers: { 'If-None-Match': '"different"', 'If-Modified-Since': 'Wed, 01 Jan 2099 00:00:00 GMT' } }); assert.equal(miss.status, 200); await miss.arrayBuffer();
  await writeFile(join(publicDir, 'icon.svg'), '<svg>two</svg>'); const replaced = await fetch(base + '/icon.svg'); assert.notEqual(replaced.headers.get('etag'), etag); await replaced.arrayBuffer();
  await writeFile(join(root, 'private.js'), 'private'); await symlink(join(root, 'private.js'), join(publicDir, 'app.js'));
  assert.equal((await fetch(base + '/app.js')).status, 404);
  assert.equal((await fetch(base + '/%2e%2e/fixtures/preview.json')).status, 404);
});

test('product availability is typed instead of arbitrary status prose', () => {
  const data = createPreviewSnapshot();
  const product = data.objects.find(object => object.type === 'product');
  product.fields.status = 'available';
  assert.equal(validateSnapshot(data).objects.find(object => object.id === product.id).fields.status, 'available');
  product.fields.status = 'agent supplied status prose';
  assert.throws(() => validateSnapshot(data), { code: 'INVALID_SNAPSHOT' });
});
