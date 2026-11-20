/* Baseerah — Home Screen (Baseerah v2 Split Hero Redesign) */
import { state } from "../core/state.js";
import { t, toUrduDigits } from "../core/i18n.js";
import { router } from "../core/router.js";
import { UIComponents } from "../ui/components.js";

let tapCount = 0;
let tapTimer = null;
let featuredInterval = null;
let currentFeaturedIndex = 0;
let featuredAyahs = [];

export async function renderHomeScreen(container) {
  const isUr = state.lang === "ur";
  const bismillah = window.BASEERAH_BISMILLAH || "";

  // Clear existing rotation timer if any
  if (featuredInterval) {
    clearInterval(featuredInterval);
    featuredInterval = null;
  }

  // Load featured ayahs if not already loaded
  if (!featuredAyahs || featuredAyahs.length === 0) {
    try {
      const resp = await fetch("data/featured_ayahs.json");
      if (resp.ok) {
        featuredAyahs = await resp.json();
      }
    } catch (e) {
      console.warn("Could not load featured ayahs:", e);
    }
  }

  const cleanArabic = (rawAr) => {
    if (!rawAr) return "";
    return rawAr.replace(/[\s\uf500-\uf65d\u0660-\u0669\u06dd\u06de\u06df]+$/, "").trim();
  };

  const renderTransWithFootnotes = (rawText, lang) => {
    if (!rawText) return "—";
    return rawText.replace(/\[(\d+)\]/g, (match, p1) => {
      return `<sup class="fn-sup" data-fn="${p1}" data-lang="${lang}">[${p1}]</sup>`;
    });
  };

  const currentAyah = (featuredAyahs && featuredAyahs.length > 0)
    ? featuredAyahs[currentFeaturedIndex % featuredAyahs.length]
    : {
        surah: 1,
        ayah: 1,
        surahNameAr: "الفاتحة",
        surahNameEn: "Al-Fatihah",
        themeEn: "The Opening",
        themeUr: "فاتحۃ الکتاب",
        ar: bismillah,
        ur: "شروع کرتا ہوں اللہ تعالیٰ کے نام سے جو بڑا مہربان نہایت رحم والا ہے۔",
        en: "In the name of Allah, the Entirely Merciful, the Especially Merciful."
      };

  const currentCleanAr = cleanArabic(currentAyah.ar);
  const currentUrHtml = renderTransWithFootnotes(currentAyah.ur, "ur");
  const currentEnHtml = renderTransWithFootnotes(currentAyah.en, "en");

  container.innerHTML = `
    <div class="screen active screen-home-v2" dir="${isUr ? "rtl" : "ltr"}">
      <div class="split-hero-container">
        
        <!-- LEFT HERO PANEL (~40% width, deep emerald + 8-point star pattern) -->
        <aside class="hero-panel-emerald" role="region" aria-label="Baseerah Brand & Daily Verse">
          <div class="hero-top">
            <div class="hero-brand-group">
              <div class="hero-logo-box" id="brand-logo" tabindex="0" role="button" aria-label="Baseerah Admin Gateway">
                <span class="hero-calligraphy-gold" lang="ur">بصيرة</span>
                <h1 class="hero-title-en">Baseerah</h1>
                <p class="hero-tagline">${t("tagline", state.lang)}</p>
              </div>
            </div>
          </div>

          <!-- Ayah of the Moment Card (rotates every 20s with cross-fade) -->
          <div class="ayah-moment-card" id="ayah-moment-card" role="button" tabindex="0"
               data-nav="quran/${currentAyah.surah}/${currentAyah.ayah}"
               aria-label="${t("ayahOfTheMoment", state.lang)}">
            <div class="moment-header">
              <span class="moment-label">
                <span class="moment-dot"></span>
                ${t("ayahOfTheMoment", state.lang)}
              </span>
              <span class="moment-ref-badge">
                ${isUr ? `${currentAyah.surahNameAr} <span class="urdu-num">${toUrduDigits(currentAyah.surah)}</span>:<span class="urdu-num">${toUrduDigits(currentAyah.ayah)}</span>` : `${currentAyah.surahNameEn} ${currentAyah.surah}:${currentAyah.ayah}`}
              </span>
            </div>
            <div class="moment-arabic" lang="ar" dir="rtl">
              <span class="moment-ar-text">${currentCleanAr}</span>
              ${UIComponents.getAyahMedallionSvg(currentAyah.ayah, 36)}
            </div>
            <div class="moment-translations">
              <p class="moment-ur" lang="ur" dir="rtl">${currentUrHtml}</p>
              <p class="moment-en" dir="ltr">${currentEnHtml}</p>
            </div>
            <div class="moment-hint">
              <span>${isUr ? "پورا پڑھنے کے لیے چھوئیں ‹" : "Tap to read ›"}</span>
            </div>
          </div>
        </aside>

        <!-- RIGHT MAIN PANEL (~60% width) -->
        <main class="home-main-panel">
          <header class="home-top-bar">
            <div class="welcome-box">
              <h2 class="welcome-text">${t("welcome", state.lang)}</h2>
              <span class="welcome-sub">${t("touchToBegin", state.lang)}</span>
            </div>

            <div class="lang-toggle-pill lang-toggle" role="group" aria-label="Language selection">
              <button type="button" class="lang-pill-btn lang-btn ${state.lang === "ur" ? "active" : ""}" data-lang="ur">اردو</button>
              <button type="button" class="lang-pill-btn lang-btn ${state.lang === "en" ? "active" : ""}" data-lang="en">English</button>
            </div>
          </header>

          <div class="home-tiles-grid">
            <!-- 1. WIDE TOP TILE: Understand the Quran (Word by Word) with LIVE PREVIEW -->
            <button type="button" class="home-v2-tile tile-wide-wbw" data-nav="surahs">
              <div class="tile-content">
                <div class="tile-icon-badge gold-badge">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    <line x1="8" y1="7" x2="16" y2="7"/>
                    <line x1="8" y1="11" x2="16" y2="11"/>
                  </svg>
                </div>
                <div class="tile-text-group">
                  <h3 class="tile-title">${t("understandQuranTitle", state.lang)}</h3>
                  <p class="tile-desc">${t("understandQuranSub", state.lang)}</p>
                </div>
              </div>

              <!-- Live 2-tile interlinear preview -->
              <div class="tile-live-preview" dir="rtl" aria-hidden="true">
                <div class="mini-wbw-tile">
                  <span class="mini-ar" lang="ar">بِسْمِ</span>
                  <div class="mini-divider"></div>
                  <span class="mini-ur" lang="ur">ساتھ نام</span>
                  <span class="mini-en">In name</span>
                </div>
                <div class="mini-wbw-tile">
                  <span class="mini-ar" lang="ar">اللّٰهِ</span>
                  <div class="mini-divider"></div>
                  <span class="mini-ur" lang="ur">اللہ کے</span>
                  <span class="mini-en">of Allah</span>
                </div>
              </div>
            </button>

            <!-- 2. EMERALD TILE: Learn Namaz -->
            <button type="button" class="home-v2-tile tile-namaz-emerald" data-nav="namaz">
              <div class="tile-namaz-top">
                <div class="tile-icon-badge gold-badge-solid">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3c2.5 2 4 4 4 6.5H8C8 7 9.5 5 12 3z"/>
                    <path d="M6 21V11h12v10"/>
                    <path d="M10 21v-4a2 2 0 0 1 4 0v4"/>
                    <path d="M3 21h18"/>
                  </svg>
                </div>
                <span class="tile-badge-tag">${isUr ? "جامع رہنما" : "Guide"}</span>
              </div>
              <div class="tile-text-group">
                <h3 class="tile-title-gold">${t("namazCardUr", state.lang)}</h3>
                <p class="tile-desc-light">${t("namazCardSub", state.lang)}</p>
              </div>
            </button>

            <!-- 3. TWO STACKED TILES: Surahs & Paras + Go to Ayah Keypad -->
            <div class="home-subtiles-column">
              <!-- Surahs & Paras Tile -->
              <button type="button" class="home-v2-tile tile-subtile" data-nav="surahs">
                <div class="subtile-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <div class="subtile-text">
                  <h4>${t("surahsAndParas", state.lang)}</h4>
                  <span class="subtile-hint">${isUr ? "۱۱۴ سورتیں · ۳۰ پارے" : "114 Surahs · 30 Paras"}</span>
                </div>
              </button>

              <!-- Go To Ayah Tile (Keypad) -->
              <button type="button" class="home-v2-tile tile-subtile" id="home-goto-ayah-btn">
                <div class="subtile-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-cream)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="12 8 8 12 12 16 12 8"/>
                  </svg>
                </div>
                <div class="subtile-text">
                  <h4>${t("gotoAyah", state.lang)}</h4>
                  <span class="subtile-hint">${isUr ? "سورت اور آیت نمبر درج کریں" : "Numeric Touch Keypad"}</span>
                </div>
              </button>
            </div>
          </div>

          <footer class="home-v2-footer">
            <button type="button" class="footer-about-link" data-nav="about">
              ${t("about", state.lang)}
            </button>
          </footer>
        </main>
      </div>
    </div>
  `;

  // Start 20s cross-fade rotation for Ayah of the Moment
  if (featuredAyahs && featuredAyahs.length > 1) {
    featuredInterval = setInterval(() => {
      currentFeaturedIndex = (currentFeaturedIndex + 1) % featuredAyahs.length;
      const nextAyah = featuredAyahs[currentFeaturedIndex];
      const card = container.querySelector("#ayah-moment-card");
      if (card) {
        card.classList.add("fade-out");
        setTimeout(() => {
          card.setAttribute("data-nav", `quran/${nextAyah.surah}/${nextAyah.ayah}`);
          const badge = card.querySelector(".moment-ref-badge");
          if (badge) {
            badge.innerHTML = isUr
              ? `${nextAyah.surahNameAr} <span class="urdu-num">${toUrduDigits(nextAyah.surah)}</span>:<span class="urdu-num">${toUrduDigits(nextAyah.ayah)}</span>`
              : `${nextAyah.surahNameEn} ${nextAyah.surah}:${nextAyah.ayah}`;
          }
          const ar = card.querySelector(".moment-arabic");
          if (ar) {
            ar.innerHTML = `
              <span class="moment-ar-text">${cleanArabic(nextAyah.ar)}</span>
              ${UIComponents.getAyahMedallionSvg(nextAyah.ayah, 36)}
            `;
          }
          const ur = card.querySelector(".moment-ur");
          if (ur) ur.innerHTML = renderTransWithFootnotes(nextAyah.ur, "ur");
          const en = card.querySelector(".moment-en");
          if (en) en.innerHTML = renderTransWithFootnotes(nextAyah.en, "en");
          card.classList.remove("fade-out");
        }, 300);
      }
    }, 20000);
  }

  // Navigation handlers
  container.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", () => {
      if (featuredInterval) clearInterval(featuredInterval);
      router.navigate(el.getAttribute("data-nav"));
    });
  });

  // Keypad trigger
  const gotoBtn = container.querySelector("#home-goto-ayah-btn");
  if (gotoBtn) {
    gotoBtn.addEventListener("click", () => {
      UIComponents.showKeypadDialog({
        currentSurah: 1,
        maxAyahs: 7,
        onJump: (s, a) => {
          if (featuredInterval) clearInterval(featuredInterval);
          router.navigate(`quran/${s}/${a}`);
        }
      });
    });
  }

  // Language switch
  container.querySelectorAll(".lang-pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.lang = btn.getAttribute("data-lang");
      renderHomeScreen(container);
    });
  });

  // Hidden Admin Trigger: 5 rapid clicks on logo box within 3 seconds
  const logoBox = container.querySelector(".hero-logo-box");
  const logoBrand = container.querySelector("#brand-logo");
  const onLogoTap = () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      tapCount = 0;
    }, 3000);

    if (tapCount >= 5) {
      tapCount = 0;
      clearTimeout(tapTimer);
      UIComponents.showAdminPinDialog(() => {
        if (featuredInterval) clearInterval(featuredInterval);
        router.navigate("admin");
      });
    }
  };
  if (logoBox) logoBox.addEventListener("click", onLogoTap);
  if (logoBrand) logoBrand.addEventListener("click", onLogoTap);

  // Background pre-cache popular surahs for instantaneous opening
  preloadPopularSurahs();
}

const POPULAR_SURAHS = [1, 2, 18, 36, 55, 56, 67, 78, 112, 113, 114];
let preloadingStarted = false;

function preloadPopularSurahs() {
  if (preloadingStarted) return;
  preloadingStarted = true;

  const queue = [...POPULAR_SURAHS];
  function fetchNext() {
    if (queue.length === 0) return;
    const sNum = queue.shift();
    if (state.surahCache.has(sNum)) {
      fetchNext();
      return;
    }
    const padded = String(sNum).padStart(3, "0");
    fetch(`data/surahs/${padded}.js`)
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => {
        if (!text) return;
        const jsonStr = text.replace(/^window\.BASEERAH_SURAH\s*=\s*/, "").replace(/;\s*$/, "");
        try {
          const data = JSON.parse(jsonStr);
          state.surahCache.set(sNum, data);
        } catch (e) {
          console.warn("Pre-cache parse error for surah", sNum, e);
        }
      })
      .catch(() => {})
      .finally(() => {
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(fetchNext, { timeout: 2000 });
        } else {
          setTimeout(fetchNext, 120);
        }
      });
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(fetchNext, { timeout: 1500 });
  } else {
    setTimeout(fetchNext, 500);
  }
}
