/* Baseerah — Offline Prayer Times Engine (Powered by adhan-js, MIT) */
import { Coordinates, CalculationMethod, PrayerTimes, Madhab, Prayer } from "../vendor/adhan.esm.js";
import { state } from "./state.js";
import { Storage } from "./storage.js";

export const PrayerEngine = {
  getPrayerTimes(date = new Date()) {
    const lat = typeof state.settings.prayerLat === "number" ? state.settings.prayerLat : 33.6844;
    const lng = typeof state.settings.prayerLng === "number" ? state.settings.prayerLng : 73.0479;
    const coords = new Coordinates(lat, lng);

    let params;
    const methodName = state.settings.prayerMethod || "Karachi";
    if (methodName === "MWL" && CalculationMethod.MuslimWorldLeague) {
      params = CalculationMethod.MuslimWorldLeague();
    } else if (methodName === "UmmAlQura" && CalculationMethod.UmmAlQura) {
      params = CalculationMethod.UmmAlQura();
    } else if (methodName === "Egyptian" && CalculationMethod.Egyptian) {
      params = CalculationMethod.Egyptian();
    } else if (methodName === "NorthAmerica" && CalculationMethod.NorthAmerica) {
      params = CalculationMethod.NorthAmerica();
    } else {
      params = CalculationMethod.Karachi ? CalculationMethod.Karachi() : CalculationMethod.Other();
    }

    const madhabName = state.settings.prayerMadhab || "Hanafi";
    params.madhab = madhabName === "Shafi" ? Madhab.Shafi : Madhab.Hanafi;

    const pt = new PrayerTimes(coords, date, params);

    // Compute current and next prayer
    let current = pt.currentPrayer();
    let next = pt.nextPrayer();
    let nextTime = null;

    if (next === Prayer.None || !next) {
      // If past Isha, next prayer is tomorrow's Fajr
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowPt = new PrayerTimes(coords, tomorrow, params);
      next = Prayer.Fajr;
      nextTime = tomorrowPt.fajr;
    } else {
      nextTime = pt.timeForPrayer(next);
    }

    const now = date.getTime();
    const remainingMs = nextTime ? Math.max(0, nextTime.getTime() - now) : 0;
    const remainingMin = Math.round(remainingMs / 60000);

    const iqamah = state.settings.iqamahTimes || {};

    return {
      fajr: pt.fajr,
      sunrise: pt.sunrise,
      dhuhr: pt.dhuhr,
      asr: pt.asr,
      maghrib: pt.maghrib,
      isha: pt.isha,
      currentPrayer: current,
      nextPrayer: next,
      nextPrayerTime: nextTime,
      remainingMinutes: remainingMin,
      cityName: state.settings.prayerCity || "Islamabad",
      iqamah
    };
  },

  /**
   * Format prayer time in Western digits (0-9) wrapped in <bdi dir="ltr"> for both Urdu and English UI.
   * e.g. <bdi dir="ltr">5:11</bdi> صبح or <bdi dir="ltr">11:50</bdi> شام (Urdu)
   *      <bdi dir="ltr">5:11</bdi> AM or <bdi dir="ltr">11:50</bdi> PM (English)
   * Also accepts "HH:MM" string (e.g. from iqamah / jamaat times) and formats cleanly.
   */
  formatPrayerTime(input, lang = "ur", includeAmPm = true) {
    if (!input) return "—";

    let hours, minutes, isPm;

    if (input instanceof Date) {
      if (isNaN(input.getTime())) return "—";
      hours = input.getHours();
      minutes = input.getMinutes();
      isPm = hours >= 12;
      hours = hours % 12 || 12;
    } else if (typeof input === "string") {
      const normalized = input
        .replace(/[\u0660-\u0669]/g, (d) => d.charCodeAt(0) - 0x0660)
        .replace(/[\u06F0-\u06F9]/g, (d) => d.charCodeAt(0) - 0x06F0)
        .trim();
      const match = normalized.match(/(\d{1,2}):(\d{2})/);
      if (!match) return `<bdi dir="ltr">${normalized}</bdi>`;
      let h = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      isPm = h >= 12 || /pm|شام/i.test(normalized);
      hours = h % 12 || 12;
    } else {
      return "—";
    }

    const minStr = String(minutes).padStart(2, "0");
    const timeBdi = `<bdi dir="ltr">${hours}:${minStr}</bdi>`;

    if (!includeAmPm) {
      return timeBdi;
    }

    const isUr = lang === "ur";
    const ampm = isPm ? (isUr ? "شام" : "PM") : (isUr ? "صبح" : "AM");
    return `${timeBdi} ${ampm}`;
  },

  formatTime(date, lang = "ur") {
    return this.formatPrayerTime(date, lang);
  },

  formatCountdown(minutes, lang = "ur") {
    if (minutes <= 0) return lang === "ur" ? "وقت ہو گیا" : "Due now";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      if (lang === "ur") {
        return `<bdi dir="ltr">${hrs}</bdi> ${hrs === 1 ? "گھنٹہ" : "گھنٹے"} <bdi dir="ltr">${mins}</bdi> منٹ باقی`;
      }
      return `${hrs}h ${mins}m left`;
    }
    if (lang === "ur") {
      return `<bdi dir="ltr">${mins}</bdi> منٹ باقی`;
    }
    return `${mins}m left`;
  },

  async requestDeviceLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      throw new Error("Geolocation not supported by device");
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lng = parseFloat(pos.coords.longitude.toFixed(4));
          state.settings.prayerLat = lat;
          state.settings.prayerLng = lng;
          state.settings.prayerCity = "My Location";
          Storage.saveSettings(state.settings);
          state.notify();
          resolve({ lat, lng, cityName: "My Location" });
        },
        (err) => reject(err),
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  }
};
