/* ==========================================================================
   SERVICE WORKER DEL ARRANCADOR (HUB) — Los Pares 84x88
   Va en el repo Arpaco07/POS_Lospares, en:  inicio/sw.js

   QUE SE CORRIGIO EL 7 DE OCTUBRE 2026:
     1) PRECARGA ROTA. La lista de archivos traia DOS rutas absolutas:
          /POS_Lospares/icon-192.png
          /POS_Lospares/icon-512.png
        Eso funcionaba en arpaco07.github.io, donde el repo vive dentro de
        la carpeta /POS_Lospares/. Pero en app.lospares.com el repo es la
        RAIZ, asi que esa carpeta NO existe y las dos daban 404.
        La precarga era todo-o-nada (cache.addAll): un solo 404 tumbaba la
        instalacion COMPLETA del service worker. Resultado: en el dominio
        nuevo la app nunca se instalaba bien.
        ARREGLO: rutas relativas (../icon-192.png) que sirven en los TRES
        lados, y la precarga ahora va archivo por archivo, asi que si uno
        falla los demas igual se guardan.
     2) CACHE subido de "hub-v2" a "hub-v3" para que los telefonos que ya
        tengan guardada la version vieja la tiren y bajen la nueva.
   ========================================================================== */

const CACHE = "hub-v3";

const ASSETS = [
  "./",
  "./index.html",
  "./comandero.html",
  "./manifest.json",
  "./manifest_comandero.json",
  "../icon-192.png",
  "../icon-512.png"
];

/* Instalacion: se guarda cada archivo por separado. Si alguno falla
   (por ejemplo porque todavia no existe), los demas si se guardan y
   el service worker igual queda instalado. */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(
        ASSETS.map((url) => cache.add(url).catch(() => null))
      )
    ).then(() => self.skipWaiting())
  );
});

/* Activacion: borra los caches viejos (hub-v1, hub-v2, ...) */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((llaves) =>
      Promise.all(
        llaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  if (req.method !== "GET") return;

  /* PAGINAS (cuando abres el icono o navegas): primero la RED.
     Asi siempre ves la version mas nueva si hay internet. Si no hay,
     se responde con lo guardado. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copia));
          return res;
        })
        .catch(() =>
          caches.match(req)
            .then((r) => r || caches.match("./comandero.html"))
            .then((r) => r || caches.match("./index.html"))
            .then((r) => r || caches.match("./"))
        )
    );
    return;
  }

  /* TODO LO DEMAS (imagenes, manifest): primero lo guardado, y si no
     esta, se baja de la red y se guarda para la proxima. */
  e.respondWith(
    caches.match(req).then((guardado) => {
      if (guardado) return guardado;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copia = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copia));
        }
        return res;
      }).catch(() => guardado);
    })
  );
});
