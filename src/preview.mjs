import { readFileSync } from 'node:fs';
import { validateSnapshot } from './schema.mjs';
const snapshot = validateSnapshot(JSON.parse(readFileSync(new URL('../fixtures/preview.json', import.meta.url), 'utf8')));
export const createPreviewSnapshot = () => structuredClone(snapshot);
export const previewSnapshot = createPreviewSnapshot();
