const language = localStorage.getItem('praxis.locale') === 'zh' ? 'zh-CN' : 'en';
function t(english, chinese, ...values) {
  return (language === 'en' ? english : chinese).replace(/\{(\d+)\}/g, (_, index) => String(values[index]));
}
document.documentElement.lang = language;
if (language === 'zh-CN') {
  for (const node of document.querySelectorAll('[data-zh]')) node.textContent = node.dataset.zh;
  for (const node of document.querySelectorAll('[data-zh-label]')) node.setAttribute('aria-label', node.dataset.zhLabel);
}
const languageButton = document.querySelector('#language');
if (languageButton) {
  languageButton.textContent = t('简体中文', 'English');
  languageButton.addEventListener('click', () => {
    const next = language === 'en' ? 'zh' : 'en';
    localStorage.setItem('praxis.locale', next);
    document.cookie = 'praxis_locale=' + next + '; Path=/; SameSite=Lax; Max-Age=31536000' + (location.protocol === 'https:' ? '; Secure' : '');
    location.reload();
  });
}

const main = document.querySelector('#main');
const navigation = document.querySelector('#navigation');
const materialTypes = { paper: t("Paper", "论文"), interview: t("Interview", "访谈"), comment: t("Comment", "评论"), blog: t("Blog", "博客") };
const objectTypes = { organization: t("Organization", "机构"), person: t("Person", "人物"), product: t("Product", "产品"), project: t("Project", "项目") };
const eventTypes = { new_material: t("New material", "新增材料"), object_changed: t("Entity changed", "对象变化"), assessment_changed: t("Assessment updated", "判断更新") };
const verificationNames = { verified: t("Verified", "已核验"), unverified: t("Unverified", "未核验"), corrected: t("Corrected", "已修正") };
const fieldNames = { status: t("Status", "状态"), category: t("Category", "类别"), form: t("Form", "形态"), deployment: t("Deployment", "部署方式"), license: t("License", "许可"), price: t("Price", "价格"), checkedAt: t("Verified on", "核验日期") };
const intervals = { month: t("month", "月"), year: t("year", "年"), one_time: t("purchase", "次"), user_month: t("person/month", "人／月") };
const icons = {
  changes: ['M12 3v3m0 12v3M3 12h3m12 0h3', 'M12 8v4l3 2', 'M5.6 5.6a9 9 0 1 1-2.3 8.3'],
  collection: ['M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  paper: ['M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z', 'M14 3v6h6M8 13h8M8 17h6'],
  interview: ['M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z', 'M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8'],
  comment: ['M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5z', 'M7 8h9M7 12h6'],
  blog: ['M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7', 'm12 12 7-7 3 3-7 7-4 1zM8 7h4M8 18h8'],
  search: ['M21 21l-5-5', 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0'],
  external: ['M14 3h7v7M21 3l-11 11', 'M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5'],
  back: ['m15 18-6-6 6-6'],
  organization: ['M4 21V7h16v14M8 7V3h8v4M9 21v-5h6v5M8 11h1m6 0h1'],
  person: ['M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2'],
  product: ['m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5'],
  project: ['M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 11h8M8 15h5'],
};
const state = { data: null, filters: new Map(), selections: new Map(), comparison: new Set(), returnFocus: null };
function node(tag, className = '', text) {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = String(text);
  return value;
}
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.65', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(key, value);
  for (const d of icons[name] || icons.collection) { const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', d); svg.append(path); }
  return svg;
}
function link(text, href, className = '') { const value = node('a', className, text); value.href = href; return value; }
function button(text, action, className = '') { const value = node('button', className, text); value.type = 'button'; value.addEventListener('click', action); return value; }
function date(value) {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return String(value).slice(0, 10).replaceAll('-', '.');
}
function shortDate(value) { const result = date(value); return result === '—' ? result : result.slice(5); }
function timestamp(value) { return value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat(language, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)) : '—'; }
function duration(value) { return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`; }
function safeUrl(value) {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
function sourceLink(text, value) {
  const href = safeUrl(value); if (!href) return null;
  const item = link(text, href, 'source-link'); item.target = '_blank'; item.rel = 'noopener noreferrer'; item.append(icon('external')); return item;
}
function meta(items) { const row = node('div', 'subtle-meta'); for (const item of items.filter(Boolean)) row.append(node('span', '', item)); return row; }
function empty(title, detail = '') { const value = node('div', 'empty-state'); value.append(node('strong', '', title)); if (detail) value.append(node('p', '', detail)); return value; }
function collectionUrl(id, view = 'materials') { return `#/collection/${encodeURIComponent(id)}/${view}`; }
function materialUrl(collectionId, id) { return collectionUrl(collectionId, `material/${encodeURIComponent(id)}`); }
function objectUrl(collectionId, id) { return collectionUrl(collectionId, `object/${encodeURIComponent(id)}`); }
function members(values, id) { return values.filter(value => value.collectionIds?.includes(id)); }
function firstCollection(value, preferred) { return value.collectionIds?.includes(preferred) ? preferred : value.collectionIds?.find(id => state.data.collections.some(collection => collection.id === id)); }
function filters(key) { if (!state.filters.has(key)) state.filters.set(key, { query: '', type: 'all' }); return state.filters.get(key); }
function selected(id) { if (!state.selections.has(id)) state.selections.set(id, new Set()); return state.selections.get(id); }
function readRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  try {
    if (parts[0] === 'collection' && parts[1]) {
      const view = parts[2] || 'materials';
      if (!['materials', 'objects', 'changes', 'material', 'object'].includes(view) || parts.length > 4 || (['material', 'object'].includes(view) ? parts.length !== 4 : parts.length > 3)) return { page: 'missing' };
      return { page: 'collection', collectionId: decodeURIComponent(parts[1]), view, id: parts[3] ? decodeURIComponent(parts[3]) : null };
    }
    if (!parts.length || parts[0] === 'collections' && parts.length === 1) return { page: 'collections' };
    return { page: parts[0] === 'changes' && parts.length === 1 ? 'changes' : 'missing' };
  } catch { return { page: 'missing' }; }
}
function heading(title, description = '') {
  const wrap = node('div', 'page-heading'), text = node('div');
  const h1 = node('h1', '', title); h1.tabIndex = -1;
  text.append(h1); if (description) text.append(node('p', '', description)); wrap.append(text);
  if (state.data.preview) wrap.append(node('span', 'preview-label', t("Preview space", "预览空间")));
  main.append(wrap); document.title = `${title} · Intelligence`;
}
function renderNavigation(route) {
  const primary = node('div', 'primary-navigation');
  for (const [id, title, name, count] of [['changes', t("Latest changes", "最新变化"), 'changes', state.data.events.length], ['collections', t("Collections", "情报集"), 'collection', state.data.collections.length]]) {
    const entry = link('', `#/${id}`, 'nav-entry'); const mark = node('span', 'nav-icon'); mark.append(icon(name));
    entry.append(mark, node('span', 'nav-label', title), node('span', 'nav-count', count));
    if (route.page === id) entry.setAttribute('aria-current', 'page'); primary.append(entry);
  }
  const group = node('div', 'collection-navigation');
  for (const collection of state.data.collections) {
    const entry = link('', collectionUrl(collection.id), 'nav-entry collection-link'); entry.dataset.domain = collection.domain;
    const mark = node('span', 'nav-icon'); mark.append(icon('collection'));
    entry.append(mark, node('span', 'nav-label', collection.title), node('span', 'nav-count', members(state.data.materials, collection.id).length));
    if (route.collectionId === collection.id) entry.setAttribute('aria-current', 'page');
    group.append(entry);
  }
  navigation.replaceChildren(primary);
  if (state.data.collections.length) navigation.append(node('div', 'nav-collection-label', t("Collections", "情报集")), group);
}
function collectionTabs(collection, active) {
  const tabs = node('nav', 'view-tabs'); tabs.setAttribute('aria-label', t("Collection views", "情报集视图"));
  for (const [id, title] of [['materials', t("Sources", "材料")], ['objects', t("Entities", "对象")], ['changes', t("Changes", "变化")]]) {
    const entry = link(title, collectionUrl(collection.id, id)); if (active === id) entry.setAttribute('aria-current', 'page'); tabs.append(entry);
  }
  main.append(tabs);
}
function renderCollections() {
  heading(t("Collections", "情报集"), t("Browse sources, entities and changes by topic.", "按主题积累材料，查看对象与变化。"));
  if (!state.data.collections.length) { main.append(empty(t("No collections yet", "还没有情报集"), t("Collections appear here when available.", "情报集就绪后会显示在这里。"))); return; }
  const list = node('div', 'collection-list');
  for (const collection of state.data.collections) {
    const row = link('', collectionUrl(collection.id), 'collection-row'); row.dataset.domain = collection.domain; row.setAttribute('aria-label', collection.title);
    const mark = node('span', 'collection-mark'); mark.append(icon('collection'));
    const body = node('div', 'collection-details'); body.append(node('h2', '', collection.title), node('p', '', collection.description));
    const materials = members(state.data.materials, collection.id), objects = members(state.data.objects, collection.id);
    const latest = [...materials].sort((a, b) => String(b.firstObservedAt || '').localeCompare(String(a.firstObservedAt || '')))[0];
    body.append(meta([t("Sources: {0}", "{0} 份材料", materials.length), t("Entities: {0}", "{0} 个对象", objects.length), latest ? t("Last added {0}", "最近收录 {0}", date(latest.firstObservedAt)) : null, collection.monitoringState === 'not_configured' ? t("Monitoring is off", "尚未启用持续跟踪") : collection.monitoringState === 'paused' ? t("Monitoring paused", "持续跟踪已暂停") : null]));
    row.append(mark, body, node('span', 'chevron', '›')); list.append(row);
  }
  main.append(list);
}
function createSearch(label, value, onInput) {
  const wrap = node('label', 'search-wrap'); wrap.append(icon('search'));
  const input = node('input'); input.type = 'search'; input.placeholder = label; input.value = value; input.setAttribute('aria-label', label);
  input.addEventListener('input', () => onInput(input.value)); wrap.append(input); return wrap;
}
function materialRow(material, collectionId) {
  const row = link('', materialUrl(collectionId, material.id), 'material-row');
  row.addEventListener('click', event => {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) state.returnFocus = material.id;
  });
  row.dataset.materialId = material.id; row.setAttribute('aria-label', material.title);
  const mark = node('span', `type-mark ${material.type}`); mark.append(icon(material.type));
  const body = node('div', 'material-content'); body.append(node('h2', '', material.title), node('p', 'material-summary', material.summary));
  body.append(meta([materialTypes[material.type], material.author, material.source?.name, date(material.publishedAt)]));
  row.append(mark, body); return row;
}
function renderMaterials(collection) {
  const values = members(state.data.materials, collection.id), filter = filters(`${collection.id}:materials`);
  const tools = node('div', 'section-tools'), chips = node('div', 'filter-group'); chips.setAttribute('aria-label', t("Source type", "材料类型"));
  const results = node('div'), note = node('p', 'result-note');
  const draw = () => {
    const query = filter.query.trim().toLocaleLowerCase();
    const matches = values.filter(value => (filter.type === 'all' || value.type === filter.type) && [value.title, value.summary, value.author, value.source?.name, ...value.objectIds.map(id => state.data.objects.find(object => object.id === id)?.name || '')].join(' ').toLocaleLowerCase().includes(query)).sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
    for (const chip of chips.children) chip.setAttribute('aria-pressed', String(chip.dataset.type === filter.type));
    note.textContent = t("Sources: {0}", "{0} 份材料", matches.length);
    const list = node('div', 'material-list');
    if (!matches.length) list.append(empty(values.length ? t("No matching sources", "没有找到相关材料") : t("No sources yet", "还没有收录材料"), values.length ? t("Try another keyword or source type.", "试试其他关键词或材料类型。") : t("Papers, interviews, blogs and comments appear here.", "收录的论文、访谈、博客和评论会显示在这里。")));
    for (const material of matches) list.append(materialRow(material, collection.id));
    results.replaceChildren(list);
  };
  tools.append(createSearch(t("Search sources, authors or publishers", "搜索材料、作者或来源"), filter.query, value => { filter.query = value; draw(); }));
  for (const [type, title] of [['all', t("All", "全部")], ...Object.entries(materialTypes)]) {
    const chip = button('', () => { filter.type = type; draw(); }); chip.dataset.type = type; chip.setAttribute('aria-label', title);
    chip.append(document.createTextNode(title), node('span', 'filter-count', type === 'all' ? values.length : values.filter(value => value.type === type).length)); chips.append(chip);
  }
  main.append(tools, chips, note, results); draw();
}
function fieldValue(object, key) {
  const value = object.fields?.[key];
  if (key === 'price' && value) return `${new Intl.NumberFormat(language, { style: 'currency', currency: value.currency, maximumFractionDigits: 2 }).format(value.amount)}／${intervals[value.interval] || ''}`;
  if (key === 'checkedAt') return date(value);
  if (key === 'status') return { available: t("Available", "可用"), retired: t("Retired", "已停用"), unknown: t("Unknown", "未知") }[value] || '—';
  return value || '—';
}
function renderComparison(collection, items, container, close) {
  const section = node('section', 'comparison'), title = node('div', 'comparison-heading');
  const back = button(t("Back to entities", "返回对象列表"), close, 'quiet-button');
  title.append(node('h2', '', t("Compare entities", "对象对比")), back); section.append(title);
  const scroll = node('div', 'table-scroll'), table = node('table', 'comparison-table'); table.setAttribute('aria-label', t("Compare entities", "对象对比"));
  const head = node('thead'), headRow = node('tr'); headRow.append(node('th', '', t("Attribute", "对比项")));
  for (const item of items) { const cell = node('th'); cell.scope = 'col'; cell.append(link(item.name, objectUrl(collection.id, item.id))); headRow.append(cell); }
  head.append(headRow); table.append(head);
  const body = node('tbody');
  for (const key of ['summary', ...Object.keys(fieldNames)]) {
    const row = node('tr'), label = node('th', '', key === 'summary' ? t("Overview", "概述") : fieldNames[key]); label.scope = 'row'; row.append(label);
    for (const item of items) row.append(node('td', '', key === 'summary' ? item.summary : fieldValue(item, key)));
    body.append(row);
  }
  table.append(body); scroll.append(table); section.append(scroll); container.replaceChildren(section);
  return back;
}
function renderObjects(collection) {
  const values = members(state.data.objects, collection.id), filter = filters(`${collection.id}:objects`), selection = selected(collection.id);
  const tools = node('div', 'section-tools'), results = node('div');
  let compareButton, selectionNote;
  const updateSelection = () => {
    compareButton.disabled = selection.size < 2; selectionNote.textContent = selection.size ? t("Selected {0} of up to 4 entities", "已选 {0} 个对象，最多选择 4 个", selection.size) : t("Select entities to compare them side by side", "选择对象，可并排查看差异");
    for (const input of results.querySelectorAll('input[data-object-id]')) input.disabled = selection.size >= 4 && !selection.has(input.dataset.objectId);
  };
  const draw = (moveFocus = false) => {
    if (state.comparison.has(collection.id) && selection.size >= 2) {
      const back = renderComparison(collection, values.filter(value => selection.has(value.id)), results, () => {
        state.comparison.delete(collection.id);
        draw();
        compareButton.focus();
      });
      if (moveFocus) back.focus();
      return;
    }
    const matches = values.filter(value => `${value.name} ${value.summary} ${objectTypes[value.type]} ${value.fields?.category || ''}`.toLocaleLowerCase().includes(filter.query.trim().toLocaleLowerCase()));
    const toolbar = node('div', 'object-toolbar'); selectionNote = node('span', 'selection-note');
    compareButton = button(t("Compare selected", "对比所选"), () => { state.comparison.add(collection.id); draw(true); }, 'quiet-button'); toolbar.append(selectionNote, compareButton);
    const scroll = node('div', 'table-scroll'), table = node('table', 'object-table'); table.setAttribute('aria-label', t("Entities", "对象列表"));
    const head = node('thead'), headings = node('tr');
    for (const text of ['', t("Entities", "对象"), t("Type", "类型"), t("Category / form", "类别／形态"), t("Status", "状态"), t("Verified on", "核验日期")]) { const cell = node('th', text ? '' : 'check-cell', text); cell.scope = 'col'; headings.append(cell); } head.append(headings); table.append(head);
    const body = node('tbody');
    for (const object of matches) {
      const row = node('tr'), checkCell = node('td', 'check-cell'), checkbox = node('input'); checkbox.type = 'checkbox'; checkbox.checked = selection.has(object.id); checkbox.dataset.objectId = object.id; checkbox.setAttribute('aria-label', t("Select {0}", "选择{0}", object.name));
      checkbox.addEventListener('change', () => { if (checkbox.checked && selection.size < 4) selection.add(object.id); else selection.delete(object.id); checkbox.checked = selection.has(object.id); updateSelection(); }); checkCell.append(checkbox);
      const name = node('td'); name.append(link(object.name, objectUrl(collection.id, object.id), 'object-name'), node('p', 'object-summary', object.summary));
      row.append(checkCell, name, node('td', 'object-type', objectTypes[object.type] || '—'), node('td', '', [object.fields?.category, object.fields?.form].filter(Boolean).join('／') || '—'), node('td', '', fieldValue(object, 'status')), node('td', '', date(object.fields?.checkedAt)));
      body.append(row);
    }
    table.append(body); scroll.append(table);
    results.replaceChildren(toolbar, matches.length ? scroll : empty(values.length ? t("No matching entities", "没有找到相关对象") : t("No linked entities yet", "还没有关联对象"), values.length ? t("Try another keyword.", "试试其他关键词。") : t("Related people, organizations, products and projects appear here.", "相关人物、机构、产品和项目会显示在这里。"))); updateSelection();
  };
  tools.append(createSearch(t("Search entities or categories", "搜索对象或类别"), filter.query, value => { filter.query = value; state.comparison.delete(collection.id); draw(); })); main.append(tools, results); draw();
}
function eventDestination(event, preferredCollection) {
  const material = state.data.materials.find(value => event.materialIds.includes(value.id));
  if (material) { const id = firstCollection(material, preferredCollection); if (id) return materialUrl(id, material.id); }
  const object = state.data.objects.find(value => event.objectIds.includes(value.id));
  if (object) { const id = firstCollection(object, preferredCollection); if (id) return objectUrl(id, object.id); }
  const collection = event.collectionIds.find(id => state.data.collections.some(value => value.id === id));
  return collection ? collectionUrl(collection, 'changes') : '#/changes';
}
function renderTimeline(events, collectionId) {
  if (!events.length) { main.append(empty(t("No changes yet", "还没有记录变化"), t("New sources and entity changes appear in chronological order.", "新材料与对象变化会按时间显示在这里。"))); return; }
  const timeline = node('div', 'timeline'), groups = new Map();
  for (const event of [...events].sort((a, b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || '')))) {
    if (!groups.has(event.occurredAt)) groups.set(event.occurredAt, []); groups.get(event.occurredAt).push(event);
  }
  for (const [when, values] of groups) {
    const group = node('section', 'timeline-group'), timestamp = node('time', 'timeline-date', shortDate(when)); if (when) timestamp.dateTime = when; timestamp.title = date(when); group.append(timestamp);
    const list = node('div', 'timeline-items');
    for (const event of values) {
      const item = node('article', 'event-item'); item.append(link(event.title, eventDestination(event, collectionId), 'event-title'), node('p', '', event.summary));
      const metadata = node('div', 'subtle-meta'); metadata.append(node('span', 'event-kind', eventTypes[event.kind] || t("Changes", "变化")));
      if (!collectionId) for (const id of event.collectionIds) { const collection = state.data.collections.find(value => value.id === id); if (collection) metadata.append(link(collection.title, collectionUrl(id))); }
      item.append(metadata); list.append(item);
    }
    group.append(list); timeline.append(group);
  }
  main.append(timeline);
}
function readerTrail(collection, view = 'materials') {
  const trail = node('nav', 'reader-trail'); trail.setAttribute('aria-label', t("Breadcrumb", "当前位置"));
  const back = link('', collectionUrl(collection.id, view)); back.append(icon('back'), document.createTextNode(view === 'objects' ? t("Back to entities", "返回对象列表") : t("Back to sources", "返回材料"))); trail.append(back, node('span', '', '／'), node('span', '', collection.title)); main.append(trail);
}
function detailSection(title) { const section = node('section', 'reader-section'); section.append(node('h2', '', title)); return section; }
function relatedMaterials(values, collectionId) {
  const list = node('ul', 'related-list');
  for (const material of values) { const item = node('li'), id = firstCollection(material, collectionId); if (id) item.append(link(material.title, materialUrl(id, material.id))); item.append(meta([materialTypes[material.type], material.author, date(material.publishedAt)])); list.append(item); }
  return list;
}
function renderStatements(material) {
  if (!material.statements?.length) return null;
  const section = detailSection(t("Facts and assessments", "事实与判断")), list = node('div', 'statement-list');
  for (const statement of material.statements) { const line = node('div', 'statement'); line.dataset.kind = statement.kind; line.append(node('span', 'statement-kind', { fact: t("Fact", "事实"), inference: t("Inference", "推断"), unknown: t("Unknown", "未知") }[statement.kind] || t("Record", "记录")), node('span', '', statement.text)); list.append(line); }
  section.append(list); return section;
}
function renderMaterial(collection, material) {
  readerTrail(collection);
  const reader = node('article', 'reader'); reader.dataset.readerType = material.type;
  const kind = node('div', 'reader-type'); kind.append(icon(material.type), document.createTextNode(materialTypes[material.type])); if (state.data.preview) kind.append(node('span', 'preview-label', t("Preview space", "预览空间")));
  const title = node('h1', 'reader-title', material.title); title.tabIndex = -1;
  reader.append(kind, title, meta([material.author, material.source?.name, t("Published {0}", "发布于 {0}", date(material.publishedAt))])); reader.lastElementChild.classList.add('reader-meta');
  const summary = node('div', 'reader-summary'); summary.append(node('p', '', material.summary)); reader.append(summary);
  const statements = renderStatements(material); if (statements) reader.append(statements);
  if (material.comment?.context) { const context = node('div', 'comment-context'); context.append(node('strong', '', t("Discussion context", "讨论上下文")), document.createTextNode(material.comment.context)); reader.append(context); }
  const headings = material.blocks.filter(block => block.type === 'heading');
  if (headings.length > 1) {
    const outline = node('details', 'outline'); outline.append(node('summary', '', t("Contents", "本文目录"))); const list = node('ol');
    for (const [index, block] of headings.entries()) { const item = node('li'); const entry = link(block.text, '#'); entry.addEventListener('click', event => { event.preventDefault(); const heading = document.getElementById(`body-heading-${index}`); heading.focus({ preventScroll: true }); heading.scrollIntoView({ behavior: 'auto', block: 'start' }); }); item.append(entry); list.append(item); } outline.append(list); reader.append(outline);
  }
  const body = node('div', 'reading-body'); let headingIndex = 0;
  for (const block of material.blocks) {
    if (block.type === 'heading') { const item = node(block.level === 3 ? 'h3' : 'h2', '', block.text); item.id = `body-heading-${headingIndex++}`; item.tabIndex = -1; body.append(item); }
    else if (block.type === 'paragraph') body.append(node('p', '', block.text));
    else if (block.type === 'quote') { const quote = node('blockquote'); quote.append(node('p', '', block.text)); if (block.attribution) quote.append(node('cite', '', block.attribution)); body.append(quote); }
    else if (block.type === 'transcript') { const line = node('div', 'transcript-line'), content = node('div', 'transcript-content'); content.append(node('span', 'transcript-speaker', block.speaker), node('p', '', block.text)); line.append(node('span', 'transcript-time', duration(block.startSeconds)), content); body.append(line); }
    else if (block.type === 'comment') { const comment = node('div', `comment-block ${block.relation === 'reply' ? 'reply' : ''}`); comment.append(node('strong', '', block.author), node('small', '', block.relation === 'reply' ? t("Reply", "回复") : t("Original post", "原帖")), node('p', '', block.text)); body.append(comment); }
  }
  reader.append(body);
  const objects = state.data.objects.filter(object => material.objectIds.includes(object.id) && object.collectionIds.includes(collection.id));
  if (objects.length) { const related = detailSection(t("Related entities", "关联对象")), list = node('ul', 'related-list'); for (const object of objects) { const item = node('li'); item.append(link(object.name, objectUrl(collection.id, object.id)), meta([objectTypes[object.type]])); list.append(item); } related.append(list); reader.append(related); }
  const source = detailSection(t("Source and history", "来源与记录")), facts = node('dl', 'reader-facts');
  const fields = [[t("Source", "来源"), material.source?.name || '—'], [t("Published", "发布时间"), date(material.publishedAt)], [t("First added", "首次收录"), timestamp(material.firstObservedAt)], [t("Verification", "核验状态"), verificationNames[material.verification] || '—']];
  if (material.verifiedAt) fields.push([t("Verified on", "核验日期"), date(material.verifiedAt)]);
  if (material.paper) { fields.unshift([t("Authors", "作者"), material.paper.authors.join('、')]); if (material.paper.doi) fields.push(['DOI', material.paper.doi]); }
  if (material.interview?.participants.length) fields.push([t("Participants", "访谈参与者"), material.interview.participants.join('、')]);
  if (material.interview?.durationSeconds) fields.push([t("Interview duration", "访谈时长"), duration(material.interview.durationSeconds)]);
  if (material.comment?.replyTo) fields.push([t("In reply to", "回应内容"), material.comment.replyTo]);
  for (const [name, value] of fields) facts.append(node('dt', '', name), node('dd', '', value));
  source.append(facts);
  const links = node('div', 'source-links');
  for (const entry of [sourceLink(t("Open original source", "打开原始来源"), material.source?.url), sourceLink(t("Read PDF", "阅读 PDF"), material.paper?.pdfUrl)]) if (entry) links.append(entry);
  if (links.children.length) source.append(links); reader.append(source); main.append(reader);
  document.title = `${material.title} · Intelligence`;
}
function renderObject(collection, object) {
  readerTrail(collection, 'objects');
  const reader = node('article', 'reader'); reader.dataset.objectId = object.id;
  const kind = node('div', 'reader-type'); kind.append(icon(object.type), document.createTextNode(objectTypes[object.type])); if (state.data.preview) kind.append(node('span', 'preview-label', t("Preview space", "预览空间")));
  const title = node('h1', 'reader-title', object.name); title.tabIndex = -1; const summary = node('div', 'reader-summary'); summary.append(node('p', '', object.summary)); reader.append(kind, title, summary);
  const facts = node('dl', 'reader-facts object-detail-fields');
  for (const [key, name] of Object.entries(fieldNames)) { if (object.fields?.[key] !== undefined) facts.append(node('dt', '', name), node('dd', '', fieldValue(object, key))); }
  if (facts.children.length) reader.append(facts);
  const materials = state.data.materials.filter(material => object.materialIds.includes(material.id));
  const source = detailSection(t("Related sources", "关联材料")); source.append(materials.length ? relatedMaterials(materials, collection.id) : empty(t("No linked sources yet", "尚未关联材料"))); reader.append(source);
  main.append(reader); document.title = `${object.name} · Intelligence`;
  const events = state.data.events.filter(event => event.objectIds.includes(object.id));
  if (events.length) { const changes = detailSection(t("Recent changes", "最近变化")); main.append(changes); renderTimeline(events, collection.id); }
}
function render() {
  if (!state.data) return;
  const route = readRoute(); renderNavigation(route); main.replaceChildren();
  if (route.page === 'collections') renderCollections();
  else if (route.page === 'changes') { heading(t("Latest changes", "最新变化"), t("New sources, entity changes and assessment updates.", "新材料、对象变化与判断更新。")); renderTimeline(state.data.events); }
  else if (route.page === 'collection') {
    const collection = state.data.collections.find(value => value.id === route.collectionId);
    if (!collection) { heading(t("Collection unavailable", "情报集不可用")); main.append(empty(t("Could not open this collection", "无法打开这个情报集"), t("Choose an available collection in the sidebar.", "请从左侧选择当前可访问的情报集。"))); }
    else if (route.view === 'material') {
      const material = state.data.materials.find(value => value.id === route.id && value.collectionIds.includes(collection.id));
      if (material) renderMaterial(collection, material); else { heading(t("Source unavailable", "材料不可用")); main.append(empty(t("Could not open this source", "无法打开这份材料"), t("This source may have been removed or belongs to another collection.", "材料可能已移除，或不在当前情报集中。"))); }
    } else if (route.view === 'object') {
      const object = state.data.objects.find(value => value.id === route.id && value.collectionIds.includes(collection.id));
      if (object) renderObject(collection, object); else { heading(t("Entity unavailable", "对象不可用")); main.append(empty(t("Could not open this entity", "无法打开这个对象"))); }
    } else {
      const view = ['materials', 'objects', 'changes'].includes(route.view) ? route.view : 'materials';
      heading(collection.title, collection.description); collectionTabs(collection, view);
      if (view === 'materials') renderMaterials(collection);
      else if (view === 'objects') renderObjects(collection);
      else renderTimeline(members(state.data.events, collection.id), collection.id);
    }
  } else { heading(t("Could not open", "无法打开")); main.append(empty(t("Page not found", "这个位置不存在"), t("Select a collection from the sidebar.", "请从左侧重新选择情报集。"))); }
  requestAnimationFrame(() => {
    const previous = route.page === 'collection' && route.view === 'materials' && state.returnFocus ? main.querySelector(`[data-material-id="${CSS.escape(state.returnFocus)}"]`) : null;
    (previous || main.querySelector('h1') || main).focus({ preventScroll: true });
    if (!previous) window.scrollTo({ top: 0 });
  });
}
async function load() {
  main.replaceChildren(node('div', 'loading-state', t("Loading intelligence…", "正在载入情报…")));
  try {
    const response = await fetch(new URL('api/intelligence', document.baseURI), { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('Snapshot unavailable.');
    const data = await response.json();
    if (data?.schemaVersion !== 1 || !['collections', 'materials', 'objects', 'events'].every(key => Array.isArray(data[key]))) throw new Error('Invalid snapshot.');
    state.data = data; render();
  } catch {
    state.data = null; navigation.replaceChildren(); const error = empty(t("Could not load intelligence", "暂时无法载入情报"), t("Check your connection and try again.", "请检查连接后重试。")); error.classList.add('error-state'); error.append(button(t("Reload", "重新载入"), load)); main.replaceChildren(error);
  }
}
document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); main.focus(); });
window.addEventListener('hashchange', render);
load();
