import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('fetch', (event) => {
  // Network-first, then cache.
  // This strategy ensures that the latest version is always fetched when online,
  // and the cached version is used only when offline.
  event.respondWith(
    caches.open('garden-cache-v1').then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        return cachedResponse || fetchPromise;
      });
    })
  );
});
