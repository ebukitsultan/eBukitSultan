const CACHE_NAME="ebukitsultan-v1";

const urls=[
"./",
"./index.html",
"./offline.html",
"./manifest.webmanifest"
];

self.addEventListener("install",e=>{
e.waitUntil(
caches.open(CACHE_NAME)
.then(cache=>cache.addAll(urls))
);
self.skipWaiting();
});

self.addEventListener("activate",e=>{
e.waitUntil(
caches.keys().then(keys=>{
return Promise.all(
keys.filter(k=>k!==CACHE_NAME)
.map(k=>caches.delete(k))
);
})
);
self.clients.claim();
});

self.addEventListener("fetch",e=>{

if(e.request.method!=="GET") return;

e.respondWith(
fetch(e.request)
.then(r=>{

let clone=r.clone();

caches.open(CACHE_NAME)
.then(cache=>cache.put(e.request,clone));

return r;

})
.catch(()=>{

return caches.match(e.request)
.then(res=>{

return res || caches.match("./offline.html");

});

})

);

});
