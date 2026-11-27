/* Baseerah — Tasbeeh counter
 * Big tap area, a small vibration on every count and a longer one at the
 * target. Counts are kept on this phone, per dhikr, per day.
 */
import { state } from "../core/state.js";
import { t, ur } from "../core/i18n.js";
import { router } from "../core/router.js";
import { Icons } from "../ui/icons.js";

const KEY = "baseerah_tasbeeh";
const DHIKR = [
  { id: "subhanallah", ar: "سُبْحَانَ اللَّهِ", en: "SubhanAllah", mean: "Glory be to Allah", urMean: "اللہ پاک ہے", target: 33 },
  { id: "alhamdulillah", ar: "الْحَمْدُ لِلَّهِ", en: "Alhamdulillah", mean: "All praise is for Allah", urMean: "سب تعریف اللہ کے لیے ہے", target: 33 },
  { id: "allahuakbar", ar: "اللَّهُ أَكْبَرُ", en: "Allahu Akbar", mean: "Allah is the Greatest", urMean: "اللہ سب سے بڑا ہے", target: 34 },
  { id: "astaghfirullah", ar: "أَسْتَغْفِرُ اللَّهَ", en: "Astaghfirullah", mean: "I seek Allah's forgiveness", urMean: "میں اللہ سے بخشش مانگتا ہوں", target: 100 },
  { id: "lailaha", ar: "لَا إِلَٰهَ إِلَّا اللَّهُ", en: "La ilaha illallah", mean: "There is no god but Allah", urMean: "اللہ کے سوا کوئی معبود نہیں", target: 100 }
];
const TARGETS = [33, 34, 100, 0]; // 0 = no limit

const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
function load() {
  try {
    const st = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (st.day !== dayKey()) { st.day = dayKey(); st.counts = {}; st.rounds = {}; }
    return { day: st.day, counts: st.counts || {}, rounds: st.rounds || {}, current: st.current || "subhanallah", targets: st.targets || {} };
  } catch (e) {
    return { day: dayKey(), counts: {}, rounds: {}, current: "subhanallah", targets: {} };
  }
}
function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } }
function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } }

export function renderTasbeehScreen(container) {
  const st = load();
  const d = DHIKR.find((x) => x.id === st.current) || DHIKR[0];
  const target = st.targets[d.id] !== undefined ? st.targets[d.id] : d.target;
  const count = st.counts[d.id] || 0;
  const rounds = st.rounds[d.id] || 0;
  const pct = target ? Math.min(1, (count % target || (count && count % target === 0 ? target : 0)) / target) : 0;
  const R = 112, C = 2 * Math.PI * R;

  container.innerHTML = `
    <div class="screen active screen-tasbeeh" dir="ltr">
      <header class="settings-page-header">
        <button type="button" class="btn-header-back settings-back" data-nav="home" aria-label="${t("home", state.lang)}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          <span>${t("home", state.lang)}</span>
        </button>
        <h1 class="settings-page-title">${t("tasbeehTitle", state.lang)} <span class="bi-ur" lang="ur" dir="rtl">${ur("tasbeehTitle")}</span></h1>
      </header>
      <main class="tasbeeh-main">
        <div class="tasbeeh-chips" role="tablist" aria-label="${t("tasbeehTitle", state.lang)}">
          ${DHIKR.map((x) => `<button type="button" role="tab" aria-selected="${x.id === d.id}" class="tasbeeh-chip ${x.id === d.id ? "active" : ""}" data-dhikr="${x.id}">${x.en}</button>`).join("")}
        </div>
        <p class="tasbeeh-ar" lang="ar" dir="rtl">${d.ar}</p>
        <p class="tasbeeh-mean">${d.mean} · <span lang="ur" dir="rtl">${d.urMean}</span></p>

        <button type="button" class="tasbeeh-tap" id="tasbeeh-tap" aria-describedby="tasbeeh-hint">
          <svg class="tasbeeh-ring" viewBox="0 0 260 260" aria-hidden="true">
            <circle cx="130" cy="130" r="${R}" class="tr-track"/>
            <circle cx="130" cy="130" r="${R}" class="tr-fill" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/>
          </svg>
          <span class="tasbeeh-count" id="tasbeeh-count">${count}</span>
          <span class="tasbeeh-of">${target ? `/ ${target}` : t("tasbeehNoLimit", state.lang)}</span>
        </button>
        <p class="tasbeeh-rounds" id="tasbeeh-hint">${rounds ? t("tasbeehRounds", state.lang).replace("{n}", rounds) : t("tasbeehHint", state.lang)}</p>

        <div class="tasbeeh-controls">
          <div class="mode-pill-toggle tasbeeh-targets" role="group" aria-label="${t("tasbeehTarget", state.lang)}">
            ${TARGETS.map((n) => `<button type="button" class="mode-pill-btn ${n === target ? "active" : ""}" data-target="${n}">${n || "∞"}</button>`).join("")}
          </div>
          <button type="button" class="btn-tasbeeh-reset" id="tasbeeh-reset">${t("tasbeehReset", state.lang)}</button>
        </div>
      </main>
    </div>`;

  container.querySelector("[data-nav='home']").addEventListener("click", () => router.navigate("home"));
  const tap = container.querySelector("#tasbeeh-tap");
  const countEl = container.querySelector("#tasbeeh-count");
  const fill = container.querySelector(".tr-fill");

  const increment = () => {
    const s = load();
    const n = (s.counts[d.id] || 0) + 1;
    s.counts[d.id] = n;
    s.current = d.id;
    const done = target && n % target === 0;
    if (done) s.rounds[d.id] = (s.rounds[d.id] || 0) + 1;
    save(s);
    countEl.textContent = n;
    const p = target ? ((n % target) || target) / target : 0;
    fill.style.strokeDashoffset = String(C * (1 - p));
    tap.classList.remove("pulse");
    void tap.offsetWidth;
    tap.classList.add("pulse");
    if (done) {
      vibrate([60, 60, 120]);
      container.querySelector(".tasbeeh-rounds").textContent = t("tasbeehRounds", state.lang).replace("{n}", s.rounds[d.id]);
    } else {
      vibrate(12);
    }
  };
  tap.addEventListener("click", increment);
  // Volume keys / keyboard: space or enter count too
  container.querySelector(".tasbeeh-main").addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && e.target === tap) { e.preventDefault(); increment(); }
  });

  container.querySelectorAll("[data-dhikr]").forEach((b) => b.addEventListener("click", () => {
    const s = load(); s.current = b.getAttribute("data-dhikr"); save(s); renderTasbeehScreen(container);
  }));
  container.querySelectorAll("[data-target]").forEach((b) => b.addEventListener("click", () => {
    const s = load(); s.targets[d.id] = parseInt(b.getAttribute("data-target"), 10); save(s); renderTasbeehScreen(container);
  }));
  const reset = container.querySelector("#tasbeeh-reset");
  reset.addEventListener("click", () => {
    if (reset.dataset.confirm !== "1") { reset.dataset.confirm = "1"; reset.textContent = t("tasbeehResetConfirm", state.lang); setTimeout(() => { reset.dataset.confirm = ""; reset.textContent = t("tasbeehReset", state.lang); }, 3000); return; }
    const s = load(); s.counts[d.id] = 0; s.rounds[d.id] = 0; save(s); renderTasbeehScreen(container);
  });
}
