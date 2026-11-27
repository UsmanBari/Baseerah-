/* Baseerah — Quran Screen (Baseerah v2 Interlinear Word-by-Word Redesign) */
import { state } from "../core/state.js";
import { Storage } from "../core/storage.js";
import { t, toUrduDigits } from "../core/i18n.js";
import { router } from "../core/router.js";
import { showShareSheet } from "../ui/share.js";
import { ReadingTracker } from "../core/reading-tracker.js";
import { Icons } from "../ui/icons.js";
import { UIComponents } from "../ui/components.js";
import { Integrity } from "../core/integrity.js";
import { audioManager } from "../core/audio.js";
import { OfflineAudio } from "../core/offline-audio.js";
import { wakeLockManager } from "../core/wake-lock.js";
import { renderArabicWordHtml, layoutUnderlineBars, getMorphology } from "../core/morphology.js";

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

function cleanArabic(rawAr) {
  if (!rawAr) return "";
  return rawAr.replace(/[\s\uf500-\uf65d\u0660-\u0669\u06dd\u06de\u06df\u25cb\u25ef\ufd3e\ufd3f\u061e]+$/, "").trim();
}

/**
 * Mushaf reading progress: an ayah that stays mostly on screen for 1.2 s
 * counts as read, and the furthest one becomes the "continue reading" spot.
 */
function trackMushafReading(container, sNum, surahData) {
  if (typeof IntersectionObserver === "undefined") return;
  const timers = new Map();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const n = parseInt(e.target.getAttribute("data-ayah-num"), 10);
      if (e.isIntersecting && e.intersectionRatio >= 0.55) {
        if (!timers.has(n)) {
          timers.set(n, setTimeout(() => {
            timers.delete(n);
            if (!document.body.contains(e.target)) return;
            ReadingTracker.markRead(sNum, n);
            Storage.saveLastRead(sNum, n, surahData.nameAr, surahData.nameEn);
          }, 1200));
        }
      } else if (timers.has(n)) {
        clearTimeout(timers.get(n));
        timers.delete(n);
      }
    }
  }, { threshold: [0, 0.55, 1] });
  container.querySelectorAll(".mushaf-ayah-block").forEach((b) => io.observe(b));
  // Stop observing when the reader is replaced
  const stop = () => { io.disconnect(); timers.forEach((t) => clearTimeout(t)); window.removeEventListener("hashchange", stop); };
  window.addEventListener("hashchange", stop);
}

/**
 * Focus reading: scrolling down tucks the top bar away to give the Quran
 * more room; scrolling up (or reaching the top) brings it straight back.
 */
function enableFocusReading(container) {
  const header = container.querySelector(".screen-quran-v2 > .quran-header-emerald");
  const modeSwitch = container.querySelector(".screen-quran-v2 > .phone-mode-switch");
  if (!header || state.isKiosk) return;
  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const dy = y - lastY;
    if (y < 80 || dy < -6) header.classList.remove("is-tucked");
    else if (dy > 6) header.classList.add("is-tucked");
    if (Math.abs(dy) > 6) lastY = y;
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  const stop = () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("hashchange", stop); };
  window.addEventListener("hashchange", stop);
  if (modeSwitch) modeSwitch.classList.add("scrolls-away");
}

/**
 * Mushaf text as tappable words. The words joined with spaces rebuild the
 * displayed ayah exactly (checked for all 6,236 ayahs), so the look is
 * unchanged; anything after the last word (pause/end marks) is kept as is.
 */
function mushafWordsHtml(a, tajweed, sNum = 0, morphOn = false) {
  const full = cleanArabic(a.arFull);
  const words = Array.isArray(a.words) ? a.words : [];
  const joined = words.map((w) => w.ar).join(" ");
  if (!words.length || !full.startsWith(joined)) {
    return tajweed ? (a.arTajweed || full) : full;
  }
  const tail = full.slice(joined.length);
  const spans = words.map((w, i) =>
    `<span class="mw" data-w="${i}">${tajweed && w.arTajweed
      ? w.arTajweed
      : (morphOn ? renderArabicWordHtml(w.ar, getMorphology(`${sNum}:${a.number}:${i + 1}`, w), true, "tint") : w.ar)}</span>`
  ).join(" ");
  return spans + tail;
}

function fallbackCopyText(text, onSuccess) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    if (onSuccess) onSuccess();
  } catch (err) {
    console.warn("Copy failed:", err);
  }
  document.body.removeChild(ta);
}

