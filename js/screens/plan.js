/* Baseerah — Khatam planner and reading streak */
import { state } from "../core/state.js";
import { t, ur } from "../core/i18n.js";
import { router } from "../core/router.js";
import { Icons } from "../ui/icons.js";
import { ReadingTracker, TOTAL_AYAHS } from "../core/reading-tracker.js";
import { getHijriParts } from "../core/hijri.js";

const CHOICES = [7, 15, 30, 60, 90];

export function renderPlanScreen(container) {
  const plan = ReadingTracker.plan();
  const streak = ReadingTracker.streak();
  const week = ReadingTracker.lastDays(7);
  const maxDay = Math.max(1, ...week.map((d) => d.count));
  let isRamadan = false;
  try { isRamadan = getHijriParts(new Date()).month === 9; } catch (e) { /* ignore */ }

  container.innerHTML = `
    <div class="screen active screen-plan" dir="ltr">
      <header class="settings-page-header">
        <button type="button" class="btn-header-back settings-back" data-nav="home" aria-label="${t("home", state.lang)}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          <span>${t("home", state.lang)}</span>
        </button>
        <h1 class="settings-page-title">${t("planTitle", state.lang)} <span class="bi-ur" lang="ur" dir="rtl">${ur("planTitle")}</span></h1>
      </header>
      <main class="plan-main">
        <section class="plan-card plan-streak">
          <div class="plan-streak-num"><strong>${streak}</strong><span>${t(streak === 1 ? "planDayStreak1" : "planDayStreak", state.lang)}</span></div>
          <div class="plan-week" aria-label="${t("planLast7", state.lang)}">
            ${week.map((d) => `<div class="plan-week-day ${d.count ? "has" : ""}" title="${d.key}: ${d.count}"><span class="pwd-bar" style="height:${Math.max(6, Math.round((d.count / maxDay) * 56))}px"></span><span class="pwd-label">${d.label}</span></div>`).join("")}
          </div>
          <p class="plan-muted">${t("planTodayRead", state.lang).replace("{n}", ReadingTracker.todayCount())}</p>
        </section>

        ${plan ? planStatusHtml(plan) : planChooserHtml(isRamadan)}
      </main>
    </div>`;

  container.querySelector("[data-nav='home']").addEventListener("click", () => router.navigate("home"));
  container.querySelectorAll("[data-plan-days]").forEach((b) => b.addEventListener("click", () => {
    ReadingTracker.startPlan(parseInt(b.getAttribute("data-plan-days"), 10));
    try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) { /* ignore */ }
    renderPlanScreen(container);
  }));
  const goBtn = container.querySelector("#btn-plan-read");
  if (goBtn) goBtn.addEventListener("click", () => router.navigate(goBtn.getAttribute("data-go")));
  const stopBtn = container.querySelector("#btn-plan-stop");
  if (stopBtn) stopBtn.addEventListener("click", () => {
    if (stopBtn.dataset.confirm !== "1") { stopBtn.dataset.confirm = "1"; stopBtn.textContent = t("planStopConfirm", state.lang); return; }
    ReadingTracker.stopPlan();
    renderPlanScreen(container);
  });
}

function planChooserHtml(isRamadan) {
  return `
    <section class="plan-card">
      <h2 class="plan-h2">${t("planChooseTitle", state.lang)}</h2>
      <p class="plan-muted">${t("planChooseSub", state.lang)}</p>
      <div class="plan-choices">
        ${CHOICES.map((d) => `
          <button type="button" class="plan-choice ${isRamadan && d === 30 ? "is-suggested" : ""}" data-plan-days="${d}">
            <strong>${d}</strong><span>${t("planDays", state.lang)}</span>
            <small>${t("planPerDay", state.lang).replace("{n}", Math.ceil(TOTAL_AYAHS / d))}</small>
            ${isRamadan && d === 30 ? `<em>${t("planRamadan", state.lang)}</em>` : ""}
          </button>`).join("")}
      </div>
    </section>`;
}

function planStatusHtml(p) {
  const onTrack = p.done >= p.expectedByToday - p.target * 0.25;
  const todayPct = Math.min(100, (p.today / p.target) * 100);
  const go = p.next ? `quran/${p.next.surah}/${p.next.ayah}` : "quran/1/1";
  return `
    <section class="plan-card">
      <div class="plan-row">
        <h2 class="plan-h2">${p.finished ? t("planFinished", state.lang) : t("planDayOf", state.lang).replace("{d}", p.dayNo).replace("{n}", p.days)}</h2>
        <span class="plan-badge ${onTrack ? "ok" : "behind"}">${onTrack ? t("planOnTrack", state.lang) : t("planBehind", state.lang)}</span>
      </div>
      <div class="plan-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.pct.toFixed(0)}"><span style="width:${p.pct}%"></span></div>
      <p class="plan-muted">${t("planOverall", state.lang).replace("{done}", p.done.toLocaleString("en-US")).replace("{total}", p.total.toLocaleString("en-US")).replace("{p}", p.pct.toFixed(1))}</p>

      <div class="plan-today">
        <div>
          <p class="plan-today-label">${t("planTodayGoal", state.lang)}</p>
          <p class="plan-today-num"><strong>${p.today}</strong> / ${p.target} ${t("planAyahs", state.lang)}</p>
        </div>
        <div class="plan-today-meter" aria-hidden="true"><span style="width:${todayPct}%"></span></div>
      </div>

      ${p.next ? `<button type="button" class="btn-notif-test" id="btn-plan-read" data-go="${go}">${Icons.book(18)} <span>${t("planContinueAt", state.lang).replace("{ref}", `${p.next.nameEn} ${p.next.surah}:${p.next.ayah}`)}</span></button>` : ""}
      <button type="button" class="btn-plan-stop" id="btn-plan-stop">${t("planStop", state.lang)}</button>
    </section>
    <p class="plan-muted plan-note">${t("planHowCounted", state.lang)}</p>`;
}
