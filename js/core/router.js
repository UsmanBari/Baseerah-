/* Baseerah — Hash-Based Kiosk Router */
import { Storage } from "./storage.js";
import { state } from "./state.js";
import { audioManager } from "./audio.js";

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

    if (screen !== "quran") {
      audioManager.stop();
    }

    const handler = this.routes.get(screen) || this.routes.get("home");
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
