// Offline support. Same-origin GETs are cached as they are used; the app
// shell and its hashed assets are precached on install so the first visit
// already works offline. Bump CACHE to drop old files after a breaking change.
const CACHE = 'calm-games-v1';
const SCOPE = self.registration.scope;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const shell = [
        './',
        'manifest.webmanifest',
        'favicon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
      ];
      await cache.addAll(shell);
      // Precache the hashed JS/CSS the built index.html points to.
      const html = await (await fetch('./', { cache: 'reload' })).text();
      const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
      await cache.addAll(assets.map((a) => new URL(a, SCOPE).href));
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    // Network first so updates arrive; fall back to the cached shell offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(async () => (await caches.match('./')) ?? Response.error()),
    );
    return;
  }

  // Assets: cached copy first, refreshed in the background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit ?? Response.error());
      return hit ?? network;
    }),
  );
});
