/* Baseerah — Storage & Local Analytics */

const STORAGE_KEYS = {
  SETTINGS: "baseerah_settings",
  ANALYTICS: "baseerah_analytics"
};

const DEFAULT_SETTINGS = {
  idleSeconds: 60,
  attractSeconds: 60,
  lang: "ur",
  fontScale: "normal", // "normal", "large", "xlarge"
  fontScaleLevel: 3,   // 1 to 5 (3 is normal 1.0x)
  meaningDisplay: "both", // "both" | "ur" | "en"
  highContrast: false,
  mosqueMute: false, // Default is false (mute is an admin opt-in per mosque)
  readingMode: "wbw", // "wbw" | "mushaf"
  translationDisplay: "both", // "both" | "ur" | "en"
  showMorphology: false, // automatic morphology color coding spike
  morphologyStyle: "underline" // "underline" (Style A) | "tint" (Style B)
};

export const Storage = {
  getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      delete parsed.mushafShowTranslation;
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
  }
};
