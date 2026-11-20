/* Baseerah — kiosk app logic (plain JS, no build step) */
(function () {
  "use strict";

  var IDLE_MS = 90 * 1000; // go back to Home after 90s with no touch

  var SOURCES_TEXT = [
    "BASEERAH (بصيرة) — DATA SOURCES, LICENSES & ATTRIBUTIONS",
    "=======================================================",
    "",
    "1. Tanzil Project (Ground Truth Arabic)",
    "---------------------------------------",
    "Source: Tanzil.net",
    "Resource: Tanzil Uthmani Text (tanzil-uthmani.txt)",
    "License: Creative Commons Attribution 3.0 Unported (CC BY 3.0)",
    "Attribution Text:",
    "  Tanzil Quran Text Copyright © 2007-2024 Tanzil Project.",
    "  License: Creative Commons Attribution 3.0 Unported (CC BY 3.0).",
    "  Any use of the text must be accompanied by an attribution to Tanzil.net.",
    "",
    "2. Quranic Universal Library (QUL) by Tarteel AI",
    "------------------------------------------------",
    "Source: qul.tarteel.ai",
    "Resources:",
    "  - Script 59: Indo-Pak Nastaleeq Script (Word by Word) — Display script",
    "  - Script 89: Indo-Pak Nastaleeq Script (Ayah by Ayah) — Full ayah text",
    "  - Script 56: Uthmani Script (Word by Word) — Uthmani verification",
    "  - Translation 93: Urdu Word-by-Word Meanings",
    "  - Translation 92: English Word-by-Word Meanings",
    "  - Font: Indo-Pak Nastaleeq font (fonts/font.ttf) matching glyph definitions and PUA codes",
    "License: Open Quran Resources / Attribution to Tarteel AI & QUL contributors.",
    "",
    "3. QuranEnc (King Fahd Glorious Quran Printing Complex)",
    "-------------------------------------------------------",
    "Source: quranenc.com",
    "Translations:",
    "  - Urdu: Maulana Muhammad Junagarhi (urdu_junagarhi)",
    "  - English: Saheeh International (english_saheeh)",
    "License: Free distribution for non-profit Islamic education without alteration.",
    "",
    "4. Verification & Validation Summary",
    "------------------------------------",
    "All built data is verified through an automated 6-step validation chain (scripts/build_data.py):",
    "  1. Surah & Ayah Counts: 114 surahs and 6,236 ayahs matching Tanzil.",
    "  2. Full Translations: 100% complete Urdu and English full translations.",
    "  3. Uthmani Verification: QUL Uthmani words joined match Tanzil ayah text byte-for-byte.",
    "  4. Indo-Pak Consistency: QUL script 59 words joined match QUL script 89 ayah text.",
    "  5. Word Alignment: Word positions align strictly across all scripts and translations.",
    "  6. No Markers in Word Lists: Ayah markers cleanly separated."
  ].join("\n");

  var UI = {
    en: {
      tagline: "Insight into Namaz & Quran",
      touchToBegin: "Touch a card to begin",
      namazSub: "Step by step — what to do and what to recite",
      quranSub: "Every ayah, word by word, in Urdu and English",
      home: "Home",
      surahs: "Surahs",
      surahListTitle: "Surahs of the Quran",
      surahListSub: "114 Surahs · Choose a surah to read",
      totalSurahs: "114 Surahs",
      tapWord: "Tap a word",
      selectedWord: "Selected word",
      urduMeaning: "Urdu meaning",
      englishMeaning: "English meaning",
      fullTranslation: "Full ayah translation",
      prevAyah: "Previous ayah",
      nextAyah: "Next ayah",
      howToPray: "How to pray · tap a step",
      draft: "Draft · scholar review pending",
      whatToRecite: "What to recite",
      about: "About & Sources · ذرائع اور اسناد",
      ayahOf: function (n, t) { return "Ayah " + n + " of " + t; },
      ayahsCount: function (n) { return n + " Ayahs"; },
      step: "Step"
    },
    ur: {
      tagline: "نماز اور قرآن کی بصیرت",
      touchToBegin: "شروع کرنے کے لیے کارڈ کو چھوئیں",
      namazSub: "قدم بہ قدم — کیا کریں اور کیا پڑھیں",
      quranSub: "ہر آیت، لفظ بہ لفظ، اردو اور انگریزی میں",
      home: "واپس",
      surahs: "سورتیں",
      surahListTitle: "قرآن مجید کی سورتیں",
      surahListSub: "۱۱۴ سورتیں · پڑھنے کے لیے سورت منتخب کریں",
      totalSurahs: "۱۱۴ سورتیں",
      tapWord: "کسی لفظ کو چھوئیں",
      selectedWord: "منتخب لفظ",
      urduMeaning: "اردو معنی",
      englishMeaning: "انگریزی معنی",
      fullTranslation: "مکمل آیت کا ترجمہ",
      prevAyah: "پچھلی آیت",
      nextAyah: "اگلی آیت",
      howToPray: "نماز کا طریقہ · کسی قدم کو چھوئیں",
      draft: "مسودہ · عالم کا جائزہ باقی",
      whatToRecite: "کیا پڑھیں",
      about: "ذرائع اور اسناد · About",
      ayahOf: function (n, t) { return "آیت " + n + " / " + t; },
      ayahsCount: function (n) { return n + " آیات"; },
      step: "قدم"
    }
  };

  var state = {
    lang: "ur",
    screen: "home",
    surah: 1,      // 1-indexed (1 to 114)
    ayah: 0,       // 0-indexed in surah.ayahs
    word: 0,       // 0-indexed in ayah.words
    step: 2
  };

  var surahCache = {}; // sNum -> surah data
  var idleTimer = null;

  function $(id) { return document.getElementById(id); }
  function t(key) { return UI[state.lang][key]; }

  /* ---------- dynamic data loader (file:// safe) ---------- */
  function loadSurah(sNum, callback) {
    if (surahCache[sNum]) {
      callback(surahCache[sNum]);
      return;
    }
    var script = document.createElement("script");
    var padded = (sNum < 10 ? "00" : sNum < 100 ? "0" : "") + sNum;
    script.src = "data/surahs/" + padded + ".js";
    script.onload = function () {
      if (window.BASEERAH_SURAH && window.BASEERAH_SURAH.number === sNum) {
        surahCache[sNum] = window.BASEERAH_SURAH;
        callback(surahCache[sNum]);
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    script.onerror = function () {
      console.error("Failed to load surah " + sNum);
    };
    document.body.appendChild(script);
  }

  /* ---------- navigation ---------- */
  function go(screen) {
    state.screen = screen;
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    var target = $("screen-" + screen);
    if (target) target.classList.add("active");

    if (screen === "surah-list") renderSurahList();
    if (screen === "quran") renderQuran();
    if (screen === "namaz") renderNamaz();
    if (screen === "about") renderAbout();
  }

  /* ---------- language ---------- */
  function setLang(lang) {
    state.lang = lang;
    document.querySelectorAll(".lang-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
    });
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var val = UI[lang][key];
      if (typeof val === "string") {
        el.textContent = val;
        el.style.fontFamily = lang === "ur" ? "var(--font-ur)" : "";
        el.style.lineHeight = lang === "ur" ? "1.9" : "";
      }
    });

    if (state.screen === "surah-list") renderSurahList();
    if (state.screen === "quran") renderQuran();
    if (state.screen === "namaz") renderNamaz();
  }

  /* ---------- surah list ---------- */
  function renderSurahList() {
    var grid = $("surah-grid");
    if (!grid) return;
    grid.innerHTML = "";

    var index = window.BASEERAH_INDEX || [];
    index.forEach(function (s) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "surah-card";
      btn.innerHTML =
        '<div class="surah-card-badge">' + s.number + '</div>' +
        '<div class="surah-card-info">' +
          '<span class="surah-card-en">' + s.nameEn + '</span>' +
          '<span class="surah-card-count">' + t("ayahsCount")(s.ayahCount) + '</span>' +
        '</div>' +
        '<span class="surah-card-ar" lang="ar" dir="rtl">' + s.nameAr + '</span>';

      btn.addEventListener("click", function () {
        state.surah = s.number;
        state.ayah = 0;
        state.word = 0;
        go("quran");
      });
      grid.appendChild(btn);
    });
  }

  /* ---------- quran ---------- */
  function renderQuran() {
    loadSurah(state.surah, function (surah) {
      if (state.ayah >= surah.ayahs.length) state.ayah = 0;
      var ayah = surah.ayahs[state.ayah];
      var wi = Math.min(state.word, ayah.words.length - 1);
      if (wi < 0) wi = 0;

      $("surah-ar").textContent = surah.nameAr;
      $("surah-sub").textContent = surah.nameEn + " · " + t("ayahOf")(ayah.number, surah.ayahs.length);

      var box = $("ayah-words");
      box.innerHTML = "";
      ayah.words.forEach(function (w, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "word-btn" + (i === wi ? " selected" : "");
        b.textContent = w.ar;
        b.addEventListener("click", function () {
          state.word = i;
          renderQuranWordOnly(ayah, i);
        });
        box.appendChild(b);
      });

      renderQuranWordOnly(ayah, wi);

      $("ayah-ur").textContent = ayah.ur;
      $("ayah-en").textContent = ayah.en;

      var indicator = $("ayah-indicator");
      if (indicator) {
        indicator.textContent = surah.nameEn + " (" + (state.ayah + 1) + "/" + surah.ayahs.length + ")";
      }

      // Previous is disabled only at Surah 1 Ayah 1
      $("prev-ayah").disabled = (state.surah === 1 && state.ayah === 0);
      // Next is disabled only at Surah 114 Ayah 6
      $("next-ayah").disabled = (state.surah === 114 && state.ayah === surah.ayahs.length - 1);
    });
  }

  function renderQuranWordOnly(ayah, wi) {
    var btns = $("ayah-words").querySelectorAll(".word-btn");
    btns.forEach(function (b, idx) {
      b.classList.toggle("selected", idx === wi);
    });

    var sel = ayah.words[wi] || { ar: "", ur: null, en: null };
    $("sel-ar").textContent = sel.ar;

    var urEl = $("sel-ur");
    if (sel.ur != null && sel.ur !== "") {
      urEl.textContent = sel.ur;
      urEl.classList.remove("is-null");
    } else {
      urEl.textContent = "—";
      urEl.classList.add("is-null");
    }

    var enEl = $("sel-en");
    if (sel.en != null && sel.en !== "") {
      enEl.textContent = sel.en;
      enEl.classList.remove("is-null");
    } else {
      enEl.textContent = "—";
      enEl.classList.add("is-null");
    }
  }

  function moveAyah(delta) {
    loadSurah(state.surah, function (surah) {
      if (delta === -1) {
        if (state.ayah > 0) {
          state.ayah--;
          state.word = 0;
          renderQuran();
        } else if (state.surah > 1) {
          state.surah--;
          loadSurah(state.surah, function (prevSurah) {
            state.ayah = prevSurah.ayahs.length - 1;
            state.word = 0;
            renderQuran();
          });
        }
      } else if (delta === 1) {
        if (state.ayah < surah.ayahs.length - 1) {
          state.ayah++;
          state.word = 0;
          renderQuran();
        } else if (state.surah < 114) {
          state.surah++;
          state.ayah = 0;
          state.word = 0;
          renderQuran();
        }
      }
    });
  }

  /* ---------- about & sources ---------- */
  function renderAbout() {
    var contentEl = $("about-content");
    if (contentEl) {
      contentEl.textContent = SOURCES_TEXT;
    }
  }

  /* ---------- namaz ---------- */
  function renderNamaz() {
    var steps = window.NAMAZ_STEPS || [];
    var box = $("namaz-steps");
    box.innerHTML = "";
    steps.forEach(function (s, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "step-btn" + (i === state.step ? " selected" : "");
      b.innerHTML =
        '<span class="step-num"></span>' +
        '<span class="step-ur" lang="ur" dir="rtl"></span>' +
        '<span class="step-en"></span>';
      b.querySelector(".step-num").textContent = t("step") + " " + (i + 1);
      b.querySelector(".step-ur").textContent = s.ur;
      b.querySelector(".step-en").textContent = s.en;
      b.addEventListener("click", function () { state.step = i; renderNamaz(); });
      box.appendChild(b);
    });

    var c = steps[state.step];
    if (c) {
      $("step-label").textContent = t("step") + " " + (state.step + 1) + " · " + c.en;
      $("step-how-en").textContent = c.how;
      $("step-how-ur").textContent = c.howUr;
      $("step-ar").textContent = c.ar;
      $("step-ar-ur").textContent = c.arUr;
    }
  }

  /* ---------- kiosk: idle reset ---------- */
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      state.surah = 1; state.ayah = 0; state.word = 0; state.step = 2;
      go("home");
    }, IDLE_MS);
  }

  /* ---------- wire up ---------- */
  document.querySelectorAll("[data-go]").forEach(function (el) {
    el.addEventListener("click", function () { go(el.getAttribute("data-go")); });
  });
  document.querySelectorAll(".lang-btn").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
  });
  $("prev-ayah").addEventListener("click", function () { moveAyah(-1); });
  $("next-ayah").addEventListener("click", function () { moveAyah(1); });

  ["pointerdown", "keydown"].forEach(function (ev) { document.addEventListener(ev, resetIdle); });
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); }); // no long-press menu on kiosk

  setLang(state.lang);
  resetIdle();
})();
