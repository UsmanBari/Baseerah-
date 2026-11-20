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
              <span class="field-val">${isUr ? toUrduDigits(surahVal) : surahVal}</span>
            </div>
            <div class="keypad-field ${activeField === "ayah" ? "active" : ""}" data-field="ayah">
              <span class="field-label">${t("ayahNumber", state.lang)} (1–${isUr ? toUrduDigits(maxAyahs) : maxAyahs})</span>
              <span class="field-val">${isUr ? toUrduDigits(ayahVal) : ayahVal}</span>
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
            if (surahVal === "0" || surahVal === "1" && num !== "0") surahVal = num;
            else if (surahVal.length < 3) surahVal += num;
            const parsed = parseInt(surahVal, 10);
            if (parsed > 114) surahVal = "114";
            if (parsed < 1) surahVal = "1";
          } else {
            if (ayahVal === "0") ayahVal = num;
            else if (ayahVal.length < 3) ayahVal += num;
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
   * Prompts for Admin PIN (default 1234)
   */
  showAdminPinDialog(onSuccess) {
    const dialog = document.createElement("div");
    dialog.className = "modal-overlay active";

    let enteredPin = "";
    let errorMsg = "";

    const render = () => {
      dialog.innerHTML = `
        <div class="modal-card">
          <div class="modal-header">
            <h3>${t("admin", state.lang)}</h3>
            <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">✕</button>
          </div>
          <p class="modal-prompt">${t("adminPinPrompt", state.lang)}</p>
          <div class="pin-display">
            <span class="pin-dot ${enteredPin.length >= 1 ? "filled" : ""}"></span>
            <span class="pin-dot ${enteredPin.length >= 2 ? "filled" : ""}"></span>
            <span class="pin-dot ${enteredPin.length >= 3 ? "filled" : ""}"></span>
            <span class="pin-dot ${enteredPin.length >= 4 ? "filled" : ""}"></span>
          </div>
          ${errorMsg ? `<p class="pin-error">${errorMsg}</p>` : ""}
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
        </div>
      `;

      dialog.querySelectorAll(".key-btn[data-key]").forEach((k) => {
        k.addEventListener("click", () => {
          if (enteredPin.length < 4) {
            enteredPin += k.getAttribute("data-key");
            errorMsg = "";
            if (enteredPin.length === 4) {
              if (enteredPin === "1234") {
                document.body.removeChild(dialog);
                if (onSuccess) onSuccess();
                return;
              } else {
                errorMsg = t("adminPinError", state.lang);
                enteredPin = "";
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
            <span class="sheet-ayah-badge">${isUr ? "آیت " + toUrduDigits(ayahData.number) : "Ayah " + ayahData.number}</span>
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
