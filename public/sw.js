// Service worker mínimo: guarda la "cáscara" de la app para poder instalarla y abrirla offline.
// La API (/paquetes) siempre va a la red: los datos nunca se sirven de caché.
const CACHE = 'hubtohub-shell-v1';
const SHELL = ['/', '/css/app.css', '/js/app.js', '/img/logo-icono.svg', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/paquetes')) return;
  // Red primero; si falla, caché.
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request)));
});
