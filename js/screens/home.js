/* Baseerah — Home Screen */
import { state } from "../core/state.js";
import { t } from "../core/i18n.js";
import { router } from "../core/router.js";
import { UIComponents } from "../ui/components.js";

let tapCount = 0;
let tapTimer = null;

export function renderHomeScreen(container) {
  const isUr = state.lang === "ur";
  const bismillah = window.BASEERAH_BISMILLAH || "";

  container.innerHTML = `
    <div class="screen active screen-home" dir="${isUr ? "rtl" : "ltr"}">
      <header class="home-header">
        <div class="brand brand-interactive" id="brand-logo" role="button" tabindex="0" aria-label="Baseerah Kiosk">
          <svg class="brand-mark" width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect width="48" height="48" rx="12" fill="var(--color-primary)"/>
            <path d="M24 10 C 29 10, 34 13.5, 36 18.5 C 30 18, 24 22, 22.5 28.5 C 22 31, 22.5 33.5, 23.5 35.5 C 19 34.5, 15.5 30.5, 15.5 25.6 C 15.5 17, 19.5 10, 24 10 Z" fill="var(--color-accent-light)"/>
          </svg>
          <div class="brand-text">
            <span class="brand-name">Baseerah</span>
            <span class="brand-sub">${t("tagline", state.lang)}</span>
          </div>
        </div>
        <div class="lang-toggle" role="group" aria-label="Language">
          <button type="button" class="lang-btn ${state.lang === "ur" ? "active" : ""}" data-lang="ur">اردو</button>
          <button type="button" class="lang-btn ${state.lang === "en" ? "active" : ""}" data-lang="en">English</button>
        </div>
      </header>

      <div class="home-intro">
        <p class="bismillah" lang="ar" dir="rtl">${bismillah}</p>
        <p class="muted">${t("touchToBegin", state.lang)}</p>
      </div>

      <div class="home-cards">
        <button type="button" class="home-card card-primary" data-nav="namaz">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-light)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3c2.5 2 4 4 4 6.5H8C8 7 9.5 5 12 3z"/>
            <path d="M6 21V11h12v10"/>
            <path d="M10 21v-4a2 2 0 0 1 4 0v4"/>
            <path d="M3 21h18"/>
          </svg>
          <span class="card-ur" lang="ur" dir="rtl">${t("namazCardUr", state.lang)}</span>
          <span class="card-en">${t("namazCardTitle", state.lang)}</span>
          <span class="card-sub">${t("namazCardSub", state.lang)}</span>
        </button>

        <button type="button" class="home-card card-light" data-nav="surahs">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5c-.8 0-1.5-.7-1.5-1.5z"/>
            <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z"/>
            <path d="M7 8h1.5M7 11h1.5M15.5 8H17M15.5 11H17"/>
          </svg>
          <span class="card-ur accent" lang="ur" dir="rtl">${t("quranCardUr", state.lang)}</span>
          <span class="card-en">${t("quranCardTitle", state.lang)}</span>
          <span class="card-sub muted">${t("quranCardSub", state.lang)}</span>
        </button>
      </div>

      <footer class="home-footer">
        <button type="button" class="footer-link" data-nav="about">
          ${t("about", state.lang)}
        </button>
      </footer>
    </div>
  `;

  // Navigation handlers
  container.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", () => {
      router.navigate(el.getAttribute("data-nav"));
    });
  });

  // Language switch
  container.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.lang = btn.getAttribute("data-lang");
      renderHomeScreen(container);
    });
  });

  // Hidden Admin Trigger: 5 rapid taps on logo within 3 seconds
  const logo = container.querySelector("#brand-logo");
  if (logo) {
    logo.addEventListener("click", () => {
      tapCount++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => {
        tapCount = 0;
      }, 3000);

      if (tapCount >= 5) {
        tapCount = 0;
        clearTimeout(tapTimer);
        UIComponents.showAdminPinDialog(() => {
          router.navigate("admin");
        });
      }
    });
  }
}
