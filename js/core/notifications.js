/* Baseerah — Prayer Time Notifications & Azan Reminders Engine */
import { state } from "./state.js";
import { Storage } from "./storage.js";
import { PrayerEngine } from "./prayer-times.js";
import { audioManager } from "./audio.js";
import { router } from "./router.js";
import { Icons } from "../ui/icons.js";
import { t } from "./i18n.js";

export const CITY_COORDINATES = {
  "Lahore": { lat: 31.5204, lng: 74.3587 },
  "Karachi": { lat: 24.8607, lng: 67.0011 },
  "Islamabad": { lat: 33.6844, lng: 73.0479 },
  "Rawalpindi": { lat: 33.5651, lng: 73.0169 },
  "Peshawar": { lat: 34.0151, lng: 71.5249 },
  "Quetta": { lat: 30.1798, lng: 66.9750 },
  "Multan": { lat: 30.1575, lng: 71.5249 },
  "Faisalabad": { lat: 31.4504, lng: 73.1350 },
  "Makkah": { lat: 21.3891, lng: 39.8579 },
  "Madinah": { lat: 24.5247, lng: 39.5692 },
  "London": { lat: 51.5074, lng: -0.1278 },
  "New York": { lat: 40.7128, lng: -74.0060 }
};

const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

class NotificationEngine {
  constructor() {
    this.timerId = null;
    this.autoHideTimer = null;
    this.pendingAlert = null;
    this.audioUnsub = null;
    this.activeBannerEl = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Listen to visibilitychange: recompute timer when returning to app
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          this.scheduleNextAlert();
        }
      });
    }

    // Listen to state changes (location, method, notifications toggle, offset)
    state.subscribe(() => {
      this.scheduleNextAlert();
      this.queueSyncIfChanged();
    });

    this.listenForForegroundPush();

    // Re-register this phone with the server on every app start, so the
    // server always has fresh details (city, time zone, reminder times).
    setTimeout(() => { if (this.getPermission() === "granted") this.syncPushSubscription(); }, 2500);

    // Schedule initial alert
    this.scheduleNextAlert();
    this.scheduleMidnightTimer();
  }

  scheduleMidnightTimer() {
    if (this.midnightTimerId) {
      clearTimeout(this.midnightTimerId);
      this.midnightTimerId = null;
    }
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
    const msToMidnight = Math.max(1000, midnight.getTime() - now.getTime());
    this.midnightTimerId = setTimeout(() => {
      this.scheduleNextAlert();
      this.scheduleMidnightTimer();
    }, msToMidnight);
  }

  getPermission() {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
  }

  async requestPermission() {
    if (typeof Notification === "undefined") return "unsupported";
    try {
      const perm = await Notification.requestPermission();
      return perm;
    } catch (e) {
      console.warn("Notification.requestPermission error:", e);
      return "denied";
    }
  }

  async enableNotifications() {
    const perm = this.getPermission();
    if (perm === "unsupported") {
      state.prayerNotifications = false;
      return { success: false, reason: "unsupported" };
    }
    if (perm === "denied") {
      state.prayerNotifications = false;
      return { success: false, reason: "denied" };
    }
    if (perm === "default") {
      const result = await this.requestPermission();
      if (result !== "granted") {
        state.prayerNotifications = false;
        return { success: false, reason: "denied" };
      }
    }

    state.prayerNotifications = true;
    this.scheduleNextAlert();
    this.syncPushSubscription();
    return { success: true };
  }

  async disableNotifications() {
    state.prayerNotifications = false;
    this.cancelScheduledAlert();
    this.pendingAlert = null;
    this.dismissBanner();
    this.syncPushSubscription(); // unsubscribes only if every reminder is off
    return { success: true };
  }

  /** Asks for permission if needed. Returns { success, reason }. */
  async ensurePermission() {
    const perm = this.getPermission();
    if (perm === "unsupported") return { success: false, reason: "unsupported" };
    if (perm === "denied") return { success: false, reason: "denied" };
    if (perm === "default") {
      const result = await this.requestPermission();
      if (result !== "granted") return { success: false, reason: "denied" };
    }
    return { success: true };
  }

  wantsAnyPush() {
    return !!(state.prayerNotifications || state.quranReminder.enabled || state.jumuahReminder.enabled || state.sunriseReminder.enabled);
  }

  pushSignature() {
    const st = state.settings;
    return JSON.stringify([
      state.prayerNotifications, state.notificationPrayers, state.notificationOffset,
      state.quranReminder, state.jumuahReminder, state.sunriseReminder,
      st.prayerLat, st.prayerLng, st.prayerMethod, st.prayerMadhab
    ]);
  }

  queueSyncIfChanged() {
    if (this.getPermission() !== "granted") return;
    const sig = this.pushSignature();
    if (sig === this.lastPushSignature) return;
    clearTimeout(this.syncDebounce);
    this.syncDebounce = setTimeout(() => this.syncPushSubscription(), 1200);
  }

  /** Sends a test notification to this phone through the server. */
  async sendTestNotification() {
    const perm = await this.ensurePermission();
    if (!perm.success) return perm;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return { success: false, reason: "unsupported" };
    try {
      const sub = await this.syncPushSubscription({ force: true });
      if (!sub) return { success: false, reason: "no-subscription" };
      const res = await fetch("/.netlify/functions/push-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() })
      });
      if (res.ok) return { success: true };
      let msg = "";
      try { msg = (await res.json()).error || ""; } catch (_) { /* ignore */ }
      return { success: false, reason: "server", message: msg };
    } catch (e) {
      return { success: false, reason: "network" };
    }
  }

  cancelScheduledAlert() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Compute next scheduled alert time based on prayer times and reminder offset
   */
  getNextScheduledAlert(now = new Date()) {
    if (!state.prayerNotifications) return null;

    const offsetMinutes = state.notificationOffset || 0;
    const offsetMs = offsetMinutes * 60 * 1000;
    const enabledPrayers = state.notificationPrayers || {
      fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true
    };

    const todayTimes = PrayerEngine.getPrayerTimes(now);
    const candidates = [];

    for (const key of PRAYER_KEYS) {
      if (enabledPrayers[key] !== false && todayTimes[key] instanceof Date) {
        const alertTime = new Date(todayTimes[key].getTime() - offsetMs);
        if (alertTime.getTime() > now.getTime()) {
          candidates.push({
            prayerKey: key,
            prayerTime: todayTimes[key],
            alertTime
          });
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.alertTime.getTime() - b.alertTime.getTime());
      return candidates[0];
    }

    // Past all today's prayers: check tomorrow's Fajr
    if (enabledPrayers.fajr !== false) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowTimes = PrayerEngine.getPrayerTimes(tomorrow);
      if (tomorrowTimes.fajr instanceof Date) {
        const alertTime = new Date(tomorrowTimes.fajr.getTime() - offsetMs);
        if (alertTime.getTime() > now.getTime()) {
          return {
            prayerKey: "fajr",
            prayerTime: tomorrowTimes.fajr,
            alertTime
          };
        }
      }
    }

    return null;
  }

  scheduleNextAlert() {
    this.cancelScheduledAlert();
    if (!state.prayerNotifications) return;

    const next = this.getNextScheduledAlert();
    if (!next) return;

    const now = Date.now();
    const delay = Math.max(500, next.alertTime.getTime() - now);

    // Limit delay to 24h (32-bit int safe)
    const safeDelay = Math.min(delay, 86400000);

    this.timerId = setTimeout(() => {
      this.onAlertArrived(next.prayerKey, next.prayerTime);
    }, safeDelay);
  }

  onAlertArrived(prayerKey, prayerTime) {
    // Check if recitation is actively playing
    const isPlaying = audioManager.isPlayingAyah || audioManager.isPlayingBismillah;
    if (isPlaying) {
      // Suppress banner until recitation pauses or ends
      this.pendingAlert = { prayerKey, prayerTime, arrivedAt: Date.now() };

      if (!this.audioUnsub) {
        this.audioUnsub = audioManager.subscribe((playbackState) => {
          if (!playbackState.isPlaying && this.pendingAlert) {
            // Recitation paused or ended! Check if alert is still fresh (< 15 min old)
            const alert = this.pendingAlert;
            this.pendingAlert = null;
            if (this.audioUnsub) {
              this.audioUnsub();
              this.audioUnsub = null;
            }
            if (Date.now() - alert.arrivedAt < 15 * 60 * 1000) {
              this.showInAppBanner(alert.prayerKey, alert.prayerTime);
            }
          }
        });
      }
    } else {
      this.showInAppBanner(prayerKey, prayerTime);
    }

    // Recompute next prayer alert (or after midnight)
    this.scheduleNextAlert();
  }

  showInAppBanner(prayerKey, prayerTime) {
    if (typeof document === "undefined" || !document.body) return;

    // Dismiss any existing banner
    this.dismissBanner();

    // Prepare chime hook: silent fallback if file doesn't exist or mosqueMute is on
    this.playChimeHook();

    const banner = document.createElement("div");
    banner.id = "prayer-alert-banner";
    banner.className = "prayer-alert-banner";
    banner.setAttribute("role", "alert");
    banner.setAttribute("aria-live", "polite");

    const pName = t(prayerKey, state.lang);
    const formattedTime = PrayerEngine.formatPrayerTime(prayerTime, state.lang);

    banner.innerHTML = `
      <div class="prayer-alert-content">
        <span class="prayer-alert-icon" aria-hidden="true">${Icons.mosque(22)}</span>
        <span class="prayer-alert-text">
          <strong>${pName} · ${formattedTime}</strong> — ${t("prayerTimeArrived", state.lang)}
        </span>
      </div>
      <div class="prayer-alert-actions">
        <button type="button" class="btn-alert-nav" id="btn-alert-view-prayer">
          ${t("prayerTimes", state.lang)}
        </button>
        <button type="button" class="btn-alert-dismiss" id="btn-alert-dismiss" aria-label="${t("dismiss", state.lang)}">
          ${Icons.close(16)}
        </button>
      </div>
    `;

    banner.querySelector("#btn-alert-dismiss").addEventListener("click", () => {
      this.dismissBanner();
    });

    banner.querySelector("#btn-alert-view-prayer").addEventListener("click", () => {
      this.dismissBanner();
      router.navigate("home");
    });

    document.body.appendChild(banner);
    this.activeBannerEl = banner;

    // Auto-hide after 2 minutes (120,000 ms)
    if (this.autoHideTimer) clearTimeout(this.autoHideTimer);
    this.autoHideTimer = setTimeout(() => {
      this.dismissBanner();
    }, 120000);
  }

  dismissBanner() {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
    if (this.activeBannerEl && this.activeBannerEl.parentNode) {
      this.activeBannerEl.parentNode.removeChild(this.activeBannerEl);
    }
    this.activeBannerEl = null;
  }

  /**
   * A soft two-note bell made with Web Audio (no audio file, nothing to
   * license), plus a vibration. Used when an alert arrives while the app is
   * open. Respects Mosque Respect Mode (mute).
   */
  playChimeHook() {
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (_) { /* ignore */ }
    if (state.mosqueMute) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = this.audioCtx || (this.audioCtx = new Ctx());
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime + 0.02;
      const master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
      // Two bell-like notes: a fundamental with a soft overtone, long gentle decay
      [[659.25, 0], [880, 0.28]].forEach(([freq, delay]) => {
        [[1, 1], [2.76, 0.18]].forEach(([mult, level]) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq * mult;
          g.gain.setValueAtTime(0.0001, now + delay);
          g.gain.exponentialRampToValueAtTime(level, now + delay + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.6);
          osc.connect(g);
          g.connect(master);
          osc.start(now + delay);
          osc.stop(now + delay + 1.7);
        });
      });
    } catch (_) {
      // Audio blocked until the person has tapped the page once: vibration still happened
    }
  }

  /** The service worker tells an open app that a push arrived: chime + vibrate. */
  listenForForegroundPush() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data && e.data.type === "baseerah-push" && document.visibilityState === "visible") this.playChimeHook();
    });
  }

  // --- Push Notification Client Sync (Task 3) ---
  async syncPushSubscription({ force = false } = {}) {
    // Kiosk mode: in-app banner only, no background push
    if (state.isKiosk) return null;
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    if (this.getPermission() !== "granted") return null;

    if (!this.wantsAnyPush() && !force) {
      await this.unsubscribePush();
      this.lastPushSignature = this.pushSignature();
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch("/.netlify/functions/vapid-public-key", { cache: "no-store" });
      if (!keyRes.ok) return null;
      const keyData = await keyRes.json();
      if (!keyData.publicKey) return null;

      let sub = await reg.pushManager.getSubscription();
      // If the server key changed, the old subscription can never receive pushes: replace it.
      if (sub && sub.options && sub.options.applicationServerKey) {
        const current = new Uint8Array(sub.options.applicationServerKey);
        const wanted = this.urlBase64ToUint8Array(keyData.publicKey);
        const same = current.length === wanted.length && current.every((b, i) => b === wanted[i]);
        if (!same) { try { await sub.unsubscribe(); } catch (_) { /* ignore */ } sub = null; }
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(keyData.publicKey)
        });
      }
      if (!sub) return null;

      const qr = state.quranReminder;
      const jm = state.jumuahReminder;
      const payload = {
        subscription: sub.toJSON(),
        lat: parseFloat((state.settings.prayerLat || 33.6844).toFixed(2)),
        lng: parseFloat((state.settings.prayerLng || 73.0479).toFixed(2)),
        method: state.settings.prayerMethod || "Karachi",
        madhab: state.settings.prayerMadhab || "Hanafi",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi",
        prayersEnabled: !!state.prayerNotifications,
        enabledPrayers: state.notificationPrayers || { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
        offsetMinutes: state.notificationOffset || 0,
        quranReminder: { enabled: !!qr.enabled, time: qr.time, order: qr.order },
        jumuahReminder: { enabled: !!jm.enabled },
        sunriseReminder: { enabled: !!state.sunriseReminder.enabled }
      };

      const res = await fetch("/.netlify/functions/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) this.lastPushSignature = this.pushSignature();
      return sub;
    } catch (err) {
      console.warn("Push subscription sync failed:", err);
      return null;
    }
  }

  async unsubscribePush() {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/.netlify/functions/push-unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        await sub.unsubscribe();
      }
    } catch (err) {
      console.warn("Push unsubscribe failed:", err);
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const NotificationManager = new NotificationEngine();
