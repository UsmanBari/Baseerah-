/* Baseerah — Download the full Quran text for offline reading
 * Saves all 114 surah files (Arabic, word meanings, translations) plus the
 * search index into a cache that survives app updates. About 30 MB.
 */
const TEXT_CACHE = "baseerah-quran-text-v1";
const SURAH_COUNT = 114;
const pad3 = (n) => String(n).padStart(3, "0");
const EXTRA_FILES = [
  "data/search_index.js", "data/metadata_extended.js", "data/word_freq.js", "data/vocab.js", "data/roots.json",
  ...Array.from({ length: 114 }, (_, i) => `data/morph/${pad3(i + 1)}.json`),
  ...Array.from({ length: 114 }, (_, i) => `data/timings/alafasy/${pad3(i + 1)}.json`)
];

const surahUrl = (n) => `data/surahs/${String(n).padStart(3, "0")}.js`;

function supported() {
  return typeof caches !== "undefined" && typeof fetch !== "undefined";
}

export const OfflineQuran = {
  supported,

  /** How many surahs are saved on this phone (0–114). */
  async countSaved() {
    if (!supported()) return 0;
    try {
      const cache = await caches.open(TEXT_CACHE);
      const keys = await cache.keys();
      const saved = new Set();
      for (const req of keys) {
        const m = new URL(req.url).pathname.match(/data\/surahs\/(\d{3})\.js$/);
        if (m) saved.add(m[1]);
      }
      return saved.size;
    } catch (e) {
      return 0;
    }
  },

  /**
   * Downloads everything that is missing. onProgress(done, total).
   * Returns { success, saved, failed }. Safe to call again to resume.
   */
  async downloadAll(onProgress = () => {}, { concurrency = 4 } = {}) {
    if (!supported()) return { success: false, saved: 0, failed: SURAH_COUNT, reason: "unsupported" };
    const cache = await caches.open(TEXT_CACHE);
    const urls = [...Array.from({ length: SURAH_COUNT }, (_, i) => surahUrl(i + 1)), ...EXTRA_FILES];
    let done = 0;
    let failed = 0;
    const total = urls.length;
    const queue = urls.slice();

    const worker = async () => {
      while (queue.length) {
        const url = queue.shift();
        try {
          const existing = await cache.match(url, { ignoreSearch: true });
          if (!existing) {
            const res = await fetch(url, { cache: "no-cache" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await cache.put(url, res);
          }
        } catch (e) {
          failed++;
        }
        done++;
        onProgress(done, total);
      }
    };

    await Promise.all(Array.from({ length: concurrency }, worker));
    const saved = await this.countSaved();
    return { success: failed === 0 && saved === SURAH_COUNT, saved, failed };
  },

  /** Removes the downloaded text (opened surahs will download again when read online). */
  async clear() {
    if (!supported()) return;
    try { await caches.delete(TEXT_CACHE); } catch (e) { /* ignore */ }
  }
};
