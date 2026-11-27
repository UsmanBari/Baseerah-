/* Baseerah — Hash-Based Kiosk Router */
import { Storage } from "./storage.js";
import { state } from "./state.js";
import { audioManager } from "./audio.js";
import { wakeLockManager } from "./wake-lock.js";

class Router {
  constructor() {
    this.routes = new Map();
    this.currentScreen = "home";
    this.currentParams = {};

    window.addEventListener("hashchange", () => this.resolveRoute());
  }

  register(name, renderFn) {
    this.routes.set(name, renderFn);
  }

  navigate(hash) {
    const cleanHash = hash.replace(/^#/, "");
    if (window.location.hash === `#${cleanHash}`) {
      this.resolveRoute();
    } else {
      window.location.hash = `#${cleanHash}`;
    }
  }

  getCurrentScreen() {
    return this.currentScreen;
  }

  resolveRoute() {
    const rawHash = window.location.hash.replace(/^#\/?/, "") || "home";
    const parts = rawHash.split("/").map(decodeURIComponent);
    const screen = parts[0] || "home";
    const params = parts.slice(1);

    this.currentScreen = screen;
    this.currentParams = params;

    // Log navigation event locally
    Storage.logAnalytics("screen_view", rawHash);

    // Update state
    state.updateNav({ screen });

    if (screen === "quran") {
      wakeLockManager.setReading(true);
      // Opening a different surah stops recitation of the previous one.
      const targetSurah = parseInt(params[0], 10);
      if (audioManager.currentSurah && targetSurah && audioManager.currentSurah !== targetSurah) {
        audioManager.stop();
      }
    } else {
      wakeLockManager.setReading(false);
      // Settings opened from the reader keeps recitation going.
      if (screen !== "settings") audioManager.stop();
    }

    let handler = this.routes.get(screen);
    if (!handler) {
      this.currentScreen = "notfound";
      handler = this.routes.get("notfound") || this.routes.get("home");
    }
    const appEl = document.getElementById("app-container");
    if (handler && appEl) {
      handler(appEl, params);
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }
}

export const router = new Router();
