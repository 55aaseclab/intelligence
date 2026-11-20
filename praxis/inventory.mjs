import { join } from 'node:path';
export function projectInventory({id,config,working,workspaceId,storage,reminderSpaces,slidesSpaces,polaris,financeMounts,financeProjectName,intelligenceRuntime,locations,add,file,source,safePath,paths,object}) {

      if(intelligenceRuntime?.hostPath) add({label:'情报集与材料',kind:'sqlite',hostPath:join(intelligenceRuntime.hostPath,'intelligence.db'),containerPath:'/data/intelligence/intelligence.db'});
      else if (intelligenceRuntime?.preview === true) source('只读预览材料', 'fixtures/preview.json', '应用自带合成材料，用于界面预览；正式业务文件尚未启用。');
      else if (intelligenceRuntime?.preview === false && safePath(intelligenceRuntime.hostPath)) add({ label: '情报集与材料', kind: 'sqlite', hostPath: join(intelligenceRuntime.hostPath, 'intelligence.db'), containerPath: '/data/intelligence/intelligence.db' });
      else add({ label: '情报数据', kind: 'unknown', description: '运行模式或正式数据挂载尚未核验。' });
}

export async function inspectInventory(storage, runDocker, safePath) {
  const project = process.env.PRAXIS_COMPOSE_PROJECT || (typeof storage?.workspaceId === 'string' ? `praxis-${storage.workspaceId.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}` : null);
  if (!project || !/^[a-z0-9][a-z0-9_-]{0,120}$/.test(project)) return undefined;
  try {
    const ids = String(await runDocker(['ps', '--all', '--filter', `label=com.docker.compose.project=${project}`, '--filter', 'label=com.docker.compose.service=intelligence', '--format', '{{.ID}}'])).trim().split(/\s+/).filter(Boolean);
    if (ids.length !== 1 || !/^[a-f0-9]{12,64}$/.test(ids[0])) return undefined;
    const metadata = JSON.parse(await runDocker(['inspect', '--format', '{"environment":{{json .Config.Env}},"mounts":{{json .Mounts}}}', ids[0]]));
    if (!Array.isArray(metadata.environment) || !Array.isArray(metadata.mounts)) return undefined;
    const modes = metadata.environment.filter(value => typeof value === 'string' && value.startsWith('INTELLIGENCE_PREVIEW='));
    if (modes.length !== 1 || !['INTELLIGENCE_PREVIEW=0', 'INTELLIGENCE_PREVIEW=1'].includes(modes[0])) return undefined;
    const dataMount=metadata.mounts.find(item=>item.Type==='bind'&&item.Destination==='/data/intelligence'&&item.RW===false&&safePath(item.Source));if(dataMount)return {preview:modes[0].endsWith('=1'),hostPath:dataMount.Source};
    if (modes[0].endsWith('=1')) return { preview: true };
    const mount = metadata.mounts.find(item => item.Type === 'bind' && item.Destination === '/data/intelligence' && item.RW === false && safePath(item.Source));
    return mount ? { preview: false, hostPath: mount.Source } : undefined;
  } catch { return undefined; }
}
