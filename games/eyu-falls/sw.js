// Eyu Falls — service worker for offline play.
// Cache-first: once installed, the game and its art load from cache even
// with no connection. Bump CACHE_VERSION whenever the HTML or any asset
// changes, so returning players get the update instead of a stale copy.
const CACHE_VERSION = "eyu-falls-v3";

const CORE_ASSETS = [
  "./",
  "./eyu-falls.html",
  "./eyu-falls.css",
  "./eyu-falls.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./sounds/lock.mp3",
  "./sounds/clear.mp3",
  "./sounds/combo.mp3",
  "./sounds/hit.mp3",
  "./sounds/win.mp3",
  "./sounds/lose.mp3",
  "./sounds/click.mp3",
  "./sounds/unlock.mp3",
  "./sounds/lockability.mp3",
  "./sounds/ability_ice.mp3",
  "./sounds/ability_fire.mp3",
  "./sounds/ability_light.mp3",
  "./assets/bg_menu.jpg",
  "./assets/Eyuforiya.png",
  "./assets/Fire.png",
  "./assets/Forest.png",
  "./assets/Ice.png",
  "./assets/Lightning.png",
  "./assets/Music.png",
  "./assets/Forward_Button.png",
  "./assets/Reverse_Button.png",
  "./assets/Rotate_Button.png",
  "./assets/Soft_Land.png",
  "./assets/Hard_Land.png",
  "./assets/GameBoard_BG.png",
  "./assets/map_azure_heights.jpg",
  "./assets/map_sky_sanctuary.png",
  "./assets/map_molten_core.png",
  "./assets/map_sunken_ruins.png",
  "./assets/map_glacia_peaks.png",
  "./assets/map_rotten_marsh.png",
  "./assets/map_whispering_woods.png",
  "./assets/map_tech_shack_city.png",
  "./assets/map_world_overview.jpg",
  "./assets/thumb_azure_heights.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // addAll fails entirely if even one file 404s — cache what exists
      // one at a time instead, so a single missing asset (e.g. a region
      // background not added yet) doesn't break offline support for
      // everything else.
      return Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("Service worker: couldn't cache", url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Cache new same-origin assets as they're fetched (e.g. a region
          // background added later), so the next offline session has it too.
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached — nothing sensible to fall back to for
          // an image/asset, so just let the request fail naturally.
        });
    })
  );
});
