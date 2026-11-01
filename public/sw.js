const CACHE_NAME = "fackts-music-shell-v6";
// Never store personalized HTML, login responses, API data, signed URLs or audio.
const SHELL_ASSETS = ["/offline.html", "/branding/fackts-music-logo.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("fackts-music-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match("/offline.html")) || new Response("Connection interrupted. Please reconnect and reload.", {status:503, headers:{"Content-Type":"text/plain"}})));
  } else if (SHELL_ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
  }
});

/* Notifications only arrive from actual server-sent Web Push subscriptions.
   Request consent only from a deliberate user action, never on page load. */
self.addEventListener("push",event=>{
  if(!event.data)return;
  event.waitUntil((async()=>{
    let payload={};try{payload=event.data.json();}catch{return;}
    const title=String(payload.title||"FACKTS Music").slice(0,100);
    const body=String(payload.body||"You have an update.").slice(0,200);
    const destination=typeof payload.url==="string"&&payload.url.startsWith("/")&&!payload.url.startsWith("//")?payload.url:"/inbox";
    await self.registration.showNotification(title,{body,icon:"/branding/fackts-music-logo.png",badge:"/branding/fackts-music-logo.png",tag:String(payload.tag||"music-update").slice(0,70),data:{url:destination}});
  })());
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const url=new URL(event.notification.data?.url||"/inbox",self.location.origin);
    if(url.origin!==self.location.origin)return;
    const clientsList=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of clientsList){if(new URL(client.url).origin===url.origin){await client.focus();client.navigate(url.href);return;}}
    await self.clients.openWindow(url.href);
  })());
});
