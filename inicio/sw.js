/* Service worker del arranque Los Pares 84x88.
   hub-v2: agrega comandero.html (icono de tabletas) y mejora el modo sin red
   para que cada icono abra SU propia pantalla desde el cache. */
const CACHE = "hub-v2";
const ASSETS = [
  "./", "./index.html", "./comandero.html",
  "./manifest.json", "./manifest_comandero.json",
  "/POS_Lospares/icon-192.png", "/POS_Lospares/icon-512.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // borrar caches viejos (hub-v1, etc.)
    const claves = await caches.keys();
    await Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    // Intenta la red; si no hay, devuelve la MISMA pagina desde cache
    // (comandero.html -> comandero.html, index.html -> index.html).
    e.respondWith((async () => {
      try { return await fetch(e.request); }
      catch (_e) {
        return (await caches.match(e.request))
            || (await caches.match("./comandero.html"))
            || (await caches.match("./index.html"));
      }
    })());
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
