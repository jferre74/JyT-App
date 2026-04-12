// JyT App - Service Worker
// Cache version: bump this to force cache refresh after updates
const CACHE_NAME = 'jyt-app-v1';

// All assets to cache on install (app shell)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/state.js',
  './js/holidays.js',
  './js/calendar.js',
  './js/Notes.js',
  './js/expenses.js',
  './js/settings.js',
  './js/supabase.js',
  './js/sync.js',
  './js/main.js',
];

// ── Install: pre-cache the app shell ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ── Fetch: Network-first for API calls, Cache-first for assets ────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Let Supabase / external API calls go straight to network (no caching)
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('jsdelivr') ||
    url.hostname.includes('unpkg') ||
    url.protocol === 'chrome-extension:'
  ) {
    return; // Fall through to browser default (network)
  }

  // For local app assets: Cache-first, fall back to network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Not in cache — fetch from network and cache it
      return fetch(request)
        .then((networkResponse) => {
          // Only cache valid GET responses
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === 'opaque' ||
            request.method !== 'GET'
          ) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          // Offline fallback: serve index.html for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
