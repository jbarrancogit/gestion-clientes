const CACHE_NAME = 'gestion-clientes-v1';
const ASSETS = [
  './', './index.html', './css/styles.css',
  './js/app.js', './js/db.js', './js/urgency.js', './js/import.js',
  './js/views/dashboard.js', './js/views/pipeline.js', './js/views/clientes.js',
  './js/views/prospectos.js', './js/views/reportes.js',
  './js/components/nav.js', './js/components/modal.js', './js/components/toast.js', './js/components/charts.js',
  './lib/dexie.min.js', './lib/chart.min.js', './lib/sortable.min.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
