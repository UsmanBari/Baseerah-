/* Baseerah — 404 Not Found Screen */
import { state } from "../core/state.js";
import { t } from "../core/i18n.js";
import { router } from "../core/router.js";

export function renderNotFoundScreen(container) {
  const isUr = state.lang === "ur";

  container.innerHTML = `
    <div class="screen active screen-notfound" dir="${isUr ? "rtl" : "ltr"}">
      <header class="notfound-header">
        <button type="button" class="btn-icon btn-back" data-nav="home" aria-label="${t("home", state.lang)}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            ${isUr ? '<polyline points="9 18 15 12 9 6"/>' : '<polyline points="15 18 9 12 15 6"/>'}
          </svg>
          <span>${t("home", state.lang)}</span>
        </button>
      </header>

      <main class="notfound-content">
        <div class="notfound-card">
          <div class="notfound-badge">404</div>
          <h2 class="notfound-title">${t("pageNotFound", state.lang)}</h2>
          <p class="notfound-desc">${t("pageNotFoundDesc", state.lang)}</p>
          <div class="notfound-actions">
            <button type="button" class="btn btn-primary btn-notfound-home" data-nav="home">
              ${t("returnHome", state.lang)}
            </button>
          </div>
        </div>
      </main>
    </div>
  `;

  const homeBtns = container.querySelectorAll("[data-nav='home']");
  homeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      router.navigate("home");
    });
  });
}
