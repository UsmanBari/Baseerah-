/* Baseerah — Surahs & Juz List Screen */
import { state } from "../core/state.js";
import { t, toUrduDigits } from "../core/i18n.js";
import { router } from "../core/router.js";

let activeTab = "surahs"; // "surahs" | "juz"
let searchQuery = "";

export function renderSurahListScreen(container, params = []) {
  if (params[0] === "juz") {
    activeTab = "juz";
  }

  const isUr = state.lang === "ur";
  const surahs = window.BASEERAH_INDEX || [];
  const juzList = window.BASEERAH_JUZ || [];

  container.innerHTML = `
    <div class="screen active screen-surahs" dir="${isUr ? "rtl" : "ltr"}">
      <header class="surah-list-header">
        <div class="header-left">
          <button type="button" class="btn-icon btn-back" data-nav="home" aria-label="${t("home", state.lang)}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              ${isUr ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>'}
            </svg>
            <span>${t("home", state.lang)}</span>
          </button>
          <div class="header-title-box">
            <h2>${activeTab === "surahs" ? t("surahListTitle", state.lang) : t("juzListTitle", state.lang)}</h2>
            <p class="muted">${activeTab === "surahs" ? t("surahListSub", state.lang) : t("juzListSub", state.lang)}</p>
          </div>
        </div>

        <div class="list-controls">
          <div class="list-tabs" role="tablist">
            <button type="button" class="tab-btn ${activeTab === "surahs" ? "active" : ""}" data-tab="surahs">
              ${t("surahs", state.lang)} (${isUr ? toUrduDigits(114) : 114})
            </button>
            <button type="button" class="tab-btn ${activeTab === "juz" ? "active" : ""}" data-tab="juz">
              ${t("juz", state.lang)} (${isUr ? toUrduDigits(30) : 30})
            </button>
          </div>
        </div>
      </header>

      <div class="list-search-bar">
        <input type="text" id="surah-search-input" class="search-input" placeholder="${t("searchPlaceholder", state.lang)}" value="${searchQuery}" autocomplete="off">
        ${searchQuery ? '<button type="button" id="clear-search-btn" class="search-clear-btn">✕</button>' : ""}
      </div>

      <div class="list-content-container">
        ${activeTab === "surahs" ? renderSurahGrid(surahs, searchQuery, isUr) : renderJuzGrid(juzList, isUr)}
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
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      const content = container.querySelector(".list-content-container");
      if (content) {
        content.innerHTML = activeTab === "surahs" ? renderSurahGrid(surahs, searchQuery, isUr) : renderJuzGrid(juzList, isUr);
        wireCards(content);
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

function renderSurahGrid(surahs, query, isUr) {
  const filtered = surahs.filter((s) => {
    if (!query) return true;
    const matchNum = String(s.number).includes(query);
    const matchEn = (s.nameEn || "").toLowerCase().includes(query);
    const matchAr = (s.nameAr || "").includes(query);
    return matchNum || matchEn || matchAr;
  });

  if (filtered.length === 0) {
    return `<div class="empty-results">${isUr ? "کوئی سورت نہیں ملی" : "No surahs found"}</div>`;
  }

  return `
    <div class="surah-grid">
      ${filtered.map((s) => `
        <button type="button" class="surah-card" data-surah="${s.number}" data-ayah="1">
          <div class="surah-card-badge">${isUr ? toUrduDigits(s.number) : s.number}</div>
          <div class="surah-card-info">
            <span class="surah-card-en">${s.nameEn}</span>
            <span class="surah-card-meta">${isUr ? toUrduDigits(s.ayahCount) + " آیات" : s.ayahCount + " Ayahs"}</span>
          </div>
          <div class="surah-card-ar" lang="ar" dir="rtl">${s.nameAr}</div>
        </button>
      `).join("")}
    </div>
  `;
}

function renderJuzGrid(juzList, isUr) {
  return `
    <div class="juz-grid">
      ${juzList.map((j) => `
        <button type="button" class="juz-card" data-surah="${j.start.surah}" data-ayah="${j.start.ayah}">
          <div class="juz-card-badge">${isUr ? toUrduDigits(j.number) : j.number}</div>
          <div class="juz-card-info">
            <span class="juz-card-en">${j.nameEn}</span>
            <span class="juz-card-meta">${isUr ? `سورت ${toUrduDigits(j.start.surah)}:${toUrduDigits(j.start.ayah)} سے` : `Surah ${j.start.surah}:${j.start.ayah} onward`}</span>
          </div>
          <div class="juz-card-ur" lang="ur" dir="rtl">${j.nameUr}</div>
        </button>
      `).join("")}
    </div>
  `;
}
