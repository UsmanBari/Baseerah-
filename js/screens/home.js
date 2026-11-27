/* Baseerah — Home Screen (Baseerah v2 Split Hero Redesign) */
import { state } from "../core/state.js";
import { Storage } from "../core/storage.js";
import { biLabel, ur, t, toUrduDigits } from "../core/i18n.js";
import { router } from "../core/router.js";
import { Icons } from "../ui/icons.js";
import { UIComponents } from "../ui/components.js";
import { PrayerEngine } from "../core/prayer-times.js";
import { NotificationManager } from "../core/notifications.js";
import { formatHijri, getHijriParts } from "../core/hijri.js";
import { ReadingTracker } from "../core/reading-tracker.js";

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

  const prayerData = PrayerEngine.getPrayerTimes(new Date());
  const visibleSections = state.settings.kioskSections || { quran: true, namaz: true, prayerTimes: true };

  const lastRead = Storage.getLastRead();
  const streak = ReadingTracker.streak();
  const khatam = ReadingTracker.plan();
  const progressLine = [
    streak > 0 ? `${Icons.flame(13)} ${t(streak === 1 ? "streakDays1" : "streakDays", state.lang).replace("{n}", streak)}` : "",
    khatam && !khatam.finished ? t("khatamToday", state.lang).replace("{n}", khatam.today).replace("{t}", khatam.target) : ""
  ].filter(Boolean).join(' <span aria-hidden="true">·</span> ');

  // Ramadan: Sehri ends at Fajr, Iftar at Maghrib
  let ramadanHtml = "";
  try {
    if (getHijriParts(new Date()).month === 9 && prayerData && prayerData.fajr && prayerData.maghrib) {
      const now = new Date();
      const iftarNext = now < prayerData.maghrib;
      const target = now < prayerData.fajr ? prayerData.fajr : prayerData.maghrib;
      const mins = Math.max(0, Math.round((target - now) / 60000));
      const left = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
      ramadanHtml = `
          <div class="ramadan-card" role="region" aria-label="Ramadan">
            <div class="ramadan-head">${Icons.moon(18)} <strong>${t("ramadanKareem", state.lang)}</strong> <span class="bi-ur" lang="ur" dir="rtl">${ur("ramadanKareem")}</span></div>
            <div class="ramadan-times">
              <div><span>${t("sehriEnds", state.lang)}</span><strong>${PrayerEngine.formatPrayerTime(prayerData.fajr, state.lang)}</strong></div>
              <div><span>${t("iftar", state.lang)}</span><strong>${PrayerEngine.formatPrayerTime(prayerData.maghrib, state.lang)}</strong></div>
            </div>
            ${iftarNext ? `<p class="ramadan-left">${(now < prayerData.fajr ? t("sehriIn", state.lang) : t("iftarIn", state.lang)).replace("{t}", left)}</p>` : ""}
          </div>`;
    }
  } catch (e) { ramadanHtml = ""; }
  const continueReadingHtml = lastRead ? `
    <div class="continue-reading-container">
      <button type="button" class="btn-continue-reading" data-nav="quran/${lastRead.surah}/${lastRead.ayah}">
        <div class="continue-reading-badge">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <div class="continue-reading-info">
          <span class="continue-reading-label">${t("continueReading", state.lang)}</span>
          ${progressLine ? `<span class="continue-reading-progress">${progressLine}</span>` : ""}
          <span class="continue-reading-ref">${isUr ? `<span>${lastRead.surahNameAr || `سورت <bdi class="urdu-num">${toUrduDigits(lastRead.surah)}</bdi>`}</span> <span aria-hidden="true">·</span> <span>آیت <bdi class="urdu-num">${toUrduDigits(lastRead.ayah)}</bdi></span>` : `<span>${lastRead.surahNameEn || `Surah ${lastRead.surah}`}</span> <span aria-hidden="true">·</span> <span>Ayah ${lastRead.ayah}</span>`}</span>
        </div>
        <span class="continue-reading-arrow">${isUr ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>'}</span>
      </button>
    </div>
  ` : "";

  function heroDateLine() {
    const now = new Date();
    let greg = "", hijri = "";
    try { greg = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }); } catch (e) { greg = now.toDateString(); }
    try { hijri = formatHijri(now); } catch (e) { hijri = ""; }
    return `<span>${greg}</span>${hijri ? `<span class="hdl-dot" aria-hidden="true">·</span><span title="Approximate Hijri date (Umm al-Qura calendar); local moon sighting may differ by a day">${hijri}</span>` : ""}`;
  }

  container.innerHTML = `
    <div class="screen active screen-home-v2" dir="${isUr ? "rtl" : "ltr"}">
      <div class="split-hero-container">
        
        <!-- LEFT HERO PANEL (~40% width, deep emerald + 8-point star pattern) -->
        <aside class="hero-panel-emerald" role="region" aria-label="Baseerah Brand & Daily Verse">
          <div class="hero-top">
            <div class="hero-brand-group">
              <div class="hero-logo-box" id="brand-logo" tabindex="0">
                <span class="hero-calligraphy-gold" lang="ur">بصيرة</span>
                <h1 class="hero-title-en">Baseerah</h1>
                <p class="hero-tagline">${t("tagline", state.lang)}</p>
              </div>
              ${visibleSections.prayerTimes !== false ? `
              <div class="hero-next-prayer" aria-label="${t("nextPrayer", state.lang)}">
                <span class="hnp-label">${t("nextPrayer", state.lang)}</span>
                <span class="hnp-name">${t(prayerData.nextPrayer, state.lang)} <bdi dir="ltr">${PrayerEngine.formatPrayerTime(prayerData.nextPrayerTime, state.lang)}</bdi></span>
                <span class="hnp-left">${PrayerEngine.formatCountdown(prayerData.remainingMinutes, state.lang)}</span>
              </div>` : ""}
            </div>
          </div>

          <div class="hero-date-line">${heroDateLine()}</div>

          <!-- Ayah of the Moment Card (rotates every 20s with cross-fade) -->
          <div class="ayah-moment-card" id="ayah-moment-card" role="button" tabindex="0"
               data-nav="quran/${currentAyah.surah}/${currentAyah.ayah}">
            <div class="moment-header">
              <span class="moment-label">
                <span class="moment-dot"></span>
                ${t("ayahOfTheMoment", state.lang)}
              </span>
              <span class="moment-ref-badge">
                ${isUr ? `<span>${currentAyah.surahNameAr}</span> <bdi dir="ltr">(<span class="urdu-num">${toUrduDigits(currentAyah.surah)}</span>:<span class="urdu-num">${toUrduDigits(currentAyah.ayah)}</span>)</bdi>` : `<span>${currentAyah.surahNameEn}</span> <bdi dir="ltr">(${currentAyah.surah}:${currentAyah.ayah})</bdi>`}
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
              <span>${isUr ? 'پورا پڑھنے کے لیے چھوئیں <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align: middle;"><polyline points="15 18 9 12 15 6"/></svg>' : 'Tap to read <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align: middle;"><polyline points="9 18 15 12 9 6"/></svg>'}</span>
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
          </header>

          ${continueReadingHtml}

          ${shouldShowAzanPrompt() ? `
          <div class="azan-prompt-card" id="azan-prompt" role="region" aria-label="${t("azanPromptTitle", state.lang)}">
            <span class="azan-prompt-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span>
            <div class="azan-prompt-text">
              <strong>${t("azanPromptTitle", state.lang)} <span class="bi-ur" lang="ur" dir="rtl">${ur("azanPromptTitle")}</span></strong>
              <span>${t("azanPromptSub", state.lang)}</span>
            </div>
            <div class="azan-prompt-actions">
              <button type="button" class="azan-prompt-on" id="azan-prompt-on">${t("azanPromptOn", state.lang)}</button>
              <button type="button" class="azan-prompt-later" id="azan-prompt-later">${t("azanPromptLater", state.lang)}</button>
            </div>
          </div>` : ""}

          <!-- PRAYER TIMES CARD (Next prayer + countdown + 5 daily times) -->
          ${visibleSections.prayerTimes !== false ? `
          <div class="prayer-times-home-card" role="region" aria-label="${t("prayerTimes", state.lang)}">
            <div class="prayer-header">
              <div class="prayer-city-group">
                <span class="prayer-card-icon" aria-hidden="true">${Icons.mosque(20)}</span>
                <span class="prayer-city-name">${prayerData.cityName}</span>
                ${!state.isKiosk ? `
                <button type="button" class="btn-location-geo" id="btn-location-geo" aria-label="${t("useMyLocation", state.lang)}">
                  <span class="geo-icon" aria-hidden="true">${Icons.pin(15)}</span>
                  <span class="geo-text">${t("useMyLocation", state.lang)}</span>
                </button>
                ` : ""}
              </div>
              <div class="next-prayer-countdown">
                <span class="next-prayer-title">${t("nextPrayer", state.lang)}: <strong>${t(prayerData.nextPrayer, state.lang)} (${PrayerEngine.formatPrayerTime(prayerData.nextPrayerTime, state.lang)})</strong></span>
                <span class="countdown-badge">${PrayerEngine.formatCountdown(prayerData.remainingMinutes, state.lang)}</span>
              </div>
            </div>
            <div class="prayer-times-grid">
              ${[
                { key: "fajr", name: t("fajr", state.lang), time: prayerData.fajr, iqamah: prayerData.iqamah.fajr },
                { key: "dhuhr", name: t("dhuhr", state.lang), time: prayerData.dhuhr, iqamah: prayerData.iqamah.dhuhr },
                { key: "asr", name: t("asr", state.lang), time: prayerData.asr, iqamah: prayerData.iqamah.asr },
                { key: "maghrib", name: t("maghrib", state.lang), time: prayerData.maghrib, iqamah: prayerData.iqamah.maghrib },
                { key: "isha", name: t("isha", state.lang), time: prayerData.isha, iqamah: prayerData.iqamah.isha }
              ].map(p => `
                <div class="prayer-time-item ${prayerData.nextPrayer === p.key ? "is-next" : ""} ${prayerData.currentPrayer === p.key ? "is-current" : ""}">
                  <span class="pt-name">${p.name}</span><span class="pt-name-ur" lang="ur">${ur(p.key)}</span>
                  <span class="pt-time">${PrayerEngine.formatPrayerTime(p.time, state.lang, false)}<span class="pt-ampm">${(p.time instanceof Date && p.time.getHours() >= 12) ? "PM" : "AM"}</span></span>
                  ${p.iqamah ? `<span class="pt-iqamah"><span>${t("jamaat", state.lang)}:</span> ${PrayerEngine.formatPrayerTime(p.iqamah, state.lang)}</span>` : ""}
                </div>
              `).join("")}
            </div>
          </div>
          ` : ""}

          ${ramadanHtml}

          <nav class="home-tools" aria-label="${t("homeTools", state.lang)}">
            <button type="button" class="home-tool" data-nav="learn">${Icons.cards(22)}<span>${t("toolLearn", state.lang)}</span></button>
            <button type="button" class="home-tool" data-nav="plan">${Icons.calendar(22)}<span>${t("toolPlan", state.lang)}</span></button>
            <button type="button" class="home-tool" data-nav="qibla">${Icons.compass(22)}<span>${t("toolQibla", state.lang)}</span></button>
            <button type="button" class="home-tool" data-nav="tasbeeh">${Icons.beads(22)}<span>${t("toolTasbeeh", state.lang)}</span></button>
          </nav>

          <div class="home-tiles-grid">
            <!-- 1. WIDE TOP TILE: Understand the Quran (Word by Word) with LIVE PREVIEW -->
            ${visibleSections.quran !== false ? `
            <button type="button" class="home-v2-tile tile-wide-wbw" data-nav="quran/${lastRead ? `${lastRead.surah}/${lastRead.ayah}` : "1/1"}">
              <div class="tile-content">
                <div class="tile-icon-badge gold-badge">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    <line x1="8" y1="7" x2="16" y2="7"/>
                    <line x1="8" y1="11" x2="16" y2="11"/>
                  </svg>
                </div>
                <div class="tile-text-group">
                  <h3 class="tile-title">${biLabel("understandQuranTitle", "quranCardUr")}</h3>
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
            ` : ""}

            <!-- 2. EMERALD TILE: Learn Namaz -->
            ${visibleSections.namaz !== false ? `
            <button type="button" class="home-v2-tile tile-namaz-emerald" data-nav="namaz">
              <div class="tile-namaz-top">
                <div class="tile-icon-badge gold-badge-solid">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <path d="M12 3c2.5 2 4 4 4 6.5H8C8 7 9.5 5 12 3z"/>
                    <path d="M6 21V11h12v10"/>
                    <path d="M10 21v-4a2 2 0 0 1 4 0v4"/>
                    <path d="M3 21h18"/>
                  </svg>
                </div>
                <span class="tile-badge-tag">${isUr ? "جامع رہنما" : "Guide"}</span>
              </div>
              <div class="tile-text-group">
                <h3 class="tile-title-gold">${biLabel("namazCardTitle", "namazCardUr")}</h3>
                <p class="tile-desc-light">${t("namazCardSub", state.lang)}</p>
              </div>
            </button>
            ` : ""}

            <!-- 3. TWO STACKED TILES: Surahs & Paras + Go to Ayah Keypad -->
            <div class="home-subtiles-column">
              <!-- Surahs & Paras Tile -->
              <button type="button" class="home-v2-tile tile-subtile" data-nav="surahs">
                <div class="subtile-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <div class="subtile-text">
                  <h4>${biLabel("surahsAndParas")}</h4>
                  <span class="subtile-hint">${isUr ? "۱۱۴ سورتیں · ۳۰ پارے" : "114 surahs · 30 juz"}</span>
                </div>
              </button>

              <!-- Search Tile -->
              <button type="button" class="home-v2-tile tile-subtile" data-nav="surahs/search">
                <div class="subtile-icon">${Icons.search(24)}</div>
                <div class="subtile-text">
                  <h4>${biLabel("searchQuran")}</h4>
                  <span class="subtile-hint">${t("searchQuranSub", state.lang)}</span>
                </div>
              </button>

              <!-- Bookmarks Tile -->
              <button type="button" class="home-v2-tile tile-subtile" id="home-bookmarks-btn">
                <div class="subtile-icon">${Icons.bookmark(24)}</div>
                <div class="subtile-text">
                  <h4>${biLabel("bookmarks")}</h4>
                  <span class="subtile-hint">${t("bookmarksSub", state.lang)}</span>
                </div>
              </button>

              <!-- Settings Tile -->
              <button type="button" class="home-v2-tile tile-subtile" id="home-settings-btn">
                <div class="subtile-icon">${Icons.settings(24)}</div>
                <div class="subtile-text">
                  <h4>${biLabel("appSettings")}</h4>
                  <span class="subtile-hint">${t("appSettingsSub", state.lang)}</span>
                </div>
              </button>

              <!-- Go To Ayah Tile (Keypad) -->
              <button type="button" class="home-v2-tile tile-subtile" id="home-goto-ayah-btn">
                <div class="subtile-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-cream)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="12 8 8 12 12 16 12 8"/>
                  </svg>
                </div>
                <div class="subtile-text">
                  <h4>${biLabel("gotoAyah")}</h4>
                  <span class="subtile-hint">${isUr ? "سورت اور آیت نمبر درج کریں" : "Jump to any surah and ayah"}</span>
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
              ? `<span>${nextAyah.surahNameAr}</span> <bdi dir="ltr">(<span class="urdu-num">${toUrduDigits(nextAyah.surah)}</span>:<span class="urdu-num">${toUrduDigits(nextAyah.ayah)}</span>)</bdi>`
              : `<span>${nextAyah.surahNameEn}</span> <bdi dir="ltr">(${nextAyah.surah}:${nextAyah.ayah})</bdi>`;
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
  const bmBtn = container.querySelector("#home-bookmarks-btn");
  if (bmBtn) {
    bmBtn.addEventListener("click", () => {
      UIComponents.showBookmarksModal((s, a) => {
        if (featuredInterval) clearInterval(featuredInterval);
        router.navigate(`quran/${s}/${a}`);
      });
    });
  }

  const settingsBtn = container.querySelector("#home-settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      if (featuredInterval) clearInterval(featuredInterval);
      router.navigate("settings");
    });
  }

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

  // Wire location geo button
  const geoBtn = container.querySelector("#btn-location-geo");
  if (geoBtn) {
    geoBtn.addEventListener("click", async () => {
      try {
        await PrayerEngine.requestDeviceLocation();
        renderHomeScreen(container);
        UIComponents.showToast(t("locationUpdated", state.lang));
      } catch (err) {
        console.warn("Geolocation request failed:", err);
        UIComponents.showToast("Location access unavailable");
      }
    });
  }

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

  // Azan reminders: one-tap opt-in (browsers require a user tap for permission)
  const azanOn = container.querySelector("#azan-prompt-on");
  const azanLater = container.querySelector("#azan-prompt-later");
  const hideAzanPrompt = () => {
    const card = container.querySelector("#azan-prompt");
    if (card) card.remove();
  };
  if (azanOn) {
    azanOn.addEventListener("click", async () => {
      azanOn.disabled = true;
      const res = await NotificationManager.enableNotifications();
      state.settings.azanPromptDismissed = true;
      saveAzanSettings();
      hideAzanPrompt();
      UIComponents.showToast(res.success ? t("azanPromptDone", state.lang) : t(res.reason === "unsupported" ? "notificationsNotSupported" : "notificationsBlockedHelp", state.lang));
    });
  }
  if (azanLater) {
    azanLater.addEventListener("click", () => {
      state.settings.azanPromptDismissed = true;
      saveAzanSettings();
      hideAzanPrompt();
    });
  }

  // Already allowed on this device (e.g. reinstall) → switch on silently, no prompt needed
  autoEnableIfGranted();

  // Background pre-cache small foundational surah after startup
  preloadPopularSurahs();
}

function notifPermission() {
  try {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) return "unsupported";
    return Notification.permission;
  } catch (e) {
    return "unsupported";
  }
}

function shouldShowAzanPrompt() {
  if (state.isKiosk) return false;
  if (state.prayerNotifications) return false;
  if (state.settings.azanPromptDismissed) return false;
  return notifPermission() === "default";
}

function saveAzanSettings() {
  try { Storage.saveSettings(state.settings); } catch (e) { /* storage may be unavailable */ }
}

let azanAutoChecked = false;
// On first launch, show the phone's own "Allow notifications?" popup automatically.
// Some browsers only allow that popup right after a tap, so if the first try is
// blocked we ask again on the person's first tap anywhere in the app.
// If the person blocked notifications and later allows them in the phone's
// settings, switch reminders on as soon as they come back to the app
// (unless they turned reminders Off themselves inside Baseerah).
function pickUpLaterPermission() {
  if (state.isKiosk || state.prayerNotifications || state.settings.notifUserOff) return;
  if (notifPermission() !== "granted") return;
  NotificationManager.enableNotifications().then((res) => {
    if (!res || !res.success) return;
    state.settings.azanPromptDismissed = true;
    saveAzanSettings();
    const card = document.getElementById("azan-prompt");
    if (card) card.remove();
    UIComponents.showToast(t("azanPromptDone", state.lang));
  }).catch(() => {});
}

function watchPermissionChanges() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pickUpLaterPermission();
  });
  try {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "notifications" }).then((st) => {
        st.onchange = () => pickUpLaterPermission();
      }).catch(() => {});
    }
  } catch (e) { /* not supported */ }
}

function autoEnableIfGranted() {
  if (azanAutoChecked) return;
  azanAutoChecked = true;
  watchPermissionChanges();
  if (notifPermission() === "granted") { pickUpLaterPermission(); return; }
  if (state.isKiosk || state.prayerNotifications || state.settings.azanPromptDismissed) return;
  const perm = notifPermission();
  if (perm === "unsupported" || perm === "denied") return;

  const finish = (res) => {
    if (res && res.success) {
      state.settings.azanPromptDismissed = true;
      saveAzanSettings();
      const card = document.getElementById("azan-prompt");
      if (card) card.remove();
      UIComponents.showToast(t("azanPromptDone", state.lang));
    } else if (notifPermission() === "denied") {
      // Person tapped "Don't allow": respect it, never ask again automatically.
      state.settings.azanPromptDismissed = true;
      saveAzanSettings();
      const card = document.getElementById("azan-prompt");
      if (card) card.remove();
    }
  };

  if (perm === "granted") {
    NotificationManager.enableNotifications().then(finish).catch(() => {});
    return;
  }

  // perm === "default": try right away (works in the installed APK / Chrome)
  NotificationManager.enableNotifications().then((res) => {
    finish(res);
    if (notifPermission() !== "default") return;
    // Blocked for lack of a tap → ask once on the first tap
    const onFirstTap = (e) => {
      document.removeEventListener("pointerup", onFirstTap, true);
      if (e.target && e.target.closest && e.target.closest("#azan-prompt")) return; // card buttons handle themselves
      if (state.prayerNotifications || state.settings.azanPromptDismissed) return;
      NotificationManager.enableNotifications().then(finish).catch(() => {});
    };
    document.addEventListener("pointerup", onFirstTap, true);
  }).catch(() => {});
}

let preloadingStarted = false;

function preloadPopularSurahs() {
  if (preloadingStarted) return;
  preloadingStarted = true;

  // Preload only small foundational Surah 1 (14 KB) after idle delay
  // Do NOT eagerly download 4+ MB of Baqarah and other large surahs during startup
  const queue = [1];
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
      .catch(() => {});
  }

  // Delay by 4 seconds so startup and LCP are completed first
  setTimeout(() => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(fetchNext, { timeout: 3000 });
    } else {
      setTimeout(fetchNext, 1000);
    }
  }, 4000);
}
