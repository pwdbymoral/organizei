const CACHE = 'organizei-public-shell-v1';
const PUBLIC_SHELL = ['/offline', '/manifest.webmanifest', '/icon.svg'];
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PUBLIC_SHELL))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (
    request.method !== 'GET' ||
    request.headers.has('cookie') ||
    new URL(request.url).origin !== self.location.origin
  )
    return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline')));
  }
});
