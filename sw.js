const CACHE='open-devil-v8';
const FILES=['./?v=8','index.html?v=8','style.css','manifest.json','assets/icon.svg','assets/world.svg','js/worldmap.js','js/data.js','js/locales/data.js','js/locales/news.js','js/locales/ui.js','js/locales/countries.js','js/i18n.js','js/sim.js','js/render.js','js/ui.js','js/strategy.js','js/news.js','js/storage.js','js/main.js'].map(path => /\.(js|css)$/.test(path) ? path + '?v=8' : path);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('open-devil-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
   return response;
  }).catch(()=>caches.match(event.request,{ignoreSearch:true})));
 }else event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
