/* Baseerah — Commercial Mosque Kiosk Entry Point (ES Module) */
import { router } from "./core/router.js";
import { state } from "./core/state.js";
import { Storage } from "./core/storage.js";
import { t } from "./core/i18n.js";
import { Idle } from "./core/idle.js";
import { renderHomeScreen } from "./screens/home.js";
import { renderSurahListScreen } from "./screens/surah-list.js";
import { renderQuranScreen } from "./screens/quran.js";
import { renderNamazScreen } from "./screens/namaz.js";
import { renderAboutScreen } from "./screens/about.js";
import { renderSettingsScreen } from "./screens/settings.js";
import { renderLearnScreen } from "./screens/learn.js";
import { renderPlanScreen } from "./screens/plan.js";
import { renderQiblaScreen } from "./screens/qibla.js";
import { renderTasbeehScreen } from "./screens/tasbeeh.js";
import { renderAdminScreen } from "./screens/admin.js";
import { renderAttractScreen } from "./screens/attract.js";
import { renderNotFoundScreen } from "./screens/notfound.js";
import { NotificationManager } from "./core/notifications.js";

// Global Error Boundary (Graceful bilingual fallback with Reload)
let errorBoundaryActive = false;
function handleGlobalError(error) {
  console.error("Baseerah global error caught:", error);
  if (errorBoundaryActive) return;
  const appEl = document.getElementById("app-container");
  if (!appEl) return;
  // If app is blank or crashed during navigation
  if (!appEl.children.length || appEl.querySelector(".screen") === null) {
    errorBoundaryActive = true;
    const isUr = !state || state.lang === "ur";
    const lang = isUr ? "ur" : "en";
    appEl.innerHTML = `
      <div class="baseerah-error-boundary" role="alert" dir="${isUr ? "rtl" : "ltr"}">
        <div class="error-boundary-card">
          <div class="error-icon" aria-hidden="true">⚠️</div>
          <h2 class="error-title">${t("somethingWentWrong", lang)}</h2>
          <p class="error-desc">${t("somethingWentWrong", lang)}</p>
          <button type="button" class="btn btn-primary btn-reload" onclick="window.location.reload()">
            ${t("reloadApp", lang)}
          </button>
        </div>
      </div>
    `;
  }
}
window.addEventListener("error", (e) => handleGlobalError(e.error || e.message));
window.addEventListener("unhandledrejection", (e) => handleGlobalError(e.reason));

// Register Service Worker for PWA & 100% Offline Kiosk Operation
if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
  let hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (refreshing) return;
    refreshing = true;
    console.info("New ServiceWorker activated and claimed clients — refreshing page.");
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then(
      (reg) => {
        console.info("Baseerah PWA ServiceWorker registered with scope:", reg && reg.scope);
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
router.register("settings", renderSettingsScreen);
router.register("learn", renderLearnScreen);
router.register("plan", renderPlanScreen);
router.register("qibla", renderQiblaScreen);
router.register("tasbeeh", renderTasbeehScreen);
// Opened by the daily "Quran time" notification: jump to where the person left off.
router.register("continue", () => {
  let target = "quran/1/1";
  try {
    const lr = Storage.getLastRead();
    if (lr && lr.surah) target = `quran/${lr.surah}/${lr.ayah || 1}`;
  } catch (e) { /* first time: start at Al-Fatihah */ }
  history.replaceState(null, "", `#${target}`);
  router.resolveRoute();
});
router.register("admin", renderAdminScreen);
router.register("attract", renderAttractScreen);
router.register("notfound", renderNotFoundScreen);

// Offline Status Indicator
function initOfflineIndicator() {
  const banner = document.createElement("aside");
  banner.id = "offline-indicator";
  banner.className = "offline-banner";
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");
  
  const updateOfflineState = () => {
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    document.body.classList.toggle("is-offline", isOffline);
    banner.hidden = !isOffline;
    banner.textContent = t("offlineBannerNotice", state.lang);
  };

  updateOfflineState();
  document.body.prepend(banner);

  window.addEventListener("offline", () => {
    updateOfflineState();
  });

  window.addEventListener("online", () => {
    updateOfflineState();
    if (window.UIComponents && window.UIComponents.showToast) {
      window.UIComponents.showToast(t("onlineRestored", state.lang));
    }
  });

  state.subscribe(() => {
    if (document.body.classList.contains("is-offline")) {
      updateOfflineState();
    }
  });
}
initOfflineIndicator();

// Expose state and router for tests
if (typeof window !== "undefined") {
  window.baseerahState = state;
  window.baseerahRouter = router;
  window.baseerahNotificationManager = NotificationManager;
}

// Apply stored kiosk preferences
function applyPreferences() {
  document.body.classList.toggle("high-contrast", !!state.highContrast);
  state.applyFontScale();
  state.applyTheme();
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

// Initialize Notification Engine
NotificationManager.init();

// Boot application
applyPreferences();
router.resolveRoute();
