/* Baseerah — Quran word helpers (tap-a-word + vocabulary learner)
 * Data comes from scripts/build_word_data.py (built from data/surahs).
 * normalizeArabic() must match normalize() in that script.
 */
const STRIP = /[ؐ-ًؚ-ٰٟۖ-ۭـ​-‏-]/g;

export function normalizeArabic(word) {
  return String(word || "")
    .replace(STRIP, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/[یى]/g, "ي")
    .replace(/ک/g, "ك")
    .replace(/[ہھ]/g, "ه")
    .replace(/\s+/g, "");
}

const loaded = {};
function loadScript(src, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  if (loaded[src]) return loaded[src];
  loaded[src] = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve(window[globalName]);
    s.onerror = () => { delete loaded[src]; reject(new Error(`Failed to load ${src}`)); };
    document.head.appendChild(s);
  });
  return loaded[src];
}

export const Words = {
  loadFrequency() { return loadScript("data/word_freq.js", "BASEERAH_WORD_FREQ"); },
  loadVocab() { return loadScript("data/vocab.js", "BASEERAH_VOCAB"); },

  /** How many times this exact word form appears in the Quran (1 if unknown). */
  async countOf(word) {
    try {
      const freq = await this.loadFrequency();
      return (freq && freq[normalizeArabic(word)]) || 1;
    } catch (e) {
      return null;
    }
  }
};
