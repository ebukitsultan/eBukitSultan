// ============================================================
// SERVICE WORKER - eBukitSultan
// Versi: 1.0.0
// ============================================================

const CACHE_NAME = 'ebukitsultan-v1.0.0';
const OFFLINE_URL = '/offline.html';

// ============================================================
// DAFTAR ASET YANG DI-CACHE
// ============================================================
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
  '/icons/icon-512.png',
  '/icons/splash-750x1334.png',
  '/icons/splash-1242x2208.png',
  '/icons/splash-1125x2436.png',
  '/icons/splash-828x1792.png',
  '/icons/splash-1170x2532.png',
  '/icons/splash-1284x2778.png',
  '/icons/splash-1179x2556.png',
  '/icons/splash-1536x2048.png',
  '/icons/splash-1668x2388.png',
  '/icons/splash-2048x2732.png'
];

// ============================================================
// INSTALL EVENT
// ============================================================
self.addEventListener('install', function(event) {
  console.log('🔄 Service Worker: Install');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Service Worker: Caching assets...');
        return cache.addAll(ASSETS);
      })
      .then(function() {
        console.log('✅ Service Worker: Assets cached successfully');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('❌ Service Worker: Cache failed:', error);
      })
  );
});

// ============================================================
// ACTIVATE EVENT
// ============================================================
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
        })
      );
    }).then(function() {
      console.log('✅ Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// ============================================================
// FETCH EVENT
// ============================================================
self.addEventListener('fetch', function(event) {
  // ============================================================
  // 1. HANDLE NAVIGATION (Halaman HTML)
  // ============================================================
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // Jika response berhasil, cache copy-nya
          if (response && response.status === 200) {
            var responseClone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(function() {
          // Jika gagal (offline), tampilkan offline.html
          console.log('📡 Service Worker: Offline, showing offline page');
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // ============================================================
  // 2. HANDLE STATIC ASSETS (CSS, JS, Images, etc)
  // ============================================================
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Jika ada di cache, return dari cache
        if (response) {
          return response;
        }

        // Jika tidak ada di cache, fetch dari network
        return fetch(event.request)
          .then(function(networkResponse) {
            // Cek apakah response valid
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Cache response untuk digunakan nanti
            var responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });

            return networkResponse;
          })
          .catch(function() {
            // Jika fetch gagal dan request adalah gambar
            if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
              return caches.match('/icons/icon-192.png');
            }
            // Jika gagal dan request adalah font
            if (event.request.url.match(/\.(woff|woff2|ttf|eot)$/)) {
              // Return nothing, biarkan fallback
              return new Response(null, { status: 404 });
            }
            // Default fallback
            return new Response(null, { status: 404 });
          });
      })
  );
});

// ============================================================
// MESSAGE EVENT (Untuk komunikasi dengan main thread)
// ============================================================
self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// ============================================================
// PUSH NOTIFICATION (Opsional)
// ============================================================
self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    var data = event.data.json();
    var title = data.title || 'eBukitSultan';
    var options = {
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

// ============================================================
// NOTIFICATION CLICK
// ============================================================
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var urlToOpen = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      // Jika sudah ada window yang terbuka, fokus ke situ
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika tidak ada, buka window baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ============================================================
// LOGGING
// ============================================================
console.log('✅ Service Worker: eBukitSultan loaded');
console.log('📦 Cache Name:', CACHE_NAME);
console.log('📡 Offline URL:', OFFLINE_URL);
console.log('📁 Assets Count:', ASSETS.length);
