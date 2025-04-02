
// service-worker.js

const CACHE_NAME = 'pomodoro-pwa-cache-v1';
// List of files to cache initially
const urlsToCache = [
  '/',
  '/index.html', // Cache the main HTML file
  // Add paths to your CSS, JS, and icon files if they were separate
  // '/style.css',
  // '/script.js',
  '/manifest.json',
  'https://cdn.tailwindcss.com?plugins=forms', // Cache Tailwind CSS
  'https://cdn.jsdelivr.net/npm/lucide-static@latest/font/Lucide.ttf', // Cache Lucide font
  'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js', // Cache Tone.js
  'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400&display=swap', // Cache Google Font CSS
  // Add paths to actual icon files referenced in manifest.json
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
  // Note: Caching external font files loaded by Google Fonts CSS can be complex.
  // This basic setup might not cache the actual .woff2 files effectively without more advanced strategies.
];

// Install event: Cache core assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        // Use addAll for atomic caching
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Service Worker: Failed to cache initial assets:', error);
          // Optional: You might want to prevent the SW activation if core assets fail
          // throw error;
        });
      })
      .then(() => {
        console.log('Service Worker: Installation complete, skipping waiting.');
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete, claiming clients.');
      // Take control of all clients (open pages) immediately.
      return self.clients.claim();
    })
  );
});

// Fetch event: Serve cached content when offline, or fetch from network
self.addEventListener('fetch', event => {
  // console.log('Service Worker: Fetching ', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          // console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }

        // Not in cache - fetch from network
        // console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              // Don't cache opaque responses (like from CDNs without CORS) or errors
              // console.log('Service Worker: Not caching invalid response:', event.request.url);
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // console.log('Service Worker: Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error('Service Worker: Fetch failed; returning offline page instead.', error);
          // Optional: Return a fallback offline page if fetch fails
          // return caches.match('/offline.html'); // You'd need to cache an offline.html page
        });
      })
  );
});
