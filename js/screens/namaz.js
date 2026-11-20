/* Baseerah — Namaz Screen (Wudu, Step-by-Step, Rakats, Duas) */
import { state } from "../core/state.js";
import { t, toUrduDigits } from "../core/i18n.js";
import { router } from "../core/router.js";

let activeTab = "steps"; // "steps" | "wudu" | "rakats" | "duas"
let selectedStepIndex = 2; // Default to Takbeer
let selectedWuduIndex = 0;

let stepsData = null;
let wuduData = null;
let rakatsData = null;
let duasData = null;

export async function renderNamazScreen(container, params = []) {
  if (params[0]) {
    activeTab = params[0];
  }

  const isUr = state.lang === "ur";

  // Load JSON data files if not yet loaded
  if (!stepsData) {
    try {
      const [sRes, wRes, rRes, dRes] = await Promise.all([
        fetch("data/namaz/steps.json").then((r) => r.json()),
        fetch("data/namaz/wudu.json").then((r) => r.json()),
        fetch("data/namaz/rakats.json").then((r) => r.json()),
        fetch("data/namaz/duas.json").then((r) => r.json())
      ]);
      stepsData = sRes;
      wuduData = wRes;
      rakatsData = rRes;
      duasData = dRes;
    } catch (e) {
      console.warn("Falling back to window.NAMAZ_STEPS:", e);
      stepsData = { steps: window.NAMAZ_STEPS || [] };
    }
  }

  container.innerHTML = `
    <div class="screen active screen-namaz" dir="${isUr ? "rtl" : "ltr"}">
      <header class="namaz-header">
        <div class="header-left">
          <button type="button" class="btn-icon btn-back" data-nav="home" aria-label="${t("home", state.lang)}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              ${isUr ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>'}
            </svg>
            <span>${t("home", state.lang)}</span>
          </button>
          <div class="header-title-box">
            <h2>${t("namazCardUr", state.lang)} · ${t("namazCardTitle", state.lang)}</h2>
            <p class="muted">${t("namazCardSub", state.lang)}</p>
          </div>
        </div>

        <div class="namaz-tab-group" role="tablist">
          <button type="button" class="namaz-tab-btn ${activeTab === "steps" ? "active" : ""}" data-tab="steps">
            ${t("namazTabSteps", state.lang)}
          </button>
          <button type="button" class="namaz-tab-btn ${activeTab === "wudu" ? "active" : ""}" data-tab="wudu">
            ${t("namazTabWudu", state.lang)}
          </button>
          <button type="button" class="namaz-tab-btn ${activeTab === "rakats" ? "active" : ""}" data-tab="rakats">
            ${t("namazTabRakats", state.lang)}
          </button>
          <button type="button" class="namaz-tab-btn ${activeTab === "duas" ? "active" : ""}" data-tab="duas">
            ${t("namazTabDuas", state.lang)}
          </button>
        </div>
      </header>

      <!-- Scholar Review Warning Banner -->
      <div class="scholar-review-banner" role="alert">
        <span class="banner-icon">⚠️</span>
        <span class="banner-text">
          ${isUr 
            ? "مسودہ — باقاعدہ مستند عالم دین کی تصدیق تک زیرِ التواء ہے (نماز کے اذکار اور دعاؤں کی شرعی مراجعت جاری ہے)"
            : "Draft — pending formal review and approval by qualified Islamic scholars. Steps and supplications under verification."
          }
        </span>
      </div>

      <main class="namaz-main-content">
        ${renderActiveTabContent(isUr)}
      </main>
    </div>
  `;

  // Wire back
  container.querySelector("[data-nav='home']").addEventListener("click", () => {
    router.navigate("home");
  });

  // Wire tabs
  container.querySelectorAll(".namaz-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.getAttribute("data-tab");
      renderNamazScreen(container);
    });
  });

  wireTabSpecifics(container, isUr);
}

function renderActiveTabContent(isUr) {
  if (activeTab === "steps") {
    return renderStepsTab(isUr);
  }
  if (activeTab === "wudu") {
    return renderWuduTab(isUr);
  }
  if (activeTab === "rakats") {
    return renderRakatsTab(isUr);
  }
  return renderDuasTab(isUr);
}

