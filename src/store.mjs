import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_SNAPSHOT_BYTES, validateSnapshot } from './schema.mjs';

export const APP_ROOT = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
export const PREVIEW_FILE = join(APP_ROOT, 'fixtures/preview.json');
const inside = (parent, child) => { const path = relative(parent, child); return path === '' || path !== '..' && !path.startsWith('../') && !isAbsolute(path); };
export class IntelligenceStore {
  constructor({ dataDir, preview = false, fixtureFile = PREVIEW_FILE } = {}) {
    if (typeof preview !== 'boolean') throw new Error('Preview mode must be boolean.');
    if (!preview && (typeof dataDir !== 'string' || !isAbsolute(dataDir) || resolve(dataDir) !== dataDir || /[\u0000-\u001f\u007f\\]/.test(dataDir) || inside(APP_ROOT, dataDir))) throw new Error('An absolute external intelligence data directory is required.');
    this.preview = preview; this.file = preview ? fixtureFile : join(dataDir, 'data.json');
  }
  async read() {
    let handle;
    try {
      const directory = dirname(this.file), parent = await lstat(directory);
      if (!parent.isDirectory() || parent.isSymbolicLink() || await realpath(directory) !== directory || !this.preview && parent.mode & 0o022) throw new Error('Unsafe data directory.');
      handle = await open(this.file, constants.O_RDONLY | constants.O_NOFOLLOW);
      const info = await handle.stat();
      if (!info.isFile() || info.nlink !== 1 || info.size <= 0 || info.size > MAX_SNAPSHOT_BYTES || !this.preview && info.mode & 0o022) throw new Error('Invalid data file.');
      const content = Buffer.alloc(MAX_SNAPSHOT_BYTES + 1); let length = 0;
      for (;;) { const part = await handle.read(content, length, content.length - length, null); length += part.bytesRead; if (!part.bytesRead || length === content.length) break; }
      if (length > MAX_SNAPSHOT_BYTES) throw new Error('Data file exceeds its size limit.');
      const value = validateSnapshot(JSON.parse(content.subarray(0, length).toString('utf8')));
      if (this.preview !== value.preview) throw new Error('Data mode differs from the configured mode.');
      return value;
    } catch { throw Object.assign(new Error('Intelligence data is unavailable.'), { code: 'DATA_UNAVAILABLE', status: 503 }); }
    finally { await handle?.close(); }
  }
}
