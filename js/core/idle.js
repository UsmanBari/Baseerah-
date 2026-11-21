/* Baseerah — Idle Activity Detector for Kiosk */
import { state } from "./state.js";
import { router } from "./router.js";

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
    const timeoutSeconds = state.settings.idleSeconds || 60;
    if (timeoutSeconds <= 0) {
      return; // Disabled in admin settings
    }

    idleTimer = setTimeout(() => {
      // If we are already on attract screen, do nothing
      if (router.getCurrentScreen() === "attract") return;

      // Reset session preferences (mushaf translations default to ON)
      state.resetSession();

      // Reset to home or attract screen
      router.navigate("attract");
    }, timeoutSeconds * 1000);
  }
};
