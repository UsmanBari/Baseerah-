/* Baseerah — Global Reactive State */
import { IS_KIOSK_BUILD, IS_DEV_HOST } from "./build.js";
import { Storage } from "./storage.js";

class AppState {
  constructor() {
    this.settings = Storage.getSettings();
    // Every time the app opens, surahs start in Mushaf view.
    // Word-by-word is one tap away in the reader and lasts for this session.
    this.settings.readingMode = "mushaf";
    this.subscribers = new Set();

    // Runtime navigation state
    this.nav = {
      screen: "home",
      surah: 1,
      ayah: 1,
      word: 0,
      juz: 1,
      namazTab: "steps", // "steps" | "wudu" | "rakats" | "duas"
      namazStep: 0,
      namazWuduStep: 0
    };

    // Surah cache in memory
    this.surahCache = new Map();

    if (typeof document !== "undefined") {
      this.applyTextScale();
      this.applyFontScale();
      this.applyTheme();
    }
  }

  get textSize() {
    return this.settings.textSize || "M";
  }

  get isKiosk() {
    // The phone app is never in kiosk mode; only the kiosk build (or local testing) is.
    return IS_KIOSK_BUILD || (IS_DEV_HOST && !!this.settings.isKiosk);
  }

  set textSize(val) {
    const valid = ["S", "M", "L", "XL"].includes(val) ? val : "M";
    this.settings.textSize = valid;
    if (valid === "S") this.settings.fontScaleLevel = 1;
    else if (valid === "M") this.settings.fontScaleLevel = 3;
    else if (valid === "L") this.settings.fontScaleLevel = 4;
    else if (valid === "XL") this.settings.fontScaleLevel = 5;
    Storage.saveSettings(this.settings);
    this.applyTextScale();
    this.notify();
  }

