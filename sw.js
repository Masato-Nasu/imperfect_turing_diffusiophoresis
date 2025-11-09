const VERSION='20251109-102614';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{clients.claim();});
self.addEventListener('fetch',e=>{
  e.respondWith((async()=>{
    try{ return await fetch(e.request); }
    catch(err){ const c=await caches.open('v'+VERSION); const r=await c.match(e.request); return r||Response.error(); }
  })());
});
