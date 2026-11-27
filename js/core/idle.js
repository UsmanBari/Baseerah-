/* Baseerah — Idle Activity Detector for Kiosk */
import { state } from "./state.js";
import { router } from "./router.js";
import { audioManager } from "./audio.js";

let idleTimer = null;

export const Idle = {
  init() {
    const reset = () => this.reset();
    ["pointerdown", "touchstart", "keydown", "wheel"].forEach((ev) => {
      window.addEventListener(ev, reset, { passive: true });
    });
    this.reset();
  },

  reset() {
    clearTimeout(idleTimer);
    const timeoutSeconds = (state.settings && state.settings.idleSeconds !== undefined && state.settings.idleSeconds !== null)
      ? state.settings.idleSeconds
      : 60;
    if (timeoutSeconds <= 0) {
      return; // Disabled in admin settings or tests
    }

    idleTimer = setTimeout(() => {
      // Attract screensaver is for mosque kiosk mode only
      if (!state.isKiosk) return;

      // If we are already on attract screen, do nothing
      if (router.getCurrentScreen() === "attract") return;

      // Stop any active recitation audio on idle return
      audioManager.stop();

      // Reset session preferences (mushaf translations default to ON)
      state.resetSession();

      // Reset to home or attract screen
      router.navigate("attract");
    }, timeoutSeconds * 1000);
  }
};
