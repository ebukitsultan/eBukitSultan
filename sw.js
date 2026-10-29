// ============================================================
// SERVICE WORKER - eBukitSultan
// Versi: 1.0.3
// Optimized for performance, stability, and PWA best practices
// ============================================================

const CACHE_NAME = 'ebukitsultan-v1.0.3';
const OFFLINE_URL = './offline.html';

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
      console.log
