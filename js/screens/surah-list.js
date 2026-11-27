/* Baseerah — Surahs & Juz List Screen (Baseerah v2 Redesign) */
import { state } from "../core/state.js";
import { biLabel, t, toUrduDigits } from "../core/i18n.js";
import { router } from "../core/router.js";
import { Icons } from "../ui/icons.js";
import { UIComponents } from "../ui/components.js";

let activeTab = "surahs"; // "surahs" | "juz"
let searchQuery = "";
let isSearchIndexLoading = false;
let searchIndexPromise = null;

function loadSearchIndexAsync(onComplete) {
  if (typeof window === "undefined") return;
  if (window.BASEERAH_SEARCH_INDEX) {
    if (typeof onComplete === "function") onComplete();
    return;
  }
  if (!searchIndexPromise) {
    isSearchIndexLoading = true;
    searchIndexPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "data/search_index.js";
      script.onload = () => {
        isSearchIndexLoading = false;
        resolve(window.BASEERAH_SEARCH_INDEX || []);
        if (typeof onComplete === "function") onComplete();
      };
      script.onerror = () => {
        isSearchIndexLoading = false;
        resolve([]);
        if (typeof onComplete === "function") onComplete();
      };
      document.head.appendChild(script);
    });
  } else if (typeof onComplete === "function") {
    searchIndexPromise.then(onComplete);
  }
}

export function renderSurahListScreen(container, params = []) {
  if (params[0] === "juz") {
    activeTab = "juz";
  }
  const focusSearch = params[0] === "search";
  if (focusSearch) activeTab = "surahs";

  const isUr = state.lang === "ur";
  const surahs = window.BASEERAH_INDEX || [];
  const juzList = window.BASEERAH_JUZ || [];

  container.innerHTML = `
    <div class="screen active screen-surahs screen-surahs-v2" dir="${isUr ? "rtl" : "ltr"}">
      <header class="surah-list-header-emerald">
        <div class="header-left">
          <button type="button" class="btn-header-back" data-nav="home" aria-label="${t("home", state.lang)}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              ${isUr ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>'}
            </svg>
            <span>${t("home", state.lang)}</span>
          </button>
          <div class="header-title-box">
            <h2 class="list-heading-gold">${activeTab === "surahs" ? biLabel("surahListTitle") : biLabel("juzListTitle")}</h2>
            <p class="list-sub-light">${activeTab === "surahs" ? t("surahListSub", state.lang) : t("juzListSub", state.lang)}</p>
          </div>
        </div>

        <div class="list-controls">
          <div class="v2-tab-pill-group" role="tablist">
            <button type="button" class="tab-btn ${activeTab === "surahs" ? "active" : ""}" data-tab="surahs" role="tab" aria-selected="${activeTab === "surahs"}">
              ${t("surahs", state.lang)} (${isUr ? `<span class="urdu-num">${toUrduDigits(114)}</span>` : 114})
            </button>
            <button type="button" class="tab-btn ${activeTab === "juz" ? "active" : ""}" data-tab="juz" role="tab" aria-selected="${activeTab === "juz"}">
              ${t("juz", state.lang)} (${isUr ? `<span class="urdu-num">${toUrduDigits(30)}</span>` : 30})
            </button>
          </div>
        </div>
      </header>

      <div class="list-search-bar">
        <div class="search-input-wrap">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="surah-search-input" class="search-input" placeholder="${t("searchPlaceholder", state.lang)}" value="${searchQuery}" autocomplete="off">
          ${searchQuery ? '<button type="button" id="clear-search-btn" class="search-clear-btn" aria-label="Clear search">' + Icons.close(16) + '</button>' : ""}
        </div>
      </div>

      <div class="list-content-container">
        ${activeTab === "surahs" ? renderSurahGrid(surahs, searchQuery, isUr) : renderJuzGrid(juzList, searchQuery, isUr)}
      </div>
    </div>
  `;

  // Wire back button
  container.querySelector("[data-nav='home']").addEventListener("click", () => {
    router.navigate("home");
  });

  // Wire tabs
  container.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.getAttribute("data-tab");
      searchQuery = "";
      renderSurahListScreen(container);
    });
  });

  // Wire search
  const searchInput = container.querySelector("#surah-search-input");
  if (searchInput) {
    searchInput.addEventListener("focus", () => {
      loadSearchIndexAsync();
    });
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      const content = container.querySelector(".list-content-container");
      if (content) {
        content.innerHTML = activeTab === "surahs" ? renderSurahGrid(surahs, searchQuery, isUr) : renderJuzGrid(juzList, searchQuery, isUr);
        wireCards(content);
      }
      if (searchQuery.length >= 2 && !window.BASEERAH_SEARCH_INDEX) {
        loadSearchIndexAsync(() => {
          if (content && searchInput.value.trim().toLowerCase() === searchQuery) {
            content.innerHTML = activeTab === "surahs" ? renderSurahGrid(surahs, searchQuery, isUr) : renderJuzGrid(juzList, searchQuery, isUr);
            wireCards(content);
          }
        });
      }
    });
  }

  const clearBtn = container.querySelector("#clear-search-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchQuery = "";
      renderSurahListScreen(container);
    });
  }

  wireCards(container);
  if (focusSearch) {
    const si = container.querySelector("#surah-search-input");
    if (si) { si.focus(); loadSearchIndexAsync(); }
  }
}

