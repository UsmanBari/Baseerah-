/* Baseerah — Quran Reading Screen (Word-by-Word & Mushaf Modes) */
import { state } from "../core/state.js";
import { t, toUrduDigits } from "../core/i18n.js";
import { router } from "../core/router.js";
import { UIComponents } from "../ui/components.js";
import { audioManager } from "../core/audio.js";
import { Integrity } from "../core/integrity.js";

let currentSelectedWordIndex = 0;

export async function renderQuranScreen(container, params = []) {
  const isUr = state.lang === "ur";
  const sNum = parseInt(params[0], 10) || state.nav.surah || 1;
  const aNum = parseInt(params[1], 10) || state.nav.ayah || 1;

  state.updateNav({ surah: sNum, ayah: aNum });

  // Show loading indicator
  container.innerHTML = `
    <div class="screen active screen-quran-loading" dir="${isUr ? "rtl" : "ltr"}">
      <div class="loading-spinner"></div>
      <p class="loading-text">${isUr ? "قرآنِ پاک لوڈ ہو رہا ہے..." : "Loading Quran text..."}</p>
    </div>
  `;

  // Fetch surah data with integrity check
  let surahData = state.surahCache.get(sNum);
  if (!surahData) {
    try {
      const padded = String(sNum).padStart(3, "0");
      const resp = await fetch(`data/surahs/${padded}.js`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();

      // Integrity verification
      const verifyRes = await Integrity.verifySurahFile(sNum, text);
      if (!verifyRes.valid) {
        showIntegrityError(container, sNum, verifyRes);
        return;
      }

      // Safe extraction of json object
      const jsonStr = text.replace(/^window\.BASEERAH_SURAH\s*=\s*/, "").replace(/;\s*$/, "");
      surahData = JSON.parse(jsonStr);
      state.surahCache.set(sNum, surahData);
    } catch (err) {
      console.error("Error loading surah:", err);
      container.innerHTML = `
        <div class="screen active screen-error">
          <h3>${isUr ? "سورت لوڈ کرنے میں خرابی ہوئی" : "Failed to load Surah"}</h3>
          <p class="muted">${err.message}</p>
          <button type="button" class="btn-primary" data-nav="surahs">${t("surahs", state.lang)}</button>
        </div>
      `;
      container.querySelector("[data-nav='surahs']").addEventListener("click", () => router.navigate("surahs"));
      return;
    }
  }

  const totalAyahs = surahData.ayahs.length;
  const currentAyahObj = surahData.ayahs.find((a) => a.number === aNum) || surahData.ayahs[0];
  const ayahIndex = surahData.ayahs.indexOf(currentAyahObj);

  container.innerHTML = `
    <div class="screen active screen-quran" dir="${isUr ? "rtl" : "ltr"}">
      <!-- Top Action Bar -->
      <header class="quran-header">
        <div class="header-left">
          <button type="button" class="btn-icon btn-back" data-nav="surahs" aria-label="${t("surahs", state.lang)}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              ${isUr ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>'}
            </svg>
            <span>${t("surahs", state.lang)}</span>
          </button>

          <div class="surah-title-chip">
            <span class="chip-num">${isUr ? toUrduDigits(sNum) : sNum}</span>
            <span class="chip-name-ar" lang="ar" dir="rtl">${surahData.nameAr}</span>
            <span class="chip-name-en">${surahData.nameEn}</span>
          </div>
        </div>

        <div class="header-center">
          <button type="button" class="keypad-trigger-btn" id="btn-goto-keypad">
            <span>${isUr ? `آیت ${toUrduDigits(currentAyahObj.number)} / ${toUrduDigits(totalAyahs)}` : `Ayah ${currentAyahObj.number} of ${totalAyahs}`}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>

        <div class="header-right">
          <!-- Reading Mode Switch -->
          <div class="mode-toggle" role="group" aria-label="Reading Mode">
            <button type="button" class="mode-btn ${state.readingMode === "wbw" ? "active" : ""}" data-mode="wbw">
              ${t("readingModeWbw", state.lang)}
            </button>
            <button type="button" class="mode-btn ${state.readingMode === "mushaf" ? "active" : ""}" data-mode="mushaf">
              ${t("readingModeMushaf", state.lang)}
            </button>
          </div>

          <!-- Elder Text Scaler -->
          <div id="elder-scale-container"></div>
        </div>
      </header>

      <!-- Main Reader Area -->
      <main class="quran-main-body">
        ${state.readingMode === "wbw" 
          ? renderWbwView(surahData, currentAyahObj, ayahIndex, totalAyahs, isUr)
          : renderMushafView(surahData, isUr)
        }
      </main>

      <!-- Bottom Audio / Navigation Bar (For WBW Mode) -->
      ${state.readingMode === "wbw" ? `
        <footer class="quran-footer">
          <button type="button" class="btn-nav-ayah" id="btn-prev-ayah" ${ayahIndex <= 0 ? "disabled" : ""}>
            ${isUr ? "← اگلی آیت" : "← Previous"}
          </button>
          
          <button type="button" class="btn-audio-ayah" id="btn-audio-ayah">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <span>${state.mosqueMute ? (isUr ? "احترامِ مسجد موڈ" : "Mosque Mute") : (isUr ? "تلاوت سنیں" : "Recitation")}</span>
          </button>

          <button type="button" class="btn-nav-ayah" id="btn-next-ayah" ${ayahIndex >= totalAyahs - 1 ? "disabled" : ""}>
            ${isUr ? "پچھلی آیت →" : "Next →"}
          </button>
        </footer>
      ` : ""}
    </div>
  `;

  // Render Elder Scaler
  const scalerContainer = container.querySelector("#elder-scale-container");
  if (scalerContainer) {
    UIComponents.renderElderScalePills(scalerContainer);
  }

  // Wire Back Button
  container.querySelector("[data-nav='surahs']").addEventListener("click", () => {
    router.navigate("surahs");
  });

  // Wire Keypad Trigger
  container.querySelector("#btn-goto-keypad").addEventListener("click", () => {
    UIComponents.showKeypadDialog({
      maxAyahs: totalAyahs,
      currentSurah: sNum,
      onJump: (targetS, targetA) => {
        router.navigate(`quran/${targetS}/${targetA}`);
      }
    });
  });

  // Wire Reading Mode Switch
  container.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.readingMode = btn.getAttribute("data-mode");
      renderQuranScreen(container, [sNum, aNum]);
    });
  });

  // WBW Mode specifics
  if (state.readingMode === "wbw") {
    wireWbwInteractions(container, surahData, currentAyahObj, ayahIndex, sNum);
  } else {
    wireMushafInteractions(container, surahData);
  }
}

