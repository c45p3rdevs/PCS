// sw.js — Cachea la app completa en la primera visita para que funcione 100% offline después.
const CACHE_NAME = 'res-fina-cache-v3';
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/chart.min.js',
  './js/db.js',
  './js/auth.js',
  './js/vistas.js',
  './js/app.js',
  './icons/logo4.png',
  './icons/logo5.png',
  './icons/logo6.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(nombres =>
      Promise.all(nombres.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Estrategia: Cache-First con actualización en segundo plano (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then(respuestaCache => {
      const redFetch = fetch(event.request).then(resp => {
        if (resp && resp.status === 200) {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
        }
        return resp;
      }).catch(() => respuestaCache);

      return respuestaCache || redFetch;
    })
  );
});