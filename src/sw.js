const CACHE_NAME = 'garden-v1';

// The build process automatically injects the list of assets to cache here.
const urlsToCache = self.__WB_MANIFEST;

self.addEventListener('install', (event) => {
  // Only pre-cache assets if this is a production build.
  if (import.meta.env.PROD) {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('Opened cache');
          return cache.addAll(urlsToCache);
        })
    );
  }
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    // Try to get from the network first.
    fetch(event.request)
      .then((response) => {
        // If we get a valid response and we are in production, add it to the cache for future use.
        if (response && response.status === 200 && response.type === 'basic' && import.meta.env.PROD) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, fall back to the cache.
        return caches.match(event.request);
      })
  );
});
