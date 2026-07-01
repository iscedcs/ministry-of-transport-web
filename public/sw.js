// public/sw.js
self.addEventListener('install', (event) => {
  // Force the waiting service worker to become active
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim any clients immediately, so the page is controlled without reload
  event.waitUntil(self.clients.claim());
});

// Cache static assets (optional, can be extended)
const CACHE_NAME = 'mot-pwa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add other essential assets here
];

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only handle GET requests for navigation or same-origin assets
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network first, fallback to cache
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// Push notification handling (basic)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const title = data.title || 'Notification';
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-192x192.png',
      data: data.url || '/',
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
