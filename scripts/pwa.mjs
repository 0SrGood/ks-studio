import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'

const entries = (await readdir('dist', { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile())
  .map(entry => [entry.parentPath.replaceAll('\\', '/').slice(4), entry.name].filter(Boolean).join('/').replace(/^\//, ''))
  .filter(file => !/\.map$/.test(file)).sort()
const hash = createHash('sha256')
for (const entry of entries) hash.update(await readFile('dist/' + entry))
const version = hash.digest('hex').slice(0, 16)
const shell = entries.filter(file => /^(index\.html|manifest\.webmanifest|assets\/|icons\/|media\/(hero|monogram|logo|button))/.test(file))
await writeFile('dist/sw.js', `
const cacheName = 'studio-ks-${version}';
const scope = self.registration.scope;
const localFiles = new Set(${JSON.stringify(entries)}.map(file => new URL(file, scope).href));
self.addEventListener('install', event => event.waitUntil(
  caches.open(cacheName).then(cache => cache.addAll(${JSON.stringify(shell)}.map(file => new URL(file, scope)))).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('studio-ks-') && key !== cacheName).map(key => caches.delete(key)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  if (request.mode === 'navigate' && request.url.startsWith(scope)) {
    if (new URL(request.url).pathname === new URL('studio.html', scope).pathname) return;
    event.respondWith(fetch(request).catch(() => caches.open(cacheName).then(cache => cache.match(new URL('index.html', scope)))));
    return;
  }
  if (!localFiles.has(request.url)) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  }));
});
self.addEventListener('push', event => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }
  event.waitUntil(self.registration.showNotification('Studio Karyna Santos', {
    body: typeof payload.body === 'string' ? payload.body.slice(0, 180) : 'Você tem uma atualização no aplicativo.',
    icon: new URL('icons/icon-192.png', scope).href,
    data: { url: new URL('./#/perfil', scope).href },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(new URL('./#/perfil', scope).href));
});
`)
