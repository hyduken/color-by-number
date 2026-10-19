const { cacheName, urls } = __OFFLINE_CONFIG__;
const prefix = 'color-by-number-app-';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    try {
      await cache.addAll(urls.map((url) => new Request(url, { cache: 'reload' })));
    } catch (error) {
      await caches.delete(cacheName);
      throw error;
    }
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(prefix) && key !== cacheName).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode !== 'navigate' && !urls.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    // Shipped files do not vary by Origin; module requests can add that header.
    return await cache.match(request.mode === 'navigate' ? '/index.html' : url.pathname, { ignoreVary: true }) || fetch(request);
  })());
});
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'OFFLINE_STATUS' || !event.ports[0]) return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(cacheName);
      const matches = await Promise.all(urls.map((url) => cache.match(url)));
      event.ports[0].postMessage({ ready: matches.every(Boolean) });
    } catch {
      event.ports[0].postMessage({ ready: false });
    }
  })());
});