function renderStepsTab(isUr) {
  const steps = stepsData?.steps || [];
  const currentStep = steps[selectedStepIndex] || steps[0] || {};

  return `
    <div class="namaz-steps-layout">
      <!-- Steps rail -->
      <div class="namaz-steps-rail">
        ${steps.map((s, idx) => `
          <button type="button" class="rail-step-btn ${idx === selectedStepIndex ? "active" : ""}" data-step-idx="${idx}">
            <span class="rail-num urdu-num">${isUr ? toUrduDigits(idx + 1) : idx + 1}</span>
            <div class="rail-labels">
              <span class="rail-ur" lang="ur">${s.ur}</span>
              <span class="rail-en" dir="ltr">${s.en}</span>
            </div>
          </button>
        `).join("")}
      </div>

      <!-- Step detail card -->
      <div class="namaz-step-detail-card">
        <div class="detail-header">
          <div class="posture-silhouette-box">
            ${renderSilhouetteSvg(currentStep.posture || "standing")}
          </div>
          <div class="step-title-block">
            <span class="step-tag">${t("step", state.lang)} <span class="urdu-num">${isUr ? toUrduDigits(selectedStepIndex + 1) : selectedStepIndex + 1}</span></span>
            <h3 class="step-name-ur" lang="ur">${currentStep.ur}</h3>
            <h4 class="step-name-en" dir="ltr">${currentStep.en}</h4>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="detail-section-title">${t("howToPerform", state.lang)}</h4>
          <p class="detail-text-ur" lang="ur">${currentStep.howUr || ""}</p>
          <p class="detail-text-en" dir="ltr">${currentStep.how || ""}</p>
        </div>

        <div class="detail-section">
          <h4 class="detail-section-title">${t("whatToRecite", state.lang)}</h4>
          ${currentStep.ar ? `
            <div class="detail-arabic-box" lang="ar" dir="rtl">${currentStep.ar}</div>
            <p class="detail-ar-trans" lang="ur" dir="rtl">${currentStep.arUr || ""}</p>
          ` : `
            <div class="pending-scholar-box">
              <span class="pending-icon">⏳</span>
              <span class="pending-text">${isUr ? "متن باقاعدہ شرعی تصدیق کے بعد شامل ہوگا (عالم دین کا جائزہ باقی)" : "Text coming after scholar review"}</span>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderWuduTab(isUr) {
  const steps = wuduData?.steps || [];
  return `
    <div class="wudu-grid">
      ${steps.map((w) => `
        <div class="wudu-card">
          <div class="wudu-step-badge urdu-num">${isUr ? toUrduDigits(w.id) : w.id}</div>
          <h4 class="wudu-title-ur" lang="ur">${w.titleUr}</h4>
          <h5 class="wudu-title-en" dir="ltr">${w.titleEn}</h5>
          <p class="wudu-instruction-ur" lang="ur">${w.instructionUr}</p>
          <p class="wudu-instruction-en" dir="ltr">${w.instructionEn}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function renderRakatsTab(isUr) {
  const prayers = rakatsData?.prayers || [];
  return `
    <div class="rakats-container">
      <div class="rakats-table-card">
        <table class="rakats-table" dir="${isUr ? "rtl" : "ltr"}">
          <thead>
            <tr>
              <th>${isUr ? "نماز" : "Prayer"}</th>
              <th>${isUr ? "وقت" : "Timing"}</th>
              <th>${isUr ? "تفصیل رکعات" : "Rakats Breakdown"}</th>
              <th>${isUr ? "کل رکعات" : "Total"}</th>
            </tr>
          </thead>
          <tbody>
            ${prayers.map((p) => `
              <tr>
                <td><strong>${isUr ? p.nameUr : p.nameEn}</strong></td>
                <td><small>${isUr ? p.timeUr : p.timeEn}</small></td>
                <td>
                  <div class="rakat-breakdown-tags">
                    ${p.rakats.map((r) => `
                      <span class="rakat-tag"><span class="urdu-num">${isUr ? toUrduDigits(r.count) : r.count}</span> ${isUr ? r.typeUr : r.typeEn}</span>
                    `).join(" ")}
                  </div>
                </td>
                <td><span class="total-rakat-badge urdu-num">${isUr ? toUrduDigits(p.total) : p.total}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDuasTab(isUr) {
  const duas = duasData?.duas || [];
  return `
    <div class="duas-list-container">
      ${duas.map((d) => `
        <div class="dua-card" dir="${isUr ? "rtl" : "ltr"}">
          <div class="dua-header">
            <h4 class="dua-title-ur" lang="ur">${d.nameUr}</h4>
            <span class="dua-title-en" dir="ltr">${d.nameEn}</span>
          </div>
          ${d.ar ? `
            <div class="dua-arabic" lang="ar" dir="rtl">${d.ar}</div>
            <div class="dua-translations">
              <p class="dua-ur" lang="ur" dir="rtl">${d.ur}</p>
              <p class="dua-en" dir="ltr">${d.en}</p>
            </div>
          ` : `
            <div class="pending-scholar-box">
              <span class="pending-icon">⏳</span>
              <span class="pending-text">${isUr ? "عربی متن اور ترجمہ باقاعدہ شرعی تصدیق کے بعد شامل ہوگا (عالم دین کا جائزہ باقی)" : "Arabic text and translation coming after scholar review"}</span>
            </div>
          `}
        </div>
      `).join("")}
    </div>
  `;
}

function wireTabSpecifics(container, isUr) {
  if (activeTab === "steps") {
    container.querySelectorAll(".rail-step-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedStepIndex = parseInt(btn.getAttribute("data-step-idx"), 10);
        renderNamazScreen(container);
      });
    });
  }
}

