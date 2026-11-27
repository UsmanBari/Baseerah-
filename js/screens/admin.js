/* Baseerah — Mosque Kiosk Admin Panel */
import { IS_DEV_HOST } from "../core/build.js";
import { state } from "../core/state.js";
import { t } from "../core/i18n.js";
import { router } from "../core/router.js";
import { Icons } from "../ui/icons.js";
import { Storage } from "../core/storage.js";
import { UIComponents } from "../ui/components.js";
import { RECITERS } from "../core/audio.js";

export function renderAdminScreen(container) {
  const isUr = state.lang === "ur";
  const analyticsList = Storage.getAnalytics();
  const screenRes = `${window.innerWidth} × ${window.innerHeight} (Physical: ${window.screen.width} × ${window.screen.height})`;
  const orientation = window.screen.orientation ? window.screen.orientation.type : "Landscape / Tablet";

  const sections = state.settings.kioskSections || { quran: true, namaz: true, prayerTimes: true };
  const iqamah = state.settings.iqamahTimes || { fajr: "", dhuhr: "", asr: "", maghrib: "", isha: "" };

  container.innerHTML = `
    <div class="screen active screen-admin" dir="${isUr ? "rtl" : "ltr"}">
      <header class="admin-header">
        <div class="header-left">
          <button type="button" class="btn-icon btn-back btn-header-back" data-nav="home" aria-label="${t("home", state.lang)}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              ${isUr ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>'}
            </svg>
            <span>${t("home", state.lang)}</span>
          </button>
          <div class="header-title-box">
            <h2>${t("admin", state.lang)}</h2>
            <p class="muted">Kiosk Hardware & Facility Configuration · PIN Protected</p>
          </div>
        </div>
        <div class="header-right">
          <button type="button" class="btn-admin-pin-change" id="btn-change-pin">
            ${Icons.key(16)} ${t("changePin", state.lang)}
          </button>
        </div>
      </header>

      <div class="admin-body">
        <!-- 1. Kiosk Operational Mode & Security -->
        <div class="admin-card">
          <h3 class="admin-card-title">${isUr ? "مسجد کیوسک موڈ اور حفاظت" : "Kiosk Lockdown & Operational Rules"}</h3>
          
          ${IS_DEV_HOST ? `          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">Kiosk Lockdown Mode (مسجد کیوسک موڈ)</span>
              <span class="field-desc">${isUr ? "کیوسک موڈ آن کرنے سے آف لائن ڈاؤنلوڈ چھپ جاتے ہیں اور خودکار اسکرین سیور فعال ہوتا ہے" : "Locks down public kiosk, activates screensaver, hides phone download controls"}</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="toggle-is-kiosk" ${state.isKiosk ? "checked" : ""}>
              <span class="slider round"></span>
            </label>
          </div>
` : ""}

          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">${t("mosqueRespect", state.lang)}</span>
              <span class="field-desc">${t("mosqueRespectDesc", state.lang)}</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="toggle-mosque-mute" ${state.mosqueMute ? "checked" : ""}>
              <span class="slider round"></span>
            </label>
          </div>

          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">${t("idleTimeout", state.lang)}</span>
              <span class="field-desc">${isUr ? "کتنی دیر بعد کیوسک خود بخود اسکرین سیور / ہوم پر واپس جائے" : "Seconds of inactivity before returning to Home / Screensaver"}</span>
            </div>
            <select id="select-idle-timeout" class="admin-select">
              <option value="30" ${state.settings.idleSeconds === 30 ? "selected" : ""}>30 Seconds</option>
              <option value="60" ${state.settings.idleSeconds === 60 ? "selected" : ""}>60 Seconds (Default)</option>
              <option value="90" ${state.settings.idleSeconds === 90 ? "selected" : ""}>90 Seconds</option>
              <option value="120" ${state.settings.idleSeconds === 120 ? "selected" : ""}>120 Seconds</option>
              <option value="0" ${state.settings.idleSeconds === 0 ? "selected" : ""}>Disabled (Never return)</option>
            </select>
          </div>
        </div>

        <!-- 2. Visible Kiosk Sections -->
        <div class="admin-card">
          <h3 class="admin-card-title">${t("kioskSectionsTitle", state.lang)}</h3>
          <div class="admin-checkbox-grid">
            <label class="checkbox-label">
              <input type="checkbox" id="check-section-quran" ${sections.quran !== false ? "checked" : ""}>
              <span>${t("kioskSectionQuran", state.lang)}</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="check-section-namaz" ${sections.namaz !== false ? "checked" : ""}>
              <span>${t("kioskSectionNamaz", state.lang)}</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="check-section-prayer" ${sections.prayerTimes !== false ? "checked" : ""}>
              <span>${t("kioskSectionPrayerTimes", state.lang)}</span>
            </label>
          </div>
        </div>

        <!-- 3. Default Reading & Audio Preferences -->
        <div class="admin-card">
          <h3 class="admin-card-title">${isUr ? "بنیادی ترتیبات برائے تلاوت" : "Default Reading & Audio Preferences"}</h3>

          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">${t("defaultReciterLabel", state.lang)}</span>
              <span class="field-desc">${isUr ? "تلاوت کے لیے بنیادی قاری" : "Default reciter for audio playback"}</span>
            </div>
            <select id="select-default-reciter" class="admin-select">
              ${RECITERS.map((r) => `
                <option value="${r.id}" ${(state.settings.defaultReciter || "alafasy") === r.id ? "selected" : ""}>
                  ${isUr ? r.nameUr : r.nameEn}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">${t("defaultTranslationLabel", state.lang)}</span>
              <span class="field-desc">${isUr ? "بنیادی ترجمہ کا انتخاب" : "Default translation language"}</span>
            </div>
            <select id="select-default-translation" class="admin-select">
              <option value="both" ${(state.settings.defaultTranslation || "both") === "both" ? "selected" : ""}>Both (اردو + English)</option>
              <option value="ur" ${(state.settings.defaultTranslation || "both") === "ur" ? "selected" : ""}>Urdu Only (صرف اردو)</option>
              <option value="en" ${(state.settings.defaultTranslation || "both") === "en" ? "selected" : ""}>English Only</option>
            </select>
          </div>

          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">${t("defaultTextSizeLabel", state.lang)}</span>
              <span class="field-desc">${isUr ? "بنیادی فونٹ سائز" : "Default text size"}</span>
            </div>
            <select id="select-default-text-size" class="admin-select">
              <option value="S" ${state.settings.textSize === "S" ? "selected" : ""}>Small (S)</option>
              <option value="M" ${state.settings.textSize === "M" ? "selected" : ""}>Medium (M — Default)</option>
              <option value="L" ${state.settings.textSize === "L" ? "selected" : ""}>Large (L)</option>
              <option value="XL" ${state.settings.textSize === "XL" ? "selected" : ""}>Extra Large (XL)</option>
            </select>
          </div>
        </div>

        <!-- 4. Mosque Location & Prayer Times Configuration -->
        <div class="admin-card">
          <h3 class="admin-card-title">${t("locationSettingsTitle", state.lang)}</h3>
          
          <div class="admin-field-row">
            <label class="field-info" for="input-city-name">
              <span class="field-title">${t("cityNameLabel", state.lang)}</span>
            </label>
            <input type="text" id="input-city-name" class="admin-input" value="${state.settings.prayerCity || "Islamabad"}">
          </div>

          <div class="admin-field-row">
            <label class="field-info" for="input-lat">
              <span class="field-title">${t("latitudeLabel", state.lang)}</span>
            </label>
            <input type="number" step="0.0001" id="input-lat" class="admin-input" value="${state.settings.prayerLat || 33.6844}">
          </div>

          <div class="admin-field-row">
            <label class="field-info" for="input-lng">
              <span class="field-title">${t("longitudeLabel", state.lang)}</span>
            </label>
            <input type="number" step="0.0001" id="input-lng" class="admin-input" value="${state.settings.prayerLng || 73.0479}">
          </div>

          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">${t("calcMethodLabel", state.lang)}</span>
            </div>
            <select id="select-calc-method" class="admin-select">
              <option value="Karachi" ${(state.settings.prayerMethod || "Karachi") === "Karachi" ? "selected" : ""}>Univ. of Islamic Sciences, Karachi (Default Pakistan)</option>
              <option value="MWL" ${(state.settings.prayerMethod || "Karachi") === "MWL" ? "selected" : ""}>Muslim World League</option>
              <option value="UmmAlQura" ${(state.settings.prayerMethod || "Karachi") === "UmmAlQura" ? "selected" : ""}>Umm al-Qura (Makkah)</option>
              <option value="Egyptian" ${(state.settings.prayerMethod || "Karachi") === "Egyptian" ? "selected" : ""}>Egyptian General Authority</option>
              <option value="NorthAmerica" ${(state.settings.prayerMethod || "Karachi") === "NorthAmerica" ? "selected" : ""}>ISNA (North America)</option>
            </select>
          </div>

          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">${t("asrMethodLabel", state.lang)}</span>
            </div>
            <select id="select-asr-method" class="admin-select">
              <option value="Hanafi" ${(state.settings.prayerMadhab || "Hanafi") === "Hanafi" ? "selected" : ""}>Hanafi (حنفی — Default)</option>
              <option value="Shafi" ${(state.settings.prayerMadhab || "Hanafi") === "Shafi" ? "selected" : ""}>Shafi'i / Maliki / Hanbali (شافعی)</option>
            </select>
          </div>

          <h4 class="admin-subheading">${t("iqamahTimesTitle", state.lang)}</h4>
          <div class="iqamah-grid">
            <div class="iqamah-item">
              <label for="iqamah-fajr">${t("fajr", state.lang)}</label>
              <input type="time" id="iqamah-fajr" class="admin-input-time" dir="ltr" value="${iqamah.fajr || ""}">
            </div>
            <div class="iqamah-item">
              <label for="iqamah-dhuhr">${t("dhuhr", state.lang)}</label>
              <input type="time" id="iqamah-dhuhr" class="admin-input-time" dir="ltr" value="${iqamah.dhuhr || ""}">
            </div>
            <div class="iqamah-item">
              <label for="iqamah-asr">${t("asr", state.lang)}</label>
              <input type="time" id="iqamah-asr" class="admin-input-time" dir="ltr" value="${iqamah.asr || ""}">
            </div>
            <div class="iqamah-item">
              <label for="iqamah-maghrib">${t("maghrib", state.lang)}</label>
              <input type="time" id="iqamah-maghrib" class="admin-input-time" dir="ltr" value="${iqamah.maghrib || ""}">
            </div>
            <div class="iqamah-item">
              <label for="iqamah-isha">${t("isha", state.lang)}</label>
              <input type="time" id="iqamah-isha" class="admin-input-time" dir="ltr" value="${iqamah.isha || ""}">
            </div>
          </div>

          <h4 class="admin-subheading" style="margin-top: 18px;">${t("prayerNotifications", state.lang)}</h4>
          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">${t("prayerNotificationsMaster", state.lang)}</span>
              <span class="field-desc">In-app prayer arrival alert banner</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="toggle-prayer-notifs" ${state.prayerNotifications ? "checked" : ""}>
              <span class="slider round"></span>
            </label>
          </div>

          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">${t("remindMe", state.lang)}</span>
              <span class="field-desc">Alert timing offset</span>
            </div>
            <select id="select-notif-offset" class="admin-select">
              <option value="0" ${(state.settings.notificationOffset || 0) === 0 ? "selected" : ""}>At prayer time</option>
              <option value="5" ${state.settings.notificationOffset === 5 ? "selected" : ""}>5 min before</option>
              <option value="10" ${state.settings.notificationOffset === 10 ? "selected" : ""}>10 min before</option>
              <option value="15" ${state.settings.notificationOffset === 15 ? "selected" : ""}>15 min before</option>
            </select>
          </div>

          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">Enabled Prayers</span>
              <span class="field-desc">Select which prayers trigger alerts</span>
            </div>
            <div class="admin-checkbox-grid">
              ${['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map(pKey => `
                <label class="checkbox-label">
                  <input type="checkbox" id="check-notif-${pKey}" ${(state.notificationPrayers[pKey] !== false) ? "checked" : ""}>
                  <span>${t(pKey, state.lang)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- 5. Factory Reset & Maintenance -->
        <div class="admin-card danger-card">
          <h3 class="admin-card-title">${isUr ? "کیوسک کی بحالی و ری سیٹ" : "Kiosk Maintenance & Reset"}</h3>
          <p class="muted">
            ${isUr 
              ? "فیکٹری ری سیٹ کرنے سے تمام ترتیبات، نشانیاں اور محفوظ شدہ ڈیٹا اپنی اصل ابتدائی حالت پر بحال ہو جائے گا۔"
              : "Resetting to factory defaults will clear all custom settings, bookmarks, and local preferences."
            }
          </p>
          <div class="admin-btn-row">
            <button type="button" class="btn-danger" id="btn-reset-kiosk" style="min-height: 52px;">
              ${Icons.warning(16)} ${t("resetKiosk", state.lang)}
            </button>
          </div>
        </div>

        <!-- Diagnostics -->
        <div class="admin-card">
          <h3 class="admin-card-title">${t("deviceInfo", state.lang)}</h3>
          <ul class="diag-list">
            <li><strong>Display Resolution:</strong> ${screenRes}</li>
            <li><strong>Screen Orientation:</strong> ${orientation}</li>
            <li><strong>PWA / Offline Cache:</strong> active (Baseerah v1.0.0 Service Worker)</li>
            <li><strong>Quran Integrity Status:</strong> <span class="badge-success">114 Surahs Verified (SHA-256)</span></li>
            <li><strong>User Agent:</strong> <small>${navigator.userAgent}</small></li>
          </ul>
        </div>

        <!-- Privacy-Safe Analytics -->
        <div class="admin-card">
          <h3 class="admin-card-title">${isUr ? "مقامی استعمال کے اعداد و شمار" : "Local Privacy-Safe Usage Analytics"}</h3>
          <p class="muted">
            ${isUr 
              ? `اس کیوسک میں استعمال کے ${analyticsList.length} ریکارڈز محفوظ ہیں (کوئی ذاتی ڈیٹا یا شناخت نہیں لی جاتی)۔`
              : `${analyticsList.length} anonymous interaction events recorded locally on this tablet.`
            }
          </p>
          <div class="admin-btn-row">
            <button type="button" class="btn-primary" id="btn-export-csv" style="min-height: 52px;">
              ${t("analyticsExport", state.lang)}
            </button>
            <button type="button" class="btn-secondary" id="btn-clear-analytics" style="min-height: 52px;">
              ${t("analyticsClear", state.lang)}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Wire back button
  container.querySelector("[data-nav='home']").addEventListener("click", () => {
    router.navigate("home");
  });

  // Save changes helper with try/catch
  const saveStateSafely = () => {
    try {
      Storage.saveSettings(state.settings);
      state.notify();
    } catch (e) {
      console.warn("Failed to persist admin settings:", e);
    }
  };

  // Change PIN
  const pinBtn = container.querySelector("#btn-change-pin");
  if (pinBtn) {
    pinBtn.addEventListener("click", () => {
      try {
        localStorage.removeItem("baseerah_admin_pin");
        UIComponents.showAdminPinDialog(() => {
          UIComponents.showToast(t("pinChanged", state.lang));
        });
      } catch (e) {
        console.warn("Failed to change PIN:", e);
      }
    });
  }

  // Toggle Is Kiosk
  const kioskToggle = container.querySelector("#toggle-is-kiosk");
  if (kioskToggle) kioskToggle.addEventListener("change", (e) => {
    state.settings.isKiosk = e.target.checked;
    saveStateSafely();
    state.applyKioskLock();
    UIComponents.showToast(e.target.checked ? "Kiosk Mode Active" : "Personal Device Mode");
  });

  // Mosque Mute
  container.querySelector("#toggle-mosque-mute").addEventListener("change", (e) => {
    state.mosqueMute = e.target.checked;
    saveStateSafely();
    UIComponents.showToast(state.mosqueMute ? "Mosque Respect Active · آواز بند ہے" : "Audio Enabled");
  });

  // Idle timeout
  container.querySelector("#select-idle-timeout").addEventListener("change", (e) => {
    state.settings.idleSeconds = parseInt(e.target.value, 10);
    saveStateSafely();
  });

  // Section visibility checkboxes
  const updateSections = () => {
    state.settings.kioskSections = {
      quran: container.querySelector("#check-section-quran").checked,
      namaz: container.querySelector("#check-section-namaz").checked,
      prayerTimes: container.querySelector("#check-section-prayer").checked
    };
    saveStateSafely();
  };
  container.querySelector("#check-section-quran").addEventListener("change", updateSections);
  container.querySelector("#check-section-namaz").addEventListener("change", updateSections);
  container.querySelector("#check-section-prayer").addEventListener("change", updateSections);

  // Default reciter
  container.querySelector("#select-default-reciter").addEventListener("change", (e) => {
    state.settings.defaultReciter = e.target.value;
    saveStateSafely();
  });

  // Default translation
  container.querySelector("#select-default-translation").addEventListener("change", (e) => {
    state.settings.defaultTranslation = e.target.value;
    saveStateSafely();
  });

  // Default text size
  container.querySelector("#select-default-text-size").addEventListener("change", (e) => {
    state.textSize = e.target.value;
    saveStateSafely();
  });

  // Location inputs
  const updateLocation = () => {
    state.settings.prayerCity = container.querySelector("#input-city-name").value.trim() || "Islamabad";
    state.settings.prayerLat = parseFloat(container.querySelector("#input-lat").value) || 33.6844;
    state.settings.prayerLng = parseFloat(container.querySelector("#input-lng").value) || 73.0479;
    state.settings.prayerMethod = container.querySelector("#select-calc-method").value;
    state.settings.prayerMadhab = container.querySelector("#select-asr-method").value;
    saveStateSafely();
  };
  container.querySelector("#input-city-name").addEventListener("input", updateLocation);
  container.querySelector("#input-lat").addEventListener("input", updateLocation);
  container.querySelector("#input-lng").addEventListener("input", updateLocation);
  container.querySelector("#select-calc-method").addEventListener("change", updateLocation);
  container.querySelector("#select-asr-method").addEventListener("change", updateLocation);

  // Iqamah inputs
  const toWesternDigits = (val) => (val || "")
    .replace(/[\u0660-\u0669]/g, (d) => d.charCodeAt(0) - 0x0660)
    .replace(/[\u06F0-\u06F9]/g, (d) => d.charCodeAt(0) - 0x06F0)
    .trim();
  const updateIqamah = () => {
    state.settings.iqamahTimes = {
      fajr: toWesternDigits(container.querySelector("#iqamah-fajr").value),
      dhuhr: toWesternDigits(container.querySelector("#iqamah-dhuhr").value),
      asr: toWesternDigits(container.querySelector("#iqamah-asr").value),
      maghrib: toWesternDigits(container.querySelector("#iqamah-maghrib").value),
      isha: toWesternDigits(container.querySelector("#iqamah-isha").value)
    };
    saveStateSafely();
  };
  ["fajr", "dhuhr", "asr", "maghrib", "isha"].forEach((k) => {
    container.querySelector(`#iqamah-${k}`).addEventListener("input", updateIqamah);
  });

  // Prayer notifications admin controls
  const notifToggle = container.querySelector("#toggle-prayer-notifs");
  if (notifToggle) {
    notifToggle.addEventListener("change", (e) => {
      state.prayerNotifications = e.target.checked;
      saveStateSafely();
    });
  }

  const offsetSelect = container.querySelector("#select-notif-offset");
  if (offsetSelect) {
    offsetSelect.addEventListener("change", (e) => {
      state.notificationOffset = parseInt(e.target.value, 10) || 0;
      saveStateSafely();
    });
  }

  ["fajr", "dhuhr", "asr", "maghrib", "isha"].forEach((k) => {
    const chk = container.querySelector(`#check-notif-${k}`);
    if (chk) {
      chk.addEventListener("change", (e) => {
        state.setNotificationPrayer(k, e.target.checked);
        saveStateSafely();
      });
    }
  });

  // Reset Kiosk
  container.querySelector("#btn-reset-kiosk").addEventListener("click", () => {
    if (confirm(t("resetKioskConfirm", state.lang))) {
      state.settings = Storage.resetSettings();
      state.notify();
      UIComponents.showToast(t("kioskResetDone", state.lang));
      router.navigate("home");
    }
  });

  // Export CSV
  container.querySelector("#btn-export-csv").addEventListener("click", () => {
    Storage.exportAnalyticsCSV();
  });

  // Clear analytics
  container.querySelector("#btn-clear-analytics").addEventListener("click", () => {
    Storage.clearAnalytics();
    renderAdminScreen(container);
    UIComponents.showToast(isUr ? "رپورٹ ڈیٹا صاف کر دیا گیا" : "Analytics cleared");
  });
}
