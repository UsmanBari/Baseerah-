/* Baseerah — Quran Screen (Baseerah v2 Interlinear Word-by-Word Redesign) */
import { state } from "../core/state.js";
import { t, toUrduDigits } from "../core/i18n.js";
import { router } from "../core/router.js";
import { UIComponents } from "../ui/components.js";
import { Integrity } from "../core/integrity.js";

let selectedWordIndex = null;

function parseFootnotesMap(fnRaw) {
  const map = {};
  if (!fnRaw || typeof fnRaw !== "string") return map;
  // Match lines or blocks starting with [number]
  const pattern = /\[(\d+)\]\s*([^[]+)/g;
  let match;
  while ((match = pattern.exec(fnRaw)) !== null) {
    map[match[1]] = match[2].trim();
  }
  return map;
}

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

  // Fetch surah data with SHA-256 integrity check
  let surahData = state.surahCache.get(sNum);
  if (!surahData) {
    try {
      const padded = String(sNum).padStart(3, "0");
      const resp = await fetch(`data/surahs/${padded}.js`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();

      const verifyRes = await Integrity.verifySurahFile(sNum, text);
      if (!verifyRes.valid) {
        showIntegrityError(container, sNum, verifyRes);
        return;
      }

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
  const isFirstAyah = aNum <= 1;
  const isLastAyah = aNum >= totalAyahs;

  const fnMapUr = parseFootnotesMap(currentAyahObj.footnotesUr);
  const fnMapEn = parseFootnotesMap(currentAyahObj.footnotesEn);

  // Parse footnotes inside translations
  const renderTransWithFootnotes = (rawText, lang, fnMap) => {
    if (!rawText) return "—";
    return rawText.replace(/\[(\d+)\]/g, (match, p1) => {
      return `<button type="button" class="fn-ref-btn" data-fn="${p1}" data-lang="${lang}" aria-label="Footnote ${p1}"><sup>[${p1}]</sup></button>`;
    });
  };

  const urHtml = renderTransWithFootnotes(currentAyahObj.ur, "ur", fnMapUr);
  const enHtml = renderTransWithFootnotes(currentAyahObj.en, "en", fnMapEn);

  const meaningMode = state.meaningDisplay; // "both" | "ur" | "en"

  // Mode: WBW vs Mushaf
  const isMushafMode = state.readingMode === "mushaf";

  if (isMushafMode) {
    renderMushafView(container, surahData, sNum, aNum, totalAyahs, isUr);
    return;
  }

  // -------------------------------------------------------------
  // INTERLINEAR WORD-BY-WORD LAYOUT
  // -------------------------------------------------------------
  const wordsHtml = (currentAyahObj.words || []).map((w, idx) => {
    const isSelected = selectedWordIndex === idx;
    return `
      <div class="wbw-interlinear-tile wbw-word-tile ${isSelected ? 'selected' : ''}" data-word-idx="${idx}" role="button" tabindex="0">
        <span class="tile-ar" lang="ar">${w.ar}</span>
        <div class="tile-gold-divider"></div>
        <span class="tile-ur" lang="ur">${w.ur || "—"}</span>
        <span class="tile-en">${w.en || "—"}</span>
      </div>
    `;
  }).join("");

  const medallionSvg = UIComponents.getAyahMedallionSvg(currentAyahObj.number, 52);

  // Ayah Chips Row (current = emerald, read = light green, upcoming = white)
  const chipsHtml = surahData.ayahs.map((a) => {
    let chipStatus = "chip-upcoming";
    if (a.number === aNum) chipStatus = "chip-current";
    else if (a.number < aNum) chipStatus = "chip-read";

    return `
      <button type="button" class="ayah-chip ${chipStatus}" data-chip-ayah="${a.number}" aria-label="Ayah ${a.number}">
        ${isUr ? `<span class="urdu-num">${toUrduDigits(a.number)}</span>` : a.number}
      </button>
    `;
  }).join("");

  const canGoNext = (aNum < totalAyahs) || (sNum < 114);
  const canGoPrev = aNum > 1;

  let leftId, leftAria, leftText, leftDisabled, leftPoints;
  let rightId, rightAria, rightText, rightDisabled, rightPoints;

  if (isUr) {
    // Left = Next
    leftId = "btn-next-ayah";
    leftAria = "‹ اگلی آیت";
    leftText = "‹ اگلی آیت";
    leftDisabled = !canGoNext;
    leftPoints = "15 18 9 12 15 6";

    // Right = Prev
    rightId = "btn-prev-ayah";
    rightAria = "پچھلی آیت ›";
    rightText = "پچھلی آیت ›";
    rightDisabled = !canGoPrev;
    rightPoints = "9 18 15 12 9 6";
  } else {
    // Left = Prev
    leftId = "btn-prev-ayah";
    leftAria = "‹ Previous ayah";
    leftText = "‹ Previous ayah";
    leftDisabled = !canGoPrev;
    leftPoints = "15 18 9 12 15 6";

    // Right = Next
    rightId = "btn-next-ayah";
    rightAria = "Next ayah ›";
    rightText = "Next ayah ›";
    rightDisabled = !canGoNext;
    rightPoints = "9 18 15 12 9 6";
  }

  container.innerHTML = `
    <div class="screen active screen-quran-v2 meaning-${meaningMode}" dir="${isUr ? "rtl" : "ltr"}">
      
      <!-- TOP ACTION BAR (Emerald + Star Pattern) -->
      <header class="quran-header-emerald">
        <div class="header-left-group">
          <button type="button" class="btn-header-back" data-nav="surahs" aria-label="${t("surahs", state.lang)}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              ${isUr ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>'}
            </svg>
            <span>${t("surahs", state.lang)}</span>
          </button>

          <div class="header-surah-meta">
            <span class="surah-name-gold" lang="ar" dir="rtl">${surahData.nameAr}</span>
            <span class="surah-sub-info">
              ${surahData.nameEn} · ${t("surahWord", state.lang)} ${isUr ? `<span class="urdu-num">${toUrduDigits(sNum)}</span>` : sNum} · ${isUr ? `<span class="urdu-num">${toUrduDigits(totalAyahs)}</span>` : totalAyahs} ${t("ayahsWord", state.lang)}
            </span>
          </div>
        </div>

        <div class="header-right-group quran-toolbar-group">
          <!-- Reading Mode Switch (WBW / Mushaf) -->
          <div class="mode-pill-toggle mode-toggle" role="group" aria-label="Reading Mode">
            <button type="button" class="mode-pill-btn mode-btn active" data-mode="wbw">${t("readingModeWbw", state.lang)}</button>
            <button type="button" class="mode-pill-btn mode-btn" data-mode="mushaf">${t("readingModeMushaf", state.lang)}</button>
          </div>

          <!-- Meaning Toggle: [Both | اردو | English] -->
          <div class="meaning-toggle-group" role="group" aria-label="Meaning display">
            <button type="button" class="meaning-btn ${meaningMode === "both" ? "active" : ""}" data-meaning="both">${t("meaningToggleBoth", state.lang)}</button>
            <button type="button" class="meaning-btn ${meaningMode === "ur" ? "active" : ""}" data-meaning="ur">${t("meaningToggleUrdu", state.lang)}</button>
            <button type="button" class="meaning-btn ${meaningMode === "en" ? "active" : ""}" data-meaning="en">${t("meaningToggleEnglish", state.lang)}</button>
          </div>

          <!-- 5-Step Text Scaler [A− | A+] -->
          <div class="font-scaler-container" id="font-scaler-box"></div>
        </div>
      </header>

      <!-- AYAH CHIPS ROW (Horizontally scrolling, auto-centered) -->
      <nav class="ayah-chips-bar" id="ayah-chips-bar" aria-label="Ayah Navigation">
        <div class="chips-scroll-track" id="chips-scroll-track">
          ${chipsHtml}
        </div>
      </nav>

      <!-- MAIN READING CARD (Parchment, internal scroll only, page never scrolls) -->
      <main class="quran-reading-viewport">
        <div class="reading-card-container">
          <button type="button" class="nav-arrow-btn nav-arrow-left ${leftDisabled ? 'disabled' : ''}" id="${leftId}" aria-label="${leftAria}">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="${leftPoints}"/>
            </svg>
            <span class="sr-only">${leftText}</span>
          </button>

          <div class="interlinear-reading-card" id="interlinear-card">
            <div class="interlinear-flow-row" dir="rtl">
              ${wordsHtml}
              <div class="medallion-tile-end">
                ${medallionSvg}
              </div>
            </div>
          </div>

          <button type="button" class="nav-arrow-btn nav-arrow-right ${rightDisabled ? 'disabled' : ''}" id="${rightId}" aria-label="${rightAria}">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="${rightPoints}"/>
            </svg>
            <span class="sr-only">${rightText}</span>
          </button>
        </div>

        <!-- TWO SIDE-BY-SIDE FULL TRANSLATION CARDS -->
        <div class="translations-duo-grid">
          <!-- English Translation (Left, LTR) -->
          <div class="trans-duo-card trans-card-en" dir="ltr">
            <div class="trans-duo-header">
              <span class="trans-translator-tag" dir="ltr">${t("translatorEnglish", state.lang)}</span>
            </div>
            <p class="trans-body-text" dir="ltr">${enHtml}</p>
          </div>

          <!-- Urdu Translation (Right, RTL) -->
          <div class="trans-duo-card trans-card-ur" dir="rtl">
            <div class="trans-duo-header">
              <span class="trans-translator-tag" lang="ur">${t("translatorUrdu", state.lang)}</span>
            </div>
            <p class="trans-body-text" lang="ur">${urHtml}</p>
          </div>
        </div>
      </main>

      <!-- FOOTER: Centered Jump-to-Ayah Keypad Pill -->
      <footer class="quran-v2-footer">
        <button type="button" class="btn-jump-keypad-pill" id="btn-goto-keypad">
          <span>${isUr ? `آیت <span class="urdu-num">${toUrduDigits(currentAyahObj.number)}</span> / <span class="urdu-num">${toUrduDigits(totalAyahs)}</span>` : `Ayah ${currentAyahObj.number} of ${totalAyahs}`}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      </footer>
    </div>
  `;

  // Render 5-step font scaler into box
  const scalerBox = container.querySelector("#font-scaler-box");
  if (scalerBox) {
    UIComponents.renderFontScalerPills(scalerBox);
  }

  // Scroll current chip into center
  const currentChip = container.querySelector(`.ayah-chip[data-chip-ayah="${aNum}"]`);
  if (currentChip) {
    setTimeout(() => {
      currentChip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, 100);
  }

  // Navigation: Ayah chips
  container.querySelectorAll("[data-chip-ayah]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetAyah = btn.getAttribute("data-chip-ayah");
      selectedWordIndex = null;
      router.navigate(`quran/${sNum}/${targetAyah}`);
    });
  });

  // Navigation: Prev / Next with slide animation & next-surah toast
  const navigateNext = () => {
    if (aNum < totalAyahs) {
      animateAyahChange("next", () => {
        selectedWordIndex = null;
        router.navigate(`quran/${sNum}/${aNum + 1}`);
      });
    } else if (sNum < 114) {
      const nextSurahNum = sNum + 1;
      const surahsIndex = window.BASEERAH_INDEX || [];
      const nextSurahObj = surahsIndex.find((s) => s.number === nextSurahNum);
      const nextName = isUr
        ? (nextSurahObj ? `${t("surahWord", "ur")} ${nextSurahObj.nameAr}` : `${t("surahWord", "ur")} ${nextSurahNum}`)
        : (nextSurahObj ? nextSurahObj.nameEn : `Surah ${nextSurahNum}`);
      UIComponents.showToast(isUr ? `اگلی سورت: ${nextName}` : `Next: ${nextName}`);
      animateAyahChange("next", () => {
        selectedWordIndex = null;
        router.navigate(`quran/${nextSurahNum}/1`);
      });
    }
  };

  const navigatePrev = () => {
    if (aNum > 1) {
      animateAyahChange("prev", () => {
        selectedWordIndex = null;
        router.navigate(`quran/${sNum}/${aNum - 1}`);
      });
    }
  };

  const animateAyahChange = (direction, callback) => {
    const card = container.querySelector("#interlinear-card");
    if (!card) {
      callback();
      return;
    }
    const slideClass = direction === "next"
      ? (isUr ? "slide-out-left" : "slide-out-right")
      : (isUr ? "slide-out-right" : "slide-out-left");
    card.classList.add(slideClass);
    setTimeout(callback, 160);
  };

  const btnNext = container.querySelector("#btn-next-ayah");
  if (btnNext && canGoNext) {
    btnNext.addEventListener("click", () => navigateNext());
  }

  const btnPrev = container.querySelector("#btn-prev-ayah");
  if (btnPrev && canGoPrev) {
    btnPrev.addEventListener("click", () => navigatePrev());
  }

  // Keyboard Navigation: ← and →
  const handleKeydown = (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.key === "ArrowLeft") {
      if (isUr) navigateNext();
      else navigatePrev();
    } else if (e.key === "ArrowRight") {
      if (isUr) navigatePrev();
      else navigateNext();
    }
  };
  window.addEventListener("keydown", handleKeydown);
  if (window._baseerahQuranKeyCleanup) window._baseerahQuranKeyCleanup();
  window._baseerahQuranKeyCleanup = () => {
    window.removeEventListener("keydown", handleKeydown);
  };

  // Touch Swipe on Reading Card
  const readingCard = container.querySelector("#interlinear-card");
  if (readingCard) {
    let touchStartX = 0;
    let touchStartY = 0;
    readingCard.addEventListener("touchstart", (e) => {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    readingCard.addEventListener("touchend", (e) => {
      if (e.changedTouches && e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          if (dx < 0) {
            // Swiped Left
            if (isUr) navigateNext();
            else navigatePrev();
          } else {
            // Swiped Right
            if (isUr) navigatePrev();
            else navigateNext();
          }
        }
      }
    }, { passive: true });
  }

  // Back to Surahs
  container.querySelectorAll("[data-nav='surahs']").forEach((el) => {
    el.addEventListener("click", () => router.navigate("surahs"));
  });

  // Mode Toggle
  container.querySelectorAll(".mode-pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const m = btn.getAttribute("data-mode");
      state.readingMode = m;
      renderQuranScreen(container, [sNum, aNum]);
    });
  });

  // Meaning Toggle
  container.querySelectorAll(".meaning-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-meaning");
      state.meaningDisplay = mode;
      const screenEl = container.querySelector(".screen-quran-v2");
      if (screenEl) {
        screenEl.classList.remove("meaning-both", "meaning-ur", "meaning-en");
        screenEl.classList.add(`meaning-${mode}`);
      }
      container.querySelectorAll(".meaning-btn").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  // Tap Word Tile -> Highlight
  container.querySelectorAll(".wbw-interlinear-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      const idx = parseInt(tile.getAttribute("data-word-idx"), 10);
      if (selectedWordIndex === idx) {
        selectedWordIndex = null;
        tile.classList.remove("selected");
      } else {
        selectedWordIndex = idx;
        container.querySelectorAll(".wbw-interlinear-tile").forEach((t) => t.classList.toggle("selected", t === tile));
      }
    });
  });

  // Tap Footnote marker -> Bottom sheet
  container.querySelectorAll(".fn-ref-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const fnNum = btn.getAttribute("data-fn");
      const fnLang = btn.getAttribute("data-lang");
      const fnMap = fnLang === "ur" ? fnMapUr : fnMapEn;
      const fnText = fnMap[fnNum] || (fnLang === "ur" ? currentAyahObj.footnotesUr : currentAyahObj.footnotesEn);

      UIComponents.showFootnoteBottomSheet({
        footnoteNum: fnNum,
        footnoteText: fnText,
        lang: fnLang,
        surahNum: sNum,
        ayahNum: aNum
      });
    });
  });

  // Keypad jump dialog
  const keypadTrigger = container.querySelector("#btn-goto-keypad");
  if (keypadTrigger) {
    keypadTrigger.addEventListener("click", () => {
      UIComponents.showKeypadDialog({
        maxAyahs: totalAyahs,
        currentSurah: sNum,
        onJump: (s, a) => {
          selectedWordIndex = null;
          router.navigate(`quran/${s}/${a}`);
        }
      });
    });
  }
}

