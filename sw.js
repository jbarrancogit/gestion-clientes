const CACHE_NAME = 'gestion-clientes-v3';
const ASSETS = [
  './', './index.html', './css/styles.css',
  './js/app.js', './js/db.js', './js/urgency.js', './js/import.js',
  './js/sync.js', './js/firebase-config.js',
  './js/views/dashboard.js', './js/views/pipeline.js', './js/views/clientes.js',
  './js/views/prospectos.js', './js/views/reportes.js',
  './js/components/nav.js', './js/components/modal.js', './js/components/toast.js',
  './js/components/charts.js', './js/components/settings.js',
  './lib/dexie.min.js', './lib/chart.min.js', './lib/sortable.min.js',
  './lib/firebase-app-compat.js', './lib/firebase-auth-compat.js', './lib/firebase-firestore-compat.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('firebaseio.com') || url.hostname.includes('firebase.com')) {
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
