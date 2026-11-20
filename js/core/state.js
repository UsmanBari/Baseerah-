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

  get fontScale() {
    return this.settings.fontScale;
  }

  set fontScale(val) {
    this.settings.fontScale = val;
    Storage.saveSettings(this.settings);
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
