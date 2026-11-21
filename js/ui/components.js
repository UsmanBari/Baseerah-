/* Baseerah — Reusable Kiosk UI Components */
import { state } from "../core/state.js";
import { t, toUrduDigits } from "../core/i18n.js";
import { router } from "../core/router.js";

export const UIComponents = {
  /**
   * Shows a touch-friendly numeric keypad dialog for entering Surah and Ayah numbers
   */
  showKeypadDialog({ maxAyahs = 286, currentSurah = 1, onJump }) {
    const isUr = state.lang === "ur";
    const dialog = document.createElement("div");
    dialog.className = "modal-overlay active";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    let activeField = "ayah"; // "surah" | "ayah"
    let surahVal = String(currentSurah);
    let ayahVal = "1";
    let isFirstSurahInput = true;
    let isFirstAyahInput = true;

    const render = () => {
      dialog.innerHTML = `
        <div class="modal-card">
          <div class="modal-header">
            <h3>${t("gotoAyah", state.lang)}</h3>
            <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">✕</button>
          </div>
          <div class="keypad-inputs">
            <div class="keypad-field ${activeField === "surah" ? "active" : ""}" data-field="surah">
              <span class="field-label">${t("surahNumber", state.lang)}</span>
              <span class="field-val urdu-num">${isUr ? toUrduDigits(surahVal) : surahVal}</span>
            </div>
            <div class="keypad-field ${activeField === "ayah" ? "active" : ""}" data-field="ayah">
              <span class="field-label">${t("ayahNumber", state.lang)} (1–${isUr ? `<span class="urdu-num">${toUrduDigits(maxAyahs)}</span>` : maxAyahs})</span>
              <span class="field-val urdu-num">${isUr ? toUrduDigits(ayahVal) : ayahVal}</span>
            </div>
          </div>
          <div class="touch-keypad">
            <button type="button" class="key-btn" data-key="1">1</button>
            <button type="button" class="key-btn" data-key="2">2</button>
            <button type="button" class="key-btn" data-key="3">3</button>
            <button type="button" class="key-btn" data-key="4">4</button>
            <button type="button" class="key-btn" data-key="5">5</button>
            <button type="button" class="key-btn" data-key="6">6</button>
            <button type="button" class="key-btn" data-key="7">7</button>
            <button type="button" class="key-btn" data-key="8">8</button>
            <button type="button" class="key-btn" data-key="9">9</button>
            <button type="button" class="key-btn key-clear" data-action="clear">${t("clear", state.lang)}</button>
            <button type="button" class="key-btn" data-key="0">0</button>
            <button type="button" class="key-btn key-backspace" data-action="backspace">⌫</button>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-primary btn-jump" style="min-height: 56px; width: 100%;">
              ${t("jump", state.lang)}
            </button>
          </div>
        </div>
      `;

      // Wire fields
      dialog.querySelectorAll(".keypad-field").forEach((f) => {
        f.addEventListener("click", () => {
          activeField = f.getAttribute("data-field");
          render();
        });
      });

      // Wire keys
      dialog.querySelectorAll(".key-btn[data-key]").forEach((k) => {
        k.addEventListener("click", () => {
          const num = k.getAttribute("data-key");
          if (activeField === "surah") {
            if (isFirstSurahInput || surahVal === "0") {
              surahVal = num;
              isFirstSurahInput = false;
            } else if (surahVal.length < 3) {
              surahVal += num;
            }
            const parsed = parseInt(surahVal, 10);
            if (parsed > 114) surahVal = "114";
            if (parsed < 1) surahVal = "1";
          } else {
            if (isFirstAyahInput || ayahVal === "0") {
              ayahVal = num;
              isFirstAyahInput = false;
            } else if (ayahVal.length < 3) {
              ayahVal += num;
            }
            const parsed = parseInt(ayahVal, 10);
            if (parsed > maxAyahs) ayahVal = String(maxAyahs);
            if (parsed < 1) ayahVal = "1";
          }
          render();
        });
      });

      dialog.querySelector("[data-action='clear']").addEventListener("click", () => {
        if (activeField === "surah") surahVal = "1";
        else ayahVal = "1";
        render();
      });

      dialog.querySelector("[data-action='backspace']").addEventListener("click", () => {
        if (activeField === "surah") {
          surahVal = surahVal.slice(0, -1) || "1";
        } else {
          ayahVal = ayahVal.slice(0, -1) || "1";
        }
        render();
      });

      dialog.querySelector(".btn-close").addEventListener("click", () => {
        document.body.removeChild(dialog);
      });

      dialog.querySelector(".btn-jump").addEventListener("click", () => {
        const s = parseInt(surahVal, 10) || 1;
        const a = parseInt(ayahVal, 10) || 1;
        document.body.removeChild(dialog);
        if (onJump) onJump(s, a);
      });
    };

    render();
    document.body.appendChild(dialog);
  },

  /**
   * Prompts for Admin PIN (6 digits, setup on first launch, salted hash + 60s lockout)
   */
  async showAdminPinDialog(onSuccess) {
    const dialog = document.createElement("div");
    dialog.className = "modal-overlay active";

    const hashString = async (str) => {
      if (window.crypto && window.crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
      // Simple fallback
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
      return String(hash);
    };

    let storedHash = localStorage.getItem("baseerah_admin_pin_hash");
    let storedSalt = localStorage.getItem("baseerah_admin_pin_salt");

    // Mode: "setup_entry", "setup_confirm", "verify"
    let mode = !storedHash ? "setup_entry" : "verify";
    let firstEnteredPin = "";
    let enteredPin = "";
    let errorMsg = "";

    const checkLockout = () => {
      const lockoutUntil = parseInt(localStorage.getItem("baseerah_admin_lockout_until") || "0", 10);
      const now = Date.now();
      if (lockoutUntil > now) {
        return Math.ceil((lockoutUntil - now) / 1000);
      }
      return 0;
    };

    const render = () => {
      const remainingLockout = checkLockout();
      const isLocked = remainingLockout > 0;
      const isUr = state.lang === "ur";

      let promptTitle = t("admin", state.lang);
      let promptText = "";
      if (isLocked) {
        promptText = isUr ? `کیوسک لاک ہے۔ ${remainingLockout} سیکنڈ بعد دوبارہ کوشش کریں۔` : `Locked out. Try again in ${remainingLockout}s.`;
      } else if (mode === "setup_entry") {
        promptText = isUr ? "نیا ایڈمن پن کوڈ درج کریں (۶ ہندسے)" : "Set new 6-digit Admin PIN (Step 1/2)";
      } else if (mode === "setup_confirm") {
        promptText = isUr ? "پن کوڈ کی تصدیق کریں (۶ ہندسے)" : "Confirm 6-digit Admin PIN (Step 2/2)";
      } else {
        promptText = isUr ? "ایڈمن پن کوڈ درج کریں" : "Enter 6-digit Admin PIN";
      }

      dialog.innerHTML = `
        <div class="modal-card">
          <div class="modal-header">
            <h3>${promptTitle}</h3>
            <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">✕</button>
          </div>
          <p class="modal-prompt" style="${isLocked ? "color: var(--color-danger); font-weight: 700;" : ""}">${promptText}</p>
          <div class="pin-display">
            <span class="pin-dot ${enteredPin.length >= 1 ? "filled" : ""}"></span>
            <span class="pin-dot ${enteredPin.length >= 2 ? "filled" : ""}"></span>
            <span class="pin-dot ${enteredPin.length >= 3 ? "filled" : ""}"></span>
            <span class="pin-dot ${enteredPin.length >= 4 ? "filled" : ""}"></span>
            <span class="pin-dot ${enteredPin.length >= 5 ? "filled" : ""}"></span>
            <span class="pin-dot ${enteredPin.length >= 6 ? "filled" : ""}"></span>
          </div>
          ${errorMsg ? `<p class="pin-error">${errorMsg}</p>` : ""}
          <div class="touch-keypad">
            <button type="button" class="key-btn" data-key="1" ${isLocked ? "disabled" : ""}>1</button>
            <button type="button" class="key-btn" data-key="2" ${isLocked ? "disabled" : ""}>2</button>
            <button type="button" class="key-btn" data-key="3" ${isLocked ? "disabled" : ""}>3</button>
            <button type="button" class="key-btn" data-key="4" ${isLocked ? "disabled" : ""}>4</button>
            <button type="button" class="key-btn" data-key="5" ${isLocked ? "disabled" : ""}>5</button>
            <button type="button" class="key-btn" data-key="6" ${isLocked ? "disabled" : ""}>6</button>
            <button type="button" class="key-btn" data-key="7" ${isLocked ? "disabled" : ""}>7</button>
            <button type="button" class="key-btn" data-key="8" ${isLocked ? "disabled" : ""}>8</button>
            <button type="button" class="key-btn" data-key="9" ${isLocked ? "disabled" : ""}>9</button>
            <button type="button" class="key-btn key-clear" data-action="clear" ${isLocked ? "disabled" : ""}>${t("clear", state.lang)}</button>
            <button type="button" class="key-btn" data-key="0" ${isLocked ? "disabled" : ""}>0</button>
            <button type="button" class="key-btn key-backspace" data-action="backspace" ${isLocked ? "disabled" : ""}>⌫</button>
          </div>
        </div>
      `;

      dialog.querySelectorAll(".key-btn[data-key]").forEach((k) => {
        k.addEventListener("click", async () => {
          if (isLocked) return;
          if (enteredPin.length < 6) {
            enteredPin += k.getAttribute("data-key");
            errorMsg = "";

            if (enteredPin.length === 6) {
              if (mode === "setup_entry") {
                firstEnteredPin = enteredPin;
                enteredPin = "";
                mode = "setup_confirm";
                render();
                return;
              }

              if (mode === "setup_confirm") {
                if (enteredPin === firstEnteredPin) {
                  // Save salted hash
                  const salt = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
                  const hash = await hashString(salt + enteredPin);
                  localStorage.setItem("baseerah_admin_pin_salt", salt);
                  localStorage.setItem("baseerah_admin_pin_hash", hash);
                  localStorage.setItem("baseerah_admin_failed_attempts", "0");
                  document.body.removeChild(dialog);
                  if (onSuccess) onSuccess();
                  return;
                } else {
                  errorMsg = isUr ? "پن کوڈ مماثل نہیں ہے۔ دوبارہ درج کریں۔" : "PINs do not match. Start over.";
                  mode = "setup_entry";
                  firstEnteredPin = "";
                  enteredPin = "";
                  render();
                  return;
                }
              }

              if (mode === "verify") {
                const computedHash = await hashString(storedSalt + enteredPin);
                if (computedHash === storedHash) {
                  localStorage.setItem("baseerah_admin_failed_attempts", "0");
                  document.body.removeChild(dialog);
                  if (onSuccess) onSuccess();
                  return;
                } else {
                  let failed = parseInt(localStorage.getItem("baseerah_admin_failed_attempts") || "0", 10) + 1;
                  localStorage.setItem("baseerah_admin_failed_attempts", String(failed));
                  enteredPin = "";

                  if (failed >= 5) {
                    localStorage.setItem("baseerah_admin_lockout_until", String(Date.now() + 60000));
                    localStorage.setItem("baseerah_admin_failed_attempts", "0");
                    errorMsg = isUr ? "۵ بار غلط کوشش۔ ۶۰ سیکنڈ لاک آؤٹ۔" : "5 failed attempts. Locked for 60s.";
                  } else {
                    errorMsg = isUr ? `غلط پن کوڈ۔ (${5 - failed} کوششیں باقی)` : `Incorrect PIN. (${5 - failed} attempts remaining)`;
                  }
                  render();
                  return;
                }
              }
            }
            render();
          }
        });
      });

      dialog.querySelector("[data-action='clear']").addEventListener("click", () => {
        enteredPin = "";
        errorMsg = "";
        render();
      });

      dialog.querySelector("[data-action='backspace']").addEventListener("click", () => {
        enteredPin = enteredPin.slice(0, -1);
        errorMsg = "";
        render();
      });

      dialog.querySelector(".btn-close").addEventListener("click", () => {
        document.body.removeChild(dialog);
      });
    };

    render();
    document.body.appendChild(dialog);
  },

  /**
   * Bottom sheet for Mushaf Mode when an ayah is tapped
   */
  showMushafBottomSheet(ayahData, surahNameAr, surahNameEn) {
    const isUr = state.lang === "ur";
    const sheet = document.createElement("div");
    sheet.className = "bottom-sheet-overlay active";

    const wordsHtml = (ayahData.words || []).map((w) => `
      <div class="mushaf-word-pill">
        <span class="mushaf-word-ar" lang="ar">${w.ar}</span>
        <span class="mushaf-word-ur" lang="ur">${w.ur || "—"}</span>
        <span class="mushaf-word-en">${w.en || "—"}</span>
      </div>
    `).join("");

    sheet.innerHTML = `
      <div class="bottom-sheet">
        <div class="bottom-sheet-handle"></div>
        <div class="bottom-sheet-header">
          <div class="sheet-title-box">
            <span class="sheet-surah-ar" lang="ar">${surahNameAr}</span>
            <span class="sheet-ayah-badge">${isUr ? `آیت <span class="urdu-num">${toUrduDigits(ayahData.number)}</span>` : "Ayah " + ayahData.number}</span>
          </div>
          <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">✕</button>
        </div>
        <div class="bottom-sheet-content">
          <div class="sheet-full-ar" lang="ar" dir="rtl">${ayahData.arFull}</div>
          <div class="sheet-translation-section">
            <div class="sheet-trans-item">
              <span class="sheet-trans-label" lang="ur">اردو ترجمہ (مولانا محمد جوناگڑھی)</span>
              <p class="sheet-trans-text" lang="ur" dir="rtl">${ayahData.ur}</p>
            </div>
            <div class="sheet-trans-item">
              <span class="sheet-trans-label">English Translation (Saheeh International)</span>
              <p class="sheet-trans-text" dir="ltr">${ayahData.en}</p>
            </div>
          </div>
          <h4 class="sheet-wbw-heading">${t("readingModeWbw", state.lang)}</h4>
          <div class="sheet-wbw-grid" dir="rtl">
            ${wordsHtml}
          </div>
        </div>
      </div>
    `;

    sheet.querySelector(".btn-close").addEventListener("click", () => {
      document.body.removeChild(sheet);
    });

    sheet.addEventListener("click", (e) => {
      if (e.target === sheet) {
        document.body.removeChild(sheet);
      }
    });

    document.body.appendChild(sheet);
  },

  /**
   * Generates an authentic 8-point Islamic star (Khatim) medallion SVG
   * Displays the ayah number inside in Urdu numerals
   */
  getAyahMedallionSvg(ayahNumber, size = 48) {
    const urduNum = toUrduDigits(ayahNumber);
    return `
      <span class="ayah-medallion-badge" aria-label="Ayah ${ayahNumber}">
        <svg class="ayah-medallion-svg" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none">
          <g fill="#FFFDF7" stroke="#C99A2E" stroke-width="1.8">
            <rect x="9" y="9" width="30" height="30" rx="3" />
            <rect x="9" y="9" width="30" height="30" rx="3" transform="rotate(45 24 24)" />
          </g>
          <circle cx="24" cy="24" r="13.5" fill="#FAF6EC" stroke="#D9B45A" stroke-width="1.2"/>
          <text x="24" y="29" text-anchor="middle" font-family="'Noto Naskh Arabic', 'Noto Nastaliq Urdu', 'AlQuran IndoPak', serif" font-size="15" font-weight="700" fill="#0B4A3B">${urduNum}</text>
        </svg>
      </span>
    `;
  },

  /**
   * Displays scholarly QuranEnc footnote in a bottom sheet
   */
  showFootnoteBottomSheet({ footnoteNum, footnoteText, lang = "ur", surahNum, ayahNum }) {
    const isUr = lang === "ur";
    const sheet = document.createElement("div");
    sheet.className = "bottom-sheet-overlay active";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    sheet.innerHTML = `
      <div class="bottom-sheet footnote-sheet">
        <div class="bottom-sheet-handle"></div>
        <div class="bottom-sheet-header">
          <div class="sheet-title-box">
            <span class="sheet-surah-ar">${isUr ? `حاشیہ نمبر [<span class="urdu-num">${toUrduDigits(footnoteNum)}</span>]` : `Footnote [${footnoteNum}]`}</span>
            <span class="sheet-ayah-badge">${isUr ? `آیت <span class="urdu-num">${toUrduDigits(surahNum)}</span>:<span class="urdu-num">${toUrduDigits(ayahNum)}</span>` : `Ayah ${surahNum}:${ayahNum}`}</span>
          </div>
          <button type="button" class="btn-close" aria-label="${t("close", lang)}">✕</button>
        </div>
        <div class="bottom-sheet-content">
          <div class="footnote-body ${isUr ? 'ur' : 'en'}" lang="${isUr ? 'ur' : 'en'}" dir="${isUr ? 'rtl' : 'ltr'}">
            <p class="footnote-text" lang="${isUr ? 'ur' : 'en'}" dir="${isUr ? 'rtl' : 'ltr'}">${footnoteText || (isUr ? "کوئی اضافی تشریح موجود نہیں۔" : "No additional footnote text.")}</p>
          </div>
          <div class="footnote-source-tag">
            <span lang="${isUr ? 'ur' : 'en'}" dir="${isUr ? 'rtl' : 'ltr'}">${isUr ? "ماخذ: تفسیر و حواشی مجمع الملک فہد / QuranEnc" : "Source: King Fahd Complex / QuranEnc"}</span>
          </div>
        </div>
      </div>
    `;

    const close = () => {
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
    };

    sheet.querySelector(".btn-close").addEventListener("click", close);
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet) close();
    });

    document.body.appendChild(sheet);
  },

  showTranslationBottomSheet({ title, text, lang = "ur", surahNum, ayahNum }) {
    const isUr = lang === "ur";
    const sheet = document.createElement("div");
    sheet.className = "bottom-sheet-overlay active";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    sheet.innerHTML = `
      <div class="bottom-sheet translation-sheet" dir="${isUr ? 'rtl' : 'ltr'}">
        <div class="bottom-sheet-handle"></div>
        <div class="bottom-sheet-header">
          <div class="sheet-title-box">
            <span class="sheet-surah-ar" lang="${lang}">${title}</span>
            <span class="sheet-ayah-badge">${isUr ? `آیت <span class="urdu-num">${toUrduDigits(surahNum)}</span>:<span class="urdu-num">${toUrduDigits(ayahNum)}</span>` : `Ayah ${surahNum}:${ayahNum}`}</span>
          </div>
          <button type="button" class="btn-close" aria-label="${t("close", lang)}">✕</button>
        </div>
        <div class="bottom-sheet-content">
          <div class="translation-sheet-body ${isUr ? 'trans-text-ur' : 'trans-text-en'}" lang="${lang}" dir="${isUr ? 'rtl' : 'ltr'}">
            <p style="font-size: 20px; line-height: ${isUr ? '2.1' : '1.7'}; margin: 0; color: var(--color-ink);">${text}</p>
          </div>
        </div>
      </div>
    `;

    const close = () => {
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
    };

    sheet.querySelector(".btn-close").addEventListener("click", close);
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet) close();
    });

    document.body.appendChild(sheet);
  },

  showQuranSettingsBottomSheet({ onChange }) {
    const isUr = state.lang === "ur";
    const sheet = document.createElement("div");
    sheet.className = "bottom-sheet-overlay active";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    sheet.innerHTML = `
      <div class="bottom-sheet quran-settings-sheet" dir="${isUr ? 'rtl' : 'ltr'}">
        <div class="bottom-sheet-handle"></div>
        <div class="bottom-sheet-header">
          <div class="sheet-title-box">
            <span class="sheet-surah-ar" lang="${state.lang}">${t("displaySettings", state.lang)}</span>
          </div>
          <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">✕</button>
        </div>
        <div class="bottom-sheet-content quran-settings-content">
          <div class="settings-sheet-section">
            <span class="settings-section-title">${t("readingModeLabel", state.lang)}</span>
            <div class="mode-pill-toggle" role="group" aria-label="${t("readingModeLabel", state.lang)}">
              <button type="button" class="mode-pill-btn ${state.readingMode === 'wbw' ? 'active' : ''}" data-sheet-mode="wbw">${t("readingModeWbw", state.lang)}</button>
              <button type="button" class="mode-pill-btn ${state.readingMode === 'mushaf' ? 'active' : ''}" data-sheet-mode="mushaf">${t("readingModeMushaf", state.lang)}</button>
            </div>
          </div>

          <div class="settings-sheet-section">
            <span class="settings-section-title">${t("meaningLabel", state.lang)}</span>
            <div class="meaning-toggle-group" role="group" aria-label="${t("meaningLabel", state.lang)}">
              <button type="button" class="meaning-btn ${state.meaningDisplay === 'both' ? 'active' : ''}" data-sheet-meaning="both">${t("meaningToggleBoth", state.lang)}</button>
              <button type="button" class="meaning-btn ${state.meaningDisplay === 'ur' ? 'active' : ''}" data-sheet-meaning="ur">${t("meaningToggleUrdu", state.lang)}</button>
              <button type="button" class="meaning-btn ${state.meaningDisplay === 'en' ? 'active' : ''}" data-sheet-meaning="en">${t("meaningToggleEnglish", state.lang)}</button>
            </div>
          </div>

          <div class="settings-sheet-section">
            <span class="settings-section-title">${t("morphologyLabel", state.lang)}</span>
            <div class="mode-pill-toggle" role="group" aria-label="${t("morphologyLabel", state.lang)}">
              <button type="button" class="mode-pill-btn ${!state.settings.showMorphology ? 'active' : ''}" data-sheet-morph="off">${t("morphologyOff", state.lang)}</button>
              <button type="button" class="mode-pill-btn ${state.settings.showMorphology && (state.settings.morphologyStyle || 'underline') === 'underline' ? 'active' : ''}" data-sheet-morph="underline">${t("morphStyleUnderline", state.lang)}</button>
              <button type="button" class="mode-pill-btn ${state.settings.showMorphology && state.settings.morphologyStyle === 'tint' ? 'active' : ''}" data-sheet-morph="tint">${t("morphStyleTint", state.lang)}</button>
            </div>
          </div>

          <div class="settings-sheet-section">
            <span class="settings-section-title">${t("tajweedToggle", state.lang)} <span class="tj-beta-tag">BETA</span></span>
            <div class="mode-pill-toggle" role="group" aria-label="${t("tajweedToggle", state.lang)}">
              <button type="button" class="mode-pill-btn ${!state.settings.showTajweed ? 'active' : ''}" data-sheet-tajweed="off">${t("morphologyOff", state.lang)}</button>
              <button type="button" class="mode-pill-btn ${state.settings.showTajweed ? 'active' : ''}" data-sheet-tajweed="on">${t("tajweedToggle", state.lang)}</button>
            </div>
          </div>

          <div class="settings-sheet-section">
            <span class="settings-section-title">${t("fontSizeLabel", state.lang)}</span>
            <div class="sheet-font-scaler-box" id="sheet-scaler-box"></div>
          </div>
        </div>
      </div>
    `;

    const close = () => {
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
    };

    sheet.querySelector(".btn-close").addEventListener("click", close);
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet) close();
    });

    // Wire reading mode
    sheet.querySelectorAll("[data-sheet-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const m = btn.getAttribute("data-sheet-mode");
        state.readingMode = m;
        sheet.querySelectorAll("[data-sheet-mode]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    // Wire meaning mode
    sheet.querySelectorAll("[data-sheet-meaning]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const m = btn.getAttribute("data-sheet-meaning");
        state.meaningDisplay = m;
        sheet.querySelectorAll("[data-sheet-meaning]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    // Wire morphology mode
    sheet.querySelectorAll("[data-sheet-morph]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-sheet-morph");
        if (val === "off") {
          state.settings.showMorphology = false;
        } else {
          state.settings.showMorphology = true;
          state.settings.morphologyStyle = val; // "underline" or "tint"
        }
        Storage.saveSettings(state.settings);
        sheet.querySelectorAll("[data-sheet-morph]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    // Wire Tajweed mode
    sheet.querySelectorAll("[data-sheet-tajweed]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-sheet-tajweed");
        state.settings.showTajweed = val === "on";
        Storage.saveSettings(state.settings);
        sheet.querySelectorAll("[data-sheet-tajweed]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    // Render font scaler
    const scalerBox = sheet.querySelector("#sheet-scaler-box");
    if (scalerBox) {
      UIComponents.renderFontScalerPills(scalerBox, () => {
        if (typeof onChange === "function") onChange();
      });
    }

    document.body.appendChild(sheet);
  },

  /**
   * Renders 5-step font scaler [A− | A+]
   */
  renderFontScalerPills(container, onChange) {
    const render = () => {
      const currentLevel = state.fontScaleLevel;
      container.innerHTML = `
        <div class="font-scaler-group" role="group" aria-label="${t("fontSizeLabel", state.lang)}">
          <button type="button" class="btn-scaler-step btn-scaler-minus ${currentLevel <= 1 ? 'disabled' : ''}" aria-label="Decrease text size">A−</button>
          <span class="scaler-level-indicator">${currentLevel}/5</span>
          <button type="button" class="btn-scaler-step btn-scaler-plus ${currentLevel >= 5 ? 'disabled' : ''}" aria-label="Increase text size">A+</button>
        </div>
      `;

      container.querySelector(".btn-scaler-minus").addEventListener("click", () => {
        if (state.fontScaleLevel > 1) {
          state.fontScaleLevel -= 1;
          render();
          if (onChange) onChange(state.fontScaleLevel);
        }
      });

      container.querySelector(".btn-scaler-plus").addEventListener("click", () => {
        if (state.fontScaleLevel < 5) {
          state.fontScaleLevel += 1;
          render();
          if (onChange) onChange(state.fontScaleLevel);
        }
      });
    };

    render();
  },

  /**
   * Renders Elder Scale button group
   */
  renderElderScalePills(container) {
    const scales = ["normal", "large", "xlarge"];
    const labels = { normal: "A", large: "A+", xlarge: "A++" };

    container.innerHTML = `
      <div class="elder-scale-group" role="group" aria-label="${t("fontSizeLabel", state.lang)}">
        <button type="button" class="scale-btn ${state.fontScale === "normal" ? "active" : ""}" data-scale="normal">A</button>
        <button type="button" class="scale-btn ${state.fontScale === "large" ? "active" : ""}" data-scale="large">A+</button>
        <button type="button" class="scale-btn ${state.fontScale === "xlarge" ? "active" : ""}" data-scale="xlarge">A++</button>
      </div>
    `;

    container.querySelectorAll(".scale-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = btn.getAttribute("data-scale");
        state.fontScale = s;
        document.body.className = document.body.className.replace(/\bscale-\w+/g, "").trim();
        document.body.classList.add(`scale-${s}`);
        this.renderElderScalePills(container);
      });
    });
  },

  /**
   * Non-intrusive Toast
   */
  showToast(msg, duration = 3000) {
    const existing = document.querySelector(".baseerah-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "baseerah-toast";
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }
};
