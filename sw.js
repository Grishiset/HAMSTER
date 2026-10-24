/* Офлайн-кэш. Страница и скрипты: сначала сеть (свежая версия), без сети — сохранённая копия.
   Картинки и шрифты: из кэша, обновляются в фоне. */
const CACHE = 'hamster-v6';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './v8/'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const page = req.mode === 'navigate' || (url.origin === location.origin && /(\/|\.html|\.js|\.webmanifest)$/.test(url.pathname));
  if (page) {
    e.respondWith(caches.open(CACHE).then(cache => {
      const net = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
        if (res && res.ok) cache.put(req.url, res.clone());
        return res;
      });
      const wait = new Promise(r => setTimeout(r, 3500));
      return Promise.race([net.catch(() => null), wait]).then(res => {
        if (res && res.ok) return res;
        return cache.match(req, { ignoreSearch: true })
          .then(hit => hit || (req.mode === 'navigate' && !/\/v8\//.test(url.pathname) ? cache.match('./index.html') : null))
          .then(hit => hit || net);
      });
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(cache => cache.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  })));
});