function renderWbwView(surahData, ayah, ayahIndex, totalAyahs, isUr) {
  const words = ayah.words || [];
  if (currentSelectedWordIndex >= words.length) {
    currentSelectedWordIndex = 0;
  }
  const selWord = words[currentSelectedWordIndex] || words[0] || { ar: "", ur: "", en: "" };

  return `
    <div class="wbw-container">
      <!-- Full Ayah Card in Indo-Pak Nastaleeq -->
      <div class="ayah-full-card" lang="ar" dir="rtl">
        <p class="ayah-full-text">${ayah.arFull}</p>
      </div>

      <!-- Word-by-Word Grid -->
      <div class="wbw-grid-box" dir="rtl">
        <div class="wbw-grid">
          ${words.map((w, idx) => `
            <button type="button" class="wbw-word-tile ${idx === currentSelectedWordIndex ? "selected" : ""}" data-widx="${idx}">
              <span class="tile-ar" lang="ar">${w.ar}</span>
              <span class="tile-ur" lang="ur">${w.ur || "—"}</span>
              <span class="tile-en">${w.en || "—"}</span>
            </button>
          `).join("")}
        </div>
      </div>

      <!-- Selected Word Inspector -->
      <div class="word-inspector-card" dir="${isUr ? "rtl" : "ltr"}">
        <div class="inspector-badge">${t("selectedWord", state.lang)}</div>
        <div class="inspector-details">
          <div class="inspector-ar" lang="ar" dir="rtl">${selWord.ar}</div>
          <div class="inspector-meanings">
            <div class="meaning-item">
              <span class="meaning-label" lang="ur">اردو معنی:</span>
              <span class="meaning-val" lang="ur">${selWord.ur || "—"}</span>
            </div>
            <div class="meaning-item">
              <span class="meaning-label">English:</span>
              <span class="meaning-val">${selWord.en || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Full Ayah Translations Card -->
      <div class="ayah-translations-card" dir="${isUr ? "rtl" : "ltr"}">
        <h4 class="trans-heading">${t("fullTranslation", state.lang)}</h4>
        
        <div class="translation-block">
          <div class="trans-meta">
            <span class="trans-author" lang="ur">اردو ترجمہ — مولانا محمد جوناگڑھی</span>
          </div>
          <p class="trans-text urdu-trans" lang="ur" dir="rtl">${ayah.ur}</p>
        </div>

        <div class="translation-block">
          <div class="trans-meta">
            <span class="trans-author">English Translation — Saheeh International</span>
          </div>
          <p class="trans-text en-trans" dir="ltr">${ayah.en}</p>
        </div>
      </div>
    </div>
  `;
}

