/* Baseerah — Ambient Attract Screen (Screensaver) */
import { state } from "../core/state.js";
import { t } from "../core/i18n.js";
import { router } from "../core/router.js";

let featuredAyahs = null;
let currentFeaturedIndex = 0;
let clockInterval = null;

export async function renderAttractScreen(container) {
  // Load featured ayahs if needed
  if (!featuredAyahs) {
    try {
      const resp = await fetch("data/featured_ayahs.json");
      featuredAyahs = await resp.json();
    } catch (e) {
      console.warn("Could not load featured ayahs:", e);
      featuredAyahs = [
        {
          surah: 2,
          ayah: 255,
          surahNameAr: "البقرة",
          surahNameEn: "Al-Baqarah",
          themeUr: "آیت الکرسی",
          themeEn: "Ayat al-Kursi",
          ar: "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ",
          ur: "اللہ تعالیٰ ہی معبودِ برحق ہے جس کے سوا کوئی معبود نہیں، جو زندہ اور سب کا تھامنے والا ہے۔",
          en: "Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence."
        }
      ];
    }
  }

  const currentItem = featuredAyahs[currentFeaturedIndex % featuredAyahs.length];
  currentFeaturedIndex++;

  const isUr = state.lang === "ur";

  container.innerHTML = `
    <div class="screen active screen-attract" dir="${isUr ? "rtl" : "ltr"}">
      <div class="attract-overlay">
        <!-- Live Clock -->
        <div class="attract-clock-box">
          <div class="attract-time" id="attract-live-time">12:00</div>
          <div class="attract-date" id="attract-live-date">...</div>
        </div>

        <!-- Featured Ayah Display -->
        <div class="attract-content-box">
          <div class="attract-badge">${t("ayahOfTheMoment", state.lang)} · ${currentItem.themeUr || currentItem.themeEn}</div>
          <div class="attract-surah-meta">
            <span class="meta-ar" lang="ar">${currentItem.surahNameAr}</span>
            <span class="meta-en">Surah ${currentItem.surahNameEn} (${currentItem.surah}:${currentItem.ayah})</span>
          </div>
          
          <div class="attract-arabic" lang="ar" dir="rtl">${currentItem.ar}</div>
          
          <div class="attract-translations">
            <p class="attract-ur" lang="ur" dir="rtl">${currentItem.ur}</p>
            <p class="attract-en" dir="ltr">${currentItem.en}</p>
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
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    timeEl.textContent = `${hours}:${minutes} ${ampm}`;

    const dateOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    dateEl.textContent = now.toLocaleDateString(isUr ? "ur-PK" : "en-US", dateOptions);
  };

  updateClock();
  clearInterval(clockInterval);
  clockInterval = setInterval(updateClock, 1000);

  // Touching anywhere on the attract screen awakens to home
  const wakeHandler = () => {
    clearInterval(clockInterval);
    router.navigate("home");
  };

  container.querySelector(".screen-attract").addEventListener("click", wakeHandler);
}
