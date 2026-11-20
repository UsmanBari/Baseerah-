/* Baseerah — Commercial Mosque Kiosk Entry Point (ES Module) */
import { router } from "./core/router.js";
import { state } from "./core/state.js";
import { Idle } from "./core/idle.js";
import { renderHomeScreen } from "./screens/home.js";
import { renderSurahListScreen } from "./screens/surah-list.js";
import { renderQuranScreen } from "./screens/quran.js";
import { renderNamazScreen } from "./screens/namaz.js";
import { renderAboutScreen } from "./screens/about.js";
import { renderAdminScreen } from "./screens/admin.js";
import { renderAttractScreen } from "./screens/attract.js";

// Register Service Worker for PWA & 100% Offline Kiosk Operation
if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then(
      (reg) => {
        console.info("Baseerah PWA ServiceWorker registered with scope:", reg.scope);
      },
      (err) => {
        console.warn("ServiceWorker registration failed:", err);
      }
    );
  });
}

// Register Screen Handlers
router.register("home", renderHomeScreen);
router.register("surahs", renderSurahListScreen);
router.register("juz", (container, params) => renderSurahListScreen(container, ["juz", ...params]));
router.register("quran", renderQuranScreen);
router.register("namaz", renderNamazScreen);
router.register("about", renderAboutScreen);
router.register("admin", renderAdminScreen);
router.register("attract", renderAttractScreen);

// Apply stored kiosk preferences
function applyPreferences() {
  document.body.classList.toggle("high-contrast", !!state.highContrast);
  document.body.className = document.body.className.replace(/\bscale-\w+/g, "").trim();
  document.body.classList.add(`scale-${state.fontScale || "normal"}`);
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === "ur" ? "rtl" : "ltr";
}

state.subscribe(() => {
  applyPreferences();
});

// Kiosk Lockdown Controls
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("gesturestart", (e) => e.preventDefault());

// Initialize Idle Timer
Idle.init();

// Boot application
applyPreferences();
router.resolveRoute();
