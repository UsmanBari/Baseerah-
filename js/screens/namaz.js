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

      <!-- Scholar Review Notice (Calm, Dignified Soft Card) -->
      <div class="scholar-review-card scholar-review-banner" role="note">
        <svg class="scholar-hourglass-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 22h14"/>
          <path d="M5 2h14"/>
          <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/>
          <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
        </svg>
        <div class="scholar-card-text">
          <span class="scholar-title">${t("draftNotice", state.lang)}</span>
          <span class="scholar-desc">${t("draftDisclaimer", state.lang)}</span>
        </div>
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
              <svg class="pending-hourglass-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5 22h14"/>
                <path d="M5 2h14"/>
                <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/>
                <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
              </svg>
              <span class="pending-text">${t("draftDisclaimer", state.lang)}</span>
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
        <svg viewBox="0 0 100 120" width="80" height="96" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <!-- Head -->
          <circle cx="50" cy="20" r="8"/>
          <!-- Torso -->
          <line x1="50" y1="28" x2="50" y2="76"/>
          <!-- Raised arms (Takbeer hands up to ears) -->
          <path d="M 30 26 C 30 38, 42 46, 50 48 C 58 46, 70 38, 70 26"/>
          <!-- Palms near ears -->
          <line x1="28" y1="22" x2="32" y2="28"/>
          <line x1="72" y1="22" x2="68" y2="28"/>
          <!-- Legs & Feet -->
          <line x1="43" y1="76" x2="43" y2="114"/>
          <line x1="57" y1="76" x2="57" y2="114"/>
          <line x1="39" y1="114" x2="47" y2="114"/>
          <line x1="53" y1="114" x2="61" y2="114"/>
        </svg>
      `;
    case "ruku":
      return `
        <svg viewBox="0 0 120 100" width="96" height="80" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <!-- Head -->
          <circle cx="26" cy="42" r="7.5"/>
          <!-- Horizontal Spine -->
          <line x1="34" y1="42" x2="78" y2="42"/>
          <!-- Arms holding knees -->
          <path d="M 46 42 L 68 70"/>
          <!-- Standing Legs -->
          <line x1="78" y1="42" x2="78" y2="94"/>
          <line x1="84" y1="42" x2="84" y2="94"/>
          <!-- Feet on ground -->
          <line x1="74" y1="94" x2="88" y2="94"/>
        </svg>
      `;
    case "sajdah":
      return `
        <svg viewBox="0 0 120 80" width="96" height="64" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <!-- Head on ground -->
          <circle cx="22" cy="63" r="7"/>
          <!-- Smooth arched back down to prostration -->
          <path d="M 27 61 C 44 32, 70 32, 82 52 L 82 68"/>
          <!-- Hands placed flat on ground beside head -->
          <line x1="32" y1="69" x2="44" y2="69"/>
          <!-- Knees and feet on floor -->
          <path d="M 82 68 L 92 69"/>
          <!-- Ground line -->
          <line x1="8" y1="70" x2="112" y2="70" stroke-dasharray="2 3" opacity="0.6"/>
        </svg>
      `;
    case "jalsah":
      return `
        <svg viewBox="0 0 100 100" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <!-- Head -->
          <circle cx="48" cy="22" r="7.5"/>
          <!-- Torso sitting erect -->
          <line x1="48" y1="30" x2="48" y2="64"/>
          <!-- Hands resting on thighs -->
          <path d="M 48 42 L 34 58 L 62 58"/>
          <!-- Folded legs on floor -->
          <path d="M 38 64 L 28 80 L 74 80"/>
          <!-- Ground line -->
          <line x1="14" y1="82" x2="86" y2="82" stroke-dasharray="2 3" opacity="0.6"/>
        </svg>
      `;
    case "salam":
      return `
        <svg viewBox="0 0 100 100" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <!-- Head turned right -->
          <circle cx="56" cy="22" r="7.5"/>
          <line x1="48" y1="30" x2="48" y2="64"/>
          <path d="M 48 42 L 34 58 L 62 58"/>
          <path d="M 38 64 L 28 80 L 74 80"/>
          <!-- Gentle direction turn curve -->
          <path d="M 68 20 C 74 18, 80 22, 82 26 M 78 26 L 83 27 L 82 22"/>
          <line x1="14" y1="82" x2="86" y2="82" stroke-dasharray="2 3" opacity="0.6"/>
        </svg>
      `;
    case "standing":
    case "qiyam":
    default:
      return `
        <svg viewBox="0 0 100 120" width="80" height="96" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <!-- Head -->
          <circle cx="50" cy="20" r="8"/>
          <!-- Spine -->
          <line x1="50" y1="28" x2="50" y2="76"/>
          <!-- Hands folded over chest / below navel -->
          <path d="M 36 44 C 42 50, 58 50, 64 44"/>
          <!-- Legs & Feet -->
          <line x1="44" y1="76" x2="44" y2="114"/>
          <line x1="56" y1="76" x2="56" y2="114"/>
          <line x1="40" y1="114" x2="48" y2="114"/>
          <line x1="52" y1="114" x2="60" y2="114"/>
        </svg>
      `;
  }
}
