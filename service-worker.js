const CACHE_NAME = "ebukitsultan-v1";

const urlsToCache = [
  "/eBukitSultan/",
  "/eBukitSultan/index.html",
  "/eBukitSultan/manifest.webmanifest",
  "/eBukitSultan/offline.html"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
      .then(response => {
        return response || caches.match("/eBukitSultan/offline.html");
      })
  );
});
