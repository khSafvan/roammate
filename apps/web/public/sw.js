/**
 * roammate Offline Service Worker
 * Provides 100% offline flight & itinerary access for travelers without connectivity.
 */

const CACHE_NAME = 'roammate-cache-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
];

// Install: Pre-cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Purge obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate for static assets, Network-First for HTML navigation
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Bypass service worker for edge API, auth, sync, web workers, and external cartography
  if (
    req.method !== 'GET' ||
    req.url.includes('/api/') ||
    req.url.includes('/auth/') ||
    req.url.includes('/sync/') ||
    req.destination === 'worker' ||
    req.url.includes('tiles.openfreemap.org') ||
    req.url.includes('project-osrm.org')
  ) {
    return;
  }

  // Navigation requests: Network-First with Cache fallback (offline SPA shell)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
