// Service worker minimal — installabilité de l'app + confort hors-ligne léger.
// Les données (colis, paiements, messages...) viennent toujours de Firestore
// en direct : ce service worker ne met en cache QUE les fichiers statiques
// du site (pages, manifest, icônes), jamais les données.

const CACHE_NAME = "av-suivi-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./connexion.html",
  "./dashboard.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        CORE_ASSETS.map((url) => cache.add(url).catch(() => null))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // On ne touche jamais aux appels vers Firebase/Firestore/Auth, ni aux
  // ressources externes (polices, QR codes) : toujours en direct du réseau.
  if (req.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Fichiers du site : réseau d'abord, cache en secours (hors-ligne).
  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
