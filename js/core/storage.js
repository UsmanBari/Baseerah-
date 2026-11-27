/* Baseerah — Storage & Local Analytics */

const STORAGE_KEYS = {
  SETTINGS: "baseerah_settings",
  ANALYTICS: "baseerah_analytics",
  LAST_READ: "baseerah_last_read",
  BOOKMARKS: "baseerah_bookmarks",
  MEMORIZED: "baseerah_memorized"
};

const DEFAULT_SETTINGS = {
  settingsVersion: 6,
  idleSeconds: 60,
  attractSeconds: 60,
  lang: "en", // UI is English-only (Urdu stays as translation/meaning content)
  fontScale: "normal", // "normal", "large", "xlarge"
  fontScaleLevel: 3,   // 1 to 5 (3 is normal 1.0x)
  meaningDisplay: "both", // "both" | "ur" | "en"
  highContrast: false,
  theme: "light", // "light" | "dark" | "sepia" | "system" (Default is light)
  mosqueMute: false, // Default is false (mute is an admin opt-in per mosque)
  readingMode: "mushaf", // "wbw" | "mushaf" (app always opens in mushaf)
  translationDisplay: "both", // "both" | "ur" | "en"
  showMorphology: false, // automatic morphology color coding spike
  morphologyStyle: "tint", // "underline" (Style A) | "tint" (Style B)
  showTajweed: false, // Tajweed colour-coding (Dar al-Maarifah standard, Uthmani script)
  hifzMode: false, // Memorization (Hifz) helper mode
  textSize: "M", // User text-size setting ("S" | "M" | "L" | "XL", default "M")
  isKiosk: false, // Kiosk lockdown mode (false = phone/tablet mode with offline audio downloads)
  kioskSections: { quran: true, namaz: true, prayerTimes: true },
  prayerCity: "Islamabad",
  prayerLat: 33.6844,
  prayerLng: 73.0479,
  prayerMethod: "Karachi", // Karachi, MWL, UmmAlQura, Egyptian, NorthAmerica
  prayerMadhab: "Hanafi", // Hanafi, Shafi
  iqamahTimes: { fajr: "", dhuhr: "", asr: "", maghrib: "", isha: "" },
  defaultReciter: "alafasy",
  defaultTranslation: "both",
  prayerNotifications: false,
  notificationPrayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  notificationOffset: 0 // 0 = at prayer time, 5 = 5 min before, 10, 15
};

