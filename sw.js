/* Baseerah — Offline Service Worker (Kiosk PWA) */
const CACHE_NAME = "baseerah-v1.0.0-8d2795c";

// Caches that must survive app updates: the full-Quran download, surahs a
// person has opened, and downloaded recitation audio.
const TEXT_CACHE = "baseerah-quran-text-v1";
const KEEP_CACHES = [TEXT_CACHE, "baseerah-offline-audio-v1"];

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/badge-96.png",
  "./css/tokens.css",
  "./css/fonts-ui.css",
  "./css/styles.css",
  "./css/phone.css",
  "./css/polish.css",
  "./css/theme-dark.css",
  "./fonts/indopak-nastaleeq-qul.ttf",
  "./fonts/noto-naskh-arabic.woff2",
  "./fonts/noto-naskh-arabic.ttf",
  "./fonts/noto-nastaliq-urdu.woff2",
  "./fonts/noto-nastaliq-urdu.ttf",
  "./fonts/amiri-quran.woff2",
  "./fonts/amiri-quran.ttf",
  "./data/index.js",
  "./data/metadata.js",
  "./data/manifest.sha256.json",
  "./data/featured_ayahs.json",
  "./data/morphology.js",
  "./data/morphology.json",
  "./data/juz.js",
  "./data/namaz.js",
  "./data/surahs/001.js",
  "./data/namaz/wudu.json",
  "./data/namaz/steps.json",
  "./data/namaz/rakats.json",
  "./data/namaz/duas.json",
  "./js/main.js",
  "./js/core/router.js",
  "./js/core/state.js",
  "./js/core/word-timing.js",
  "./js/core/build.js",
  "./build-flag.js",
  "./js/core/i18n.js",
  "./js/core/idle.js",
  "./js/core/storage.js",
  "./js/core/integrity.js",
  "./js/core/audio.js",
  "./js/core/notifications.js",
  "./js/core/hijri.js",
  "./js/core/offline-quran.js",
  "./js/core/offline-audio.js",
  "./js/vendor/adhan.esm.js",
  "./js/core/prayer-times.js",
  "./js/core/morphology.js",
  "./js/screens/home.js",
  "./js/screens/surah-list.js",
  "./js/screens/quran.js",
  "./js/screens/namaz.js",
  "./js/screens/about.js",
  "./js/screens/settings.js",
  "./js/screens/learn.js",
  "./js/screens/plan.js",
  "./js/screens/qibla.js",
  "./js/screens/tasbeeh.js",
  "./js/core/reading-tracker.js",
  "./js/core/words.js",
  "./js/core/vocab-progress.js",
  "./js/screens/admin.js",
  "./js/screens/attract.js",
  "./js/ui/icons.js",
  "./js/ui/share.js",
  "./js/vendor/qrcode.esm.js",
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
          if (key !== CACHE_NAME && !KEEP_CACHES.includes(key)) {
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
  } catch (_) { }
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

  // 1. Cache-first ONLY for fonts, data/surahs/*.js, and runtime-cached search/extended data
  const isFont = pathname.includes("/fonts/");
  const isSurah = pathname.includes("/data/surahs/") || pathname.includes("/data/timings/") || pathname.includes("/data/morph/") || pathname.includes("/data/roots.json");
  const isLazyData = pathname.includes("/data/search_index.js") || pathname.includes("/data/metadata_extended.js");

  if (isFont || isSurah || isLazyData) {
    event.respondWith(
      (async () => {
        // Quran text lives in its own cache so it survives app updates
        const cache = await caches.open(isSurah || isLazyData ? TEXT_CACHE : CACHE_NAME);
        let cached = await cache.match(event.request, { ignoreSearch: true });
        if (!cached && (isSurah || isLazyData)) cached = await caches.match(event.request, { ignoreSearch: true });
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
          const indexFallback = (await cache.match("./index.html")) || (await cache.match("./")) || (await cache.match("/"));
          if (indexFallback) return indexFallback;
        }
        throw err;
      }
    })()
  );
});

/* ==========================================================================
   WEB PUSH & NOTIFICATION CLICK EVENT HANDLERS
   ========================================================================== */
self.addEventListener("push", (event) => {
  let data = { title: "Baseerah", body: "", tag: "baseerah", data: { url: "/#home" } };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: "./icons/icon-192.png",
    badge: "./icons/badge-96.png",       // white silhouette for the status bar
    tag: data.tag || "baseerah",
    renotify: true,                       // sound/vibrate even if an older one with the same tag is still showing
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : [],
    data: data.data || { url: "/#home" }
  };

  // Prayer reminders stay on screen until the person sees them
  if (String(options.tag).startsWith("prayer-") || String(options.tag).startsWith("sunrise-")) options.requireInteraction = true;
  options.silent = false;

  event.waitUntil((async () => {
    await self.registration.showNotification(data.title, options);
    // If the app is open, let it play a chime and vibrate too
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    wins.forEach((c) => c.postMessage({ type: "baseerah-push", tag: options.tag }));
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // "In 1 hour": ask the server for one follow-up reminder, don't open the app
  if (event.action === "snooze") {
    event.waitUntil((async () => {
      try {
        const sub = await self.registration.pushManager.getSubscription();
        if (!sub) return;
        await fetch("/.netlify/functions/push-snooze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint, minutes: 60 })
        });
      } catch (e) { /* offline: nothing to do */ }
    })());
    return;
  }

  const rel = (event.notification.data && event.notification.data.url) || "/#home";
  const targetUrl = new URL(rel, self.registration.scope).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.registration.scope) && "focus" in client) {
        try { await client.navigate(targetUrl); } catch (e) { /* some browsers block navigate; focus anyway */ }
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
  })());
});
