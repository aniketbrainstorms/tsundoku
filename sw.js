/* Tsundoku service worker — registered on Android only (see the head script in app.html).
   Stale-while-revalidate: the app opens instantly from cache and refreshes in the background,
   so a new deploy shows up on the launch after the one that downloaded it.
   Only the app's own files plus fonts/Supabase-JS are touched; every API call passes through. */
const CACHE = 'tsd-android-v1';
const CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const own = url.origin === self.location.origin;
  if (!own && !CDN_HOSTS.includes(url.hostname)) return;      // Supabase, Books API, Wikipedia… untouched
  if (own && url.pathname.endsWith('/sw.js')) return;
  const isNav = req.mode === 'navigate';
  if (own && !isNav && url.search) return;                     // cache-busted icons etc.
  event.respondWith(staleWhileRevalidate(event, req, isNav));
});

async function staleWhileRevalidate(event, req, isNav) {
  const cache = await caches.open(CACHE);
  // ?shelf=slug and OAuth ?code= launches share the one cached app.html
  const key = isNav ? new Request(req.url.split('#')[0].split('?')[0]) : req;
  const cached = await cache.match(key);

  const refresh = fetch(isNav ? key.url : req, { cache: 'no-cache' })
    .then(res => {
      // a redirected response can't be served to a navigation
      if (res && !res.redirected && (res.ok || res.type === 'opaque')) cache.put(key, res.clone());
      return res;
    })
    .catch(() => null);

  if (cached) { event.waitUntil(refresh); return cached; }
  return (await refresh) || Response.error();
}