function wireCards(container) {
  container.querySelectorAll("[data-surah]").forEach((card) => {
    card.addEventListener("click", () => {
      const s = card.getAttribute("data-surah");
      const a = card.getAttribute("data-ayah") || "1";
      router.navigate(`quran/${s}/${a}`);
    });
  });
}

function getSearchEmptyHtml(isUr, query, isLoading) {
  if (isLoading && query.length >= 2) {
    const text = isUr ? "تلاش تیار ہو رہی ہے..." : "Preparing search...";
    return `<div class="search-loading-skeleton" style="text-align: center; padding: 36px 16px;">
      <div class="loader-logo-pulse" style="width: 24px; height: 24px; margin: 0 auto 10px;"></div>
      <p class="muted" style="font-size: 14px;">${text}</p>
    </div>`;
  }
  if (!query) return "";
  const title = isUr ? `"${query}" کے لیے کوئی نتیجہ نہیں ملا` : `No results found for "${query}"`;
  const hint = isUr ? "سورت کا نام، لفظ یا نمبر تلاش کرنے کی کوشش کریں" : "Try searching by surah name, word, or number";
  return `<div class="search-empty-state" style="text-align: center; padding: 48px 16px;">
    <div style="margin: 0 auto 12px; width: 44px; color: var(--color-gold-cream);">${Icons.search(44)}</div>
    <p style="font-size: 16px; font-weight: 700; color: var(--color-primary-text);">${title}</p>
    <p class="muted" style="font-size: 13px; margin-top: 8px;">${hint}</p>
  </div>`;
}

