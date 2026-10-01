/* Service worker — Meus Treinos. Cache-first: o app abre e funciona sem internet.
   A lista abaixo é gerada por `npm run stamp` (scripts/stamp-sw.mjs). */
const VERSION = '3f4c47fe6f';
const CACHE = 'treinos-' + VERSION;
const PRECACHE = [/*PRECACHE_START*/'./', './css/app.css', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/icon.svg', './index.html', './js/app.js', './js/charts.js', './js/data/seed.js', './js/db.js', './js/figure/arts.js', './js/figure/kit.js', './js/figure/rig.js', './js/figure/scene.js', './js/importer.js', './js/main.js', './js/progression.js', './js/session.js', './js/stats.js', './js/store.js', './js/ui.js', './js/util.js', './js/views/activities.js', './js/views/calendar.js', './js/views/common.js', './js/views/evolution.js', './js/views/exercises.js', './js/views/home.js', './js/views/profile.js', './js/views/session.js', './js/views/suggestion.js', './js/views/wellbeing.js', './js/views/workouts.js', './js/visual.js', './manifest.webmanifest'/*PRECACHE_END*/];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('treinos-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // nada de terceiros
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      const shell = await cache.match(new URL('index.html', self.registration.scope).href);
      if (shell) return shell;
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (e) {
      if (req.mode === 'navigate') { const shell = await cache.match(new URL('index.html', self.registration.scope).href); if (shell) return shell; }
      return new Response('Sem conexão.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
