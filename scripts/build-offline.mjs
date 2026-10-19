import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export async function buildOffline(directory) {
  const root = resolve(directory);
  const files = [];
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = resolve(folder, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name !== 'sw.js' && !entry.name.startsWith('_') && !entry.name.endsWith('.map')) files.push(path);
    }
  }
  await walk(root);
  files.sort();
  const hash = createHash('sha256');
  for (const path of files) hash.update(relative(root, path)).update(await readFile(path));
  const template = await readFile(new URL('../src/offline/worker.js', import.meta.url), 'utf8');
  hash.update(template);
  const config = {
    cacheName: `color-by-number-app-${hash.digest('hex').slice(0, 16)}`,
    urls: files.map((path) => '/' + relative(root, path).split('\\').join('/')),
  };
  if (!config.urls.includes('/index.html')) throw new Error('Offline build requires index.html');
  await writeFile(resolve(root, 'sw.js'), template.replace('__OFFLINE_CONFIG__', JSON.stringify(config)));
  return config;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = await buildOffline('dist');
  console.log(`Offline cache: ${config.urls.length} files, ${config.cacheName}`);
}
