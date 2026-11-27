/* Baseerah — vocabulary learning progress (stored only on this phone)
 * Simple spaced repetition (Leitner boxes): a word you know moves to the
 * next box and comes back later; a word you missed goes back to box 1.
 */
import { normalizeArabic } from "./words.js";

const KEY = "baseerah_vocab";
const INTERVALS_DAYS = [0, 1, 3, 7, 16, 35]; // box -> days until next review
export const MASTERED_BOX = 4;
export const NEW_PER_DAY = 5;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { cards: raw.cards || {}, saved: Array.isArray(raw.saved) ? raw.saved : [], newToday: raw.newToday || { date: "", n: 0 } };
  } catch (e) {
    return { cards: {}, saved: [], newToday: { date: "", n: 0 } };
  }
}
function save(st) {
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage full or blocked */ }
}

export const VocabProgress = {
  state: load,

  /** Words due for review today, then up to NEW_PER_DAY new words from the frequency list. */
  todaysSession(vocabWords) {
    const st = load();
    const t = today();
    const byForm = new Map(vocabWords.map((w) => [w.f, w]));
    for (const s of st.saved) if (!byForm.has(s.f)) byForm.set(s.f, s);

    const due = Object.entries(st.cards)
      .filter(([, c]) => c.due <= t)
      .map(([f]) => byForm.get(f))
      .filter(Boolean);

    const usedNew = st.newToday.date === t ? st.newToday.n : 0;
    const fresh = [];
    // Words the person saved from the Mushaf come first, then the most common words.
    for (const w of [...st.saved, ...vocabWords]) {
      if (fresh.length >= Math.max(0, NEW_PER_DAY - usedNew)) break;
      if (!st.cards[w.f] && !fresh.some((x) => x.f === w.f)) fresh.push(byForm.get(w.f) || w);
    }
    return { due, fresh };
  },

  /** Record an answer. knew=true moves the word up a box. */
  answer(word, knew) {
    const st = load();
    const t = today();
    const existing = st.cards[word.f];
    if (!existing) {
      if (st.newToday.date !== t) st.newToday = { date: t, n: 0 };
      st.newToday.n++;
    }
    const box = knew ? Math.min((existing ? existing.box : 0) + 1, INTERVALS_DAYS.length - 1) : 1;
    st.cards[word.f] = { box, due: addDays(t, knew ? INTERVALS_DAYS[box] : 0), seen: (existing ? existing.seen : 0) + 1 };
    save(st);
    return st.cards[word.f];
  },

  /** Save a word tapped in the Mushaf so it shows up in the learner. */
  saveWord(word, ref) {
    const st = load();
    const f = normalizeArabic(word.ar);
    if (!f || st.saved.some((s) => s.f === f)) return false;
    st.saved.unshift({ f, ar: word.ar.replace(/\s+[ۖ-ۭ-]+/g, "").trim(), ur: word.ur || "", en: word.en || "", ref: ref || "" });
    st.saved = st.saved.slice(0, 500);
    save(st);
    return true;
  },

  isSaved(word) {
    const f = normalizeArabic(word.ar);
    return load().saved.some((s) => s.f === f);
  },

  /** Stats for the header: words learned, and what share of the Quran's words they cover. */
  stats(vocab) {
    const st = load();
    const learned = Object.entries(st.cards).filter(([, c]) => c.box >= 2);
    const freqByForm = new Map(vocab.words.map((w) => [w.f, w.n]));
    const coveredWords = learned.reduce((sum, [f]) => sum + (freqByForm.get(f) || 0), 0);
    return {
      started: Object.keys(st.cards).length,
      learned: learned.length,
      mastered: Object.values(st.cards).filter((c) => c.box >= MASTERED_BOX).length,
      coveragePct: vocab.totalWords ? (coveredWords / vocab.totalWords) * 100 : 0
    };
  }
};
