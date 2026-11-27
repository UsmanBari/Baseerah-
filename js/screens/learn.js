/* Baseerah — Learn Quran words
 * Most common words in the Quran (counted from the app's own word data),
 * 5 new words a day plus reviews (spaced repetition), and the words a
 * person saved by tapping them in the Mushaf.
 */
import { state } from "../core/state.js";
import { t, ur } from "../core/i18n.js";
import { router } from "../core/router.js";
import { Icons } from "../ui/icons.js";
import { Words } from "../core/words.js";
import { VocabProgress, NEW_PER_DAY } from "../core/vocab-progress.js";

let session = null; // { queue: [...], index, revealed, extra }

function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

export async function renderLearnScreen(container) {
  container.innerHTML = `
    <div class="screen active screen-learn" dir="ltr">
      <header class="settings-page-header learn-header">
        <button type="button" class="btn-header-back settings-back" data-nav="home" aria-label="${t("home", state.lang)}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          <span>${t("home", state.lang)}</span>
        </button>
        <h1 class="settings-page-title">${t("learnTitle", state.lang)} <span class="bi-ur" lang="ur" dir="rtl">${ur("learnTitle")}</span></h1>
      </header>
      <main class="learn-main"><p class="learn-loading">Loading…</p></main>
    </div>`;
  container.querySelector("[data-nav='home']").addEventListener("click", () => router.navigate("home"));

  let vocab;
  try {
    vocab = await Words.loadVocab();
  } catch (e) {
    container.querySelector(".learn-main").innerHTML = `<p class="learn-loading">${t("learnOffline", state.lang)}</p>`;
    return;
  }
  if (!session) startSession(vocab, false);
  draw(container, vocab);
}

function startSession(vocab, extra) {
  const { due, fresh } = VocabProgress.todaysSession(vocab.words);
  let queue = [...due, ...fresh];
  if (extra) {
    // "Learn 5 more": next unseen words, ignoring today's limit
    const cards = VocabProgress.state().cards;
    queue = vocab.words.filter((w) => !cards[w.f]).slice(0, NEW_PER_DAY);
  }
  session = { queue, index: 0, revealed: false, extra, reviewCount: due.length };
}

function draw(container, vocab) {
  const main = container.querySelector(".learn-main");
  const stats = VocabProgress.stats(vocab);
  const pct = Math.min(100, stats.coveragePct);
  const card = session.queue[session.index];

  main.innerHTML = `
    <section class="learn-stats">
      <div class="learn-stats-top">
        <div>
          <p class="learn-stat-big"><strong>${stats.learned}</strong> ${t("learnWordsKnown", state.lang)}</p>
          <p class="learn-stat-sub">${t("learnCoverage", state.lang).replace("{p}", pct.toFixed(1))}</p>
        </div>
        <div class="learn-stat-pill">${t("learnToday", state.lang).replace("{n}", Math.max(0, session.queue.length - session.index))}</div>
      </div>
      <div class="learn-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct.toFixed(1)}" aria-label="${t("learnCoverageLabel", state.lang)}"><span style="width:${pct}%"></span></div>
      <p class="learn-hint">${t("learnWhy", state.lang)}</p>
    </section>

    ${card ? cardHtml(card) : doneHtml()}

    <section class="learn-list-section">
      <h2 class="learn-section-title">${t("learnMyWords", state.lang)}</h2>
      ${myWordsHtml()}
      <details class="learn-common">
        <summary>${t("learnCommonList", state.lang)}</summary>
        <ol class="learn-common-list">
          ${vocab.words.slice(0, 100).map((w) => `
            <li><span class="lc-ar" lang="ar" dir="rtl">${w.ar}</span><span class="lc-mean"><span class="lc-en">${w.en}</span><span class="lc-ur" lang="ur" dir="rtl">${w.ur}</span></span><span class="lc-n">${w.n.toLocaleString("en-US")}×</span></li>`).join("")}
        </ol>
      </details>
      <p class="learn-source">${t("learnSource", state.lang)}</p>
    </section>`;

  const flash = main.querySelector(".flashcard");
  if (flash) {
    const reveal = () => {
      if (session.revealed) return;
      session.revealed = true;
      flash.classList.add("is-revealed");
      main.querySelector(".flash-answer").hidden = false;
      main.querySelector(".flash-actions").hidden = false;
      main.querySelector(".flash-tap").hidden = true;
      vibrate(10);
    };
    flash.querySelector(".flash-front").addEventListener("click", reveal);
    flash.addEventListener("click", (e) => { if (e.target === flash) reveal(); });
    main.querySelectorAll("[data-answer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const knew = btn.getAttribute("data-answer") === "yes";
        VocabProgress.answer(card, knew);
        vibrate(knew ? 15 : [10, 40, 10]);
        if (!knew) session.queue.push(card); // see it again before the session ends
        session.index++;
        session.revealed = false;
        draw(container, vocab);
      });
    });
  }
  const more = main.querySelector("#btn-learn-more");
  if (more) more.addEventListener("click", () => { startSession(vocab, true); draw(container, vocab); });
  main.querySelectorAll("[data-open-ref]").forEach((a) => {
    a.addEventListener("click", () => {
      const [s, ay] = a.getAttribute("data-open-ref").split(":");
      session = null;
      router.navigate(`quran/${s}/${ay}`);
    });
  });
}

