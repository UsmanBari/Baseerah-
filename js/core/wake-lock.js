/* Baseerah — Screen Wake Lock Manager
 * Prevents display sleep while actively reading or listening to the Quran.
 * Gracefully degrades on browsers without Wake Lock API support.
 */

class WakeLockManager {
  constructor() {
    this.wakeLock = null;
    this.isReading = false;
    this.isPlaying = false;
    this.idleTimer = null;
    this.init();
  }

  init() {
    if (typeof document === "undefined") return;

    // Browser automatically releases lock on background/minimize.
    // Re-acquire when page becomes visible again if still reading/playing.
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "visible") {
        if (this.isReading || this.isPlaying) {
          await this.request();
        }
      } else {
        this.wakeLock = null;
      }
    });
  }

  async request() {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return false;
    }
    try {
      if (this.wakeLock !== null && !this.wakeLock.released) {
        return true;
      }
      this.wakeLock = await navigator.wakeLock.request("screen");
      this.wakeLock.addEventListener("release", () => {
        this.wakeLock = null;
      });
      return true;
    } catch (err) {
      // Browser may reject if battery saver is active or tab is not active
      console.warn("Screen Wake Lock request rejected:", err);
      this.wakeLock = null;
      return false;
    }
  }

  async release() {
    if (this.wakeLock !== null) {
      try {
        await this.wakeLock.release();
      } catch (err) {
        console.warn("Screen Wake Lock release error:", err);
      }
      this.wakeLock = null;
    }
  }

  setReading(isReading) {
    this.isReading = !!isReading;
    this.evaluate();
  }

  setAudioPlaying(isPlaying) {
    this.isPlaying = !!isPlaying;
    this.evaluate();
  }

  resetIdleTimeout() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    // If not actively listening to audio, release lock after 2 minutes of inactivity
    if (!this.isPlaying && this.isReading) {
      this.idleTimer = setTimeout(() => {
        this.release();
      }, 120000); // 2 minutes
    }
  }

  async evaluate() {
    if (this.isPlaying || this.isReading) {
      await this.request();
      this.resetIdleTimeout();
    } else {
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
      await this.release();
    }
  }
}

export const wakeLockManager = new WakeLockManager();
