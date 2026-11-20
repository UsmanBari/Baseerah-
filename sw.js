/* Baseerah — Offline Service Worker (Kiosk PWA) */
const CACHE_NAME = "baseerah-v1.0.0";

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon.svg",
  "./css/tokens.css",
  "./css/styles.css",
  "./fonts/indopak-nastaleeq-qul.ttf",
  "./fonts/noto-naskh-arabic.ttf",
  "./fonts/noto-nastaliq-urdu.ttf",
  "./data/index.js",
  "./data/manifest.sha256.json",
  "./data/featured_ayahs.json",
  "./data/juz.js",
  "./data/namaz/wudu.json",
  "./data/namaz/steps.json",
  "./data/namaz/rakats.json",
  "./data/namaz/duas.json",
  "./js/main.js",
  "./js/core/router.js",
  "./js/core/state.js",
  "./js/core/i18n.js",
  "./js/core/idle.js",
  "./js/core/storage.js",
  "./js/core/integrity.js",
  "./js/core/audio.js",
  "./js/screens/home.js",
  "./js/screens/surah-list.js",
  "./js/screens/quran.js",
  "./js/screens/namaz.js",
  "./js/screens/about.js",
  "./js/screens/admin.js",
  "./js/screens/attract.js",
  "./js/ui/components.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache dynamic surah files or assets automatically
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.url.includes("/data/surahs/") || event.request.url.includes("/fonts/"))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If offline and request is for navigation, return index.html
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
