// ============================================================
// SERVICE WORKER - eBukitSultan
// Versi: 1.0.3
// Optimized for performance, stability, and PWA best practices
// ============================================================

const CACHE_NAME = 'ebukitsultan-v1.0.3';
const OFFLINE_URL = '/offline.html';

// Aset kritis saja, agar install ringan dan tidak memblok
const ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(event) {
  console.log('🔄 Service Worker: Install');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Service Worker: Caching critical assets...');
        // Cache satu per satu agar 1 file gagal tidak batalkan semua
        return Promise.all(
          ASSETS.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.warn('⚠️ Gagal cache:', url, err.message);
            });
          })
        );
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
  const req = event.request;

  // ❌ Skip non-GET (POST/PUT/DELETE tidak boleh di-cache)
  if (req.method !== 'GET') return;

  // ❌ Skip scheme non-http (chrome-extension, devtools, dll)
  if (!req.url.startsWith('http')) return;

  // ❌ Skip Apps Script API (harus realtime, jangan di-cache)
  if (req.url.indexOf('script.google.com') > -1) return;
  if (req.url.indexOf('googleusercontent.com') > -1) return;

  // ❌ Skip Google Fonts / CDN (biar tidak konflik)
  if (req.url.indexOf('fonts.googleapis.com') > -1) return;
  if (req.url.indexOf('fonts.gstatic.com') > -1) return;
  if (req.url.indexOf('cdn.jsdelivr.net') > -1) return;
  if (req.url.indexOf('lh3.googleusercontent.com') > -1) return;

  // NAVIGASI: network-first, fallback offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(function(response) {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(req, cloned).catch(function() {});
            });
          }
          return response;
        })
        .catch(function() {
          console.log('📡 Service Worker: Offline fallback');
          return caches.match(OFFLINE_URL).then(function(r) {
            return r || caches.match('./index.html');
          }).then(function(r) {
            return r || new Response('Offline', { status: 503, statusText: 'Offline' });
          });
        })
    );
    return;
  }

  // Aset statis (same-origin): cache-first, fallback network
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;

        return fetch(req)
          .then(function(networkResponse) {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(req, cloned).catch(function() {});
            });
            return networkResponse;
          })
          .catch(function() {
            // Fallback icon untuk gambar
            if (req.url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
              return caches.match('./icons/icon-192.png').then(function(r) {
                return r || new Response('', { status: 404 });
              });
            }
            return new Response('', { status: 404 });
          });
      })
    );
  }
});

self.addEventListener('message', function(event) {
  if (!event.data) return;

  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data.action === 'updateCache') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(function(cache) {
        return Promise.all(
          ASSETS.map(function(url) {
            return cache.add(url).catch(function() {});
          })
        );
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
      icon: './icons/icon-192.png',
      badge: './icons/icon-72.png',
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

  const urlToOpen = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : './';

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
