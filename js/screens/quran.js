/* Baseerah — Quran Screen (Baseerah v2 Interlinear Word-by-Word Redesign) */
import { state } from "../core/state.js";
import { Storage } from "../core/storage.js";
import { t, toUrduDigits } from "../core/i18n.js";
import { router } from "../core/router.js";
import { UIComponents } from "../ui/components.js";
import { Integrity } from "../core/integrity.js";
import { audioManager } from "../core/audio.js";

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

  // Show branded loading indicator with skeleton tiles
  container.innerHTML = `
    <div class="screen active screen-quran-loading" dir="${isUr ? "rtl" : "ltr"}">
      <div class="branded-loader-box">
        <div class="loader-logo-pulse">
          <span class="loader-ar-logo" lang="ar">بصيرة</span>
        </div>
        <div class="loader-bar-track">
          <div class="loader-bar-fill"></div>
        </div>
        <p class="loading-text">${isUr ? "قرآنِ پاک لوڈ ہو رہا ہے..." : "Loading Quran text..."}</p>
      </div>
      <div class="skeleton-tiles-preview" aria-hidden="true">
        <div class="skeleton-tile"></div>
        <div class="skeleton-tile"></div>
        <div class="skeleton-tile"></div>
      </div>
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
  const allWords = currentAyahObj.words || [];
  const totalWordsCount = allWords.length;
  const isVeryLongAyah = totalWordsCount > 32;
  const pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(totalWordsCount / pageSize));

  if (state.wbwPage === undefined || state.wbwPage === null || state.wbwPage >= totalPages) {
    state.wbwPage = 0;
  }
  const isPaged = state.wbwPagedMode === true && isVeryLongAyah;
  const displayedWords = isPaged
    ? allWords.slice(state.wbwPage * pageSize, (state.wbwPage + 1) * pageSize)
    : allWords;
  const wordOffset = isPaged ? state.wbwPage * pageSize : 0;
  const isMorphActive = state.settings.showMorphology === true;

  const wordsHtml = displayedWords.map((w, i) => {
    const idx = wordOffset + i;
    const isSelected = selectedWordIndex === idx;
    const loc = `${sNum}:${aNum}:${idx + 1}`;
    const morph = (window.BASEERAH_MORPHOLOGY && window.BASEERAH_MORPHOLOGY[loc]) || null;

    let arHtml = w.ar;
    let legendHtml = "";

    if (isMorphActive && morph && morph.segmented) {
      const p = morph.prefix ? `<span class="morph-prefix">${morph.prefix}</span>` : "";
      const st = `<span class="morph-stem">${morph.stem}</span>`;
      const sf = morph.suffix ? `<span class="morph-suffix">${morph.suffix}</span>` : "";
      arHtml = `${p}${st}${sf}`;

      const legendText = isUr ? (morph.legend?.ur || morph.legend?.en) : (morph.legend?.en || morph.legend?.ur);
      if (legendText) {
        legendHtml = `<div class="wbw-morph-legend" dir="${isUr ? 'rtl' : 'ltr'}">${legendText}</div>`;
      }
    }

    return `
      <div class="wbw-interlinear-tile wbw-word-tile ${isSelected ? 'selected' : ''}" data-word-idx="${idx}" role="button" tabindex="0">
        <span class="tile-ar" lang="ar" dir="rtl">${arHtml}</span>
        <div class="tile-gold-divider"></div>
        <span class="tile-ur" lang="ur" dir="rtl">${w.ur || "—"}</span>
        ${legendHtml}
        <span class="tile-en" lang="en" dir="ltr">${w.en || "—"}</span>
      </div>
    `;
  }).join("");

  const medallionSvg = UIComponents.getAyahMedallionSvg(currentAyahObj.number, 52);
  const isLastPage = !isPaged || (state.wbwPage === totalPages - 1);
  const medallionHtml = isLastPage ? `
    <div class="medallion-tile-end">
      ${medallionSvg}
    </div>
  ` : "";

  const paginationBarHtml = isVeryLongAyah ? `
    <div class="wbw-pagination-bar" dir="ltr">
      ${isPaged ? `
        <button type="button" class="btn-wbw-page-step btn-wbw-page-prev ${state.wbwPage === 0 ? 'disabled' : ''}" id="btn-wbw-page-prev" aria-label="Previous words page">‹</button>
        <span class="wbw-page-indicator">${isUr ? `${t("wordsLabel", "ur")} <span class="urdu-num">${toUrduDigits(wordOffset + 1)}</span>–<span class="urdu-num">${toUrduDigits(Math.min(wordOffset + pageSize, totalWordsCount))}</span> / <span class="urdu-num">${toUrduDigits(totalWordsCount)}</span>` : `Words ${wordOffset + 1}–${Math.min(wordOffset + pageSize, totalWordsCount)} of ${totalWordsCount}`}</span>
        <button type="button" class="btn-wbw-page-step btn-wbw-page-next ${state.wbwPage >= totalPages - 1 ? 'disabled' : ''}" id="btn-wbw-page-next" aria-label="Next words page">›</button>
        <button type="button" class="btn-wbw-mode-toggle" id="btn-wbw-toggle-paged">${t("scrollMode", state.lang)}</button>
      ` : `
        <span class="wbw-page-indicator">${isUr ? `<span class="urdu-num">${toUrduDigits(totalWordsCount)}</span> ${t("wordsLabel", "ur")}` : `${totalWordsCount} Words`}</span>
        <button type="button" class="btn-wbw-mode-toggle" id="btn-wbw-toggle-paged">${t("pagedMode", state.lang)}</button>
      `}
    </div>
  ` : "";

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
          <!-- Audio Recitation Controls -->
          <div class="audio-controls-pill" role="group" aria-label="Audio Controls">
            <button type="button" class="btn-audio-play" id="btn-audio-play" aria-label="${t("playAyah", state.lang)}">
              <span class="audio-icon-play">▶</span>
              <span class="audio-play-label">${t("playAyah", state.lang)}</span>
            </button>
            <button type="button" class="btn-audio-speed" id="btn-audio-speed" aria-label="Audio Speed">1×</button>
            <button type="button" class="btn-audio-repeat" id="btn-audio-repeat" aria-label="Repeat Ayah">🔁</button>
          </div>

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

          <!-- Morphology Spike Toggle: [Colours] -->
          <button type="button" class="btn-morph-toggle ${isMorphActive ? "active" : ""}" id="btn-toggle-morphology" aria-label="${t("morphologyToggle", state.lang)}">
            <span class="morph-toggle-label">${t("morphologyToggle", state.lang)}</span>
          </button>

          <!-- 5-Step Text Scaler [A− | A+] -->
          <div class="font-scaler-container" id="font-scaler-box"></div>
        </div>

        <!-- Mobile Header Actions (Play + Overflow Settings) -->
        <div class="mobile-header-actions">
          <button type="button" class="btn-mobile-audio-play" id="btn-mobile-audio-play" aria-label="${t("playAyah", state.lang)}">▶</button>
          <button type="button" class="btn-quran-overflow" id="btn-quran-overflow" aria-label="${t("displaySettings", state.lang)}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
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
            ${paginationBarHtml}
            <div class="interlinear-flow-row" dir="rtl">
              ${wordsHtml}
              ${medallionHtml}
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
          <div class="trans-duo-card trans-card-en" lang="en" dir="ltr">
            <div class="trans-duo-header">
              <span class="trans-translator-tag translator-tag-en" lang="en" dir="ltr">${t("translatorEnglish", state.lang)}</span>
              <button type="button" class="btn-read-more-trans" data-lang="en" aria-label="Read full English translation">
                <span>${t("readFull", "en")}</span>
              </button>
            </div>
            <p class="trans-body-text trans-text-en" lang="en" dir="ltr">${enHtml}</p>
          </div>

          <!-- Urdu Translation (Right, RTL) -->
          <div class="trans-duo-card trans-card-ur" lang="ur" dir="rtl">
            <div class="trans-duo-header">
              <span class="trans-translator-tag translator-tag-ur" lang="ur" dir="rtl">${t("translatorUrdu", state.lang)}</span>
              <button type="button" class="btn-read-more-trans" data-lang="ur" aria-label="${t("readFull", state.lang)}">
                <span lang="ur" dir="rtl">${t("readFull", "ur")}</span>
              </button>
            </div>
            <p class="trans-body-text trans-text-ur" lang="ur" dir="rtl">${urHtml}</p>
          </div>
        </div>
      </main>

      <!-- FOOTER: Responsive Navigation Bar (Fixed on mobile with arrows, centered keypad on desktop) -->
      <footer class="quran-v2-footer">
        <div class="footer-nav-bar" dir="${isUr ? 'rtl' : 'ltr'}">
          <button type="button" class="footer-nav-btn footer-nav-prev ${!canGoPrev ? 'disabled' : ''}" id="footer-btn-prev" aria-label="${isUr ? 'پچھلی آیت ›' : '‹ Previous ayah'}">
            ${isUr ? '<span>پچھلی آیت</span> <span class="arrow-char">›</span>' : '<span class="arrow-char">‹</span> <span>Previous ayah</span>'}
          </button>

          <button type="button" class="btn-jump-keypad-pill" id="btn-goto-keypad" aria-label="${t("gotoAyah", state.lang)}">
            <span>${isUr ? `آیت <span class="urdu-num">${toUrduDigits(currentAyahObj.number)}</span> / <span class="urdu-num">${toUrduDigits(totalAyahs)}</span>` : `Ayah ${currentAyahObj.number} of ${totalAyahs}`}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>

          <button type="button" class="footer-nav-btn footer-nav-next ${!canGoNext ? 'disabled' : ''}" id="footer-btn-next" aria-label="${isUr ? '‹ اگلی آیت' : 'Next ayah ›'}">
            ${isUr ? '<span class="arrow-char">‹</span> <span>اگلی آیت</span>' : '<span>Next ayah</span> <span class="arrow-char">›</span>'}
          </button>
        </div>
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
            navigateNext();
          } else {
            // Swiped Right
            navigatePrev();
          }
        }
      }
    }, { passive: true });
  }

  // Scroll fade updater for reading card
  const cardEl = container.querySelector("#interlinear-card");
  if (cardEl) {
    const updateCardFade = () => {
      const hasMore = cardEl.scrollHeight > (cardEl.clientHeight + 8) && (cardEl.scrollTop + cardEl.clientHeight < cardEl.scrollHeight - 12);
      cardEl.classList.toggle("has-scroll-fade", hasMore);
    };
    cardEl.addEventListener("scroll", updateCardFade, { passive: true });
    setTimeout(updateCardFade, 80);
  }

  // Translation card expand buttons
  container.querySelectorAll(".btn-read-more-trans").forEach((btn) => {
    btn.addEventListener("click", () => {
      const l = btn.getAttribute("data-lang");
      const title = l === "ur" ? t("translationUrdu", state.lang) : t("translationEnglish", state.lang);
      const text = l === "ur" ? currentAyahObj.ur : currentAyahObj.en;
      UIComponents.showTranslationBottomSheet({
        title,
        text,
        lang: l,
        surahNum: sNum,
        ayahNum: aNum
      });
    });
  });

  // Long ayah pagination controls
  const pagedToggle = container.querySelector("#btn-wbw-toggle-paged");
  if (pagedToggle) {
    pagedToggle.addEventListener("click", () => {
      state.wbwPagedMode = !state.wbwPagedMode;
      state.wbwPage = 0;
      renderQuranScreen(container, [sNum, aNum]);
    });
  }

  const pagedPrev = container.querySelector("#btn-wbw-page-prev");
  if (pagedPrev) {
    pagedPrev.addEventListener("click", () => {
      if (state.wbwPage > 0) {
        state.wbwPage -= 1;
        renderQuranScreen(container, [sNum, aNum]);
      }
    });
  }

  const pagedNext = container.querySelector("#btn-wbw-page-next");
  if (pagedNext) {
    pagedNext.addEventListener("click", () => {
      if (state.wbwPage < totalPages - 1) {
        state.wbwPage += 1;
        renderQuranScreen(container, [sNum, aNum]);
      }
    });
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

  // Tap Word Tile -> Highlight and play word pronunciation!
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

      // Play authentic single word pronunciation audio
      const wordRes = audioManager.playWord(sNum, aNum, idx);
      if (wordRes && !wordRes.played && wordRes.reason === "mosque_mute_active") {
        UIComponents.showToast(isUr ? wordRes.messageUr : wordRes.messageEn);
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

  // Mobile Footer Navigation (‹ Agli Ayah / Pichli Ayah ›)
  const footerPrev = container.querySelector("#footer-btn-prev");
  if (footerPrev) {
    footerPrev.addEventListener("click", () => {
      if (canGoPrev) {
        selectedWordIndex = null;
        router.navigate(`quran/${sNum}/${aNum - 1}`);
      }
    });
  }

  const footerNext = container.querySelector("#footer-btn-next");
  if (footerNext) {
    footerNext.addEventListener("click", () => {
      if (canGoNext) {
        selectedWordIndex = null;
        if (aNum < totalAyahs) router.navigate(`quran/${sNum}/${aNum + 1}`);
        else if (sNum < 114) router.navigate(`quran/${sNum + 1}/1`);
      }
    });
  }

  // Mobile Overflow "⋯" Settings Sheet
  const overflowBtn = container.querySelector("#btn-quran-overflow");
  if (overflowBtn) {
    overflowBtn.addEventListener("click", () => {
      UIComponents.showQuranSettingsBottomSheet({
        onChange: () => {
          renderQuranScreen(container, [sNum, aNum]);
        }
      });
    });
  }

  // Wire Morphology Colors Toggle
  const morphToggleBtn = container.querySelector("#btn-toggle-morphology");
  if (morphToggleBtn) {
    morphToggleBtn.addEventListener("click", () => {
      state.settings.showMorphology = !state.settings.showMorphology;
      Storage.saveSettings(state.settings);
      renderQuranScreen(container, [sNum, aNum]);
    });
  }

  // Wire Audio Recitation Controls
  const playBtns = container.querySelectorAll("#btn-audio-play, #btn-mobile-audio-play");
  const speedBtn = container.querySelector("#btn-audio-speed");
  const repeatBtn = container.querySelector("#btn-audio-repeat");

  const updatePlayUI = (isPlaying) => {
    playBtns.forEach((btn) => {
      btn.classList.toggle("playing", isPlaying);
      const icon = btn.querySelector(".audio-icon-play");
      const label = btn.querySelector(".audio-play-label");
      if (icon) icon.textContent = isPlaying ? "⏸" : "▶";
      else if (btn.id === "btn-mobile-audio-play") btn.textContent = isPlaying ? "⏸" : "▶";
      if (label) label.textContent = isPlaying ? t("pauseAyah", state.lang) : t("playAyah", state.lang);
    });
  };

  playBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (audioManager.isMuted()) {
        UIComponents.showToast(t("mosqueMutedNotice", state.lang));
        return;
      }

      audioManager.togglePlay(sNum, aNum, {
        words: currentAyahObj.words || [],
        onWordHighlight: (idx) => {
          container.querySelectorAll(".wbw-interlinear-tile").forEach((tile) => {
            const tIdx = parseInt(tile.getAttribute("data-word-idx"), 10);
            const isActive = tIdx === idx;
            tile.classList.toggle("audio-active-word", isActive);
          });
        },
        onStateChange: ({ isPlaying }) => {
          updatePlayUI(isPlaying);
        },
        onEnded: () => {
          updatePlayUI(false);
          if (audioManager.isAutoPlay() && !audioManager.isRepeat()) {
            if (aNum < totalAyahs) {
              router.navigate(`quran/${sNum}/${aNum + 1}`);
            }
          }
        }
      });
    });
  });

  if (speedBtn) {
    speedBtn.addEventListener("click", () => {
      const curRate = audioManager.getPlaybackRate();
      const newRate = curRate === 1.0 ? 0.75 : 1.0;
      audioManager.setPlaybackRate(newRate);
      speedBtn.textContent = `${newRate}×`;
    });
  }

  if (repeatBtn) {
    repeatBtn.addEventListener("click", () => {
      const isRep = !audioManager.isRepeat();
      audioManager.setRepeat(isRep);
      repeatBtn.classList.toggle("active", isRep);
    });
  }
}

/**
 * Renders Mushaf Continuous Mode with v2 Styling & 8-point Medallions
 */
function renderMushafView(container, surahData, sNum, aNum, totalAyahs, isUr) {
  const showTranslation = state.mushafShowTranslation;
  const meaningMode = state.meaningDisplay; // "both" | "ur" | "en"

  const cleanArabic = (rawAr) => {
    if (!rawAr) return "";
    return rawAr.replace(/[\s\uf500-\uf65d\u0660-\u0669\u06dd\u06de\u06df\u25cb\u25ef\ufd3e\ufd3f\u061e]+$/, "").trim();
  };

  const ayahsHtml = surahData.ayahs.map((a) => {
    const fnMapUr = parseFootnotesMap(a.footnotesUr);
    const fnMapEn = parseFootnotesMap(a.footnotesEn);
    const renderTransWithFootnotes = (rawText, lang) => {
      if (!rawText) return "—";
      return rawText.replace(/\[(\d+)\]/g, (match, p1) => {
        return `<button type="button" class="fn-ref-btn" data-fn="${p1}" data-lang="${lang}" data-ayah="${a.number}" aria-label="Footnote ${p1}"><sup>[${p1}]</sup></button>`;
      });
    };
    const urHtml = renderTransWithFootnotes(a.ur, "ur");
    const enHtml = renderTransWithFootnotes(a.en, "en");
    const medallion = UIComponents.getAyahMedallionSvg(a.number, 36);

    return `
      <div class="mushaf-ayah-block mushaf-ayah-span" data-ayah-num="${a.number}" id="mushaf-ayah-${a.number}">
        <div class="mushaf-ayah-arabic-row" lang="ar" dir="rtl" role="button" tabindex="0" aria-label="${t("readingModeWbw", state.lang)}">
          <span class="mushaf-ar-text">${cleanArabic(a.arFull)}</span>
          <span class="mushaf-medallion-box"><button type="button" class="btn-mushaf-play" data-play-ayah="${a.number}" aria-label="Play Ayah ${a.number}">▶</button>${medallion}</span>
        </div>
        ${showTranslation ? `
          <div class="mushaf-ayah-translation-card">
            ${(meaningMode === "both" || meaningMode === "ur") && a.ur ? `
              <div class="mushaf-trans-ur" lang="ur" dir="rtl">${urHtml}</div>
            ` : ""}
            ${(meaningMode === "both" || meaningMode === "en") && a.en ? `
              <div class="mushaf-trans-en" lang="en" dir="ltr">${enHtml}</div>
            ` : ""}
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  // Surah Header Banner
  const bismillahHtml = (sNum !== 9 && sNum !== 1) ? `
    <div class="mushaf-bismillah-box">
      <p class="bismillah mushaf-bismillah" lang="ar" dir="rtl">${window.BASEERAH_BISMILLAH || ""}</p>
    </div>
  ` : "";

  const translatorBarHtml = showTranslation ? `
    <div class="mushaf-translator-bar">
      <span class="mushaf-translator-tag translator-tag-ur" lang="ur" dir="rtl">${t("translatorUrdu", state.lang)}</span>
      <span class="mushaf-translator-sep"> · </span>
      <span class="mushaf-translator-tag translator-tag-en" lang="en" dir="ltr">${t("translatorEnglish", state.lang)}</span>
    </div>
  ` : "";

  container.innerHTML = `
    <div class="screen active screen-quran-v2 screen-mushaf-v2 meaning-${meaningMode}" dir="${isUr ? "rtl" : "ltr"}">
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
            <span class="surah-sub-info">${surahData.nameEn} · ${t("surahWord", state.lang)} ${isUr ? `<span class="urdu-num">${toUrduDigits(sNum)}</span>` : sNum} · ${isUr ? `<span class="urdu-num">${toUrduDigits(totalAyahs)}</span>` : totalAyahs} ${t("ayahsWord", state.lang)}</span>
          </div>
        </div>

        <div class="header-right-group quran-toolbar-group">
          <!-- Audio Recitation Controls -->
          <div class="audio-controls-pill" role="group" aria-label="Audio Controls">
            <button type="button" class="btn-audio-play" id="btn-audio-play" aria-label="${t("playAyah", state.lang)}">
              <span class="audio-icon-play">▶</span>
              <span class="audio-play-label">${t("playAyah", state.lang)}</span>
            </button>
            <button type="button" class="btn-audio-speed" id="btn-audio-speed" aria-label="Audio Speed">1×</button>
            <button type="button" class="btn-audio-repeat" id="btn-audio-repeat" aria-label="Repeat Ayah">🔁</button>
          </div>

          <!-- Reading Mode Switch (WBW / Mushaf) -->
          <div class="mode-pill-toggle mode-toggle" role="group" aria-label="Reading Mode">
            <button type="button" class="mode-pill-btn mode-btn" data-mode="wbw">${t("readingModeWbw", state.lang)}</button>
            <button type="button" class="mode-pill-btn mode-btn active" data-mode="mushaf">${t("readingModeMushaf", state.lang)}</button>
          </div>

          <!-- Translation Toggle (Show translation on/off) -->
          <button type="button" class="mushaf-toggle-trans-btn ${showTranslation ? 'active' : ''}" id="btn-toggle-mushaf-trans" aria-pressed="${showTranslation}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>${showTranslation ? t("hideTranslation", state.lang) : t("showTranslation", state.lang)}</span>
          </button>

          <!-- Meaning Toggle: [Both | اردو | English] (Visible when showTranslation is true) -->
          ${showTranslation ? `
            <div class="meaning-toggle-group" role="group" aria-label="Meaning display">
              <button type="button" class="meaning-btn ${meaningMode === "both" ? "active" : ""}" data-meaning="both">${t("meaningToggleBoth", state.lang)}</button>
              <button type="button" class="meaning-btn ${meaningMode === "ur" ? "active" : ""}" data-meaning="ur">${t("meaningToggleUrdu", state.lang)}</button>
              <button type="button" class="meaning-btn ${meaningMode === "en" ? "active" : ""}" data-meaning="en">${t("meaningToggleEnglish", state.lang)}</button>
            </div>
          ` : ""}

          <!-- 5-Step Text Scaler [A− | A+] -->
          <div class="font-scaler-container" id="font-scaler-box"></div>
        </div>

        <!-- Mobile Header Actions (Play + Overflow Settings) -->
        <div class="mobile-header-actions">
          <button type="button" class="btn-mobile-audio-play" id="btn-mobile-audio-play" aria-label="${t("playAyah", state.lang)}">▶</button>
          <button type="button" class="btn-quran-overflow" id="btn-quran-overflow" aria-label="${t("displaySettings", state.lang)}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>
      </header>

      <main class="mushaf-reading-viewport">
        <div class="mushaf-column" id="mushaf-column">
          <!-- Surah Header Banner -->
          <div class="mushaf-surah-banner">
            <div class="mushaf-banner-inner">
              <h2 class="mushaf-banner-ar" lang="ar" dir="rtl">${surahData.nameAr}</h2>
              <div class="mushaf-banner-meta">
                <span class="banner-en">${surahData.nameEn}</span>
                <span class="banner-bullet">·</span>
                <span>${isUr ? `<span class="urdu-num">${toUrduDigits(totalAyahs)}</span> آیات` : `${totalAyahs} Ayahs`}</span>
              </div>
            </div>
          </div>

          ${bismillahHtml}
          ${translatorBarHtml}

          <div class="mushaf-ayahs-container mushaf-flow-text">
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

  // Translation visibility toggle
  const transToggleBtn = container.querySelector("#btn-toggle-mushaf-trans");
  if (transToggleBtn) {
    transToggleBtn.addEventListener("click", () => {
      state.mushafShowTranslation = !state.mushafShowTranslation;
      renderQuranScreen(container, [sNum, aNum]);
    });
  }

  // Meaning toggle
  container.querySelectorAll(".meaning-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.meaningDisplay = btn.getAttribute("data-meaning");
      renderQuranScreen(container, [sNum, aNum]);
    });
  });

  // Tap ayah in mushaf mode -> soft gold highlight, then open word-by-word view
  container.querySelectorAll(".mushaf-ayah-arabic-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".fn-ref-btn")) return;
      const block = row.closest(".mushaf-ayah-block");
      const num = parseInt(block.getAttribute("data-ayah-num"), 10);
      block.classList.add("active-highlight");
      setTimeout(() => {
        state.readingMode = "wbw";
        router.navigate(`quran/${sNum}/${num}`);
      }, 140);
    });
  });

  // Footnote tap -> open bottom sheet
  container.querySelectorAll(".fn-ref-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const fnNum = btn.getAttribute("data-fn");
      const fnLang = btn.getAttribute("data-lang");
      const ayahNum = parseInt(btn.getAttribute("data-ayah"), 10) || aNum;
      const targetAyah = surahData.ayahs.find((a) => a.number === ayahNum) || surahData.ayahs[0];
      const fnMap = fnLang === "ur" ? parseFootnotesMap(targetAyah.footnotesUr) : parseFootnotesMap(targetAyah.footnotesEn);
      const fnText = fnMap[fnNum] || (fnLang === "ur" ? targetAyah.footnotesUr : targetAyah.footnotesEn);

      UIComponents.showFootnoteBottomSheet({
        footnoteNum: fnNum,
        footnoteText: fnText,
        lang: fnLang,
        surahNum: sNum,
        ayahNum: ayahNum
      });
    });
  });

  const keypadBtn = container.querySelector("#btn-goto-keypad");
  if (keypadBtn) {
    keypadBtn.addEventListener("click", () => {
      UIComponents.showKeypadDialog({
        maxAyahs: totalAyahs,
        currentSurah: sNum,
        onJump: (s, a) => {
          const targetEl = container.querySelector(`#mushaf-ayah-${a}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
            targetEl.classList.add("active-highlight");
            setTimeout(() => targetEl.classList.remove("active-highlight"), 1200);
          } else {
            router.navigate(`quran/${s}/${a}`);
          }
        }
      });
    });
  }

  const mushafOverflow = container.querySelector("#btn-quran-overflow");
  if (mushafOverflow) {
    mushafOverflow.addEventListener("click", () => {
      UIComponents.showQuranSettingsBottomSheet({
        onChange: () => {
          renderQuranScreen(container, [sNum, aNum]);
        }
      });
    });
  }

  // Wire Morphology Colors Toggle
  const morphToggleBtn = container.querySelector("#btn-toggle-morphology");
  if (morphToggleBtn) {
    morphToggleBtn.addEventListener("click", () => {
      state.settings.showMorphology = !state.settings.showMorphology;
      Storage.saveSettings(state.settings);
      renderQuranScreen(container, [sNum, aNum]);
    });
  }

  // Wire Mushaf Individual Ayah Play Buttons
  container.querySelectorAll(".btn-mushaf-play").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const ayahToPlay = parseInt(btn.getAttribute("data-play-ayah"), 10);
      if (audioManager.isMuted()) {
        UIComponents.showToast(t("mosqueMutedNotice", state.lang));
        return;
      }

      const ayahBlock = container.querySelector(`#mushaf-ayah-${ayahToPlay}`);
      const isAlreadyPlaying = btn.classList.contains("playing");

      if (isAlreadyPlaying) {
        audioManager.pause();
        btn.textContent = "▶";
        btn.classList.remove("playing");
        if (ayahBlock) ayahBlock.classList.remove("audio-active-block");
        return;
      }

      container.querySelectorAll(".mushaf-ayah-block").forEach((b) => b.classList.remove("audio-active-block"));
      container.querySelectorAll(".btn-mushaf-play").forEach((b) => {
        b.textContent = "▶";
        b.classList.remove("playing");
      });

      if (ayahBlock) ayahBlock.classList.add("audio-active-block");
      btn.textContent = "⏸";
      btn.classList.add("playing");

      audioManager.playAyah(sNum, ayahToPlay, {
        onEnded: () => {
          btn.textContent = "▶";
          btn.classList.remove("playing");
          if (ayahBlock) ayahBlock.classList.remove("audio-active-block");
        },
        onStateChange: ({ isPlaying }) => {
          if (!isPlaying) {
            btn.textContent = "▶";
            btn.classList.remove("playing");
            if (ayahBlock) ayahBlock.classList.remove("audio-active-block");
          }
        }
      });
    });
  });

  // Wire Mushaf Header Audio Play/Pause Buttons
  const mushafPlayBtns = container.querySelectorAll("#btn-audio-play, #btn-mobile-audio-play");
  const mushafSpeedBtn = container.querySelector("#btn-audio-speed");
  const mushafRepeatBtn = container.querySelector("#btn-audio-repeat");

  mushafPlayBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (audioManager.isMuted()) {
        UIComponents.showToast(t("mosqueMutedNotice", state.lang));
        return;
      }
      audioManager.togglePlay(sNum, aNum, {
        onStateChange: ({ isPlaying }) => {
          mushafPlayBtns.forEach((b) => {
            b.classList.toggle("playing", isPlaying);
            const icon = b.querySelector(".audio-icon-play");
            if (icon) icon.textContent = isPlaying ? "⏸" : "▶";
            else if (b.id === "btn-mobile-audio-play") b.textContent = isPlaying ? "⏸" : "▶";
          });
        }
      });
    });
  });

  if (mushafSpeedBtn) {
    mushafSpeedBtn.addEventListener("click", () => {
      const curRate = audioManager.getPlaybackRate();
      const newRate = curRate === 1.0 ? 0.75 : 1.0;
      audioManager.setPlaybackRate(newRate);
      mushafSpeedBtn.textContent = `${newRate}×`;
    });
  }

  if (mushafRepeatBtn) {
    mushafRepeatBtn.addEventListener("click", () => {
      const isRep = !audioManager.isRepeat();
      audioManager.setRepeat(isRep);
      mushafRepeatBtn.classList.toggle("active", isRep);
    });
  }

  // Scroll to current ayah on entering/switching to mushaf view
  setTimeout(() => {
    const viewport = container.querySelector(".mushaf-reading-viewport");
    if (aNum === 1) {
      if (viewport) viewport.scrollTop = 0;
      else window.scrollTo(0, 0);
    } else {
      const targetAyahEl = container.querySelector(`#mushaf-ayah-${aNum}`);
      if (targetAyahEl) {
        targetAyahEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, 60);
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