function cardHtml(w) {
  const altEn = w.en2 && w.en2.toLowerCase() !== (w.en || "").toLowerCase() ? w.en2 : "";
  const alt = w.ur2 || altEn
    ? `<p class="flash-alt">${t("learnAlso", state.lang)} <span lang="ur" dir="rtl">${w.ur2 || ""}</span>${altEn ? ` · ${altEn}` : ""}</p>` : "";
  return `
    <section class="flash-wrap">
      <p class="flash-progress">${session.index + 1} / ${session.queue.length}</p>
      <div class="flashcard">
        <button type="button" class="flash-front">
          <span class="flash-ar" lang="ar" dir="rtl">${w.ar}</span>
          <span class="flash-tap">${t("learnTapReveal", state.lang)}</span>
        </button>
        <div class="flash-answer" hidden>
          <p class="flash-ur" lang="ur" dir="rtl">${w.ur}</p>
          <p class="flash-en">${w.en}</p>
          ${alt}
          <p class="flash-meta">${w.n ? t("wordAppearsN", state.lang).replace("{n}", `<strong>${w.n.toLocaleString("en-US")}</strong>`) : ""}
            ${w.ref ? ` <button type="button" class="flash-ref" data-open-ref="${w.ref}">${t("learnSeeIn", state.lang).replace("{ref}", w.ref)}</button>` : ""}</p>
        </div>
      </div>
      <div class="flash-actions" hidden>
        <button type="button" class="btn-flash-again" data-answer="no">${t("learnAgain", state.lang)}</button>
        <button type="button" class="btn-flash-knew" data-answer="yes">${Icons.check(18)} <span>${t("learnKnew", state.lang)}</span></button>
      </div>
    </section>`;
}

function doneHtml() {
  return `
    <section class="flash-wrap learn-done">
      <div class="learn-done-icon" aria-hidden="true">${Icons.check(28)}</div>
      <h2>${t("learnDoneTitle", state.lang)}</h2>
      <p>${t("learnDoneSub", state.lang)}</p>
      <button type="button" class="btn-notif-test" id="btn-learn-more">${t("learnMore", state.lang)}</button>
    </section>`;
}

function myWordsHtml() {
  const saved = VocabProgress.state().saved;
  if (!saved.length) return `<p class="learn-empty">${t("learnMyWordsEmpty", state.lang)}</p>`;
  return `<ul class="learn-saved">${saved.slice(0, 50).map((w) => `
    <li><span class="lc-ar" lang="ar" dir="rtl">${w.ar}</span><span class="lc-mean"><span class="lc-en">${w.en}</span><span class="lc-ur" lang="ur" dir="rtl">${w.ur}</span></span>${w.ref ? `<button type="button" class="flash-ref" data-open-ref="${w.ref}">${w.ref}</button>` : ""}</li>`).join("")}</ul>`;
}