  applyTextScale() {
    const map = { S: 0.85, M: 1.0, L: 1.15, XL: 1.30 };
    const scale = map[this.textSize] || 1.0;
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.style.setProperty("--text-scale", scale);
      document.documentElement.setAttribute("data-text-size", this.textSize);
      if (document.body) {
        document.body.classList.remove("text-size-s", "text-size-m", "text-size-l", "text-size-xl");
        document.body.classList.add(`text-size-${this.textSize.toLowerCase()}`);
      }
    }
  }

  // The interface is English-only. Urdu remains available as content
  // (translation + word meanings) through translationDisplay / meaningDisplay.
  get lang() {
    return "en";
  }

  set lang(val) {
    this.settings.lang = "en";
    Storage.saveSettings(this.settings);
    this.notify();
  }

  get fontScaleLevel() {
    return this.settings.fontScaleLevel || 3;
  }

  set fontScaleLevel(val) {
    const lvl = Math.max(1, Math.min(5, parseInt(val, 10) || 3));
    this.settings.fontScaleLevel = lvl;
    // Map to fontScale for backward compatibility
    if (lvl <= 2) this.settings.fontScale = "normal";
    else if (lvl === 4) this.settings.fontScale = "large";
    else if (lvl === 5) this.settings.fontScale = "xlarge";
    else this.settings.fontScale = "normal";
    Storage.saveSettings(this.settings);
    this.applyFontScale();
    this.notify();
  }

  get meaningDisplay() {
    return this.settings.meaningDisplay || "both";
  }

  set meaningDisplay(val) {
    this.settings.meaningDisplay = val;
    Storage.saveSettings(this.settings);
    this.notify();
  }

  applyFontScale() {
    const lvl = this.fontScaleLevel;
    document.body.classList.remove("scale-step-1", "scale-step-2", "scale-step-3", "scale-step-4", "scale-step-5", "scale-normal", "scale-large", "scale-xlarge");
    document.body.classList.add(`scale-step-${lvl}`);
    if (lvl === 3) document.body.classList.add("scale-normal");
    else if (lvl === 4) document.body.classList.add("scale-large");
    else if (lvl === 5) document.body.classList.add("scale-xlarge");
  }

  get fontScale() {
    return this.settings.fontScale;
  }

  set fontScale(val) {
    this.settings.fontScale = val;
    if (val === "large") this.settings.fontScaleLevel = 4;
    else if (val === "xlarge") this.settings.fontScaleLevel = 5;
    else this.settings.fontScaleLevel = 3;
    Storage.saveSettings(this.settings);
    this.applyFontScale();
    this.notify();
  }

  get highContrast() {
    return this.settings.highContrast;
  }

  set highContrast(val) {
    this.settings.highContrast = !!val;
    Storage.saveSettings(this.settings);
    this.notify();
  }

  get theme() {
    if (this.isKiosk && (!this.settings.theme || this.settings.theme === "system")) {
      return "light";
    }
    return this.settings.theme || "light";
  }

  set theme(val) {
    const valid = ["light", "dark", "sepia", "system"].includes(val) ? val : "light";
    this.settings.theme = valid;
    Storage.saveSettings(this.settings);
    this.applyTheme();
    this.notify();
  }

  applyKioskLock() {
    if (typeof document === "undefined" || !document.body) return;
    document.body.classList.toggle("kiosk-locked", this.isKiosk);
    if (IS_KIOSK_BUILD && !this._kioskDefaultsDone) { this._kioskDefaultsDone = true; this.applyKioskDefaults(); }
  }

  get quranReminder() {
    const q = this.settings.quranReminder || {};
    return {
      enabled: q.enabled !== false,
      time: typeof q.time === "string" ? q.time : "07:00",
      order: q.order === "random" ? "random" : "linear"
    };
  }

  set quranReminder(val) {
    this.settings.quranReminder = { ...this.quranReminder, ...(val || {}) };
    Storage.saveSettings(this.settings);
    this.notify();
  }

  get sunriseReminder() {
    const r = this.settings.sunriseReminder || {};
    return { enabled: r.enabled === true };
  }

  set sunriseReminder(val) {
    this.settings.sunriseReminder = { ...this.sunriseReminder, ...(val || {}) };
    Storage.saveSettings(this.settings);
    this.notify();
  }

  get jumuahReminder() {
    const j = this.settings.jumuahReminder || {};
    return { enabled: j.enabled !== false };
  }

  set jumuahReminder(val) {
    this.settings.jumuahReminder = { ...this.jumuahReminder, ...(val || {}) };
    Storage.saveSettings(this.settings);
    this.notify();
  }

  get urduLabels() {
    return this.settings.urduLabels !== false;
  }

  set urduLabels(val) {
    this.settings.urduLabels = !!val;
    Storage.saveSettings(this.settings);
    this.applyTheme();
    this.notify();
  }

  applyTheme() {
    this.applyKioskLock();
    if (typeof document === "undefined" || !document.documentElement || !document.body) return;
    document.body.classList.toggle("ui-no-urdu", !this.urduLabels);
    let th = this.theme;
    if (th === "system") {
      let mq = null;
      try { mq = window.matchMedia("(prefers-color-scheme: dark)"); } catch (e) { mq = null; }
      th = mq && mq.matches ? "dark" : "light";
      if (mq && !this._systemThemeWatch) {
        this._systemThemeWatch = true;
        const onChange = () => { if (this.theme === "system") this.applyTheme(); };
        if (mq.addEventListener) mq.addEventListener("change", onChange); else if (mq.addListener) mq.addListener(onChange);
      }
    }
    document.body.classList.remove("theme-dark", "theme-sepia", "theme-light");
    document.documentElement.removeAttribute("data-theme");
    document.body.removeAttribute("data-theme");
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", th === "dark" ? "#0D211C" : (th === "sepia" ? "#1B4D3E" : "#0E5A47"));
    } catch (e) { /* ignore */ }
    if (th === "dark") {
      document.body.classList.add("theme-dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
    } else if (th === "sepia") {
      document.body.classList.add("theme-sepia");
      document.documentElement.setAttribute("data-theme", "sepia");
      document.body.setAttribute("data-theme", "sepia");
    } else if (th === "light") {
      document.body.classList.add("theme-light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
    }
  }

  get mosqueMute() {
    return this.settings.mosqueMute;
  }

  set mosqueMute(val) {
    this.settings.mosqueMute = !!val;
    Storage.saveSettings(this.settings);
    this.notify();
  }

  get readingMode() {
    return this.settings.readingMode;
  }

  set readingMode(val) {
    this.settings.readingMode = val;
    Storage.saveSettings(this.settings);
    this.notify();
  }

  get mushafShowTranslation() {
    try {
      const sess = sessionStorage.getItem("baseerah_mushaf_show_trans");
      if (sess !== null) return sess === "true";
    } catch (e) {}
    return true; // on by default
  }

  set mushafShowTranslation(val) {
    try {
      sessionStorage.setItem("baseerah_mushaf_show_trans", val ? "true" : "false");
    } catch (e) {}
    this.notify();
  }

  resetSession() {
    try {
      sessionStorage.removeItem("baseerah_mushaf_show_trans");
    } catch (e) {}
    this.applyKioskDefaults();
  }

  /** Mosque kiosk: every visitor starts with Sir's word-part colours on (letters tinted). */
  applyKioskDefaults() {
    if (!IS_KIOSK_BUILD) return;
    this.settings.showMorphology = true;
    this.settings.morphologyStyle = "tint";
    Storage.saveSettings(this.settings);
  }

  get translationDisplay() {
    return this.settings.translationDisplay;
  }

  set translationDisplay(val) {
    this.settings.translationDisplay = val;
    Storage.saveSettings(this.settings);
    this.notify();
  }

  get showTajweed() {
    return this.settings.showTajweed === true;
  }

  set showTajweed(val) {
    this.settings.showTajweed = !!val;
    Storage.saveSettings(this.settings);
    this.notify();
  }

  updateSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    Storage.saveSettings(this.settings);
    this.notify();
  }

  updateNav(patch) {
    this.nav = { ...this.nav, ...patch };
    this.notify();
  }

  get prayerNotifications() {
    return !!this.settings.prayerNotifications;
  }

  set prayerNotifications(val) {
    this.settings.prayerNotifications = !!val;
    Storage.saveSettings(this.settings);
    this.notify();
  }

  get notificationPrayers() {
    return this.settings.notificationPrayers || { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
  }

  setNotificationPrayer(prayer, val) {
    if (!this.settings.notificationPrayers) {
      this.settings.notificationPrayers = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
    }
    this.settings.notificationPrayers[prayer] = !!val;
    Storage.saveSettings(this.settings);
    this.notify();
  }

  get notificationOffset() {
    return typeof this.settings.notificationOffset === "number" ? this.settings.notificationOffset : 0;
  }

  set notificationOffset(val) {
    this.settings.notificationOffset = parseInt(val, 10) || 0;
    Storage.saveSettings(this.settings);
    this.notify();
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  notify() {
    for (const fn of this.subscribers) {
      try {
        fn(this);
      } catch (err) {
        console.error("State subscriber error:", err);
      }
    }
  }
}

export const state = new AppState();
if (typeof window !== "undefined") {
  window.state = state;
}
