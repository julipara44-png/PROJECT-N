const CACHE_NAME = 'project-n-cache-v1';
const DATA_CACHE_NAME = 'project-n-data-cache-v1';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Intercept fetch requests and cache them for offline support
self.addEventListener('fetch', (evt) => {
  const url = new URL(evt.request.url);

  // Cache Supabase API requests for offline fallback
  if (url.origin.includes('supabase.co')) {
    evt.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(evt.request)
          .then((response) => {
            // Only cache successful GET requests
            if (response.status === 200 && evt.request.method === 'GET') {
              cache.put(evt.request.url, response.clone());
            }
            return response;
          })
          .catch((err) => {
            // If network fails, serve from cache
            return cache.match(evt.request);
          });
      })
    );
    return;
  }
  
  // For other requests, serve from cache if available, else fetch
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      return response || fetch(evt.request);
    })
  );
});
