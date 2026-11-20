// Service worker mínimo: guarda la "cáscara" de la app para poder instalarla y abrirla offline.
// La API (/paquetes) siempre va a la red: los datos nunca se sirven de caché.
const CACHE = 'hubtohub-shell-v33';
const SHELL = ['/', '/css/app.css', '/js/app.js', '/js/paqueterias.js', '/js/tema.js', '/fonts/figtree-latin.woff2', '/fonts/fraunces-latin.woff2', '/img/logo-icono.svg', '/img/logo-marca.svg', '/img/hubi/hubi-tranquilo.webp', '/img/hubi/hubi-senalando.webp', '/img/hubi/hubi-saluda.webp', '/img/hubi/hubi-pulgar.webp', '/img/hubi/hubi-gorra.webp', '/manifest.json'];

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
  if (e.request.method !== 'GET' || url.origin !== location.origin || /^\/(paquetes|eventos|push|config|cuenta)/.test(url.pathname)) return;
  // Red primero; si falla, caché.
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request)));
});

// Notificaciones push: el servidor envía {titulo, cuerpo, url, tag}.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titulo: 'HubToHub', cuerpo: e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'HubToHub', {
    body: d.cuerpo || '',
    icon: '/img/icon-192.png',
    badge: '/img/icon-192.png',
    tag: d.tag,
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
    const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
    if (abierta) return abierta.focus().then((v) => v.navigate(destino));
    return self.clients.openWindow(destino);
  }));
});
