const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const MAX_SNAPSHOT_BYTES = 8 * 1024 * 1024;
const ID = /^[a-z][a-z0-9-]{0,79}$/;
const invalid = () => { throw Object.assign(new Error('Invalid intelligence snapshot.'), { code: 'INVALID_SNAPSHOT' }); };
const requireValue = value => { if (!value) invalid(); };
const shape = (value, required, optional = []) => requireValue(object(value) && required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key)));
function text(value, max = 4000, multiline = false) {
  requireValue(typeof value === 'string' && value.length > 0 && value.length <= max && value === value.trim() && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) && (multiline || !/[\r\n]/.test(value)) && !/<\/?[a-z][^>]*>/i.test(value));
}
const id = value => requireValue(typeof value === 'string' && ID.test(value));
const choice = (value, values) => requireValue(values.includes(value));
const list = (value, max, min = 0) => requireValue(Array.isArray(value) && value.length >= min && value.length <= max);
function ids(value, min = 0) { list(value, 100, min); value.forEach(id); requireValue(new Set(value).size === value.length); }
function day(value) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value));
  try { requireValue(new Date(value + 'T00:00:00.000Z').toISOString().slice(0, 10) === value); } catch { invalid(); }
}
function instant(value) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value));
  try { requireValue(new Date(value).toISOString() === value); } catch { invalid(); }
}
export function safeSourceUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || value !== value.trim() || /[\s\u0000-\u001f\u007f\\]/.test(value)) return false;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
function block(value) {
  requireValue(object(value));
  const required = { heading: ['type', 'text', 'level'], paragraph: ['type', 'text'], quote: ['type', 'text'], transcript: ['type', 'speaker', 'text', 'startSeconds'], comment: ['type', 'author', 'text', 'relation'] };
  requireValue(Object.hasOwn(required, value.type));
  shape(value, required[value.type], value.type === 'quote' ? ['attribution'] : []);
  text(value.text, 12000, true);
  if (value.type === 'heading') choice(value.level, [2, 3]);
  if (value.type === 'quote' && value.attribution !== undefined) text(value.attribution, 300);
  if (value.type === 'transcript') { text(value.speaker, 160); requireValue(Number.isInteger(value.startSeconds) && value.startSeconds >= 0 && value.startSeconds <= 86400); }
  if (value.type === 'comment') { text(value.author, 160); choice(value.relation, ['original', 'reply']); }
}
function material(value) {
  shape(value, ['id', 'collectionIds', 'type', 'title', 'summary', 'author', 'publishedAt', 'firstObservedAt', 'verification', 'source', 'objectIds', 'blocks'], ['paper', 'interview', 'comment', 'statements', 'verifiedAt']);
  id(value.id); ids(value.collectionIds, 1); choice(value.type, ['paper', 'interview', 'comment', 'blog']);
  text(value.title, 240); text(value.summary, 1200); text(value.author, 300); if (value.publishedAt !== null) day(value.publishedAt); if (value.firstObservedAt !== null) instant(value.firstObservedAt); if (value.verifiedAt !== undefined) day(value.verifiedAt); choice(value.verification, ['verified', 'unverified', 'corrected']);
  shape(value.source, ['name'], ['url']); text(value.source.name, 200); if (value.source.url !== undefined) requireValue(safeSourceUrl(value.source.url));
  ids(value.objectIds); list(value.blocks, 200, 1); value.blocks.forEach(block);
  if (value.statements !== undefined) { list(value.statements, 30); for (const statement of value.statements) { shape(statement, ['kind', 'text']); choice(statement.kind, ['fact', 'inference', 'unknown']); text(statement.text, 2000, true); } }
  if (value.type === 'paper') {
    shape(value.paper, ['authors'], ['doi', 'pdfUrl']); list(value.paper.authors, 40, 1); value.paper.authors.forEach(name => text(name, 160));
    if (value.paper.doi !== undefined) requireValue(typeof value.paper.doi === 'string' && /^10\.\d{4,9}\/[^\s<>]{1,200}$/.test(value.paper.doi));
    if (value.paper.pdfUrl !== undefined) requireValue(safeSourceUrl(value.paper.pdfUrl));
  } else requireValue(value.paper === undefined);
  if (value.type === 'interview') {
    shape(value.interview, ['participants'], ['durationSeconds']); list(value.interview.participants, 30, 1); value.interview.participants.forEach(name => text(name, 160));
    if (value.interview.durationSeconds !== undefined) { requireValue(Number.isInteger(value.interview.durationSeconds) && value.interview.durationSeconds > 0 && value.interview.durationSeconds <= 86400); requireValue(value.blocks.every(entry => entry.type !== 'transcript' || entry.startSeconds <= value.interview.durationSeconds)); }
  } else requireValue(value.interview === undefined);
  if (value.type === 'comment') { shape(value.comment, ['context'], ['replyTo']); text(value.comment.context, 4000, true); if (value.comment.replyTo !== undefined) text(value.comment.replyTo, 1000, true); }
  else requireValue(value.comment === undefined);
}
function entity(value) {
  shape(value, ['id', 'collectionIds', 'type', 'name', 'summary', 'fields', 'materialIds']);
  id(value.id); ids(value.collectionIds, 1); choice(value.type, ['organization', 'person', 'product', 'project']); text(value.name, 160); text(value.summary, 1200); ids(value.materialIds);
  shape(value.fields, [], ['category', 'form', 'deployment', 'license', 'price', 'checkedAt', 'status']);
  for (const key of ['category', 'form', 'deployment', 'license']) if (value.fields[key] !== undefined) text(value.fields[key], 300);
  if (value.fields.status !== undefined) choice(value.fields.status, ['available', 'retired', 'unknown']);
  if (value.fields.checkedAt !== undefined) day(value.fields.checkedAt);
  if (value.fields.price !== undefined) { const price = value.fields.price; shape(price, ['amount', 'currency', 'interval']); requireValue(Number.isFinite(price.amount) && price.amount >= 0 && price.amount <= 1e9); choice(price.currency, ['CNY', 'USD', 'EUR', 'CHF']); choice(price.interval, ['month', 'year', 'one_time', 'user_month']); }
}
export function validateSnapshot(value) {
  shape(value, ['schemaVersion', 'preview', 'updatedAt', 'collections', 'materials', 'objects', 'events']); requireValue(value.schemaVersion === 1 && typeof value.preview === 'boolean'); instant(value.updatedAt);
  list(value.collections, 100, 1); list(value.materials, 2000); list(value.objects, 2000); list(value.events, 4000);
  for (const collection of value.collections) { shape(collection, ['id', 'title', 'description', 'domain', 'monitoringState']); id(collection.id); text(collection.title, 160); text(collection.description, 1000); choice(collection.domain, ['security', 'market', 'case', 'mixed']); choice(collection.monitoringState, ['not_configured', 'active', 'paused']); }
  value.materials.forEach(material); value.objects.forEach(entity);
  for (const event of value.events) { shape(event, ['id', 'collectionIds', 'title', 'summary', 'kind', 'occurredAt', 'firstObservedAt', 'materialIds', 'objectIds']); id(event.id); ids(event.collectionIds, 1); text(event.title, 240); text(event.summary, 1200); choice(event.kind, ['new_material', 'object_changed', 'assessment_changed']); if (event.occurredAt !== null) day(event.occurredAt); if (event.firstObservedAt !== null) instant(event.firstObservedAt); ids(event.materialIds); ids(event.objectIds); requireValue(event.materialIds.length + event.objectIds.length > 0); }
  const indexes = {}, records = {};
  for (const key of ['collections', 'materials', 'objects', 'events']) { indexes[key] = new Set(value[key].map(item => item.id)); records[key] = new Map(value[key].map(item => [item.id, item])); requireValue(indexes[key].size === value[key].length); }
  for (const item of [...value.materials, ...value.objects, ...value.events]) {
    requireValue(item.collectionIds.every(key => indexes.collections.has(key)));
    if (item.objectIds) requireValue(item.objectIds.every(key => indexes.objects.has(key) && item.collectionIds.every(collection => records.objects.get(key).collectionIds.includes(collection))));
    if (item.materialIds) requireValue(item.materialIds.every(key => indexes.materials.has(key) && item.collectionIds.every(collection => records.materials.get(key).collectionIds.includes(collection))));
  }
  try { requireValue(Buffer.byteLength(JSON.stringify(value)) <= MAX_SNAPSHOT_BYTES); } catch { invalid(); }
  return value;
}