export const Storage = {
  getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!raw) {
        const defaults = { ...DEFAULT_SETTINGS };
        this.saveSettings(defaults);
        return defaults;
      }
      const parsed = JSON.parse(raw);
      delete parsed.mushafShowTranslation;

      // Settings migration (v2):
      // If settingsVersion is missing or < 2, reset mosqueMute to false and set settingsVersion = 2
      const currentVersion = typeof parsed.settingsVersion === "number" ? parsed.settingsVersion : 0;
      if (currentVersion < 2) {
        parsed.mosqueMute = false;
        parsed.settingsVersion = 2;
        this.saveSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }

      // Settings migration (v3):
      // Default theme is Light. If theme was missing or set to default "system" from earlier versions,
      // reset to "light". Dark and Sepia stay preserved if user selected them.
      if (currentVersion < 3) {
        if (!parsed.theme || parsed.theme === "system") {
          parsed.theme = "light";
        }
        parsed.settingsVersion = 3;
        this.saveSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }

      // Settings migration (v4): the UI is English-only. Urdu stays as content
      // (Urdu translation + Urdu word meanings), only the interface language is fixed.
      if (currentVersion < 4) {
        parsed.lang = "en";
        parsed.settingsVersion = 4;
        this.saveSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
      // Settings migration (v5): default city is now Islamabad. Phones still on the
      // old untouched default (Lahore at the default coordinates) move to Islamabad.
      if (currentVersion < 5) {
        const onOldDefault = (!parsed.prayerCity || parsed.prayerCity === "Lahore") &&
          (parsed.prayerLat === undefined || Math.abs(parsed.prayerLat - 31.5204) < 0.001) &&
          (parsed.prayerLng === undefined || Math.abs(parsed.prayerLng - 74.3587) < 0.001);
        if (onOldDefault) {
          parsed.prayerCity = "Islamabad";
          parsed.prayerLat = 33.6844;
          parsed.prayerLng = 73.0479;
        }
        parsed.settingsVersion = 5;
        this.saveSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
      // Settings migration (v6): word-part colours now colour the letters
      // themselves (Quran-Asaan style) instead of an underline.
      if ((parsed.settingsVersion || 0) < 6) {
        parsed.morphologyStyle = "tint";
        parsed.settingsVersion = 6;
        this.saveSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
      parsed.lang = "en";
      if (!parsed.notificationPrayers || typeof parsed.notificationPrayers !== "object") {
        parsed.notificationPrayers = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
      }
      if (typeof parsed.notificationOffset !== "number") {
        parsed.notificationOffset = 0;
      }
      if (typeof parsed.prayerNotifications !== "boolean") {
        parsed.prayerNotifications = false;
      }

      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      console.warn("Storage.getSettings failed, returning defaults:", e);
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn("Storage.saveSettings failed:", e);
    }
  },

  resetSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.warn("Storage.resetSettings failed:", e);
      return { ...DEFAULT_SETTINGS };
    }
  },

  logAnalytics(event, detail = "") {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
      const list = raw ? JSON.parse(raw) : [];
      // Keep last 1000 events to prevent quota exhaustion
      if (list.length >= 1000) {
        list.shift();
      }
      list.push({
        ts: new Date().toISOString(),
        event,
        detail: String(detail)
      });
      localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(list));
    } catch (e) {
      console.warn("Storage.logAnalytics failed:", e);
    }
  },

  getAnalytics() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  clearAnalytics() {
    try {
      localStorage.removeItem(STORAGE_KEYS.ANALYTICS);
    } catch (e) { }
  },

  exportAnalyticsCSV() {
    const data = this.getAnalytics();
    let csv = "timestamp,event,detail\n";
    data.forEach((row) => {
      const safeDetail = `"${(row.detail || "").replace(/"/g, '""')}"`;
      csv += `${row.ts},${row.event},${safeDetail}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `baseerah_analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  saveLastRead(surah, ayah, surahNameAr = "", surahNameEn = "") {
    try {
      const data = {
        surah: Number(surah),
        ayah: Number(ayah),
        surahNameAr,
        surahNameEn,
        ts: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.LAST_READ, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage.saveLastRead failed:", e);
    }
  },

  getLastRead() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LAST_READ);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  getBookmarks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  addBookmark(surah, ayah, surahNameAr = "", surahNameEn = "", ayahTextPreview = "") {
    try {
      const list = this.getBookmarks();
      const s = Number(surah);
      const a = Number(ayah);
      if (!list.some(item => item.surah === s && item.ayah === a)) {
        list.unshift({
          surah: s,
          ayah: a,
          surahNameAr,
          surahNameEn,
          preview: ayahTextPreview,
          ts: Date.now()
        });
        localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(list));
      }
      return true;
    } catch (e) {
      console.warn("Storage.addBookmark failed:", e);
      return false;
    }
  },

  removeBookmark(surah, ayah) {
    try {
      const s = Number(surah);
      const a = Number(ayah);
      let list = this.getBookmarks();
      list = list.filter(item => !(item.surah === s && item.ayah === a));
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(list));
      return true;
    } catch (e) {
      console.warn("Storage.removeBookmark failed:", e);
      return false;
    }
  },

  isBookmarked(surah, ayah) {
    try {
      const s = Number(surah);
      const a = Number(ayah);
      const list = this.getBookmarks();
      return list.some(item => item.surah === s && item.ayah === a);
    } catch (e) {
      return false;
    }
  },

  getMemorized() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MEMORIZED);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  toggleMemorized(surah, ayah) {
    try {
      const mem = this.getMemorized();
      const key = `${Number(surah)}:${Number(ayah)}`;
      if (mem[key]) {
        delete mem[key];
      } else {
        mem[key] = Date.now();
      }
      localStorage.setItem(STORAGE_KEYS.MEMORIZED, JSON.stringify(mem));
      return !!mem[key];
    } catch (e) {
      return false;
    }
  },

  /** Backup of the person's own progress: bookmarks, memorized ayahs, last read. */
  exportBackup() {
    return {
      app: "baseerah",
      version: 1,
      exportedAt: new Date().toISOString(),
      bookmarks: this.getBookmarks(),
      memorized: this.getMemorized(),
      lastRead: this.getLastRead()
    };
  },

  /**
   * Merges a backup into this phone (nothing already saved is lost).
   * Returns { ok, bookmarksAdded, memorizedAdded } or { ok:false, error }.
   */
  importBackup(data) {
    if (!data || typeof data !== "object" || data.app !== "baseerah") {
      return { ok: false, error: "not-baseerah" };
    }
    const validRef = (s, a) => Number.isInteger(s) && s >= 1 && s <= 114 && Number.isInteger(a) && a >= 1 && a <= 286;
    try {
      const current = this.getBookmarks();
      let bookmarksAdded = 0;
      for (const b of Array.isArray(data.bookmarks) ? data.bookmarks.slice(0, 5000) : []) {
        const s = Number(b && b.surah), a = Number(b && b.ayah);
        if (!validRef(s, a) || current.some((x) => x.surah === s && x.ayah === a)) continue;
        current.push({
          surah: s, ayah: a,
          surahNameAr: typeof b.surahNameAr === "string" ? b.surahNameAr.slice(0, 60) : "",
          surahNameEn: typeof b.surahNameEn === "string" ? b.surahNameEn.slice(0, 60) : "",
          preview: typeof b.preview === "string" ? b.preview.slice(0, 300) : "",
          ts: Number(b.ts) || Date.now()
        });
        bookmarksAdded++;
      }
      current.sort((x, y) => (y.ts || 0) - (x.ts || 0));
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(current));

      const mem = this.getMemorized();
      let memorizedAdded = 0;
      const incoming = data.memorized && typeof data.memorized === "object" ? data.memorized : {};
      for (const key of Object.keys(incoming).slice(0, 7000)) {
        const m = key.match(/^(\d{1,3}):(\d{1,3})$/);
        if (!m || !validRef(Number(m[1]), Number(m[2])) || mem[key]) continue;
        mem[key] = Number(incoming[key]) || Date.now();
        memorizedAdded++;
      }
      localStorage.setItem(STORAGE_KEYS.MEMORIZED, JSON.stringify(mem));

      const lr = data.lastRead;
      if (lr && validRef(Number(lr.surah), Number(lr.ayah)) && !this.getLastRead()) {
        this.saveLastRead(Number(lr.surah), Number(lr.ayah), lr.surahNameAr || "", lr.surahNameEn || "");
      }
      return { ok: true, bookmarksAdded, memorizedAdded };
    } catch (e) {
      return { ok: false, error: "failed" };
    }
  },

  isMemorized(surah, ayah) {
    try {
      const mem = this.getMemorized();
      const key = `${Number(surah)}:${Number(ayah)}`;
      return !!mem[key];
    } catch (e) {
      return false;
    }
  }
};
