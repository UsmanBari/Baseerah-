/* Baseerah — About & Sources Screen */
import { state } from "../core/state.js";
import { t } from "../core/i18n.js";
import { router } from "../core/router.js";

export function renderAboutScreen(container) {
  const isUr = state.lang === "ur";

  container.innerHTML = `
    <div class="screen active screen-about" dir="${isUr ? "rtl" : "ltr"}">
      <header class="about-header">
        <button type="button" class="btn-icon btn-back" data-nav="home" aria-label="${t("home", state.lang)}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${isUr ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>'}
          </svg>
          <span>${t("home", state.lang)}</span>
        </button>
        <div class="header-title-box">
          <h2>${isUr ? "ذرائع، اسناد اور قانونی تصدیق" : "Sources, Attributions & Compliance"}</h2>
          <p class="muted">Baseerah (بصيرة) v1.0.0 — Commercial Mosque Kiosk Edition</p>
        </div>
      </header>

      <div class="about-content">
        <div class="about-card hero-card">
          <h3 lang="ar" dir="rtl">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ</h3>
          <p class="about-p">
            ${isUr 
              ? "بصیرت ایک وقف و تجارتی معیار کا انٹرایکٹو کیوسک پلیٹ فارم ہے جس کا مقصد پاکستان اور دنیا بھر کی مساجد اور پبلک مقامات پر قرآن کریم کی درست تلاوت، لفظ بہ لفظ فہم اور نماز کی بنیادی تعلیم کو آسان بنانا ہے۔"
              : "Baseerah is a commercial-grade interactive kiosk system designed for mosques and public institutions in Pakistan to provide word-by-word Quran learning and prayer education with absolute textual authenticity."
            }
          </p>
        </div>

        <div class="about-section">
          <h3>${isUr ? "قرآنی متن کے ماخذ اور اسناد" : "Quran Text Sources & Attributions"}</h3>
          
          <div class="about-card">
            <h4>1. Tanzil Project (تنزيل) — Ground Truth Arabic</h4>
            <p><strong>License:</strong> Creative Commons Attribution 3.0 Unported (CC BY 3.0).</p>
            <p><strong>Attribution:</strong> Tanzil Quran Text Copyright © 2007–2024 Tanzil Project. Tanzil Uthmani text serves as the unalterable verification ground truth for all 6,236 ayahs.</p>
          </div>

          <div class="about-card">
            <h4>2. Quranic Universal Library (QUL) by Tarteel AI</h4>
            <p><strong>Resources:</strong> Script 59 (Indo-Pak Nastaleeq WBW), Script 89 (Indo-Pak Nastaleeq Ayahs), Translation 93 (Urdu WBW), Translation 92 (English WBW).</p>
            <p><strong>Attribution:</strong> Courtesy of Tarteel AI and the open Quran research community.</p>
          </div>

          <div class="about-card">
            <h4>3. Indo-Pak Nastaleeq Typography</h4>
            <p><strong>Font:</strong> AlQuran IndoPak by QuranWBW (v2.100) by Ayman Siddiqui.</p>
            <p><strong>Notice:</strong> Complete 435 PUA glyph mappings for South Asian Nastaleeq calligraphic ligatures. Commercial use permissions initiated by Acme One.</p>
          </div>

          <div class="about-card">
            <h4>4. Full Ayah Translations (QuranEnc)</h4>
            <p><strong>Urdu:</strong> Maulana Muhammad Junagarhi (urdu_junagarhi), verified by King Fahd Glorious Quran Printing Complex.</p>
            <p><strong>English:</strong> Saheeh International (english_saheeh).</p>
          </div>
        </div>

        <div class="about-section">
          <h3>${isUr ? "حکومتِ پنجاب قرآن ایکٹ اور قانونی تصدیق" : "Legal Compliance (Punjab Holy Quran Act 2011)"}</h3>
          <div class="about-card">
            <p>
              ${isUr
                ? "پنجاب قرآن ایکٹ ۲۰۱۱ (ترمیم ۲۰۲۱) کے تحت ڈیجیٹل قرآن ایپس اور کیوسک کے لیے صوبائی قرآن بورڈ کی باقاعدہ تصدیق ضروری ہے۔ بصیرت کے تمام ۶،۲۳۶ آیات کے ریکارڈز خودکار چیکس کے ذریعے تصدیق شدہ ہیں اور حفاظ کرام و علماء کے پینل کے لیے باقاعدہ جائزہ شیٹس (review.html اور board_review_quran.html) شامل کی گئی ہیں۔"
                : "Under the Punjab Holy Quran (Printing and Recording) Act 2011 (amended 2021), electronic copies of the Holy Quran must adhere to strict error-free standards and certified proofreading. Baseerah provides built-in board export formats for provincial Quran Board certification."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector("[data-nav='home']").addEventListener("click", () => {
    router.navigate("home");
  });
}
