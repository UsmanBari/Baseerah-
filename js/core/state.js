/* Baseerah — Global Reactive State */
import { Storage } from "./storage.js";

class AppState {
  constructor() {
    this.settings = Storage.getSettings();
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
  }

  get lang() {
    return this.settings.lang;
  }

  set lang(val) {
    this.settings.lang = val;
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

  get translationDisplay() {
    return this.settings.translationDisplay;
  }

  set translationDisplay(val) {
    this.settings.translationDisplay = val;
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
