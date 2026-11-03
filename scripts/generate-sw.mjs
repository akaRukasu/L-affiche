import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(path.join(dir, e.name)) : path.join(dir, e.name)))).flat();
}
const paths = (await files('dist')).filter(p => !p.endsWith('sw.js')).sort();
const hash = createHash('sha256');
for (const p of paths) hash.update(await readFile(p));
const version = hash.digest('hex').slice(0, 16);
const urls = paths.map(p => './' + path.relative('dist', p).replaceAll('\\', '/'));
await writeFile('dist/sw.js', `const CACHE = 'alaffiche-${version}';
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('alaffiche-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // The cache contains only our public static build. Ignore Vary: Origin from preview hosts
  // so module scripts requested with CORS also match entries populated by cache.addAll.
  event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request, {ignoreVary: true})).then(hit => hit || fetch(event.request).catch(error => {
    if(event.request.mode === 'navigate') return caches.match(new URL('./index.html', self.registration.scope).href);
    throw error;
  })));
});
`);
console.log(`Service worker : ${urls.length} fichiers, cache ${version}`);
