// ============================================================
// sw.js — eBukitSultan Service Worker
// Versi: 1.0.2
// ============================================================

var CACHE_NAME = 'ebukitsultan-v1.0.2';

// Path relatif (bukan absolut) untuk GitHub Pages project site
var urlsToCache = [
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

// ============================================================
// INSTALL
// ============================================================
self.addEventListener('install', function(event) {
  console.log('🔄 SW: Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache per-file — kalau 1 file 404, yang lain tetap masuk
      return Promise.all(
        urlsToCache.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('⚠️ SW: Gagal cache ' + url + ' - ' + err.message);
          });
        })
      );
    }).then(function() {
      console.log('✅ SW: Cached');
      return self.skipWaiting();
    })
  );
});

// ============================================================
// ACTIVATE
// ============================================================
self.addEventListener('activate', function(event) {
  console.log('🔄 SW: Activate');
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.map(function(n) {
          if (n !== CACHE_NAME) {
            console.log('🗑️ SW: Hapus cache lama ' + n);
            return caches.delete(n);
          }
          return Promise.resolve();
        })
      );
    }).then(function() {
      console.log('✅ SW: Activated');
      return self.clients.claim();
    })
  );
});

// ============================================================
// FETCH
// ============================================================
self.addEventListener('fetch', function(event) {
  var req = event.request;

  // Skip non-GET (POST/PUT/DELETE ke Apps Script jangan di-intercept)
  if (req.method !== 'GET') return;

  // Skip non-http (chrome-extension, devtools, dll)
  if (!req.url.startsWith('http')) return;

  // Skip Apps Script API (harus realtime, jangan di-cache)
  if (req.url.indexOf('script.google.com') > -1) return;
  if (req.url.indexOf('googleusercontent.com') > -1) return;

  // Skip CDN third-party (hindari konflik cache)
  if (req.url.indexOf('fonts.googleapis.com') > -1) return;
  if (req.url.indexOf('fonts.gstatic.com') > -1) return;
  if (req.url.indexOf('cdn.jsdelivr.net') > -1) return;
  if (req.url.indexOf('lh3.googleusercontent.com') > -1) return;

  // NAVIGASI (buka halaman): network-first, fallback offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function(response) {
        if (response && response.status === 200) {
          var cloned = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, cloned).catch(function() {});
          });
        }
        return response;
      }).catch(function() {
        console.log('📡 SW: Offline fallback');
        return caches.match('./offline.html').then(function(r) {
          return r || caches.match('./index.html');
        }).then(function(r) {
          return r || new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // Aset statis same-origin: cache-first, fallback network
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        return fetch(req).then(function(response) {
          if (!response || response.status !== 200) return response;
          var cloned = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, cloned).catch(function() {});
          });
          return response;
        }).catch(function() {
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

// ============================================================
// MESSAGE
// ============================================================
self.addEventListener('message', function(event) {
  if (!event.data) return;
  if (event.data.action === 'skipWaiting') self.skipWaiting();
});

console.log('✅ SW: eBukitSultan loaded (' + CACHE_NAME + ')');