function wireAyahActions(container, surahData, sNum, isUr) {
  // Bookmark button
  container.querySelectorAll(".btn-ayah-bookmark").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const s = Number(btn.getAttribute("data-bookmark-surah"));
      const a = Number(btn.getAttribute("data-bookmark-ayah"));
      const isBMed = Storage.isBookmarked(s, a);
      if (isBMed) {
        Storage.removeBookmark(s, a);
        btn.classList.remove("active");
        const svg = btn.querySelector("svg");
        if (svg) svg.setAttribute("fill", "none");
        UIComponents.showToast(t("removeBookmark", state.lang));
      } else {
        const ayahObj = surahData.ayahs.find(item => item.number === a);
        const preview = ayahObj ? cleanArabic(ayahObj.arFull || "") : "";
        Storage.addBookmark(s, a, surahData.nameAr, surahData.nameEn, preview);
        btn.classList.add("active");
        const svg = btn.querySelector("svg");
        if (svg) svg.setAttribute("fill", "currentColor");
        UIComponents.showToast(t("bookmarkAyah", state.lang));
      }
    });
  });

  // Share button: image / link / QR (kiosk: QR to continue on phone)
  container.querySelectorAll(".btn-ayah-share").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const [s, a] = btn.getAttribute("data-share-ayah").split(":").map(Number);
      const ayahObj = surahData.ayahs.find((item) => item.number === a);
      if (!ayahObj) return;
      showShareSheet({
        surahNum: s, ayahNum: a,
        ar: (ayahObj.words || []).map((w) => w.ar).join(" ") || cleanArabic(ayahObj.arFull || ""),
        ur: ayahObj.ur, en: ayahObj.en,
        surahNameEn: surahData.nameEn, surahNameAr: surahData.nameAr
      });
    });
  });

  // Copy button
  container.querySelectorAll(".btn-ayah-copy").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const ref = btn.getAttribute("data-copy-ayah");
      const [s, a] = ref.split(":").map(Number);
      const ayahObj = surahData.ayahs.find(item => item.number === a);
      if (!ayahObj) return;

      const cleanAr = cleanArabic(ayahObj.arFull || "");
      const cleanUr = (ayahObj.ur || "").replace(/\[\d+\]/g, "").trim();
      const cleanEn = (ayahObj.en || "").replace(/\[\d+\]/g, "").trim();

      const copyText = `${cleanAr}\n\n[اردو] ${cleanUr}\n\n[English] ${cleanEn}\n\n— Quran ${s}:${a}`;
      const showCopiedToast = () => UIComponents.showToast(t("copiedToClipboard", state.lang));

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(copyText).then(showCopiedToast).catch(() => {
          fallbackCopyText(copyText, showCopiedToast);
        });
      } else {
        fallbackCopyText(copyText, showCopiedToast);
      }
    });
  });

  // Bookmarks modal button
  const bmBtn = container.querySelector("#btn-header-bookmarks") || container.querySelector("#btn-mushaf-header-bookmarks");
  if (bmBtn) {
    bmBtn.addEventListener("click", () => {
      UIComponents.showBookmarksModal((s, a) => {
        router.navigate(`quran/${s}/${a}`);
      });
    });
  }

  // Memorized toggle button
  container.querySelectorAll(".btn-memorized-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const s = Number(btn.getAttribute("data-memorized-surah"));
      const a = Number(btn.getAttribute("data-memorized-ayah"));
      const isNowMem = Storage.toggleMemorized(s, a);
      btn.classList.toggle("active", isNowMem);
      const span = btn.querySelector("span:first-child");
      if (span) span.innerHTML = isNowMem ? Icons.check(14) : Icons.circle(14);
      UIComponents.showToast(isNowMem ? t("memorized", state.lang) : t("hifzMode", state.lang));
    });
  });

  // Hifz mode toggle button
  const hifzBtn = container.querySelector("#btn-toggle-hifz") || container.querySelector("#btn-toggle-mushaf-hifz");
  if (hifzBtn) {
    hifzBtn.addEventListener("click", () => {
      state.settings.hifzMode = !state.settings.hifzMode;
      Storage.saveSettings(state.settings);
      renderQuranScreen(container, [sNum, aNum]);
    });
  }

  // WBW flow-row tap to reveal in Hifz mode
  const flowRow = container.querySelector("#wbw-flow-row");
  if (flowRow && state.settings.hifzMode) {
    flowRow.addEventListener("click", () => {
      flowRow.classList.toggle("revealed");
      const hint = container.querySelector("#wbw-hifz-hint");
      if (hint) hint.style.display = flowRow.classList.contains("revealed") ? "none" : "block";
    });
  }
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
      // Word parts + roots (Tarteel QUL). Optional: the app works without it.
      try {
        const mr = await fetch(`data/morph/${padded}.json`);
        if (mr.ok) {
          const morph = await mr.json();
          surahData.ayahs.forEach((a) => (a.words || []).forEach((w, i) => {
            const m = morph[`${a.number}:${i + 1}`];
            if (m) { w.sp = [m[0], m[1]]; if (m[2]) w.rt = m[2]; } else { w.sp = null; }
          }));
        }
      } catch (e) { /* offline without cache: fall back to rules */ }
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
  const curReciter = audioManager.getCurrentReciter();
  const isAudioDownloaded = !state.isKiosk && OfflineAudio.isSurahDownloaded(sNum, curReciter.id);
  const isFirstAyah = aNum <= 1;
  const isLastAyah = aNum >= totalAyahs;

  Storage.saveLastRead(sNum, aNum, surahData.nameAr, surahData.nameEn);
  // Word-by-word: count the ayah as read once it has been on screen for a moment
  setTimeout(() => {
    if (location.hash.replace(/^#/, "").startsWith(`quran/${sNum}/${aNum}`) || (location.hash === `#quran/${sNum}` && aNum === 1)) {
      ReadingTracker.markRead(sNum, aNum);
    }
  }, 1500);

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
  const morphStyle = state.settings.morphologyStyle || "underline";
  const isTajweedActive = state.settings.showTajweed === true;
  const isHifzActive = state.settings.hifzMode === true;
  const isMem = Storage.isMemorized(sNum, aNum);

  const sajdaInfo = (window.BASEERAH_METADATA && window.BASEERAH_METADATA.sajdaByAyah)
    ? window.BASEERAH_METADATA.sajdaByAyah[`${sNum}:${aNum}`]
    : null;
  const sajdaHtml = sajdaInfo ? `
    <span class="sajda-indicator-badge" title="${isUr ? `سجدہ تلاوت (${sajdaInfo.typeUr})` : `Sajdah (${sajdaInfo.typeEn})`}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path d="M12 3c2.5 2 4 4 4 6.5H8C8 7 9.5 5 12 3z"/>
        <path d="M6 21V11h12v10"/>
        <path d="M10 21v-4a2 2 0 0 1 4 0v4"/>
        <path d="M3 21h18"/>
      </svg>
      <span>${isUr ? `سجدہ تلاوت (${sajdaInfo.typeUr})` : `Sajdah (${sajdaInfo.typeEn})`}</span>
    </span>
  ` : "";
  const isBookmarked = Storage.isBookmarked(sNum, aNum);

  const wordsHtml = displayedWords.map((w, i) => {
    const idx = wordOffset + i;
    const isSelected = selectedWordIndex === idx;
    const loc = `${sNum}:${aNum}:${idx + 1}`;
    const morph = isMorphActive ? getMorphology(loc, w) : null;

    let arHtml = isTajweedActive ? (w.arTajweed || w.ar) : renderArabicWordHtml(w.ar, morph, isMorphActive, morphStyle);
    let legendHtml = "";

    if (isMorphActive && !isTajweedActive && morph && morph.segmented) {
      const legendText = isUr ? (morph.legend?.ur || morph.legend?.en) : (morph.legend?.en || morph.legend?.ur);
      if (legendText) {
        legendHtml = `<div class="wbw-morph-legend" dir="${isUr ? 'rtl' : 'ltr'}">${legendText}</div>`;
      }
    }

    return `
      <div class="wbw-interlinear-tile wbw-word-tile ${isSelected ? 'selected' : ''} ${isTajweedActive ? 'tajweed-active' : ''}" data-word-idx="${idx}" role="button" tabindex="0">
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
        <button type="button" class="btn-wbw-page-step btn-wbw-page-prev ${state.wbwPage === 0 ? 'disabled' : ''}" id="btn-wbw-page-prev" aria-label="Previous words page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="wbw-page-indicator">${isUr ? `${t("wordsLabel", "ur")} <span class="urdu-num">${toUrduDigits(wordOffset + 1)}</span>–<span class="urdu-num">${toUrduDigits(Math.min(wordOffset + pageSize, totalWordsCount))}</span> / <span class="urdu-num">${toUrduDigits(totalWordsCount)}</span>` : `Words ${wordOffset + 1}–${Math.min(wordOffset + pageSize, totalWordsCount)} of ${totalWordsCount}`}</span>
        <button type="button" class="btn-wbw-page-step btn-wbw-page-next ${state.wbwPage >= totalPages - 1 ? 'disabled' : ''}" id="btn-wbw-page-next" aria-label="Next words page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
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
      <button type="button" class="ayah-chip ${chipStatus}" data-chip-ayah="${a.number}" aria-label="${isUr ? `آیت ${toUrduDigits(a.number)}` : `Ayah ${a.number}`}">
        ${isUr ? `<bdi class="urdu-num">${toUrduDigits(a.number)}</bdi>` : a.number}
      </button>
    `;
  }).join("");

  const canGoNext = (aNum < totalAyahs) || (sNum < 114);
  const canGoPrev = aNum > 1;

  let leftId, leftAria, leftText, leftDisabled, leftPoints;
  let rightId, rightAria, rightText, rightDisabled, rightPoints;

  // The Quran reads right-to-left, so "next ayah" always sits on the LEFT
  // (pointing left) and "previous" on the right — in every UI language.
  if (true) {
    // Left = Next
    leftId = "btn-next-ayah";
    leftAria = isUr ? "اگلی آیت" : "Next ayah";
    leftText = isUr ? "اگلی آیت" : "Next ayah";
    leftDisabled = !canGoNext;
    leftPoints = "15 18 9 12 15 6";

    // Right = Prev
    rightId = "btn-prev-ayah";
    rightAria = isUr ? "پچھلی آیت" : "Previous ayah";
    rightText = isUr ? "پچھلی آیت" : "Previous ayah";
    rightDisabled = !canGoPrev;
    rightPoints = "9 18 15 12 9 6";
  } else {
    // Left = Prev
    leftId = "btn-prev-ayah";
    leftAria = "Previous ayah";
    leftText = "Previous ayah";
    leftDisabled = !canGoPrev;
    leftPoints = "15 18 9 12 15 6";

    // Right = Next
    rightId = "btn-next-ayah";
    rightAria = "Next ayah";
    rightText = "Next ayah";
    rightDisabled = !canGoNext;
    rightPoints = "9 18 15 12 9 6";
  }

  container.innerHTML = `
    <div class="screen active screen-quran-v2 meaning-${meaningMode} ${isTajweedActive ? "tajweed-mode" : ""}" dir="${isUr ? "rtl" : "ltr"}">
      
      <!-- TOP ACTION BAR (Emerald + Star Pattern) -->
      <header class="quran-header-emerald">
        <div class="header-left-group">
          <button type="button" class="btn-header-back" data-nav="surahs" aria-label="${t("surahs", state.lang)}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              ${isUr ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>'}
            </svg>
            <span class="btn-header-back-text">${isUr ? "فہرست" : "Surahs"}</span>
          </button>

          <div class="header-surah-meta">
            <span class="surah-name-gold" lang="ar" dir="rtl">${surahData.nameAr}</span>
            <span class="surah-sub-info" dir="${isUr ? "rtl" : "ltr"}">
              <span>${isUr ? "سورت" : "Surah"} <bdi class="urdu-num">${isUr ? toUrduDigits(sNum) : sNum}</bdi></span>
              <span class="sub-dot" aria-hidden="true">·</span>
              <span><bdi class="urdu-num">${isUr ? toUrduDigits(totalAyahs) : totalAyahs}</bdi> ${isUr ? "آیات" : "verses"}</span>
            </span>
          </div>
        </div>

        <div class="header-right-group quran-toolbar-group">
          <!-- Audio Recitation Controls -->
          <div class="audio-controls-pill" role="group" aria-label="Audio Controls">
            <button type="button" class="btn-audio-play" id="btn-audio-play" aria-label="${t("playAyah", state.lang)}">
              <span class="audio-icon-play">${Icons.play(18)}</span>
            </button>
            <button type="button" class="btn-audio-reciter" id="btn-audio-reciter" aria-label="${t("reciter", state.lang)}: ${isUr ? curReciter.nameUr : curReciter.nameEn}">
              <span class="reciter-cur-name">${isUr ? curReciter.nameUr.split(" ")[0] : curReciter.nameEn.split(" ")[0]}</span>
            </button>
            <button type="button" class="btn-audio-speed" id="btn-audio-speed" aria-label="${t("speedLabel", state.lang)} 1×">1×</button>
            <button type="button" class="btn-audio-repeat" id="btn-audio-repeat" aria-label="Repeat Ayah">${Icons.repeat(18)}</button>
          </div>

          <!-- Reading Mode Switch (WBW / Mushaf) -->
          <div class="mode-pill-toggle mode-toggle segmented-control" role="group" aria-label="Reading Mode">
            <button type="button" class="mode-pill-btn mode-btn active" data-mode="wbw">${t("readingModeWbw", state.lang)}</button>
            <button type="button" class="mode-pill-btn mode-btn" data-mode="mushaf">${t("readingModeMushaf", state.lang)}</button>
          </div>

          <!-- Tajweed Toggle Button -->
          <button type="button" class="btn-tajweed-toggle ${isTajweedActive ? "active" : ""}" id="btn-toggle-tajweed" aria-pressed="${isTajweedActive}" aria-label="${t("tajweedToggle", state.lang)} BETA">
            <span>${t("tajweedToggle", state.lang)}</span>
          </button>

          <!-- Language selection pill (Urdu / EN) -->

          <!-- Overflow Settings Button -->
          <button type="button" class="btn-toolbar-overflow" id="btn-toolbar-overflow" aria-label="${t("displaySettings", state.lang)}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>

        <!-- Mobile Header Actions (Play + Overflow Settings) -->
        <div class="mobile-header-actions">
          <button type="button" class="btn-mobile-audio-play" id="btn-mobile-audio-play" aria-label="${t("playAyah", state.lang)}">${Icons.play(20)}</button>
          <button type="button" class="btn-quran-overflow" id="btn-quran-overflow" aria-label="${t("displaySettings", state.lang)}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Phone reading-mode switch (desktop uses the toolbar switch) -->
      <div class="phone-mode-switch mode-pill-toggle segmented-control" role="group" aria-label="${t("readingModeLabel", state.lang)}">
        <button type="button" class="mode-pill-btn" data-mode="mushaf" aria-pressed="false">${t("readingModeMushaf", state.lang)}</button>
        <button type="button" class="mode-pill-btn active" data-mode="wbw" aria-pressed="true">${t("readingModeWbw", state.lang)}</button>
      </div>

      ${isMorphActive && !isTajweedActive ? `
      <!-- Toolbar Morphology Legend Banner (Under toolbar when colours are active) -->
      <div class="morphology-toolbar-legend" id="morphology-toolbar-legend" role="note" aria-label="Morphology Legend">
        <span class="morph-legend-item prefix">${t("morphLegendPrefix", state.lang)}</span>
        <span class="morph-legend-item suffix">${t("morphLegendSuffix", state.lang)}</span>
      </div>
      ` : ""}

      ${isTajweedActive ? `
      <!-- Toolbar Tajweed Legend Banner -->
      <div class="tajweed-toolbar-legend" id="tajweed-toolbar-legend" role="button" tabindex="0" aria-label="${t("tajweedLegendTitle", state.lang)}">
        <div class="tj-legend-items-scroll">
          <span class="tj-legend-item"><span class="tj-swatch madd-lazim"></span>${t("tajweedLegendMaddLazim", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch madd-wajib"></span>${t("tajweedLegendMaddWajib", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch madd-jaiz"></span>${t("tajweedLegendMaddJaiz", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch madd-tabeei"></span>${t("tajweedLegendMaddTabeei", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch ghunnah"></span>${t("tajweedLegendGhunnah", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch idgham"></span>${t("tajweedLegendIdgham", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch ikhfa"></span>${t("tajweedLegendIkhfa", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch iqlab"></span>${t("tajweedLegendIqlab", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch qalaqah"></span>${t("tajweedLegendQalqalah", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch silent"></span>${t("tajweedLegendSilent", state.lang)}</span>
        </div>
        <button type="button" class="tj-legend-more-btn" aria-label="${t("tajweedLegendTitle", state.lang)}">${t("tajweedLegendMore", state.lang)}</button>
      </div>
      ` : ""}

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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <polyline points="${leftPoints}"/>
            </svg>
            <span class="sr-only">${leftText}</span>
          </button>

          <div class="interlinear-reading-card ${isMorphActive ? `morph-style-${morphStyle}` : ''}" id="interlinear-card">
            ${paginationBarHtml}
            <div class="reading-card-utility-bar" style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 8px;">
              <div class="utility-left" style="display: flex; align-items: center; gap: 8px;">
                ${sajdaHtml}
                <button type="button" class="btn-memorized-toggle ${isMem ? 'active' : ''}" data-memorized-surah="${sNum}" data-memorized-ayah="${aNum}">
                  <span class="mem-icon">${isMem ? Icons.check(14) : Icons.circle(14)}</span>
                  <span>${t("memorized", state.lang)}</span>
                </button>
              </div>
              <div class="utility-right ayah-action-bar">
                <button type="button" class="btn-ayah-action btn-ayah-bookmark ${isBookmarked ? 'active' : ''}" data-bookmark-surah="${sNum}" data-bookmark-ayah="${aNum}" aria-label="${t("bookmarkAyah", state.lang)}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
                <button type="button" class="btn-ayah-action btn-ayah-share" data-share-ayah="${sNum}:${aNum}" aria-label="${t("shareTitle", state.lang)}">${state.isKiosk ? Icons.qr(16) : Icons.share(16)}</button>
                <button type="button" class="btn-ayah-action btn-ayah-copy" data-copy-ayah="${sNum}:${aNum}" aria-label="${t("copiedToClipboard", state.lang)}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="interlinear-flow-row ${isHifzActive ? 'hifz-blurred-text' : ''}" id="wbw-flow-row" dir="rtl">
              ${wordsHtml}
              ${medallionHtml}
            </div>
            ${isHifzActive ? `<span class="hifz-reveal-hint" id="wbw-hifz-hint">${t("tapToReveal", state.lang)}</span>` : ""}
          </div>

          <button type="button" class="nav-arrow-btn nav-arrow-right ${rightDisabled ? 'disabled' : ''}" id="${rightId}" aria-label="${rightAria}">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
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
                <span>${t("readFull", state.lang)}</span>
              </button>
            </div>
            <p class="trans-body-text trans-text-ur" lang="ur" dir="rtl">${urHtml}</p>
          </div>
        </div>
      </main>

      <!-- Floating Mini Player -->
      <div class="quran-mini-player" id="quran-mini-player" role="region" aria-label="Mini Audio Player">
        <div class="mini-player-top">
          <div class="mini-player-meta">
            <span class="mini-player-title" id="mini-player-title">${isUr ? surahData.nameAr : (surahData.nameEn || surahData.nameAr)} · ${isUr ? `آیت <span class="urdu-num">${toUrduDigits(aNum)}</span> / <span class="urdu-num">${toUrduDigits(totalAyahs)}</span>` : `Ayah ${aNum}`}</span>
            <button type="button" class="mini-player-reciter-btn" id="mini-player-reciter">${isUr ? curReciter.nameUr : curReciter.nameEn}</button>
          </div>
          <div class="mini-player-controls">
            <button type="button" class="btn-mini-step" id="btn-mini-prev" aria-label="Previous Ayah">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button type="button" class="btn-mini-play" id="btn-mini-play" aria-label="Play/Pause">${Icons.play(22)}</button>
            <button type="button" class="btn-mini-step" id="btn-mini-next" aria-label="Next Ayah">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button type="button" class="btn-mini-close" id="btn-mini-close" aria-label="Close Player">${Icons.close(18)}</button>
          </div>
        </div>
        <div class="mini-player-progress-bar" id="mini-player-progress">
          <div class="mini-player-progress-fill" id="mini-player-progress-fill"></div>
        </div>
      </div>

      <!-- FOOTER: Responsive Navigation Bar (Fixed on mobile with arrows, centered keypad on desktop) -->
      <footer class="quran-v2-footer">
        <div class="footer-nav-bar" dir="rtl">
          <button type="button" class="footer-nav-btn footer-nav-prev ${!canGoPrev ? 'disabled' : ''}" id="footer-btn-prev" aria-label="${isUr ? 'پچھلی آیت' : 'Previous ayah'}">
            ${isUr ? '<span>پچھلی آیت</span> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' : '<span dir="ltr" class="fnb-inner"><span>Previous</span> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></span>'}
          </button>

          <button type="button" class="btn-jump-keypad-pill" id="btn-goto-keypad" aria-label="${isUr ? `آیت ${toUrduDigits(currentAyahObj.number)} / جائیں` : `Ayah ${currentAyahObj.number} · Jump`}">
            <span class="jump-pill-text">${isUr ? `<span>آیت <bdi class="urdu-num">${toUrduDigits(currentAyahObj.number)}</bdi></span> <span aria-hidden="true">/</span> <span>${t("jump", state.lang)}</span>` : `<span>Ayah <bdi>${currentAyahObj.number}</bdi></span> <span aria-hidden="true">·</span> <span>${t("jump", state.lang)}</span>`}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>

          <button type="button" class="footer-nav-btn footer-nav-next ${!canGoNext ? 'disabled' : ''}" id="footer-btn-next" aria-label="${isUr ? 'اگلی آیت' : 'Next ayah'}">
            ${isUr ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg> <span>اگلی آیت</span>' : '<span dir="ltr" class="fnb-inner"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg> <span>Next</span></span>'}
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
    // Arabic reading order: ← goes forward, → goes back
    if (e.key === "ArrowLeft") navigateNext();
    else if (e.key === "ArrowRight") navigatePrev();
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
          // Arabic page-turn: swipe right (towards the "next" arrow side) = next ayah
          if (dx > 0) {
            navigateNext();
          } else {
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
      if (audioManager.seekToWord(sNum, aNum, idx)) return;
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

  // Overflow "⋯" Settings Sheet (Mobile & Toolbar)
  container.querySelectorAll("#btn-quran-overflow, #btn-toolbar-overflow").forEach((btn) => {
    btn.addEventListener("click", () => {
      const curAyah = (state.nav && state.nav.surah === sNum && state.nav.ayah) ? state.nav.ayah : aNum;
      router.navigate(`settings/quran/${sNum}/${curAyah}`);
    });
  });

  // Toolbar Language Toggle
  container.querySelectorAll(".lang-pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const newLang = btn.getAttribute("data-lang");
      if (newLang && newLang !== state.lang) {
        state.lang = newLang;
        renderQuranScreen(container, [sNum, aNum]);
      }
    });
  });

  // Wire Morphology Colors Toggle & Style Selector
  const morphToggleBtn = container.querySelector("#btn-toggle-morphology");
  if (morphToggleBtn) {
    morphToggleBtn.addEventListener("click", () => {
      state.settings.showMorphology = !state.settings.showMorphology;
      Storage.saveSettings(state.settings);
      renderQuranScreen(container, [sNum, aNum]);
    });
  }

  // Wire Tajweed Mode Toggle
  const tajweedToggleBtn = container.querySelector("#btn-toggle-tajweed");
  if (tajweedToggleBtn) {
    tajweedToggleBtn.addEventListener("click", () => {
      state.settings.showTajweed = !state.settings.showTajweed;
      Storage.saveSettings(state.settings);
      renderQuranScreen(container, [sNum, aNum]);
    });
  }

  container.querySelectorAll(".morph-style-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const style = btn.getAttribute("data-morph-style");
      state.settings.morphologyStyle = style;
      Storage.saveSettings(state.settings);
      renderQuranScreen(container, [sNum, aNum]);
    });
  });

  if (isMorphActive) {
    // Schedule layout of underline bars after fonts and layout settle
    setTimeout(() => {
      layoutUnderlineBars(container);
    }, 40);
  }


  const tjLegendBar = container.querySelector("#tajweed-toolbar-legend");
  if (tjLegendBar) {
    const openLegend = () => UIComponents.showTajweedLegendBottomSheet();
    tjLegendBar.addEventListener("click", openLegend);
    tjLegendBar.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLegend();
      }
    });
  }

  container.addEventListener("pointerdown", () => wakeLockManager.resetIdleTimeout(), { passive: true });
  container.addEventListener("scroll", () => wakeLockManager.resetIdleTimeout(), { passive: true });

  // Wire Audio Recitation Controls & Mini Player
  setupAudioPlayerUI(container, sNum, aNum, totalAyahs, surahData, false);
  wireAyahActions(container, surahData, sNum, isUr);
  wireDownloadButton(container, sNum, totalAyahs, isUr);
}

/**
 * Renders Mushaf Continuous Mode with v2 Styling & 8-point Medallions
 */
/** Words of one ayah of THIS surah, for the recitation highlight. */
function makeWordResolver(surahData, sNum) {
  return (s, a) => {
    if (s !== sNum || !surahData || !Array.isArray(surahData.ayahs)) return [];
    const ay = surahData.ayahs.find((x) => x.number === a);
    return ay && Array.isArray(ay.words) ? ay.words : [];
  };
}

function renderMushafView(container, surahData, sNum, aNum, totalAyahs, isUr) {
  const wordsFor = makeWordResolver(surahData, sNum);
  const curReciter = audioManager.getCurrentReciter();
  const isAudioDownloaded = !state.isKiosk && OfflineAudio.isSurahDownloaded(sNum, curReciter.id);
  const showTranslation = state.mushafShowTranslation;
  const meaningMode = state.meaningDisplay; // "both" | "ur" | "en"
  const isTajweedActive = state.settings.showTajweed === true;
  const isHifzActive = state.settings.hifzMode === true;
  const isMem = Storage.isMemorized(sNum, aNum);

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
    const arText = mushafWordsHtml(a, isTajweedActive, sNum, state.settings.showMorphology === true);
    const aSajda = (window.BASEERAH_METADATA && window.BASEERAH_METADATA.sajdaByAyah)
      ? window.BASEERAH_METADATA.sajdaByAyah[`${sNum}:${a.number}`]
      : null;
    const aBookmarked = Storage.isBookmarked(sNum, a.number);
    const aMem = Storage.isMemorized(sNum, a.number);

    return `
      <div class="mushaf-ayah-block mushaf-ayah-span" data-ayah-num="${a.number}" id="mushaf-ayah-${a.number}">
        <!-- Mobile/Phone Top Row (<600px): Ayah Badge + Play Button on Right, Ayah Key on Left -->
        <div class="mushaf-ayah-top-row" dir="${isUr ? 'rtl' : 'ltr'}">
          <div class="mushaf-ayah-actions-right">
            <span class="mushaf-ayah-badge">${isUr ? `آیت <span class="urdu-num">${toUrduDigits(a.number)}</span>` : `Ayah ${a.number}`}</span>
            <button type="button" class="btn-mushaf-play" data-play-ayah="${a.number}" aria-label="Play Ayah ${a.number}">${Icons.play(16)}</button>
            <button type="button" class="btn-ayah-action btn-ayah-bookmark ${aBookmarked ? 'active' : ''}" data-bookmark-surah="${sNum}" data-bookmark-ayah="${a.number}" aria-label="${t("bookmarkAyah", state.lang)}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${aBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button type="button" class="btn-ayah-action btn-ayah-share" data-share-ayah="${sNum}:${a.number}" aria-label="${t("shareTitle", state.lang)}">${state.isKiosk ? Icons.qr(16) : Icons.share(16)}</button>
            <button type="button" class="btn-ayah-action btn-ayah-copy" data-copy-ayah="${sNum}:${a.number}" aria-label="${t("copiedToClipboard", state.lang)}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button type="button" class="btn-memorized-toggle ${aMem ? 'active' : ''}" data-memorized-surah="${sNum}" data-memorized-ayah="${a.number}">
              <span class="mem-icon">${aMem ? Icons.check(14) : Icons.circle(14)}</span>
              <span>${t("memorized", state.lang)}</span>
            </button>
            ${aSajda ? `
              <span class="sajda-indicator-badge" title="${isUr ? `سجدہ تلاوت (${aSajda.typeUr})` : `Sajdah (${aSajda.typeEn})`}">
                <span>${isUr ? `سجدہ (${aSajda.typeUr})` : `Sajdah`}</span>
              </span>
            ` : ""}
          </div>
          <div class="mushaf-ayah-key-left" dir="${isUr ? 'rtl' : 'ltr'}">
            <span class="mushaf-ayah-key">${isUr ? `<bdi class="urdu-num">${toUrduDigits(sNum)}:${toUrduDigits(a.number)}</bdi>` : `${sNum}:${a.number}`}</span>
          </div>
        </div>

        <div class="mushaf-ayah-arabic-row" lang="ar" dir="rtl" role="button" tabindex="0" aria-roledescription="${t("readingModeWbw", state.lang)}">
          <span class="mushaf-ar-text ${isTajweedActive ? "tajweed-active" : ""} ${isHifzActive ? "hifz-blurred-text" : ""}">${arText}</span>
          <span class="mushaf-medallion-box desktop-side-medallion">
            ${aSajda ? `<span class="sajda-indicator-badge" style="margin: 0 4px;" title="${isUr ? `سجدہ تلاوت (${aSajda.typeUr})` : `Sajdah (${aSajda.typeEn})`}">${isUr ? `سجدہ (${aSajda.typeUr})` : `Sajdah`}</span>` : ""}
            <button type="button" class="btn-ayah-action btn-ayah-bookmark ${aBookmarked ? 'active' : ''}" data-bookmark-surah="${sNum}" data-bookmark-ayah="${a.number}" aria-label="${t("bookmarkAyah", state.lang)}" style="margin: 0 2px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${aBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button type="button" class="btn-ayah-action btn-ayah-share" data-share-ayah="${sNum}:${a.number}" aria-label="${t("shareTitle", state.lang)}">${state.isKiosk ? Icons.qr(16) : Icons.share(16)}</button>
            <button type="button" class="btn-ayah-action btn-ayah-copy" data-copy-ayah="${sNum}:${a.number}" aria-label="${t("copiedToClipboard", state.lang)}" style="margin: 0 2px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button type="button" class="btn-memorized-toggle ${aMem ? 'active' : ''}" data-memorized-surah="${sNum}" data-memorized-ayah="${a.number}" style="margin: 0 4px;">
              <span class="mem-icon">${aMem ? Icons.check(14) : Icons.circle(14)}</span>
              <span>${t("memorized", state.lang)}</span>
            </button>
            <button type="button" class="btn-mushaf-play btn-mushaf-play-side" data-play-ayah="${a.number}" aria-label="Play Ayah ${a.number}">${Icons.play(16)}</button>
            ${medallion}
          </span>
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
    <div class="screen active screen-quran-v2 screen-mushaf-v2 meaning-${meaningMode} ${isTajweedActive ? "tajweed-mode" : ""}" dir="${isUr ? "rtl" : "ltr"}">
      <header class="quran-header-emerald">
        <div class="header-left-group">
          <button type="button" class="btn-header-back" data-nav="surahs" aria-label="${t("surahs", state.lang)}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              ${isUr ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>'}
            </svg>
            <span class="btn-header-back-text">${isUr ? "فہرست" : "Surahs"}</span>
          </button>
          <div class="header-surah-meta">
            <span class="surah-name-gold" lang="ar" dir="rtl">${surahData.nameAr}</span>
            <span class="surah-sub-info" dir="${isUr ? "rtl" : "ltr"}">
              <span>${isUr ? "سورت" : "Surah"} <bdi class="urdu-num">${isUr ? toUrduDigits(sNum) : sNum}</bdi></span>
              <span class="sub-dot" aria-hidden="true">·</span>
              <span><bdi class="urdu-num">${isUr ? toUrduDigits(totalAyahs) : totalAyahs}</bdi> ${isUr ? "آیات" : "verses"}</span>
            </span>
          </div>
        </div>

        <div class="header-right-group quran-toolbar-group">
          <!-- Audio Recitation Controls -->
          <div class="audio-controls-pill" role="group" aria-label="Audio Controls">
            <button type="button" class="btn-audio-play" id="btn-audio-play" aria-label="${t("playAyah", state.lang)}">
              <span class="audio-icon-play">${Icons.play(18)}</span>
            </button>
            <button type="button" class="btn-audio-reciter" id="btn-audio-reciter" aria-label="${t("reciter", state.lang)}: ${isUr ? curReciter.nameUr : curReciter.nameEn}">
              <span class="reciter-cur-name">${isUr ? curReciter.nameUr.split(" ")[0] : curReciter.nameEn.split(" ")[0]}</span>
            </button>
            <button type="button" class="btn-audio-speed" id="btn-audio-speed" aria-label="${t("speedLabel", state.lang)} 1×">1×</button>
            <button type="button" class="btn-audio-repeat" id="btn-audio-repeat" aria-label="Repeat Ayah">${Icons.repeat(18)}</button>
          </div>

          <!-- Reading Mode Switch (WBW / Mushaf) -->
          <div class="mode-pill-toggle mode-toggle segmented-control" role="group" aria-label="Reading Mode">
            <button type="button" class="mode-pill-btn mode-btn" data-mode="wbw">${t("readingModeWbw", state.lang)}</button>
            <button type="button" class="mode-pill-btn mode-btn active" data-mode="mushaf">${t("readingModeMushaf", state.lang)}</button>
          </div>

          <!-- Tajweed Toggle Button -->
          <button type="button" class="btn-tajweed-toggle ${isTajweedActive ? "active" : ""}" id="btn-toggle-mushaf-tajweed" aria-pressed="${isTajweedActive}" aria-label="${t("tajweedToggle", state.lang)} BETA">
            <span>${t("tajweedToggle", state.lang)}</span>
          </button>

          <!-- Language selection pill (Urdu / EN) -->

          <!-- Overflow Settings Button -->
          <button type="button" class="btn-toolbar-overflow" id="btn-toolbar-overflow" aria-label="${t("displaySettings", state.lang)}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>

        <!-- Mobile Header Actions (Play + Overflow Settings) -->
        <div class="mobile-header-actions">
          <button type="button" class="btn-mobile-audio-play" id="btn-mobile-audio-play" aria-label="${t("playAyah", state.lang)}">${Icons.play(20)}</button>
          <button type="button" class="btn-quran-overflow" id="btn-quran-overflow" aria-label="${t("displaySettings", state.lang)}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Phone reading-mode switch (desktop uses the toolbar switch) -->
      <div class="phone-mode-switch mode-pill-toggle segmented-control" role="group" aria-label="${t("readingModeLabel", state.lang)}">
        <button type="button" class="mode-pill-btn active" data-mode="mushaf" aria-pressed="true">${t("readingModeMushaf", state.lang)}</button>
        <button type="button" class="mode-pill-btn" data-mode="wbw" aria-pressed="false">${t("readingModeWbw", state.lang)}</button>
      </div>

      ${isTajweedActive ? `
      <!-- Toolbar Tajweed Legend Banner -->
      <div class="tajweed-toolbar-legend" id="tajweed-toolbar-legend" role="button" tabindex="0" aria-label="${t("tajweedLegendTitle", state.lang)}">
        <div class="tj-legend-items-scroll">
          <span class="tj-legend-item"><span class="tj-swatch madd-lazim"></span>${t("tajweedLegendMaddLazim", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch madd-wajib"></span>${t("tajweedLegendMaddWajib", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch madd-jaiz"></span>${t("tajweedLegendMaddJaiz", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch madd-tabeei"></span>${t("tajweedLegendMaddTabeei", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch ghunnah"></span>${t("tajweedLegendGhunnah", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch idgham"></span>${t("tajweedLegendIdgham", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch ikhfa"></span>${t("tajweedLegendIkhfa", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch iqlab"></span>${t("tajweedLegendIqlab", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch qalaqah"></span>${t("tajweedLegendQalqalah", state.lang)}</span>
          <span class="tj-legend-item"><span class="tj-swatch silent"></span>${t("tajweedLegendSilent", state.lang)}</span>
        </div>
        <button type="button" class="tj-legend-more-btn" aria-label="${t("tajweedLegendTitle", state.lang)}">${t("tajweedLegendMore", state.lang)}</button>
      </div>
      ` : ""}

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

      <!-- Floating Resume Follow Pill -->
      <button type="button" class="btn-resume-follow" id="btn-resume-follow" aria-label="${t("resumeFollow", state.lang)}">
        <span>${t("resumeFollow", state.lang)}</span>
      </button>

      <!-- Floating Mini Player -->
      <div class="quran-mini-player" id="quran-mini-player" role="region" aria-label="Mini Audio Player">
        <div class="mini-player-top">
          <div class="mini-player-meta">
            <span class="mini-player-title" id="mini-player-title">${isUr ? surahData.nameAr : (surahData.nameEn || surahData.nameAr)} · ${isUr ? `آیت <span class="urdu-num">${toUrduDigits(aNum)}</span> / <span class="urdu-num">${toUrduDigits(totalAyahs)}</span>` : `Ayah ${aNum}`}</span>
            <button type="button" class="mini-player-reciter-btn" id="mini-player-reciter">${isUr ? curReciter.nameUr : curReciter.nameEn}</button>
          </div>
          <div class="mini-player-controls">
            <button type="button" class="btn-mini-step" id="btn-mini-prev" aria-label="Previous Ayah">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button type="button" class="btn-mini-play" id="btn-mini-play" aria-label="Play/Pause">${Icons.play(22)}</button>
            <button type="button" class="btn-mini-step" id="btn-mini-next" aria-label="Next Ayah">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button type="button" class="btn-mini-close" id="btn-mini-close" aria-label="Close Player">${Icons.close(18)}</button>
          </div>
        </div>
        <div class="mini-player-progress-bar" id="mini-player-progress">
          <div class="mini-player-progress-fill" id="mini-player-progress-fill"></div>
        </div>
      </div>

      <footer class="quran-v2-footer">
        <button type="button" class="btn-jump-keypad-pill" id="btn-goto-keypad" style="margin: 0 auto;" aria-label="${isUr ? `آیت پر جائیں` : `Go to ayah`}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
          <span class="jump-pill-text">${isUr ? `<span>آیت پر جائیں</span>` : `<span>Go to ayah</span>`}</span>
        </button>
      </footer>
    </div>
  `;

  // Collapse banner smoothly on scroll on mobile
  const mushafViewport = container.querySelector(".mushaf-reading-viewport");
  const surahBanner = container.querySelector(".mushaf-surah-banner");
  if (mushafViewport && surahBanner) {
    mushafViewport.addEventListener("scroll", () => {
      if (mushafViewport.scrollTop > 60) {
        surahBanner.classList.add("banner-collapsed");
      } else {
        surahBanner.classList.remove("banner-collapsed");
      }
    }, { passive: true });
  }

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

  // Tajweed visibility toggle in Mushaf
  const mushafTajweedBtn = container.querySelector("#btn-toggle-mushaf-tajweed");
  if (mushafTajweedBtn) {
    mushafTajweedBtn.addEventListener("click", () => {
      state.settings.showTajweed = !state.settings.showTajweed;
      Storage.saveSettings(state.settings);
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

  // Tap a word in mushaf mode -> its meaning; tap elsewhere on the ayah -> word-by-word view
  container.querySelectorAll(".mushaf-ayah-arabic-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".fn-ref-btn") || e.target.closest("button")) return;
      if (isHifzActive) {
        const arEl = row.querySelector(".mushaf-ar-text");
        if (arEl) {
          arEl.classList.toggle("revealed");
          return;
        }
      }
      const wordEl = e.target.closest(".mw");
      if (wordEl) {
        const blockEl = row.closest(".mushaf-ayah-block");
        const ayahNo = parseInt(blockEl.getAttribute("data-ayah-num"), 10);
        const ayah = surahData.ayahs.find((x) => x.number === ayahNo);
        const idx = parseInt(wordEl.getAttribute("data-w"), 10);
        if (audioManager.seekToWord(sNum, ayahNo, idx)) return;
        if (ayah && ayah.words && ayah.words[idx]) {
          row.querySelectorAll(".mw.is-picked").forEach((el) => el.classList.remove("is-picked"));
          wordEl.classList.add("is-picked");
          UIComponents.showWordSheet({
            word: ayah.words[idx],
            surahNum: sNum,
            ayahNum: ayahNo,
            wordIndex: idx,
            surahName: surahData.nameEn,
            onClose: () => wordEl.classList.remove("is-picked"),
            onOpenWbw: () => { state.readingMode = "wbw"; router.navigate(`quran/${sNum}/${ayahNo}`); }
          });
          return;
        }
      }
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

  container.querySelectorAll("#btn-quran-overflow, #btn-toolbar-overflow").forEach((btn) => {
    btn.addEventListener("click", () => {
      const curAyah = (state.nav && state.nav.surah === sNum && state.nav.ayah) ? state.nav.ayah : aNum;
      router.navigate(`settings/quran/${sNum}/${curAyah}`);
    });
  });

  container.querySelectorAll(".lang-pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const newLang = btn.getAttribute("data-lang");
      if (newLang && newLang !== state.lang) {
        state.lang = newLang;
        renderQuranScreen(container, [sNum, aNum]);
      }
    });
  });


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
        return;
      }

      audioManager.playSurah(sNum, ayahToPlay, totalAyahs, { getWords: wordsFor });
    });
  });

  const mushafTjLegendBar = container.querySelector("#tajweed-toolbar-legend");
  if (mushafTjLegendBar) {
    const openLegend = () => UIComponents.showTajweedLegendBottomSheet();
    mushafTjLegendBar.addEventListener("click", openLegend);
    mushafTjLegendBar.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLegend();
      }
    });
  }

  container.addEventListener("pointerdown", () => wakeLockManager.resetIdleTimeout(), { passive: true });
  container.addEventListener("scroll", () => wakeLockManager.resetIdleTimeout(), { passive: true });

  // Wire Mushaf Header Audio Recitation Controls & Mini Player
  setupAudioPlayerUI(container, sNum, aNum, totalAyahs, surahData, true);
  trackMushafReading(container, sNum, surahData);
  enableFocusReading(container);
  wireAyahActions(container, surahData, sNum, isUr);
  wireDownloadButton(container, sNum, totalAyahs, isUr);

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
      <div class="error-badge">${Icons.warning(28)}</div>
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

function wireDownloadButton(container, sNum, totalAyahs, isUr) {
  const dlBtns = container.querySelectorAll(".btn-download-audio, .btn-mobile-download-audio");
  if (!dlBtns.length) return;

  let dlAbort = null;
  const setAllState = (stateName, labelText, iconText) => {
    dlBtns.forEach((btn) => {
      btn.classList.remove("downloading", "downloaded");
      if (stateName) btn.classList.add(stateName);
      const icon = btn.querySelector(".dl-icon");
      if (icon) icon.innerHTML = iconText;
      const label = btn.querySelector(".dl-label");
      if (label && labelText) label.textContent = labelText;
    });
  };

  dlBtns.forEach((dlBtn) => {
    dlBtn.addEventListener("click", async () => {
      if (dlAbort) {
        dlAbort.abort();
        dlAbort = null;
        setAllState(null, t("downloadAudio", state.lang), Icons.download(16));
        UIComponents.showToast(t("cancelDownload", state.lang));
        return;
      }

      const reciter = audioManager.getCurrentReciter();
      if (OfflineAudio.isSurahDownloaded(sNum, reciter.id)) {
        UIComponents.showToast(`${t("audioDownloaded", state.lang)} · ${isUr ? reciter.nameUr : reciter.nameEn}`);
        return;
      }

      dlAbort = new AbortController();
      setAllState("downloading", `${t("downloadingAudio", state.lang)} (0/${totalAyahs})`, Icons.hourglass(16));

      try {
        await OfflineAudio.downloadSurah(sNum, totalAyahs, reciter.id, (prog) => {
          setAllState("downloading", `${prog.currentAyah}/${prog.totalAyahs} (${prog.sizeMB} MB)`, Icons.hourglass(16));
        }, dlAbort.signal);

        setAllState("downloaded", t("audioDownloaded", state.lang), Icons.check(16));
        dlAbort = null;
        UIComponents.showToast(t("audioDownloaded", state.lang));
      } catch (err) {
        setAllState(null, t("downloadAudio", state.lang), Icons.download(16));
        dlAbort = null;
        if (err.message !== "Download cancelled") {
          console.error("Audio download error:", err);
          UIComponents.showToast(t("audioErrorNotice", state.lang));
        }
      }
    });
  });
}

/**
 * Unified Audio Player Controller for WBW and Mushaf Views
 */
function setupAudioPlayerUI(container, sNum, aNum, totalAyahs, surahData, isMushaf = false) {
  const wordsFor = makeWordResolver(surahData, sNum);
  const isUr = state.lang === "ur";
  const playBtns = container.querySelectorAll("#btn-audio-play, #btn-mobile-audio-play");
  const speedBtn = container.querySelector("#btn-audio-speed");
  const repeatBtn = container.querySelector("#btn-audio-repeat");
  const reciterBtn = container.querySelector("#btn-audio-reciter");
  const miniPlayer = container.querySelector("#quran-mini-player");
  const miniTitle = container.querySelector("#mini-player-title");
  const miniReciter = container.querySelector("#mini-player-reciter");
  const miniPrev = container.querySelector("#btn-mini-prev");
  const miniPlay = container.querySelector("#btn-mini-play");
  const miniNext = container.querySelector("#btn-mini-next");
  const miniClose = container.querySelector("#btn-mini-close");
  const miniProgress = container.querySelector("#mini-player-progress");
  const miniFill = container.querySelector("#mini-player-progress-fill");
  const resumeBtn = container.querySelector("#btn-resume-follow");
  const viewport = container.querySelector(".mushaf-reading-viewport, .quran-reading-viewport");

  let isAutoScrollPaused = false;

  const updatePlayState = (isPlaying) => {
    playBtns.forEach((btn) => {
      btn.classList.toggle("playing", isPlaying);
      const icon = btn.querySelector(".audio-icon-play");
      const label = btn.querySelector(".audio-play-label");
      if (icon) icon.innerHTML = isPlaying ? Icons.pause(18) : Icons.play(18);
      else if (btn.id === "btn-mobile-audio-play") btn.innerHTML = isPlaying ? Icons.pause(20) : Icons.play(20);
      if (label) label.textContent = isPlaying ? t("pauseAyah", state.lang) : t("playAyah", state.lang);
    });

    if (miniPlayer) {
      miniPlayer.classList.toggle("active", isPlaying || !!audioManager.currentAudio);
      if (miniPlay) {
        miniPlay.classList.toggle("playing", isPlaying);
        miniPlay.innerHTML = isPlaying ? Icons.pause(22) : Icons.play(22);
      }
    }

    if (isMushaf) {
      container.querySelectorAll(".btn-mushaf-play").forEach((b) => {
        const targetAyah = parseInt(b.getAttribute("data-play-ayah"), 10);
        const isActive = isPlaying && audioManager.currentAyah === targetAyah;
        b.innerHTML = isActive ? Icons.pause(16) : Icons.play(16);
        b.classList.toggle("playing", isActive);
      });
      container.querySelectorAll(".mushaf-ayah-block").forEach((b) => {
        const bAyah = parseInt(b.getAttribute("data-ayah-num"), 10);
        b.classList.toggle("audio-active-block", isPlaying && audioManager.currentAyah === bAyah);
      });
    }
  };

  const updateReciterUI = (reciter) => {
    if (reciterBtn) {
      reciterBtn.setAttribute("aria-label", `${t("reciter", state.lang)}: ${isUr ? reciter.nameUr : reciter.nameEn}`);
      const nameSpan = reciterBtn.querySelector(".reciter-cur-name");
      if (nameSpan) {
        nameSpan.textContent = isUr ? reciter.nameUr.split(" ")[0] : reciter.nameEn.split(" ")[0];
      }
    }
    if (miniReciter) {
      miniReciter.textContent = isUr ? reciter.nameUr : reciter.nameEn;
    }
  };

  const updateRepeatUI = () => {
    if (!repeatBtn) return;
    const mode = audioManager.getRepeatMode();
    if (mode === "ayah") {
      repeatBtn.innerHTML = `${Icons.repeat(16)}<span class="repeat-tag">1</span>`;
      repeatBtn.classList.add("active");
    } else if (mode === "range") {
      const r = audioManager.repeatRange;
      repeatBtn.innerHTML = `${Icons.repeat(16)}<span class="repeat-tag">${r[0]}-${r[1]}</span>`;
      repeatBtn.classList.add("active");
    } else {
      repeatBtn.innerHTML = Icons.repeat(18);
      repeatBtn.classList.remove("active");
    }
  };

  const updateSpeedUI = () => {
    if (speedBtn) {
      speedBtn.textContent = `${audioManager.getPlaybackRate()}×`;
    }
  };

  const updateTrackMeta = (ayahNum) => {
    if (miniTitle) {
      miniTitle.innerHTML = `${isUr ? surahData.nameAr : (surahData.nameEn || surahData.nameAr)} · ${isUr ? `آیت <span class="urdu-num">${toUrduDigits(ayahNum)}</span> / <span class="urdu-num">${toUrduDigits(totalAyahs)}</span>` : `Ayah ${ayahNum}`}`;
    }
  };

  // Wire Play/Pause
  const handleTogglePlay = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (audioManager.isMuted()) {
      UIComponents.showToast(t("mosqueMutedNotice", state.lang));
      return;
    }
    if (audioManager.isPlayingAyah) {
      audioManager.pause();
      return;
    }
    // Resume only a PAUSED track of the ayah on screen (word-by-word) or of this
    // surah (mushaf). Otherwise start fresh from the ayah the user is looking at.
    if (audioManager.canResume(sNum, isMushaf ? null : aNum)) {
      audioManager.resume();
    } else {
      const currentA = aNum;
      const currentObj = surahData.ayahs.find(a => a.number === currentA);
      audioManager.playSurah(sNum, currentA, totalAyahs, { getWords: wordsFor });
    }
  };

  playBtns.forEach((btn) => btn.addEventListener("click", handleTogglePlay));
  if (miniPlay) miniPlay.addEventListener("click", handleTogglePlay);

  if (miniPrev) miniPrev.addEventListener("click", () => audioManager.playPrevious());
  if (miniNext) miniNext.addEventListener("click", () => audioManager.playNext());
  if (miniClose) miniClose.addEventListener("click", () => audioManager.stop());

  // Wire Speed Button (cycles 0.75x -> 1x -> 1.25x -> 1.5x)
  if (speedBtn) {
    speedBtn.addEventListener("click", () => {
      const cur = audioManager.getPlaybackRate();
      const speeds = [0.75, 1.0, 1.25, 1.5];
      const nextIdx = (speeds.indexOf(cur) + 1) % speeds.length;
      audioManager.setPlaybackRate(speeds[nextIdx]);
      updateSpeedUI();
    });
  }

  // Wire Repeat Button
  if (repeatBtn) {
    repeatBtn.addEventListener("click", () => {
      const cur = audioManager.getRepeatMode();
      if (cur === "off") {
        audioManager.setRepeatMode("ayah");
        UIComponents.showToast(t("repeatAyah", state.lang));
        updateRepeatUI();
      } else if (cur === "ayah") {
        UIComponents.showRepeatRangeModal(sNum, totalAyahs, audioManager.repeatRange, () => {
          updateRepeatUI();
        });
      } else {
        audioManager.setRepeatMode("off");
        UIComponents.showToast(t("repeatOff", state.lang));
        updateRepeatUI();
      }
    });
  }

  // Wire Reciter Button
  const openReciterModal = () => {
    UIComponents.showReciterModal((reciter) => {
      updateReciterUI(reciter);
      UIComponents.showToast(`${isUr ? "قاری منتخب:" : "Reciter:"} ${isUr ? reciter.nameUr : reciter.nameEn}`);
    });
  };
  if (reciterBtn) reciterBtn.addEventListener("click", openReciterModal);
  if (miniReciter) miniReciter.addEventListener("click", openReciterModal);

  // Wire Progress Scrubber
  if (miniProgress) {
    miniProgress.addEventListener("click", (e) => {
      if (audioManager.currentAudio && audioManager.currentAudio.duration) {
        const rect = miniProgress.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audioManager.currentAudio.currentTime = pos * audioManager.currentAudio.duration;
      }
    });
  }

  // Auto-scroll detection for Mushaf mode
  if (isMushaf && viewport) {
    const onUserScroll = () => {
      if (audioManager.isPlayingAyah) {
        isAutoScrollPaused = true;
        if (resumeBtn) resumeBtn.classList.add("visible");
      }
    };
    viewport.addEventListener("touchstart", onUserScroll, { passive: true });
    viewport.addEventListener("wheel", onUserScroll, { passive: true });
    viewport.addEventListener("mousedown", onUserScroll, { passive: true });

    if (resumeBtn) {
      resumeBtn.addEventListener("click", () => {
        isAutoScrollPaused = false;
        resumeBtn.classList.remove("visible");
        const curEl = container.querySelector(`#mushaf-ayah-${audioManager.currentAyah || aNum}`);
        if (curEl) curEl.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  // Wire Audio Callbacks
  audioManager.onStateChange = ({ isPlaying }) => {
    updatePlayState(isPlaying);
  };

  audioManager.onTimeUpdate = (currentTime, duration) => {
    if (miniFill && duration) {
      const pct = Math.min(100, Math.max(0, (currentTime / duration) * 100));
      miniFill.style.width = `${pct}%`;
    }
  };

  audioManager.onAyahChange = (surahNum, nextAyahNum) => {
    updateTrackMeta(nextAyahNum);
    if (isMushaf) {
      container.querySelectorAll(".mushaf-ayah-block").forEach((b) => {
        const bAyah = parseInt(b.getAttribute("data-ayah-num"), 10);
        b.classList.toggle("audio-active-block", bAyah === nextAyahNum);
      });
      container.querySelectorAll(".btn-mushaf-play").forEach((b) => {
        const targetAyah = parseInt(b.getAttribute("data-play-ayah"), 10);
        b.innerHTML = targetAyah === nextAyahNum ? Icons.pause(16) : Icons.play(16);
        b.classList.toggle("playing", targetAyah === nextAyahNum);
      });
      if (!isAutoScrollPaused) {
        const targetEl = container.querySelector(`#mushaf-ayah-${nextAyahNum}`);
        if (targetEl) targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      router.navigate(`quran/${surahNum}/${nextAyahNum}`);
    }
  };

  // Synchronized word highlighting — word-by-word tiles and the Mushaf text.
  let lastLit = null;
  audioManager.onWordHighlight = (idx) => {
    if (!container.isConnected) return;
    if (lastLit) { lastLit.classList.remove(isMushaf ? "mw-reciting" : "audio-active-word"); lastLit = null; }
    if (idx === null || idx === undefined || audioManager.currentSurah !== sNum) return;
    const el = isMushaf
      ? container.querySelector(`#mushaf-ayah-${audioManager.currentAyah} .mw[data-w="${idx}"]`)
      : container.querySelector(`.wbw-interlinear-tile[data-word-idx="${idx}"]`);
    if (el) { el.classList.add(isMushaf ? "mw-reciting" : "audio-active-word"); lastLit = el; }
  };

  // Initial state sync
  updatePlayState(audioManager.isPlayingAyah);
  updateReciterUI(audioManager.getCurrentReciter());
  updateRepeatUI();
  updateSpeedUI();
  updateTrackMeta(audioManager.currentAyah || aNum);
}