/**
 * Minimalist Line-Art Silhouette SVG for Prayer Postures
 * (No facial features or bodily anatomy - Islamic etiquette compliant)
 */
function renderSilhouetteSvg(posture) {
  switch (posture) {
    case "takbeer":
      return `
        <svg viewBox="0 0 100 120" width="80" height="96" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="50" cy="22" r="10"/>
          <line x1="50" y1="32" x2="50" y2="80"/>
          <!-- Raised hands -->
          <path d="M 32 30 L 32 45 L 50 48 L 68 45 L 68 30"/>
          <!-- Legs -->
          <line x1="42" y1="80" x2="42" y2="115"/>
          <line x1="58" y1="80" x2="58" y2="115"/>
        </svg>
      `;
    case "ruku":
      return `
        <svg viewBox="0 0 120 100" width="96" height="80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <!-- Head & horizontal back -->
          <circle cx="28" cy="45" r="9"/>
          <line x1="37" y1="45" x2="78" y2="45"/>
          <!-- Hands on knees -->
          <line x1="48" y1="45" x2="72" y2="70"/>
          <!-- Standing legs -->
          <line x1="78" y1="45" x2="78" y2="95"/>
          <line x1="86" y1="45" x2="86" y2="95"/>
        </svg>
      `;
    case "sajdah":
      return `
        <svg viewBox="0 0 120 80" width="96" height="64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <!-- Prostrate head on ground -->
          <circle cx="24" cy="62" r="8"/>
          <!-- Back arched down -->
          <path d="M 28 62 C 45 35, 75 35, 85 55 L 85 70"/>
          <!-- Hands on ground -->
          <line x1="35" y1="68" x2="48" y2="68"/>
          <!-- Ground line -->
          <line x1="10" y1="72" x2="110" y2="72" stroke-dasharray="2 2"/>
        </svg>
      `;
    case "jalsah":
      return `
        <svg viewBox="0 0 100 100" width="80" height="80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="50" cy="25" r="9"/>
          <!-- Torso sitting -->
          <line x1="50" y1="34" x2="50" y2="68"/>
          <!-- Hands on thighs -->
          <path d="M 50 45 L 35 62 L 65 62"/>
          <!-- Folded legs sitting on ground -->
          <path d="M 40 68 L 30 85 L 75 85"/>
          <!-- Ground line -->
          <line x1="15" y1="88" x2="85" y2="88" stroke-dasharray="2 2"/>
        </svg>
      `;
    case "salam":
      return `
        <svg viewBox="0 0 100 100" width="80" height="80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <!-- Head turned right -->
          <circle cx="56" cy="25" r="9"/>
          <path d="M 50 34 L 50 68"/>
          <path d="M 50 45 L 35 62 L 65 62"/>
          <path d="M 40 68 L 30 85 L 75 85"/>
          <!-- Direction arrow -->
          <path d="M 68 25 L 82 25 M 78 20 L 83 25 L 78 30"/>
        </svg>
      `;
    case "standing":
    case "qiyam":
    default:
      return `
        <svg viewBox="0 0 100 120" width="80" height="96" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="50" cy="22" r="10"/>
          <line x1="50" y1="32" x2="50" y2="80"/>
          <!-- Hands folded on chest / below navel -->
          <path d="M 38 48 Q 50 54 62 48"/>
          <!-- Legs -->
          <line x1="44" y1="80" x2="44" y2="115"/>
          <line x1="56" y1="80" x2="56" y2="115"/>
        </svg>
      `;
  }
}
