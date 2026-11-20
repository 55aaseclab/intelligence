import { access, lstat, readFile, realpath, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
const isWithin = (parent, child) => { const path = relative(resolve(parent), resolve(child)); return path === '' || (path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path)); };
const bind = (source, target, read_only) => ({ type: 'bind', source, target, read_only, bind: { create_host_path: false } });
export function createStackIntegration() { return {
services: [{ name: 'intelligence', port: 4330 }],
resolveRuntime(ctx) {   if (ctx.config.intelligencePreview !== undefined && typeof ctx.config.intelligencePreview !== 'boolean') throw new Error('intelligencePreview must be boolean.');
  const intelligencePreview = ctx.env.PRAXIS_INTELLIGENCE_PREVIEW ?? (ctx.config.intelligencePreview === false ? '0' : '1');
  if (!['0', '1'].includes(intelligencePreview)) throw new Error('PRAXIS_INTELLIGENCE_PREVIEW must be 0 or 1.');
 return { settings: { intelligencePreview }, fingerprint: { intelligencePreview } }; },
environment: ({ settings }) => ({ PRAXIS_INTELLIGENCE_PREVIEW: settings.intelligencePreview }),
async validateData({ settings }) { if (settings.workingPaths?.intelligence) { const directory = settings.workingPaths.intelligence, info = await lstat(directory).catch(() => null); if (!info?.isDirectory() || info.isSymbolicLink() || await realpath(directory) !== directory || info.uid !== Number(settings.uid)) throw new Error('Intelligence requires its existing canonical application directory.'); await access(directory, constants.R_OK); } if (settings.intelligencePreview === '0') { const root = settings.workingPaths?.intelligence; if (!root) throw new Error('Intelligence data mode requires its configured working directory.'); const file = join(root, 'intelligence.db'), info = await lstat(file).catch(() => null); if (!info?.isFile() || info.isSymbolicLink() || info.size === 0 || await realpath(file) !== file) throw new Error('Intelligence data mode requires an existing canonical intelligence.db.'); await access(file, constants.R_OK); } },
compose: ({ settings }) => ({ services: settings.workingPaths?.intelligence ? { intelligence: { environment: { INTELLIGENCE_DATA_DIR: '/data/intelligence' }, volumes: [bind(settings.workingPaths.intelligence, '/data/intelligence', true)] } } : {} })
}; }