/**
 * Renders Mushaf Continuous Mode with v2 Styling & 8-point Medallions
 */
function renderMushafView(container, surahData, sNum, aNum, totalAyahs, isUr) {
  const ayahsHtml = surahData.ayahs.map((a) => {
    const medallion = UIComponents.getAyahMedallionSvg(a.number, 40);
    return `
      <span class="mushaf-ayah-span" data-ayah-num="${a.number}" role="button" tabindex="0">
        <span class="mushaf-ar-text" lang="ar">${a.arFull}</span>
        ${medallion}
      </span>
    `;
  }).join(" ");

  container.innerHTML = `
    <div class="screen active screen-quran-v2 screen-mushaf-v2" dir="${isUr ? "rtl" : "ltr"}">
      <header class="quran-header-emerald">
        <div class="header-left-group">
          <button type="button" class="btn-header-back" data-nav="surahs">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              ${isUr ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>'}
            </svg>
            <span>${t("surahs", state.lang)}</span>
          </button>
          <div class="header-surah-meta">
            <span class="surah-name-gold" lang="ar" dir="rtl">${surahData.nameAr}</span>
            <span class="surah-sub-info">${surahData.nameEn} · ${t("surahWord", state.lang)} ${isUr ? `<span class="urdu-num">${toUrduDigits(sNum)}</span>` : sNum}</span>
          </div>
        </div>

        <div class="header-center-group">
          <div class="mode-pill-toggle mode-toggle" role="group">
            <button type="button" class="mode-pill-btn mode-btn" data-mode="wbw">${t("readingModeWbw", state.lang)}</button>
            <button type="button" class="mode-pill-btn mode-btn active" data-mode="mushaf">${t("readingModeMushaf", state.lang)}</button>
          </div>
        </div>

        <div class="header-right-group">
          <div class="font-scaler-container" id="font-scaler-box"></div>
        </div>
      </header>

      <main class="mushaf-reading-viewport">
        <div class="mushaf-card" id="mushaf-card">
          <div class="mushaf-continuous-text mushaf-flow-text" lang="ar" dir="rtl">
            ${ayahsHtml}
          </div>
        </div>
      </main>

      <footer class="quran-v2-footer">
        <button type="button" class="btn-jump-keypad-pill" id="btn-goto-keypad" style="margin: 0 auto;">
          <span>${isUr ? `آیت پر جائیں (<span class="urdu-num">${toUrduDigits(totalAyahs)}</span> آیات)` : `Go to Ayah (${totalAyahs} ayahs)`}</span>
        </button>
      </footer>
    </div>
  `;

  const scalerBox = container.querySelector("#font-scaler-box");
  if (scalerBox) UIComponents.renderFontScalerPills(scalerBox);

  container.querySelector("[data-nav='surahs']").addEventListener("click", () => router.navigate("surahs"));
  container.querySelectorAll(".mode-pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.readingMode = btn.getAttribute("data-mode");
      renderQuranScreen(container, [sNum, aNum]);
    });
  });

  // Tap ayah in mushaf mode -> open bottom sheet
  container.querySelectorAll(".mushaf-ayah-span").forEach((span) => {
    span.addEventListener("click", () => {
      const num = parseInt(span.getAttribute("data-ayah-num"), 10);
      const targetAyah = surahData.ayahs.find((a) => a.number === num);
      if (targetAyah) {
        UIComponents.showMushafBottomSheet(targetAyah, surahData.nameAr, surahData.nameEn);
      }
    });
  });

  const keypadBtn = container.querySelector("#btn-goto-keypad");
  if (keypadBtn) {
    keypadBtn.addEventListener("click", () => {
      UIComponents.showKeypadDialog({
        maxAyahs: totalAyahs,
        currentSurah: sNum,
        onJump: (s, a) => {
          router.navigate(`quran/${s}/${a}`);
        }
      });
    });
  }
}

