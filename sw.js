// Offline működés: az app fájljait eltárolja, így internet nélkül is megnyílik.
// Online mindig a legfrissebb változatot tölti le (verziót nem kell kézzel emelni).
const CACHE = 'naplo-v3';
const FILES = ['./', './index.html', './edzes.html', './suly.html', './stats.html', './store.js', './nav.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) return; // szinkron: mindig élő
  if (url.origin === location.origin) {
    // előbb hálózat (így a frissítés magától megjön), offline a mentett változat
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }).catch(() => r)));
  }
});