function wireWbwInteractions(container, surahData, ayah, ayahIndex, sNum) {
  // Tile clicks
  container.querySelectorAll(".wbw-word-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      currentSelectedWordIndex = parseInt(tile.getAttribute("data-widx"), 10);
      renderQuranScreen(container, [sNum, ayah.number]);
    });
  });

  // Prev / Next Ayah
  const prevBtn = container.querySelector("#btn-prev-ayah");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (ayahIndex > 0) {
        currentSelectedWordIndex = 0;
        const prevAyah = surahData.ayahs[ayahIndex - 1];
        router.navigate(`quran/${sNum}/${prevAyah.number}`);
      }
    });
  }

  const nextBtn = container.querySelector("#btn-next-ayah");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (ayahIndex < surahData.ayahs.length - 1) {
        currentSelectedWordIndex = 0;
        const nextAyah = surahData.ayahs[ayahIndex + 1];
        router.navigate(`quran/${sNum}/${nextAyah.number}`);
      }
    });
  }

  // Audio Playback
  const audioBtn = container.querySelector("#btn-audio-ayah");
  if (audioBtn) {
    audioBtn.addEventListener("click", () => {
      const result = audioManager.playAyah(sNum, ayah.number);
      if (!result.played && result.reason === "mosque_mute_active") {
        UIComponents.showToast(result.messageUr);
      }
    });
  }
}

function renderMushafView(surahData, isUr) {
  return `
    <div class="mushaf-container" dir="rtl">
      ${surahData.number !== 1 && surahData.number !== 9 ? `
        <div class="mushaf-bismillah-box" lang="ar">
          ${window.BASEERAH_BISMILLAH || ""}
        </div>
      ` : ""}
      
      <div class="mushaf-flow-text" lang="ar">
        ${surahData.ayahs.map((a) => `
          <span class="mushaf-ayah-span" data-ayah-num="${a.number}" tabindex="0" role="button" aria-label="Ayah ${a.number}">
            ${a.arFull}
          </span>
        `).join(" ")}
      </div>
    </div>
  `;
}

function wireMushafInteractions(container, surahData) {
  container.querySelectorAll(".mushaf-ayah-span").forEach((span) => {
    span.addEventListener("click", () => {
      const aNum = parseInt(span.getAttribute("data-ayah-num"), 10);
      const aData = surahData.ayahs.find((a) => a.number === aNum);
      if (aData) {
        UIComponents.showMushafBottomSheet(aData, surahData.nameAr, surahData.nameEn);
      }
    });
  });
}

function showIntegrityError(container, sNum, res) {
  container.innerHTML = `
    <div class="screen active screen-security-error">
      <div class="security-card">
        <div class="security-icon">⚠️</div>
        <h3>${state.lang === "ur" ? "ڈیٹا کی حفاظت کا انتباہ" : "Data Integrity Verification Failed"}</h3>
        <p class="security-msg">
          ${state.lang === "ur" 
            ? `سورت نمبر ${sNum} کے ڈیجیٹل دستخط (SHA-256) کی تصدیق ناکام ہو گئی ہے۔ قرآنی متن کی حفاظت کی خاطر یہ سورت اس وقت تک ظاہر نہیں کی جا سکتی جب تک کہ مستند فائل بحال نہ ہو جائے۔`
            : `Digital integrity check (SHA-256) failed for Surah ${sNum}. To protect Quranic authenticity, corrupted or modified files are strictly blocked from rendering.`
          }
        </p>
        <p class="security-meta">Expected: <code>${res.expected}</code><br>Computed: <code>${res.got}</code></p>
        <button type="button" class="btn-primary" data-nav="surahs">${t("surahs", state.lang)}</button>
      </div>
    </div>
  `;
  container.querySelector("[data-nav='surahs']").addEventListener("click", () => router.navigate("surahs"));
}
