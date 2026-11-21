/* Baseerah — Offline Service Worker (Kiosk PWA) */
const CACHE_NAME = "baseerah-v1.0.0-5f7fd40";

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
  "./data/morphology.js",
  "./data/morphology.json",
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
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Deleting stale cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache manifest helper
let manifestData = null;
async function getManifest() {
  if (manifestData) return manifestData;
  try {
    const cached = await caches.match("./data/manifest.sha256.json");
    if (cached) {
      manifestData = await cached.json();
      return manifestData;
    }
  } catch (_) {}
  return null;
}

// Verifies a cached surah file against manifest
async function verifyCachedSurah(request, cachedResponse) {
  try {
    const manifest = await getManifest();
    if (!manifest) return cachedResponse;
    const url = new URL(request.url);
    const relPath = url.pathname.replace(/^\/+/, "");
    const manifestKey = Object.keys(manifest).find((k) => relPath.endsWith(k) || k.endsWith(relPath));
    if (!manifestKey || !manifest[manifestKey]) return cachedResponse;

    const cloned = cachedResponse.clone();
    const text = await cloned.text();
    const normalized = text.replace(/\r\n/g, "\n");
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
    const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (hash === manifest[manifestKey]) {
      return cachedResponse;
    }
    console.warn("[SW] Cached surah hash mismatch:", relPath);
    return null;
  } catch (err) {
    return cachedResponse;
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // 1. Cache-first ONLY for fonts and data/surahs/*.js (with manifest hash validation)
  const isFont = pathname.includes("/fonts/");
  const isSurah = pathname.includes("/data/surahs/");

  if (isFont || isSurah) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request);
        if (cached) {
          if (isSurah) {
            const verified = await verifyCachedSurah(event.request, cached);
            if (verified) return verified;
          } else {
            return cached;
          }
        }
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          if (cached) return cached;
          throw err;
        }
      })()
    );
    return;
  }

  // 2. Network-first for index.html, *.js, *.css, manifest.json and everything else
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // Offline: fall back to cache
        const cached = await cache.match(event.request);
        if (cached) return cached;

        // If navigation request fails offline, serve index.html
        if (event.request.mode === "navigate") {
          const indexFallback = await cache.match("./index.html");
          if (indexFallback) return indexFallback;
        }
        throw err;
      }
    })()
  );
});
