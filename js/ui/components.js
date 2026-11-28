/* Baseerah — Reusable Kiosk UI Components */
import { state } from "../core/state.js";
import { Storage } from "../core/storage.js";
import { t, toUrduDigits, ur } from "../core/i18n.js";
import { router } from "../core/router.js";
import { Icons } from "./icons.js";
import { audioManager, RECITERS } from "../core/audio.js";
import { OfflineAudio } from "../core/offline-audio.js";
import { OfflineQuran } from "../core/offline-quran.js";
import { Words } from "../core/words.js";
import { getMorphology } from "../core/morphology.js";
import { VocabProgress } from "../core/vocab-progress.js";
import { NotificationManager, CITY_COORDINATES } from "../core/notifications.js";
import { PrayerEngine } from "../core/prayer-times.js";

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

    const getSurahInfo = (sNum) => {
      const idx = window.BASEERAH_INDEX || [];
      return idx.find(s => s.number === sNum) || { number: sNum, ayahCount: 286, nameAr: "", nameEn: "" };
    };

    const render = () => {
      const sNum = parseInt(surahVal, 10) || 1;
      const curSurahInfo = getSurahInfo(sNum);
      const curMaxAyahs = curSurahInfo.ayahCount || 286;
      if (parseInt(ayahVal, 10) > curMaxAyahs) {
        ayahVal = String(curMaxAyahs);
      }

      dialog.innerHTML = `
        <div class="modal-card" dir="${isUr ? "rtl" : "ltr"}">
          <div class="modal-header">
            <h3>${t("gotoAyah", state.lang)}</h3>
            <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">${Icons.close(18)}</button>
          </div>
          <div class="keypad-surah-preview-box" style="text-align: center; padding: 6px 12px; background: rgba(14, 90, 71, 0.08); border-radius: 8px; margin-bottom: 12px;">
            <span style="font-family: var(--font-arabic); font-size: 18px; font-weight: 700; color: var(--color-primary);">${curSurahInfo.nameAr}</span>
            <span style="font-size: 13px; color: var(--color-text-muted); margin: 0 6px;">·</span>
            <span style="font-size: 14px; font-weight: 600; color: var(--color-primary);">${curSurahInfo.nameEn}</span>
          </div>
          <div class="keypad-inputs">
            <div class="keypad-field ${activeField === "surah" ? "active" : ""}" data-field="surah">
              <span class="field-label">${t("surahNumber", state.lang)}</span>
              <span class="field-val urdu-num">${isUr ? toUrduDigits(surahVal) : surahVal}</span>
            </div>
            <div class="keypad-field ${activeField === "ayah" ? "active" : ""}" data-field="ayah">
              <span class="field-label">${t("ayahNumber", state.lang)} (1–${isUr ? `<span class="urdu-num">${toUrduDigits(curMaxAyahs)}</span>` : curMaxAyahs})</span>
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
            <button type="button" class="key-btn key-backspace" data-action="backspace">${Icons.backspace(22)}</button>
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
            let parsed = parseInt(surahVal, 10);
            if (parsed > 114) surahVal = "114";
            if (parsed < 1) surahVal = "1";
          } else {
            if (isFirstAyahInput || ayahVal === "0") {
              ayahVal = num;
              isFirstAyahInput = false;
            } else if (ayahVal.length < 3) {
              ayahVal += num;
            }
            let parsed = parseInt(ayahVal, 10);
            const lim = getSurahInfo(parseInt(surahVal, 10) || 1).ayahCount || 286;
            if (parsed > lim) ayahVal = String(lim);
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
   * Shows bookmarks list modal with direct jump and remove capability
   */
  showBookmarksModal(onNavigate) {
    const isUr = state.lang === "ur";
    const modal = document.createElement("div");
    modal.className = "modal-overlay active";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    const render = () => {
      const bookmarks = Storage.getBookmarks();
      const hasBookmarks = bookmarks.length > 0;

      modal.innerHTML = `
        <div class="modal-card bookmarks-modal-card" dir="${isUr ? "rtl" : "ltr"}">
          <div class="modal-header">
            <h3>${t("bookmarks", state.lang)}</h3>
            <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">${Icons.close(18)}</button>
          </div>
          <div class="bookmarks-list">
            ${hasBookmarks ? bookmarks.map((bm) => `
              <div class="bookmark-card" data-bm-surah="${bm.surah}" data-bm-ayah="${bm.ayah}">
                <div class="bookmark-info">
                  <span class="bookmark-ref">${isUr ? `<span>${bm.surahNameAr || `سورت <bdi class="urdu-num">${toUrduDigits(bm.surah)}</bdi>`}</span> <span aria-hidden="true">·</span> <span>آیت <bdi class="urdu-num">${toUrduDigits(bm.ayah)}</bdi></span>` : `<span>${bm.surahNameEn || `Surah ${bm.surah}`}</span> <span aria-hidden="true">·</span> <span>Ayah ${bm.ayah}</span>`}</span>
                  ${bm.preview ? `<span class="bookmark-preview" dir="rtl">${bm.preview}</span>` : ""}
                </div>
                <button type="button" class="btn-remove-bookmark" data-del-surah="${bm.surah}" data-del-ayah="${bm.ayah}" aria-label="${t("removeBookmark", state.lang)}">${Icons.close(18)}</button>
              </div>
            `).join("") : `
              <div class="empty-bookmarks" style="text-align: center; padding: 40px 16px;">
                <div class="empty-icon" style="margin: 0 auto 12px; width: 48px; color: var(--color-gold-cream);">${Icons.bookmark(48)}</div>
                <p style="font-size: 16px; font-weight: 700; color: var(--color-primary-text);">${t("noBookmarks", state.lang)}</p>
                <p class="muted" style="font-size: 13px; margin-top: 8px;">${t("bookmarkHint", state.lang)}</p>
              </div>
            `}
          </div>
        </div>
      `;

      modal.querySelector(".btn-close").addEventListener("click", () => modal.remove());
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
      });

      modal.querySelectorAll("[data-bm-surah]").forEach((card) => {
        card.addEventListener("click", (e) => {
          if (e.target.closest(".btn-remove-bookmark")) return;
          const s = card.getAttribute("data-bm-surah");
          const a = card.getAttribute("data-bm-ayah");
          modal.remove();
          if (onNavigate) onNavigate(s, a);
          else router.navigate(`quran/${s}/${a}`);
        });
      });

      modal.querySelectorAll("[data-del-surah]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const s = btn.getAttribute("data-del-surah");
          const a = btn.getAttribute("data-del-ayah");
          Storage.removeBookmark(s, a);
          render();
        });
      });
    };

    render();
    document.body.appendChild(modal);
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
            <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">${Icons.close(18)}</button>
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
            <button type="button" class="key-btn key-backspace" data-action="backspace" ${isLocked ? "disabled" : ""}>${Icons.backspace(22)}</button>
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
          <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">${Icons.close(18)}</button>
        </div>
        <div class="bottom-sheet-content">
          <div class="sheet-full-ar" lang="ar" dir="rtl">${ayahData.arFull}</div>
          <div class="sheet-translation-section">
            <div class="sheet-trans-item">
              <span class="sheet-trans-label" lang="ur">اردو ترجمہ · مولانا محمد جوناگڑھی</span>
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
      <span class="ayah-medallion-badge" role="img" aria-label="Ayah ${ayahNumber}">
        <svg class="ayah-medallion-svg" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
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
  /** Tap-a-word: meaning, how often the word appears, save to "My words". */
  /** Root explorer data (Tarteel QUL roots), fetched once on first use. */
  loadRoots() {
    if (!this._rootsPromise) {
      this._rootsPromise = fetch("data/roots.json").then((r) => (r.ok ? r.json() : null)).catch(() => { this._rootsPromise = null; return null; });
    }
    return this._rootsPromise;
  },

  showWordSheet({ word, surahNum, ayahNum, wordIndex, surahName = "", onClose = () => {}, onOpenWbw = null }) {
    const sheet = document.createElement("div");
    sheet.className = "bottom-sheet-overlay active";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", t("wordSheetTitle", state.lang));
    const arDisplay = String(word.ar || "").replace(/\s+[\u06D6-\u06ED\uE000-\uF8FF]+/g, "").trim();
    const saved = VocabProgress.isSaved(word);
    let partsHtml = "";
    try {
      const m = getMorphology(`${surahNum}:${ayahNum}:${wordIndex + 1}`, word);
      if (m && m.segmented && Array.isArray(m.parts) && m.parts.length > 1) {
        const isUrLang = state.lang === "ur";
        partsHtml = `<div class="word-sheet-parts" dir="rtl" aria-label="${t("wordPartsLabel", state.lang)}">${m.parts.map((p) => {
          const meaning = isUrLang ? (p.ur || p.en) : (p.en || p.ur);
          return `<span class="word-part-chip ${p.type}"><span class="wp-ar" lang="ar">${p.ar}</span>${meaning ? `<span class="wp-en" dir="${isUrLang ? "rtl" : "ltr"}">${meaning}</span>` : ""}</span>`;
        }).join("")}</div>`;
      }
    } catch (e) { /* plain word */ }
    sheet.innerHTML = `
      <div class="bottom-sheet word-sheet" dir="ltr">
        <div class="bottom-sheet-handle"></div>
        <div class="word-sheet-head">
          <span class="word-sheet-ref">${surahName ? surahName + " · " : ""}${surahNum}:${ayahNum} · ${t("wordN", state.lang).replace("{n}", wordIndex + 1)}</span>
          <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">${Icons.close(18)}</button>
        </div>
        <p class="word-sheet-ar" lang="ar" dir="rtl">${arDisplay}</p>
        ${partsHtml}
        ${word.rt ? `<section class="word-root" id="word-root" aria-live="polite"><p class="word-root-loading">${t("rootLoading", state.lang)}</p></section>` : ""}
        <div class="word-sheet-meanings">
          <p class="word-sheet-ur" lang="ur" dir="rtl">${word.ur || ""}</p>
          <p class="word-sheet-en">${word.en || ""}</p>
        </div>
        <p class="word-sheet-count" id="word-sheet-count">${t("wordCounting", state.lang)}</p>
        <div class="word-sheet-actions">
          <button type="button" class="btn-word-save ${saved ? "is-saved" : ""}" id="btn-word-save">${saved ? Icons.check(16) : Icons.bookmark(16)} <span>${saved ? t("wordSaved", state.lang) : t("wordSave", state.lang)}</span></button>
          ${onOpenWbw ? `<button type="button" class="btn-word-wbw" id="btn-word-wbw">${t("wordOpenWbw", state.lang)}</button>` : ""}
        </div>
      </div>`;
    const close = () => { if (sheet.parentNode) sheet.parentNode.removeChild(sheet); onClose(); };
    sheet.querySelector(".btn-close").addEventListener("click", close);
    sheet.addEventListener("click", (e) => { if (e.target === sheet) close(); });
    sheet.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    const saveBtn = sheet.querySelector("#btn-word-save");
    saveBtn.addEventListener("click", () => {
      VocabProgress.saveWord(word, `${surahNum}:${ayahNum}`);
      saveBtn.classList.add("is-saved");
      saveBtn.innerHTML = `${Icons.check(16)} <span>${t("wordSaved", state.lang)}</span>`;
      try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) { /* ignore */ }
    });
    const wbwBtn = sheet.querySelector("#btn-word-wbw");
    if (wbwBtn) wbwBtn.addEventListener("click", () => { close(); onOpenWbw(); });
    document.body.appendChild(sheet);
    sheet.querySelector(".btn-close").focus({ preventScroll: true });
    if (word.rt) {
      UIComponents.loadRoots().then((roots) => {
        const box = sheet.querySelector("#word-root");
        const r = roots && roots[word.rt];
        if (!box) return;
        if (!r) { box.remove(); return; }
        const isUrLang = state.lang === "ur";
        box.innerHTML = `
          <div class="word-root-head">
            <span class="word-root-label">${t("rootLabel", state.lang)}</span>
            <span class="word-root-letters" lang="ar" dir="rtl">${r.r}</span>
          </div>
          <p class="word-root-stat">${t("rootStat", state.lang).replace("{n}", r.n).replace("{u}", r.u)}</p>
          <div class="word-root-forms" dir="rtl">${r.f.map(([ar, en, loc, c]) => `
            <button type="button" class="root-form" data-loc="${loc}" aria-label="${en} (${loc})">
              <span class="rf-ar" lang="ar">${ar}</span>
              <span class="rf-en" dir="ltr">${en}</span>
              <span class="rf-n">×${c}</span>
            </button>`).join("")}</div>
          ${r.u > r.f.length ? `<p class="word-root-more">${t("rootMore", state.lang).replace("{n}", r.u - r.f.length)}</p>` : ""}`;
        box.querySelectorAll(".root-form").forEach((b) => b.addEventListener("click", () => {
          const [s, a] = b.getAttribute("data-loc").split(":");
          close();
          router.navigate(`quran/${s}/${a}`);
        }));
        void isUrLang;
      });
    }
    Words.countOf(word.ar).then((n) => {
      const el = sheet.querySelector("#word-sheet-count");
      if (!el) return;
      if (!n) { el.textContent = ""; return; }
      el.innerHTML = n > 1
        ? t("wordAppearsN", state.lang).replace("{n}", `<strong>${n.toLocaleString("en-US")}</strong>`)
        : t("wordAppearsOnce", state.lang);
    });
  },

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
            <span class="sheet-ayah-badge">${isUr ? `<span>آیت</span> <bdi dir="ltr"><span class="urdu-num">${toUrduDigits(surahNum)}</span>:<span class="urdu-num">${toUrduDigits(ayahNum)}</span></bdi>` : `<span>Ayah</span> <bdi dir="ltr">${surahNum}:${ayahNum}</bdi>`}</span>
          </div>
          <button type="button" class="btn-close" aria-label="${t("close", lang)}">${Icons.close(18)}</button>
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
            <span class="sheet-ayah-badge">${isUr ? `<span>آیت</span> <bdi dir="ltr"><span class="urdu-num">${toUrduDigits(surahNum)}</span>:<span class="urdu-num">${toUrduDigits(ayahNum)}</span></bdi>` : `<span>Ayah</span> <bdi dir="ltr">${surahNum}:${ayahNum}</bdi>`}</span>
          </div>
          <button type="button" class="btn-close" aria-label="${t("close", lang)}">${Icons.close(18)}</button>
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

  showQuranSettingsBottomSheet({ onChange = () => {}, surahNum = null, totalAyahs = null, focus = null, page = null, onClose = null } = {}) {
    const isUr = state.lang === "ur";
    const sheet = document.createElement("div");
    if (page) {
      sheet.className = "settings-page-host";
    } else {
      sheet.className = "bottom-sheet-overlay active";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
    }

    const currentReciter = audioManager.currentReciterId || "alafasy";
    const currentRate = audioManager.playbackRate || 1.0;
    const currentRepeat = audioManager.repeatMode || "off";
    const isSurahDownloaded = surahNum ? (!state.isKiosk && OfflineAudio.isSurahDownloaded(surahNum, currentReciter)) : false;

    sheet.innerHTML = `
      <div class="bottom-sheet quran-settings-sheet" dir="${isUr ? 'rtl' : 'ltr'}">
        <div class="bottom-sheet-handle"></div>
        <div class="bottom-sheet-header">
          <div class="sheet-title-box">
            <span class="sheet-surah-ar" lang="${state.lang}">${t("displaySettings", state.lang)}</span>
          </div>
          <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">${Icons.close(18)}</button>
        </div>
        <div class="bottom-sheet-content quran-settings-content">
          
          <!-- 1. READING SETTINGS -->
          <div class="settings-group-card">
            <h4 class="settings-group-header">
              <span class="settings-group-icon" aria-hidden="true">${Icons.book(18)}</span>
              <span>${t("settingsReading", state.lang)}</span>
            </h4>

            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("readingModeLabel", state.lang)}</span>
              <div class="mode-pill-toggle" role="group" aria-label="${t("readingModeLabel", state.lang)}">
                <button type="button" class="mode-pill-btn ${state.readingMode === 'wbw' ? 'active' : ''}" data-sheet-mode="wbw">${t("readingModeWbw", state.lang)}</button>
                <button type="button" class="mode-pill-btn ${state.readingMode === 'mushaf' ? 'active' : ''}" data-sheet-mode="mushaf">${t("readingModeMushaf", state.lang)}</button>
              </div>
            </div>

            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("tajweedToggle", state.lang)}</span>
              <div class="mode-pill-toggle" role="group" aria-label="${t("tajweedToggle", state.lang)}">
                <button type="button" class="mode-pill-btn ${!state.settings.showTajweed ? 'active' : ''}" data-sheet-tajweed="off">${t("morphologyOff", state.lang)}</button>
                <button type="button" class="mode-pill-btn ${state.settings.showTajweed ? 'active' : ''}" data-sheet-tajweed="on">${t("tajweedToggle", state.lang)}</button>
              </div>
              <button type="button" class="btn-sheet-link tj-legend-link-btn" id="btn-sheet-tajweed-legend">
                ${Icons.book(16)} <span>${t("tajweedLegendOpen", state.lang)}</span>
              </button>
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
              <span class="settings-section-title">${t("hifzMode", state.lang)}</span>
              <div class="mode-pill-toggle" role="group" aria-label="${t("hifzMode", state.lang)}">
                <button type="button" class="mode-pill-btn ${!state.settings.hifzMode ? 'active' : ''}" data-sheet-hifz="off">${t("morphologyOff", state.lang)}</button>
                <button type="button" class="mode-pill-btn ${state.settings.hifzMode ? 'active' : ''}" data-sheet-hifz="on">${t("hifzMode", state.lang)}</button>
              </div>
            </div>
          </div>

          <!-- 2. AUDIO SETTINGS -->
          <div class="settings-group-card">
            <h4 class="settings-group-header">
              <span class="settings-group-icon" aria-hidden="true">${Icons.mic(18)}</span>
              <span>${t("settingsAudio", state.lang)}</span>
            </h4>

            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("reciter", state.lang)}</span>
              <select id="sheet-reciter-select" class="sheet-select" aria-label="${t("reciter", state.lang)}">
                ${RECITERS.map((r) => `
                  <option value="${r.id}" ${currentReciter === r.id ? 'selected' : ''}>
                    ${isUr ? r.nameUr : r.nameEn}
                  </option>
                `).join("")}
              </select>
            </div>

            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("speedLabel", state.lang)}</span>
              <div class="mode-pill-toggle segmented-control" role="group" aria-label="${t("speedLabel", state.lang)}">
                ${[0.75, 1.0, 1.25, 1.5].map((rate) => `
                  <button type="button" class="mode-pill-btn ${currentRate === rate ? 'active' : ''}" data-sheet-speed="${rate}">${rate}×</button>
                `).join("")}
              </div>
            </div>

            ${!state.isKiosk ? `            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("sleepTimerLabel", state.lang)}</span>
              <div class="mode-pill-toggle segmented-control" role="group" aria-label="${t("sleepTimerLabel", state.lang)}">
                ${[0, 15, 30, 60].map((m) => `
                  <button type="button" class="mode-pill-btn ${(audioManager.sleepEndsAt ? Math.round((audioManager.sleepMinutes || 0)) : 0) === m ? 'active' : ''}" data-sheet-sleep="${m}">${m ? m + " min" : t("morphologyOff", state.lang)}</button>
                `).join("")}
              </div>
              <p class="settings-help-text">${t("sleepTimerHelp", state.lang)}</p>
            </div>

` : ""}
            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("repeatGapLabel", state.lang)}</span>
              <div class="mode-pill-toggle segmented-control" role="group" aria-label="${t("repeatGapLabel", state.lang)}">
                ${[0, 3, 5, 10].map((g) => `
                  <button type="button" class="mode-pill-btn ${(Number(state.settings.repeatGapSec) || 0) === g ? 'active' : ''}" data-sheet-gap="${g}">${g ? g + "s" : t("morphologyOff", state.lang)}</button>
                `).join("")}
              </div>
              <p class="settings-help-text">${t("repeatGapHelp", state.lang)}</p>
            </div>

            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("repeatModeLabel", state.lang)}</span>
              <div class="mode-pill-toggle" role="group" aria-label="${t("repeatModeLabel", state.lang)}">
                <button type="button" class="mode-pill-btn ${currentRepeat === 'off' ? 'active' : ''}" data-sheet-repeat="off">${t("repeatOff", state.lang)}</button>
                <button type="button" class="mode-pill-btn ${currentRepeat === 'ayah' ? 'active' : ''}" data-sheet-repeat="ayah">${t("repeatSingle", state.lang)}</button>
                <button type="button" class="mode-pill-btn ${currentRepeat === 'range' ? 'active' : ''}" data-sheet-repeat="range">${t("repeatRange", state.lang)}</button>
              </div>
            </div>

            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("mosqueMuteLabel", state.lang)}</span>
              <div class="mode-pill-toggle" role="group" aria-label="${t("mosqueMuteLabel", state.lang)}">
                <button type="button" class="mode-pill-btn ${!state.settings.mosqueMute ? 'active' : ''}" data-sheet-mute="off">${t("morphologyOff", state.lang)}</button>
                <button type="button" class="mode-pill-btn ${state.settings.mosqueMute ? 'active' : ''}" data-sheet-mute="on">${isUr ? "خاموش" : "Muted"}</button>
              </div>
            </div>

            ${!state.isKiosk ? `
            <div class="settings-sheet-section downloaded-audio-section">
              <span class="settings-section-title">${t("downloadedAudio", state.lang)}</span>
              ${surahNum && totalAyahs ? `
              <div class="sheet-dl-current-surah" style="margin-bottom: 12px;">
                <button type="button" class="btn-sheet-download-audio btn-mobile-download-audio ${isSurahDownloaded ? "downloaded" : ""}" id="btn-sheet-download-audio" title="${isSurahDownloaded ? t("audioDownloaded", state.lang) : t("downloadSurahAudio", state.lang)}">
                  <span class="dl-icon" aria-hidden="true">${isSurahDownloaded ? Icons.check(16) : Icons.download(16)}</span>
                  <span class="dl-label">${isSurahDownloaded ? t("audioDownloaded", state.lang) : t("downloadAudio", state.lang)}</span>
                </button>
              </div>
              ` : ""}
              <div class="storage-usage-row">
                <span class="storage-text">${t("storageUsed", state.lang)}: <strong id="storage-used-val">...</strong></span>
                <button type="button" class="btn-persist-storage" id="btn-persist-storage">${t("persistStorage", state.lang)}</button>
              </div>
              <div class="downloaded-surahs-list" id="downloaded-surahs-list">
                <span class="muted small">${t("noDownloadedAudio", state.lang)}</span>
              </div>
            </div>
            ` : ""}
          </div>

          <!-- 3. DISPLAY & TEXT -->
          <div class="settings-group-card">
            <h4 class="settings-group-header">
              <span class="settings-group-icon" aria-hidden="true">${Icons.type(18)}</span>
              <span>${t("settingsDisplay", state.lang)}</span>
            </h4>

            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("fontSizeLabel", state.lang)}</span>
              <div class="sheet-font-scaler-box" id="sheet-scaler-box"></div>
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
              <span class="settings-section-title">${t("themeLabel", state.lang)}</span>
              <div class="mode-pill-toggle theme-segmented-toggle" role="group" aria-label="${t("themeLabel", state.lang)}">
                <button type="button" class="mode-pill-btn ${state.theme === 'light' ? 'active' : ''}" data-sheet-theme="light">${t("themeLight", state.lang)}</button>
                <button type="button" class="mode-pill-btn ${state.theme === 'dark' ? 'active' : ''}" data-sheet-theme="dark">${t("themeDark", state.lang)}</button>
                <button type="button" class="mode-pill-btn ${state.theme === 'sepia' ? 'active' : ''}" data-sheet-theme="sepia">${t("themeSepia", state.lang)}</button>
                <button type="button" class="mode-pill-btn ${state.theme === 'system' ? 'active' : ''}" data-sheet-theme="system">${t("themeSystem", state.lang)}</button>
              </div>
            </div>

            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("urduLabelsLabel", state.lang)}</span>
              <div class="mode-pill-toggle" role="group" aria-label="${t("urduLabelsLabel", state.lang)}">
                <button type="button" class="mode-pill-btn ${state.urduLabels ? 'active' : ''}" data-sheet-urdu-labels="on">${t("urduLabelsOn", state.lang)}</button>
                <button type="button" class="mode-pill-btn ${!state.urduLabels ? 'active' : ''}" data-sheet-urdu-labels="off">${t("urduLabelsOff", state.lang)}</button>
              </div>
              <p class="settings-help-text">${t("urduLabelsHelp", state.lang)}</p>
            </div>
          </div>

          <!-- 4. PRAYER NOTIFICATIONS -->
          ${!state.isKiosk ? `          <div class="settings-group-card" id="settings-notifications-card">
            <h4 class="settings-group-header">
              <span class="settings-group-icon" aria-hidden="true">${Icons.bell(18)}</span>
              <span>${t("remindersTitle", state.lang)}</span>
            </h4>

            <div class="settings-sheet-section">
              <div class="settings-section-row">
                <span class="settings-section-title" style="margin-bottom: 0;">${t("prayerNotificationsMaster", state.lang)}</span>
                <div class="mode-pill-toggle toggle-compact" role="group" aria-label="${t("prayerNotificationsMaster", state.lang)}">
                  <button type="button" class="mode-pill-btn ${!state.prayerNotifications ? 'active' : ''}" data-sheet-notif="off">Off</button>
                  <button type="button" class="mode-pill-btn ${state.prayerNotifications ? 'active' : ''}" data-sheet-notif="on">On</button>
                </div>
              </div>
              <div id="notif-permission-help" class="notif-help-line" style="display: ${(!state.prayerNotifications && typeof Notification !== "undefined" && Notification.permission === "denied") ? "block" : "none"};">
                ${t("notificationsBlockedHelp", state.lang)}
              </div>
            </div>

            <div id="prayer-notifs-details" class="prayer-notifs-details ${!state.prayerNotifications ? 'is-disabled' : ''}">
              <div class="settings-sheet-section">
                <span class="settings-section-title">${t("remindMe", state.lang)}</span>
                <div class="mode-pill-toggle segmented-control notif-offset-toggle" role="group" aria-label="${t("remindMe", state.lang)}">
                  <button type="button" class="mode-pill-btn ${(state.notificationOffset || 0) === 0 ? 'active' : ''}" data-sheet-offset="0">${t("remindAtTime", state.lang)}</button>
                  <button type="button" class="mode-pill-btn ${state.notificationOffset === 5 ? 'active' : ''}" data-sheet-offset="5">${t("remind5Min", state.lang)}</button>
                  <button type="button" class="mode-pill-btn ${state.notificationOffset === 10 ? 'active' : ''}" data-sheet-offset="10">${t("remind10Min", state.lang)}</button>
                  <button type="button" class="mode-pill-btn ${state.notificationOffset === 15 ? 'active' : ''}" data-sheet-offset="15">${t("remind15Min", state.lang)}</button>
                </div>
              </div>

              <div class="settings-sheet-section">
                <span class="settings-section-title">${t("prayerTimes", state.lang)}</span>
                <div class="prayer-toggles-grid">
                  ${['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map(pKey => {
                    const isEnabled = state.notificationPrayers[pKey] !== false;
                    const pName = t(pKey, state.lang);
                    return `
                      <div class="prayer-toggle-item">
                        <span class="prayer-toggle-label">${pName}</span>
                        <div class="mode-pill-toggle toggle-compact" role="group" aria-label="${pName} notification">
                          <button type="button" class="mode-pill-btn ${!isEnabled ? 'active' : ''}" data-prayer-toggle="${pKey}" data-val="off">Off</button>
                          <button type="button" class="mode-pill-btn ${isEnabled ? 'active' : ''}" data-prayer-toggle="${pKey}" data-val="on">On</button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <div class="settings-sheet-section">
                <div class="location-setting-line">
                  <span class="location-text">
                    <span class="location-city-name" id="sheet-current-city">${state.settings.prayerCity || "Islamabad"}</span>
                    <span class="location-sep"> · </span>
                    <button type="button" class="btn-sheet-link-inline" id="btn-change-location">${t("changeLocation", state.lang)}</button>
                  </span>
                  <button type="button" class="btn-location-geo-sm" id="btn-sheet-geo" aria-label="${t("useMyLocation", state.lang)}">
                    ${Icons.pin(14)} <span>${t("useMyLocation", state.lang)}</span>
                  </button>
                </div>
                <div id="sheet-location-picker" class="location-picker-box" style="display: none; margin-top: 10px;">
                  <select id="sheet-city-select" class="sheet-select" aria-label="${t("cityNameLabel", state.lang)}">
                    <option value="Lahore" ${(state.settings.prayerCity || "Islamabad") === "Lahore" ? "selected" : ""}>Lahore (31.52, 74.36)</option>
                    <option value="Karachi" ${state.settings.prayerCity === "Karachi" ? "selected" : ""}>Karachi (24.86, 67.00)</option>
                    <option value="Islamabad" ${(state.settings.prayerCity || "Islamabad") === "Islamabad" ? "selected" : ""}>Islamabad (33.68, 73.04)</option>
                    <option value="Rawalpindi" ${state.settings.prayerCity === "Rawalpindi" ? "selected" : ""}>Rawalpindi (33.56, 73.01)</option>
                    <option value="Peshawar" ${state.settings.prayerCity === "Peshawar" ? "selected" : ""}>Peshawar (34.01, 71.52)</option>
                    <option value="Quetta" ${state.settings.prayerCity === "Quetta" ? "selected" : ""}>Quetta (30.17, 66.97)</option>
                    <option value="Multan" ${state.settings.prayerCity === "Multan" ? "selected" : ""}>Multan (30.15, 71.52)</option>
                    <option value="Faisalabad" ${state.settings.prayerCity === "Faisalabad" ? "selected" : ""}>Faisalabad (31.45, 73.13)</option>
                    <option value="Makkah" ${state.settings.prayerCity === "Makkah" ? "selected" : ""}>Makkah (21.38, 39.85)</option>
                    <option value="Madinah" ${state.settings.prayerCity === "Madinah" ? "selected" : ""}>Madinah (24.52, 39.56)</option>
                    <option value="London" ${state.settings.prayerCity === "London" ? "selected" : ""}>London (51.50, -0.12)</option>
                    <option value="New York" ${state.settings.prayerCity === "New York" ? "selected" : ""}>New York (40.71, -74.00)</option>
                  </select>
                </div>
              </div>
            </div>

            ${!state.isKiosk ? `
            <div class="settings-sheet-section reminder-row">
              <div class="settings-section-row">
                <span class="settings-section-title" style="margin-bottom: 0;">${t("quranReminderLabel", state.lang)}</span>
                <div class="mode-pill-toggle toggle-compact" role="group" aria-label="${t("quranReminderLabel", state.lang)}">
                  <button type="button" class="mode-pill-btn ${!state.quranReminder.enabled ? 'active' : ''}" data-quran-reminder="off">Off</button>
                  <button type="button" class="mode-pill-btn ${state.quranReminder.enabled ? 'active' : ''}" data-quran-reminder="on">On</button>
                </div>
              </div>
              <p class="settings-help-text">${t("quranReminderHelp", state.lang)}</p>
              <label class="reminder-time-line ${!state.quranReminder.enabled ? 'is-off' : ''}" id="quran-reminder-time-line">
                <span>${t("reminderTimeLabel", state.lang)}</span>
                <select id="quran-reminder-time" class="sheet-select reminder-time-select" aria-label="${t("reminderTimeLabel", state.lang)}">
                  <option value="05:00" ${state.quranReminder.time === "05:00" ? "selected" : ""}>5:00 AM</option><option value="05:30" ${state.quranReminder.time === "05:30" ? "selected" : ""}>5:30 AM</option><option value="06:00" ${state.quranReminder.time === "06:00" ? "selected" : ""}>6:00 AM</option><option value="06:30" ${state.quranReminder.time === "06:30" ? "selected" : ""}>6:30 AM</option><option value="07:00" ${state.quranReminder.time === "07:00" ? "selected" : ""}>7:00 AM</option><option value="07:30" ${state.quranReminder.time === "07:30" ? "selected" : ""}>7:30 AM</option><option value="08:00" ${state.quranReminder.time === "08:00" ? "selected" : ""}>8:00 AM</option><option value="09:00" ${state.quranReminder.time === "09:00" ? "selected" : ""}>9:00 AM</option><option value="12:00" ${state.quranReminder.time === "12:00" ? "selected" : ""}>12:00 PM</option><option value="15:00" ${state.quranReminder.time === "15:00" ? "selected" : ""}>3:00 PM</option><option value="18:00" ${state.quranReminder.time === "18:00" ? "selected" : ""}>6:00 PM</option><option value="20:00" ${state.quranReminder.time === "20:00" ? "selected" : ""}>8:00 PM</option><option value="21:00" ${state.quranReminder.time === "21:00" ? "selected" : ""}>9:00 PM</option><option value="22:00" ${state.quranReminder.time === "22:00" ? "selected" : ""}>10:00 PM</option>
                </select>
              </label>
              <div class="reminder-order-line ${!state.quranReminder.enabled ? 'is-off' : ''}" id="quran-reminder-order-line">
                <span>${t("ayahOrderLabel", state.lang)}</span>
                <div class="mode-pill-toggle toggle-compact" role="group" aria-label="${t("ayahOrderLabel", state.lang)}">
                  <button type="button" class="mode-pill-btn ${state.quranReminder.order !== 'random' ? 'active' : ''}" data-quran-order="linear">${t("ayahOrderLinear", state.lang)}</button>
                  <button type="button" class="mode-pill-btn ${state.quranReminder.order === 'random' ? 'active' : ''}" data-quran-order="random">${t("ayahOrderRandom", state.lang)}</button>
                </div>
              </div>
              <p class="settings-help-text reminder-order-help ${!state.quranReminder.enabled ? 'is-off' : ''}" id="quran-reminder-order-help">${t(state.quranReminder.order === "random" ? "ayahOrderRandomHelp" : "ayahOrderLinearHelp", state.lang)}</p>
            </div>

            <div class="settings-sheet-section reminder-row">
              <div class="settings-section-row">
                <span class="settings-section-title" style="margin-bottom: 0;">${t("jumuahReminderLabel", state.lang)}</span>
                <div class="mode-pill-toggle toggle-compact" role="group" aria-label="${t("jumuahReminderLabel", state.lang)}">
                  <button type="button" class="mode-pill-btn ${!state.jumuahReminder.enabled ? 'active' : ''}" data-jumuah-reminder="off">Off</button>
                  <button type="button" class="mode-pill-btn ${state.jumuahReminder.enabled ? 'active' : ''}" data-jumuah-reminder="on">On</button>
                </div>
              </div>
              <p class="settings-help-text">${t("jumuahReminderHelp", state.lang)}</p>
            </div>

            <div class="settings-sheet-section reminder-row">
              <div class="settings-section-row">
                <span class="settings-section-title" style="margin-bottom: 0;">${t("sunriseReminderLabel", state.lang)}</span>
                <div class="mode-pill-toggle toggle-compact" role="group" aria-label="${t("sunriseReminderLabel", state.lang)}">
                  <button type="button" class="mode-pill-btn ${!state.sunriseReminder.enabled ? 'active' : ''}" data-sunrise-reminder="off">Off</button>
                  <button type="button" class="mode-pill-btn ${state.sunriseReminder.enabled ? 'active' : ''}" data-sunrise-reminder="on">On</button>
                </div>
              </div>
              <p class="settings-help-text">${t("sunriseReminderHelp", state.lang)}</p>
            </div>

            <div class="settings-sheet-section notif-test-section">
              <button type="button" class="btn-notif-test" id="btn-notif-test">${Icons.bell(16)} <span>${t("sendTestNotification", state.lang)}</span></button>
              <p class="settings-help-text" id="notif-test-status" role="status" aria-live="polite"></p>
              <p class="settings-help-text notif-battery-tip"><strong>${t("soundTipTitle", state.lang)}</strong> ${t("soundTip", state.lang)}</p>
              <p class="settings-help-text notif-battery-tip">${t("batteryTip", state.lang)}</p>
            </div>
            ` : ""}
          </div>

` : ""}
          ${!state.isKiosk ? `
          <!-- OFFLINE & BACKUP -->
          <div class="settings-group-card" id="settings-offline-card">
            <h4 class="settings-group-header">
              <span class="settings-group-icon" aria-hidden="true">${Icons.download(18)}</span>
              <span>${t("offlineBackupTitle", state.lang)}</span>
            </h4>

            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("offlineQuranLabel", state.lang)}</span>
              <p class="settings-help-text">${t("offlineQuranHelp", state.lang)}</p>
              <p class="offline-status" id="offline-quran-status" role="status" aria-live="polite">${t("checking", state.lang)}</p>
              <div class="offline-progress" id="offline-quran-progress" hidden><span style="width:0%"></span></div>
              <button type="button" class="btn-notif-test" id="btn-offline-quran">${Icons.download(16)} <span>${t("downloadFullQuran", state.lang)}</span></button>
            </div>

            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("backupLabel", state.lang)}</span>
              <p class="settings-help-text">${t("backupHelp", state.lang)}</p>
              <div class="backup-actions">
                <button type="button" class="btn-sheet-link" id="btn-backup-export">${t("backupSave", state.lang)}</button>
                <button type="button" class="btn-sheet-link" id="btn-backup-import">${t("backupRestore", state.lang)}</button>
                <input type="file" id="backup-file-input" accept="application/json,.json" hidden>
              </div>
              <p class="settings-help-text" id="backup-status" role="status" aria-live="polite"></p>
            </div>
          </div>
          ` : ""}

          <!-- 5. ABOUT & MOSQUE KIOSK -->
          <div class="settings-group-card">
            <h4 class="settings-group-header">
              <span class="settings-group-icon" aria-hidden="true">${Icons.info(18)}</span>
              <span>${t("settingsAboutKiosk", state.lang)}</span>
            </h4>

            <div class="settings-sheet-section">
              <button type="button" class="btn-sheet-link" id="btn-sheet-about">
                ${t("about", state.lang)} ${Icons.external(12)}
              </button>
            </div>

            <div class="settings-sheet-section">
              <span class="settings-section-title">${t("kioskAutoReturn", state.lang)}</span>
              <p class="kiosk-idle-note muted">${t("kioskAutoReturnDesc", state.lang)} (${state.settings.kioskIdleSec || 120}s)</p>
            </div>
          </div>

        </div>
      </div>
    `;

    const close = () => {
      if (page) {
        if (typeof onClose === "function") onClose();
        return;
      }
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
    };

    if (page) {
      // Full-page layout: replace the sheet header with a page app bar
      const hdr = sheet.querySelector(".bottom-sheet-header");
      const handle = sheet.querySelector(".bottom-sheet-handle");
      if (handle) handle.remove();
      if (hdr) {
        hdr.className = "settings-page-header";
        hdr.innerHTML = `
          <button type="button" class="btn-close btn-header-back settings-back" aria-label="${t("back", state.lang)}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
            <span>${t("back", state.lang)}</span>
          </button>
          <h1 class="settings-page-title">${t("appSettings", state.lang)} <span class="bi-ur" lang="ur" dir="rtl">${ur("appSettings")}</span></h1>`;
      }
    }

    sheet.querySelector(".btn-close").addEventListener("click", close);
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet) close();
    });

    // 1. Reading mode
    sheet.querySelectorAll("[data-sheet-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const m = btn.getAttribute("data-sheet-mode");
        state.readingMode = m;
        sheet.querySelectorAll("[data-sheet-mode]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    // Tajweed mode
    sheet.querySelectorAll("[data-sheet-tajweed]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-sheet-tajweed");
        state.settings.showTajweed = val === "on";
        Storage.saveSettings(state.settings);
        sheet.querySelectorAll("[data-sheet-tajweed]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    // Morphology mode
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

    // Hifz mode
    sheet.querySelectorAll("[data-sheet-hifz]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-sheet-hifz");
        state.settings.hifzMode = val === "on";
        Storage.saveSettings(state.settings);
        sheet.querySelectorAll("[data-sheet-hifz]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    // 2. Audio settings
    const reciterSelect = sheet.querySelector("#sheet-reciter-select");
    if (reciterSelect) {
      reciterSelect.addEventListener("change", (e) => {
        audioManager.setReciter(e.target.value);
        if (typeof onChange === "function") onChange();
      });
    }

    sheet.querySelectorAll("[data-sheet-speed]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rate = parseFloat(btn.getAttribute("data-sheet-speed"));
        audioManager.setPlaybackRate(rate);
        sheet.querySelectorAll("[data-sheet-speed]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    sheet.querySelectorAll("[data-sheet-repeat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rep = btn.getAttribute("data-sheet-repeat");
        audioManager.setRepeatMode(rep);
        sheet.querySelectorAll("[data-sheet-repeat]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    sheet.querySelectorAll("[data-sheet-sleep]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const m = parseInt(btn.getAttribute("data-sheet-sleep"), 10) || 0;
        audioManager.setSleepTimer(m);
        audioManager.sleepMinutes = m;
        sheet.querySelectorAll("[data-sheet-sleep]").forEach((b) => b.classList.toggle("active", b === btn));
        if (m) UIComponents.showToast(t("sleepTimerSet", state.lang).replace("{n}", m));
      });
    });
    sheet.querySelectorAll("[data-sheet-gap]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.settings.repeatGapSec = parseInt(btn.getAttribute("data-sheet-gap"), 10) || 0;
        Storage.saveSettings(state.settings);
        sheet.querySelectorAll("[data-sheet-gap]").forEach((b) => b.classList.toggle("active", b === btn));
      });
    });
    sheet.querySelectorAll("[data-sheet-mute]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const isMute = btn.getAttribute("data-sheet-mute") === "on";
        state.settings.mosqueMute = isMute;
        audioManager.setMosqueMute(isMute);
        Storage.saveSettings(state.settings);
        sheet.querySelectorAll("[data-sheet-mute]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    // Wire Offline Audio Management in Settings
    const updateDownloadedList = async () => {
      const listEl = sheet.querySelector("#downloaded-surahs-list");
      const storageValEl = sheet.querySelector("#storage-used-val");
      if (!listEl) return;

      const downloaded = OfflineAudio.getDownloadedSurahs();
      if (downloaded.length === 0) {
        listEl.innerHTML = `<span class="muted small">${t("noDownloadedAudio", state.lang)}</span>`;
      } else {
        listEl.innerHTML = downloaded.map((it) => {
          const rec = RECITERS.find((r) => r.id === it.reciterId) || { nameEn: it.reciterId, nameUr: it.reciterId };
          const recName = isUr ? rec.nameUr : rec.nameEn;
          return `
            <div class="downloaded-surah-item">
              <div class="dl-item-info">
                <span class="dl-item-title">${t("surahWord", state.lang)} ${isUr ? toUrduDigits(it.surah) : it.surah}</span>
                <span class="dl-item-sub muted">${recName} · ${it.sizeMB || "0"} MB</span>
              </div>
              <button type="button" class="btn-delete-downloaded-audio" data-delete-surah="${it.surah}" data-delete-reciter="${it.reciterId}" aria-label="${t("deleteAudio", state.lang)} ${t("surahWord", state.lang)} ${it.surah}">
                ${Icons.trash(16)}
              </button>
            </div>
          `;
        }).join("");

        listEl.querySelectorAll("[data-delete-surah]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const s = Number(btn.getAttribute("data-delete-surah"));
            const r = btn.getAttribute("data-delete-reciter");
            await OfflineAudio.deleteDownloadedSurah(s, r);
            UIComponents.showToast(t("audioDeleted", state.lang));
            updateDownloadedList();
            if (typeof onChange === "function") onChange();
          });
        });
      }

      const usage = await OfflineAudio.getStorageUsage();
      if (storageValEl) storageValEl.textContent = `${usage.usageMB} MB / ${usage.quotaMB} MB`;
    };

    updateDownloadedList();

    if (surahNum && totalAyahs && !state.isKiosk) {
      const sheetDlBtn = sheet.querySelector("#btn-sheet-download-audio");
      if (sheetDlBtn) {
        let sheetAbort = null;
        sheetDlBtn.addEventListener("click", async () => {
          if (sheetDlBtn.classList.contains("downloading")) {
            if (sheetAbort) {
              sheetAbort.abort();
              sheetAbort = null;
              sheetDlBtn.classList.remove("downloading", "downloaded");
              const icon = sheetDlBtn.querySelector(".dl-icon");
              const lbl = sheetDlBtn.querySelector(".dl-label");
              if (icon) icon.innerHTML = Icons.download(16);
              if (lbl) lbl.textContent = t("downloadAudio", state.lang);
              UIComponents.showToast(t("cancelDownload", state.lang));
              return;
            }
          }
          const reciter = audioManager.getCurrentReciter();
          if (OfflineAudio.isSurahDownloaded(surahNum, reciter.id)) {
            UIComponents.showToast(`${t("audioDownloaded", state.lang)} · ${isUr ? reciter.nameUr : reciter.nameEn}`);
            return;
          }
          sheetAbort = new AbortController();
          sheetDlBtn.classList.add("downloading");
          const icon = sheetDlBtn.querySelector(".dl-icon");
          const lbl = sheetDlBtn.querySelector(".dl-label");
          if (icon) icon.innerHTML = Icons.hourglass(16);
          if (lbl) lbl.textContent = `${t("downloadingAudio", state.lang)} (0/${totalAyahs})`;

          try {
            await OfflineAudio.downloadSurah(surahNum, totalAyahs, reciter.id, (prog) => {
              if (lbl) lbl.textContent = `${prog.currentAyah}/${prog.totalAyahs} (${prog.sizeMB} MB)`;
            }, sheetAbort.signal);
            sheetDlBtn.classList.remove("downloading");
            sheetDlBtn.classList.add("downloaded");
            if (icon) icon.innerHTML = Icons.check(16);
            if (lbl) lbl.textContent = t("audioDownloaded", state.lang);
            sheetAbort = null;
            UIComponents.showToast(t("audioDownloaded", state.lang));
            updateDownloadedList();
            if (typeof onChange === "function") onChange();
          } catch (err) {
            sheetDlBtn.classList.remove("downloading", "downloaded");
            if (icon) icon.innerHTML = Icons.download(16);
            if (lbl) lbl.textContent = t("downloadAudio", state.lang);
            sheetAbort = null;
            if (err.message !== "Download cancelled") {
              console.error("Audio download error:", err);
              UIComponents.showToast(t("audioErrorNotice", state.lang));
            }
          }
        });
      }
    }

    const persistBtn = sheet.querySelector("#btn-persist-storage");
    if (persistBtn) {
      persistBtn.addEventListener("click", async () => {
        const ok = await OfflineAudio.requestPersistence();
        UIComponents.showToast(ok ? t("storagePersisted", state.lang) : "Storage persistence unavailable");
      });
    }

    // 3. Display settings
    const scalerBox = sheet.querySelector("#sheet-scaler-box");
    if (scalerBox) {
      UIComponents.renderFontScalerPills(scalerBox, () => {
        if (typeof onChange === "function") onChange();
      });
    }

    sheet.querySelectorAll("[data-sheet-meaning]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const m = btn.getAttribute("data-sheet-meaning");
        state.meaningDisplay = m;
        sheet.querySelectorAll("[data-sheet-meaning]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    // Tajweed Legend Sheet Button
    const tjLegendBtn = sheet.querySelector("#btn-sheet-tajweed-legend");
    if (tjLegendBtn) {
      tjLegendBtn.addEventListener("click", () => {
        if (!page) close();
        UIComponents.showTajweedLegendBottomSheet();
      });
    }

    sheet.querySelectorAll("[data-sheet-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const th = btn.getAttribute("data-sheet-theme");
        state.theme = th;
        sheet.querySelectorAll("[data-sheet-theme]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    // Offline Quran download
    const offStatus = sheet.querySelector("#offline-quran-status");
    const offBtn = sheet.querySelector("#btn-offline-quran");
    const offBar = sheet.querySelector("#offline-quran-progress");
    const refreshOffline = async () => {
      if (!offStatus) return;
      if (!OfflineQuran.supported()) { offStatus.textContent = t("notificationsNotSupported", state.lang); if (offBtn) offBtn.hidden = true; return; }
      const n = await OfflineQuran.countSaved();
      offStatus.textContent = n >= 114 ? t("offlineAllSaved", state.lang) : t("offlineSavedCount", state.lang).replace("{n}", n);
      if (offBtn) offBtn.hidden = n >= 114;
    };
    refreshOffline();
    if (offBtn) {
      offBtn.addEventListener("click", async () => {
        offBtn.disabled = true;
        if (offBar) offBar.hidden = false;
        const bar = offBar && offBar.querySelector("span");
        const res = await OfflineQuran.downloadAll((done, total) => {
          if (bar) bar.style.width = `${Math.round((done / total) * 100)}%`;
          if (offStatus) offStatus.textContent = t("offlineDownloading", state.lang).replace("{p}", Math.round((done / total) * 100));
        });
        offBtn.disabled = false;
        if (offBar) offBar.hidden = true;
        await refreshOffline();
        if (!res.success && offStatus) offStatus.textContent += " " + t("offlineRetry", state.lang);
      });
    }

    // Backup / restore of bookmarks, memorized ayahs and last read
    const backupStatus = sheet.querySelector("#backup-status");
    const exportBtn = sheet.querySelector("#btn-backup-export");
    const importBtn = sheet.querySelector("#btn-backup-import");
    const fileInput = sheet.querySelector("#backup-file-input");
    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        const data = Storage.exportBackup();
        const name = `baseerah-backup-${new Date().toISOString().slice(0, 10)}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        try {
          const file = new File([blob], name, { type: "application/json" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "Baseerah backup" });
            if (backupStatus) backupStatus.textContent = t("backupShared", state.lang);
            return;
          }
        } catch (e) {
          if (e && e.name === "AbortError") return;
        }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        if (backupStatus) backupStatus.textContent = t("backupSaved", state.lang);
      });
    }
    if (importBtn && fileInput) {
      importBtn.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", async () => {
        const f = fileInput.files && fileInput.files[0];
        fileInput.value = "";
        if (!f || !backupStatus) return;
        if (f.size > 2 * 1024 * 1024) { backupStatus.textContent = t("backupInvalid", state.lang); return; }
        try {
          const res = Storage.importBackup(JSON.parse(await f.text()));
          backupStatus.textContent = res.ok
            ? t("backupRestored", state.lang).replace("{b}", res.bookmarksAdded).replace("{m}", res.memorizedAdded)
            : t("backupInvalid", state.lang);
        } catch (e) {
          backupStatus.textContent = t("backupInvalid", state.lang);
        }
      });
    }

    // Quran-time + Jumu'ah reminders + test notification
    const setReminderPills = (attr, on) => sheet.querySelectorAll(`[${attr}]`).forEach((b) => b.classList.toggle("active", (b.getAttribute(attr) === "on") === on));
    const testStatus = sheet.querySelector("#notif-test-status");
    const showPermissionProblem = (res) => {
      if (!testStatus) return;
      testStatus.textContent = res.reason === "unsupported" ? t("notificationsNotSupported", state.lang) : t("notificationsBlockedHelp", state.lang);
      testStatus.classList.add("is-error");
    };
    sheet.querySelectorAll("[data-quran-reminder]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const on = btn.getAttribute("data-quran-reminder") === "on";
        if (on) {
          const res = await NotificationManager.ensurePermission();
          if (!res.success) { setReminderPills("data-quran-reminder", false); showPermissionProblem(res); return; }
        }
        state.quranReminder = { enabled: on };
        setReminderPills("data-quran-reminder", on);
        ["#quran-reminder-time-line", "#quran-reminder-order-line", "#quran-reminder-order-help"].forEach((sel) => {
          const line = sheet.querySelector(sel);
          if (line) line.classList.toggle("is-off", !on);
        });
      });
    });
    const timeSel = sheet.querySelector("#quran-reminder-time");
    if (timeSel) timeSel.addEventListener("change", () => { state.quranReminder = { time: timeSel.value }; });
    sheet.querySelectorAll("[data-quran-order]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const order = btn.getAttribute("data-quran-order");
        state.quranReminder = { order };
        sheet.querySelectorAll("[data-quran-order]").forEach((b) => {
          const on = b.getAttribute("data-quran-order") === order;
          b.classList.toggle("active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        const help = sheet.querySelector("#quran-reminder-order-help");
        if (help) help.textContent = t(order === "random" ? "ayahOrderRandomHelp" : "ayahOrderLinearHelp", state.lang);
      });
    });
    sheet.querySelectorAll("[data-jumuah-reminder]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const on = btn.getAttribute("data-jumuah-reminder") === "on";
        if (on) {
          const res = await NotificationManager.ensurePermission();
          if (!res.success) { setReminderPills("data-jumuah-reminder", false); showPermissionProblem(res); return; }
        }
        state.jumuahReminder = { enabled: on };
        setReminderPills("data-jumuah-reminder", on);
      });
    });
    sheet.querySelectorAll("[data-sunrise-reminder]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const on = btn.getAttribute("data-sunrise-reminder") === "on";
        if (on) {
          const res = await NotificationManager.ensurePermission();
          if (!res.success) { setReminderPills("data-sunrise-reminder", false); showPermissionProblem(res); return; }
        }
        state.sunriseReminder = { enabled: on };
        setReminderPills("data-sunrise-reminder", on);
      });
    });
    const testBtn = sheet.querySelector("#btn-notif-test");
    if (testBtn) {
      testBtn.addEventListener("click", async () => {
        testBtn.disabled = true;
        if (testStatus) { testStatus.classList.remove("is-error", "is-ok"); testStatus.textContent = t("testSending", state.lang); }
        const res = await NotificationManager.sendTestNotification();
        testBtn.disabled = false;
        if (!testStatus) return;
        if (res.success) {
          testStatus.textContent = t("testSent", state.lang);
          testStatus.classList.add("is-ok");
        } else if (res.reason === "denied" || res.reason === "unsupported") {
          showPermissionProblem(res);
        } else {
          testStatus.textContent = res.message || t("testFailed", state.lang);
          testStatus.classList.add("is-error");
        }
      });
    }

    sheet.querySelectorAll("[data-sheet-urdu-labels]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.urduLabels = btn.getAttribute("data-sheet-urdu-labels") === "on";
        sheet.querySelectorAll("[data-sheet-urdu-labels]").forEach((b) => b.classList.toggle("active", b === btn));
        if (typeof onChange === "function") onChange();
      });
    });

    // 4. Prayer Notifications Wiring
    const notifHelpEl = sheet.querySelector("#notif-permission-help");
    const notifDetailsEl = sheet.querySelector("#prayer-notifs-details");

    sheet.querySelectorAll("[data-sheet-notif]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const val = btn.getAttribute("data-sheet-notif");
        state.settings.notifUserOff = (val !== "on");
        if (val === "on") {
          const res = await NotificationManager.enableNotifications();
          if (res.success) {
            if (notifHelpEl) notifHelpEl.style.display = "none";
            sheet.querySelectorAll("[data-sheet-notif]").forEach((b) => b.classList.toggle("active", b.getAttribute("data-sheet-notif") === "on"));
            if (notifDetailsEl) notifDetailsEl.classList.remove("is-disabled");
          } else {
            sheet.querySelectorAll("[data-sheet-notif]").forEach((b) => b.classList.toggle("active", b.getAttribute("data-sheet-notif") === "off"));
            if (notifDetailsEl) notifDetailsEl.classList.add("is-disabled");
            if (notifHelpEl) {
              notifHelpEl.textContent = res.reason === "unsupported" ? t("notificationsNotSupported", state.lang) : t("notificationsBlockedHelp", state.lang);
              notifHelpEl.style.display = "block";
            }
          }
        } else {
          await NotificationManager.disableNotifications();
          sheet.querySelectorAll("[data-sheet-notif]").forEach((b) => b.classList.toggle("active", b.getAttribute("data-sheet-notif") === "off"));
          if (notifDetailsEl) notifDetailsEl.classList.add("is-disabled");
          if (notifHelpEl) notifHelpEl.style.display = "none";
        }
        if (typeof onChange === "function") onChange();
      });
    });

    sheet.querySelectorAll("[data-sheet-offset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const offset = parseInt(btn.getAttribute("data-sheet-offset"), 10) || 0;
        state.notificationOffset = offset;
        sheet.querySelectorAll("[data-sheet-offset]").forEach((b) => b.classList.toggle("active", b === btn));
        NotificationManager.scheduleNextAlert();
        NotificationManager.syncPushSubscription();
        if (typeof onChange === "function") onChange();
      });
    });

    sheet.querySelectorAll("[data-prayer-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pKey = btn.getAttribute("data-prayer-toggle");
        const val = btn.getAttribute("data-val") === "on";
        state.setNotificationPrayer(pKey, val);
        const parentToggle = btn.closest(".mode-pill-toggle");
        if (parentToggle) {
          parentToggle.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
        }
        NotificationManager.scheduleNextAlert();
        NotificationManager.syncPushSubscription();
        if (typeof onChange === "function") onChange();
      });
    });

    const changeLocBtn = sheet.querySelector("#btn-change-location");
    const locPicker = sheet.querySelector("#sheet-location-picker");
    const citySelect = sheet.querySelector("#sheet-city-select");
    const currentCityEl = sheet.querySelector("#sheet-current-city");
    const sheetGeoBtn = sheet.querySelector("#btn-sheet-geo");

    if (changeLocBtn && locPicker) {
      changeLocBtn.addEventListener("click", () => {
        locPicker.style.display = locPicker.style.display === "none" ? "block" : "none";
      });
    }

    if (citySelect) {
      citySelect.addEventListener("change", () => {
        const chosen = citySelect.value;
        const coords = CITY_COORDINATES[chosen];
        if (coords) {
          state.settings.prayerCity = chosen;
          state.settings.prayerLat = coords.lat;
          state.settings.prayerLng = coords.lng;
          Storage.saveSettings(state.settings);
          if (currentCityEl) currentCityEl.textContent = chosen;
          state.notify();
          NotificationManager.scheduleNextAlert();
          NotificationManager.syncPushSubscription();
          if (typeof onChange === "function") onChange();
        }
      });
    }

    if (sheetGeoBtn) {
      sheetGeoBtn.addEventListener("click", async () => {
        try {
          await PrayerEngine.requestDeviceLocation();
          if (currentCityEl) currentCityEl.textContent = state.settings.prayerCity || "My Location";
          UIComponents.showToast(t("locationUpdated", state.lang));
          NotificationManager.scheduleNextAlert();
          NotificationManager.syncPushSubscription();
          if (typeof onChange === "function") onChange();
        } catch (err) {
          console.warn("Geolocation request failed:", err);
          UIComponents.showToast("Location access unavailable");
        }
      });
    }

    // 4. About & Kiosk
    const aboutBtn = sheet.querySelector("#btn-sheet-about");
    if (aboutBtn) {
      aboutBtn.addEventListener("click", () => {
        if (!page) close();
        router.navigate("about");
      });
    }

    if (page) page.appendChild(sheet); else document.body.appendChild(sheet);
    if (focus === "notifications") {
      const target = sheet.querySelector("#settings-notifications-card");
      const content = sheet.querySelector(".quran-settings-content");
      if (target && content) {
        // Bring the Azan reminders section to the top when opened from Home
        content.insertBefore(target, content.firstElementChild);
      }
      const title = sheet.querySelector(".sheet-surah-ar");
      if (title) title.textContent = t("appSettings", state.lang);
    }
  },

  /**
   * Bottom sheet detailing all 6 Tajweed rules with color swatches, descriptions, and examples
   */
  showTajweedLegendBottomSheet() {
    const isUr = state.lang === "ur";
    const sheet = document.createElement("div");
    sheet.className = "bottom-sheet-overlay active";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    const rules = [
      {
        id: "madd-lazim",
        swatchClass: "madd-lazim",
        colorVar: "var(--tj-madd-necessary)",
        title: t("tajweedRuleMaddLazimTitle", state.lang),
        desc: t("tajweedRuleMaddLazimDesc", state.lang),
        examples: isUr ? "الٓمّٓ (۶ حرکات)" : "الٓمّٓ (6 counts)"
      },
      {
        id: "madd-wajib",
        swatchClass: "madd-wajib",
        colorVar: "var(--tj-madd-obligatory)",
        title: t("tajweedRuleMaddWajibTitle", state.lang),
        desc: t("tajweedRuleMaddWajibDesc", state.lang),
        examples: isUr ? "جَآءَ (۴-۵ حرکات)" : "جَآءَ (4–5 counts)"
      },
      {
        id: "madd-jaiz",
        swatchClass: "madd-jaiz",
        colorVar: "var(--tj-madd-permissible)",
        title: t("tajweedRuleMaddJaizTitle", state.lang),
        desc: t("tajweedRuleMaddJaizDesc", state.lang),
        examples: isUr ? "بِمَآ أُنزِلَ (۲، ۴، ۶ حرکات)" : "بِمَآ أُنزِلَ (2, 4, 6 counts)"
      },
      {
        id: "madd-tabeei",
        swatchClass: "madd-tabeei",
        colorVar: "var(--tj-madd-normal)",
        title: t("tajweedRuleMaddTabeeiTitle", state.lang),
        desc: t("tajweedRuleMaddTabeeiDesc", state.lang),
        examples: isUr ? "قَالَ (۲ حرکات)" : "قَالَ (2 counts)"
      },
      {
        id: "ghunnah",
        swatchClass: "ghunnah",
        colorVar: "var(--tj-ghunnah)",
        title: t("tajweedRuleGhunnahTitle", state.lang),
        desc: t("tajweedRuleGhunnahDesc", state.lang),
        examples: isUr ? "إِنَّ · ثُمَّ" : "إِنَّ · ثُمَّ"
      },
      {
        id: "idgham-ghunnah",
        swatchClass: "idgham-ghunnah",
        colorVar: "var(--tj-idgham-ghunnah)",
        title: t("tajweedRuleIdghamTitle", state.lang),
        desc: t("tajweedRuleIdghamDesc", state.lang),
        examples: isUr ? "مَن يَقُولُ" : "مَن يَقُولُ"
      },
      {
        id: "ikhfa",
        swatchClass: "ikhfa",
        colorVar: "var(--tj-ikhafa)",
        title: t("tajweedRuleIkhfaTitle", state.lang),
        desc: t("tajweedRuleIkhfaDesc", state.lang),
        examples: isUr ? "مِن قَبْلِكَ · أَنفُسَهُمْ" : "مِن قَبْلِكَ · أَنفُسَهُمْ"
      },
      {
        id: "iqlab",
        swatchClass: "iqlab",
        colorVar: "var(--tj-iqlab)",
        title: t("tajweedRuleIqlabTitle", state.lang),
        desc: t("tajweedRuleIqlabDesc", state.lang),
        examples: isUr ? "مِۢن بَعْدِ" : "مِۢن بَعْدِ"
      },
      {
        id: "qalqalah",
        swatchClass: "qalaqah",
        colorVar: "var(--tj-qalaqah)",
        title: t("tajweedRuleQalqalahTitle", state.lang),
        desc: t("tajweedRuleQalqalahDesc", state.lang),
        examples: isUr ? "ٱلْفَلَقِ · أَحَدٌ · يَجْعَلُونَ" : "ٱلْفَلَقِ · أَحَدٌ · يَجْعَلُونَ"
      },
      {
        id: "silent",
        swatchClass: "silent",
        colorVar: "var(--tj-silent)",
        title: t("tajweedRuleSilentTitle", state.lang),
        desc: t("tajweedRuleSilentDesc", state.lang),
        examples: isUr ? "قَالُوا۟ · ٱهْدِنَا · وَٱلشَّمْسِ" : "قَالُوا۟ · ٱهْدِنَا · وَٱلشَّمْسِ"
      }
    ];

    const cardsHtml = rules.map((r) => `
      <div class="tj-legend-card">
        <div class="tj-legend-card-header">
          <span class="tj-swatch-large" style="background: ${r.colorVar};" aria-hidden="true"></span>
          <h4 class="tj-legend-rule-title">${r.title}</h4>
        </div>
        <p class="tj-legend-card-desc">${r.desc}</p>
        <div class="tj-legend-examples" dir="rtl">${(() => { const m = String(r.examples).match(/^(.*?)\s*\((.*)\)$/); return m ? `<span class="tj-ex-ar" lang="ar">${m[1]}</span> <bdi class="tj-ex-count" dir="${isUr ? "rtl" : "ltr"}">${m[2]}</bdi>` : r.examples; })()}</div>
      </div>
    `).join("");

    sheet.innerHTML = `
      <div class="bottom-sheet tajweed-legend-sheet" dir="${isUr ? 'rtl' : 'ltr'}">
        <div class="bottom-sheet-handle"></div>
        <div class="bottom-sheet-header">
          <div class="sheet-title-box">
            <span class="sheet-surah-ar" lang="${state.lang}">${t("tajweedLegendTitle", state.lang)}</span>
          </div>
          <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">${Icons.close(18)}</button>
        </div>
        <div class="bottom-sheet-content tajweed-legend-content">
          <div class="tj-legend-grid">
            ${cardsHtml}
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

  /**
   * Renders user text size selector [S | M | L | XL]
   */
  renderFontScalerPills(container, onChange) {
    const render = () => {
      const currentSize = state.textSize;
      container.innerHTML = `
        <div class="font-scaler-group text-size-scaler-group" role="group" aria-label="${t("fontSizeLabel", state.lang)}">
          <div class="text-size-segmented-pill">
            <button type="button" class="btn-text-size ${currentSize === 'S' ? 'active' : ''}" data-text-size="S" title="Small" aria-label="S, Small">S</button>
            <button type="button" class="btn-text-size ${currentSize === 'M' ? 'active' : ''}" data-text-size="M" title="Medium (default)" aria-label="M, Medium">M</button>
            <button type="button" class="btn-text-size ${currentSize === 'L' ? 'active' : ''}" data-text-size="L" title="Large" aria-label="L, Large">L</button>
            <button type="button" class="btn-text-size ${currentSize === 'XL' ? 'active' : ''}" data-text-size="XL" title="Extra large" aria-label="XL, Extra large">XL</button>
          </div>
        </div>
      `;

      container.querySelectorAll(".btn-text-size").forEach((btn) => {
        btn.addEventListener("click", () => {
          const sz = btn.getAttribute("data-text-size");
          state.textSize = sz;
          render();
          if (onChange) onChange(sz);
        });
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
   * Reciter Selection Modal (5 Verified EveryAyah Reciters)
   */
  showReciterModal(onSelect) {
    const isUr = state.lang === "ur";
    const dialog = document.createElement("div");
    dialog.className = "modal-overlay active";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const currentId = audioManager.currentReciterId;

    dialog.innerHTML = `
      <div class="modal-card reciter-picker-modal">
        <div class="modal-header">
          <h3>${t("selectReciter", state.lang)}</h3>
          <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">${Icons.close(18)}</button>
        </div>
        <div class="reciter-list" role="radiogroup" aria-label="${t("reciters", state.lang)}">
          ${RECITERS.map((r) => {
      const isSelected = r.id === currentId;
      return `
              <button type="button" class="reciter-option-card ${isSelected ? "selected" : ""}" data-reciter-id="${r.id}" role="radio" aria-checked="${isSelected}">
                <div class="reciter-info">
                  <span class="reciter-name-ar" lang="ar" dir="rtl">${r.nameUr}</span>
                  <span class="reciter-name-en" lang="en" dir="ltr">${r.nameEn}</span>
                  <span class="reciter-bitrate">${r.bitrate} · EveryAyah</span>
                </div>
                <div class="reciter-check-icon">
                  ${isSelected ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-emerald-accent)" stroke-width="2.5" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"/></svg>` : ""}
                </div>
              </button>
            `;
    }).join("")}
        </div>
      </div>
    `;

    dialog.querySelector(".btn-close").addEventListener("click", () => dialog.remove());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.remove();
    });

    dialog.querySelectorAll(".reciter-option-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-reciter-id");
        audioManager.setReciter(id);
        if (onSelect) onSelect(audioManager.getCurrentReciter());
        dialog.remove();
      });
    });

    document.body.appendChild(dialog);
  },

  /**
   * Repeat Range Configuration Modal (for Hifz memorization)
   */
  showRepeatRangeModal(sNum, totalAyahs, currentRange, onConfirm) {
    const isUr = state.lang === "ur";
    const dialog = document.createElement("div");
    dialog.className = "modal-overlay active";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    let start = Math.max(1, Math.min(totalAyahs, currentRange ? currentRange[0] : 1));
    let end = Math.max(start, Math.min(totalAyahs, currentRange ? currentRange[1] : Math.min(start + 4, totalAyahs)));

    const render = () => {
      dialog.innerHTML = `
        <div class="modal-card repeat-range-modal">
          <div class="modal-header">
            <h3>${t("setRepeatRange", state.lang)}</h3>
            <button type="button" class="btn-close" aria-label="${t("close", state.lang)}">${Icons.close(18)}</button>
          </div>
          <div class="range-stepper-box">
            <div class="range-stepper-col">
              <span class="stepper-label">${t("startAyah", state.lang)}</span>
              <div class="stepper-controls">
                <button type="button" class="btn-stepper-step" data-step="start" data-delta="-1" ${start <= 1 ? "disabled" : ""}>−</button>
                <span class="stepper-val urdu-num">${isUr ? toUrduDigits(start) : start}</span>
                <button type="button" class="btn-stepper-step" data-step="start" data-delta="1" ${start >= end ? "disabled" : ""}>+</button>
              </div>
            </div>
            <div class="range-stepper-sep">${Icons.arrowRight(16)}</div>
            <div class="range-stepper-col">
              <span class="stepper-label">${t("endAyah", state.lang)}</span>
              <div class="stepper-controls">
                <button type="button" class="btn-stepper-step" data-step="end" data-delta="-1" ${end <= start ? "disabled" : ""}>−</button>
                <span class="stepper-val urdu-num">${isUr ? toUrduDigits(end) : end}</span>
                <button type="button" class="btn-stepper-step" data-step="end" data-delta="1" ${end >= totalAyahs ? "disabled" : ""}>+</button>
              </div>
            </div>
          </div>
          <div class="range-modal-summary">
            <p>${isUr ? `آیت نمبر <span class="urdu-num">${toUrduDigits(start)}</span> تا <span class="urdu-num">${toUrduDigits(end)}</span> مسلسل تکرار کے ساتھ جاری رہے گی۔` : `Ayahs ${start} to ${end} will repeat continuously.`}</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary btn-cancel-range">${t("repeatOff", state.lang)}</button>
            <button type="button" class="btn-primary btn-save-range">${t("setRepeatRange", state.lang)}</button>
          </div>
        </div>
      `;

      dialog.querySelector(".btn-close").addEventListener("click", () => dialog.remove());
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) dialog.remove();
      });

      dialog.querySelectorAll(".btn-stepper-step").forEach((btn) => {
        btn.addEventListener("click", () => {
          const which = btn.getAttribute("data-step");
          const delta = parseInt(btn.getAttribute("data-delta"), 10);
          if (which === "start") {
            start = Math.max(1, Math.min(end, start + delta));
          } else {
            end = Math.max(start, Math.min(totalAyahs, end + delta));
          }
          render();
        });
      });

      dialog.querySelector(".btn-cancel-range").addEventListener("click", () => {
        audioManager.setRepeatMode("off");
        dialog.remove();
        if (onConfirm) onConfirm({ mode: "off" });
      });

      dialog.querySelector(".btn-save-range").addEventListener("click", () => {
        audioManager.setRepeatMode("range", { range: [start, end] });
        dialog.remove();
        if (onConfirm) onConfirm({ mode: "range", range: [start, end] });
      });
    };

    render();
    document.body.appendChild(dialog);
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

if (typeof window !== "undefined") {
  window.UIComponents = UIComponents;
  window.BASEERAH_COMPONENTS = UIComponents;
}
