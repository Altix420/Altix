const CACHE_NAME = 'altix-shell-v3';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/favicon.svg'];
const PRIVATE_PREFIXES = ['/rest/', '/auth/', '/functions/', '/storage/', '/graphql'];

const isShellDocument = (url) => url.pathname === '/' || url.pathname === '/index.html';
const isVersionedAsset = (url) => url.pathname.startsWith('/assets/');

const networkFirst = async (request, fallbackRequest) => {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(fallbackRequest ?? request, response.clone());
    }
    return response;
  } catch {
    return caches.match(fallbackRequest ?? request);
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (PRIVATE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === 'navigate' || isShellDocument(url)) {
    event.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  if (isVersionedAsset(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) =>
      cached ??
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }),
    ),
  );
});
