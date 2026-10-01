// ============================================================
// SERVICE WORKER - eBukitSultan
// Versi: 1.0.2
// Optimized for performance and stability
// ============================================================

const CACHE_NAME = 'ebukitsultan-v1.0.2';
const OFFLINE_URL = '/offline.html';

// Aset kritis saja, agar install ringan dan tidak memblok
const ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', function(event) {
  console.log('🔄 Service Worker: Install');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Service Worker: Caching critical assets...');
        return cache.addAll(ASSETS);
      })
      .then(function() {
        console.log('✅ Service Worker: Critical assets cached');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('❌ Service Worker: Cache failed:', error);
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('🔄 Service Worker: Activate');

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    }).then(function() {
      console.log('✅ Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // NAVIGASI: prioritize network, fallback offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, cloned);
            });
          }
          return response;
        })
        .catch(function() {
          console.log('📡 Service Worker: Offline fallback');
          return caches.match(OFFLINE_URL) || Response.error();
        })
    );
    return;
  }

  // API / data requests: network first, then cache
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, cloned);
            });
          }
          return response;
        })
        .catch(function() {
          return caches.match(event.request) || Response.error();
        })
    );
    return;
  }

  // Aset statis: cache-first, fallback network
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then(function(networkResponse) {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, cloned);
          });

          return networkResponse;
        })
        .catch(function() {
          if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
            return caches.match('/icons/icon-192.png') || Response.error();
          }
          return Response.error();
        });
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data && event.data.action === 'updateCache') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.addAll(ASSETS);
      })
    );
  }
});

self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'eBukitSultan';
    const options = {
      body: data.body || 'Ada notifikasi baru',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'default',
      data: data.data || {},
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('❌ Service Worker: Push notification error:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
      return null;
    })
  );
});

console.log('✅ Service Worker: eBukitSultan loaded');
console.log('📦 Cache Name:', CACHE_NAME);
console.log('📡 Offline URL:', OFFLINE_URL);
