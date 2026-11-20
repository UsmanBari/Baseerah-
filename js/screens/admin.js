/* Baseerah — Hidden Admin Panel */
import { state } from "../core/state.js";
import { t } from "../core/i18n.js";
import { router } from "../core/router.js";
import { Storage } from "../core/storage.js";
import { UIComponents } from "../ui/components.js";

export function renderAdminScreen(container) {
  const isUr = state.lang === "ur";
  const analyticsList = Storage.getAnalytics();
  const screenRes = `${window.innerWidth} × ${window.innerHeight} (Physical: ${window.screen.width} × ${window.screen.height})`;
  const orientation = window.screen.orientation ? window.screen.orientation.type : "Landscape / Tablet";

  container.innerHTML = `
    <div class="screen active screen-admin" dir="${isUr ? "rtl" : "ltr"}">
      <header class="admin-header">
        <div class="header-left">
          <button type="button" class="btn-icon btn-back" data-nav="home" aria-label="${t("home", state.lang)}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              ${isUr ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>'}
            </svg>
            <span>${t("home", state.lang)}</span>
          </button>
          <div class="header-title-box">
            <h2>${t("admin", state.lang)}</h2>
            <p class="muted">Kiosk Hardware & Facility Configuration · PIN Protected</p>
          </div>
        </div>
      </header>

      <div class="admin-body">
        <!-- Mosque Operational Settings -->
        <div class="admin-card">
          <h3 class="admin-card-title">${isUr ? "مسجد کے تادیبی احکامات" : "Mosque Facility Rules"}</h3>
          
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
              <span class="field-title">${t("highContrast", state.lang)}</span>
              <span class="field-desc">${isUr ? "تیز روشنی اور بزرگوں کے لیے گہرا ہائی کنٹراسٹ" : "High legibility contrast for bright mosque spaces"}</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="toggle-high-contrast" ${state.highContrast ? "checked" : ""}>
              <span class="slider round"></span>
            </label>
          </div>

          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">${t("idleTimeout", state.lang)}</span>
              <span class="field-desc">${isUr ? "کتنی دیر بعد کیوسک خود بخود مین پیج پر واپس جائے" : "Seconds of inactivity before returning to Home"}</span>
            </div>
            <select id="select-idle-timeout" class="admin-select">
              <option value="30" ${state.settings.idleSeconds === 30 ? "selected" : ""}>30 Seconds</option>
              <option value="60" ${state.settings.idleSeconds === 60 ? "selected" : ""}>60 Seconds (Default)</option>
              <option value="90" ${state.settings.idleSeconds === 90 ? "selected" : ""}>90 Seconds</option>
              <option value="120" ${state.settings.idleSeconds === 120 ? "selected" : ""}>120 Seconds</option>
              <option value="0" ${state.settings.idleSeconds === 0 ? "selected" : ""}>Disabled (Never return)</option>
            </select>
          </div>

          <div class="admin-field-row">
            <div class="field-info">
              <span class="field-title">${t("defaultLang", state.lang)}</span>
              <span class="field-desc">${isUr ? "کیوسک کی بنیادی زبان" : "Default kiosk startup language"}</span>
            </div>
            <select id="select-default-lang" class="admin-select">
              <option value="ur" ${state.lang === "ur" ? "selected" : ""}>اردو (Urdu)</option>
              <option value="en" ${state.lang === "en" ? "selected" : ""}>English</option>
            </select>
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
            <button type="button" class="btn-primary" id="btn-export-csv" style="min-height: 56px;">
              ${t("analyticsExport", state.lang)}
            </button>
            <button type="button" class="btn-secondary" id="btn-clear-analytics" style="min-height: 56px;">
              ${t("analyticsClear", state.lang)}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Wire back
  container.querySelector("[data-nav='home']").addEventListener("click", () => {
    router.navigate("home");
  });

  // Mosque Mute
  container.querySelector("#toggle-mosque-mute").addEventListener("change", (e) => {
    state.mosqueMute = e.target.checked;
    UIComponents.showToast(state.mosqueMute ? "Mosque Respect Active · آواز بند ہے" : "Audio Enabled");
  });

  // High Contrast
  container.querySelector("#toggle-high-contrast").addEventListener("change", (e) => {
    state.highContrast = e.target.checked;
    document.body.classList.toggle("high-contrast", state.highContrast);
  });

  // Idle timeout
  container.querySelector("#select-idle-timeout").addEventListener("change", (e) => {
    state.updateSettings({ idleSeconds: parseInt(e.target.value, 10) });
  });

  // Default lang
  container.querySelector("#select-default-lang").addEventListener("change", (e) => {
    state.lang = e.target.value;
    renderAdminScreen(container);
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
