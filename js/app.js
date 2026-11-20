/* Baseerah — kiosk app logic (plain JS, no build step) */
(function () {
  "use strict";

  var IDLE_MS = 90 * 1000; // go back to Home after 90s with no touch

  var UI = {
    en: {
      tagline: "Insight into Namaz & Quran",
      touchToBegin: "Touch a card to begin",
      namazSub: "Step by step — what to do and what to recite",
      quranSub: "Every ayah, word by word, in Urdu and English",
      home: "Home",
      tapWord: "Tap a word",
      selectedWord: "Selected word",
      urduMeaning: "Urdu meaning",
      englishMeaning: "English meaning",
      fullTranslation: "Full ayah translation",
      prevAyah: "Previous ayah",
      nextAyah: "Next ayah",
      sampleNote: "Sample data — replace with Tanzil / QUL / QuranEnc",
      howToPray: "How to pray · tap a step",
      draft: "Draft · scholar review pending",
      whatToRecite: "What to recite",
      ayahOf: function (n, t) { return "Ayah " + n + " of " + t; },
      step: "Step"
    },
    ur: {
      tagline: "نماز اور قرآن کی بصیرت",
      touchToBegin: "شروع کرنے کے لیے کارڈ کو چھوئیں",
      namazSub: "قدم بہ قدم — کیا کریں اور کیا پڑھیں",
      quranSub: "ہر آیت، لفظ بہ لفظ، اردو اور انگریزی میں",
      home: "واپس",
      tapWord: "کسی لفظ کو چھوئیں",
      selectedWord: "منتخب لفظ",
      urduMeaning: "اردو معنی",
      englishMeaning: "انگریزی معنی",
      fullTranslation: "مکمل آیت کا ترجمہ",
      prevAyah: "پچھلی آیت",
      nextAyah: "اگلی آیت",
      sampleNote: "نمونہ ڈیٹا",
      howToPray: "نماز کا طریقہ · کسی قدم کو چھوئیں",
      draft: "مسودہ · عالم کا جائزہ باقی",
      whatToRecite: "کیا پڑھیں",
      ayahOf: function (n, t) { return "آیت " + n + " / " + t; },
      step: "قدم"
    }
  };

  var state = { lang: "ur", screen: "home", surah: 0, ayah: 0, word: 0, step: 2 };
  var idleTimer = null;

  function $(id) { return document.getElementById(id); }
  function t(key) { return UI[state.lang][key]; }

  /* ---------- navigation ---------- */
  function go(screen) {
    state.screen = screen;
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    $("screen-" + screen).classList.add("active");
    if (screen === "quran") renderQuran();
    if (screen === "namaz") renderNamaz();
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
        el.style.lineHeight = lang === "ur" ? "2" : "";
      }
    });
    if (state.screen === "quran") renderQuran();
    if (state.screen === "namaz") renderNamaz();
  }

  /* ---------- quran ---------- */
  function renderQuran() {
    var surah = window.QURAN_DATA.surahs[state.surah];
    var ayah = surah.ayahs[state.ayah];
    var wi = Math.min(state.word, ayah.words.length - 1);

    $("surah-ar").textContent = surah.nameAr;
    $("surah-sub").textContent = surah.nameEn + " · " + t("ayahOf")(ayah.number, surah.ayahs.length);

    var box = $("ayah-words");
    box.innerHTML = "";
    ayah.words.forEach(function (w, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "word-btn" + (i === wi ? " selected" : "");
      b.textContent = w.ar;
      b.addEventListener("click", function () { state.word = i; renderQuran(); });
      box.appendChild(b);
    });

    var sel = ayah.words[wi];
    $("sel-ar").textContent = sel.ar;
    $("sel-ur").textContent = sel.ur;
    $("sel-en").textContent = sel.en;
    $("ayah-ur").textContent = ayah.ur;
    $("ayah-en").textContent = ayah.en;

    $("prev-ayah").disabled = state.ayah === 0;
    $("next-ayah").disabled = state.ayah === surah.ayahs.length - 1;
  }

  function moveAyah(delta) {
    var surah = window.QURAN_DATA.surahs[state.surah];
    var next = state.ayah + delta;
    if (next < 0 || next >= surah.ayahs.length) return;
    state.ayah = next;
    state.word = 0;
    renderQuran();
  }

  /* ---------- namaz ---------- */
  function renderNamaz() {
    var steps = window.NAMAZ_STEPS;
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
    $("step-label").textContent = t("step") + " " + (state.step + 1) + " · " + c.en;
    $("step-how-en").textContent = c.how;
    $("step-how-ur").textContent = c.howUr;
    $("step-ar").textContent = c.ar;
    $("step-ar-ur").textContent = c.arUr;
  }

  /* ---------- kiosk: idle reset ---------- */
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      state.ayah = 0; state.word = 0; state.step = 2;
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
