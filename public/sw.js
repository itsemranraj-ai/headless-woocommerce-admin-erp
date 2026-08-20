/**
 * FixionFuel PWA Service Worker
 *
 * Implements:
 * 1. Safe static asset caching for offline app shell resilience.
 * 2. Web Push notification display with FixionFuel branding.
 * 3. Notification click handler to open/focus target order details.
 *
 * PRIVACY & SECURITY:
 * Authenticated API routes and private customer/order data are NEVER cached here.
 */

const CACHE_NAME = 'fixionfuel-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

// Install Event - Pre-cache minimal app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Continue even if some optional assets fail to pre-cache
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean old caches
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
    })
  );
  self.clients.claim();
});

// Fetch Event - Network-first for dynamic content, cache fallback for static assets only
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API routes, mutations, or non-GET requests
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/orders/')
  ) {
    return;
  }

  // Static assets: Cache-first / Stale-while-revalidate
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.ico'
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        });
      })
    );
  }
});

// Push Event - Receive and show native push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'FixionFuel Order Alert';
    const options = {
      body: payload.body || 'New order update available.',
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/badge-72.png',
      tag: payload.tag || `order-${Date.now()}`,
      data: payload.data || { url: '/orders' },
      vibrate: [400, 150, 400, 150, 400],
      requireInteraction: true,
      renotify: true,
      timestamp: Date.now(),
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // Plain text fallback
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('FixionFuel Notification', {
        body: text,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        data: { url: '/orders' },
      })
    );
  }
});

// Notification Click Event - Focus or navigate to target order
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if an existing FixionFuel tab is already open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