function renderSurahGrid(surahs, query, isUr) {
  const filtered = surahs.filter((s) => {
    if (!query) return true;
    const matchNum = String(s.number).includes(query);
    const matchEn = (s.nameEn || "").toLowerCase().includes(query);
    const matchAr = (s.nameAr || "").includes(query);
    return matchNum || matchEn || matchAr;
  });

  // Ayah search from offline search index
  let matchingAyahs = [];
  if (query && query.length >= 2 && window.BASEERAH_SEARCH_INDEX) {
    const qNorm = query.toLowerCase();
    matchingAyahs = window.BASEERAH_SEARCH_INDEX.filter((entry) => {
      return (entry.ar && entry.ar.includes(qNorm)) ||
        (entry.ur && entry.ur.includes(qNorm)) ||
        (entry.en && entry.en.toLowerCase().includes(qNorm));
    }).slice(0, 15);
  }

  const emptyOrLoading = (filtered.length === 0 && matchingAyahs.length === 0)
    ? getSearchEmptyHtml(isUr, query, isSearchIndexLoading)
    : "";

  return `
    ${matchingAyahs.length > 0 ? `
      <div class="search-ayahs-section" style="margin-bottom: 24px;">
        <h3 class="search-section-title" style="font-size: 15px; font-weight: 700; color: var(--color-gold-cream); margin-bottom: 12px;">
          ${isUr ? "متعلقہ آیات" : "Matching Verses"} (${matchingAyahs.length})
        </h3>
        <div class="search-ayahs-grid" style="display: flex; flex-direction: column; gap: 8px;">
          ${matchingAyahs.map((a) => {
            const sInfo = surahs.find(s => s.number === a.s) || { nameAr: "", nameEn: "" };
            return `
              <button type="button" class="search-ayah-card" data-surah="${a.s}" data-ayah="${a.a}" style="display: flex; flex-direction: column; text-align: right; padding: 10px 14px; background: var(--color-reading-surface); border: 1px solid var(--color-parchment-border); border-radius: 8px; cursor: pointer; gap: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                  <span style="font-size: 14px; font-weight: 700; color: var(--color-primary);">${isUr ? `<span>${sInfo.nameAr}</span> <bdi dir="ltr">(<span class="urdu-num">${toUrduDigits(a.s)}</span>:<span class="urdu-num">${toUrduDigits(a.a)}</span>)</bdi>` : `<span>${sInfo.nameEn}</span> <bdi dir="ltr">(${a.s}:${a.a})</bdi>`}</span>
                  <span style="font-size: 12px; color: var(--color-text-muted);">${a.s}:${a.a}</span>
                </div>
                <div style="font-family: var(--font-arabic); font-size: 15px; color: #222;" dir="rtl">${a.ar}</div>
                ${a.ur ? `<div style="font-size: 12px; color: #555;" dir="rtl">${a.ur}</div>` : ""}
                ${a.en ? `<div style="font-size: 12px; color: #666;" dir="ltr">${a.en}</div>` : ""}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    ` : ""}

    ${filtered.length > 0 ? `
      <div class="surah-grid">
        ${filtered.map((s) => {
          const isActive = state.nav.surah === s.number;
          return `
            <button type="button" class="surah-card-v2 ${isActive ? 'surah-card-active' : ''}" data-surah="${s.number}" data-ayah="1">
              <div class="surah-card-medallion">
                ${UIComponents.getAyahMedallionSvg(s.number, 44)}
              </div>
              <div class="surah-card-info">
                <span class="surah-card-en">${s.nameEn}</span>
                <span class="surah-card-meta">${isUr ? `<span class="urdu-num">${toUrduDigits(s.ayahCount)}</span> آیات` : s.ayahCount + " ayahs"}</span>
              </div>
              <div class="surah-card-ar" lang="ar" dir="rtl">${s.nameAr}</div>
            </button>
          `;
        }).join("")}
      </div>
    ` : emptyOrLoading}
  `;
}

function renderJuzGrid(juzList, query, isUr) {
  const metaJuz = (window.BASEERAH_METADATA && window.BASEERAH_METADATA.juzs) || juzList;
  const filtered = metaJuz.filter((j) => {
    if (!query) return true;
    const matchNum = String(j.number).includes(query);
    const matchEn = (j.nameEn || "").toLowerCase().includes(query);
    const matchUr = (j.nameUr || "").includes(query);
    const matchAr = (j.nameAr || "").includes(query);
    return matchNum || matchEn || matchUr || matchAr;
  });

  if (filtered.length === 0) {
    return `
      <div class="search-empty-state" style="text-align: center; padding: 48px 16px;">
        <div style="margin: 0 auto 12px; width: 44px; color: var(--color-gold-cream);">${Icons.search(44)}</div>
        <p style="font-size: 16px; font-weight: 700; color: var(--color-primary-text);">
          ${isUr ? `"${query}" کے لیے کوئی پارہ نہیں ملا` : `No Juz found for "${query}"`}
        </p>
        <p class="muted" style="font-size: 13px; margin-top: 8px;">
          ${isUr ? "پارہ کا نمبر یا نام تلاش کرنے کی کوشش کریں" : "Try searching by juz number or name"}
        </p>
      </div>
    `;
  }

  return `
    <div class="juz-grid">
      ${filtered.map((j) => {
    const arName = j.nameAr || "";
    const urName = j.nameUr || (isUr ? `پارہ <span class="urdu-num">${toUrduDigits(j.number)}</span>` : `Juz ${j.number}`);
    return `
        <button type="button" class="juz-card-v2" data-surah="${j.start.surah}" data-ayah="${j.start.ayah}">
          <div class="juz-card-medallion">
            ${UIComponents.getAyahMedallionSvg(j.number, 44)}
          </div>
          <div class="juz-card-info">
            <span class="juz-card-en">${j.nameEn}</span>
            <span class="juz-card-meta">${isUr ? `<span>سورت</span> <bdi dir="ltr"><span class="urdu-num">${toUrduDigits(j.start.surah)}</span>:<span class="urdu-num">${toUrduDigits(j.start.ayah)}</span></bdi> <span>سے</span>` : `<span>Surah</span> <bdi dir="ltr">${j.start.surah}:${j.start.ayah}</bdi> <span>onward</span>`}</span>
          </div>
          <div class="juz-card-ur" lang="ur" dir="rtl">${urName}</div>
        </button>
      `;
  }).join("")}
    </div>
  `;
}
