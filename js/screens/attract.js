/* Baseerah — Ambient Mosque Kiosk Attract Screen (Screensaver) */
import { state } from "../core/state.js";
import { Icons } from "../ui/icons.js";
import { t, toUrduDigits } from "../core/i18n.js";
import { router } from "../core/router.js";
import { UIComponents } from "../ui/components.js";
import { PrayerEngine } from "../core/prayer-times.js";

let kioskAyahKeys = null;
let currentAyahIndex = 0;
let clockInterval = null;
let rotationInterval = null;
let burnInStep = 0;

// Burn-in prevention drift offsets (pixels)
const BURN_IN_OFFSETS = [
  { x: 0, y: 0 },
  { x: 8, y: -6 },
  { x: -6, y: 8 },
  { x: 10, y: 6 },
  { x: -8, y: -8 },
  { x: 4, y: 10 },
  { x: -10, y: 4 }
];

async function loadAyahByKey(key) {
  const [sNum, aNum] = key.split(":").map(Number);
  let surahData = state.surahCache.get(sNum);
  if (!surahData) {
    try {
      const padded = String(sNum).padStart(3, "0");
      const resp = await fetch(`data/surahs/${padded}.js`);
      if (resp.ok) {
        const text = await resp.text();
        const jsonStr = text.replace(/^window\.BASEERAH_SURAH\s*=\s*/, "").replace(/;\s*$/, "");
        surahData = JSON.parse(jsonStr);
        state.surahCache.set(sNum, surahData);
      }
    } catch (e) {
      console.warn(`Failed to load surah ${sNum} for kiosk attract:`, e);
    }
  }

  if (surahData && surahData.ayahs) {
    const ayahObj = surahData.ayahs.find((a) => a.number === aNum);
    if (ayahObj) {
      return {
        surah: sNum,
        ayah: aNum,
        surahNameAr: surahData.nameAr,
        surahNameEn: surahData.nameEn,
        ar: (ayahObj.arFull || ayahObj.ar || "").replace(/[\s\uf500-\uf65d\u0660-\u0669\u06dd\u06de\u06df]+$/, "").trim(),
        ur: (ayahObj.ur || "").replace(/\[\d+\]/g, "").trim(),
        en: (ayahObj.en || "").replace(/\[\d+\]/g, "").trim()
      };
    }
  }

  return null;
}

export async function renderAttractScreen(container) {
  // Load keys from data/kiosk_ayahs.json
  if (!kioskAyahKeys) {
    try {
      const resp = await fetch("data/kiosk_ayahs.json");
      if (resp.ok) {
        const data = await resp.json();
        kioskAyahKeys = data.ayahs || ["1:1", "1:2", "2:255", "13:28", "94:5", "94:6", "112:1", "114:1"];
      }
    } catch (e) {
      console.warn("Could not load kiosk_ayahs.json:", e);
      kioskAyahKeys = ["1:1", "1:2", "2:255", "13:28", "94:5", "94:6", "112:1", "114:1"];
    }
  }

  const currentKey = kioskAyahKeys[currentAyahIndex % kioskAyahKeys.length];
  const ayahItem = (await loadAyahByKey(currentKey)) || {
    surah: 1,
    ayah: 1,
    surahNameAr: "الفاتحة",
    surahNameEn: "Al-Fatihah",
    ar: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ",
    ur: "شروع کرتا ہوں اللہ تعالیٰ کے نام سے جو بڑا مہربان نہایت رحم والا ہے۔",
    en: "In the name of Allah, the Entirely Merciful, the Especially Merciful."
  };

  const isUr = state.lang === "ur";
  const drift = BURN_IN_OFFSETS[burnInStep % BURN_IN_OFFSETS.length];

  container.innerHTML = `
    <div class="screen active screen-attract ${(ayahItem.ar || "").length > 380 ? "is-very-long" : (ayahItem.ar || "").length > 200 ? "is-long" : ""}" dir="${isUr ? "rtl" : "ltr"}">
      <div class="attract-overlay" style="transform: translate(${drift.x}px, ${drift.y}px); transition: transform 2s ease-in-out;">
        <!-- Live Clock -->
        <div class="attract-clock-box">
          <div class="attract-time" id="attract-live-time">12:00</div>
          <div class="attract-date" id="attract-live-date">...</div>
        </div>

        <!-- Calm Ayah Display (Screen burn-in protected) -->
        <div class="attract-content-box">
          <div class="attract-badge">
            <span class="attract-badge-icon">${Icons.book(16)}</span>
            <span>${t("ayahOfTheMoment", state.lang)}</span>
          </div>

          <div class="attract-surah-meta" dir="${isUr ? 'rtl' : 'ltr'}">
            <span class="kiosk-ref-name" lang="${isUr ? 'ar' : 'en'}">${isUr ? ayahItem.surahNameAr : ayahItem.surahNameEn}</span>
            <span class="kiosk-ref-sep">·</span>
            <span class="kiosk-ref-num"><bdi dir="ltr">${isUr ? toUrduDigits(ayahItem.surah) : ayahItem.surah}:${isUr ? toUrduDigits(ayahItem.ayah) : ayahItem.ayah}</bdi></span>
          </div>
          
          <div class="attract-arabic" lang="ar" dir="rtl">${ayahItem.ar}</div>
          
          <div class="attract-translations">
            <p class="attract-ur" lang="ur" dir="rtl">${ayahItem.ur}</p>
            <p class="attract-en" dir="ltr">${ayahItem.en}</p>
          </div>
        </div>

        <!-- Touch Prompt -->
        <div class="attract-prompt">
          <div class="pulse-ring"></div>
          <span class="prompt-text">${t("touchToWake", state.lang)}</span>
        </div>
      </div>
    </div>
  `;

  // Clock updater
  const updateClock = () => {
    const timeEl = container.querySelector("#attract-live-time");
    const dateEl = container.querySelector("#attract-live-date");
    if (!timeEl || !dateEl) return;

    const now = new Date();
    timeEl.innerHTML = PrayerEngine.formatPrayerTime(now, state.lang);

    const dateOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const rawDate = now.toLocaleDateString(isUr ? "ur-PK-u-nu-latn" : "en-US", dateOptions);
    dateEl.textContent = rawDate
      .replace(/[\u0660-\u0669]/g, (d) => d.charCodeAt(0) - 0x0660)
      .replace(/[\u06F0-\u06F9]/g, (d) => d.charCodeAt(0) - 0x06F0);
  };

  updateClock();
  clearInterval(clockInterval);
  clockInterval = setInterval(updateClock, 1000);

  // Rotate ayah every 60 seconds with slow drift to prevent OLED/kiosk burn-in
  clearInterval(rotationInterval);
  rotationInterval = setInterval(() => {
    if (router.getCurrentScreen() === "attract") {
      currentAyahIndex++;
      burnInStep++;
      renderAttractScreen(container);
    } else {
      clearInterval(rotationInterval);
    }
  }, 60000);

  // Touching anywhere on the attract screen awakens to home
  const wakeHandler = (e) => {
    e.stopPropagation();
    clearInterval(clockInterval);
    clearInterval(rotationInterval);
    router.navigate("home");
  };

  const attractEl = container.querySelector(".screen-attract");
  if (attractEl) {
    attractEl.addEventListener("click", wakeHandler);
  }
}