function showIntegrityError(container, sNum, verifyRes) {
  const isUr = state.lang === "ur";
  const actualDisplay = verifyRes.actual || "verification unavailable";
  container.innerHTML = `
    <div class="screen active screen-error screen-integrity-error" dir="${isUr ? "rtl" : "ltr"}" lang="${isUr ? "ur" : "en"}">
      <div class="error-badge">⚠</div>
      <h2>${isUr ? "ڈیٹا کی حفاظت کا انتباہ!" : "Data Integrity Verification Failed!"}</h2>
      <p class="error-desc">
        ${isUr
          ? `سورت نمبر <span class="urdu-num">${toUrduDigits(sNum)}</span> کی فائل کا ڈیجیٹل دستخط (SHA-256) تبدیل شدہ پایا گیا۔`
          : `Surah ${sNum} cryptographic checksum mismatch against the signed manifest.`}
      </p>
      <div class="error-details">
        <div><span>Expected:</span> <code>${verifyRes.expected || "N/A"}</code></div>
        <div><span>Computed:</span> <code>${actualDisplay}</code></div>
      </div>
      <p class="error-action-hint">
        ${isUr ? "قرآن پاک کی حرمت اور حفاظت کے لیے کیوسک نے اس سورت کو روک دیا ہے۔" : "To protect Quranic accuracy, this surah has been locked."}
      </p>
      <button type="button" class="btn-primary" data-nav="home">
        ${t("home", state.lang)}
      </button>
    </div>
  `;
  container.querySelector("[data-nav='home']").addEventListener("click", () => router.navigate("home"));
}
