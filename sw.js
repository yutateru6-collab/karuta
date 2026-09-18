const CACHE="genkai-karuta-v1";
const ASSETS=[
  "./","./index.html","./styles.css","./cards.js","./app.js","./manifest.webmanifest",
  "./assets/a.svg","./assets/ki.svg","./assets/so.svg","./assets/su.svg","./assets/wa.svg"
];
self.addEventListener("install",(e)=>e.waitUntil(caches.open(CACHE).then((c)=>c.addAll(ASSETS))));
self.addEventListener("activate",(e)=>e.waitUntil(caches.keys().then((keys)=>Promise.all(keys.filter((k)=>k!==CACHE).map((k)=>caches.delete(k))))));
self.addEventListener("fetch",(e)=>e.respondWith(caches.match(e.request).then((r)=>r||fetch(e.request))));
