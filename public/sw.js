/* Butterfly pilot — service worker: оболочка, статика, офлайн-просмотр */
const VERSION = 'bf-php-v9';
const STATIC_CACHE = VERSION + '-static';
const API_CACHE = VERSION + '-api';

const PRECACHE = [
  '/', '/login.html', '/install.html',
  '/style.css', '/style.css?v=9', '/pilot.css', '/pilot.css?v=9',
  '/app.js', '/app.js?v=9', '/login.js', '/config.js', '/sw-register.js',
  '/manifest.webmanifest',
  '/icons/favicon-32.png', '/icons/icon-192.png', '/icons/icon-512.png',
  '/icons/maskable-512.png', '/icons/apple-touch-icon-180.png',
  '/assets/hero.jpg', '/assets/band.jpg', '/assets/paper.jpg',
  '/assets/fonts/jost-cyrillic.woff2',
  '/assets/fonts/jost-latin-ext.woff2',
  '/assets/fonts/jost-latin.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== STATIC_CACHE && k !== API_CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api.php/')) {
    event.respondWith(apiFetch(req));
    return;
  }
  if (req.mode === 'navigate') {
    event.respondWith(navFetch(req));
    return;
  }
  event.respondWith(staticFetch(req));
});

async function apiFetch(req) {
  const url = new URL(req.url);
  const apiPath = url.pathname.replace('/api.php/', '/api/');
  const cacheable = apiPath === '/api/state' || apiPath === '/api/me';
  if (!cacheable) return fetch(req);
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch (_) {
    const cache = await caches.open(API_CACHE);
    const cached = await cache.match(req);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('X-Offline', '1');
      return new Response(await cached.blob(), { status: 200, headers });
    }
    return new Response(JSON.stringify({ error: { code: 'OFFLINE', message: 'Нет сети' } }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Offline': '1' }
    });
  }
}

async function navFetch(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch (_) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = (await cache.match(req)) || (await cache.match('/')) || (await cache.match('/login.html'));
    if (cached) return cached;
    return new Response(
      '<!doctype html><html lang="ru"><meta charset="utf-8"><title>Нет сети — Butterfly</title>' +
      '<body style="font-family:system-ui;padding:40px;background:#e6dfe3;color:#3b3242">' +
      '<h1>Нет сети</h1><p>Открой приложение, когда появится подключение.</p></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function staticFetch(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (_) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}
